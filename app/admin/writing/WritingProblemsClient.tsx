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
      <div className="panel px-8 py-16 text-center">
        <CheckCircle2 className="mx-auto mb-4 text-ok" size={32} />
        <p className="m-0 mb-2 text-xl font-light tracking-tight text-ink">Problem yoxdur</p>
        <p className="m-0 text-sm text-ink-soft">Bütün yazı tapşırıqları qiymətləndirilib.</p>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="panel-head flex-wrap">
        <p className="m-0 text-[15px] font-medium tracking-[-0.01em] text-ink">
          {problems.length} nəticədə qiymətləndirilməmiş yazı var
        </p>
        <button
          onClick={regradeAll}
          disabled={allPending}
          className="btn-primary btn-sm cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={13} className={allPending ? 'animate-spin' : ''} />
          {allPending ? 'Emal olunur…' : 'Hamısını qiymətləndir'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="app-table">
          <thead>
            <tr>
              <th>İmtahan</th>
              <th>İstifadəçi</th>
              <th>Cəhd</th>
              <th>Gözləyən esse</th>
              <th>Tarix</th>
              <th className="text-right">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p) => (
              <tr key={p.resultId}>
                <td>
                  <span className="font-medium text-ink">{p.examTitle}</span>
                  <span className="tag ml-2">{p.examTag}</span>
                </td>
                <td className="num text-xs text-ink-mute!">…{p.userId.slice(-10)}</td>
                <td className="num">{p.attemptNumber}</td>
                <td className="whitespace-nowrap">
                  <span className="num">{p.pendingCount}</span> esse
                  {p.wordCounts.length > 0 && <span className="text-xs text-ink-mute"> ({p.wordCounts.join(', ')} söz)</span>}
                </td>
                <td className="num text-xs whitespace-nowrap text-ink-mute!">{p.completedAtLabel}</td>
                <td className="text-right">
                  <button
                    onClick={() => regradeOne(p.resultId)}
                    disabled={busyId === p.resultId || allPending}
                    className="btn-ghost btn-sm cursor-pointer whitespace-nowrap text-xs! disabled:opacity-50"
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
