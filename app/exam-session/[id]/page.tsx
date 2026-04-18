import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getExamById } from '@/lib/db/exams';
import { getExamQuestionsForSession } from '@/lib/actions/questions';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamSessionClient from './ExamSessionClient';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const exam = await getExamById(id);
  if (!exam) return {};
  return { title: `${exam.title} — İmtahan` };
}

export default async function ExamSessionPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();

  if (!userId) redirect(`/checkout/${id}`);

  await dbConnect();
  const [exam, purchase] = await Promise.all([
    getExamById(id),
    Purchase.findOne({ userId, examId: id, status: 'COMPLETED' }).lean(),
  ]);

  if (!exam) notFound();
  if (!purchase) redirect(`/checkout/${id}`);

  const questions = await getExamQuestionsForSession(id);

  return <ExamSessionClient exam={exam} questions={questions} />;
}
