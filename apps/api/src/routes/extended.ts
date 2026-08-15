import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { auth, permit, type AuthRequest } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { asyncHandler, officeScope, param, parseLimit } from '../lib/helpers.js';
import { nextSequential } from '../lib/ids.js';

const r = Router();
r.use(auth);

const ALLOWED_STAFF_ROLES = ['OFFICE_STAFF', 'OFFICE_MANAGER', 'FINANCE_OFFICER', 'COMMS_OFFICER'] as const;

r.post(
  '/staff',
  permit('staff.write'),
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().optional(),
        officeId: z.string().optional(),
        title: z.string().min(1),
        department: z.string().min(1),
        roleName: z.enum(ALLOWED_STAFF_ROLES).default('OFFICE_STAFF'),
      })
      .parse(req.body);

    const role = await prisma.role.findUnique({ where: { name: p.roleName } });
    if (!role) return res.status(400).json({ error: `Role ${p.roleName} is not provisioned. Run seed.` });

    const officeId = p.officeId ?? req.user!.officeId ?? undefined;
    const staffNo = await nextSequential('staff', 'WDS-', 5);
    const temporaryPassword = `Tmp-${Math.random().toString(36).slice(2, 10)}!A1`;

    const user = await prisma.user.create({
      data: {
        email: p.email.toLowerCase(),
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        officeId,
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        mustChangePassword: true,
        roles: { create: { roleId: role.id } },
      },
    });

    const staff = await prisma.staff.create({
      data: {
        staffNo,
        userId: user.id,
        officeId,
        title: p.title,
        department: p.department,
      },
    });

    await audit(req, 'CREATE', 'Staff', staff.id, undefined, { staffNo: staff.staffNo, email: p.email });
    res.status(201).json({ ...staff, temporaryPassword });
  }),
);

r.post(
  '/volunteers',
  permit('staff.write'),
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        skills: z.array(z.string()).default([]),
        officeId: z.string().optional(),
      })
      .parse(req.body);
    const x = await prisma.volunteer.create({
      data: { ...p, officeId: p.officeId ?? req.user!.officeId ?? undefined },
    });
    await audit(req, 'CREATE', 'Volunteer', x.id);
    res.status(201).json(x);
  }),
);

r.get(
  '/budgets',
  permit('finance.read'),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.budget.findMany({
        where: officeScope(req),
        include: { office: true },
        orderBy: [{ year: 'desc' }, { name: 'asc' }],
      }),
    );
  }),
);

r.post(
  '/budgets',
  permit('finance.write'),
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        officeId: z.string().optional(),
        name: z.string().min(1),
        year: z.coerce.number().int().min(2000).max(2100),
        amount: z.coerce.number().positive(),
        currency: z.string().default('USD'),
      })
      .parse(req.body);
    const officeId = p.officeId ?? req.user!.officeId;
    if (!officeId) return res.status(400).json({ error: 'officeId is required' });
    const x = await prisma.budget.create({ data: { ...p, officeId } });
    await audit(req, 'CREATE', 'Budget', x.id);
    res.status(201).json(x);
  }),
);

r.post(
  '/expenses/:id/approve',
  permit('finance.write'),
  asyncHandler(async (req: AuthRequest, res) => {
    const expense = await prisma.expense.findFirst({ where: { id: param(req.params.id), ...officeScope(req) } });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    if (expense.status === 'APPROVED') return res.json(expense);

    const updated = await prisma.$transaction(async (tx) => {
      const e = await tx.expense.update({ where: { id: expense.id }, data: { status: 'APPROVED' } });
      await tx.ledgerEntry.upsert({
        where: { expenseId: e.id },
        update: {},
        create: {
          type: 'EXPENSE',
          amount: e.amount,
          currency: e.currency,
          account: e.category,
          reference: e.id,
          description: e.description,
          expenseId: e.id,
        },
      });
      await tx.approval.updateMany({
        where: { expenseId: e.id, status: 'PENDING' },
        data: { status: 'APPROVED', decidedBy: req.user!.id, decidedAt: new Date() },
      });
      return e;
    });

    await audit(req, 'APPROVE', 'Expense', updated.id);
    res.json(updated);
  }),
);

r.get(
  '/media',
  permit('communications.read'),
  asyncHandler(async (req, res) => {
    res.json(await prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: parseLimit(req.query.limit) }));
  }),
);

r.post(
  '/media',
  permit('communications.write'),
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        title: z.string().min(1),
        type: z.string().min(1),
        url: z.string().url(),
        language: z.string().default('so'),
      })
      .parse(req.body);
    const x = await prisma.mediaAsset.create({ data: { ...p, createdById: req.user?.id } });
    await audit(req, 'CREATE', 'MediaAsset', x.id);
    res.status(201).json(x);
  }),
);

r.post(
  '/communications/:id/approve',
  permit('communications.write'),
  asyncHandler(async (req: AuthRequest, res) => {
    const existing = await prisma.communicationCampaign.findUnique({ where: { id: param(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    const x = await prisma.communicationCampaign.update({
      where: { id: existing.id },
      data: { status: 'ACTIVE' },
    });
    await prisma.approval.updateMany({
      where: { communicationCampaignId: x.id, status: 'PENDING' },
      data: { status: 'APPROVED', decidedBy: req.user!.id, decidedAt: new Date() },
    });
    await audit(req, 'APPROVE', 'CommunicationCampaign', x.id);
    res.json(x);
  }),
);

r.get(
  '/documents',
  permit('organisation.read'),
  asyncHandler(async (req, res) => {
    const canSeeConfidential = req.user!.permissions.includes('security.read');
    res.json(
      await prisma.document.findMany({
        where: {
          ...officeScope(req),
          ...(canSeeConfidential ? {} : { confidential: false }),
        },
        orderBy: { createdAt: 'desc' },
        take: parseLimit(req.query.limit),
      }),
    );
  }),
);

r.post(
  '/documents',
  permit('organisation.write'),
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        title: z.string().min(1),
        category: z.string().min(1),
        url: z.string().url(),
        confidential: z.boolean().default(false),
        officeId: z.string().optional(),
      })
      .parse(req.body);
    if (p.confidential && !req.user!.permissions.includes('security.write')) {
      return res.status(403).json({ error: 'security.write required for confidential documents' });
    }
    const x = await prisma.document.create({
      data: { ...p, officeId: p.officeId ?? req.user!.officeId ?? undefined },
    });
    await audit(req, 'CREATE', 'Document', x.id);
    res.status(201).json(x);
  }),
);

r.get(
  '/privacy-requests',
  permit('security.read'),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.privacyRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: parseLimit(req.query.limit),
      }),
    );
  }),
);

r.post(
  '/privacy-requests',
  permit('security.write'),
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        subjectType: z.string().min(1),
        subjectId: z.string().min(1),
        type: z.enum(['ACCESS', 'CORRECTION', 'DELETE', 'EXPORT', 'WITHDRAW_CONSENT']),
        notes: z.string().optional(),
      })
      .parse(req.body);
    const x = await prisma.privacyRequest.create({ data: p });
    await audit(req, 'CREATE', 'PrivacyRequest', x.id);
    res.status(201).json(x);
  }),
);

r.patch(
  '/privacy-requests/:id/complete',
  permit('security.write'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.privacyRequest.findUnique({ where: { id: param(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Privacy request not found' });
    const x = await prisma.privacyRequest.update({
      where: { id: existing.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    await audit(req, 'COMPLETE', 'PrivacyRequest', x.id);
    res.json(x);
  }),
);

r.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.conversation.findMany({
        where: { members: { some: { userId: req.user!.id } } },
        include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }),
);

r.post(
  '/conversations',
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        name: z.string().optional(),
        type: z.string().default('GROUP'),
        officeId: z.string().optional(),
        memberIds: z.array(z.string()).default([]),
      })
      .parse(req.body);
    const ids = [...new Set([req.user!.id, ...p.memberIds])];
    const x = await prisma.conversation.create({
      data: {
        name: p.name,
        type: p.type,
        officeId: p.officeId ?? req.user!.officeId ?? undefined,
        members: { create: ids.map((userId) => ({ userId })) },
      },
    });
    await audit(req, 'CREATE', 'Conversation', x.id);
    res.status(201).json(x);
  }),
);

r.get(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const allowed = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: param(req.params.id), userId: req.user!.id } },
    });
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
    res.json(
      await prisma.message.findMany({
        where: { conversationId: param(req.params.id) },
        orderBy: { createdAt: 'asc' },
        take: 500,
        include: { sender: { select: { id: true, firstName: true, lastName: true } } },
      }),
    );
  }),
);

r.post(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const allowed = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: param(req.params.id), userId: req.user!.id } },
    });
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
    const p = z
      .object({
        kind: z.enum(['TEXT', 'VOICE', 'IMAGE', 'VIDEO', 'DOCUMENT']).default('TEXT'),
        body: z.string().optional(),
        attachmentUrl: z.string().url().optional(),
      })
      .parse(req.body);
    const x = await prisma.message.create({
      data: { conversationId: param(req.params.id), senderId: req.user!.id, ...p },
    });
    res.status(201).json(x);
  }),
);

export default r;
