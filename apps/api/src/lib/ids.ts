import { prisma } from './prisma.js';

export async function nextSequential(name: string, prefix: string, width = 6): Promise<string> {
  const row = await prisma.idCounter.upsert({
    where: { name },
    create: { name, value: 1 },
    update: { value: { increment: 1 } },
  });
  const year = new Date().getFullYear();
  return `${prefix}${year}-${String(row.value).padStart(width, '0')}`;
}

export async function nextReceiptNo(): Promise<string> {
  const row = await prisma.idCounter.upsert({
    where: { name: 'donation' },
    create: { name: 'donation', value: 1 },
    update: { value: { increment: 1 } },
  });
  return `DON-${new Date().getFullYear()}-${String(row.value).padStart(8, '0')}`;
}
