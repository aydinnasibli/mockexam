/**
 * VALIDATION — the canonical-host guard and the redirect table.
 *
 * Both fail silently when wrong. A non-www BASE_URL ships every canonical
 * pointing at a redirect; a trailing-slash rule that is a no-op leaves every
 * page answering 200 at two URLs; one that is too greedy bounces PostHog's
 * ingest or the payment webhook, and nothing reports either.
 *
 * Redirects are compiled with `buildCustomRoute`, the function `next build`
 * uses to write the routes manifest the host actually executes. It is a Next
 * internal: if an upgrade moves it, this file fails at import, which is the
 * cue to find where it went rather than to delete the test.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCustomRoute } from 'next/dist/lib/build-custom-route';
import type { Redirect } from 'next/dist/lib/load-custom-routes';
import { shouldServeStreamingMetadata } from 'next/dist/server/lib/streaming-metadata';

/** Any well-formed key: the config only derives the CSP's Clerk host from it. */
const CLERK_KEY = `pk_test_${Buffer.from('clerk.example.com$').toString('base64')}`;

/** Fresh import, so `BASE_URL` and the guard re-read the stubbed environment. */
async function loadConfig(env: { VERCEL_ENV?: string; NEXT_PUBLIC_APP_URL?: string } = {}) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', CLERK_KEY);
  vi.stubEnv('VERCEL_ENV', env.VERCEL_ENV);
  vi.stubEnv('NEXT_PUBLIC_APP_URL', env.NEXT_PUBLIC_APP_URL);
  return (await import('./next.config')).default;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('canonical origin guard', () => {
  it.each([
    ['the apex', 'https://testcentre.az'],
    ['a vercel.app host', 'https://mockexam.vercel.app'],
    ['plain http', 'http://www.testcentre.az'],
  ])('fails a production build pointed at %s', async (_label, url) => {
    await expect(loadConfig({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_URL: url }))
      .rejects.toThrow(/must use https:\/\/www\.testcentre\.az/);
  });

  it.each([
    ['unset', undefined],
    ['the canonical origin', 'https://www.testcentre.az'],
    ['the canonical origin with a trailing slash', 'https://www.testcentre.az/'],
  ])('passes a production build with the override %s', async (_label, url) => {
    await expect(loadConfig({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_URL: url }))
      .resolves.toBeDefined();
  });

  it('lets a preview deployment point at itself', async () => {
    await expect(
      loadConfig({ VERCEL_ENV: 'preview', NEXT_PUBLIC_APP_URL: 'https://mockexam-git-x.vercel.app' }),
    ).resolves.toBeDefined();
  });
});

describe('redirects', () => {
  /** The rule Next would apply to `url`, first match wins — or null. */
  async function redirectFor(url: string): Promise<Redirect | null> {
    const rules = (await (await loadConfig()).redirects!()) as Redirect[];
    const { pathname, searchParams } = new URL(url, 'https://www.testcentre.az');

    for (const rule of rules) {
      const { regex } = buildCustomRoute('redirect', rule, ['/_next']);
      if (!new RegExp(regex).test(pathname)) continue;
      const hasMatches = (rule.has ?? []).every(
        (cond) => cond.type === 'query' && searchParams.get(cond.key) === cond.value,
      );
      if (hasMatches) return rule;
    }
    return null;
  }

  const TRAILING_SLASH = '/:path';

  it.each([
    '/exams/',
    '/exams/ielts/',
    '/exams/ielts/ielts-academic-1/',
    '/about/',
    '/sitemap.xml/',
    '/robots.txt/',
  ])('308s %s to its slashless form', async (path) => {
    const rule = await redirectFor(path);
    expect(rule?.destination).toBe(TRAILING_SLASH);
    expect(rule && 'permanent' in rule && rule.permanent).toBe(true);
  });

  it.each([
    ['the home page', '/'],
    ['a slashless page', '/exams/ielts'],
    ['PostHog capture', '/relay/e/'],
    ['PostHog flags', '/relay/flags/'],
    ['the proxy root', '/relay/'],
    ['the payment webhook', '/api/webhooks/epoint/'],
    ['the user-sync webhook', '/api/webhooks/clerk/'],
    ['the cron job', '/api/cron/sweep/'],
    ['a build asset', '/_next/static/chunks/'],
  ])('leaves %s alone', async (_label, path) => {
    expect(await redirectFor(path)).toBeNull();
  });

  /*
   * The exclusions are prefix matches on a whole SEGMENT. A page that merely
   * starts with the same letters is still a page and still gets redirected.
   */
  it('does not over-exclude segments that only share a prefix', async () => {
    expect((await redirectFor('/relayed/'))?.destination).toBe(TRAILING_SLASH);
    expect((await redirectFor('/apiary/'))?.destination).toBe(TRAILING_SLASH);
  });

  it('sends a legacy filter URL straight to its hub, not via the slash rule', async () => {
    expect((await redirectFor('/exams/?type=sat'))?.destination).toBe('/exams/sat');
    expect((await redirectFor('/exams?type=general_english'))?.destination).toBe('/exams/english-level');
  });
});

/**
 * Which user agents get metadata in `<head>` rather than streamed into `<body>`.
 *
 * Decided by Next's own `shouldServeStreamingMetadata`, fed the option the way
 * the server feeds it — `loadConfig` stores a RegExp option as its `.source`
 * string. `false` means blocking metadata in `<head>`.
 */
describe('htmlLimitedBots', () => {
  async function streamsTo(userAgent: string): Promise<boolean> {
    const bots = (await loadConfig()).htmlLimitedBots;
    return shouldServeStreamingMetadata(userAgent, bots?.source);
  }

  it.each([
    ['GPTBot', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)'],
    ['OAI-SearchBot', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot'],
    ['ChatGPT-User', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot'],
    ['ClaudeBot', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'],
    ['PerplexityBot', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)'],
  ])('gives %s metadata in <head>', async (_label, ua) => {
    expect(await streamsTo(ua)).toBe(false);
  });

  /**
   * The option REPLACES Next's default list. These are from that default; if
   * they start streaming, the default was dropped rather than extended, and
   * every link preview on WhatsApp and Facebook loses its title and image.
   */
  it.each([
    ['Bingbot', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'],
    ['facebookexternalhit', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'],
    ['WhatsApp', 'WhatsApp/2.23.20.0'],
    ['Twitterbot', 'Twitterbot/1.0'],
  ])('still gives %s metadata in <head>', async (_label, ua) => {
    expect(await streamsTo(ua)).toBe(false);
  });

  it.each([
    ['a desktop browser', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'],
    // Googlebot renders JavaScript, which is why Next streams to it by design.
    ['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
  ])('leaves %s on streaming metadata', async (_label, ua) => {
    expect(await streamsTo(ua)).toBe(true);
  });
});
