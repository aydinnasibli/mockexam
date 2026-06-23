import { ImageResponse } from 'next/og';

export const alt = 'Testcentre — Azərbaycanın akademik imtahan hazırlığı platforması';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a1a',
          gap: 32,
        }}
      >
        <svg viewBox="0 0 200 180" width="100" height="90">
          <polygon points="100,105 15,30 40,30 100,82 160,30 185,30" fill="#fafaf6" />
          <polygon points="100,150 15,75 40,75 100,127 160,75 185,75" fill="#fafaf6" />
        </svg>
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 600,
            color: '#fafaf6',
            letterSpacing: '-0.03em',
          }}
        >
          Testcentre
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            color: '#a0a09a',
            maxWidth: 700,
            textAlign: 'center',
          }}
        >
          Azərbaycanın akademik imtahan hazırlığı platforması
        </div>
      </div>
    ),
    { ...size }
  );
}
