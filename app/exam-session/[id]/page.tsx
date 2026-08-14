import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getExamByIdAdmin } from '@/lib/db/exams';
import { getExamQuestionsForSession } from '@/lib/actions/questions';
import { hasExamAccess } from '@/lib/db/entitlements';
import ExamSessionClient from './ExamSessionClient';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const exam = await getExamByIdAdmin(id);
  if (!exam) return {};
  return { title: `${exam.title} — İmtahan` };
}

export default async function ExamSessionPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();

  if (!userId) redirect(`/checkout/${id}`);

  const [exam, hasAccess] = await Promise.all([
    getExamByIdAdmin(id),
    hasExamAccess(userId, id),
  ]);

  if (!exam) notFound();
  if (!hasAccess) redirect(`/checkout/${id}`);

  const questions = await getExamQuestionsForSession(id);

  return <ExamSessionClient exam={exam} questions={questions} />;
}
