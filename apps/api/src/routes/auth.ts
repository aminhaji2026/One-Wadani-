import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, getJwtSecret } from '../lib/helpers.js';
import { auth, type AuthRequest } from '../middleware/auth.js';
import { audit } from '../services/audit.js';

const r = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

r.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({ email: z.string().email(), password: z.string().min(8) })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid email or password format' });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Account unavailable' });
    }

    const token = jwt.sign({ sub: user.id }, getJwtSecret(), { expiresIn: '8h' });
    res.json({
      token,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        locale: user.locale,
        mustChangePassword: user.mustChangePassword,
        officeId: user.officeId,
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

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await bcrypt.compare(parsed.currentPassword, user.passwordHash))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(parsed.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });
    await audit(req, 'UPDATE', 'User', user.id, undefined, { mustChangePassword: false });
    res.json({ ok: true });
  }),
);

r.get(
  '/me',
  auth,
  asyncHandler(async (req: AuthRequest, res) => {
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
      },
    });
    res.json({ ...user, permissions: req.user!.permissions });
  }),
);

export default r;
