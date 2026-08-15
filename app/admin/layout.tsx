import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { checkRole } from '@/lib/infra/admin';
import AdminShell from './AdminShell';

export const metadata = {
  title: 'Admin Panel',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) return redirectToSignIn();
  if (!(await checkRole('admin'))) redirect('/dashboard');

  return (
    <AdminShell>{children}</AdminShell>
  );
}
