'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#f0f2f5] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">⚠</span>
        </div>
        <h1 className="text-2xl font-extrabold text-primary font-headline mb-3">
          Xəta baş verdi
        </h1>
        <p className="text-sm text-on-surface-variant mb-8">
          Gözlənilməz bir problem yarandı. Zəhmət olmasa yenidən cəhd edin.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="editorial-gradient text-white px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            Yenidən cəhd et
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl font-bold text-sm text-on-surface-variant bg-white border border-outline-variant/40 hover:bg-surface-container transition-colors"
          >
            Ana səhifə
          </Link>
        </div>
      </div>
    </main>
  );
}
