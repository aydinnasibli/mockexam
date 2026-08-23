import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getExamByIdAdmin } from '@/lib/db/exams';
import { getSessionQuestionMeta } from '@/lib/actions/questions';
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

  /*
   * Only the paper's SKELETON is serialised into the page: ids, modules, order,
   * block grouping. Passages, stems and options are fetched module by module by
   * the player as each section's clock opens (`getModuleQuestionContent`), so a
   * candidate sitting in Listening cannot read the Reading texts out of the RSC
   * payload — which is exactly what shipping the whole paper here allowed.
   */
  const questionMeta = await getSessionQuestionMeta(id);

  return <ExamSessionClient exam={exam} questionMeta={questionMeta} />;
}
