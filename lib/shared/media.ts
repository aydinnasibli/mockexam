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
export function isAllowedMediaUrl(value: string | undefined | null): boolean {
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

/**
 * @deprecated Prefer `isAllowedMediaUrl`. Kept as a named alias so existing
 * call sites read naturally where the field really is an image.
 */
export const isAllowedImageUrl = isAllowedMediaUrl;

/**
 * Message for a rejected audio URL.
 *
 * `audioUrl` went unchecked while `imageUrl` was guarded on all three write
 * paths — the same host rule, applied to the field with the worse failure. A
 * bad image is a broken picture; a bad audio host saves cleanly and is then
 * blocked by CSP `media-src` at runtime, which surfaces as a Play button that
 * never sounds inside a live, timed, single-play listening module.
 */
export const INVALID_AUDIO_URL_MESSAGE =
  `Audio URL yalnız ${ALLOWED_IMAGE_HOSTS_LABEL} hostundan ola bilər (və ya sayt daxili /path).`;
