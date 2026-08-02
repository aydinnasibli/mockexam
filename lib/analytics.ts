import 'server-only';

/**
 * Server-side product analytics.
 *
 * Event names are defined here rather than inline at call sites so the funnel
 * stays consistent and typo-proof — a mistyped event name in PostHog is a
 * silently broken funnel that nobody notices for weeks.
 *
 * These are emitted from the server on purpose: purchase and submission events
 * must reflect what actually happened in the database, not what a browser
 * claims. Client-side pageviews and UI interactions are captured separately by
 * posthog-js.
 *
 * Like `lib/observability`, this must never throw and never block a response.
 */

export const ANALYTICS_EVENTS = {
  checkoutStarted:   'checkout_started',
  purchaseCompleted: 'purchase_completed',
  purchaseRefunded:  'purchase_refunded',
  examStarted:       'exam_started',
  examSubmitted:     'exam_submitted',
  writingGraded:     'writing_graded',
} as const;

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

/**
 * Emit a product event for a known user.
 *
 * `distinctId` is passed explicitly because several of these fire from contexts
 * without a request-scoped session — most importantly the Epoint webhook, which
 * is a server-to-server call carrying no user cookie.
 */
export async function trackEvent(
  event: AnalyticsEvent,
  distinctId: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  try {
    const { getPostHog } = await import('@/lib/posthog/server');
    const posthog = await getPostHog();
    posthog.capture({ distinctId, event, properties });
  } catch (err) {
    console.error(`[analytics] failed to record ${event}:`, err);
  }
}
