import { Skeleton, SkeletonScreen } from '@/components/ui/Skeleton';

/**
 * Skeleton for the dashboard content area. The sidebar/shell live in the
 * layout and stay interactive while this streams — so this only mirrors the
 * page content: dark welcome banner, stat row, and card grid.
 *
 * Nested dashboard routes with a different shape (settings, analytics) carry
 * their own `loading.tsx` rather than inheriting this one.
 */
export default function DashboardLoading() {
  return (
    <SkeletonScreen className="flex-1" label="Kabinet yüklənir">

      {/* Welcome banner */}
      <div className="shrink-0 bg-ink px-8 py-10">
        <Skeleton tone="ink" className="mb-5 h-3 w-40 rounded" />
        <Skeleton tone="ink" className="mb-3 h-10 w-72 max-w-full rounded" />
        <Skeleton tone="ink" className="h-4 w-56 max-w-full rounded" />
      </div>

      <div className="space-y-8 px-8 py-8">
        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-rule bg-surface p-5">
              <Skeleton className="mb-3 h-3 w-20 rounded bg-surface-3" />
              <Skeleton className="h-7 w-14 rounded bg-surface-3" />
            </div>
          ))}
        </div>

        {/* Content cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-rule bg-surface p-6">
              <Skeleton className="mb-6 h-4 w-32 rounded bg-surface-3" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-xl bg-surface-3" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-3/4 rounded bg-surface-3" />
                      <Skeleton className="h-3 w-1/2 rounded bg-surface-3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
