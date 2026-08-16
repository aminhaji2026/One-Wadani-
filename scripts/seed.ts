import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

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
  // Replace placeholder YouTube seeds with official Waddani Facebook videos.
  await prisma.mediaAsset.deleteMany({ where: { type: 'video', OR: [{ url: { contains: 'youtube.com' } }, { url: { contains: 'youtu.be' } }] } });
  for (const [i, video] of sampleVideos.entries()) {
    const existing = await prisma.mediaAsset.findFirst({ where: { url: video.url } });
    if (existing) {
      await prisma.mediaAsset.update({
        where: { id: existing.id },
        data: { title: video.title, language: video.language, approved: true, published: true },
      });
    } else {
      await prisma.mediaAsset.create({
        data: {
          ...video,
          approved: true,
          published: true,
          createdById: admin.id,
          createdAt: new Date(Date.now() - i * 86400000),
        },
      });
    }
  }
}
main().finally(()=>prisma.$disconnect());
