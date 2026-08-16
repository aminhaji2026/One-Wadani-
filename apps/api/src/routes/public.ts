import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getGateway } from '../services/payments.js';
import { randomBytes } from 'crypto';

const r = Router();

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function money(n: unknown) {
  return Number(n || 0);
}

function nextChargeDate(interval: 'MONTHLY' | 'WEEKLY', from = new Date()) {
  const d = new Date(from);
  if (interval === 'WEEKLY') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

r.get('/campaigns', async (_req, res) => {
  const rows = await prisma.fundraisingCampaign.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { updatedAt: 'desc' },
    include: { office: true, _count: { select: { donations: true } } },
  });
  res.json(
    rows.map((c) => ({
      id: c.id,
      slug: c.slug || c.id,
      title: c.title,
      description: c.description,
      story: c.story,
      shareText: c.shareText,
      targetAmount: money(c.targetAmount),
      raisedAmount: money(c.raisedAmount),
      currency: c.currency,
      imageUrl: c.imageUrl,
      videoUrl: c.videoUrl,
      endsAt: c.endsAt,
      office: c.office ? { name: c.office.name, country: c.office.country } : null,
      donorCount: c._count.donations,
      progress: Math.min(100, Math.round((money(c.raisedAmount) / Math.max(1, money(c.targetAmount))) * 100)),
    }))
  );
});

r.get('/campaigns/:idOrSlug', async (req, res) => {
  const key = String(req.params.idOrSlug);
  const c =
    (await prisma.fundraisingCampaign.findFirst({ where: { OR: [{ id: key }, { slug: key }], status: 'ACTIVE' }, include: { office: true, _count: { select: { donations: true } } } })) ||
    null;
  if (!c) return res.status(404).json({ error: 'Campaign not found' });
  const recent = await prisma.donation.findMany({
    where: { campaignId: c.id, status: 'CONFIRMED' },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { donorName: true, donorCountry: true, amount: true, currency: true, createdAt: true, recurring: true },
  });
  res.json({
    id: c.id,
    slug: c.slug || c.id,
    title: c.title,
    description: c.description,
    story: c.story,
    shareText: c.shareText || `Support ${c.title} — join Waddani's campaign for a fairer Somaliland.`,
    targetAmount: money(c.targetAmount),
    raisedAmount: money(c.raisedAmount),
    currency: c.currency,
    imageUrl: c.imageUrl,
    videoUrl: c.videoUrl,
    endsAt: c.endsAt,
    office: c.office ? { name: c.office.name, country: c.office.country } : null,
    donorCount: c._count.donations,
    progress: Math.min(100, Math.round((money(c.raisedAmount) / Math.max(1, money(c.targetAmount))) * 100)),
    recentDonations: recent.map((d) => ({
      name: d.donorName || 'Supporter',
      country: d.donorCountry || '—',
      amount: money(d.amount),
      currency: d.currency,
      recurring: d.recurring,
      at: d.createdAt,
    })),
  });
});

r.get('/impact', async (_req, res) => {
  const [members, supporters, volunteers, events, shifts, confirmed, expenses, offices, campaigns] = await Promise.all([
    prisma.member.count({ where: { status: 'ACTIVE' } }),
    prisma.supporter.count(),
    prisma.volunteer.count({ where: { status: 'ACTIVE' } }),
    prisma.event.count({ where: { status: { in: ['PUBLISHED', 'COMPLETED'] } } }),
    prisma.volunteerShiftSignup.count(),
    prisma.donation.aggregate({ where: { status: 'CONFIRMED' }, _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where: { status: 'APPROVED' }, _sum: { amount: true } }),
    prisma.office.count({ where: { active: true } }),
    prisma.fundraisingCampaign.count({ where: { status: 'ACTIVE' } }),
  ]);
  res.json({
    members,
    supporters,
    volunteers,
    eventsHeld: events,
    volunteerShiftsFilled: shifts,
    confirmedDonations: money(confirmed._sum.amount),
    donationCount: confirmed._count,
    fundsDeployed: money(expenses._sum.amount),
    activeOffices: offices,
    activeCampaigns: campaigns,
    note: 'Aggregate operational metrics only — no individual political profiling.',
  });
});

r.get('/diaspora', async (_req, res) => {
  const donations = await prisma.donation.groupBy({
    by: ['donorCountry'],
    where: { status: 'CONFIRMED', donorCountry: { not: null } },
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 12,
  });
  const members = await prisma.member.groupBy({
    by: ['country'],
    where: { status: 'ACTIVE' },
    _count: { _all: true },
    orderBy: { _count: { country: 'desc' } },
    take: 12,
  });
  const supporters = await prisma.supporter.groupBy({
    by: ['country'],
    _count: { _all: true },
    orderBy: { _count: { country: 'desc' } },
    take: 12,
  });
  const countries = new Set<string>([
    ...donations.map((d) => d.donorCountry!).filter(Boolean),
    ...members.map((m) => m.country),
    ...supporters.map((s) => s.country),
  ]);
  const board = [...countries]
    .map((country) => {
      const d = donations.find((x) => x.donorCountry === country);
      const m = members.find((x) => x.country === country);
      const s = supporters.find((x) => x.country === country);
      return {
        country,
        raised: money(d?._sum.amount),
        donors: d?._count._all || 0,
        members: m?._count._all || 0,
        supporters: s?._count._all || 0,
      };
    })
    .sort((a, b) => b.raised + b.members * 10 - (a.raised + a.members * 10));
  res.json({ leaderboard: board });
});

r.get('/offices/scoreboard', async (_req, res) => {
  const offices = await prisma.office.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  const rows = await Promise.all(
    offices.map(async (o) => {
      const [members, events, volunteers, raised] = await Promise.all([
        prisma.member.count({ where: { officeId: o.id, status: 'ACTIVE' } }),
        prisma.event.count({ where: { officeId: o.id, status: { in: ['PUBLISHED', 'COMPLETED'] } } }),
        prisma.volunteer.count({ where: { officeId: o.id, status: 'ACTIVE' } }),
        prisma.donation.aggregate({
          where: { status: 'CONFIRMED', campaign: { officeId: o.id } },
          _sum: { amount: true },
        }),
      ]);
      return {
        id: o.id,
        name: o.name,
        country: o.country,
        city: o.city,
        type: o.type,
        members,
        events,
        volunteers,
        raised: money(raised._sum.amount),
      };
    })
  );
  res.json({ offices: rows.sort((a, b) => b.raised + b.members * 5 - (a.raised + a.members * 5)) });
});

r.get('/events', async (_req, res) => {
  const now = new Date();
  const rows = await prisma.event.findMany({
    where: { status: { in: ['PUBLISHED', 'COMPLETED'] } },
    include: {
      office: true,
      _count: { select: { attendees: true, shifts: true } },
      shifts: { where: { status: 'OPEN' }, include: { _count: { select: { signups: true } } }, orderBy: { startsAt: 'asc' }, take: 3 },
    },
    orderBy: { startsAt: 'asc' },
    take: 40,
  });
  res.json(
    rows.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      venue: e.venue,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      capacity: e.capacity,
      status: e.status,
      imageUrl: e.imageUrl,
      office: e.office ? { name: e.office.name, country: e.office.country } : null,
      attendees: e._count.attendees,
      openShifts: e._count.shifts,
      upcoming: e.startsAt >= now,
      shifts: e.shifts.map((s) => ({
        id: s.id,
        title: s.title,
        role: s.role,
        startsAt: s.startsAt,
        capacity: s.capacity,
        signedUp: s._count.signups,
        seatsLeft: Math.max(0, s.capacity - s._count.signups),
      })),
    }))
  );
});

r.get('/events/:id', async (req, res) => {
  const e = await prisma.event.findUnique({
    where: { id: String(req.params.id) },
    include: {
      office: true,
      shifts: { include: { _count: { select: { signups: true } } }, orderBy: { startsAt: 'asc' } },
      _count: { select: { attendees: true } },
    },
  });
  if (!e || (e.status !== 'PUBLISHED' && e.status !== 'COMPLETED')) return res.status(404).json({ error: 'Event not found' });
  res.json({
    id: e.id,
    title: e.title,
    description: e.description,
    venue: e.venue,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    capacity: e.capacity,
    status: e.status,
    imageUrl: e.imageUrl,
    office: e.office ? { name: e.office.name, country: e.office.country, city: e.office.city } : null,
    attendees: e._count.attendees,
    completed: e.status === 'COMPLETED' || (e.endsAt ? e.endsAt < new Date() : e.startsAt < new Date(Date.now() - 3 * 3600000)),
    shifts: e.shifts.map((s) => ({
      id: s.id,
      title: s.title,
      role: s.role,
      description: s.description,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      capacity: s.capacity,
      status: s.status,
      signedUp: s._count.signups,
      seatsLeft: Math.max(0, s.capacity - s._count.signups),
    })),
  });
});

r.post('/events/:id/rsvp', async (req, res) => {
  const p = z
    .object({
      name: z.string().min(2),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })
    .parse(req.body);
  const event = await prisma.event.findUnique({ where: { id: String(req.params.id) } });
  if (!event || event.status !== 'PUBLISHED') return res.status(404).json({ error: 'Event not open for RSVP' });
  const attendee = await prisma.eventAttendee.create({
    data: {
      eventId: event.id,
      name: p.name,
      phone: p.phone,
      email: p.email,
      qrToken: randomBytes(12).toString('hex'),
    },
  });
  res.status(201).json({ ok: true, attendeeId: attendee.id, qrToken: attendee.qrToken });
});

r.get('/shifts', async (_req, res) => {
  const rows = await prisma.volunteerShift.findMany({
    where: { status: 'OPEN', startsAt: { gte: new Date(Date.now() - 6 * 3600000) } },
    include: {
      event: { include: { office: true } },
      _count: { select: { signups: true } },
    },
    orderBy: { startsAt: 'asc' },
    take: 50,
  });
  res.json(
    rows.map((s) => ({
      id: s.id,
      title: s.title,
      role: s.role,
      description: s.description,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      capacity: s.capacity,
      signedUp: s._count.signups,
      seatsLeft: Math.max(0, s.capacity - s._count.signups),
      event: {
        id: s.event.id,
        title: s.event.title,
        venue: s.event.venue,
        office: s.event.office ? { name: s.event.office.name, country: s.event.office.country } : null,
      },
    }))
  );
});

r.post('/shifts/:id/signup', async (req, res) => {
  const p = z
    .object({
      name: z.string().min(2),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      country: z.string().optional(),
      notes: z.string().optional(),
      reminderConsent: z.boolean().default(false),
    })
    .parse(req.body);
  const shift = await prisma.volunteerShift.findUnique({
    where: { id: String(req.params.id) },
    include: { _count: { select: { signups: true } } },
  });
  if (!shift || shift.status !== 'OPEN') return res.status(404).json({ error: 'Shift not available' });
  if (shift._count.signups >= shift.capacity) {
    await prisma.volunteerShift.update({ where: { id: shift.id }, data: { status: 'FULL' } });
    return res.status(409).json({ error: 'This shift is full' });
  }
  const signup = await prisma.volunteerShiftSignup.create({
    data: {
      shiftId: shift.id,
      name: p.name,
      phone: p.phone,
      email: p.email,
      country: p.country,
      notes: p.notes,
      reminderConsent: p.reminderConsent,
    },
  });
  if (shift._count.signups + 1 >= shift.capacity) {
    await prisma.volunteerShift.update({ where: { id: shift.id }, data: { status: 'FULL' } });
  }
  res.status(201).json({
    ok: true,
    signupId: signup.id,
    reminder: p.reminderConsent
      ? 'Consent recorded for WhatsApp/SMS shift reminders (consent-based only).'
      : 'No reminder consent recorded.',
  });
});

r.post('/join', async (req, res) => {
  const p = z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      country: z.string().default('Somaliland'),
      city: z.string().optional(),
      interest: z.enum(['member', 'volunteer', 'both']).default('member'),
      consents: z.array(z.enum(['NEWS', 'EVENTS', 'FUNDRAISING', 'VOLUNTEERING', 'ELECTION_INFORMATION'])).default(['NEWS', 'EVENTS']),
    })
    .parse(req.body);

  const supporter = await prisma.supporter.create({
    data: {
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      phone: p.phone,
      country: p.country,
      city: p.city,
      consents: { create: p.consents.map((type) => ({ type, source: 'public-join' })) },
    },
    include: { consents: true },
  });

  let volunteerId: string | undefined;
  if (p.interest === 'volunteer' || p.interest === 'both') {
    const v = await prisma.volunteer.create({
      data: {
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        skills: ['organising'],
      },
    });
    volunteerId = v.id;
  }

  res.status(201).json({
    ok: true,
    supporterId: supporter.id,
    volunteerId,
    next: {
      volunteerShifts: '/action#shifts',
      donate: '/donate',
      events: '/events',
      campaigns: '/campaigns',
    },
  });
});

r.post('/donations', async (req, res) => {
  const p = z
    .object({
      campaignId: z.string(),
      amount: z.coerce.number().positive(),
      currency: z.string().default('USD'),
      gateway: z.string().default('mock'),
      donorName: z.string().optional(),
      donorEmail: z.string().email().optional(),
      donorPhone: z.string().optional(),
      donorCountry: z.string().optional(),
      recurring: z.boolean().default(false),
      interval: z.enum(['MONTHLY', 'WEEKLY']).default('MONTHLY'),
      forceFail: z.boolean().optional(), // demo only for retry UX
    })
    .parse(req.body);

  const campaign = await prisma.fundraisingCampaign.findFirst({ where: { id: p.campaignId, status: 'ACTIVE' } });
  if (!campaign) return res.status(404).json({ error: 'Active campaign not found' });

  let subscriptionId: string | undefined;
  if (p.recurring) {
    const sub = await prisma.recurringDonation.create({
      data: {
        campaignId: p.campaignId,
        donorName: p.donorName,
        donorEmail: p.donorEmail,
        donorPhone: p.donorPhone,
        donorCountry: p.donorCountry,
        amount: p.amount,
        currency: p.currency,
        gateway: p.gateway,
        interval: p.interval,
        nextChargeAt: nextChargeDate(p.interval),
        status: 'ACTIVE',
      },
    });
    subscriptionId = sub.id;
  }

  const receiptNo = `DON-${Date.now()}`;
  const donation = await prisma.donation.create({
    data: {
      campaignId: p.campaignId,
      amount: p.amount,
      currency: p.currency,
      gateway: p.gateway,
      donorName: p.donorName,
      donorEmail: p.donorEmail,
      donorPhone: p.donorPhone,
      donorCountry: p.donorCountry,
      recurring: p.recurring,
      subscriptionId,
      receiptNo,
    },
  });

  const gateway = getGateway(p.gateway);
  let result = await gateway.createPayment({
    amount: p.amount,
    currency: p.currency,
    reference: donation.id,
    customerPhone: p.donorPhone,
  });

  // Demo path: allow simulating a failed charge so retry can be shown.
  if (p.forceFail || (p.gateway === 'zaad' && !process.env.ZAAD_API_KEY && p.amount === 13)) {
    result = { providerRef: result.providerRef, status: 'PENDING' };
    await prisma.donation.update({ where: { id: donation.id }, data: { status: 'FAILED' } });
    await prisma.paymentTransaction.create({
      data: {
        donationId: donation.id,
        gateway: p.gateway,
        externalRef: result.providerRef,
        amount: p.amount,
        currency: p.currency,
        rawStatus: 'FAILED',
        verified: false,
        attempt: 1,
      },
    });
    if (subscriptionId) {
      await prisma.recurringDonation.update({
        where: { id: subscriptionId },
        data: { status: 'PAST_DUE', failedAttempts: 1, lastFailureAt: new Date(), lastFailureReason: 'Payment pending/failed' },
      });
    }
    return res.status(201).json({
      donationId: donation.id,
      receiptNo,
      status: 'FAILED',
      subscriptionId,
      retryable: true,
      message: 'Payment did not complete. You can retry safely.',
    });
  }

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
      attempt: 1,
    },
  });

  if (result.status === 'CONFIRMED') {
    await prisma.$transaction([
      prisma.donation.update({ where: { id: donation.id }, data: { status: 'CONFIRMED', providerRef: result.providerRef } }),
      prisma.fundraisingCampaign.update({ where: { id: p.campaignId }, data: { raisedAmount: { increment: p.amount } } }),
      prisma.ledgerEntry.create({
        data: {
          type: 'INCOME',
          amount: p.amount,
          currency: p.currency,
          account: 'Fundraising',
          reference: receiptNo,
          description: `Donation to campaign ${campaign.title}`,
        },
      }),
    ]);
  }

  res.status(201).json({
    donationId: donation.id,
    receiptNo,
    status: result.status,
    checkoutUrl: result.checkoutUrl,
    subscriptionId,
    recurring: p.recurring,
    next: { join: '/join', action: '/action#shifts', events: '/events' },
  });
});

r.post('/donations/:id/retry', async (req, res) => {
  const donation = await prisma.donation.findUnique({
    where: { id: String(req.params.id) },
    include: { payment: true, subscription: true, campaign: true },
  });
  if (!donation) return res.status(404).json({ error: 'Donation not found' });
  if (donation.status === 'CONFIRMED') return res.json({ status: 'CONFIRMED', message: 'Already confirmed' });

  const gateway = getGateway(donation.gateway);
  const result = await gateway.createPayment({
    amount: money(donation.amount),
    currency: donation.currency,
    reference: `${donation.id}_retry_${donation.retryCount + 1}`,
    customerPhone: donation.donorPhone || undefined,
  });

  const attempt = donation.retryCount + 1;
  if (donation.payment) {
    await prisma.paymentTransaction.update({
      where: { id: donation.payment.id },
      data: {
        externalRef: result.providerRef,
        rawStatus: result.status,
        verified: result.status === 'CONFIRMED',
        verifiedAt: result.status === 'CONFIRMED' ? new Date() : null,
        attempt,
      },
    });
  } else {
    await prisma.paymentTransaction.create({
      data: {
        donationId: donation.id,
        gateway: donation.gateway,
        externalRef: result.providerRef,
        amount: donation.amount,
        currency: donation.currency,
        rawStatus: result.status,
        verified: result.status === 'CONFIRMED',
        verifiedAt: result.status === 'CONFIRMED' ? new Date() : undefined,
        attempt,
      },
    });
  }

  await prisma.donation.update({
    where: { id: donation.id },
    data: { retryCount: attempt, lastRetryAt: new Date(), status: result.status === 'CONFIRMED' ? 'CONFIRMED' : 'FAILED' },
  });

  if (result.status === 'CONFIRMED') {
    await prisma.$transaction([
      prisma.fundraisingCampaign.update({
        where: { id: donation.campaignId },
        data: { raisedAmount: { increment: donation.amount } },
      }),
      prisma.ledgerEntry.create({
        data: {
          type: 'INCOME',
          amount: donation.amount,
          currency: donation.currency,
          account: 'Fundraising',
          reference: donation.receiptNo,
          description: `Retry confirmed donation ${donation.receiptNo}`,
        },
      }),
    ]);
    if (donation.subscriptionId) {
      await prisma.recurringDonation.update({
        where: { id: donation.subscriptionId },
        data: { status: 'ACTIVE', failedAttempts: 0, lastFailureReason: null },
      });
    }
  } else if (donation.subscriptionId) {
    await prisma.recurringDonation.update({
      where: { id: donation.subscriptionId },
      data: {
        status: 'PAST_DUE',
        failedAttempts: { increment: 1 },
        lastFailureAt: new Date(),
        lastFailureReason: 'Retry still pending/failed',
      },
    });
  }

  res.json({ status: result.status, attempt, donationId: donation.id, retryable: result.status !== 'CONFIRMED' });
});

// Process due recurring charges (callable by ops / cron). Mock confirms immediately.
r.post('/recurring/process-due', async (_req, res) => {
  const due = await prisma.recurringDonation.findMany({
    where: { status: { in: ['ACTIVE', 'PAST_DUE'] }, nextChargeAt: { lte: new Date() } },
    take: 50,
  });
  const results = [];
  for (const sub of due) {
    const receiptNo = `DON-R-${Date.now()}-${sub.id.slice(-4)}`;
    const donation = await prisma.donation.create({
      data: {
        campaignId: sub.campaignId,
        amount: sub.amount,
        currency: sub.currency,
        gateway: sub.gateway,
        donorName: sub.donorName,
        donorEmail: sub.donorEmail,
        donorPhone: sub.donorPhone,
        donorCountry: sub.donorCountry,
        recurring: true,
        subscriptionId: sub.id,
        receiptNo,
      },
    });
    const gateway = getGateway(sub.gateway);
    const result = await gateway.createPayment({
      amount: money(sub.amount),
      currency: sub.currency,
      reference: donation.id,
      customerPhone: sub.donorPhone || undefined,
    });
    await prisma.paymentTransaction.create({
      data: {
        donationId: donation.id,
        gateway: sub.gateway,
        externalRef: result.providerRef,
        amount: sub.amount,
        currency: sub.currency,
        rawStatus: result.status,
        verified: result.status === 'CONFIRMED',
        verifiedAt: result.status === 'CONFIRMED' ? new Date() : undefined,
      },
    });
    if (result.status === 'CONFIRMED') {
      await prisma.$transaction([
        prisma.donation.update({ where: { id: donation.id }, data: { status: 'CONFIRMED', providerRef: result.providerRef } }),
        prisma.fundraisingCampaign.update({ where: { id: sub.campaignId }, data: { raisedAmount: { increment: sub.amount } } }),
        prisma.recurringDonation.update({
          where: { id: sub.id },
          data: { nextChargeAt: nextChargeDate(sub.interval), status: 'ACTIVE', failedAttempts: 0 },
        }),
        prisma.ledgerEntry.create({
          data: {
            type: 'INCOME',
            amount: sub.amount,
            currency: sub.currency,
            account: 'Fundraising',
            reference: receiptNo,
            description: `Recurring donation ${receiptNo}`,
          },
        }),
      ]);
      results.push({ subscriptionId: sub.id, status: 'CONFIRMED' });
    } else {
      await prisma.donation.update({ where: { id: donation.id }, data: { status: 'FAILED' } });
      await prisma.recurringDonation.update({
        where: { id: sub.id },
        data: {
          status: 'PAST_DUE',
          failedAttempts: { increment: 1 },
          lastFailureAt: new Date(),
          lastFailureReason: 'Recurring charge pending/failed',
          nextChargeAt: nextChargeDate('WEEKLY'),
        },
      });
      results.push({ subscriptionId: sub.id, status: 'FAILED', donationId: donation.id });
    }
  }
  res.json({ processed: results.length, results });
});

export { slugify };
export default r;
