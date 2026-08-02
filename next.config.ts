import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";

const isDev = process.env.NODE_ENV === 'development';

/**
 * PostHog ingest, proxied through our own origin.
 *
 * `/relay/*` is rewritten to PostHog below, so analytics and error reports
 * leave the browser as first-party requests and ad blockers don't silently drop
 * them. Because everything is same-origin, `connect-src 'self'` already covers
 * it and no PostHog host needs to appear in the CSP.
 */
const POSTHOG_PROXY_PATH = '/relay';
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
const posthogAssetHost = posthogHost.includes('eu.')
  ? 'https://eu-assets.i.posthog.com'
  : 'https://us-assets.i.posthog.com';

/**
 * Clerk's Frontend API (FAPI) host.
 *
 * Development instances serve FAPI from `<slug>.accounts.dev`, which the
 * `*.accounts.dev` wildcard below covers. PRODUCTION instances serve it from
 * `clerk.<your-domain>` — a different host than the app itself, so `'self'`
 * does NOT cover it and Clerk would be blocked by CSP after switching to live
 * keys. The publishable key encodes the FAPI host, so derive it rather than
 * hard-coding: `pk_live_<base64 of "clerk.example.com$">`.
 */
function clerkFapiHost(): string | null {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!pk) return null;
  const encoded = pk.replace(/^pk_(test|live)_/, '');
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const host = decoded.replace(/\$$/, '').trim();
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) ? host : null;
  } catch {
    return null;
  }
}

const fapi = clerkFapiHost();

// The CSP is baked into the build, so a production build without the publishable
// key would silently ship a policy that blocks Clerk — visible only as a console
// CSP violation once real users hit it. Fail the build instead.
if (!isDev && !fapi) {
  throw new Error(
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing or malformed at build time. ' +
    "Clerk's Frontend API host is derived from it to build the Content-Security-Policy; " +
    'without it the deployed app would block Clerk and authentication would fail.',
  );
}
const clerkHosts = [
  'https://*.accounts.dev',
  // Clerk's bot / abuse-and-fraud protection hosts, required by Clerk's CSP guide
  'https://*.protect.clerk.com',
  ...(fapi ? [`https://${fapi}`] : []),
].join(' ');

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' required: Clerk injects inline scripts; Next.js hydration uses inline scripts
  `script-src 'self' ${isDev ? "'unsafe-eval' " : ""}'unsafe-inline' ${clerkHosts} https://challenges.cloudflare.com`,
  // 'unsafe-inline' required: KaTeX renders inline styles; Clerk UI uses inline styles
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://*.public.blob.vercel-storage.com",
  "media-src 'self' https://*.public.blob.vercel-storage.com",
  // next/font/google self-hosts fonts; data: covers KaTeX font fallbacks
  "font-src 'self' data:",
  // PostHog is reached through the same-origin /relay rewrite, so 'self' covers
  // both analytics ingest and session-replay uploads — no PostHog host needed.
  `connect-src 'self' ${clerkHosts} https://api.clerk.com wss://*.accounts.dev${fapi ? ` wss://${fapi}` : ''}`,
  // Clerk Turnstile (bot protection) renders in an iframe from Cloudflare
  "frame-src 'self' https://challenges.cloudflare.com https://*.protect.clerk.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Modern equivalent of X-Frame-Options: DENY (kept below for old browsers)
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  images: {
    // Must stay in step with the `img-src` CSP directive below: a host allowed
    // here but not there (or vice versa) yields an image that 404s or is blocked.
    //
    // `port: ''` on every entry — Next.js implies the `**` wildcard for any
    // omitted field, and none of these hosts serve on a non-standard port.
    //
    // `search` is only pinned on the Blob host, whose URLs we author ourselves.
    // The avatar providers below are left unrestricted on purpose: Clerk and
    // Google may append sizing query params to a user's imageUrl, and pinning
    // `search: ''` there would silently stop avatars rendering.
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com', port: '' },
      { protocol: 'https', hostname: 'images.clerk.dev', port: '' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', port: '' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', port: '' },
      // Question diagrams / charts uploaded to Vercel Blob. The admin question
      // editor tells authors to use exactly this host.
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com', port: '', search: '' },
    ],
  },
  // PostHog's ingest endpoints depend on trailing slashes; Next's default
  // trailing-slash redirect would break event capture through the proxy.
  skipTrailingSlashRedirect: true,
  // NOTE: `experimental.serverSourceMaps: true` was measured here and made no
  // difference under Turbopack — same 310 uploaded source-map pairs, same 27
  // "empty sourcemap" warnings from PostHog's uploader. Left off rather than
  // carrying an experimental flag that buys nothing.
  async rewrites() {
    return [
      // Static assets (posthog-js bundle, session-replay recorder, toolbar)
      { source: `${POSTHOG_PROXY_PATH}/static/:path*`, destination: `${posthogAssetHost}/static/:path*` },
      // Everything else: event capture, flag decisions, replay uploads
      { source: `${POSTHOG_PROXY_PATH}/:path*`, destination: `${posthogHost}/:path*` },
    ];
  },
  async headers() {
    return [
      // NOTE: there is deliberately no rule for `/_next/static/:path*`.
      // Next.js already serves those fingerprinted assets with
      // `public, max-age=31536000, immutable` and documents that the value
      // "cannot be overridden" — a custom rule there is ignored and only
      // produces a build warning.
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
          // The legacy XSS auditor is disabled deliberately: `1; mode=block` is
          // deprecated and introduced its own vulnerabilities. CSP above is the
          // real protection. See OWASP Secure Headers guidance.
          { key: 'X-XSS-Protection', value: '0' },
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

/**
 * Source map upload, so production stack traces in PostHog show real file names
 * and line numbers instead of minified gibberish. Requires a personal API key
 * with `error_tracking:write`; without it we ship unchanged and skip the upload,
 * which is what local builds and CI do.
 */
const hasSourceMapCreds = !!(
  process.env.POSTHOG_PERSONAL_API_KEY &&
  process.env.POSTHOG_PROJECT_ID
);

export default hasSourceMapCreds
  ? withPostHogConfig(nextConfig, {
      // Personal API key (phx_…), NOT the phc_ project key. Needs the
      // error_tracking:write scope. https://eu.posthog.com/settings/user-api-keys
      personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY!,
      // The numeric project id, from the URL: eu.posthog.com/project/<id>/...
      // (the older `envId` option is a deprecated alias for this same value).
      projectId: process.env.POSTHOG_PROJECT_ID!,
      host: posthogHost,
      sourcemaps: {
        enabled: true,
        // Strip the .map files after upload so they are never served publicly.
        deleteAfterUpload: true,
      },
    })
  : nextConfig;
