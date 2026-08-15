import type { Request } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { Prisma } from '@prisma/client';

export async function audit(
  req: Request,
  action: string,
  entity: string,
  entityId?: string,
  oldValue?: unknown,
  newValue?: unknown,
) {
  const a = req as AuthRequest;
  const portal = a.user?.portal || 'staff';
  // AuditLog.actorId FKs to User — only staff IDs are valid there.
  const actorId = portal === 'staff' ? a.user?.id : undefined;
  const portalMeta =
    portal === 'staff'
      ? undefined
      : {
          portal,
          portalActorId: a.user?.id,
          portalActorEmail: a.user?.email,
        };

  const mergedNew =
    portalMeta || newValue !== undefined
      ? ({
          ...(typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)
            ? (newValue as Record<string, unknown>)
            : newValue !== undefined
              ? { value: newValue }
              : {}),
          ...(portalMeta || {}),
        } as Prisma.InputJsonValue)
      : undefined;

  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entity,
      entityId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      oldValue: (oldValue ?? undefined) as Prisma.InputJsonValue | undefined,
      newValue: mergedNew,
    },
  });
}
