import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

function days(n: number) {
  return new Date(Date.now() + n * 86400000);
}

async function main() {
  const permissions = [
    'organisation.read','organisation.write','members.read','members.write','supporters.read','supporters.write',
    'staff.read','staff.write','fundraising.read','fundraising.write','finance.read','finance.write',
    'communications.read','communications.write','events.read','events.write','analytics.read','security.read','security.write'
  ];
  for (const code of permissions) await prisma.permission.upsert({where:{code},update:{},create:{code}});
  const superRole = await prisma.role.upsert({where:{name:'SUPER_ADMIN'},update:{},create:{name:'SUPER_ADMIN',description:'Full platform access'}});
  const all = await prisma.permission.findMany();
  for (const p of all) await prisma.rolePermission.upsert({where:{roleId_permissionId:{roleId:superRole.id,permissionId:p.id}},update:{},create:{roleId:superRole.id,permissionId:p.id}});
  const hq = await prisma.office.upsert({where:{id:'hq'},update:{},create:{id:'hq',name:'Waddani National Headquarters',type:'HEADQUARTERS',country:'Somaliland',city:'Hargeisa'}});
  const borama = await prisma.office.upsert({where:{id:'office-borama'},update:{},create:{id:'office-borama',name:'Borama Local Office',type:'LOCAL',country:'Somaliland',city:'Borama',parentId:hq.id}});
  const berbera = await prisma.office.upsert({where:{id:'office-berbera'},update:{},create:{id:'office-berbera',name:'Berbera Branch',type:'CITY',country:'Somaliland',city:'Berbera',parentId:hq.id}});
  const uk = await prisma.office.upsert({where:{id:'office-uk'},update:{},create:{id:'office-uk',name:'UK Diaspora Chapter',type:'INTERNATIONAL_COUNTRY',country:'United Kingdom',city:'London',parentId:hq.id}});
  const us = await prisma.office.upsert({where:{id:'office-us'},update:{},create:{id:'office-us',name:'USA Diaspora Chapter',type:'INTERNATIONAL_COUNTRY',country:'United States',city:'Minneapolis',parentId:hq.id}});
  const se = await prisma.office.upsert({where:{id:'office-se'},update:{},create:{id:'office-se',name:'Sweden Diaspora Chapter',type:'INTERNATIONAL_COUNTRY',country:'Sweden',city:'Stockholm',parentId:hq.id}});

  const hash = await bcrypt.hash('ChangeMe123!', 12);
  const admin = await prisma.user.upsert({where:{email:'admin@waddani.local'},update:{},create:{email:'admin@waddani.local',passwordHash:hash,firstName:'System',lastName:'Administrator',officeId:hq.id,locale:'en'}});
  await prisma.userRole.upsert({where:{userId_roleId:{userId:admin.id,roleId:superRole.id}},update:{},create:{userId:admin.id,roleId:superRole.id}});

  const sampleVideos = [
    { title: 'La Hadal Xisbigaaga — Wasiirka Horumarinta Biyaha', type: 'video', url: 'https://www.facebook.com/WADDANIP/videos/wasiirka-horumarinta-biyaha-oo-marti-ku-ah-kulanka-5aad-ee-barnaamijka-la-hadal-/1647657564027375/', language: 'so' },
    { title: '“Caqabadaha idin haysta ayaad u bedeli kartaan fursad…” — Guddoomiye Xirsi', type: 'video', url: 'https://www.facebook.com/WADDANIP/videos/caqabadaha-idin-haysta-ayaad-u-bedeli-kartaan-fursad-guddoomiye-xirsi/1697516284876762/', language: 'so' },
    { title: 'Wasiirka Caddaaladda — difaaca dadka nugul', type: 'video', url: 'https://www.facebook.com/WADDANIP/videos/qofka-naafada-ah-ama-iin-kale-leh-qofka-magac-xun-ku-yidhaahda-ciqaab-baa-ka-dha/1095925010056333/', language: 'so' },
    { title: 'Af-hayeenka WADDANI — Rift Valley Medical College qalin-jebin', type: 'video', url: 'https://www.facebook.com/afhayeenka.waddani/videos/af-hayeenka-xisbiga-waddani-oo-hadalo-qalbiga-taabanaya-u-jeediyey-ardey-ka-qali/857289208367128/', language: 'so' },
    { title: 'Af-hayeenka WADDANI — xeerka doorashooyinka', type: 'video', url: 'https://www.facebook.com/afhayeenka.waddani/videos/xeerka-doorashooyinka-ee-ummadda-somaliland-indhaha-ku-hayso-wixii-caqabad-ka-yi/1434383903805854/', language: 'so' },
  ];
  await prisma.mediaAsset.deleteMany({ where: { type: 'video', OR: [{ url: { contains: 'youtube.com' } }, { url: { contains: 'youtu.be' } }] } });
  for (const [i, video] of sampleVideos.entries()) {
    const existing = await prisma.mediaAsset.findFirst({ where: { url: video.url } });
    if (existing) {
      await prisma.mediaAsset.update({ where: { id: existing.id }, data: { title: video.title, language: video.language, approved: true, published: true } });
    } else {
      await prisma.mediaAsset.create({ data: { ...video, approved: true, published: true, createdById: admin.id, createdAt: new Date(Date.now() - i * 86400000) } });
    }
  }

  const canvass = await prisma.fundraisingCampaign.upsert({
    where: { slug: 'canvass-fuel-drive' },
    update: { status: 'ACTIVE', title: 'Canvass & branch fuel drive', description: 'Fuel and materials for door-knocking teams across Hargeisa, Borama and Berbera.', story: 'Every dollar keeps organisers moving — routes, leaflets, and evening briefings.', shareText: 'Fuel the canvass. Join · Donate · Volunteer with Waddani.', targetAmount: 25000, raisedAmount: 11840, imageUrl: '/events/event-youth.jpg', officeId: hq.id },
    create: { slug: 'canvass-fuel-drive', title: 'Canvass & branch fuel drive', description: 'Fuel and materials for door-knocking teams across Hargeisa, Borama and Berbera.', story: 'Every dollar keeps organisers moving — routes, leaflets, and evening briefings.', shareText: 'Fuel the canvass. Join · Donate · Volunteer with Waddani.', targetAmount: 25000, raisedAmount: 11840, currency: 'USD', status: 'ACTIVE', imageUrl: '/events/event-youth.jpg', officeId: hq.id, startsAt: days(-10), endsAt: days(30) },
  });
  const youth = await prisma.fundraisingCampaign.upsert({
    where: { slug: 'youth-training-fund' },
    update: { status: 'ACTIVE', title: 'Youth organisers training fund', description: 'Weekend training for youth wing leaders on membership, consent messaging and event check-in.', story: 'Train the next generation of branch organisers.', shareText: 'Invest in youth leadership — support Waddani training.', targetAmount: 12000, raisedAmount: 4620, imageUrl: '/events/event-meeting.jpg', officeId: borama.id },
    create: { slug: 'youth-training-fund', title: 'Youth organisers training fund', description: 'Weekend training for youth wing leaders on membership, consent messaging and event check-in.', story: 'Train the next generation of branch organisers.', shareText: 'Invest in youth leadership — support Waddani training.', targetAmount: 12000, raisedAmount: 4620, currency: 'USD', status: 'ACTIVE', imageUrl: '/events/event-meeting.jpg', officeId: borama.id, startsAt: days(-5), endsAt: days(45) },
  });
  const diaspora = await prisma.fundraisingCampaign.upsert({
    where: { slug: 'diaspora-media-month' },
    update: { status: 'ACTIVE', title: 'Diaspora media & town-hall month', description: 'Fund weekly diaspora town halls, clip production, and WhatsApp briefings for overseas supporters.', story: 'Keep the diaspora connected with consent-based updates and live calls.', shareText: 'From London to Minneapolis — power Waddani’s diaspora month.', targetAmount: 40000, raisedAmount: 22150, imageUrl: '/events/event-diaspora.jpg', officeId: uk.id },
    create: { slug: 'diaspora-media-month', title: 'Diaspora media & town-hall month', description: 'Fund weekly diaspora town halls, clip production, and WhatsApp briefings for overseas supporters.', story: 'Keep the diaspora connected with consent-based updates and live calls.', shareText: 'From London to Minneapolis — power Waddani’s diaspora month.', targetAmount: 40000, raisedAmount: 22150, currency: 'USD', status: 'ACTIVE', imageUrl: '/events/event-diaspora.jpg', officeId: uk.id, startsAt: days(-2), endsAt: days(28) },
  });

  // Seed confirmed donations for diaspora leaderboard if empty
  if ((await prisma.donation.count()) < 5) {
    const gifts = [
      { campaignId: diaspora.id, donorName: 'Amina H.', donorCountry: 'United Kingdom', amount: 250, officeHint: uk.id },
      { campaignId: diaspora.id, donorName: 'Omar K.', donorCountry: 'United States', amount: 500 },
      { campaignId: diaspora.id, donorName: 'Leyla S.', donorCountry: 'Sweden', amount: 180 },
      { campaignId: canvass.id, donorName: 'Hodan M.', donorCountry: 'Somaliland', amount: 40 },
      { campaignId: youth.id, donorName: 'Jama A.', donorCountry: 'United Kingdom', amount: 75 },
      { campaignId: canvass.id, donorName: 'Monthly diaspora circle', donorCountry: 'United States', amount: 100, recurring: true },
    ];
    for (const [i, g] of gifts.entries()) {
      await prisma.donation.create({
        data: {
          receiptNo: `SEED-${Date.now()}-${i}`,
          campaignId: g.campaignId,
          donorName: g.donorName,
          donorCountry: g.donorCountry,
          amount: g.amount,
          currency: 'USD',
          gateway: 'mock',
          status: 'CONFIRMED',
          recurring: !!(g as any).recurring,
          providerRef: `seed_${i}`,
        },
      });
    }
  }

  const rally = await prisma.event.upsert({
    where: { id: 'evt-public-rally' },
    update: { status: 'PUBLISHED', title: 'National rally — Hargeisa', description: 'City-wide rally on jobs, services and honest government.', venue: 'Freedom Square, Hargeisa', startsAt: days(6), capacity: 5000, officeId: hq.id, imageUrl: '/events/event-rally.jpg' },
    create: { id: 'evt-public-rally', title: 'National rally — Hargeisa', description: 'City-wide rally on jobs, services and honest government.', venue: 'Freedom Square, Hargeisa', startsAt: days(6), capacity: 5000, status: 'PUBLISHED', officeId: hq.id, imageUrl: '/events/event-rally.jpg' },
  });
  const canvassDay = await prisma.event.upsert({
    where: { id: 'evt-youth-canvass' },
    update: { status: 'PUBLISHED', title: 'Youth volunteer canvass', description: 'Door-knocking with the youth wing — register supporters and share the plan.', venue: 'Berbera Community Hall', startsAt: days(3), capacity: 120, officeId: berbera.id, imageUrl: '/events/event-youth.jpg' },
    create: { id: 'evt-youth-canvass', title: 'Youth volunteer canvass', description: 'Door-knocking with the youth wing — register supporters and share the plan.', venue: 'Berbera Community Hall', startsAt: days(3), capacity: 120, status: 'PUBLISHED', officeId: berbera.id, imageUrl: '/events/event-youth.jpg' },
  });
  const completedTownhall = await prisma.event.upsert({
    where: { id: 'evt-completed-townhall' },
    update: { status: 'COMPLETED', title: 'Diaspora supporter town hall', description: 'Online call for overseas supporters.', venue: 'Online / Zoom', startsAt: days(-2), endsAt: days(-2), capacity: 200, officeId: uk.id, imageUrl: '/events/event-diaspora.jpg' },
    create: { id: 'evt-completed-townhall', title: 'Diaspora supporter town hall', description: 'Online call for overseas supporters.', venue: 'Online / Zoom', startsAt: days(-2), endsAt: days(-2), capacity: 200, status: 'COMPLETED', officeId: uk.id, imageUrl: '/events/event-diaspora.jpg' },
  });

  await prisma.volunteerShift.deleteMany({ where: { eventId: { in: [rally.id, canvassDay.id] } } });
  await prisma.volunteerShift.createMany({
    data: [
      { eventId: canvassDay.id, title: 'Morning canvass team A', role: 'Canvassing', description: 'Door-knocking routes in central Berbera.', startsAt: days(3), endsAt: new Date(days(3).getTime() + 3 * 3600000), capacity: 25 },
      { eventId: canvassDay.id, title: 'Phone bank evening', role: 'Phone bank', description: 'Consent-based reminder calls to registered supporters.', startsAt: new Date(days(3).getTime() + 6 * 3600000), capacity: 15 },
      { eventId: rally.id, title: 'Stage & steward team', role: 'Event steward', description: 'Crowd flow, accessibility support, water stations.', startsAt: days(6), capacity: 40 },
      { eventId: rally.id, title: 'Youth leaflet team', role: 'Outreach', description: 'Distribute leaflets and collect join interest forms.', startsAt: days(6), capacity: 30 },
    ],
  });

  // Members / supporters for diaspora board
  const people = [
    { firstName: 'Amina', lastName: 'Hassan', country: 'United Kingdom', officeId: uk.id },
    { firstName: 'Omar', lastName: 'Ali', country: 'United States', officeId: us.id },
    { firstName: 'Leyla', lastName: 'Nur', country: 'Sweden', officeId: se.id },
    { firstName: 'Hodan', lastName: 'Jama', country: 'Somaliland', officeId: hq.id },
  ];
  for (const [i, p] of people.entries()) {
    await prisma.member.upsert({
      where: { membershipNo: `M-SEED-${i + 1}` },
      update: {},
      create: { membershipNo: `M-SEED-${i + 1}`, firstName: p.firstName, lastName: p.lastName, country: p.country, status: 'ACTIVE', officeId: p.officeId, joinedAt: new Date() },
    });
    await prisma.supporter.create({
      data: {
        firstName: p.firstName,
        lastName: p.lastName,
        country: p.country,
        officeId: p.officeId,
        consents: { create: [{ type: 'NEWS' }, { type: 'EVENTS' }, { type: 'FUNDRAISING' }, { type: 'VOLUNTEERING' }] },
      },
    }).catch(() => undefined);
  }

  await prisma.volunteer.upsert({
    where: { id: 'vol-seed-1' },
    update: {},
    create: { id: 'vol-seed-1', firstName: 'Sagal', lastName: 'Abdi', skills: ['canvassing', 'phone-bank'], status: 'ACTIVE', officeId: berbera.id },
  });

  await prisma.expense.createMany({
    data: [
      { category: 'Outreach', description: 'Canvass fuel — Hargeisa week 1', amount: 420, currency: 'USD', status: 'APPROVED', officeId: hq.id },
      { category: 'Training', description: 'Youth training materials', amount: 260, currency: 'USD', status: 'APPROVED', officeId: borama.id },
    ],
  }).catch(() => undefined);

  void completedTownhall;
  console.log('Seed complete: campaigns', canvass.slug, youth.slug, diaspora.slug);
}
main().finally(() => prisma.$disconnect());
