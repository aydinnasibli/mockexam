// Client-safe media URL validation — no server imports.
//
// Question images are rendered with next/image, which HARD-FAILS (throws, taking
// out the surrounding render) when given a host that is not listed in
// `images.remotePatterns`. During a timed exam that would be a crashed page, so
// the URL is validated at the write boundary instead: bad values never reach the
// database in the first place.
//
// Keep this list in step with `images.remotePatterns` and the `img-src` CSP
// directive in next.config.ts.

/** Remote hosts a question image may be served from. */
export const ALLOWED_IMAGE_HOST_SUFFIX = '.public.blob.vercel-storage.com';

export const ALLOWED_IMAGE_HOSTS_LABEL = '*.public.blob.vercel-storage.com';

/**
 * True for values that next/image can render safely:
 *   • '' / undefined  — no image
 *   • '/path.png'     — same-origin, always allowed
 *   • https://<x>.public.blob.vercel-storage.com/... — the configured remote host
 *
 * Protocol-relative ('//host/x') and non-https URLs are rejected, as are hosts
 * that merely *contain* the suffix (e.g. 'evil.com/.public.blob...').
 */
export function isAllowedImageUrl(value: string | undefined | null): boolean {
  if (!value) return true;
  const url = value.trim();
  if (!url) return true;

  // Same-origin absolute path. Reject '//' — that is protocol-relative, not a path.
  if (url.startsWith('/')) return !url.startsWith('//');

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;

  return parsed.hostname.endsWith(ALLOWED_IMAGE_HOST_SUFFIX);
}

/** Error message shown when validation fails. */
export const INVALID_IMAGE_URL_MESSAGE =
  `Şəkil URL-i yalnız ${ALLOWED_IMAGE_HOSTS_LABEL} domenində və ya saytın öz domenində (/ ilə başlayan yol) ola bilər.`;
