// Plain data, no imports: `next.config.ts` loads this file by RELATIVE path,
// where the `@/` alias does not exist.

/**
 * AI agents this site invites, by the user-agent token each vendor documents.
 *
 * Two lists read it, for two different reasons:
 *
 * - `app/robots.ts` names them in their own group, so the decision to be
 *   crawled and quoted by assistants is written down rather than inherited by
 *   accident from `*`. See the docblock there for the decision itself.
 *
 * - `next.config.ts` adds them to `htmlLimitedBots`. None of these agents runs
 *   JavaScript; they read the HTML as sent. Next's default list of such bots
 *   covers Bingbot, Twitterbot, facebookexternalhit and friends but names no AI
 *   crawler at all, so on any page rendered at request time Next would STREAM
 *   the `<title>`, description and canonical into `<body>` after the shell —
 *   for exactly the agents robots.txt goes out of its way to invite. Every
 *   public page prerenders today, where the tags land in `<head>` either way;
 *   this is what keeps it that way the day one of them stops.
 *
 * Only agents that actually FETCH pages belong here. Permission tokens such as
 * `Google-Extended` are not user agents — nothing ever sends them — and live in
 * `AI_PERMISSION_TOKENS` instead.
 */
export const AI_CRAWLERS = [
  // OpenAI: training, the ChatGPT search index, and live fetches for a user.
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Anthropic: the same three roles.
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  // Meta AI: training, and live fetches for a user.
  'meta-externalagent',
  'Meta-ExternalFetcher',
  // Common Crawl, which a large share of open models are trained on.
  'CCBot',
  'Amazonbot',
  'DuckAssistBot',
  'MistralAI-User',
] as const;

/**
 * robots.txt tokens that grant a USE rather than a crawl.
 *
 * `Google-Extended` decides whether pages Googlebot already fetched may ground
 * Gemini and AI Overviews; `Applebot-Extended` does the same for Apple
 * Intelligence. Absent means allowed, so listing them changes nothing today —
 * they are here so the grant is recorded next to the crawlers it pairs with.
 */
export const AI_PERMISSION_TOKENS = ['Google-Extended', 'Applebot-Extended'] as const;
