import { ImageResponse } from 'next/og';

/*
 * The large icon, 512×512, served at `/icon1`.
 *
 * Three consumers the 32px `icon` and the 180px `apple-icon` could not serve:
 *
 * - The Organization `logo` in the root layout's JSON-LD. Google sets a
 *   112×112 floor for that image, and the logo used to be the 32px favicon.
 * - Search-result favicons. Google reads every `rel="icon"` and recommends one
 *   larger than 48×48; with this file Next emits a 512px candidate beside the
 *   32px one instead of leaving only the apple-touch-icon to qualify.
 * - The web app manifest, where 512 is the size launchers scale from.
 *
 * `icon1` rather than `generateImageMetadata` inside `icon.tsx`: that would
 * move the existing icon to `/icon/<id>` and break the URL the manifest and
 * any cached `<link>` already point at. Numbered files are Next's documented
 * way to add a size without touching the ones that exist.
 *
 * Same mark and proportions as `apple-icon.tsx`, scaled.
 */
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function LargeIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a1a',
          borderRadius: 102,
        }}
      >
        <svg viewBox="0 0 200 180" width="340" height="306">
          <polygon points="100,105 15,30 40,30 100,82 160,30 185,30" fill="#fafaf6" />
          <polygon points="100,150 15,75 40,75 100,127 160,75 185,75" fill="#fafaf6" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
