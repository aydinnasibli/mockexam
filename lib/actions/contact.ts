'use server';

import { headers } from 'next/headers';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { isRateLimited } from '@/lib/rate-limit';
import { captureException, captureMessage } from '@/lib/observability';

const schema = z.object({
  name: z.string().trim().min(1, 'Ad tələb olunur').max(100),
  email: z.string().trim().email('Düzgün e-poçt ünvanı daxil edin').max(200),
  subject: z.string().trim().min(1).max(100),
  message: z.string().trim().min(5, 'Mesaj çox qısadır').max(5000),
});

export type ContactResult = { ok: true } | { ok: false; error: string };

function clientIp(h: Headers): string {
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return h.get('x-real-ip') ?? 'unknown';
}

/**
 * Makes a visitor-supplied string safe to interpolate into a mail header.
 *
 * `name` and `subject` go into `Reply-To` and `Subject`. Zod's `.trim()` only
 * strips the ends, so a CR/LF (or a bare quote in the display name) inside the
 * value would otherwise be handed to the header builder verbatim.
 */
function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/["\\]/g, '').trim();
}

export async function sendContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<ContactResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Məlumatlar düzgün deyil' };
  }
  const { name, email, subject, message } = parsed.data;

  // Public endpoint — rate limit by IP so it can't be used to spam the inbox.
  const h = await headers();
  if (await isRateLimited(`contact:${clientIp(h)}`, 3, 10 * 60_000)) {
    return { ok: false, error: 'Çox tez-tez mesaj göndərdiniz. Bir az sonra yenidən cəhd edin.' };
  }

  // Gmail account + 16-char App Password (Google 2-Step Verification required).
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const to = process.env.CONTACT_TO ?? user;

  if (!user || !pass) {
    void captureMessage('Contact form mail is not configured', { level: 'error' });
    return { ok: false, error: 'Mesaj göndərmə xidməti hazırda əlçatan deyil. Zəhmət olmasa e-poçt ilə yazın.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    const headerName = headerSafe(name);
    await transporter.sendMail({
      // Gmail forces From to the authenticated account; the visitor's address
      // goes in Reply-To so a reply reaches them directly.
      from: `"Testcentre əlaqə" <${user}>`,
      to,
      replyTo: { name: headerName, address: email },
      subject: headerSafe(`[Əlaqə: ${subject}] ${headerName}`),
      text: `Ad: ${name}\nE-poçt: ${email}\nMövzu: ${subject}\n\n${message}`,
    });

    return { ok: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'sendContactMessage' } });
    return { ok: false, error: 'Mesaj göndərilə bilmədi. Bir az sonra yenidən cəhd edin.' };
  }
}
