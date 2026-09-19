/**
 * Write the IndexNow ownership file into `public/` before the build.
 *
 *   node --env-file-if-exists=.env.local scripts/write-indexnow-key.mjs
 *
 * IndexNow proves domain control by having you serve the submission key from a
 * URL on the host you are submitting. The protocol asks for `{key}.txt` at the
 * ROOT of the site, and says only you and the search engines should know the
 * key and where it lives — the unguessable filename IS the secret. Serving it
 * from a guessable path instead lets anyone submit URLs for this domain: worth
 * nothing to them, and it costs us our rate limit and Bing's trust in the feed.
 *
 * That rules out both of the obvious implementations:
 *   - a route handler, because the path is the secret, and `app/[key]/route.ts`
 *     would sit in front of every top-level page to serve one file;
 *   - a committed `public/<key>.txt`, because this repository is public, so the
 *     key and its location would be published along with it.
 *
 * So the file is generated here, at build time, from `INDEXNOW_KEY` — the same
 * variable `lib/infra/indexnow.ts` reads when it submits. One source, so the
 * file being served and the key being submitted cannot drift apart.
 *
 * `next dev` does not run this. Nothing is lost: `BASE_URL` is localhost in
 * development, and `submitToIndexNow` refuses to submit a local host anyway.
 */
import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Spec: 8–128 characters of a–z, A–Z, 0–9 and dashes.
 *
 * Mirrors `KEY_PATTERN` in `lib/infra/indexnow.ts`, as does the `${key}.txt`
 * naming below and the `keyLocation` that `submitToIndexNow` sends. If those
 * two disagree the endpoint answers 403 and silently drops every submission,
 * so change them together.
 */
const KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

/**
 * Delete key files written by an earlier build, except `keep`.
 *
 * Only ever matters locally — every Vercel build starts from a clean checkout —
 * but `public/*.txt` is gitignored, so after rotating the key nothing else would
 * ever remove the old file, and it would go on proving ownership for a key we
 * no longer submit.
 *
 * A generated key file is recognised by its contents matching its own filename,
 * which is the entire shape of the format. An unrelated `.txt` dropped into
 * `public/` does not match and is left alone.
 */
async function removeStaleKeyFiles(keep) {
  let entries;
  try {
    entries = await readdir(publicDir);
  } catch {
    return;
  }

  for (const name of entries) {
    if (name === keep || !name.endsWith('.txt')) continue;

    const stem = name.slice(0, -'.txt'.length);
    if (!KEY_PATTERN.test(stem)) continue;

    const path = join(publicDir, name);
    try {
      if ((await readFile(path, 'utf8')).trim() === stem) await unlink(path);
    } catch {
      // Unreadable or already gone; either way it is not ours to clean up.
    }
  }
}

const key = process.env.INDEXNOW_KEY?.trim();

/*
 * A missing or malformed key is not fatal. `indexNowKey()` disables submissions
 * on exactly these two checks, so the build ships a working site with one SEO
 * nicety switched off — better than failing a deploy over it. Malformed is said
 * loudly, though: the alternative symptom is a 403 from a search engine that
 * nobody is watching.
 */
if (!key) {
  await removeStaleKeyFiles(null);
  console.log('IndexNow: INDEXNOW_KEY is unset — no key file written, submissions disabled.');
} else if (!KEY_PATTERN.test(key)) {
  await removeStaleKeyFiles(null);
  console.warn(
    'IndexNow: INDEXNOW_KEY is set but malformed (8–128 characters of [A-Za-z0-9-]) — ' +
      'no key file written, submissions disabled.',
  );
} else {
  const name = `${key}.txt`;
  await removeStaleKeyFiles(name);
  // No trailing newline: the file lists the key and nothing else. The name is
  // kept out of the build log on purpose — it is the key.
  await writeFile(join(publicDir, name), key, 'utf8');
  console.log('IndexNow: ownership key file written to public/.');
}
