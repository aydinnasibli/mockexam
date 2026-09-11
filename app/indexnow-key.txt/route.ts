import { indexNowKey } from '@/lib/infra/indexnow';

/**
 * The IndexNow ownership file.
 *
 * The protocol proves you control the domain by having you serve the same key
 * you submit from a URL on that host. The default convention is
 * `https://host/<key>.txt`, which would mean a route whose PATH is a secret —
 * impossible to express as a static segment and ugly as a dynamic one, since
 * `app/[key]/route.ts` would sit in front of every top-level page.
 *
 * The spec's `keyLocation` field exists for exactly this: the file may live
 * anywhere on the host as long as submissions say where. `submitToIndexNow`
 * sends this path, so the two stay in step.
 *
 * The key is not a secret. It is published here by design — it identifies the
 * submitter and proves domain control, and it grants nothing beyond the right
 * to tell search engines that these URLs changed.
 */
/*
 * Request-time, deliberately.
 *
 * Reading `process.env` is not a request-time API, so a route handler doing it
 * is PRERENDERED — this file was `force-static` and got baked at build time,
 * when the key happened to be unset, and then served a permanent 404 no matter
 * what the environment said afterwards. A 404 here is not cosmetic: it fails
 * ownership verification, and every submission comes back 403.
 *
 * The cost is one tiny dynamic response, hit only when a search engine checks
 * ownership. Worth it to remove a failure mode whose symptom appears somewhere
 * else entirely.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  const key = indexNowKey();

  // 404 rather than an empty 200: an empty key file fails verification with a
  // confusing 403 at submission time, whereas a missing one is self-explanatory.
  if (!key) {
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response(key, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
