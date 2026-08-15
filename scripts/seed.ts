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
}
main().finally(()=>prisma.$disconnect());
