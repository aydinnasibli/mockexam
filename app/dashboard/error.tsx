'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[DashboardError]', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-5">
          <span className="text-xl">⚠</span>
        </div>
        <h2 className="text-xl font-extrabold text-primary font-headline mb-2">
          Xəta baş verdi
        </h2>
        <p className="text-sm text-on-surface-variant mb-6">
          Səhifə yüklənərkən problem yarandı.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="editorial-gradient text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            Yenidən cəhd et
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant bg-white border border-outline-variant/40 hover:bg-surface-container transition-colors"
          >
            Panelə qayıt
          </Link>
        </div>
      </div>
    </div>
  );
}
