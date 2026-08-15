'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { grantExamAccess, revokeExamAccess } from '@/lib/actions/admin-users';
import Button from '@/components/ui/Button';

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
      <p className="m-0 text-sm text-ink-soft">
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
    <div className="flex flex-col gap-3 sm:flex-row">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={pending}
        aria-label="İmtahan seçin"
        className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-3.5 flex-1"
      >
        <option value="">İmtahan seçin...</option>
        {exams.map((e) => (
          <option key={e.examId} value={e.examId}>
            {e.title} — {e.price} AZN{e.isActive ? '' : ' (deaktiv)'}
          </option>
        ))}
      </select>
      <Button size="sm" className="shrink-0 justify-center disabled:cursor-not-allowed disabled:opacity-50"
        onClick={handleGrant}
        disabled={!selected || pending}
      >
        {pending && <Loader2 size={15} className="animate-spin" />}
        Ödənişsiz giriş ver
      </Button>
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
      className="ml-auto flex cursor-pointer items-center gap-1.5 text-note font-medium text-error transition-opacity hover:opacity-75 disabled:opacity-50"
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      Geri al
    </button>
  );
}
