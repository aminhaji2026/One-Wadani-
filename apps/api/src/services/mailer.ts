import nodemailer from 'nodemailer';

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(input: MailInput): Promise<{ ok: boolean; mode: 'smtp' | 'log'; error?: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'Waddani One <noreply@waddani.local>';

  if (!host || !user || !pass) {
    console.info('[mail:log]', { to: input.to, subject: input.subject, text: input.text });
    return { ok: true, mode: 'log' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html || `<pre>${input.text}</pre>`,
    });
    return { ok: true, mode: 'smtp' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Mail failed';
    console.error('[mail:error]', message);
    return { ok: false, mode: 'smtp', error: message };
  }
}
