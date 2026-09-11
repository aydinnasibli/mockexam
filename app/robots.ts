import type { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/shared/seo';

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
 * (GPTBot, ClaudeBot, CCBot, Applebot-Extended, meta-externalagent) and
 * retrieval bots that fetch a page to answer a live question (OAI-SearchBot,
 * Claude-SearchBot, PerplexityBot, the -User agents) are both allowed for that
 * reason, and both are pointed at the same disallow list — an assistant has no
 * more business inside /dashboard than Googlebot does.
 *
 * `Google-Extended` is NOT a crawler. It is a permission token controlling
 * whether content Googlebot already fetched may ground Gemini and AI Overviews.
 * Absent means allowed, so listing it changes nothing today; it is here so the
 * grant is recorded next to the others rather than being invisible.
 */
const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'meta-externalagent',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      { userAgent: AI_AGENTS, allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
