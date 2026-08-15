import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth, permit } from '../middleware/auth.js';
import { asyncHandler, officeScope } from '../lib/helpers.js';

const r = Router();
r.use(auth, permit('analytics.read'));

r.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const scope = officeScope(req);
    const [
      members,
      supporters,
      offices,
      staff,
      volunteers,
      campaigns,
      events,
      tasks,
      donations,
      expenses,
      byCountry,
      recentDonations,
    ] = await Promise.all([
      prisma.member.count({ where: scope }),
      prisma.supporter.count({ where: scope }),
      prisma.office.count({ where: { active: true } }),
      prisma.staff.count({ where: { status: 'ACTIVE', ...scope } }),
      prisma.volunteer.count({ where: { status: 'ACTIVE', ...scope } }),
      prisma.fundraisingCampaign.count({ where: { status: 'ACTIVE', ...scope } }),
      prisma.event.count({ where: { status: 'PUBLISHED', ...scope } }),
      prisma.task.count({ where: { status: { not: 'DONE' }, ...scope } }),
      prisma.donation.aggregate({
        where: {
          status: 'CONFIRMED',
          ...(Object.keys(scope).length ? { campaign: scope } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { status: 'APPROVED', ...scope },
        _sum: { amount: true },
      }),
      prisma.supporter.groupBy({
        by: ['country'],
        where: scope,
        _count: { _all: true },
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),
      prisma.donation.findMany({
        where: {
          status: 'CONFIRMED',
          ...(Object.keys(scope).length ? { campaign: scope } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          amount: true,
          currency: true,
          donorCountry: true,
          createdAt: true,
          campaign: { select: { title: true } },
        },
      }),
    ]);

    res.json({
      members,
      supporters,
      offices,
      staff,
      volunteers,
      activeCampaigns: campaigns,
      upcomingEvents: events,
      openTasks: tasks,
      confirmedDonations: Number(donations._sum.amount || 0),
      approvedExpenses: Number(expenses._sum.amount || 0),
      supportersByCountry: byCountry.map((x) => ({ country: x.country, count: x._count._all })),
      recentDonations: recentDonations.map((d) => ({
        id: d.id,
        amount: Number(d.amount),
        currency: d.currency,
        country: d.donorCountry || '—',
        campaign: d.campaign.title,
        createdAt: d.createdAt,
      })),
    });
  }),
);

export default r;
