import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { getJwtSecret } from '../lib/helpers.js';
import type { Request } from 'express';

export type AuthUser = {
  id: string;
  permissions: string[];
  officeId?: string | null;
  mustChangePassword?: boolean;
};

export type AuthRequest = Request & { user?: AuthUser };

export async function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, getJwtSecret()) as { sub: string };
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
      permissions,
      officeId: user.officeId,
      mustChangePassword: user.mustChangePassword,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export const permit =
  (code: string) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.permissions.includes(code)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
