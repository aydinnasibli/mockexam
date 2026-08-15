'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { seedExams, type SeedResult } from '@/lib/actions/admin';
import { Clock } from 'lucide-react';
import Button from '@/components/ui/Button';

const initialState: SeedResult = { created: 0, skipped: 0 };

export default function SeedButton() {
  const [state, action, pending] = useActionState(seedExams, initialState);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    } else if (state.created > 0 || state.skipped > 0) {
      toast.success(`${state.created} əlavə edildi, ${state.skipped} keçildi.`);
    }
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
            Yüklənir...
          </>
        ) : (
          <>
            <Clock size={14} />
            Standart imtahanları idxal et
          </>
        )}
      </Button>
    </form>
  );
}
