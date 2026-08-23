import { describe, expect, it } from 'vitest';
import { formatAzDate, todayIsoUtc } from './az-date';

describe('formatAzDate', () => {
  it('renders the Azerbaijani long form', () => {
    expect(formatAzDate('2026-07-12T10:00:00.000Z')).toBe('12 iyul 2026');
    expect(formatAzDate('2026-01-01T00:00:00.000Z')).toBe('1 yanvar 2026');
    expect(formatAzDate('2026-12-31T23:59:59.000Z')).toBe('31 dekabr 2026');
  });

  /*
   * The point of the hand-built formatter: UTC parts only. Local parts would
   * disagree between a UTC server and a visitor in another zone, which is a
   * hydration mismatch in a client component.
   */
  it('uses UTC parts, so it does not shift with the reader’s zone', () => {
    // 23:30 UTC is already "the next day" in +02:00, but must still read as the 12th.
    expect(formatAzDate('2026-07-12T23:30:00.000Z')).toBe('12 iyul 2026');
  });

  it('accepts a Date or a timestamp', () => {
    expect(formatAzDate(new Date('2026-03-05T00:00:00.000Z'))).toBe('5 mart 2026');
    expect(formatAzDate(Date.UTC(2026, 4, 9))).toBe('9 may 2026');
  });

  it('returns empty for an unparseable value rather than "Invalid Date"', () => {
    expect(formatAzDate('not a date')).toBe('');
  });
});

describe('todayIsoUtc', () => {
  it('is a plain YYYY-MM-DD in UTC', () => {
    expect(todayIsoUtc(new Date('2026-07-12T23:59:00.000Z'))).toBe('2026-07-12');
    expect(todayIsoUtc(new Date('2026-07-13T00:01:00.000Z'))).toBe('2026-07-13');
  });
});
