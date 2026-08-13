import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { checkRole } from '@/lib/admin';
import AdminSidebar from './AdminSidebar';

export const metadata = {
  title: 'Admin Panel',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) return redirectToSignIn();
  if (!(await checkRole('admin'))) redirect('/dashboard');

  return (
    /* Bone ground and a 60px-narrower rail, so the admin shell is dimensionally
       the same object as the kabinet shell rather than a near-miss. */
    <div className="flex min-h-screen bg-bg">
      <AdminSidebar />
      <main className="ml-60 min-h-screen flex-1 px-8 py-8">
        {children}
      </main>
    </div>
  );
}
