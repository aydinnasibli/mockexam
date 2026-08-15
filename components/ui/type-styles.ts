/**
 * The two mono micro-label treatments, in one place.
 *
 * These were previously declared as a local `const MONO_LABEL = …` in nine
 * separate files, and the copies had drifted into four different values —
 * the same caption rendered at 0.14em on the homepage and 0.16em on the contact
 * page, and at 9px on the purchase card.
 *
 * Shared as class-name constants rather than as a CSS class on purpose. A
 * `.mono-label` rule in globals.css is what this project used to have, and
 * because `@layer utilities` in globals.css is emitted after Tailwind's own
 * utilities, that rule silently won every tie against a call-site utility — so
 * `text-ink` next to `.mono-label` did nothing. A plain string composes with
 * utilities instead of fighting them.
 *
 * Tracking is 0.16em for both: at 10–11px, uppercase needs the wider setting to
 * stay legible, and it was already the marginal plurality across the codebase.
 */

/** 10px caption — column heads, figure captions, meta rows. */
export const MONO_LABEL = 'font-mono text-caption tracking-[0.16em] uppercase';

/** 11px section head — the tier above a caption. */
export const MONO_SECTION = 'font-mono text-label tracking-[0.16em] uppercase';
