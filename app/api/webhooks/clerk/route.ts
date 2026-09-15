import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhook, type WebhookEvent } from '@clerk/nextjs/webhooks';
import { deleteUserData, upsertUserFromClerk } from '@/lib/db/users';
import { captureException, captureMessage } from '@/lib/infra/observability';

/**
 * Keeps the `users` table in step with Clerk.
 *
 * Clerk delivers through Svix, which retries every non-2xx response with backoff
 * for several days and makes no promise about order. The status codes are
 * chosen for that:
 *   - 400 only when the request is not provably from Clerk — retrying the same
 *     bytes cannot fix a bad signature.
 *   - 500 for failures on our side, so Svix delivers again once we recover.
 *   - 200 for everything else, including event types we do not act on.
 * Redelivery and reordering are harmless because every write in
 * `lib/db/users.ts` is idempotent and ordered by Clerk's own `updated_at`.
 *
 * Unlike the Epoint route there is no rate limit. Verification runs before any
 * database work, so a forged flood costs one HMAC per request, while a bulk
 * change made in Clerk legitimately arrives as a burst that a limiter would only
 * convert into days of retries.
 */
export async function POST(req: NextRequest) {
  // Checked up front so a missing secret surfaces as a configuration error, not
  // as every delivery being rejected as forged.
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    void captureMessage('CLERK_WEBHOOK_SIGNING_SECRET is not configured', { level: 'error' });
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let evt: WebhookEvent;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (evt.type) {
      case 'user.created':
      case 'user.updated':
        await upsertUserFromClerk(evt.data);
        break;

      case 'user.deleted':
        // Clerk's type marks `id` optional. A delete without one cannot be
        // applied, and a retry would carry the same payload, so report it and
        // acknowledge rather than have Svix repeat it for days.
        if (!evt.data.id) {
          void captureMessage('Clerk user.deleted event has no user id', { level: 'error' });
          break;
        }
        await deleteUserData(evt.data.id);
        break;

      default:
        // Subscribed to more than this handler uses. Acknowledge it.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    void captureException(err, {
      tags: { route: 'webhook/clerk', event: evt.type },
    });
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
