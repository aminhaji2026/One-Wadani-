import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { auth, permit, type AuthRequest } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { asyncHandler, officeScope, param, parseLimit } from '../lib/helpers.js';
import { nextSequential } from '../lib/ids.js';

const r = Router();
r.use(auth);

const consentEnum = z.enum(['NEWS', 'EVENTS', 'FUNDRAISING', 'VOLUNTEERING', 'ELECTION_INFORMATION']);

const memberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  country: z.string().min(1),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  officeId: z.string().optional(),
  membershipType: z.string().default('Standard'),
});

r.get(
  '/members',
  permit('members.read'),
  asyncHandler(async (req, res) => {
    const take = parseLimit(req.query.limit);
    const scope = officeScope(req);
    res.json(
      await prisma.member.findMany({
        where: scope,
        take,
        orderBy: { createdAt: 'desc' },
        include: { office: true },
      }),
    );
  }),
);

r.post(
  '/members',
  permit('members.write'),
  asyncHandler(async (req, res) => {
    const p = memberSchema.parse(req.body);
    const officeId = p.officeId ?? req.user!.officeId ?? undefined;
    const membershipNo = await nextSequential('member', 'WD-');
    const x = await prisma.member.create({
      data: { ...p, officeId, membershipNo },
    });
    await audit(req, 'CREATE', 'Member', x.id, undefined, { membershipNo: x.membershipNo });
    res.status(201).json(x);
  }),
);

r.patch(
  '/members/:id',
  permit('members.write'),
  asyncHandler(async (req, res) => {
    const p = memberSchema.partial().extend({ status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED']).optional() }).parse(req.body);
    const existing = await prisma.member.findFirst({ where: { id: param(req.params.id), ...officeScope(req) } });
    if (!existing) return res.status(404).json({ error: 'Member not found' });
    const x = await prisma.member.update({ where: { id: existing.id }, data: p });
    await audit(req, 'UPDATE', 'Member', x.id, existing, x);
    res.json(x);
  }),
);

r.get(
  '/supporters',
  permit('supporters.read'),
  asyncHandler(async (req, res) => {
    const take = parseLimit(req.query.limit);
    res.json(
      await prisma.supporter.findMany({
        where: officeScope(req),
        take,
        orderBy: { createdAt: 'desc' },
        include: { consents: true, office: true },
      }),
    );
  }),
);

r.post(
  '/supporters',
  permit('supporters.write'),
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        country: z.string().min(1),
        city: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        officeId: z.string().optional(),
        consents: z.array(consentEnum).default([]),
      })
      .parse(req.body);
    const { consents, ...data } = p;
    const x = await prisma.supporter.create({
      data: {
        ...data,
        officeId: data.officeId ?? req.user!.officeId ?? undefined,
        consents: { create: consents.map((type) => ({ type })) },
      },
      include: { consents: true },
    });
    await audit(req, 'CREATE', 'Supporter', x.id, undefined, { id: x.id, country: x.country });
    res.status(201).json(x);
  }),
);

r.patch(
  '/supporters/:id/consents',
  permit('supporters.write'),
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        type: consentEnum,
        granted: z.boolean(),
      })
      .parse(req.body);
    const supporter = await prisma.supporter.findFirst({ where: { id: param(req.params.id), ...officeScope(req) } });
    if (!supporter) return res.status(404).json({ error: 'Supporter not found' });

    const consent = await prisma.consent.upsert({
      where: { supporterId_type: { supporterId: supporter.id, type: p.type } },
      create: {
        supporterId: supporter.id,
        type: p.type,
        granted: p.granted,
        revokedAt: p.granted ? null : new Date(),
      },
      update: {
        granted: p.granted,
        revokedAt: p.granted ? null : new Date(),
        grantedAt: p.granted ? new Date() : undefined,
      },
    });
    await audit(req, p.granted ? 'GRANT_CONSENT' : 'REVOKE_CONSENT', 'Consent', consent.id);
    res.json(consent);
  }),
);

r.get(
  '/offices',
  permit('organisation.read'),
  asyncHandler(async (_req, res) => {
    res.json(await prisma.office.findMany({ orderBy: { name: 'asc' } }));
  }),
);

r.post(
  '/offices',
  permit('organisation.write'),
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        name: z.string().min(1),
        type: z.enum([
          'HEADQUARTERS',
          'REGION',
          'DISTRICT',
          'CITY',
          'LOCAL',
          'INTERNATIONAL_COUNTRY',
          'INTERNATIONAL_CITY',
        ]),
        country: z.string().min(1),
        region: z.string().optional(),
        city: z.string().optional(),
        address: z.string().optional(),
        parentId: z.string().optional(),
      })
      .parse(req.body);
    const x = await prisma.office.create({ data: p });
    await audit(req, 'CREATE', 'Office', x.id, undefined, x);
    res.status(201).json(x);
  }),
);

r.get(
  '/staff',
  permit('staff.read'),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.staff.findMany({
        where: officeScope(req),
        include: { user: true, office: true },
        orderBy: { staffNo: 'asc' },
      }),
    );
  }),
);

r.get(
  '/volunteers',
  permit('staff.read'),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.volunteer.findMany({
        where: officeScope(req),
        include: { office: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }),
);

r.get(
  '/fundraising',
  permit('fundraising.read'),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.fundraisingCampaign.findMany({
        where: officeScope(req),
        include: { office: true, _count: { select: { donations: true } } },
        orderBy: { createdAt: 'desc' },
        take: parseLimit(req.query.limit),
      }),
    );
  }),
);

r.post(
  '/fundraising',
  permit('fundraising.write'),
  asyncHandler(async (req: AuthRequest, res) => {
    const p = z
      .object({
        title: z.string().min(1),
        description: z.string().min(1),
        targetAmount: z.coerce.number().positive(),
        currency: z.string().default('USD'),
        officeId: z.string().optional(),
      })
      .parse(req.body);
    const x = await prisma.fundraisingCampaign.create({
      data: {
        ...p,
        officeId: p.officeId ?? req.user!.officeId ?? undefined,
        status: 'PENDING_APPROVAL',
        targetAmount: p.targetAmount,
      },
    });
    await prisma.approval.create({
      data: {
        entityType: 'FundraisingCampaign',
        entityId: x.id,
        status: 'PENDING',
        requestedBy: req.user!.id,
        fundraisingCampaignId: x.id,
      },
    });
    await audit(req, 'CREATE', 'FundraisingCampaign', x.id, undefined, { title: x.title, status: x.status });
    res.status(201).json(x);
  }),
);

r.get(
  '/expenses',
  permit('finance.read'),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.expense.findMany({
        where: officeScope(req),
        include: { office: true },
        orderBy: { createdAt: 'desc' },
        take: parseLimit(req.query.limit),
      }),
    );
  }),
);

r.post(
  '/expenses',
  permit('finance.write'),
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        officeId: z.string().optional(),
        category: z.string().min(1),
        description: z.string().min(1),
        amount: z.coerce.number().positive(),
        currency: z.string().default('USD'),
      })
      .parse(req.body);
    const officeId = p.officeId ?? req.user!.officeId;
    if (!officeId) return res.status(400).json({ error: 'officeId is required' });
    const x = await prisma.expense.create({ data: { ...p, officeId } });
    await prisma.approval.create({
      data: {
        entityType: 'Expense',
        entityId: x.id,
        status: 'PENDING',
        requestedBy: req.user!.id,
        expenseId: x.id,
      },
    });
    await audit(req, 'CREATE', 'Expense', x.id, undefined, x);
    res.status(201).json(x);
  }),
);

r.get(
  '/events',
  permit('events.read'),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.event.findMany({
        where: officeScope(req),
        include: { office: true, _count: { select: { attendees: true } } },
        orderBy: { startsAt: 'asc' },
        take: parseLimit(req.query.limit),
      }),
    );
  }),
);

r.post(
  '/events',
  permit('events.write'),
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        title: z.string().min(1),
        description: z.string().optional(),
        venue: z.string().optional(),
        startsAt: z.coerce.date(),
        capacity: z.coerce.number().int().positive().optional(),
        officeId: z.string().optional(),
      })
      .parse(req.body);
    const x = await prisma.event.create({
      data: {
        ...p,
        officeId: p.officeId ?? req.user!.officeId ?? undefined,
        status: 'DRAFT',
      },
    });
    await audit(req, 'CREATE', 'Event', x.id, undefined, x);
    res.status(201).json(x);
  }),
);

r.patch(
  '/events/:id/publish',
  permit('events.write'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.event.findFirst({ where: { id: param(req.params.id), ...officeScope(req) } });
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    const x = await prisma.event.update({ where: { id: existing.id }, data: { status: 'PUBLISHED' } });
    await audit(req, 'PUBLISH', 'Event', x.id);
    res.json(x);
  }),
);

r.get(
  '/tasks',
  permit('events.read'),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.task.findMany({
        where: officeScope(req),
        include: { office: true, assignee: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: parseLimit(req.query.limit),
      }),
    );
  }),
);

r.post(
  '/tasks',
  permit('events.write'),
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
        dueAt: z.coerce.date().optional(),
        officeId: z.string().optional(),
        assigneeId: z.string().optional(),
      })
      .parse(req.body);
    const x = await prisma.task.create({
      data: {
        ...p,
        officeId: p.officeId ?? req.user!.officeId ?? undefined,
      },
    });
    await audit(req, 'CREATE', 'Task', x.id, undefined, x);
    res.status(201).json(x);
  }),
);

r.patch(
  '/tasks/:id',
  permit('events.write'),
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
        dueAt: z.coerce.date().optional().nullable(),
        assigneeId: z.string().optional().nullable(),
      })
      .parse(req.body);
    const existing = await prisma.task.findFirst({ where: { id: param(req.params.id), ...officeScope(req) } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    const x = await prisma.task.update({ where: { id: existing.id }, data: p });
    await audit(req, 'UPDATE', 'Task', x.id, existing, x);
    res.json(x);
  }),
);

r.get(
  '/communications',
  permit('communications.read'),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.communicationCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        take: parseLimit(req.query.limit),
      }),
    );
  }),
);

r.post(
  '/communications',
  permit('communications.write'),
  asyncHandler(async (req: AuthRequest, res) => {
    const p = z
      .object({
        title: z.string().min(1),
        channel: z.string().min(1),
        audience: z.string().min(1),
        message: z.string().min(1),
      })
      .parse(req.body);
    const x = await prisma.communicationCampaign.create({
      data: { ...p, status: 'PENDING_APPROVAL', createdById: req.user!.id },
    });
    await prisma.approval.create({
      data: {
        entityType: 'CommunicationCampaign',
        entityId: x.id,
        status: 'PENDING',
        requestedBy: req.user!.id,
        communicationCampaignId: x.id,
      },
    });
    await audit(req, 'CREATE', 'CommunicationCampaign', x.id, undefined, x);
    res.status(201).json(x);
  }),
);

r.get(
  '/audit',
  permit('security.read'),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.auditLog.findMany({
        take: parseLimit(req.query.limit, 100, 250),
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
    );
  }),
);

export default r;
