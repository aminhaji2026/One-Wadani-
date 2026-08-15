import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, getJwtSecret } from '../lib/helpers.js';
import { auth, type AuthRequest, type PortalKind } from '../middleware/auth.js';
import { audit } from '../services/audit.js';

const r = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

function signToken(id: string, portal: PortalKind) {
  return jwt.sign({ sub: id, portal }, getJwtSecret(), { expiresIn: '8h' });
}

r.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        portal: z.enum(['staff', 'member', 'supporter', 'volunteer']).default('staff'),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid email, password, or portal' });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password.trim();
    const { portal } = parsed.data;

    if (portal === 'staff') {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (user.status !== 'ACTIVE') return res.status(401).json({ error: 'Account unavailable' });
      const token = signToken(user.id, 'staff');
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
      const token = signToken(member.id, 'member');
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
      const token = signToken(supporter.id, 'supporter');
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
    const token = signToken(volunteer.id, 'volunteer');
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
    const token = signToken(id, portal);
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
