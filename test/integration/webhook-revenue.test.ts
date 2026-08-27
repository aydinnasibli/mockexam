/**
 * The Epoint webhook — access, revenue reporting and idempotency.
 *
 * The bug these were written against: the route read the existing purchase into
 * `before`, wrote, and then used `before.status` to decide whether to report
 * revenue — all inside an interactive transaction justified as preventing
 * exactly the double-report it did not prevent. That read took no row lock, and
 * Postgres defaults to READ COMMITTED, so two redeliveries could both observe
 * PENDING; `ON CONFLICT` serialised only the WRITES, and both still held a
 * stale `before` when they reached the reporting gate.
 *
 * The gate is now the write's own outcome — `DO UPDATE ... WHERE status <>
 * 'COMPLETED'` plus `RETURNING` — which Postgres re-evaluates against the
 * updated row after waiting on the lock. `reports the sale exactly once` below
 * pins that semantic directly.
 *
 * NOTE ON SCOPE: a true interleaving needs two connections, and PGlite is
 * single-connection — it serialises transactions end-to-end (verified:
 * A:begin → A:read → A:write → B:begin → …). So the race itself is not
 * reproduced here. What the fix does is remove the read the race depended on,
 * which is why the decisive test asserts on `RETURNING` rather than on timing.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';

const USER = 'user_webhook';
const EXAM = 'ielts-webhook';
const PRIVATE_KEY = 'test-private-key';

const events: Array<{ event: string; props: Record<string, unknown> }> = [];

vi.mock('@/lib/infra/db', async () => {
  const { db } = await import('@/test/pg');
  return { db, txDb: () => ({ db, close: async () => {} }) };
});
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.1' }),
}));
vi.mock('@/lib/infra/rate-limit', () => ({
  isRateLimited: async () => false,
  limited: async () => false,
  clientIp: () => '203.0.113.1',
}));
vi.mock('@/lib/infra/analytics', () => ({
  ANALYTICS_EVENTS: {
    checkoutStarted: 'checkout_started',
    purchaseCompleted: 'purchase_completed',
    purchaseRefunded: 'purchase_refunded',
    examStarted: 'exam_started',
    examSubmitted: 'exam_submitted',
    writingGraded: 'writing_graded',
  },
  trackEvent: async (event: string, _id: string, props: Record<string, unknown>) => {
    events.push({ event, props });
  },
}));
vi.mock('@/lib/infra/observability', () => ({
  captureException: async () => {},
  captureMessage: async () => {},
}));

const { db, resetDb, seedExam } = await import('@/test/pg');
const { purchases } = await import('@/lib/db/schema');
const { encodeOrderId } = await import('@/lib/payments/epoint');
const { POST } = await import('@/app/api/webhooks/epoint/route');

/** A genuinely signed Epoint callback, using the real signing function's scheme. */
function callback(body: Record<string, unknown>) {
  const data = Buffer.from(JSON.stringify(body)).toString('base64');
  const signature = Buffer.from(
    crypto.createHash('sha1').update(PRIVATE_KEY + data + PRIVATE_KEY).digest(),
  ).toString('base64');
  const form = new FormData();
  form.set('data', data);
  form.set('signature', signature);
  return new Request('https://x.test/api/webhooks/epoint', { method: 'POST', body: form });
}

const successPayload = (txn = 'TXN-1') => ({
  order_id: encodeOrderId(USER, EXAM),
  status: 'success',
  transaction: txn,
  amount: 15,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deliver = (body: Record<string, unknown>) => POST(callback(body) as any);

const completedEvents = () => events.filter(e => e.event === 'purchase_completed');

beforeEach(async () => {
  events.length = 0;
  vi.stubEnv('EPOINT_PRIVATE_KEY', PRIVATE_KEY);
  await resetDb();
  await seedExam(EXAM, { price: '15.00' });
});

describe('epoint webhook — revenue reporting', () => {
  it('grants access and reports the sale on first delivery', async () => {
    const res = await deliver(successPayload());
    expect(res.status).toBe(200);

    const [row] = await db.select().from(purchases)
      .where(and(eq(purchases.userId, USER), eq(purchases.examId, EXAM)));
    expect(row.status).toBe('COMPLETED');
    expect(completedEvents()).toHaveLength(1);
    expect(completedEvents()[0].props.revenueAzn).toBe(15);
  });

  it('a sequential redelivery does not double-report', async () => {
    await deliver(successPayload());
    await deliver(successPayload());
    expect(completedEvents()).toHaveLength(1);
  });

  it('does not append the same transaction to orderHistory twice', async () => {
    await deliver(successPayload());
    await deliver(successPayload());
    const [row] = await db.select().from(purchases)
      .where(and(eq(purchases.userId, USER), eq(purchases.examId, EXAM)));
    expect(row.orderHistory).toEqual(['TXN-1']);
  });

  it('upgrades a PENDING purchase written at checkout', async () => {
    await db.insert(purchases).values({
      userId: USER, examId: EXAM, transactionId: 'TXN-1',
      amountCents: 1500, status: 'PENDING',
    });
    await deliver(successPayload());
    const [row] = await db.select().from(purchases)
      .where(and(eq(purchases.userId, USER), eq(purchases.examId, EXAM)));
    expect(row.status).toBe('COMPLETED');
    expect(completedEvents()).toHaveLength(1);
  });

  it('validates the amount against the price quoted at checkout, not the live one', async () => {
    // Bought at 15, exam repriced to 25 mid-payment.
    await db.insert(purchases).values({
      userId: USER, examId: EXAM, transactionId: 'TXN-1',
      amountCents: 1500, status: 'PENDING',
    });
    await db.update(purchases).set({ amountCents: 1500 })
      .where(eq(purchases.userId, USER));

    const res = await deliver(successPayload());
    expect(res.status).toBe(200);
  });

  it('rejects a mismatched amount', async () => {
    const res = await deliver({ ...successPayload(), amount: 5 });
    expect(res.status).toBe(400);
    expect(completedEvents()).toHaveLength(0);
  });

  it('a refund revokes access and reports once', async () => {
    await deliver(successPayload());
    const res = await deliver({ ...successPayload(), status: 'returned' });
    expect(res.status).toBe(200);

    const [row] = await db.select().from(purchases)
      .where(and(eq(purchases.userId, USER), eq(purchases.examId, EXAM)));
    expect(row.status).toBe('REFUNDED');
    expect(events.filter(e => e.event === 'purchase_refunded')).toHaveLength(1);

    // A redelivered refund is a no-op.
    await deliver({ ...successPayload(), status: 'returned' });
    expect(events.filter(e => e.event === 'purchase_refunded')).toHaveLength(1);
  });

  it('a failure callback never clobbers a COMPLETED purchase', async () => {
    await deliver(successPayload());
    await deliver({ ...successPayload(), status: 'failed' });
    const [row] = await db.select().from(purchases)
      .where(and(eq(purchases.userId, USER), eq(purchases.examId, EXAM)));
    expect(row.status).toBe('COMPLETED');
  });

  it('reports the sale exactly once, however many deliveries arrive', async () => {
    // The gate is `DO UPDATE ... WHERE status <> 'COMPLETED'` + RETURNING, so
    // only the delivery that performs the transition sees a row come back.
    // This is the property that replaces the racy `before.status` read.
    for (let i = 0; i < 5; i++) await deliver(successPayload());
    expect(completedEvents()).toHaveLength(1);

    const [row] = await db.select().from(purchases)
      .where(and(eq(purchases.userId, USER), eq(purchases.examId, EXAM)));
    expect(row.status).toBe('COMPLETED');
    expect(row.orderHistory).toEqual(['TXN-1']);
  });

  it('reports again after a refund, because that is a genuine re-purchase', async () => {
    await deliver(successPayload());
    await deliver({ ...successPayload(), status: 'returned' });
    expect(completedEvents()).toHaveLength(1);

    // A REFUNDED row is deliberately still upgradable.
    await deliver({ ...successPayload(), transaction: 'TXN-2' });
    const [row] = await db.select().from(purchases)
      .where(and(eq(purchases.userId, USER), eq(purchases.examId, EXAM)));
    expect(row.status).toBe('COMPLETED');
    expect(completedEvents()).toHaveLength(2);
  });

  it('rejects an unsigned or wrongly signed callback', async () => {
    const form = new FormData();
    form.set('data', Buffer.from(JSON.stringify(successPayload())).toString('base64'));
    form.set('signature', 'not-the-signature');
    const req = new Request('https://x.test/api/webhooks/epoint', { method: 'POST', body: form });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    expect(res.status).toBe(401);
    expect(completedEvents()).toHaveLength(0);
  });
});
