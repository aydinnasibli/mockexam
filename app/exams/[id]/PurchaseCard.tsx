'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';

/**
 * Purchase rail for an exam: the ink price card, the "Daxildir" ledger and the
 * refund note.
 *
 * The purchase check runs here, on the client, rather than via `auth()` in the
 * page. Reading the session on the server made the whole route dynamic, so
 * every request — Googlebot included — paid for a Clerk round-trip plus two
 * Mongo queries and the response went out as
 * `cache-control: private, no-cache, no-store`. Moving it here lets the page
 * prerender and sit on the CDN.
 *
 * The signed-out state is what renders on the server and what crawlers see,
 * which is also the correct default: the buy CTA is the page's primary content.
 */

const MONO_LABEL = 'font-mono text-[9px] tracking-[0.16em] uppercase';

const TERMS = [
  { label: 'Giriş', value: 'müddətsiz' },
  { label: 'Cəhd', value: 'limitsiz' },
  { label: 'ƏDV', value: 'daxil' },
];

interface Props {
  examId: string;
  /** Register code, e.g. `SAT—01`. */
  code: string;
  price: number;
  features: string[];
}

export default function PurchaseCard({ examId, code, price, features }: Props) {
  const { isSignedIn, isLoaded } = useAuth();
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    // Anonymous visitors never own the exam, and /api/purchase-status sits
    // behind auth middleware — calling it while signed out would bounce to
    // sign-in rather than return JSON.
    if (!isLoaded || !isSignedIn) return;

    const controller = new AbortController();
    fetch(`/api/purchase-status/${encodeURIComponent(examId)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.confirmed) setHasPurchased(true);
      })
      .catch(() => {
        // Network failure or abort: leave the buy CTA in place. Showing the
        // purchase path to someone who already owns the exam is recoverable —
        // checkout re-detects it — whereas hiding it is not.
      });

    return () => controller.abort();
  }, [examId, isLoaded, isSignedIn]);

  return (
    <>
      <div className="overflow-hidden rounded-[14px] bg-ink text-bg">
        <div className="px-6.5 pt-6.5 pb-5.5">
          <div className="flex items-baseline justify-between gap-3 border-b border-bg/18 pb-5.5">
            {hasPurchased ? (
              <span className="text-lg font-medium text-bg">Artıq alınmışdır</span>
            ) : (
              <span className="flex items-baseline gap-2.5">
                <span className="font-mono text-[46px] leading-[0.88] font-light tracking-[-0.045em] tabular-nums lg:text-[56px]">
                  {price}
                </span>
                <span className="font-mono text-sm text-bg/50">AZN</span>
              </span>
            )}
            <span className={`${MONO_LABEL} shrink-0 text-bg/40`}>{code}</span>
          </div>

          {hasPurchased ? (
            <p className="mt-5.5 mb-5.5 text-sm text-bg/55">
              Bu sınağa girişiniz var — kabinetdən istənilən vaxt başlaya bilərsiniz.
            </p>
          ) : (
            <div className="mb-5.5">
              {TERMS.map((term, i) => (
                <div
                  key={term.label}
                  className={`flex items-center justify-between py-3.25 ${
                    i < TERMS.length - 1 ? 'border-b border-bg/10' : ''
                  }`}
                >
                  <span className="text-sm text-bg/55">{term.label}</span>
                  <span className="font-mono text-[13px] text-bg">{term.value}</span>
                </div>
              ))}
            </div>
          )}

          {hasPurchased ? (
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2.5 rounded-full bg-bg px-6 py-3.75 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface"
            >
              Panelə keç <span aria-hidden>→</span>
            </Link>
          ) : (
            /*
              prefetch={false}: /checkout is auth-gated, so prefetching it for a
              signed-out visitor makes Clerk redirect the RSC request to the
              hosted sign-in on another origin, which fails CORS and logs two
              console errors on every view of this page.
            */
            <Link
              href={`/checkout/${examId}`}
              prefetch={false}
              className="flex items-center justify-center gap-2.5 rounded-full bg-bg px-6 py-3.75 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface"
            >
              Giriş əldə et <span aria-hidden>→</span>
            </Link>
          )}
        </div>

        <div className="border-t border-bg/12 bg-bg/5 px-6.5 pt-4 pb-5">
          <p className={`${MONO_LABEL} m-0 text-[10px] tracking-[0.12em] text-bg/45`}>
            güvənli ödəniş · dərhal giriş
          </p>
        </div>
      </div>

      {features.length > 0 && (
        <div className="mt-6">
          <div className={`${MONO_LABEL} border-b border-ink pb-2.5 text-ink-mute`}>Daxildir</div>
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-2.5 border-b border-rule py-2.75">
              <span className="font-mono text-xs text-correct" aria-hidden>✓</span>
              <span className="text-sm text-ink">{feature}</span>
            </div>
          ))}
        </div>
      )}

      <p className="m-0 mt-5 text-[13px] leading-[1.6] text-ink-mute">
        Rəqəmsal məhsul — ödəniş tamamlandıqda giriş dərhal açılır və geri qaytarılmır.{' '}
        <Link href="/legal/refund" className="underline transition-colors hover:text-ink">
          Şərtlər
        </Link>
      </p>
    </>
  );
}
