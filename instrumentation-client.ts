import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 1% of sessions replayed; 100% when an error occurs
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],

  // tunnel is auto-injected by withSentryConfig tunnelRoute — do not set manually here
});

// Required by @sentry/nextjs to instrument App Router navigation spans
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
