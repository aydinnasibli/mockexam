'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { adminRegradeResult, adminRegradeAllPending, type WritingEvalProblem } from '@/lib/actions/results';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';

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
      // `remaining` is non-zero when the sweep hit its time budget; say so, or
      // the admin reads a short run as "there was nothing left to do".
      toast.success(
        `${r.processed} nəticə emal edildi · ${r.graded} esse qiymətləndirildi · ${r.stillPending} hələ gözləyir.`
        + (r.remaining > 0 ? ` ${r.remaining} nəticə vaxt limitinə görə qaldı — yenidən işə salın.` : ''),
      );
      router.refresh();
    });
  }

  if (problems.length === 0) {
    return (
      <div className="rounded-panel border border-rule bg-surface px-8 py-16 text-center">
        <CheckCircle2 className="mx-auto mb-4 text-ok" size={32} />
        <p className="m-0 mb-2 text-xl font-light tracking-tight text-ink">Problem yoxdur</p>
        <p className="m-0 text-sm text-ink-soft">Bütün yazı tapşırıqları qiymətləndirilib.</p>
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-rule bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5 flex-wrap">
        <p className="m-0 text-body font-medium tracking-[-0.01em] text-ink">
          {problems.length} nəticədə qiymətləndirilməmiş yazı var
        </p>
        <Button size="sm" className="disabled:opacity-60"
          onClick={regradeAll}
          disabled={allPending}
        >
          <RefreshCw size={13} className={allPending ? 'animate-spin' : ''} />
          {allPending ? 'Emal olunur…' : 'Hamısını qiymətləndir'}
        </Button>
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
                <td className="text-ink-soft">
                  <span className="font-medium text-ink">{p.examTitle}</span>
                  <Tag className="ml-2">{p.examTag}</Tag>
                </td>
                <td className="num text-xs text-ink-mute">…{p.userId.slice(-10)}</td>
                <td className="num text-ink">{p.attemptNumber}</td>
                <td className="whitespace-nowrap text-ink-soft">
                  <span className="num text-ink">{p.pendingCount}</span> esse
                  {p.wordCounts.length > 0 && <span className="text-xs text-ink-mute"> ({p.wordCounts.join(', ')} söz)</span>}
                </td>
                <td className="num text-xs whitespace-nowrap text-ink-mute">{p.completedAtLabel}</td>
                <td className="text-right text-ink-soft">
                  <Button variant="ghost" size="xs" className="whitespace-nowrap disabled:opacity-50"
                    onClick={() => regradeOne(p.resultId)}
                    disabled={busyId === p.resultId || allPending}
                  >
                    <RefreshCw size={12} className={busyId === p.resultId ? 'animate-spin' : ''} />
                    {busyId === p.resultId ? 'Qiymətləndirilir…' : 'Yenidən qiymətləndir'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
