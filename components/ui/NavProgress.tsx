'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * A navigation progress bar for the whole site.
 *
 * This closes the one gap left by not having a loading state on the public
 * routes: `/exams` is a dynamic route with no `loading.js`, so between the
 * click and the new page there is nothing on screen to say the click landed.
 * At ~300ms that is correct — below a second, feedback is noise. But if the
 * database connection is cold and the wait becomes two seconds, silence reads
 * as a broken button.
 *
 * Three decisions worth keeping:
 *
 * 1. **Debounced by 180ms.** The bar never appears for a navigation that
 *    finishes quickly, which is nearly all of them. Showing a progress bar for
 *    120ms is the same flicker problem as a skeleton that flashes. The timers
 *    are held in refs rather than in either effect's closure, because the
 *    effect that *cancels* a pending reveal is not the one that scheduled it —
 *    without that, a navigation finishing at 100ms left the timer armed and
 *    the bar appeared at 180ms, after the new page had already arrived.
 *
 * 2. **No React state.** The bar is a fixed element that is always mounted;
 *    all this does is toggle a data attribute on `<html>`. Navigation costs
 *    zero re-renders, and there is no state to get stuck if a navigation is
 *    abandoned.
 *
 * 3. **It listens for clicks rather than wrapping `Link`.** `useLinkStatus` is
 *    the official hook, but it only reports the link it is rendered inside, so
 *    a global bar would mean replacing every `<Link>` in the app and
 *    remembering to use the wrapper forever. A capture-phase listener covers
 *    every link, including ones added later.
 */
const SHOW_AFTER_MS = 180;

/** A navigation that never resolves must not leave the bar running forever. */
const SAFETY_TIMEOUT_MS = 20000;

/** Long enough for the bar to rush to full and fade out. */
const DONE_MS = 400;

const PENDING_ATTR = 'data-nav-pending';
const DONE_ATTR = 'data-nav-done';

function setLiveMessage(text: string) {
  const live = document.getElementById('nav-progress-live');
  if (live) live.textContent = text;
}

export default function NavProgress() {
  const pathname = usePathname();
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const root = document.documentElement;

    /** Ends a navigation, whether or not the bar ever became visible. */
    function finish() {
      clearTimeout(showTimer.current);
      clearTimeout(safetyTimer.current);
      showTimer.current = undefined;
      safetyTimer.current = undefined;

      // Nothing was ever shown — the navigation beat the debounce.
      if (!root.hasAttribute(PENDING_ATTR)) return;

      root.removeAttribute(PENDING_ATTR);
      root.setAttribute(DONE_ATTR, '');
      setLiveMessage('');
      clearTimeout(doneTimer.current);
      doneTimer.current = setTimeout(() => root.removeAttribute(DONE_ATTR), DONE_MS);
    }

    function start() {
      finish();
      clearTimeout(doneTimer.current);
      root.removeAttribute(DONE_ATTR);
      showTimer.current = setTimeout(() => {
        root.setAttribute(PENDING_ATTR, '');
        setLiveMessage('Yüklənir…');
      }, SHOW_AFTER_MS);
      safetyTimer.current = setTimeout(finish, SAFETY_TIMEOUT_MS);
    }

    function onClick(event: MouseEvent) {
      // Anything the browser will not treat as an in-app navigation.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      const url = new URL(anchor.href, window.location.href);
      // Same-origin only, and never for a link back to the page you are on.
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      start();
    }

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', start);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', start);
      clearTimeout(showTimer.current);
      clearTimeout(safetyTimer.current);
      clearTimeout(doneTimer.current);
    };
  }, []);

  /*
   * The pathname changing is the navigation completing. This runs on mount too,
   * where there is nothing pending and every branch is a no-op.
   */
  useEffect(() => {
    const root = document.documentElement;
    clearTimeout(showTimer.current);
    clearTimeout(safetyTimer.current);
    showTimer.current = undefined;
    safetyTimer.current = undefined;

    if (!root.hasAttribute(PENDING_ATTR)) return;

    root.removeAttribute(PENDING_ATTR);
    root.setAttribute(DONE_ATTR, '');
    setLiveMessage('');
    const timer = setTimeout(() => root.removeAttribute(DONE_ATTR), DONE_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      <div className="nav-progress" aria-hidden>
        <div className="nav-progress__bar" />
      </div>
      {/* Announced only while a navigation is genuinely slow, so screen reader
          users get the same "it is working" signal the bar gives everyone else. */}
      <span id="nav-progress-live" role="status" aria-live="polite" className="sr-only" />
    </>
  );
}
