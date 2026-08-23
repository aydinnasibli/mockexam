/**
 * Deterministic Azerbaijani dates, built by hand rather than via
 * `toLocaleDateString('az-AZ')`.
 *
 * That call resolves differently on either side of the render boundary: Node's
 * ICU build falls back to "2026 M07 12" while browsers produce "12 iyul 2026".
 * In a client component that is a hydration mismatch, and React responds by
 * throwing away the subtree and re-rendering it on every page load.
 *
 * UTC parts, not local ones — the server runs in UTC and the visitor does not,
 * so local parts would reintroduce the same mismatch for anything timestamped
 * late in the day, and would disagree with the pages that format server-side.
 *
 * Lives here rather than inside one component because it was solved once in the
 * review page and then not applied in settings, which went on calling
 * `toLocaleDateString` directly. One definition, no drift.
 */

export const AZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr',
] as const;

/** `12 iyul 2026`. Accepts anything `new Date()` accepts; empty for an invalid date. */
export function formatAzDate(value: string | number | Date): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${AZ_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Today as `YYYY-MM-DD`, in UTC, for a date input's `min`.
 *
 * `new Date().toISOString().split('T')[0]` computed during render is the same
 * hazard in miniature: around a UTC midnight the server and the client can
 * disagree by a day. Callers should compute this once outside render — see
 * `todayIsoUtc` usage — rather than inline in JSX.
 */
export function todayIsoUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
