import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { exams as examsTable } from '@/lib/db/schema';
import { getExamQuestions } from '@/lib/actions/questions';
import QuestionManager from './QuestionManager';
import AdminPageHeader from '../../../PageHeader';
import { requireAdminPage } from '@/lib/infra/admin';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `${id} — Suallar — Admin` };
}

export default async function ExamQuestionsPage({ params }: Props) {
  await requireAdminPage();
  const { id } = await params;

  const [exam] = await db
    .select()
    .from(examsTable)
    .where(eq(examsTable.id, id))
    .limit(1);
  if (!exam) notFound();

  const questions = await getExamQuestions(id);

  const modules = exam.modules.map((m, i) => ({
    index: i,
    name: m.name,
    type: m.type,
    questionCount: m.questions,
    // The form needs this to know whether `blockId` is meaningful: only a
    // block-layout module groups its questions onto one screen.
    layout: m.layout,
  }));

  return (
    <div>
      <div className="mb-7 flex items-center gap-2.5 text-note font-medium">
        <Link
          href="/admin/exams"
          className="inline-flex items-center gap-1.5 text-ink-soft transition-colors hover:text-ink"
        >
          <ChevronLeft size={15} /> İmtahanlara qayıt
        </Link>
        <span className="text-ink-faint" aria-hidden>/</span>
        <Link
          href={`/admin/exams/${id}/edit`}
          className="truncate text-ink-soft transition-colors hover:text-ink"
        >
          {exam.title}
        </Link>
      </div>

      <AdminPageHeader eyebrow="Kataloq" title="Sual bankı." meta={id} />

      <QuestionManager examId={id} modules={modules} initialQuestions={questions} />
    </div>
  );
}
