import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          borderRadius: 36,
        }}
      >
        <svg viewBox="0 0 200 180" width="120" height="108">
          <polygon points="100,105 15,30 40,30 100,82 160,30 185,30" fill="#fafaf6" />
          <polygon points="100,150 15,75 40,75 100,127 160,75 185,75" fill="#fafaf6" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
