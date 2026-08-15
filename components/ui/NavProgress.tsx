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
 * 1. **Shown on every navigation, with a floor on how briefly it can appear.**
 *    This used to be debounced by 180ms so that quick navigations never showed a
 *    bar. In practice that meant it almost never appeared at all — every local
 *    navigation beats 180ms — so the feedback the bar exists to give was
 *    missing. It now starts immediately and, once visible, stays up for at least
 *    MIN_VISIBLE_MS before rushing to full. That avoids the flicker the debounce
 *    was guarding against without trading away the signal: a 40ms navigation
 *    still renders a complete, readable sweep rather than a one-frame blink.
 *    The timers live in refs, not in either effect's closure, because the effect
 *    that *ends* a navigation is not the one that started it.
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
/**
 * Once the bar is up it stays up this long before completing, however fast the
 * navigation actually was. Below roughly a third of a second a bar reads as a
 * glitch rather than as progress.
 */
const MIN_VISIBLE_MS = 360;

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
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const minTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shownAt = useRef(0);
  /** Set by the main effect; called by the pathname effect, which cannot see its closure. */
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = document.documentElement;

    /** Rushes the bar to full and fades it out. */
    function complete() {
      root.removeAttribute(PENDING_ATTR);
      root.setAttribute(DONE_ATTR, '');
      setLiveMessage('');
      clearTimeout(doneTimer.current);
      doneTimer.current = setTimeout(() => root.removeAttribute(DONE_ATTR), DONE_MS);
    }

    /** Ends a navigation, holding the bar open for the rest of its minimum. */
    function finish() {
      clearTimeout(safetyTimer.current);
      safetyTimer.current = undefined;
      if (!root.hasAttribute(PENDING_ATTR)) return;

      const remaining = MIN_VISIBLE_MS - (Date.now() - shownAt.current);
      clearTimeout(minTimer.current);
      if (remaining <= 0) complete();
      else minTimer.current = setTimeout(complete, remaining);
    }
    finishRef.current = finish;

    function start() {
      // Collapse an in-flight navigation immediately; the new one owns the bar.
      clearTimeout(minTimer.current);
      clearTimeout(doneTimer.current);
      clearTimeout(safetyTimer.current);
      root.removeAttribute(DONE_ATTR);

      root.setAttribute(PENDING_ATTR, '');
      shownAt.current = Date.now();
      setLiveMessage('Yüklənir…');
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
      clearTimeout(safetyTimer.current);
      clearTimeout(doneTimer.current);
      clearTimeout(minTimer.current);
    };
  }, []);

  /*
   * The pathname changing is the navigation completing. This runs on mount too,
   * where there is nothing pending and every branch is a no-op.
   */
  useEffect(() => {
    finishRef.current();
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
