'use client';

import { useEffect } from 'react';
// The singleton, not usePostHog(): global-error replaces the root layout, so
// the PostHogProvider that supplies the hook's context is not mounted here.
import posthog from 'posthog-js';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    /*
      global-error replaces the ROOT layout, so none of the app's CSS is
      guaranteed to be present — which is why this file uses inline styles at
      all. The values are the design tokens' literals rather than the leftover
      pre-token palette (`#f0f2f5`, `#1d4ed8`) this carried, so the one screen
      that appears at the worst possible moment stops being the one that looks
      least like the product. See app/exam-session/[id]/error.tsx.
    */
    <html lang="az">
      <body style={{ margin: 0, background: '#FAF8F3', color: '#1A1A1A' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
            <p style={{ fontSize: '0.75rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8A857A', margin: '0 0 1.25rem' }}>
              Xəta
            </p>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 300, letterSpacing: '-0.03em', margin: '0 0 0.75rem' }}>
              Xəta baş verdi
            </h1>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 2rem', color: '#5C574E' }}>
              Gözlənilməz bir problem yarandı. Zəhmət olmasa yenidən cəhd edin.
            </p>
            <button
              onClick={reset}
              style={{ background: '#1A1A1A', color: '#FAF8F3', padding: '0.75rem 1.5rem', borderRadius: '999px', fontWeight: 500, fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
            >
              Yenidən cəhd et
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
