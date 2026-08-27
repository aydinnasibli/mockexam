import Link from 'next/link';
import { desc, ilike, or } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { exams as examsTable } from '@/lib/db/schema';
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
/**
 * Neutralise the two LIKE wildcards so a search term is matched literally.
 *
 * Replaces `escapeRegex`, which had to defuse the whole regex metacharacter set
 * — and with it the possibility of a pathological pattern pinning the server.
 * LIKE has exactly two special characters, so there is far less to get wrong.
 */
function escapeLike(str: string) {
  return str.replace(/[\\%_]/g, '\\$&');
}

export default async function AdminExamsPage({ searchParams }: Props) {
  await requireAdminPage();
  const { q = '' } = await searchParams;
  const safeQ = q.slice(0, 100); // cap length too

  /*
   * ILIKE with an escaped pattern, not a regex.
   *
   * The Mongo version built a case-insensitive $regex per field and had to
   * escape the input so a user's `.` or `*` could not become a pattern — and a
   * pathological one could pin the server. `ilike` takes a LIKE pattern, where
   * only `%` and `_` are special, so `escapeLike` is a three-character job and
   * there is no backtracking to weaponise.
   */
  const pattern = safeQ ? `%${escapeLike(safeQ)}%` : null;
  const exams = await db
    .select()
    .from(examsTable)
    .where(pattern
      ? or(
          ilike(examsTable.id, pattern),
          ilike(examsTable.title, pattern),
          ilike(examsTable.type, pattern),
        )
      : undefined)
    .orderBy(desc(examsTable.createdAt));
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
                  <tr key={exam.id}>
                    <td className="num text-xs text-ink-mute">{exam.id}</td>
                    <td className="font-medium text-ink">{exam.title}</td>
                    {/* The five per-type pastels this column used to carry
                        (blue/green/purple/orange/rose) were the only place in
                        the product colour was used decoratively rather than
                        semantically. */}
                    <td className="text-ink-soft"><Tag tone="accent">{exam.tag}</Tag></td>
                    <td className="num text-ink">{Number(exam.price)} ₼</td>
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
                      <ExamRowActions examId={exam.id} isActive={exam.isActive} />
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
