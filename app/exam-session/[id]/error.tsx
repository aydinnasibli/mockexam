'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ExamSessionError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[ExamSessionError]', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#f0f2f5] flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">⚠</span>
        </div>
        <h1 className="text-xl font-extrabold text-primary font-headline mb-2">
          İmtahan oturumu xətası
        </h1>
        <p className="text-sm text-on-surface-variant mb-2">
          İmtahan yüklənərkən problem yarandı.
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-7">
          Əgər imtahanı artıq başlamışdınızsa, nəticəniz saxlanılmamış ola bilər.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="editorial-gradient text-white px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            Yenidən cəhd et
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl font-bold text-sm text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors"
          >
            Panelə qayıt
          </Link>
        </div>
      </div>
    </main>
  );
}
