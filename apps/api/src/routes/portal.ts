import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { auth, requirePortal, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler, param } from '../lib/helpers.js';
import { getGateway, listGateways } from '../services/payments.js';
import { nextReceiptNo } from '../lib/ids.js';
import { audit } from '../services/audit.js';

const r = Router();
r.use(auth);

const consentTypes = z.enum(['NEWS', 'EVENTS', 'FUNDRAISING', 'VOLUNTEERING', 'ELECTION_INFORMATION']);
const taskStatuses = z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']);
const gatewayEnum = z.enum(['mock', 'zaad', 'edahab', 'premier', 'mycash', 'sifalo', 'stripe']);

function qrToken() {
  return createHash('sha256').update(randomBytes(24)).digest('hex').slice(0, 24);
}

r.get(
  '/home',
  requirePortal('member', 'supporter', 'volunteer', 'staff'),
  asyncHandler(async (req: AuthRequest, res) => {
    const portal = req.user!.portal;
    if (portal === 'staff') {
      return res.json({
        portal,
        title: 'Staff console',
        message: 'Use the HQ navigation for full operations access.',
      });
    }

    if (portal === 'member') {
      const member = await prisma.member.findUnique({
        where: { id: req.user!.id },
        include: { office: true },
      });
      const events = await prisma.event.findMany({
        where: { status: 'PUBLISHED', startsAt: { gte: new Date(Date.now() - 86400000) } },
        orderBy: { startsAt: 'asc' },
        take: 6,
      });
      const rsvps = await prisma.eventAttendee.count({
        where: { email: member?.email || undefined },
      });
      return res.json({
        portal,
        profile: sanitizePerson(member),
        upcomingEvents: events,
        cards: [
          { label: 'Membership No.', value: member?.membershipNo },
          { label: 'Status', value: member?.status },
          { label: 'Office', value: member?.office?.name || '—' },
          { label: 'RSVPs', value: String(rsvps) },
        ],
      });
    }

    if (portal === 'supporter') {
      const supporter = await prisma.supporter.findUnique({
        where: { id: req.user!.id },
        include: { office: true, consents: true },
      });
      const campaigns = await prisma.fundraisingCampaign.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
      const myDonations = supporter?.email
        ? await prisma.donation.findMany({
            where: { donorEmail: supporter.email },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { campaign: { select: { title: true } } },
          })
        : [];
      const confirmedTotal = myDonations
        .filter((d) => d.status === 'CONFIRMED')
        .reduce((sum, d) => sum + Number(d.amount), 0);
      return res.json({
        portal,
        profile: sanitizePerson(supporter),
        activeCampaigns: campaigns,
        recentDonations: myDonations,
        cards: [
          { label: 'Country', value: supporter?.country },
          { label: 'Status', value: supporter?.status },
          {
            label: 'Consents on',
            value:
              (supporter?.consents || [])
                .filter((c) => c.granted)
                .map((c) => c.type.replaceAll('_', ' '))
                .join(', ') || 'None',
          },
          { label: 'Your confirmed giving', value: `$${confirmedTotal.toLocaleString()}` },
        ],
      });
    }

    const volunteer = await prisma.volunteer.findUnique({
      where: { id: req.user!.id },
      include: { office: true },
    });
    const tasks = await prisma.task.findMany({
      where: {
        officeId: volunteer?.officeId || undefined,
        status: { not: 'DONE' },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    });
    const events = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startsAt: { gte: new Date(Date.now() - 86400000) },
        ...(volunteer?.officeId
          ? { OR: [{ officeId: volunteer.officeId }, { officeId: null }] }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
      take: 5,
    });
    return res.json({
      portal,
      profile: sanitizePerson(volunteer),
      openTasks: tasks,
      upcomingEvents: events,
      cards: [
        { label: 'Skills', value: (volunteer?.skills || []).join(', ') || '—' },
        { label: 'Status', value: volunteer?.status },
        { label: 'Office', value: volunteer?.office?.name || '—' },
        { label: 'Open tasks', value: String(tasks.length) },
      ],
    });
  }),
);

r.get(
  '/profile',
  requirePortal('member', 'supporter', 'volunteer'),
  asyncHandler(async (req: AuthRequest, res) => {
    const portal = req.user!.portal;
    if (portal === 'member') {
      const member = await prisma.member.findUnique({
        where: { id: req.user!.id },
        include: { office: { select: { id: true, name: true } } },
      });
      return res.json({ portal, profile: sanitizePerson(member) });
    }
    if (portal === 'supporter') {
      const supporter = await prisma.supporter.findUnique({
        where: { id: req.user!.id },
        include: { office: { select: { id: true, name: true } }, consents: true },
      });
      return res.json({ portal, profile: sanitizePerson(supporter) });
    }
    const volunteer = await prisma.volunteer.findUnique({
      where: { id: req.user!.id },
      include: { office: { select: { id: true, name: true } } },
    });
    return res.json({ portal, profile: sanitizePerson(volunteer) });
  }),
);

r.patch(
  '/profile',
  requirePortal('member', 'supporter', 'volunteer'),
  asyncHandler(async (req: AuthRequest, res) => {
    const portal = req.user!.portal;
    const body = z
      .object({
        phone: z.string().max(40).optional(),
        city: z.string().max(80).optional(),
        preferredLanguage: z.string().max(10).optional(),
        language: z.string().max(10).optional(),
        skills: z.array(z.string().max(40)).max(12).optional(),
      })
      .parse(req.body);

    if (portal === 'member') {
      const profile = await prisma.member.update({
        where: { id: req.user!.id },
        data: {
          phone: body.phone,
          city: body.city,
          preferredLanguage: body.preferredLanguage,
        },
        include: { office: { select: { id: true, name: true } } },
      });
      await audit(req, 'UPDATE', 'Member', profile.id);
      return res.json({ portal, profile: sanitizePerson(profile) });
    }
    if (portal === 'supporter') {
      const profile = await prisma.supporter.update({
        where: { id: req.user!.id },
        data: {
          phone: body.phone,
          city: body.city,
          language: body.language || body.preferredLanguage,
        },
        include: { office: { select: { id: true, name: true } }, consents: true },
      });
      await audit(req, 'UPDATE', 'Supporter', profile.id);
      return res.json({ portal, profile: sanitizePerson(profile) });
    }
    const profile = await prisma.volunteer.update({
      where: { id: req.user!.id },
      data: {
        phone: body.phone,
        skills: body.skills,
      },
      include: { office: { select: { id: true, name: true } } },
    });
    await audit(req, 'UPDATE', 'Volunteer', profile.id);
    return res.json({ portal, profile: sanitizePerson(profile) });
  }),
);

r.get(
  '/events',
  requirePortal('member', 'volunteer'),
  asyncHandler(async (req: AuthRequest, res) => {
    const events = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startsAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
      orderBy: { startsAt: 'asc' },
      take: 40,
      include: {
        office: { select: { name: true } },
        _count: { select: { attendees: true } },
      },
    });

    let myRsvps: string[] = [];
    if (req.user!.portal === 'member') {
      const member = await prisma.member.findUnique({ where: { id: req.user!.id } });
      if (member?.email) {
        const rows = await prisma.eventAttendee.findMany({
          where: { email: member.email },
          select: { eventId: true },
        });
        myRsvps = rows.map((r) => r.eventId);
      }
    }

    res.json({
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        venue: e.venue,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        capacity: e.capacity,
        office: e.office?.name || null,
        attendees: e._count.attendees,
        rsvped: myRsvps.includes(e.id),
      })),
    });
  }),
);

r.post(
  '/events/:id/rsvp',
  requirePortal('member'),
  asyncHandler(async (req: AuthRequest, res) => {
    const eventId = param(req.params.id);
    const event = await prisma.event.findFirst({ where: { id: eventId, status: 'PUBLISHED' } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const member = await prisma.member.findUnique({ where: { id: req.user!.id } });
    if (!member?.email) return res.status(400).json({ error: 'Add an email to your profile before RSVPing' });

    const existing = await prisma.eventAttendee.findFirst({
      where: { eventId, email: member.email },
    });
    if (existing) return res.json({ ok: true, attendee: existing, already: true });

    if (event.capacity) {
      const count = await prisma.eventAttendee.count({ where: { eventId } });
      if (count >= event.capacity) return res.status(400).json({ error: 'Event is at capacity' });
    }

    const attendee = await prisma.eventAttendee.create({
      data: {
        eventId,
        name: `${member.firstName} ${member.lastName}`,
        email: member.email,
        phone: member.phone,
        qrToken: qrToken(),
      },
    });
    await audit(req, 'CREATE', 'EventAttendee', attendee.id, undefined, { eventId });
    res.status(201).json({ ok: true, attendee });
  }),
);

r.get(
  '/campaigns',
  requirePortal('supporter'),
  asyncHandler(async (_req, res) => {
    const campaigns = await prisma.fundraisingCampaign.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
    res.json({
      campaigns,
      gateways: listGateways(),
    });
  }),
);

r.get(
  '/donations',
  requirePortal('supporter'),
  asyncHandler(async (req: AuthRequest, res) => {
    const supporter = await prisma.supporter.findUnique({ where: { id: req.user!.id } });
    if (!supporter?.email) return res.json({ donations: [] });
    const donations = await prisma.donation.findMany({
      where: { donorEmail: supporter.email },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { campaign: { select: { title: true } }, payment: true },
    });
    res.json({ donations });
  }),
);

r.post(
  '/donate',
  requirePortal('supporter'),
  asyncHandler(async (req: AuthRequest, res) => {
    const p = z
      .object({
        campaignId: z.string().min(1),
        amount: z.coerce.number().positive().max(1_000_000),
        currency: z.string().default('USD'),
        gateway: gatewayEnum.default('zaad'),
        donorPhone: z.string().optional(),
        returnUrl: z.string().url().optional(),
      })
      .parse(req.body);

    const supporter = await prisma.supporter.findUnique({ where: { id: req.user!.id } });
    if (!supporter) return res.status(404).json({ error: 'Supporter not found' });

    const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: p.campaignId } });
    if (!campaign || campaign.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Campaign is not accepting donations' });
    }

    const receiptNo = await nextReceiptNo();
    const donation = await prisma.donation.create({
      data: {
        campaignId: p.campaignId,
        amount: p.amount,
        currency: p.currency,
        gateway: p.gateway,
        donorName: `${supporter.firstName} ${supporter.lastName || ''}`.trim(),
        donorEmail: supporter.email,
        donorPhone: p.donorPhone || supporter.phone,
        donorCountry: supporter.country,
        receiptNo,
      },
    });

    const gateway = getGateway(p.gateway);
    const result = await gateway.createPayment({
      amount: p.amount,
      currency: p.currency,
      reference: donation.id,
      customerPhone: p.donorPhone || supporter.phone || undefined,
      customerEmail: supporter.email || undefined,
      customerName: `${supporter.firstName} ${supporter.lastName || ''}`.trim(),
      returnUrl: p.returnUrl,
      description: `Donation to ${campaign.title}`,
    });

    await prisma.paymentTransaction.create({
      data: {
        donationId: donation.id,
        gateway: p.gateway,
        externalRef: result.providerRef,
        amount: p.amount,
        currency: p.currency,
        rawStatus: result.status,
        verified: result.status === 'CONFIRMED',
        verifiedAt: result.status === 'CONFIRMED' ? new Date() : undefined,
      },
    });

    if (result.status === 'CONFIRMED') {
      await prisma.$transaction([
        prisma.donation.update({
          where: { id: donation.id },
          data: { status: 'CONFIRMED', providerRef: result.providerRef },
        }),
        prisma.fundraisingCampaign.update({
          where: { id: p.campaignId },
          data: { raisedAmount: { increment: p.amount } },
        }),
      ]);
    }

    await audit(req, 'CREATE', 'Donation', donation.id, undefined, { gateway: p.gateway, portal: 'supporter' });
    res.status(201).json({
      donationId: donation.id,
      receiptNo,
      status: result.status,
      gateway: p.gateway,
      checkoutUrl: result.checkoutUrl,
      instructions: result.instructions,
      providerRef: result.providerRef,
    });
  }),
);

r.get(
  '/consents',
  requirePortal('supporter'),
  asyncHandler(async (req: AuthRequest, res) => {
    const types = ['NEWS', 'EVENTS', 'FUNDRAISING', 'VOLUNTEERING', 'ELECTION_INFORMATION'] as const;
    const existing = await prisma.consent.findMany({ where: { supporterId: req.user!.id } });
    const byType = Object.fromEntries(existing.map((c) => [c.type, c]));
    res.json({
      consents: types.map((type) => ({
        type,
        granted: byType[type]?.granted ?? false,
        grantedAt: byType[type]?.grantedAt ?? null,
        revokedAt: byType[type]?.revokedAt ?? null,
      })),
    });
  }),
);

r.put(
  '/consents',
  requirePortal('supporter'),
  asyncHandler(async (req: AuthRequest, res) => {
    const body = z
      .object({
        consents: z.array(
          z.object({
            type: consentTypes,
            granted: z.boolean(),
          }),
        ),
      })
      .parse(req.body);

    for (const item of body.consents) {
      await prisma.consent.upsert({
        where: { supporterId_type: { supporterId: req.user!.id, type: item.type } },
        create: {
          supporterId: req.user!.id,
          type: item.type,
          granted: item.granted,
          source: 'supporter-portal',
          revokedAt: item.granted ? null : new Date(),
        },
        update: {
          granted: item.granted,
          revokedAt: item.granted ? null : new Date(),
          grantedAt: item.granted ? new Date() : undefined,
          source: 'supporter-portal',
        },
      });
    }
    await audit(req, 'UPDATE', 'Consent', req.user!.id);
    const consents = await prisma.consent.findMany({ where: { supporterId: req.user!.id } });
    res.json({ consents });
  }),
);

r.get(
  '/tasks',
  requirePortal('volunteer'),
  asyncHandler(async (req: AuthRequest, res) => {
    const volunteer = await prisma.volunteer.findUnique({ where: { id: req.user!.id } });
    const tasks = await prisma.task.findMany({
      where: { officeId: volunteer?.officeId || undefined },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { dueAt: 'asc' }],
      take: 60,
      include: { office: { select: { name: true } } },
    });
    res.json({ tasks });
  }),
);

r.patch(
  '/tasks/:id',
  requirePortal('volunteer'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = param(req.params.id);
    const body = z.object({ status: taskStatuses }).parse(req.body);
    const volunteer = await prisma.volunteer.findUnique({ where: { id: req.user!.id } });
    const existing = await prisma.task.findFirst({
      where: { id, officeId: volunteer?.officeId || undefined },
    });
    if (!existing) return res.status(404).json({ error: 'Task not found for your office' });

    const task = await prisma.task.update({
      where: { id },
      data: { status: body.status },
      include: { office: { select: { name: true } } },
    });
    await audit(req, 'UPDATE', 'Task', task.id, { status: existing.status }, { status: body.status });
    res.json({ task });
  }),
);

function sanitizePerson<T extends Record<string, unknown> | null>(row: T): T {
  if (!row) return row;
  const clone = { ...row } as Record<string, unknown>;
  delete clone.passwordHash;
  return clone as T;
}

export default r;
