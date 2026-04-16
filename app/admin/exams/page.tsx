import Link from 'next/link';
import { BookOpen, Plus } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import ExamModel from '@/lib/models/Exam';
import ExamSearch from './ExamSearch';
import ExamRowActions from './ExamRowActions';

export const metadata = { title: 'İmtahanlar — Admin' };

const TYPE_COLORS: Record<string, string> = {
  sat:   'bg-blue-100 text-blue-700',
  ielts: 'bg-green-100 text-green-700',
  toefl: 'bg-purple-100 text-purple-700',
  dim:   'bg-orange-100 text-orange-700',
  gre:   'bg-rose-100 text-rose-700',
};

interface Props {
  searchParams: Promise<{ q?: string }>;
}

/** Escape all regex special characters so user input is treated as a literal string. */
function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function AdminExamsPage({ searchParams }: Props) {
  const { q = '' } = await searchParams;
  const safeQ = q.slice(0, 100); // cap length too

  await dbConnect();
  const query = safeQ
    ? {
        $or: [
          { examId: { $regex: escapeRegex(safeQ), $options: 'i' } },
          { title: { $regex: escapeRegex(safeQ), $options: 'i' } },
          { type: { $regex: escapeRegex(safeQ), $options: 'i' } },
        ],
      }
    : {};
  const exams = await ExamModel.find(query).sort({ createdAt: -1 }).lean();
  const activeCount = exams.filter((e) => e.isActive).length;

  return (
    <div>
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">
            İmtahanlar
          </h1>
          <p className="text-on-surface-variant font-medium text-sm">
            {exams.length} imtahan · {activeCount} aktiv
          </p>
        </div>
        <Link
          href="/admin/exams/new"
          className="editorial-gradient text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity text-sm"
        >
          <Plus size={16} /> Yeni İmtahan
        </Link>
      </header>

      {/* Search (client component — updates URL) */}
      <ExamSearch defaultValue={q} />

      <div className="bg-white rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
        {exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <BookOpen className="text-outline mb-3" size={40} />
            <p className="text-sm font-semibold text-primary mb-1">
              {q ? 'Nəticə tapılmadı' : 'İmtahan yoxdur'}
            </p>
            {!q && (
              <Link href="/admin/exams/new" className="mt-3 text-sm font-bold text-secondary hover:underline">
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
                {exams.map((exam) => (
                  <tr key={exam.examId} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">{exam.examId}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-primary">{exam.title}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          TYPE_COLORS[exam.type] ?? 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {exam.tag}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">{exam.price} ₼</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{exam.durationMinutes} dəq</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{exam.totalQuestions}</td>
                    <td className="px-6 py-4 text-sm">
                      {exam.isActive ? (
                        <span className="text-emerald-700 font-bold">Aktiv</span>
                      ) : (
                        <span className="text-on-surface-variant">Deaktiv</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {/* Client component handles toggle + delete */}
                      <ExamRowActions examId={exam.examId} isActive={exam.isActive} />
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
