/**
 * The Clerk webhook — how profile changes and account deletions reach `users`.
 *
 * Every request is signed for real, with the Standard Webhooks scheme Clerk's
 * `verifyWebhook` checks: HMAC-SHA256 over `id.timestamp.body`, keyed by the
 * base64 secret after `whsec_`. A test that stubbed `verifyWebhook` could not
 * catch the route accepting a forged or replayed delivery; these can.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

const SECRET = `whsec_${Buffer.from('clerk-webhook-test-secret').toString('base64')}`;
const USER = 'user_clerk_sync';
const EXAM = 'ielts-clerk-sync';

vi.mock('@/lib/infra/db', async () => {
  const { db, batch } = await import('@/test/pg');
  return { db: Object.assign(db, { batch }), txDb: () => ({ db, close: async () => {} }) };
});
vi.mock('@/lib/infra/observability', () => ({
  captureException: async () => {},
  captureMessage: async () => {},
}));

const { db, resetDb, seedExam, seedUser } = await import('@/test/pg');
const {
  users, purchases, examResults, examAnswers, examSessions, playedAudio, userSettings, freeClaims,
} = await import('@/lib/db/schema');
const { POST } = await import('@/app/api/webhooks/clerk/route');

const T0 = Date.UTC(2026, 0, 1);

/** A Clerk user payload. The primary email is deliberately not listed first. */
function clerkUser(overrides: {
  email?: string;
  updatedAt?: number;
  primaryEmailId?: string | null;
} = {}) {
  return {
    object: 'user',
    id: USER,
    first_name: 'Test',
    last_name: 'Candidate',
    image_url: 'https://img.clerk.com/avatar',
    primary_email_address_id: overrides.primaryEmailId === undefined ? 'idn_primary' : overrides.primaryEmailId,
    email_addresses: [
      { object: 'email_address', id: 'idn_secondary', email_address: 'secondary@example.org' },
      { object: 'email_address', id: 'idn_primary', email_address: overrides.email ?? 'candidate@example.org' },
    ],
    created_at: T0,
    updated_at: overrides.updatedAt ?? T0,
  };
}

const deleted = { object: 'user', id: USER, deleted: true };

type Event = { type: string; data: object };

/** A delivery signed the way Svix signs one. */
function delivery(event: Event, { secret = SECRET, sentAt = Date.now() } = {}) {
  const id = `msg_${crypto.randomUUID()}`;
  const timestamp = Math.floor(sentAt / 1000);
  const body = JSON.stringify({ object: 'event', instance_id: 'ins_test', timestamp: sentAt, ...event });
  const key = Buffer.from(secret.slice('whsec_'.length), 'base64');
  const signature = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
  return new NextRequest('https://x.test/api/webhooks/clerk', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'svix-id': id,
      'svix-timestamp': String(timestamp),
      'svix-signature': `v1,${signature}`,
    },
    body,
  });
}

const send = (event: Event, options?: Parameters<typeof delivery>[1]) => POST(delivery(event, options));

async function userRow() {
  const [row] = await db.select().from(users).where(eq(users.id, USER));
  return row;
}

beforeEach(async () => {
  vi.stubEnv('CLERK_WEBHOOK_SIGNING_SECRET', SECRET);
  await resetDb();
});

describe('clerk webhook — profile sync', () => {
  it('user.created stores the profile with the PRIMARY email', async () => {
    const res = await send({ type: 'user.created', data: clerkUser() });
    expect(res.status).toBe(200);

    const row = await userRow();
    expect(row).toMatchObject({
      email: 'candidate@example.org',
      firstName: 'Test',
      lastName: 'Candidate',
      imageUrl: 'https://img.clerk.com/avatar',
      deletedAt: null,
    });
    expect(row.clerkCreatedAt?.getTime()).toBe(T0);
  });

  it('stores no email for an account without a primary one', async () => {
    await send({ type: 'user.created', data: clerkUser({ primaryEmailId: null }) });
    expect((await userRow()).email).toBeNull();
  });

  it('user.updated applies a newer profile', async () => {
    await send({ type: 'user.created', data: clerkUser() });
    await send({ type: 'user.updated', data: clerkUser({ email: 'new@example.org', updatedAt: T0 + 1000 }) });
    expect((await userRow()).email).toBe('new@example.org');
  });

  it('ignores an update older than the stored one — Svix does not promise order', async () => {
    await send({ type: 'user.updated', data: clerkUser({ email: 'new@example.org', updatedAt: T0 + 1000 }) });
    const res = await send({ type: 'user.updated', data: clerkUser({ email: 'old@example.org', updatedAt: T0 }) });

    expect(res.status).toBe(200);
    expect((await userRow()).email).toBe('new@example.org');
  });

  it('fills in the bare row ensureUser wrote before the webhook arrived', async () => {
    await seedUser(USER);
    await send({ type: 'user.created', data: clerkUser() });
    expect((await userRow()).email).toBe('candidate@example.org');
  });

  it('acknowledges event types it does not act on, without writing', async () => {
    const res = await send({ type: 'session.created', data: { object: 'session', id: 'sess_1', user_id: USER } });
    expect(res.status).toBe(200);
    expect(await db.select().from(users)).toHaveLength(0);
  });
});

describe('clerk webhook — account deletion', () => {
  async function seedAccountWithActivity() {
    await seedExam(EXAM);
    await send({ type: 'user.created', data: clerkUser() });
    await db.insert(purchases).values({
      userId: USER, examId: EXAM, transactionId: 'TXN-1', amountCents: 1500, status: 'COMPLETED',
    });
    const [result] = await db.insert(examResults).values({
      userId: USER, examId: EXAM, examTitle: 'IELTS', examTag: 'IELTS', attemptNumber: 1,
      startedAt: new Date(), completedAt: new Date(), durationSeconds: 60, totalQuestions: 1, score: '100.00',
    }).returning({ id: examResults.id });
    await db.insert(examAnswers).values({
      resultId: result.id, moduleIndex: 0, userAnswer: 0, correctIndex: 0, isCorrect: true,
    });
    await db.insert(examSessions).values({ userId: USER, examId: EXAM, startedAt: new Date(), totalSeconds: 1800 });
    await db.insert(playedAudio).values({ userId: USER, examId: EXAM, audioUrl: 'https://x.test/part1.mp3' });
    await db.insert(userSettings).values({ userId: USER, targetExamType: 'ielts' });
    await db.insert(freeClaims).values({ userId: USER, examId: EXAM });
  }

  it('removes what the person did, keeps what they paid for, and clears the profile', async () => {
    await seedAccountWithActivity();

    const res = await send({ type: 'user.deleted', data: deleted });
    expect(res.status).toBe(200);

    expect(await db.select().from(examResults)).toHaveLength(0);
    expect(await db.select().from(examAnswers)).toHaveLength(0);
    expect(await db.select().from(examSessions)).toHaveLength(0);
    expect(await db.select().from(playedAudio)).toHaveLength(0);
    expect(await db.select().from(userSettings)).toHaveLength(0);
    expect(await db.select().from(freeClaims)).toHaveLength(0);

    // The sale is a financial record and survives the account.
    expect(await db.select().from(purchases)).toHaveLength(1);

    const row = await userRow();
    expect(row).toMatchObject({ email: null, firstName: null, lastName: null, imageUrl: null });
    expect(row.deletedAt).not.toBeNull();
  });

  it('a late user.updated cannot write a deleted profile back', async () => {
    await send({ type: 'user.created', data: clerkUser() });
    await send({ type: 'user.deleted', data: deleted });
    await send({ type: 'user.updated', data: clerkUser({ updatedAt: T0 + 60_000 }) });

    expect((await userRow()).email).toBeNull();
  });

  it('a deletion that arrives before user.created still wins', async () => {
    await send({ type: 'user.deleted', data: deleted });
    await send({ type: 'user.created', data: clerkUser() });

    const row = await userRow();
    expect(row.email).toBeNull();
    expect(row.deletedAt).not.toBeNull();
  });

  it('a redelivered deletion keeps the original deleted_at', async () => {
    await send({ type: 'user.deleted', data: deleted });
    const first = (await userRow()).deletedAt;

    const res = await send({ type: 'user.deleted', data: deleted });
    expect(res.status).toBe(200);
    expect((await userRow()).deletedAt).toEqual(first);
  });
});

describe('clerk webhook — verification', () => {
  it('rejects a delivery signed with the wrong secret, and writes nothing', async () => {
    const wrong = `whsec_${Buffer.from('not-the-secret').toString('base64')}`;
    const res = await send({ type: 'user.created', data: clerkUser() }, { secret: wrong });

    expect(res.status).toBe(400);
    expect(await db.select().from(users)).toHaveLength(0);
  });

  it('rejects a genuine delivery replayed outside the five-minute window', async () => {
    const res = await send({ type: 'user.created', data: clerkUser() }, { sentAt: Date.now() - 10 * 60_000 });
    expect(res.status).toBe(400);
  });

  it('rejects a request with no signature headers', async () => {
    const res = await POST(new NextRequest('https://x.test/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({ type: 'user.deleted', data: deleted }),
    }));
    expect(res.status).toBe(400);
    expect(await db.select().from(users)).toHaveLength(0);
  });

  it('answers 500, not 400, when the signing secret is missing, so Svix retries once it is set', async () => {
    vi.stubEnv('CLERK_WEBHOOK_SIGNING_SECRET', '');
    const res = await send({ type: 'user.created', data: clerkUser() });
    expect(res.status).toBe(500);
  });
});
