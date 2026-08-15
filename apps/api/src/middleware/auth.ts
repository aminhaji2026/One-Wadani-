import type { NextFunction, Response, Request } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { getJwtSecret } from '../lib/helpers.js';
import { isSessionActive } from '../services/sessions.js';

export type PortalKind = 'staff' | 'member' | 'supporter' | 'volunteer';

export type AuthUser = {
  id: string;
  portal: PortalKind;
  permissions: string[];
  officeId?: string | null;
  mustChangePassword?: boolean;
  name?: string;
  email?: string | null;
  totpEnabled?: boolean;
  jti?: string;
};

export type AuthRequest = Request & { user?: AuthUser };

type JwtPayload = { sub: string; portal?: PortalKind; jti?: string };

export async function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    if (!(await isSessionActive(payload.jti))) {
      return res.status(401).json({ error: 'Session expired or revoked' });
    }
    const portal: PortalKind = payload.portal || 'staff';

    if (portal === 'staff') {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      });
      if (!user || user.status !== 'ACTIVE') {
        return res.status(401).json({ error: 'Account unavailable' });
      }
      const permissions = [
        ...new Set(user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.code))),
      ];
      req.user = {
        id: user.id,
        portal: 'staff',
        permissions,
        officeId: user.officeId,
        mustChangePassword: user.mustChangePassword,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        totpEnabled: user.totpEnabled,
        jti: payload.jti,
      };
      return next();
    }

    if (portal === 'member') {
      const member = await prisma.member.findUnique({ where: { id: payload.sub } });
      if (!member || !member.portalEnabled || member.status === 'REJECTED' || member.status === 'INACTIVE') {
        return res.status(401).json({ error: 'Account unavailable' });
      }
      req.user = {
        id: member.id,
        portal: 'member',
        permissions: ['portal.member'],
        officeId: member.officeId,
        mustChangePassword: member.mustChangePassword,
        name: `${member.firstName} ${member.lastName}`,
        email: member.email,
        jti: payload.jti,
      };
      return next();
    }

    if (portal === 'supporter') {
      const supporter = await prisma.supporter.findUnique({ where: { id: payload.sub } });
      if (!supporter || !supporter.portalEnabled || supporter.status === 'REJECTED' || supporter.status === 'INACTIVE') {
        return res.status(401).json({ error: 'Account unavailable' });
      }
      req.user = {
        id: supporter.id,
        portal: 'supporter',
        permissions: ['portal.supporter'],
        officeId: supporter.officeId,
        mustChangePassword: supporter.mustChangePassword,
        name: `${supporter.firstName} ${supporter.lastName || ''}`.trim(),
        email: supporter.email,
        jti: payload.jti,
      };
      return next();
    }

    if (portal === 'volunteer') {
      const volunteer = await prisma.volunteer.findUnique({ where: { id: payload.sub } });
      if (!volunteer || !volunteer.portalEnabled || volunteer.status === 'REJECTED' || volunteer.status === 'INACTIVE') {
        return res.status(401).json({ error: 'Account unavailable' });
      }
      req.user = {
        id: volunteer.id,
        portal: 'volunteer',
        permissions: ['portal.volunteer'],
        officeId: volunteer.officeId,
        mustChangePassword: volunteer.mustChangePassword,
        name: `${volunteer.firstName} ${volunteer.lastName || ''}`.trim(),
        email: volunteer.email,
        jti: payload.jti,
      };
      return next();
    }

    return res.status(401).json({ error: 'Invalid token' });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export const permit =
  (code: string) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.portal !== 'staff') {
      return res.status(403).json({ error: 'Staff access required' });
    }
    if (req.user?.permissions.includes(code)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };

export const requirePortal =
  (...portals: PortalKind[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !portals.includes(req.user.portal)) {
      return res.status(403).json({ error: 'Forbidden for this portal' });
    }
    next();
  };
