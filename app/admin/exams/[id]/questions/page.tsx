import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import ExamModel from '@/lib/models/Exam';
import { getExamQuestions } from '@/lib/actions/questions';
import QuestionManager from './QuestionManager';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `${id} — Suallar — Admin` };
}

export default async function ExamQuestionsPage({ params }: Props) {
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
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/exams"
          className="flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
        >
          <ChevronLeft size={16} /> İmtahanlara qayıt
        </Link>
        <span className="text-on-surface-variant">/</span>
        <Link
          href={`/admin/exams/${id}/edit`}
          className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
        >
          {exam.title}
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">
          Sual Bankı
        </h1>
        <p className="text-on-surface-variant text-sm font-mono">{id}</p>
      </div>

      <QuestionManager examId={id} modules={modules} initialQuestions={questions} />
    </div>
  );
}
