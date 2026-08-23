'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { resyncExamTotals, type ResyncResult } from '@/lib/actions/admin';
import Button from '@/components/ui/Button';

const initialState: ResyncResult = { updated: 0 };

/**
 * Backfills the advertised question count and duration of every exam from its
 * real bank. New writes keep themselves in step; this is for the exams that
 * predate that. See `syncExamTotals`.
 */
export default function ResyncTotalsButton() {
  const [state, action, pending] = useActionState(resyncExamTotals, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.updated > 0) toast.success(`${state.updated} imtahanın statistikası yeniləndi.`);
  }, [state]);

  return (
    <form action={action}>
      <Button variant="ghost" size="sm" className="w-full justify-center disabled:opacity-50"
        type="submit"
        disabled={pending}
      >
        {pending ? (
          <>
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Yenilənir...
          </>
        ) : (
          <>
            <RefreshCw size={14} />
            Sual/vaxt statistikasını yenilə
          </>
        )}
      </Button>
    </form>
  );
}
