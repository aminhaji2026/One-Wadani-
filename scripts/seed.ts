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

  const hash = await bcrypt.hash('ChangeMe123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@waddani.local' },
    update: {
      passwordHash: hash,
      mustChangePassword: true,
      status: 'ACTIVE',
      officeId: hq.id,
      firstName: 'System',
      lastName: 'Administrator',
      locale: 'en',
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

  const portalHash = await bcrypt.hash('ChangeMe123!', 12);

  await prisma.member.upsert({
    where: { email: 'member@waddani.local' },
    update: {
      passwordHash: portalHash,
      portalEnabled: true,
      mustChangePassword: true,
      status: 'ACTIVE',
      firstName: 'Amina',
      lastName: 'Hassan',
      officeId: hq.id,
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
      passwordHash: portalHash,
      portalEnabled: true,
      mustChangePassword: true,
      status: 'ACTIVE',
      firstName: 'Omar',
      lastName: 'Ali',
      officeId: hq.id,
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
      passwordHash: portalHash,
      portalEnabled: true,
      mustChangePassword: true,
      status: 'ACTIVE',
      firstName: 'Leyla',
      lastName: 'Mohamed',
      skills: ['Outreach', 'Events'],
      officeId: hq.id,
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
      passwordHash: portalHash,
      mustChangePassword: true,
      status: 'ACTIVE',
      officeId: hq.id,
      firstName: 'Hodan',
      lastName: 'Yusuf',
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
        description: 'Support Waddani community programmes across Somaliland and the diaspora.',
        targetAmount: 25000,
        currency: 'USD',
        status: 'ACTIVE',
        officeId: hq.id,
      },
    });
  }

  console.log('Seed complete.');
  console.log('Staff admin: admin@waddani.local / ChangeMe123!');
  console.log('Staff user:  staff@waddani.local / ChangeMe123!');
  console.log('Member:      member@waddani.local / ChangeMe123!');
  console.log('Supporter:   supporter@waddani.local / ChangeMe123!');
  console.log('Volunteer:   volunteer@waddani.local / ChangeMe123!');
  console.log('Change passwords immediately after first login.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
