'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import posthog from 'posthog-js';
import Button from '@/components/ui/Button';
import { CONSENT_STORAGE_KEY, hasAnalyticsConsent } from '@/lib/shared/analytics-consent';

// Key and window live in lib/shared/analytics-consent.ts so the analytics
// bootstrap can read the same acknowledgement this component records.
const STORAGE_KEY = CONSENT_STORAGE_KEY;

/**
 * Routes where the notice must never appear.
 *
 * An exam is timed and full-screen; a banner sliding over the UI mid-question
 * is both a distraction and a potential mis-click on an answer.
 */
const HIDDEN_ON = ['/exam-session'];

// ── localStorage as an external store ────────────────────────────────────────
// Read via useSyncExternalStore rather than an effect: localStorage is not
// available during SSR, so reading it in render would cause a hydration
// mismatch, and reading it in an effect means a second render pass just to hide
// the banner (which is what `react-hooks/set-state-in-effect` warns about).
// This is exactly the case useSyncExternalStore exists for.

let listeners: Array<() => void> = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  // Also react to dismissal in another tab.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners = listeners.filter(l => l !== onChange);
    window.removeEventListener('storage', onStorage);
  };
}

function emitChange() {
  for (const l of listeners) l();
}

/** Client snapshot: has the notice been dismissed within the last week? */
function getSnapshot(): boolean {
  // Same predicate the analytics bootstrap uses — a malformed, future-dated or
  // unreadable value counts as "not dismissed", so the notice reappears rather
  // than hiding forever, and replay stays off rather than starting unannounced.
  return hasAnalyticsConsent();
}

/**
 * Server snapshot: treat as dismissed so the banner is absent from the HTML and
 * appears only once the client confirms it should. This keeps SSR and the first
 * client render identical.
 */
function getServerSnapshot(): boolean {
  return true;
}

export default function CookieNotice() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pathname = usePathname();

  const hiddenHere = HIDDEN_ON.some(p => pathname?.startsWith(p));
  const visible = !dismissed && !hiddenHere;

  function dismiss() {
    /*
     * Acknowledging is what turns session replay on.
     *
     * Replay is disabled at init (see instrumentation-client.ts) so nothing is
     * recorded before the visitor has been told it might be. Analytics events
     * themselves keep running — they are anonymous and carry no PII since
     * `identify` stopped sending email.
     */
    try { posthog.startSessionRecording(); } catch { /* replay is optional */ }
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignore quota / private-browsing errors.
    }
    emitChange();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          // role="region" + aria-label rather than a dialog: this is a notice,
          // not a decision, so it must not trap focus or block the page.
          role="region"
          aria-label="Cookie bildirişi"
          className="fixed z-90 bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm"
        >
          <div className="relative rounded-2xl border border-rule bg-surface p-4 pr-10 shadow-lg">
            <button
              onClick={dismiss}
              aria-label="Bildirişi bağla"
              /* p-1.5, not p-1: the 15px glyph plus 4px padding gave a 23px
                 target, 1px under the WCAG 2.5.8 minimum. The inset drops by
                 the same 2px, so the ✕ sits exactly where it did. */
              className="absolute top-2.5 right-2.5 rounded-lg p-1.5 text-ink-mute transition-colors hover:bg-surface-2"
            >
              <X size={15} aria-hidden="true" />
            </button>

            <p className="m-0 mb-3 text-sm leading-relaxed text-ink-soft">
              Saytın işləməsi, təhlükəsizlik və istifadə statistikası üçün cookie və
              lokal yaddaşdan istifadə edirik.{' '}
              <Link href="/legal/cookies" className="text-ink underline underline-offset-[3px]">
                Ətraflı
              </Link>
              .
            </p>

            <Button size="none" className="gap-2.5 rounded-xl px-4 py-2 text-sm"
              onClick={dismiss}
            >
              Anladım
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
