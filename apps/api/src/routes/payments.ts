import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { auth, permit, type AuthRequest } from '../middleware/auth.js';
import { getGateway } from '../services/payments.js';
import { audit } from '../services/audit.js';
import { asyncHandler, officeScope, param, parseLimit } from '../lib/helpers.js';
import { nextReceiptNo } from '../lib/ids.js';

const r = Router();

r.post(
  '/donations',
  asyncHandler(async (req, res) => {
    const p = z
      .object({
        campaignId: z.string().min(1),
        amount: z.coerce.number().positive().max(1_000_000),
        currency: z.string().default('USD'),
        gateway: z.enum(['mock', 'zaad']).default('mock'),
        donorName: z.string().optional(),
        donorEmail: z.string().email().optional(),
        donorPhone: z.string().optional(),
        donorCountry: z.string().optional(),
        recurring: z.boolean().default(false),
      })
      .parse(req.body);

    const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: p.campaignId } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Campaign is not accepting donations' });
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
        prisma.ledgerEntry.create({
          data: {
            type: 'INCOME',
            amount: p.amount,
            currency: p.currency,
            account: 'Fundraising',
            reference: receiptNo,
            description: `Donation to campaign ${p.campaignId}`,
          },
        }),
      ]);
    }

    res.status(201).json({
      donationId: donation.id,
      receiptNo,
      status: result.status,
      checkoutUrl: result.checkoutUrl,
    });
  }),
);

r.post(
  '/webhooks/:gateway',
  asyncHandler(async (req, res) => {
    const gateway = getGateway(param(req.params.gateway));
    const verified = await gateway.verifyWebhook(req.body, req.headers['x-signature'] as string | undefined);
    const payment = await prisma.paymentTransaction.findFirst({
      where: { externalRef: verified.providerRef },
      include: { donation: true },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (verified.confirmed && !payment.verified) {
      await prisma.$transaction([
        prisma.paymentTransaction.update({
          where: { id: payment.id },
          data: { verified: true, verifiedAt: new Date(), rawStatus: 'CONFIRMED' },
        }),
        prisma.donation.update({
          where: { id: payment.donationId },
          data: { status: 'CONFIRMED' },
        }),
        prisma.fundraisingCampaign.update({
          where: { id: payment.donation.campaignId },
          data: { raisedAmount: { increment: payment.amount } },
        }),
        prisma.ledgerEntry.create({
          data: {
            type: 'INCOME',
            amount: payment.amount,
            currency: payment.currency,
            account: 'Fundraising',
            reference: payment.donation.receiptNo,
            description: `Verified donation ${payment.donation.receiptNo}`,
          },
        }),
      ]);
    }

    res.json({ ok: true });
  }),
);

r.get(
  '/donations',
  auth,
  permit('fundraising.read'),
  asyncHandler(async (req, res) => {
    const scope = officeScope(req);
    res.json(
      await prisma.donation.findMany({
        where: Object.keys(scope).length ? { campaign: scope } : undefined,
        take: parseLimit(req.query.limit, 100, 250),
        orderBy: { createdAt: 'desc' },
        include: { campaign: true, payment: true },
      }),
    );
  }),
);

r.post(
  '/campaigns/:id/approve',
  auth,
  permit('fundraising.write'),
  asyncHandler(async (req: AuthRequest, res) => {
    const existing = await prisma.fundraisingCampaign.findFirst({
      where: { id: param(req.params.id), ...officeScope(req) },
    });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });

    const x = await prisma.fundraisingCampaign.update({
      where: { id: existing.id },
      data: { status: 'ACTIVE' },
    });
    await prisma.approval.updateMany({
      where: { fundraisingCampaignId: x.id, status: 'PENDING' },
      data: { status: 'APPROVED', decidedBy: req.user!.id, decidedAt: new Date() },
    });
    await audit(req, 'APPROVE', 'FundraisingCampaign', x.id);
    res.json(x);
  }),
);

export default r;
