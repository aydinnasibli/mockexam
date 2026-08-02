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
  '/analytics(.*)',
  '/api/purchase-status(.*)',
]);

/**
 * Admin routes require both authentication and admin role.
 * Non-admin authenticated users are redirected to /dashboard.
 */
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
  '/testpayment(.*)',
]);

/**
 * Webhook routes are intentionally public — Epoint calls them
 * server-to-server without user session cookies.
 * Security is handled by SHA1 signature verification inside the route.
 */
const isWebhookRoute = createRouteMatcher([
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Never gate webhooks — they're secured by signature, not session
  if (isWebhookRoute(req)) {
    return NextResponse.next();
  }

  if (isAdminRoute(req)) {
    const { userId, sessionClaims, redirectToSignIn } = await auth();
    // This app has no local /sign-in route — auth is Clerk modals plus the
    // hosted Account Portal. redirectToSignIn() resolves the correct URL from
    // the Clerk instance, so signed-out admins land on a real sign-in page
    // instead of a 404.
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }
    if (sessionClaims?.metadata?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // `relay` is excluded: it is the same-origin rewrite to PostHog's ingest.
    // Running Clerk's proxy over analytics beacons adds latency for no benefit,
    // and those requests carry no session to resolve.
    '/((?!_next|relay|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
