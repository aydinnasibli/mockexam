import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import DashboardSidebar from './DashboardSidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="bg-[#f0f2f5] text-on-surface min-h-screen">
      <DashboardSidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
