import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getExamByIdAdmin } from '@/lib/db/exams';
import { getSessionQuestionMeta } from '@/lib/actions/questions';
import { hasExamAccess } from '@/lib/db/entitlements';
import ExamSessionClient from './ExamSessionClient';

interface Props {
  params: Promise<{ id: string }>;
}

/** A live exam session is private to one candidate. See `app/dashboard/layout.tsx`. */
const PRIVATE = { robots: { index: false, follow: false } };

export async function generateMetadata({ params }: Props) {
  // `getExamByIdAdmin` reads inactive papers too, and `loading.tsx` means this
  // page streams — so without this check a signed-out visitor would receive the
  // title of any paper whose id they guessed, before the redirect below lands.
  const { userId } = await auth();
  if (!userId) return PRIVATE;

  const { id } = await params;
  const exam = await getExamByIdAdmin(id);
  if (!exam) return PRIVATE;
  return { ...PRIVATE, title: `${exam.title} — İmtahan` };
}

export default async function ExamSessionPage({ params }: Props) {
  const { id } = await params;
  const { userId, redirectToSignIn } = await auth();

  if (!userId) return redirectToSignIn();

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
