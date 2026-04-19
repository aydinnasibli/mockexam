import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' required: Clerk injects inline scripts; Next.js hydration uses inline scripts
  "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
  // 'unsafe-inline' required: KaTeX renders inline styles; Clerk UI uses inline styles
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
  // next/font/google self-hosts fonts; data: covers KaTeX font fallbacks
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.accounts.dev https://api.clerk.com wss://*.clerk.accounts.dev",
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
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
