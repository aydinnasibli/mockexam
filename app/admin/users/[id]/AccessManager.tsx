'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { grantExamAccess, revokeExamAccess } from '@/lib/actions/admin-users';

interface GrantableExam {
  examId: string;
  title: string;
  price: number;
  isActive: boolean;
}

export function GrantAccessForm({ userId, exams }: { userId: string; exams: GrantableExam[] }) {
  const [selected, setSelected] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (exams.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant font-medium">
        Bu istifadəçinin bütün imtahanlara girişi var.
      </p>
    );
  }

  function handleGrant() {
    if (!selected) return;
    startTransition(async () => {
      const result = await grantExamAccess(userId, selected);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Giriş verildi — istifadəçi imtahana ödənişsiz başlaya bilər.');
        setSelected('');
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={pending}
        className="flex-1 px-4 py-3 rounded-xl border border-outline-variant/40 bg-white text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-secondary/40"
      >
        <option value="">İmtahan seçin...</option>
        {exams.map((e) => (
          <option key={e.examId} value={e.examId}>
            {e.title} — {e.price} AZN{e.isActive ? '' : ' (deaktiv)'}
          </option>
        ))}
      </select>
      <button
        onClick={handleGrant}
        disabled={!selected || pending}
        className="editorial-gradient text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
        Ödənişsiz Giriş Ver
      </button>
    </div>
  );
}

export function RevokeAccessButton({ userId, examId }: { userId: string; examId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeExamAccess(userId, examId);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Giriş geri alındı.');
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleRevoke}
      disabled={pending}
      title="Admin qrantını sil"
      className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      Geri al
    </button>
  );
}
