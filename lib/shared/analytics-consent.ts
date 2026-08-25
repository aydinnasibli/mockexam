/**
 * Whether this visitor has acknowledged the cookie notice.
 *
 * The key and the expiry used to live inside `CookieNotice`, which meant only
 * that component could tell whether the notice had been seen. Session replay
 * therefore started on first paint, before anyone had been told anything —
 * `respect_dnt` is honoured, but a Do-Not-Track header is not consent, and
 * replay plus an identified email is the pairing that carries real weight for
 * EU visitors.
 *
 * Shared so the notice and the analytics bootstrap read one definition.
 *
 * Note this is an ACKNOWLEDGEMENT, not GDPR opt-in consent: the notice informs
 * rather than asks, and dismissing it is what this records. Gating replay on it
 * is strictly better than not gating it at all, and it leaves the UX alone. If
 * you ever need true opt-in, this is the single place that has to change.
 */

export const CONSENT_STORAGE_KEY = 'tc-cookie-notice';

/** Re-show the notice a week after it was dismissed. */
export const CONSENT_DAYS = 7;
const CONSENT_MS = CONSENT_DAYS * 24 * 60 * 60 * 1000;

/**
 * True when the notice was acknowledged within the retention window.
 *
 * Every failure mode answers "not acknowledged": storage unavailable (private
 * browsing), a malformed value, or a future-dated one. The safe direction for a
 * privacy gate is to withhold, not to assume.
 */
export function hasAnalyticsConsent(now: number = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at) || at > now) return false;
    return now - at < CONSENT_MS;
  } catch {
    return false;
  }
}
