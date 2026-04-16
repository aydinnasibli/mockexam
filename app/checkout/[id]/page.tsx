import { notFound } from 'next/navigation';
import { getExamById } from '@/lib/db/exams';
import CheckoutClient from './CheckoutClient';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const exam = await getExamById(id);
  if (!exam) return {};
  return { title: `${exam.title} — Ödəniş` };
}

export default async function CheckoutPage({ params }: Props) {
  const { id } = await params;
  const exam = await getExamById(id);
  if (!exam) notFound();
  return <CheckoutClient exam={exam} />;
}
