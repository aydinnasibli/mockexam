'use client';

import { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[AdminError]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-5">
          <span className="text-xl">⚠</span>
        </div>
        <h2 className="text-xl font-extrabold text-primary font-headline mb-2">
          Xəta baş verdi
        </h2>
        <p className="text-sm text-on-surface-variant mb-6">
          Admin panelini yükləyərkən problem yarandı.
        </p>
        <button
          onClick={reset}
          className="editorial-gradient text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-sm"
        >
          Yenidən cəhd et
        </button>
      </div>
    </div>
  );
}
