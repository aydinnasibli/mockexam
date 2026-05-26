'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backgroundColor: '#f0f2f5' }}>
          <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Xəta baş verdi
            </h1>
            <p style={{ fontSize: '0.875rem', marginBottom: '2rem', color: '#6b7280' }}>
              Gözlənilməz bir problem yarandı. Zəhmət olmasa yenidən cəhd edin.
            </p>
            <button
              onClick={reset}
              style={{ background: '#1d4ed8', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
            >
              Yenidən cəhd et
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
