import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { auth, requirePortal, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/helpers.js';

const r = Router();
r.use(auth);

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
        where: { status: 'PUBLISHED' },
        orderBy: { startsAt: 'asc' },
        take: 5,
      });
      return res.json({
        portal,
        profile: member,
        upcomingEvents: events,
        cards: [
          { label: 'Membership No.', value: member?.membershipNo },
          { label: 'Status', value: member?.status },
          { label: 'Office', value: member?.office?.name || '—' },
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
        take: 5,
      });
      return res.json({
        portal,
        profile: supporter,
        activeCampaigns: campaigns,
        cards: [
          { label: 'Country', value: supporter?.country },
          { label: 'Status', value: supporter?.status },
          {
            label: 'Consents',
            value: (supporter?.consents || [])
              .filter((c) => c.granted)
              .map((c) => c.type)
              .join(', ') || 'None',
          },
        ],
      });
    }

    const volunteer = await prisma.volunteer.findUnique({
      where: { id: req.user!.id },
      include: { office: true },
    });
    const tasks = await prisma.task.findMany({
      where: { status: { not: 'DONE' }, officeId: volunteer?.officeId || undefined },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return res.json({
      portal,
      profile: volunteer,
      openTasks: tasks,
      cards: [
        { label: 'Skills', value: (volunteer?.skills || []).join(', ') || '—' },
        { label: 'Status', value: volunteer?.status },
        { label: 'Office', value: volunteer?.office?.name || '—' },
      ],
    });
  }),
);

export default r;
