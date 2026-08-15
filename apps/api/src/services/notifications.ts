import { prisma } from '../lib/prisma.js';
import { sendMail } from './mailer.js';

export async function notify(input: {
  recipientPortal: string;
  recipientId: string;
  title: string;
  body: string;
  link?: string;
  email?: string | null;
}) {
  const row = await prisma.appNotification.create({
    data: {
      recipientPortal: input.recipientPortal,
      recipientId: input.recipientId,
      title: input.title,
      body: input.body,
      link: input.link,
      channel: 'IN_APP',
    },
  });

  let emailStatus: string | undefined;
  if (input.email) {
    const mail = await sendMail({
      to: input.email,
      subject: input.title,
      text: `${input.body}${input.link ? `\n\n${input.link}` : ''}`,
    });
    emailStatus = mail.ok ? `sent:${mail.mode}` : `failed:${mail.error || 'unknown'}`;
    await prisma.appNotification.update({
      where: { id: row.id },
      data: { emailStatus, channel: 'IN_APP+EMAIL' },
    });
  }

  return row;
}
