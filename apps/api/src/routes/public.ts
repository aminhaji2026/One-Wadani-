import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/helpers.js';
import { nextReceiptNo } from '../lib/ids.js';
import { notify } from '../services/notifications.js';
import { sendMail } from '../services/mailer.js';
import { slugify } from '../services/sessions.js';
import { getGateway, listGateways } from '../services/payments.js';

const r = Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Try again later.' },
});

r.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        kind: z.enum(['MEMBER', 'SUPPORTER', 'VOLUNTEER']),
        firstName: z.string().min(1).max(80),
        lastName: z.string().min(1).max(80),
        email: z.string().email(),
        phone: z.string().max(40).optional(),
        country: z.string().min(2).max(80),
        city: z.string().max(80).optional(),
        password: z.string().min(10).max(128),
        skills: z.array(z.string().max(40)).max(12).optional(),
        message: z.string().max(500).optional(),
      })
      .parse(req.body);

    const email = body.email.toLowerCase().trim();
    const existingReg = await prisma.portalRegistration.findFirst({
      where: { email, status: 'PENDING' },
    });
    if (existingReg) return res.status(409).json({ error: 'A pending registration already exists for this email' });

    if (body.kind === 'MEMBER') {
      const exists = await prisma.member.findUnique({ where: { email } });
      if (exists) return res.status(409).json({ error: 'Member account already exists. Please sign in.' });
    }
    if (body.kind === 'SUPPORTER') {
      const exists = await prisma.supporter.findUnique({ where: { email } });
      if (exists) return res.status(409).json({ error: 'Supporter account already exists. Please sign in.' });
    }
    if (body.kind === 'VOLUNTEER') {
      const exists = await prisma.volunteer.findUnique({ where: { email } });
      if (exists) return res.status(409).json({ error: 'Volunteer account already exists. Please sign in.' });
    }

    const reg = await prisma.portalRegistration.create({
      data: {
        kind: body.kind,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        email,
        phone: body.phone,
        country: body.country,
        city: body.city,
        passwordHash: await bcrypt.hash(body.password.trim(), 12),
        skills: body.skills || [],
        message: body.message,
      },
    });

    await sendMail({
      to: email,
      subject: 'Waddani One registration received',
      text: `Thank you ${body.firstName}. Your ${body.kind.toLowerCase()} registration is pending staff approval.`,
    });

    res.status(201).json({
      ok: true,
      id: reg.id,
      message: 'Registration submitted for staff approval. You will be notified when approved.',
    });
  }),
);

r.post(
  '/password-reset/request',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        portal: z.enum(['staff', 'member', 'supporter', 'volunteer']),
      })
      .parse(req.body);
    const email = body.email.toLowerCase().trim();

    let accountId: string | null = null;
    if (body.portal === 'staff') {
      accountId = (await prisma.user.findUnique({ where: { email } }))?.id || null;
    } else if (body.portal === 'member') {
      accountId = (await prisma.member.findUnique({ where: { email } }))?.id || null;
    } else if (body.portal === 'supporter') {
      accountId = (await prisma.supporter.findUnique({ where: { email } }))?.id || null;
    } else {
      accountId = (await prisma.volunteer.findUnique({ where: { email } }))?.id || null;
    }

    // Always return ok to avoid account enumeration.
    if (accountId) {
      const raw = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(raw).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          portal: body.portal,
          accountId,
          email,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      const origin = (process.env.WEB_ORIGIN || '').split(',')[0] || 'https://workspace-production-7d71.up.railway.app';
      const link = `${origin.replace(/\/$/, '')}/?reset=${raw}&portal=${body.portal}&email=${encodeURIComponent(email)}`;
      await sendMail({
        to: email,
        subject: 'Reset your Waddani One password',
        text: `Use this link within 1 hour to reset your password:\n${link}\n\nIf you did not request this, ignore the email.`,
      });
    }

    res.json({ ok: true, message: 'If the account exists, a reset link has been sent.' });
  }),
);

r.post(
  '/password-reset/confirm',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        token: z.string().min(20),
        newPassword: z.string().min(10).max(128),
      })
      .parse(req.body);
    const tokenHash = createHash('sha256').update(body.token).digest('hex');
    const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Reset link is invalid or expired' });
    }

    const passwordHash = await bcrypt.hash(body.newPassword.trim(), 12);
    if (row.portal === 'staff') {
      await prisma.user.update({
        where: { id: row.accountId },
        data: { passwordHash, mustChangePassword: false },
      });
    } else if (row.portal === 'member') {
      await prisma.member.update({
        where: { id: row.accountId },
        data: { passwordHash, mustChangePassword: false },
      });
    } else if (row.portal === 'supporter') {
      await prisma.supporter.update({
        where: { id: row.accountId },
        data: { passwordHash, mustChangePassword: false },
      });
    } else {
      await prisma.volunteer.update({
        where: { id: row.accountId },
        data: { passwordHash, mustChangePassword: false },
      });
    }

    await prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    await prisma.authSession.updateMany({
      where: { portal: row.portal, accountId: row.accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    res.json({ ok: true, message: 'Password updated. You can sign in now.' });
  }),
);

r.get(
  '/public/campaigns',
  asyncHandler(async (_req, res) => {
    const campaigns = await prisma.fundraisingCampaign.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        message: true,
        imageUrl: true,
        targetAmount: true,
        raisedAmount: true,
        currency: true,
      },
    });
    res.json({ campaigns, gateways: listGateways().filter((g) => g.id !== 'mock') });
  }),
);

r.get(
  '/public/campaigns/:slugOrId',
  asyncHandler(async (req, res) => {
    const key = String(req.params.slugOrId);
    const campaign =
      (await prisma.fundraisingCampaign.findFirst({ where: { slug: key, status: 'ACTIVE' } })) ||
      (await prisma.fundraisingCampaign.findFirst({ where: { id: key, status: 'ACTIVE' } }));
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json({
      campaign,
      shareUrl: `${(process.env.WEB_ORIGIN || '').split(',')[0] || ''}/c/${campaign.slug || campaign.id}`,
      gateways: listGateways(),
    });
  }),
);

r.post(
  '/public/donate',
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        campaignId: z.string().min(1),
        amount: z.coerce.number().positive().max(1_000_000),
        currency: z.string().default('USD'),
        gateway: z.enum(['mock', 'zaad', 'edahab', 'premier', 'mycash', 'sifalo', 'stripe']).default('zaad'),
        donorName: z.string().optional(),
        donorEmail: z.string().email().optional(),
        donorPhone: z.string().optional(),
        donorCountry: z.string().optional(),
        recurring: z.boolean().default(false),
        returnUrl: z.string().url().optional(),
      })
      .parse(req.body);

    const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: p.campaignId } });
    if (!campaign || campaign.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Campaign is not accepting donations' });
    }
    if (!campaign.slug) {
      await prisma.fundraisingCampaign.update({
        where: { id: campaign.id },
        data: { slug: `${slugify(campaign.title)}-${campaign.id.slice(-6)}` },
      });
    }

    const receiptNo = await nextReceiptNo();
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
        receiptNo,
      },
    });

    const gateway = getGateway(p.gateway);
    const result = await gateway.createPayment({
      amount: p.amount,
      currency: p.currency,
      reference: donation.id,
      customerPhone: p.donorPhone,
      customerEmail: p.donorEmail,
      customerName: p.donorName,
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

    if (p.donorEmail) {
      await sendMail({
        to: p.donorEmail,
        subject: `Waddani donation receipt ${receiptNo}`,
        text: `Thank you for supporting ${campaign.title}.\nReceipt: ${receiptNo}\nAmount: ${p.currency} ${p.amount}\nStatus: ${result.status}\nGateway: ${p.gateway}`,
      });
    }

    res.status(201).json({
      donationId: donation.id,
      receiptNo,
      status: result.status,
      gateway: p.gateway,
      checkoutUrl: result.checkoutUrl,
      instructions: result.instructions,
      receiptUrl: `/api/public/receipts/${receiptNo}`,
    });
  }),
);

r.get(
  '/public/receipts/:receiptNo',
  asyncHandler(async (req, res) => {
    const receiptNo = String(req.params.receiptNo);
    const donation = await prisma.donation.findUnique({
      where: { receiptNo },
      include: { campaign: true, payment: true },
    });
    if (!donation) return res.status(404).json({ error: 'Receipt not found' });
    const printableHtml = `<!doctype html><html><body style="font-family:sans-serif;padding:24px"><h1>Waddani One</h1><h2>Donation receipt</h2><p><b>${donation.receiptNo}</b></p><p>${donation.campaign.title}</p><p>${donation.currency} ${donation.amount}</p><p>Status: ${donation.status}</p><p>Gateway: ${donation.gateway}</p><p>${donation.recurring ? 'Recurring monthly gift' : 'One-time gift'}</p><p>${new Date(donation.createdAt).toLocaleString()}</p><script>window.print&&window.print()</script></body></html>`;
    if (String(req.query.format || '').toLowerCase() === 'html' || String(req.headers.accept || '').includes('text/html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(printableHtml);
    }
    res.json({
      receiptNo: donation.receiptNo,
      amount: donation.amount,
      currency: donation.currency,
      status: donation.status,
      gateway: donation.gateway,
      donorName: donation.donorName,
      campaign: donation.campaign.title,
      createdAt: donation.createdAt,
      recurring: donation.recurring,
      printableHtml,
    });
  }),
);

r.post(
  '/public/events/check-in',
  asyncHandler(async (req, res) => {
    const body = z.object({ qrToken: z.string().min(8) }).parse(req.body);
    const attendee = await prisma.eventAttendee.findUnique({
      where: { qrToken: body.qrToken },
      include: { event: true },
    });
    if (!attendee) return res.status(404).json({ error: 'Invalid check-in code' });
    if (attendee.checkedIn) return res.json({ ok: true, already: true, attendee, event: attendee.event });
    const updated = await prisma.eventAttendee.update({
      where: { id: attendee.id },
      data: { checkedIn: true },
      include: { event: true },
    });
    res.json({ ok: true, already: false, attendee: updated, event: updated.event });
  }),
);

export default r;
