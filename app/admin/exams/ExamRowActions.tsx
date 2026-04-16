'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { deleteExam, toggleExamActive } from '@/lib/actions/admin';

interface Props {
  examId: string;
  isActive: boolean;
}

export default function ExamRowActions({ examId, isActive }: Props) {
  const [toggling, startToggle] = useTransition();
  const [deleting, startDelete] = useTransition();

  const handleToggle = () => {
    startToggle(() => toggleExamActive(examId, !isActive));
  };

  const handleDelete = () => {
    if (!confirm(`"${examId}" imtahanını silmək istəyirsiniz?`)) return;
    startDelete(() => deleteExam(examId));
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleToggle}
        disabled={toggling}
        className="flex items-center gap-1 p-2 rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-50"
        title={isActive ? 'Deaktiv et' : 'Aktiv et'}
      >
        {isActive
          ? <ToggleRight size={18} className="text-emerald-600" />
          : <ToggleLeft size={18} className="text-on-surface-variant" />}
      </button>
      <Link
        href={`/admin/exams/${examId}/edit`}
        className="p-2 rounded-lg hover:bg-secondary/10 text-secondary transition-colors"
        title="Düzəliş et"
      >
        <Pencil size={15} />
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
        title="Sil"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
