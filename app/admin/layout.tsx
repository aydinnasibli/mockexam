import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/admin';
import AdminSidebar from './AdminSidebar';

export const metadata = {
  title: 'Admin Panel — Məşqçi',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!isAdmin(userId)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-surface flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
