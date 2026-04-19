import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getExamById } from '@/lib/db/exams';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import CheckoutClient from './CheckoutClient';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const exam = await getExamById(id);
  if (!exam) return {};
  return {
    title: `${exam.title} — Ödəniş`,
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();

  if (userId) {
    await dbConnect();
    const existing = await Purchase.findOne({ userId, examId: id, status: 'COMPLETED' }).lean();
    if (existing) redirect('/dashboard');
  }

  const exam = await getExamById(id);
  if (!exam) notFound();

  return <CheckoutClient exam={exam} />;
}
