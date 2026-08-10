'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';

/**
 * Order card for an exam.
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

interface Props {
  examId: string;
  tag: string;
  price: number;
}

export default function PurchaseCard({ examId, tag, price }: Props) {
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
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 16, overflow: 'hidden' }}>

      {/* Dark header */}
      <div className="px-6 sm:px-7 py-6" style={{ background: 'var(--color-ink)' }}>
        <div className="eyebrow mb-2" style={{ color: 'rgba(250,250,246,0.45)' }}>Sifariş</div>
        <p
          className="text-[12px] mb-6"
          style={{ color: 'rgba(250,250,246,0.35)', margin: '4px 0 20px' }}
        >
          {tag} · {examId}
        </p>

        {hasPurchased ? (
          <div>
            <p className="text-[15px] font-medium m-0" style={{ color: 'var(--color-bg)' }}>
              Artıq alınmışdır
            </p>
            <p className="text-[13px] mt-1 m-0" style={{ color: 'rgba(250,250,246,0.45)' }}>
              Bu sınağa girişiniz var
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px]" style={{ color: 'rgba(250,250,246,0.5)' }}>Qiymət</span>
              <span className="text-[13px] font-medium" style={{ color: 'var(--color-bg)' }}>
                {price} ₼
              </span>
            </div>
            <div
              className="flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16, marginBottom: 16 }}
            >
              <span className="text-[13px]" style={{ color: 'rgba(250,250,246,0.5)' }}>ƏDV daxil</span>
              <span className="text-[13px]" style={{ color: 'rgba(250,250,246,0.3)' }}>—</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="font-display font-normal"
                style={{ fontSize: 40, lineHeight: 1, color: 'var(--color-bg)', letterSpacing: '-0.025em' }}
              >
                {price}
              </span>
              <span className="text-[16px]" style={{ color: 'rgba(250,250,246,0.45)' }}>AZN</span>
            </div>
          </>
        )}
      </div>

      {/* CTA body */}
      <div className="px-6 sm:px-7 py-6">
        {hasPurchased ? (
          <Link href="/dashboard" className="btn-primary w-full justify-center">
            Paneldən başla <span className="arrow">→</span>
          </Link>
        ) : (
          <>
            {/*
              prefetch={false}: /checkout is auth-gated, so prefetching it for a
              signed-out visitor makes Clerk redirect the RSC request to the
              hosted sign-in on another origin, which fails CORS and logs two
              console errors on every view of this page.
            */}
            <Link
              href={`/checkout/${examId}`}
              prefetch={false}
              className="btn-primary w-full justify-center mb-4"
            >
              Giriş əldə et <span className="arrow">→</span>
            </Link>
            <p className="text-center text-[12px] m-0" style={{ color: 'var(--color-ink-mute)' }}>
              Güvənli ödəniş · Dərhal giriş
            </p>
            <p className="text-center text-[11px] mt-3 mb-0 leading-[1.6]" style={{ color: 'var(--color-ink-mute)' }}>
              Rəqəmsal məhsul: ödəniş tamamlandıqda giriş dərhal açılır və geri qaytarılmır.{' '}
              <Link href="/legal/refund" className="underline hover:text-ink transition-colors">
                Geri qaytarma siyasəti
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
