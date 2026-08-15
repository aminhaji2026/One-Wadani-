import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';

export function asyncHandler(fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
  };
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret === 'dev-secret' || secret.length < 16) {
    throw new Error('JWT_SECRET must be set to a strong value (at least 16 characters).');
  }
  return secret;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function officeScope(req: AuthRequest): { officeId?: string } | Record<string, never> {
  // security.write is reserved for SUPER_ADMIN in the seeded role model.
  if (req.user?.permissions.includes('security.write') || !req.user?.officeId) return {};
  return { officeId: req.user.officeId };
}

export function parseLimit(raw: unknown, fallback = 100, max = 250): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

export function zodErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
    const issues = (err as { issues?: { path: (string | number)[]; message: string }[] }).issues ?? [];
    return issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ') || 'Validation failed';
  }
  if (err instanceof Error) return err.message;
  return 'Server error';
}

export function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
