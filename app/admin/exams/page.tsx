import Link from 'next/link';
import dbConnect from '@/lib/infra/mongodb';
import ExamModel from '@/lib/models/Exam';
import ExamSearch from './ExamSearch';
import ExamRowActions from './ExamRowActions';
import AdminPageHeader from '../PageHeader';
import { requireAdminPage } from '@/lib/infra/admin';
import Button, { ButtonArrow } from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';

export const metadata = { title: 'İmtahanlar — Admin' };

interface Props {
  searchParams: Promise<{ q?: string }>;
}

/** Escape all regex special characters so user input is treated as a literal string. */
function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function AdminExamsPage({ searchParams }: Props) {
  await requireAdminPage();
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
      <AdminPageHeader
        eyebrow="Kataloq"
        title="İmtahanlar."
        meta={`${exams.length} imtahan · ${activeCount} aktiv`}
        action={
          <>
            <Button variant="ghost" size="sm" href="/admin/exams/import">
              JSON yüklə
            </Button>
            <Button size="sm" href="/admin/exams/new">
              Yeni imtahan <ButtonArrow />
            </Button>
          </>
        }
      />

      {/* Search (client component — updates URL) */}
      <ExamSearch defaultValue={q} />

      {/* overflow-hidden so the table head's fill is clipped by the panel's
          14px corners rather than squaring them off. */}
      <div className="rounded-panel border border-rule bg-surface overflow-hidden">
        {exams.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <p className="m-0 text-base font-light tracking-tight text-ink">
              {q ? 'Nəticə tapılmadı' : 'İmtahan yoxdur'}
            </p>
            {!q && (
              <Link href="/admin/exams/new" className="mt-4 inline-flex border-b border-ink-faint pb-0.5 text-note font-medium text-ink transition-colors hover:border-ink">
                İlk imtahanı əlavə et →
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Başlıq</th>
                  <th>Növ</th>
                  <th>Qiymət</th>
                  <th>Müddət</th>
                  <th>Suallar</th>
                  <th>Status</th>
                  <th>Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.examId}>
                    <td className="num text-xs text-ink-mute">{exam.examId}</td>
                    <td className="font-medium text-ink">{exam.title}</td>
                    {/* The five per-type pastels this column used to carry
                        (blue/green/purple/orange/rose) were the only place in
                        the product colour was used decoratively rather than
                        semantically. */}
                    <td className="text-ink-soft"><Tag tone="accent">{exam.tag}</Tag></td>
                    <td className="num text-ink">{exam.price} ₼</td>
                    <td className="num text-ink">{exam.durationMinutes} dəq</td>
                    <td className="num text-ink">{exam.totalQuestions}</td>
                    <td className="text-ink-soft">
                      {exam.isActive ? (
                        <span className="flex items-center gap-2 text-note text-ok">
                          <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden /> Aktiv
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-note text-ink-mute">
                          <span className="h-1.5 w-1.5 rounded-full border border-ink-mute" aria-hidden /> Deaktiv
                        </span>
                      )}
                    </td>
                    <td className="text-ink-soft">
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
