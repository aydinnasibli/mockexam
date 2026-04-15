'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  BookOpen, Search, RefreshCw,
} from 'lucide-react';

interface Exam {
  _id: string;
  examId: string;
  title: string;
  type: string;
  tag: string;
  price: number;
  durationMinutes: number;
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  sat: 'bg-blue-100 text-blue-700',
  ielts: 'bg-green-100 text-green-700',
  toefl: 'bg-purple-100 text-purple-700',
  dim: 'bg-orange-100 text-orange-700',
  gre: 'bg-rose-100 text-rose-700',
};

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/exams')
      .then((r) => r.json())
      .then((d) => setExams(d.exams ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (examId: string) => {
    if (!confirm(`"${examId}" imtahanını silmək istəyirsiniz?`)) return;
    setDeletingId(examId);
    try {
      await fetch(`/api/admin/exams/${examId}`, { method: 'DELETE' });
      setExams((prev) => prev.filter((e) => e.examId !== examId));
    } catch {
      alert('Silmə zamanı xəta baş verdi.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (exam: Exam) => {
    setTogglingId(exam.examId);
    try {
      const res = await fetch(`/api/admin/exams/${exam.examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !exam.isActive }),
      });
      const data = await res.json();
      setExams((prev) =>
        prev.map((e) => (e.examId === exam.examId ? { ...e, isActive: data.exam.isActive } : e))
      );
    } catch {
      alert('Yeniləmə zamanı xəta baş verdi.');
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = exams.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.examId.toLowerCase().includes(search.toLowerCase()) ||
    e.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">
            İmtahanlar
          </h1>
          <p className="text-on-surface-variant font-medium text-sm">
            {exams.length} imtahan · {exams.filter((e) => e.isActive).length} aktiv
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
            title="Yenilə"
          >
            <RefreshCw size={18} />
          </button>
          <Link
            href="/admin/exams/new"
            className="editorial-gradient text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity text-sm"
          >
            <Plus size={16} />
            Yeni İmtahan
          </Link>
        </div>
      </header>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          type="text"
          placeholder="İmtahan axtar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-outline-variant/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 text-on-surface placeholder:text-on-surface-variant"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <BookOpen className="text-outline mb-3" size={40} />
            <p className="text-sm font-semibold text-primary mb-1">
              {search ? 'Nəticə tapılmadı' : 'İmtahan yoxdur'}
            </p>
            {!search && (
              <Link
                href="/admin/exams/new"
                className="mt-3 text-sm font-bold text-secondary hover:underline"
              >
                İlk imtahanı əlavə et →
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest border-b border-outline-variant/20">
                  <th className="px-6 py-4 font-black">ID</th>
                  <th className="px-6 py-4 font-black">Başlıq</th>
                  <th className="px-6 py-4 font-black">Növ</th>
                  <th className="px-6 py-4 font-black">Qiymət</th>
                  <th className="px-6 py-4 font-black">Müddət</th>
                  <th className="px-6 py-4 font-black">Suallar</th>
                  <th className="px-6 py-4 font-black">Status</th>
                  <th className="px-6 py-4 font-black">Əməliyyat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((exam) => (
                  <tr
                    key={exam.examId}
                    className="hover:bg-surface-container-low/60 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">
                      {exam.examId}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-primary text-sm">{exam.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          TYPE_COLORS[exam.type] ?? 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {exam.tag}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">
                      {exam.price} ₼
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {exam.durationMinutes} dəq
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {exam.totalQuestions}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(exam)}
                        disabled={togglingId === exam.examId}
                        className="flex items-center gap-1.5 text-xs font-bold transition-colors disabled:opacity-50"
                        title={exam.isActive ? 'Deaktiv et' : 'Aktiv et'}
                      >
                        {exam.isActive ? (
                          <>
                            <ToggleRight size={18} className="text-emerald-600" />
                            <span className="text-emerald-700">Aktiv</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={18} className="text-on-surface-variant" />
                            <span className="text-on-surface-variant">Deaktiv</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/exams/${exam.examId}/edit`}
                          className="p-2 rounded-lg hover:bg-secondary/10 text-secondary transition-colors"
                          title="Düzəliş et"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(exam.examId)}
                          disabled={deletingId === exam.examId}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                          title="Sil"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
