import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const permissions = [
  'organisation.read',
  'organisation.write',
  'members.read',
  'members.write',
  'supporters.read',
  'supporters.write',
  'staff.read',
  'staff.write',
  'fundraising.read',
  'fundraising.write',
  'finance.read',
  'finance.write',
  'communications.read',
  'communications.write',
  'events.read',
  'events.write',
  'analytics.read',
  'security.read',
  'security.write',
] as const;

const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: [...permissions],
  OFFICE_MANAGER: [
    'organisation.read',
    'members.read',
    'members.write',
    'supporters.read',
    'supporters.write',
    'staff.read',
    'fundraising.read',
    'finance.read',
    'communications.read',
    'events.read',
    'events.write',
    'analytics.read',
  ],
  OFFICE_STAFF: [
    'organisation.read',
    'members.read',
    'members.write',
    'supporters.read',
    'supporters.write',
    'events.read',
    'events.write',
    'communications.read',
  ],
  FINANCE_OFFICER: [
    'organisation.read',
    'fundraising.read',
    'fundraising.write',
    'finance.read',
    'finance.write',
    'analytics.read',
  ],
  COMMS_OFFICER: [
    'organisation.read',
    'supporters.read',
    'communications.read',
    'communications.write',
    'events.read',
  ],
};

async function ensureRole(name: string, description: string, codes: string[]) {
  const role = await prisma.role.upsert({
    where: { name },
    update: { description },
    create: { name, description },
  });
  for (const code of codes) {
    const permission = await prisma.permission.findUnique({ where: { code } });
    if (!permission) continue;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }
  return role;
}

async function main() {
  for (const code of permissions) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
  }

  const superRole = await ensureRole('SUPER_ADMIN', 'Full platform access', rolePermissions.SUPER_ADMIN);
  await ensureRole('OFFICE_MANAGER', 'Office leadership', rolePermissions.OFFICE_MANAGER);
  await ensureRole('OFFICE_STAFF', 'Standard office staff', rolePermissions.OFFICE_STAFF);
  await ensureRole('FINANCE_OFFICER', 'Fundraising and finance', rolePermissions.FINANCE_OFFICER);
  await ensureRole('COMMS_OFFICER', 'Communications', rolePermissions.COMMS_OFFICER);

  const hq = await prisma.office.upsert({
    where: { id: 'hq' },
    update: {
      name: 'Waddani National Headquarters',
      type: 'HEADQUARTERS',
      country: 'Somaliland',
      city: 'Hargeisa',
      active: true,
    },
    create: {
      id: 'hq',
      name: 'Waddani National Headquarters',
      type: 'HEADQUARTERS',
      country: 'Somaliland',
      city: 'Hargeisa',
    },
  });

  const demoPassword = 'ChangeMe123!';
  const hash = await bcrypt.hash(demoPassword, 12);
  const resetPasswords = process.env.SEED_RESET_PASSWORDS === 'true';

  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@waddani.local' } });
  const admin = await prisma.user.upsert({
    where: { email: 'admin@waddani.local' },
    update: {
      status: 'ACTIVE',
      officeId: hq.id,
      firstName: 'System',
      lastName: 'Administrator',
      locale: 'en',
      ...(resetPasswords || !existingAdmin
        ? { passwordHash: hash, mustChangePassword: true }
        : {}),
    },
    create: {
      email: 'admin@waddani.local',
      passwordHash: hash,
      mustChangePassword: true,
      firstName: 'System',
      lastName: 'Administrator',
      officeId: hq.id,
      locale: 'en',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superRole.id },
  });

  await prisma.idCounter.upsert({ where: { name: 'member' }, update: {}, create: { name: 'member', value: 0 } });
  await prisma.idCounter.upsert({ where: { name: 'staff' }, update: {}, create: { name: 'staff', value: 0 } });
  await prisma.idCounter.upsert({ where: { name: 'donation' }, update: {}, create: { name: 'donation', value: 0 } });

  const portalHash = hash;

  await prisma.member.upsert({
    where: { email: 'member@waddani.local' },
    update: {
      portalEnabled: true,
      status: 'ACTIVE',
      firstName: 'Amina',
      lastName: 'Hassan',
      officeId: hq.id,
      ...(resetPasswords ? { passwordHash: portalHash, mustChangePassword: true } : {}),
    },
    create: {
      membershipNo: 'WD-2026-PORTAL1',
      email: 'member@waddani.local',
      passwordHash: portalHash,
      portalEnabled: true,
      mustChangePassword: true,
      firstName: 'Amina',
      lastName: 'Hassan',
      country: 'Somaliland',
      city: 'Hargeisa',
      status: 'ACTIVE',
      officeId: hq.id,
    },
  });

  await prisma.supporter.upsert({
    where: { email: 'supporter@waddani.local' },
    update: {
      portalEnabled: true,
      status: 'ACTIVE',
      firstName: 'Omar',
      lastName: 'Ali',
      officeId: hq.id,
      ...(resetPasswords ? { passwordHash: portalHash, mustChangePassword: true } : {}),
    },
    create: {
      email: 'supporter@waddani.local',
      passwordHash: portalHash,
      portalEnabled: true,
      mustChangePassword: true,
      firstName: 'Omar',
      lastName: 'Ali',
      country: 'United Kingdom',
      city: 'London',
      status: 'ACTIVE',
      officeId: hq.id,
      consents: { create: [{ type: 'NEWS' }, { type: 'FUNDRAISING' }] },
    },
  });

  await prisma.volunteer.upsert({
    where: { email: 'volunteer@waddani.local' },
    update: {
      portalEnabled: true,
      status: 'ACTIVE',
      firstName: 'Leyla',
      lastName: 'Mohamed',
      skills: ['Outreach', 'Events'],
      officeId: hq.id,
      ...(resetPasswords ? { passwordHash: portalHash, mustChangePassword: true } : {}),
    },
    create: {
      email: 'volunteer@waddani.local',
      passwordHash: portalHash,
      portalEnabled: true,
      mustChangePassword: true,
      firstName: 'Leyla',
      lastName: 'Mohamed',
      skills: ['Outreach', 'Events'],
      status: 'ACTIVE',
      officeId: hq.id,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@waddani.local' },
    update: {
      status: 'ACTIVE',
      officeId: hq.id,
      firstName: 'Hodan',
      lastName: 'Yusuf',
      ...(resetPasswords ? { passwordHash: portalHash, mustChangePassword: true } : {}),
    },
    create: {
      email: 'staff@waddani.local',
      passwordHash: portalHash,
      mustChangePassword: true,
      firstName: 'Hodan',
      lastName: 'Yusuf',
      officeId: hq.id,
      locale: 'en',
    },
  });
  const officeStaffRole = await prisma.role.findUnique({ where: { name: 'OFFICE_STAFF' } });
  if (officeStaffRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: staffUser.id, roleId: officeStaffRole.id } },
      update: {},
      create: { userId: staffUser.id, roleId: officeStaffRole.id },
    });
  }

  const existingCampaign = await prisma.fundraisingCampaign.findFirst({
    where: { title: 'National Solidarity Fund' },
  });
  if (!existingCampaign) {
    await prisma.fundraisingCampaign.create({
      data: {
        title: 'National Solidarity Fund',
        slug: 'national-solidarity-fund',
        description: 'Support Waddani community programmes across Somaliland and the diaspora.',
        targetAmount: 25000,
        currency: 'USD',
        status: 'ACTIVE',
        officeId: hq.id,
      },
    });
  } else if (!existingCampaign.slug) {
    await prisma.fundraisingCampaign.update({
      where: { id: existingCampaign.id },
      data: { slug: 'national-solidarity-fund' },
    });
  }

  const announcementCount = await prisma.announcement.count();
  if (announcementCount === 0) {
    await prisma.announcement.createMany({
      data: [
        {
          title: 'Welcome to the new portals',
          body: 'Members can RSVP, supporters can give and manage consents, volunteers can update office tasks.',
          audience: 'ALL',
          createdById: admin.id,
        },
        {
          title: 'Volunteer weekend briefing',
          body: 'Check Tasks for neighbourhood outreach and town-hall check-in desk setup.',
          audience: 'VOLUNTEER',
          createdById: admin.id,
        },
      ],
    });
  }

  const townHall = await prisma.event.findFirst({ where: { title: 'Hargeisa Membership Town Hall' } });
  if (!townHall) {
    await prisma.event.create({
      data: {
        title: 'Hargeisa Membership Town Hall',
        description: 'Open briefing for members and volunteers on local organising priorities.',
        venue: 'HQ Conference Hall, Hargeisa',
        startsAt: new Date(Date.now() + 5 * 86400000),
        endsAt: new Date(Date.now() + 5 * 86400000 + 2 * 3600000),
        capacity: 180,
        status: 'PUBLISHED',
        officeId: hq.id,
      },
    });
  }

  const diasporaCall = await prisma.event.findFirst({ where: { title: 'Diaspora Solidarity Call' } });
  if (!diasporaCall) {
    await prisma.event.create({
      data: {
        title: 'Diaspora Solidarity Call',
        description: 'Online briefing for supporters across the diaspora.',
        venue: 'Virtual / Zoom',
        startsAt: new Date(Date.now() + 9 * 86400000),
        capacity: 500,
        status: 'PUBLISHED',
        officeId: null,
      },
    });
  }

  const outreachTask = await prisma.task.findFirst({ where: { title: 'Neighbourhood outreach briefing' } });
  if (!outreachTask) {
    await prisma.task.create({
      data: {
        title: 'Neighbourhood outreach briefing',
        description: 'Prepare talking points and materials for weekend door-to-door visits.',
        status: 'TODO',
        priority: 'HIGH',
        dueAt: new Date(Date.now() + 3 * 86400000),
        officeId: hq.id,
      },
    });
  }

  const checkinTask = await prisma.task.findFirst({ where: { title: 'Event check-in desk setup' } });
  if (!checkinTask) {
    await prisma.task.create({
      data: {
        title: 'Event check-in desk setup',
        description: 'Confirm scanners, badges, and volunteer rota for the next town hall.',
        status: 'IN_PROGRESS',
        priority: 'NORMAL',
        dueAt: new Date(Date.now() + 4 * 86400000),
        officeId: hq.id,
      },
    });
  }

  console.log('Seed complete.');
  if (resetPasswords || !existingAdmin) {
    console.log('Demo password for new/reset accounts: ChangeMe123!');
  } else {
    console.log('Existing account passwords were preserved (set SEED_RESET_PASSWORDS=true to reset).');
  }
  console.log('Staff admin: admin@waddani.local');
  console.log('Staff user:  staff@waddani.local');
  console.log('Member:      member@waddani.local');
  console.log('Supporter:   supporter@waddani.local');
  console.log('Volunteer:   volunteer@waddani.local');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
