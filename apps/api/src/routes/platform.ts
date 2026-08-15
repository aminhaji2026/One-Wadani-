import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { auth, permit, requirePortal, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler, param, parseLimit } from '../lib/helpers.js';
import { nextSequential } from '../lib/ids.js';
import { audit } from '../services/audit.js';
import { notify } from '../services/notifications.js';
import { generateTotpSecret, totpOtpauthUrl, verifyTotp } from '../services/totp.js';
import { slugify } from '../services/sessions.js';

const r = Router();

r.get(
  '/approvals/inbox',
  auth,
  permit('members.read'),
  asyncHandler(async (req, res) => {
    const approvals = await prisma.approval.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        fundraisingCampaign: true,
        expense: true,
        communicationCampaign: true,
      },
    });
    const registrations = await prisma.portalRegistration.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ approvals, registrations });
  }),
);

r.get(
  '/registrations',
  auth,
  permit('members.read'),
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const rows = await prisma.portalRegistration.findMany({
      where: status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : undefined,
      orderBy: { createdAt: 'desc' },
      take: parseLimit(req.query.limit, 100, 250),
    });
    res.json(rows);
  }),
);

r.post(
  '/registrations/:id/decide',
  auth,
  permit('members.write'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = param(req.params.id);
    const body = z
      .object({
        decision: z.enum(['APPROVED', 'REJECTED']),
        note: z.string().max(500).optional(),
      })
      .parse(req.body);

    const reg = await prisma.portalRegistration.findUnique({ where: { id } });
    if (!reg || reg.status !== 'PENDING') return res.status(404).json({ error: 'Pending registration not found' });

    if (body.decision === 'REJECTED') {
      const updated = await prisma.portalRegistration.update({
        where: { id },
        data: {
          status: 'REJECTED',
          decidedBy: req.user!.id,
          decidedAt: new Date(),
          decisionNote: body.note,
        },
      });
      await notify({
        recipientPortal: reg.kind.toLowerCase(),
        recipientId: reg.id,
        title: 'Registration update',
        body: 'Your Waddani One registration was not approved.',
        email: reg.email,
      });
      await audit(req, 'REJECT', 'PortalRegistration', id);
      return res.json(updated);
    }

    let accountId = '';
    if (reg.kind === 'MEMBER') {
      const membershipNo = await nextSequential('member', 'WD-');
      const member = await prisma.member.create({
        data: {
          membershipNo,
          firstName: reg.firstName,
          lastName: reg.lastName,
          email: reg.email,
          phone: reg.phone,
          country: reg.country,
          city: reg.city,
          passwordHash: reg.passwordHash,
          portalEnabled: true,
          mustChangePassword: false,
          status: 'ACTIVE',
          officeId: req.user!.officeId || 'hq',
          joinedAt: new Date(),
        },
      });
      accountId = member.id;
      await notify({
        recipientPortal: 'member',
        recipientId: member.id,
        title: 'Welcome to Waddani One',
        body: `Your membership ${membershipNo} is active. You can sign in to the Members portal.`,
        email: member.email,
        link: '/',
      });
    } else if (reg.kind === 'SUPPORTER') {
      const supporter = await prisma.supporter.create({
        data: {
          firstName: reg.firstName,
          lastName: reg.lastName,
          email: reg.email,
          phone: reg.phone,
          country: reg.country,
          city: reg.city,
          passwordHash: reg.passwordHash,
          portalEnabled: true,
          mustChangePassword: false,
          status: 'ACTIVE',
          officeId: req.user!.officeId || 'hq',
          consents: {
            create: [{ type: 'NEWS' }, { type: 'FUNDRAISING' }],
          },
        },
      });
      accountId = supporter.id;
      await notify({
        recipientPortal: 'supporter',
        recipientId: supporter.id,
        title: 'Welcome, supporter',
        body: 'Your supporter portal is ready. You can follow campaigns and manage consents.',
        email: supporter.email,
      });
    } else {
      const volunteer = await prisma.volunteer.create({
        data: {
          firstName: reg.firstName,
          lastName: reg.lastName,
          email: reg.email,
          phone: reg.phone,
          skills: reg.skills,
          passwordHash: reg.passwordHash,
          portalEnabled: true,
          mustChangePassword: false,
          status: 'ACTIVE',
          officeId: req.user!.officeId || 'hq',
        },
      });
      accountId = volunteer.id;
      await notify({
        recipientPortal: 'volunteer',
        recipientId: volunteer.id,
        title: 'Welcome, volunteer',
        body: 'Your volunteer portal is ready. Check Tasks for office assignments.',
        email: volunteer.email,
      });
    }

    const updated = await prisma.portalRegistration.update({
      where: { id },
      data: {
        status: 'APPROVED',
        decidedBy: req.user!.id,
        decidedAt: new Date(),
        decisionNote: body.note || accountId,
      },
    });
    await audit(req, 'APPROVE', 'PortalRegistration', id, undefined, { accountId });
    res.json(updated);
  }),
);

r.get(
  '/announcements',
  auth,
  asyncHandler(async (req: AuthRequest, res) => {
    const portal = req.user!.portal;
    const audience =
      portal === 'staff'
        ? ['ALL', 'STAFF']
        : portal === 'member'
          ? ['ALL', 'MEMBER']
          : portal === 'supporter'
            ? ['ALL', 'SUPPORTER']
            : ['ALL', 'VOLUNTEER'];
    const rows = await prisma.announcement.findMany({
      where: { published: true, audience: { in: audience as ('ALL' | 'STAFF' | 'MEMBER' | 'SUPPORTER' | 'VOLUNTEER')[] } },
      orderBy: { publishedAt: 'desc' },
      take: 30,
    });
    res.json({ announcements: rows });
  }),
);

r.post(
  '/announcements',
  auth,
  permit('communications.write'),
  asyncHandler(async (req: AuthRequest, res) => {
    const body = z
      .object({
        title: z.string().min(1).max(160),
        body: z.string().min(1).max(4000),
        audience: z.enum(['ALL', 'STAFF', 'MEMBER', 'SUPPORTER', 'VOLUNTEER']).default('ALL'),
      })
      .parse(req.body);
    const row = await prisma.announcement.create({
      data: {
        title: body.title,
        body: body.body,
        audience: body.audience,
        createdById: req.user!.id,
        officeId: req.user!.officeId,
      },
    });
    await audit(req, 'CREATE', 'Announcement', row.id);
    res.status(201).json(row);
  }),
);

r.get(
  '/notifications',
  auth,
  asyncHandler(async (req: AuthRequest, res) => {
    const rows = await prisma.appNotification.findMany({
      where: { recipientPortal: req.user!.portal, recipientId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ notifications: rows });
  }),
);

r.post(
  '/notifications/:id/read',
  auth,
  asyncHandler(async (req: AuthRequest, res) => {
    const id = param(req.params.id);
    const row = await prisma.appNotification.findFirst({
      where: { id, recipientPortal: req.user!.portal, recipientId: req.user!.id },
    });
    if (!row) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.appNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    res.json(updated);
  }),
);

r.get(
  '/audit/export',
  auth,
  permit('security.read'),
  asyncHandler(async (req, res) => {
    const rows = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: parseLimit(req.query.limit, 500, 2000),
      include: { actor: { select: { email: true, firstName: true, lastName: true } } },
    });
    const header = 'createdAt,actor,action,entity,entityId,ip';
    const lines = rows.map((r) =>
      [
        r.createdAt.toISOString(),
        r.actor ? `${r.actor.firstName} ${r.actor.lastName} <${r.actor.email}>` : '',
        r.action,
        r.entity,
        r.entityId || '',
        r.ip || '',
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(','),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="waddani-audit.csv"');
    res.send([header, ...lines].join('\n'));
  }),
);

r.post(
  '/security/2fa/setup',
  auth,
  requirePortal('staff'),
  asyncHandler(async (req: AuthRequest, res) => {
    const secret = generateTotpSecret();
    await prisma.user.update({ where: { id: req.user!.id }, data: { totpSecret: secret, totpEnabled: false } });
    res.json({
      secret,
      otpauthUrl: totpOtpauthUrl(req.user!.email || req.user!.id, secret),
      qrImage: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
        totpOtpauthUrl(req.user!.email || req.user!.id, secret),
      )}`,
    });
  }),
);

r.post(
  '/security/2fa/enable',
  auth,
  requirePortal('staff'),
  asyncHandler(async (req: AuthRequest, res) => {
    const body = z.object({ code: z.string().min(6).max(8) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.totpSecret) return res.status(400).json({ error: 'Run 2FA setup first' });
    if (!verifyTotp(user.totpSecret, body.code)) return res.status(400).json({ error: 'Invalid authenticator code' });
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
    await audit(req, 'UPDATE', 'User2FA', user.id, undefined, { totpEnabled: true });
    res.json({ ok: true, totpEnabled: true });
  }),
);

r.post(
  '/security/2fa/disable',
  auth,
  requirePortal('staff'),
  asyncHandler(async (req: AuthRequest, res) => {
    const body = z
      .object({
        password: z.string().min(8),
        code: z.string().min(6).max(8).optional(),
      })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Password incorrect' });
    }
    if (user.totpEnabled && user.totpSecret && body.code && !verifyTotp(user.totpSecret, body.code)) {
      return res.status(400).json({ error: 'Invalid authenticator code' });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: false, totpSecret: null },
    });
    await audit(req, 'UPDATE', 'User2FA', user.id, undefined, { totpEnabled: false });
    res.json({ ok: true, totpEnabled: false });
  }),
);

r.post(
  '/campaigns/:id/publish-slug',
  auth,
  permit('fundraising.write'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = param(req.params.id);
    const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id } });
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    const slug = campaign.slug || `${slugify(campaign.title)}-${campaign.id.slice(-6)}`;
    const updated = await prisma.fundraisingCampaign.update({
      where: { id },
      data: { slug },
    });
    res.json({
      campaign: updated,
      shareUrl: `/c/${updated.slug}`,
    });
  }),
);

r.get(
  '/events/:id/check-ins',
  auth,
  permit('events.read'),
  asyncHandler(async (req, res) => {
    const id = param(req.params.id);
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      attendees,
      checkedIn: attendees.filter((a) => a.checkedIn).length,
      total: attendees.length,
    });
  }),
);

export default r;
