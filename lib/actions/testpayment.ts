'use server';

import { headers } from 'next/headers';
import { checkRole } from '@/lib/infra/admin';
import {
  signRequest,
  verifySignature,
  decodeData,
  EPOINT_REQUEST_URL,
  EPOINT_STATUS_URL,
} from '@/lib/payments/epoint';
import { captureException } from '@/lib/infra/observability';

/**
 * Order-id prefix for payments created from the /testpayment harness.
 * The Epoint webhook recognises this prefix and acknowledges the callback
 * without touching real purchase data — see app/api/webhooks/epoint/route.ts.
 */
const TEST_ORDER_PREFIX = 'TEST-';

const CURRENCIES = ['AZN', 'USD', 'EUR', 'RUB'] as const;
const LANGUAGES = ['az', 'en', 'ru'] as const;
type Currency = (typeof CURRENCIES)[number];
type Language = (typeof LANGUAGES)[number];

export interface CreateTestPaymentInput {
  amount: string;
  currency: Currency;
  language: Language;
  description: string;
}

export type CreateTestPaymentResult =
  | {
      ok: true;
      orderId: string;
      request: { payload: Record<string, unknown>; data: string; signature: string };
      response: Record<string, unknown>;
      redirectUrl: string | null;
    }
  | { ok: false; error: string; response?: Record<string, unknown> };

async function requireAdmin(): Promise<string | null> {
  return (await checkRole('admin')) ? null : 'Bu səhifə yalnız admin üçündür.';
}

async function resolveAppUrl(): Promise<string> {
  // Prefer the current request origin so redirects land back where the tester
  // is browsing (localhost in dev, the real domain in prod).
  const h = await headers();
  const host = h.get('host');
  if (host) {
    const proto = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

export async function createTestPayment(
  input: CreateTestPaymentInput,
): Promise<CreateTestPaymentResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const publicKey = process.env.EPOINT_PUBLIC_KEY;
  const privateKey = process.env.EPOINT_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return { ok: false, error: 'EPOINT_PUBLIC_KEY / EPOINT_PRIVATE_KEY konfiqurasiya edilməyib.' };
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000) {
    return { ok: false, error: 'Məbləğ 0-dan böyük düzgün rəqəm olmalıdır.' };
  }
  if (!CURRENCIES.includes(input.currency)) return { ok: false, error: 'Yanlış valyuta.' };
  if (!LANGUAGES.includes(input.language)) return { ok: false, error: 'Yanlış dil.' };

  const orderId = `${TEST_ORDER_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const appUrl = await resolveAppUrl();

  const payload = {
    public_key: publicKey,
    amount: amount.toFixed(2),
    currency: input.currency,
    language: input.language,
    order_id: orderId,
    description: input.description.slice(0, 1000) || 'Test payment',
    success_redirect_url: `${appUrl}/testpayment?result=success&order=${encodeURIComponent(orderId)}`,
    error_redirect_url: `${appUrl}/testpayment?result=failed&order=${encodeURIComponent(orderId)}`,
  };

  const { data, signature } = signRequest(payload, privateKey);

  try {
    const res = await fetch(EPOINT_REQUEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data, signature }),
    });

    const text = await res.text();
    let response: Record<string, unknown>;
    try {
      response = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        error: `Epoint JSON olmayan cavab qaytardı (HTTP ${res.status}).`,
        response: { raw: text.slice(0, 2000) },
      };
    }

    const redirectUrl = typeof response.redirect_url === 'string' ? response.redirect_url : null;
    const succeeded = response.status === 'success' && redirectUrl;

    return {
      ok: true,
      orderId,
      // Never leak the merchant public key back to the browser payload view.
      request: { payload: { ...payload, public_key: '(EPOINT_PUBLIC_KEY)' }, data, signature },
      response,
      redirectUrl: succeeded ? redirectUrl : null,
    };
  } catch (err) {
    void captureException(err, { tags: { action: 'createTestPayment' } });
    return { ok: false, error: 'Epoint xidmətinə qoşulmaq mümkün olmadı.' };
  }
}

export type StatusResult =
  | { ok: true; response: Record<string, unknown> }
  | { ok: false; error: string; response?: Record<string, unknown> };

export async function checkTestPaymentStatus(transaction: string): Promise<StatusResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const publicKey = process.env.EPOINT_PUBLIC_KEY;
  const privateKey = process.env.EPOINT_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return { ok: false, error: 'EPOINT_PUBLIC_KEY / EPOINT_PRIVATE_KEY konfiqurasiya edilməyib.' };
  }

  const tx = transaction.trim();
  if (!tx) return { ok: false, error: 'Transaction ID daxil edin.' };

  const { data, signature } = signRequest({ public_key: publicKey, transaction: tx }, privateKey);

  try {
    const res = await fetch(EPOINT_STATUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data, signature }),
    });
    const text = await res.text();
    try {
      return { ok: true, response: JSON.parse(text) as Record<string, unknown> };
    } catch {
      return {
        ok: false,
        error: `Epoint JSON olmayan cavab qaytardı (HTTP ${res.status}).`,
        response: { raw: text.slice(0, 2000) },
      };
    }
  } catch (err) {
    void captureException(err, { tags: { action: 'checkTestPaymentStatus' } });
    return { ok: false, error: 'Epoint xidmətinə qoşulmaq mümkün olmadı.' };
  }
}

export interface SignatureSelfTest {
  ok: boolean;
  data: string;
  signature: string;
  verified: boolean;
  error?: string;
}

/**
 * Signs a fixed sample payload and re-verifies it locally, proving the
 * data+signature crypto round-trips without calling Epoint.
 */
export async function runSignatureSelfTest(): Promise<SignatureSelfTest> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, data: '', signature: '', verified: false, error: denied };

  const privateKey = process.env.EPOINT_PRIVATE_KEY;
  if (!privateKey) {
    return {
      ok: false,
      data: '',
      signature: '',
      verified: false,
      error: 'EPOINT_PRIVATE_KEY konfiqurasiya edilməyib.',
    };
  }

  const sample = {
    public_key: process.env.EPOINT_PUBLIC_KEY ?? 'i000000001',
    amount: '30.75',
    currency: 'AZN',
    language: 'az',
    description: 'test payment',
    order_id: '1',
  };

  const { data, signature } = signRequest(sample, privateKey);
  const verified = verifySignature(data, signature, privateKey);
  // Sanity-check the decode path used by the webhook.
  let decodeOk = false;
  try {
    decodeData(data);
    decodeOk = true;
  } catch {
    decodeOk = false;
  }

  return { ok: verified && decodeOk, data, signature, verified };
}
