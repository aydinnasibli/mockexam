import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === 'development';

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' required: Clerk injects inline scripts; Next.js hydration uses inline scripts
  `script-src 'self' ${isDev ? "'unsafe-eval' " : ""}'unsafe-inline' https://*.clerk.accounts.dev https://challenges.cloudflare.com`,
  // 'unsafe-inline' required: KaTeX renders inline styles; Clerk UI uses inline styles
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://*.public.blob.vercel-storage.com",
  "media-src 'self' https://*.public.blob.vercel-storage.com",
  // next/font/google self-hosts fonts; data: covers KaTeX font fallbacks
  "font-src 'self' data:",
  // /monitoring is the Sentry tunnel route — events go through our own domain, no sentry.io needed in CSP
  "connect-src 'self' https://*.clerk.accounts.dev https://api.clerk.com wss://*.clerk.accounts.dev /monitoring",
  // Clerk Turnstile (bot protection) renders in an iframe from Cloudflare
  "frame-src https://challenges.cloudflare.com",
  "worker-src blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'images.clerk.dev' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  async headers() {
    return [
      ...(!isDev ? [{
        // Immutable static assets — fingerprinted by Next.js, safe to cache forever.
        // Production only: dev chunks are rebuilt frequently and must not be cached immutably,
        // otherwise Turbopack chunk-reference mismatches cause "module factory not available" errors.
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      }] : []),
      {
        // Public folder assets (images, fonts, og.png, etc.)
        source: '/:file((?!api/).*\\.(?:ico|png|jpg|jpeg|svg|webp|gif|woff2?))',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: csp },
          // Force HTTPS for 2 years; preload list eligible
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Deny access to sensitive device APIs not used by this app
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
    ];
  },
};

const hasSourceMapCreds = !!(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Route Sentry events through /monitoring so they bypass ad-blockers
  // and sentry.io never appears in the connect-src CSP header.
  // withSentryConfig auto-injects tunnel: '/monitoring' into the client bundle.
  tunnelRoute: '/monitoring',

  // Upload dependency source maps too — fixes [native code] frames in stack traces
  widenClientFileUpload: true,

  // Skip source map upload entirely when credentials are absent (e.g. local dev)
  sourcemaps: {
    disable: !hasSourceMapCreds,
    filesToDeleteAfterUpload: ['.next/static/**/*.map'],
  },

  // Tree-shake Sentry debug logging from production bundles (webpack only, not Turbopack)
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },

  silent: !process.env.CI,
});
