import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import { getResultDetail } from '@/lib/db/results';
import { getExamByIdAdmin } from '@/lib/db/exams';
import { getExamQuestionsForReview } from '@/lib/actions/questions';
import ReviewClient from './ReviewClient';

interface Props {
  params: Promise<{ examId: string; attemptNumber: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { examId, attemptNumber } = await params;
  const exam = await getExamByIdAdmin(examId);
  if (!exam) return {};
  return { title: `${exam.title} — Cəhd #${attemptNumber} İcmalı` };
}

export default async function ReviewPage({ params }: Props) {
  const { examId, attemptNumber: attemptStr } = await params;
  const attemptNumber = parseInt(attemptStr, 10);
  if (isNaN(attemptNumber) || attemptNumber < 1) notFound();

  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  await dbConnect();
  const purchase = await Purchase.findOne({ userId, examId, status: 'COMPLETED' }).lean();
  if (!purchase) redirect(`/exams/${examId}`);

  const [exam, result, questions] = await Promise.all([
    getExamByIdAdmin(examId),
    getResultDetail(userId, examId, attemptNumber),
    getExamQuestionsForReview(examId),
  ]);

  if (!exam || !result) notFound();

  return <ReviewClient exam={exam} questions={questions} result={result} />;
}
