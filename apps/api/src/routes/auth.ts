import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/helpers.js';
import { auth, type AuthRequest, type PortalKind } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { createAuthSession, revokeSessionsForAccount, signSessionToken } from '../services/sessions.js';
import { verifyTotp } from '../services/totp.js';

const r = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

r.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        portal: z.enum(['staff', 'member', 'supporter', 'volunteer']).default('staff'),
        totpCode: z.string().min(6).max(8).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid email, password, or portal' });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password.trim();
    const { portal } = parsed.data;

    if (portal === 'staff') {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { roles: { include: { role: true } } },
      });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (user.status !== 'ACTIVE') return res.status(401).json({ error: 'Account unavailable' });
      if (user.totpEnabled) {
        if (!parsed.data.totpCode || !user.totpSecret || !verifyTotp(user.totpSecret, parsed.data.totpCode)) {
          return res.status(401).json({ error: 'Authenticator code required', totpRequired: true });
        }
      }
      const { token, jti } = signSessionToken(user.id, 'staff');
      await createAuthSession({
        portal: 'staff',
        accountId: user.id,
        jti,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.json({
        token,
        user: {
          id: user.id,
          portal: 'staff' as const,
          name: `${user.firstName} ${user.lastName}`,
          locale: user.locale,
          mustChangePassword: user.mustChangePassword,
          officeId: user.officeId,
          email: user.email,
          totpEnabled: user.totpEnabled,
          roles: user.roles.map((r) => r.role.name),
        },
      });
    }

    if (portal === 'member') {
      const member = await prisma.member.findUnique({ where: { email } });
      if (!member?.passwordHash || !member.portalEnabled || !(await bcrypt.compare(password, member.passwordHash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (member.status === 'REJECTED' || member.status === 'INACTIVE') {
        return res.status(401).json({ error: 'Account unavailable' });
      }
      const { token, jti } = signSessionToken(member.id, 'member');
      await createAuthSession({
        portal: 'member',
        accountId: member.id,
        jti,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.json({
        token,
        user: {
          id: member.id,
          portal: 'member' as const,
          name: `${member.firstName} ${member.lastName}`,
          mustChangePassword: member.mustChangePassword,
          officeId: member.officeId,
          email: member.email,
          membershipNo: member.membershipNo,
          status: member.status,
        },
      });
    }

    if (portal === 'supporter') {
      const supporter = await prisma.supporter.findUnique({ where: { email } });
      if (
        !supporter?.passwordHash ||
        !supporter.portalEnabled ||
        !(await bcrypt.compare(password, supporter.passwordHash))
      ) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (supporter.status === 'REJECTED' || supporter.status === 'INACTIVE') {
        return res.status(401).json({ error: 'Account unavailable' });
      }
      const { token, jti } = signSessionToken(supporter.id, 'supporter');
      await createAuthSession({
        portal: 'supporter',
        accountId: supporter.id,
        jti,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.json({
        token,
        user: {
          id: supporter.id,
          portal: 'supporter' as const,
          name: `${supporter.firstName} ${supporter.lastName || ''}`.trim(),
          mustChangePassword: supporter.mustChangePassword,
          officeId: supporter.officeId,
          email: supporter.email,
          status: supporter.status,
        },
      });
    }

    const volunteer = await prisma.volunteer.findUnique({ where: { email } });
    if (
      !volunteer?.passwordHash ||
      !volunteer.portalEnabled ||
      !(await bcrypt.compare(password, volunteer.passwordHash))
    ) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (volunteer.status === 'REJECTED' || volunteer.status === 'INACTIVE') {
      return res.status(401).json({ error: 'Account unavailable' });
    }
    const { token, jti } = signSessionToken(volunteer.id, 'volunteer');
    await createAuthSession({
      portal: 'volunteer',
      accountId: volunteer.id,
      jti,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({
      token,
      user: {
        id: volunteer.id,
        portal: 'volunteer' as const,
        name: `${volunteer.firstName} ${volunteer.lastName || ''}`.trim(),
        mustChangePassword: volunteer.mustChangePassword,
        officeId: volunteer.officeId,
        email: volunteer.email,
        status: volunteer.status,
        skills: volunteer.skills,
      },
    });
  }),
);

r.post(
  '/change-password',
  auth,
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = z
      .object({
        currentPassword: z.string().min(8),
        newPassword: z.string().min(10).max(128),
      })
      .parse(req.body);

    const currentPassword = parsed.currentPassword.trim();
    const newPassword = parsed.newPassword.trim();
    if (newPassword.length < 10) {
      return res.status(400).json({ error: 'New password must be at least 10 characters' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from the current password' });
    }

    const portal = req.user!.portal;
    const id = req.user!.id;
    const passwordHash = await bcrypt.hash(newPassword, 12);

    let userPayload: Record<string, unknown>;

    if (portal === 'staff') {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      const updated = await prisma.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: false },
      });
      userPayload = {
        id: updated.id,
        portal: 'staff' as const,
        name: `${updated.firstName} ${updated.lastName}`,
        locale: updated.locale,
        mustChangePassword: false,
        officeId: updated.officeId,
        email: updated.email,
      };
    } else if (portal === 'member') {
      const member = await prisma.member.findUnique({ where: { id } });
      if (!member?.passwordHash || !(await bcrypt.compare(currentPassword, member.passwordHash))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      const updated = await prisma.member.update({
        where: { id },
        data: { passwordHash, mustChangePassword: false },
      });
      userPayload = {
        id: updated.id,
        portal: 'member' as const,
        name: `${updated.firstName} ${updated.lastName}`,
        mustChangePassword: false,
        officeId: updated.officeId,
        email: updated.email,
        membershipNo: updated.membershipNo,
        status: updated.status,
      };
    } else if (portal === 'supporter') {
      const supporter = await prisma.supporter.findUnique({ where: { id } });
      if (!supporter?.passwordHash || !(await bcrypt.compare(currentPassword, supporter.passwordHash))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      const updated = await prisma.supporter.update({
        where: { id },
        data: { passwordHash, mustChangePassword: false },
      });
      userPayload = {
        id: updated.id,
        portal: 'supporter' as const,
        name: `${updated.firstName} ${updated.lastName || ''}`.trim(),
        mustChangePassword: false,
        officeId: updated.officeId,
        email: updated.email,
        status: updated.status,
      };
    } else {
      const volunteer = await prisma.volunteer.findUnique({ where: { id } });
      if (!volunteer?.passwordHash || !(await bcrypt.compare(currentPassword, volunteer.passwordHash))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      const updated = await prisma.volunteer.update({
        where: { id },
        data: { passwordHash, mustChangePassword: false },
      });
      userPayload = {
        id: updated.id,
        portal: 'volunteer' as const,
        name: `${updated.firstName} ${updated.lastName || ''}`.trim(),
        mustChangePassword: false,
        officeId: updated.officeId,
        email: updated.email,
        status: updated.status,
        skills: updated.skills,
      };
    }

    await audit(req, 'UPDATE', 'PortalPassword', id, undefined, { portal, mustChangePassword: false });
    await revokeSessionsForAccount(portal, id);
    const { token, jti } = signSessionToken(id, portal);
    await createAuthSession({
      portal,
      accountId: id,
      jti,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({ ok: true, token, user: userPayload });
  }),
);

r.get(
  '/me',
  auth,
  asyncHandler(async (req: AuthRequest, res) => {
    const portal = req.user!.portal;
    if (portal === 'staff') {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          locale: true,
          officeId: true,
          mustChangePassword: true,
          office: { select: { id: true, name: true, type: true } },
          staff: { select: { staffNo: true, title: true, department: true } },
        },
      });
      return res.json({ ...user, portal, permissions: req.user!.permissions });
    }
    if (portal === 'member') {
      const member = await prisma.member.findUnique({
        where: { id: req.user!.id },
        include: { office: { select: { id: true, name: true } } },
      });
      return res.json({ ...member, portal, permissions: req.user!.permissions });
    }
    if (portal === 'supporter') {
      const supporter = await prisma.supporter.findUnique({
        where: { id: req.user!.id },
        include: { office: { select: { id: true, name: true } }, consents: true },
      });
      return res.json({ ...supporter, portal, permissions: req.user!.permissions });
    }
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: req.user!.id },
      include: { office: { select: { id: true, name: true } } },
    });
    return res.json({ ...volunteer, portal, permissions: req.user!.permissions });
  }),
);

export default r;
