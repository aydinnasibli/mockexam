import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import ExamModel from '@/lib/models/Exam';
import { getExamQuestions } from '@/lib/actions/questions';
import QuestionManager from './QuestionManager';
import AdminPageHeader from '../../../PageHeader';
import { requireAdminPage } from '@/lib/admin';

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

  await dbConnect();
  const exam = await ExamModel.findOne({ examId: id }).lean();
  if (!exam) notFound();

  const questions = await getExamQuestions(id);

  const modules = exam.modules.map((m, i) => ({
    index: i,
    name: m.name,
    type: m.type,
    questionCount: m.questions,
  }));

  return (
    <div>
      <div className="mb-7 flex items-center gap-2.5 text-[13px] font-medium">
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
