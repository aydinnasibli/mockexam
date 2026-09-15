import type { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/shared/seo';
import { AI_CRAWLERS, AI_PERMISSION_TOKENS } from '@/lib/shared/crawlers';

/**
 * Paths that are never worth a crawl, for any agent.
 *
 * Everything here is either behind auth, a payment callback, or a same-origin
 * proxy. `/relay/` is the PostHog ingest rewrite — nothing crawlable behind it.
 */
const DISALLOW = [
  '/dashboard',
  '/admin',
  '/checkout/',
  '/exam-session/',
  '/api/',
  '/testpayment',
  '/relay/',
];

/**
 * AI crawlers, listed explicitly and allowed.
 *
 * They were already permitted by the `*` rule below, but only by accident: a
 * wildcard says nothing about whether anyone decided. Naming them makes the
 * decision legible and, more usefully, makes reversing it for one agent a
 * one-line change instead of a rethink.
 *
 * The decision itself: this site WANTS to be quoted by assistants. It sells
 * exam preparation in Azerbaijani, a language with very little authoritative
 * material online, and an answer engine that cites us reaches candidates who
 * would never have found the domain through a blue link. Training-corpus bots
 * (GPTBot, ClaudeBot, CCBot, meta-externalagent) and retrieval bots that fetch
 * a page to answer a live question (OAI-SearchBot, Claude-SearchBot,
 * PerplexityBot, the -User agents) are both allowed for that reason, and both
 * are pointed at the same disallow list — an assistant has no more business
 * inside /dashboard than Googlebot does.
 *
 * The list itself lives in `lib/shared/crawlers.ts`, because `next.config.ts`
 * reads it too — see there for why.
 */
const AI_AGENTS = [...AI_CRAWLERS, ...AI_PERMISSION_TOKENS];

/*
 * No `host`. It emitted a `Host:` line, which was a Yandex-only directive and
 * which Yandex itself retired in 2018 in favour of reading redirects — Google
 * never supported it. The apex→www 308 in front of this app is what actually
 * names the preferred host, and the canonical tags repeat it on every page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      { userAgent: AI_AGENTS, allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
