import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { purchases } from '@/lib/db/schema';
import { getExamByIdAdmin } from '@/lib/db/exams';
import { verifySignature, decodeData, decodeOrderId } from '@/lib/payments/epoint';
import { captureException, captureMessage } from '@/lib/infra/observability';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/infra/analytics';
import { limited, clientIp } from '@/lib/infra/rate-limit';

interface EpointCallback {
  order_id: string;
  status: string;
  code?: string;
  message?: string;
  transaction?: string;
  bank_transaction?: string;
  amount?: number;
  card_mask?: string;
  rrn?: string;
  operation_code?: string;
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const privateKey = process.env.EPOINT_PRIVATE_KEY;
  if (!privateKey) {
    void captureMessage('EPOINT_PRIVATE_KEY is not configured', { level: 'error' });
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  /*
   * Parsing the body can throw, and did.
   *
   * `req.formData()` rejects when the request carries no body or a
   * content-type it does not recognise — so any malformed POST produced an
   * unhandled 500 and a report through `onRequestError` into PostHog. A
   * gateway retry or an idle scanner was enough. A body we cannot parse is a
   * bad request, and saying so costs nothing.
   */
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Malformed request body' }, { status: 400 });
  }

  const data = formData.get('data') as string | null;
  const signature = formData.get('signature') as string | null;

  if (!data || !signature) {
    return NextResponse.json({ error: 'Missing data or signature' }, { status: 400 });
  }

  if (!verifySignature(data, signature, privateKey)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: EpointCallback;
  try {
    payload = decodeData<EpointCallback>(data);
  } catch {
    return NextResponse.json({ error: 'Invalid data encoding' }, { status: 400 });
  }

  // Payments created by the /testpayment harness carry a TEST- order_id and
  // grant no exam access. The signature is already verified above, so just
  // acknowledge the callback without touching purchase data.
  if (payload.order_id?.startsWith('TEST-')) {
    return NextResponse.json({ received: true, test: true });
  }

  let userId: string;
  let examId: string;
  try {
    const decoded = decodeOrderId(payload.order_id);
    userId = decoded.u;
    examId = decoded.e;
  } catch {
    void captureMessage('Could not decode order_id', {
      level: 'error',
      extra: { order_id: payload.order_id },
    });
    return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 });
  }

  /*
   * Keyed by IP, after signature verification but before any database work.
   *
   * The signature check already rejects forged callbacks, so this is not an
   * authentication control — it bounds the cost of being flooded with VALID
   * redeliveries, each of which otherwise costs an exam lookup and a write.
   * Epoint's own retry behaviour stays comfortably inside it.
   *
   * Fails open by design (see `isRateLimited`): a Redis outage must never make
   * this endpoint start rejecting real payment callbacks.
   */
  if (await limited('publicIp', 'epoint-webhook', clientIp(await headers()))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const transaction = payload.transaction ?? payload.order_id;
  const amountCents = Math.round((payload.amount ?? 0) * 100);
  const status = payload.status;

  /*
   * Every branch below is ONE atomic statement, so there is no transaction.
   *
   * There used to be an interactive WebSocket transaction here, justified like
   * this: "two deliveries racing here could otherwise both observe a
   * non-COMPLETED row and both fire `purchaseCompleted`, inflating reported
   * revenue for a single sale."
   *
   * It did not do that. The read that produced `before` took no row lock, and
   * Postgres defaults to READ COMMITTED — a transaction is not a lock. Both
   * deliveries could read PENDING; `ON CONFLICT` then serialised only the
   * WRITES, and both still held `before.status = 'PENDING'` when they reached
   * the reporting gate. The transaction cost a socket on the payment path and
   * bought nothing.
   *
   * The gate is now the WRITE's own outcome: `DO UPDATE ... WHERE status <>
   * 'COMPLETED'` re-evaluates against the updated row once the lock is
   * released, so exactly one caller can ever see a row come back from
   * RETURNING. That is the same idiom `markAudioPlayed` and `reconcilePurchase`
   * already use — the database decides, not a read-then-write in application
   * code.
   */
  try {
    const outcome = await (async (): Promise<{ status: number; body: object } | null> => {
    if (status === 'success') {
      /*
       * Resolve the exam WITHOUT the isActive filter.
       *
       * `getExamById` only returns active exams, so an admin toggling an exam
       * off while a payment was in flight made this return 400 — after the card
       * had already been charged. The purchase stayed PENDING, the customer got
       * nothing, and the reconciler failed the same way on their return.
       * Whether an exam is currently on sale has no bearing on honouring a
       * payment that was authorised while it was.
       */
      const exam = await getExamByIdAdmin(examId);
      if (!exam) {
        void captureMessage('Webhook received for unknown exam', {
          level: 'error',
          extra: { examId, transaction },
        });
        return { status: 400, body: { error: 'Exam not found' } };
      }

      /*
       * Read only for the amount check below — NOT for deciding whether to
       * report revenue. That decision comes from the write, further down.
       */
      const [before] = await db
        .select({ amountCents: purchases.amountCents, status: purchases.status })
        .from(purchases)
        .where(and(eq(purchases.userId, userId), eq(purchases.examId, examId)))
        .limit(1);

      /*
       * Validate against the price QUOTED AT CHECKOUT, not the live one.
       *
       * `createCheckoutSession` writes a PENDING purchase carrying the
       * `amountCents` the customer was actually shown. Comparing against
       * `exam.price` instead meant an admin repricing an exam mid-payment
       * rejected a correct payment as an "Amount mismatch" and refused access.
       * The live price is only the fallback for a payment with no PENDING row
       * to check against.
       */
      const expectedCents = before?.amountCents ?? Math.round(exam.price * 100);
      if (amountCents !== expectedCents) {
        void captureMessage('Payment amount mismatch', {
          level: 'error',
          extra: { examId, transaction, expected: expectedCents, received: amountCents, quotedAtCheckout: before?.amountCents ?? null },
        });
        return { status: 400, body: { error: 'Amount mismatch' } };
      }

      /*
       * The upsert IS the idempotency gate.
       *
       * `setWhere` means a row already COMPLETED matches nothing, so RETURNING
       * comes back empty and the caller knows it did not perform the
       * transition. Postgres re-evaluates that predicate against the updated
       * row after waiting on the lock, so of two concurrent redeliveries
       * exactly one can ever get a row back — which is what makes the revenue
       * event fire once per sale rather than once per delivery.
       */
      const [transitioned] = await db
        .insert(purchases)
        .values({
          userId, examId,
          transactionId: transaction,
          amountCents,
          currency: 'AZN',
          status: 'COMPLETED',
          orderHistory: [transaction],
        })
        .onConflictDoUpdate({
          target: [purchases.userId, purchases.examId],
          set: {
            transactionId: transaction,
            amountCents,
            currency: 'AZN',
            status: 'COMPLETED',
            // `array_append` guarded by a membership test is `$addToSet`:
            // a redelivered webhook must not append the same reference twice.
            orderHistory: sql`CASE WHEN ${purchases.orderHistory} @> ARRAY[${transaction}]::text[]
                                   THEN ${purchases.orderHistory}
                                   ELSE array_append(${purchases.orderHistory}, ${transaction}) END`,
            updatedAt: new Date(),
          },
          // Never re-complete an already-completed purchase. A REFUNDED one is
          // deliberately still upgradable: that is a genuine re-purchase.
          setWhere: ne(purchases.status, 'COMPLETED'),
        })
        .returning({ id: purchases.id });

      /*
       * Report the sale only on the delivery that actually made the transition.
       *
       * This used to read `before.status`, captured before the write — so two
       * redeliveries racing each other both saw PENDING and both reported the
       * same sale. Gating on the row the write returned removes the window
       * entirely, because only one write can satisfy `setWhere`.
       */
      if (transitioned) {
        void trackEvent(ANALYTICS_EVENTS.purchaseCompleted, userId, {
          examId,
          examTitle:   exam.title,
          examType:    exam.type,
          revenueAzn:  amountCents / 100,
          transaction,
        });
      }
    } else if (status === 'returned') {
      // Refund / chargeback — revoke access. Only an existing purchase is flipped
      // to REFUNDED; never upsert a row that was never there. Idempotent.
      const [refunded] = await db
        .update(purchases)
        .set({
          status: 'REFUNDED',
          orderHistory: sql`CASE WHEN ${purchases.orderHistory} @> ARRAY[${'refund:' + transaction}]::text[]
                                 THEN ${purchases.orderHistory}
                                 ELSE array_append(${purchases.orderHistory}, ${'refund:' + transaction}) END`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(purchases.userId, userId),
          eq(purchases.examId, examId),
          ne(purchases.status, 'REFUNDED'),
        ))
        .returning({ amountCents: purchases.amountCents });

      // `refunded` is null when there was nothing to revoke, or when this is a
      // redelivery of a refund already applied — neither should be reported.
      if (refunded) {
        void trackEvent(ANALYTICS_EVENTS.purchaseRefunded, userId, {
          examId,
          revenueAzn: -(refunded.amountCents ?? 0) / 100,
          transaction,
        });
      }
    } else if (status === 'failed' || status === 'error' || status === 'server_error') {
      // Record the failure, but never clobber a COMPLETED or REFUNDED purchase.
      // E11000 on the unique { userId, examId } index means such a row already
      // exists — that's expected here, not an error.
      /*
       * Record the failure, but never clobber a COMPLETED or REFUNDED purchase.
       *
       * `DO UPDATE ... WHERE` says that directly. The Mongo version had to
       * attempt an upsert and then swallow the E11000 the unique index threw
       * when a protected row already existed — expected control flow expressed
       * as a caught exception. Here a protected row simply matches nothing.
       */
      await db
        .insert(purchases)
        .values({
          userId, examId,
          transactionId: transaction,
          amountCents,
          currency: 'AZN',
          status: 'FAILED',
          orderHistory: [transaction],
        })
        .onConflictDoUpdate({
          target: [purchases.userId, purchases.examId],
          set: {
            transactionId: transaction,
            amountCents,
            currency: 'AZN',
            status: 'FAILED',
            orderHistory: sql`CASE WHEN ${purchases.orderHistory} @> ARRAY[${transaction}]::text[]
                                   THEN ${purchases.orderHistory}
                                   ELSE array_append(${purchases.orderHistory}, ${transaction}) END`,
            updatedAt: new Date(),
          },
          setWhere: sql`${purchases.status} NOT IN ('COMPLETED', 'REFUNDED')`,
        });
    }
    // Any other status (e.g. 'new') is a non-final state — acknowledge only.

      return null;
    })();

    if (outcome) return NextResponse.json(outcome.body, { status: outcome.status });
    return NextResponse.json({ received: true });
  } catch (err) {
    void captureException(err, {
      tags: { route: 'webhook/epoint' },
      extra: { transaction, userId, examId },
    });
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
