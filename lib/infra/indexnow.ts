import 'server-only';
import { BASE_URL } from '@/lib/shared/seo';
import { captureMessage } from '@/lib/infra/observability';

/**
 * IndexNow — push URL changes to Bing, Yandex and Seznam the moment they happen.
 *
 * Worth building for this site specifically. Google decides its own crawl
 * schedule and ignores nudges from anyone; Bing accepts them, and ChatGPT's
 * search grounding runs on Bing's index. So on a brand-new domain that nothing
 * links to, this is the one lever that reliably shortens "published" → "an
 * assistant can see it" from weeks to minutes.
 *
 * One POST is broadcast to every participating engine, so there is nothing
 * per-engine to configure.
 */
const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** Spec: 8–128 chars, a–z A–Z 0–9 and dashes. */
const KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

/** Spec: at most 10,000 URLs per request. Far above anything we submit. */
const MAX_URLS = 10_000;

/**
 * The submission key, or null when the feature is off or misconfigured.
 *
 * A malformed key is treated as absent rather than sent: the endpoint would
 * answer 403 and the URLs would be silently dropped, which looks identical to
 * working. Failing closed makes the misconfiguration visible in logs instead.
 *
 * The same variable drives the ownership file that proves we control the host:
 * `scripts/write-indexnow-key.mjs` writes it into `public/` at build time. One
 * source, so what is served and what is submitted cannot disagree.
 */
export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) return null;
  if (!KEY_PATTERN.test(key)) {
    void captureMessage('INDEXNOW_KEY is set but malformed; submissions disabled', {
      level: 'warning',
    });
    return null;
  }
  return key;
}

/**
 * Submit changed URLs. Never throws, never blocks a response.
 *
 * Call it inside `after()` from a server action so the work happens once the
 * response is already on its way — an admin saving an exam should not wait on
 * Microsoft, and should certainly not see an error if Bing is having a bad day.
 *
 * URLs are filtered to this host before sending. A submission containing a URL
 * from another origin is answered 422 and the WHOLE batch is rejected, so one
 * stray localhost entry during development would quietly discard the real ones.
 */
export async function submitToIndexNow(urls: readonly string[]): Promise<void> {
  const key = indexNowKey();
  if (!key) return;

  let host: string;
  try {
    host = new URL(BASE_URL).host;
  } catch {
    return;
  }

  // Nothing to prove ownership of on a local host, and the endpoint would
  // reject it anyway.
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return;

  const urlList = [...new Set(urls)]
    .filter((url) => {
      try {
        return new URL(url).host === host;
      } catch {
        return false;
      }
    })
    .slice(0, MAX_URLS);

  if (urlList.length === 0) return;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        /*
         * The protocol's own recommendation: `{key}.txt` at the root of the
         * host, which authorises every URL on it. (A key file under a path can
         * only submit URLs beneath that path.) Because the filename IS the key,
         * the location is unguessable, which is what keeps someone else from
         * submitting URLs for this domain — so it is never linked or logged,
         * and `public/*.txt` stays out of this public repository.
         *
         * Kept in step with the filename in `scripts/write-indexnow-key.mjs`.
         */
        keyLocation: `${BASE_URL}/${key}.txt`,
        urlList,
      }),
    });

    /*
     * 200 accepted, 202 accepted with the key still to be verified — both fine.
     * Anything else is worth knowing about, because a rejected batch is
     * invisible otherwise: 403 means the key file is not reachable, 422 means a
     * URL did not belong to the host, 429 means we are submitting too often.
     */
    if (res.status !== 200 && res.status !== 202) {
      void captureMessage(`IndexNow submission rejected (${res.status})`, {
        level: 'warning',
        extra: { status: res.status, count: urlList.length, sample: urlList[0] },
      });
    }
  } catch (err) {
    // A search-engine ping is never worth surfacing to a user or failing a
    // mutation over.
    void captureMessage('IndexNow submission failed', {
      level: 'warning',
      extra: { error: err instanceof Error ? err.message : String(err) },
    });
  }
}
