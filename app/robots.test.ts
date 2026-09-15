/**
 * VALIDATION — who robots.txt lets in, and where it keeps everyone out of.
 *
 * A crawler that matches a named group IGNORES the `*` group entirely. So the
 * AI group is not an addition to the wildcard rules, it is a replacement for
 * them — and the day its disallow list drifts from the wildcard's, every
 * assistant is let into /dashboard while every search engine is kept out.
 */
import { describe, expect, it } from 'vitest';
import robots from './robots';
import { AI_CRAWLERS, AI_PERMISSION_TOKENS } from '@/lib/shared/crawlers';
import { BASE_URL } from '@/lib/shared/seo';

const config = robots();
const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
const wildcard = rules.find((r) => r.userAgent === '*')!;
const named = rules.find((r) => Array.isArray(r.userAgent))!;

describe('robots.txt', () => {
  it('names every invited AI agent and permission token', () => {
    expect(named.userAgent).toEqual(expect.arrayContaining([...AI_CRAWLERS, ...AI_PERMISSION_TOKENS]));
  });

  it('holds the AI agents to exactly the wildcard disallow list', () => {
    expect(named.disallow).toEqual(wildcard.disallow);
    expect(named.allow).toEqual(wildcard.allow);
  });

  it.each(['/dashboard', '/admin', '/checkout/', '/exam-session/', '/api/'])(
    'keeps crawlers out of %s',
    (path) => {
      expect(wildcard.disallow).toContain(path);
    },
  );

  it('points at the sitemap on the canonical origin', () => {
    expect(config.sitemap).toBe(`${BASE_URL}/sitemap.xml`);
  });

  /** Yandex retired `Host:` in 2018 and Google never read it. */
  it('emits no Host directive', () => {
    expect(Object.hasOwn(config, 'host')).toBe(false);
  });
});
