import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Routes that require an authenticated session.
 * Unauthenticated requests are automatically redirected to sign-in.
 */
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/exam-session(.*)',
  '/checkout(.*)',
  '/api/purchases(.*)',
  '/api/checkout(.*)',
]);

/**
 * Webhook routes are intentionally public — LemonSqueezy calls them
 * server-to-server without user session cookies.
 * Security is handled by HMAC-SHA256 signature verification inside the route.
 */
const isWebhookRoute = createRouteMatcher([
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Never gate webhooks — they're secured by signature, not session
  if (isWebhookRoute(req)) {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
