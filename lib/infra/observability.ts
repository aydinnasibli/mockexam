import 'server-only';

/**
 * Vendor-neutral error reporting for server code.
 *
 * Every server action, route handler and library reports through these two
 * functions rather than importing an SDK directly. That kept the Sentry →
 * PostHog migration to one file, and means the next change is one file too.
 *
 * Two rules hold here:
 *   1. Reporting must never throw. An observability outage cannot be allowed to
 *      break a checkout or lose a student's exam submission, so everything is
 *      wrapped and failures are swallowed after a console fallback.
 *   2. Reporting must never block the response meaningfully. Events are queued
 *      by posthog-node and flushed in the background.
 *
 * For client components use `posthog.captureException` via `usePostHog()` —
 * this module is server-only.
 */

type Level = 'error' | 'warning' | 'info';

export interface CaptureContext {
  /** Short machine-readable label, e.g. { action: 'saveExamResult' }. */
  tags?: Record<string, string | undefined>;
  /** Any additional structured detail worth attaching. */
  extra?: Record<string, unknown>;
}

/** Flattens tags/extra into the property bag PostHog stores on the event. */
function toProperties(context?: CaptureContext, level?: Level): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (level) props.level = level;
  for (const [k, v] of Object.entries(context?.tags ?? {})) {
    if (v !== undefined) props[`tag_${k}`] = v;
  }
  for (const [k, v] of Object.entries(context?.extra ?? {})) {
    props[k] = v;
  }
  return props;
}

/**
 * posthog-node's concrete client implements `captureException`, but the
 * `IPostHog` interface that `getPostHog()` is typed as does not declare it.
 * Rather than cast blindly, we narrow structurally and check at runtime, so a
 * future SDK change degrades to a plain event instead of throwing.
 */
type ExceptionCapable = {
  captureException(
    error: unknown,
    distinctId?: string,
    additionalProperties?: Record<string, unknown>,
  ): void;
};

function canCaptureException(client: unknown): client is ExceptionCapable {
  return typeof (client as ExceptionCapable)?.captureException === 'function';
}

/**
 * Report a thrown error. Safe to call from anywhere on the server.
 */
export async function captureException(error: unknown, context?: CaptureContext): Promise<void> {
  try {
    const { getPostHog } = await import('@/lib/posthog/server');
    const posthog = await getPostHog();
    const properties = toProperties(context, 'error');

    if (canCaptureException(posthog)) {
      posthog.captureException(error, undefined, properties);
      return;
    }

    // Fallback: still record it, just without PostHog's exception grouping.
    const err = error instanceof Error ? error : new Error(String(error));
    posthog.capture({
      distinctId: 'server',
      event: 'server_exception',
      properties: { message: err.message, stack: err.stack, name: err.name, ...properties },
    });
  } catch (reportingError) {
    // Never let reporting failures surface to the caller.
    console.error('[observability] failed to report exception:', reportingError);
    console.error('[observability] original error:', error);
  }
}

/**
 * Report a noteworthy condition that is not itself a thrown error — a missing
 * configuration value, a payment amount mismatch, an overtime submission.
 */
export async function captureMessage(
  message: string,
  context?: CaptureContext & { level?: Level },
): Promise<void> {
  try {
    const { getPostHog } = await import('@/lib/posthog/server');
    const posthog = await getPostHog();
    posthog.capture({
      distinctId: 'server',
      event: 'server_message',
      properties: { message, ...toProperties(context, context?.level ?? 'info') },
    });
  } catch (reportingError) {
    console.error('[observability] failed to report message:', message, reportingError);
  }
}
