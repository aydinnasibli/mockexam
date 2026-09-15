import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk's request handler only: it resolves the session so `auth()` works in
 * pages, layouts, route handlers and server actions. It gates nothing.
 *
 * Authorization lives in each resource instead — `auth()` + `redirectToSignIn`
 * in the page, `requireAdminPage` / `requireAdminAction` for admin surfaces,
 * signature verification in the webhook routes. Path matching here can diverge
 * from how Next.js actually routes a request (and server actions are resolved
 * by id, not by URL), so a check that lived only here was never a real boundary.
 */
export default clerkMiddleware();

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
