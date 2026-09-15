import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getExamById } from '@/lib/db/exams';
import { hasExamAccess } from '@/lib/db/entitlements';
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
  const { userId, redirectToSignIn } = await auth();

  // A purchase is recorded against an account, so collect one before the page.
  if (!userId) return redirectToSignIn();
  if (await hasExamAccess(userId, id)) redirect('/dashboard');

  const exam = await getExamById(id);
  if (!exam) notFound();

  return <CheckoutClient exam={exam} />;
}
