'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pencil, Trash2, ToggleLeft, ToggleRight, BookOpen } from 'lucide-react';
import { deleteExam, toggleExamActive } from '@/lib/actions/admin';

interface Props {
  examId: string;
  isActive: boolean;
}

export default function ExamRowActions({ examId, isActive }: Props) {
  const [toggling, startToggle] = useTransition();
  const [deleting, startDelete] = useTransition();

  const handleToggle = () => {
    startToggle(async () => {
      const result = await toggleExamActive(examId, !isActive);
      if (result.error) toast.error(result.error);
      else toast.success(isActive ? 'Deaktiv edildi' : 'Aktiv edildi');
    });
  };

  const handleDelete = () => {
    // Deletion now takes the question bank with it (it used to orphan it), so
    // the prompt says so rather than letting the admin find out afterwards.
    if (!confirm(`"${examId}" imtahanı və onun bütün sualları silinəcək. Davam edilsin?`)) return;
    startDelete(async () => {
      const result = await deleteExam(examId);
      if (result.error) toast.error(result.error);
      else toast.success('İmtahan silindi');
    });
  };

  /* Neutral ink icons on a soft hover, rather than one colour per action
     (emerald / navy / red). The only coloured one left is delete, because that
     is the only one that is actually destructive. */
  const iconButton =
    'flex cursor-pointer items-center rounded-btn p-2 text-ink-mute transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40';

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={iconButton}
        title={isActive ? 'Deaktiv et' : 'Aktiv et'}
      >
        {isActive
          ? <ToggleRight size={17} className="text-ok" />
          : <ToggleLeft size={17} />}
      </button>
      <Link href={`/admin/exams/${examId}/questions`} className={iconButton} title="Suallar">
        <BookOpen size={15} />
      </Link>
      <Link href={`/admin/exams/${examId}/edit`} className={iconButton} title="Düzəliş et">
        <Pencil size={15} />
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className={`${iconButton} hover:text-error!`}
        title="Sil"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
