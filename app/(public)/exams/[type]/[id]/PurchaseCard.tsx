'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useClerk } from '@clerk/nextjs';
import { toast } from 'sonner';
import { claimFreeExamAction } from '@/lib/actions/free-exam';
import { MONO_LABEL } from '@/components/ui/type-styles';

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


/**
 * Both ownership states render the same three rows, and the same price header,
 * CTA and footer strip. Only the words change.
 *
 * The purchase check resolves on the client after first paint, so any
 * difference in shape between the two states is a layout shift for every owner
 * of the exam — it was measurably pushing the "Daxildir" ledger and the refund
 * note down the page. Same geometry, different copy: no shift.
 */
const TERMS = [
  { label: 'Giriş', value: 'müddətsiz', owned: 'açıqdır' },
  { label: 'Cəhd', value: 'limitsiz',   owned: 'limitsiz' },
  { label: 'ƏDV',  value: 'daxil',      owned: 'daxil' },
];

interface Props {
  examId: string;
  price: number;
  features: string[];
  /**
   * Whether the first-paper-free promotion is running.
   *
   * Resolved on the SERVER at render time, so it is present in the prerendered
   * HTML and the promotional CTA costs no layout shift. Per-user eligibility
   * (`canClaim`) arrives later and only ever swaps the button's TEXT, never its
   * geometry — the same discipline the ownership states already follow.
   */
  promoActive: boolean;
}

export default function PurchaseCard({ examId, price, features, promoActive }: Props) {
  const { isSignedIn, isLoaded } = useAuth();
  const { redirectToSignIn } = useClerk();
  const router = useRouter();
  const [hasPurchased, setHasPurchased] = useState(false);
  /*
   * `null` = not yet known. Distinct from `false` on purpose: a signed-in user
   * whose eligibility has not come back yet must not have the free CTA yanked
   * away mid-read, and a signed-OUT visitor never gets an answer at all — the
   * promo stays advertised for them, and clicking it sends them to sign-in.
   */
  const [canClaim, setCanClaim] = useState<boolean | null>(null);
  const [claiming, startClaim] = useTransition();

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
        if (typeof data?.canClaim === 'boolean') setCanClaim(data.canClaim);
      })
      .catch(() => {
        // Network failure or abort: leave the buy CTA in place. Showing the
        // purchase path to someone who already owns the exam is recoverable —
        // checkout re-detects it — whereas hiding it is not.
      });

    return () => controller.abort();
  }, [examId, isLoaded, isSignedIn]);

  /*
   * Advertise the free paper unless we positively know this user has spent
   * their claim. `canClaim === null` (still loading, or signed out) counts as
   * eligible so the CTA is stable from first paint — the server action is the
   * thing that actually decides, and it re-checks everything.
   */
  const showFree = promoActive && !hasPurchased && canClaim !== false;

  const onClaim = () => {
    // Signed-out visitors see the promo too; the account is what the claim is
    // recorded against, so collect it first and return them here.
    if (isLoaded && !isSignedIn) {
      // `window.location.pathname` rather than a rebuilt URL: this card only
      // ever renders on the paper's own page, so where the visitor already is
      // IS the place to send them back to — and it cannot drift out of step
      // with the route the way a hand-assembled path can.
      void redirectToSignIn({ redirectUrl: window.location.pathname });
      return;
    }

    startClaim(async () => {
      const result = await claimFreeExamAction(examId);
      if (result.ok) {
        setHasPurchased(true);
        setCanClaim(false);
        toast.success('Sınaq hesabınıza əlavə edildi.');
        router.refresh();
      } else {
        // A refusal is usually "you already used it" — reflect that in the CTA
        // rather than leaving a button that will fail the same way again.
        setCanClaim(false);
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <div className="overflow-hidden rounded-panel bg-ink text-bg">
        <div className="px-6.5 pt-6.5 pb-5.5">
          <div className="flex items-baseline justify-between gap-3 border-b border-bg/18 pb-5.5">
            <span className="flex items-baseline gap-2.5">
              <span className="font-mono text-display-sm leading-[0.88] font-light tracking-[-0.045em] tabular-nums lg:text-display-md">
                {price}
              </span>
              <span className="font-mono text-sm text-bg/50">AZN</span>
            </span>
          </div>

          {/* Label/value pairs, so a description list: each value is read
              with the term it answers — "Giriş: müddətsiz". */}
          <dl className="m-0 mb-5.5">
            {TERMS.map((term, i) => (
              <div
                key={term.label}
                className={`flex items-center justify-between py-3.25 ${
                  i < TERMS.length - 1 ? 'border-b border-bg/10' : ''
                }`}
              >
                <dt className="text-sm text-bg/55">{term.label}</dt>
                <dd className="m-0 font-mono text-note text-bg">
                  {hasPurchased ? term.owned : term.value}
                </dd>
              </div>
            ))}
          </dl>

          {/*
            prefetch={false} on checkout: it is auth-gated, so prefetching it for
            a signed-out visitor makes Clerk redirect the RSC request to the
            hosted sign-in on another origin, which fails CORS and logs two
            console errors on every view of this page.
          */}
          {showFree ? (
            /*
              A button, not a Link, and styled with the SAME class string as the
              anchor below rather than a shared variant: the two render at
              identical size, so swapping between them when eligibility resolves
              moves nothing on the page.
            */
            <button
              type="button"
              disabled={claiming}
              onClick={onClaim}
              className="group flex w-full items-center justify-center gap-2.5 rounded-full bg-bg px-6 py-3.75 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface active:translate-y-px disabled:opacity-60"
            >
              {claiming ? 'Təyin edilir…' : 'Pulsuz al'}
              <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
            </button>
          ) : (
            <Link
              href={hasPurchased ? '/dashboard' : `/checkout/${examId}`}
              prefetch={hasPurchased ? undefined : false}
              className="group flex items-center justify-center gap-2.5 rounded-full bg-bg px-6 py-3.75 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface active:translate-y-px"
            >
              {hasPurchased ? 'Panelə keç' : 'Giriş əldə et'}
              <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
            </Link>
          )}
        </div>

        <div className="border-t border-bg/12 bg-bg/5 px-6.5 pt-4 pb-5">
          <p className={`${MONO_LABEL} m-0 text-caption tracking-[0.12em] text-bg/55`}>
            {hasPurchased
              ? 'giriş açıqdır · kabinetdə'
              : showFree
                ? 'ilk sınaq pulsuz · dərhal giriş'
                : 'güvənli ödəniş · dərhal giriş'}
          </p>
        </div>
      </div>

      {features.length > 0 && (
        <div className="mt-6">
          {/* A heading set as the same mono caption: it titles the list for a
              screen reader's heading navigation as well as for the eye. */}
          <h2 className={`${MONO_LABEL} border-b border-ink pb-2.5 text-ink-mute`}>Daxildir</h2>
          {/* `role="list"`: preflight strips the list style, and Safari stops
              exposing an unstyled list as a list unless the role is explicit. */}
          <ul role="list">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 border-b border-rule py-2.75">
                <span className="font-mono text-xs text-correct" aria-hidden>✓</span>
                <span className="text-sm text-ink">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="m-0 mt-5 text-note leading-[1.6] text-ink-mute">
        Rəqəmsal məhsul — ödəniş tamamlandıqda giriş dərhal açılır və geri qaytarılmır.{' '}
        <Link href="/legal/refund" className="underline transition-colors hover:text-ink">
          Şərtlər
        </Link>
      </p>
    </>
  );
}
