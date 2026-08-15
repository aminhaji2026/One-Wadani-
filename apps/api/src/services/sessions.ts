import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { getJwtSecret } from '../lib/helpers.js';
import type { PortalKind } from '../middleware/auth.js';

export function signSessionToken(accountId: string, portal: PortalKind, jti = randomUUID()) {
  const token = jwt.sign({ sub: accountId, portal, jti }, getJwtSecret(), { expiresIn: '8h' });
  return { token, jti };
}

export async function createAuthSession(input: {
  portal: PortalKind;
  accountId: string;
  jti: string;
  ip?: string;
  userAgent?: string;
}) {
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await prisma.authSession.create({
    data: {
      portal: input.portal,
      accountId: input.accountId,
      jti: input.jti,
      expiresAt,
      ip: input.ip,
      userAgent: input.userAgent,
    },
  });
  return expiresAt;
}

export async function revokeSessionsForAccount(portal: PortalKind, accountId: string) {
  await prisma.authSession.updateMany({
    where: { portal, accountId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function isSessionActive(jti?: string) {
  if (!jti) return true; // legacy tokens without jti remain valid until expiry
  const row = await prisma.authSession.findUnique({ where: { jti } });
  if (!row) return false;
  if (row.revokedAt) return false;
  if (row.expiresAt.getTime() < Date.now()) return false;
  return true;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
