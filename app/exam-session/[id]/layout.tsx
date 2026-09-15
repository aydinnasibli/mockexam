import { auth } from '@clerk/nextjs/server';

/*
 * Sends signed-out visitors to sign-in before anything streams. `loading.tsx`
 * wraps the page below in a Suspense boundary, so the page's own redirect can
 * only arrive as a meta refresh after a 200; a layout sits outside that
 * boundary and still gets to answer with a real 307. Sign-in returns here, and
 * the page's access check then chooses between the exam and checkout.
 *
 * The page repeats the check — a layout does not always re-render when the
 * page under it does.
 */
export default async function ExamSessionLayout({ children }: { children: React.ReactNode }) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  return children;
}
