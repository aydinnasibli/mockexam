'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { adminRegradeResult, adminRegradeAllPending, type WritingEvalProblem } from '@/lib/actions/results';

export default function WritingProblemsClient({ problems }: { problems: WritingEvalProblem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [allPending, startAll] = useTransition();

  function regradeOne(id: string) {
    setBusyId(id);
    void adminRegradeResult(id).then((r) => {
      setBusyId(null);
      if ('error' in r) { toast.error(r.error); return; }
      if (r.graded > 0 && r.pending === 0) toast.success('Qiymətləndirildi.');
      else if (r.pending > 0) toast(`${r.pending} esse hələ qiymətləndirilə bilmədi (AI problemi davam edir).`);
      else toast('Qiymətləndiriləcək esse tapılmadı.');
      router.refresh();
    });
  }

  function regradeAll() {
    startAll(async () => {
      const r = await adminRegradeAllPending();
      if ('error' in r) { toast.error(r.error); return; }
      toast.success(`${r.processed} nəticə emal edildi · ${r.graded} esse qiymətləndirildi · ${r.stillPending} hələ gözləyir.`);
      router.refresh();
    });
  }

  if (problems.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-outline-variant/40 p-16 flex flex-col items-center text-center shadow-sm">
        <CheckCircle2 className="text-emerald-500 mb-3" size={40} />
        <p className="text-sm font-bold text-primary mb-1">Problem yoxdur</p>
        <p className="text-sm text-on-surface-variant">Bütün yazı tapşırıqları qiymətləndirilib.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
        <p className="text-sm font-bold text-primary">{problems.length} nəticədə qiymətləndirilməmiş yazı var</p>
        <button
          onClick={regradeAll}
          disabled={allPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <RefreshCw size={14} className={allPending ? 'animate-spin' : ''} />
          {allPending ? 'Emal olunur…' : 'Hamısını qiymətləndir'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-widest border-b border-outline-variant/20">
              <th className="px-5 py-4 font-black">İmtahan</th>
              <th className="px-5 py-4 font-black">İstifadəçi</th>
              <th className="px-5 py-4 font-black">Cəhd</th>
              <th className="px-5 py-4 font-black">Gözləyən esse</th>
              <th className="px-5 py-4 font-black">Tarix</th>
              <th className="px-5 py-4 font-black text-right">Əməliyyat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {problems.map((p) => (
              <tr key={p.resultId} className="hover:bg-surface-container-low/60 transition-colors">
                <td className="px-5 py-3">
                  <span className="text-sm font-semibold text-primary">{p.examTitle}</span>
                  <span className="ml-2 text-xs font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">{p.examTag}</span>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">…{p.userId.slice(-10)}</td>
                <td className="px-5 py-3 text-sm text-on-surface-variant">#{p.attemptNumber}</td>
                <td className="px-5 py-3 text-sm text-on-surface-variant">
                  {p.pendingCount} esse
                  {p.wordCounts.length > 0 && <span className="text-xs text-on-surface-variant/70"> ({p.wordCounts.join(', ')} söz)</span>}
                </td>
                <td className="px-5 py-3 text-xs text-on-surface-variant whitespace-nowrap">{p.completedAtLabel}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => regradeOne(p.resultId)}
                    disabled={busyId === p.resultId || allPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant/60 rounded-lg text-xs font-bold text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={busyId === p.resultId ? 'animate-spin' : ''} />
                    {busyId === p.resultId ? 'Qiymətləndirilir…' : 'Yenidən qiymətləndir'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
