'use client';

import { useActionState } from 'react';
import { seedExams, type SeedResult } from '@/lib/actions/admin';
import { Clock } from 'lucide-react';

const initialState: SeedResult = { created: 0, skipped: 0 };

export default function SeedButton() {
  const [state, action, pending] = useActionState(seedExams, initialState);

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 border-2 border-secondary text-secondary font-bold rounded-xl hover:bg-secondary hover:text-white transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {pending ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Yüklənir...
          </>
        ) : (
          <>
            <Clock size={15} />
            Standart imtahanları idxal et
          </>
        )}
      </button>
      {state.error && (
        <p className="text-xs text-red-600 font-semibold mt-2 text-center">{state.error}</p>
      )}
      {!state.error && (state.created > 0 || state.skipped > 0) && (
        <p className="text-xs text-emerald-700 font-semibold mt-2 text-center">
          {state.created} əlavə edildi, {state.skipped} keçildi.
        </p>
      )}
    </form>
  );
}
