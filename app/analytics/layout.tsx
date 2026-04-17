import DashboardSidebar from '@/app/dashboard/DashboardSidebar';

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#f0f2f5] text-on-surface min-h-screen">
      <DashboardSidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
