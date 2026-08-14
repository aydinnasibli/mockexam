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

      {/* Masthead */}
      <div className="shrink-0 bg-ink px-8 py-11">
        <Skeleton tone="ink" className="mb-6 h-3 w-40 rounded" />
        <Skeleton tone="ink" className="mb-3.5 h-10 w-72 max-w-full rounded" />
        <Skeleton tone="ink" className="h-4 w-56 max-w-full rounded" />
      </div>

      <div className="px-8 py-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-6">
            {/* Next step */}
            <div className="panel flex items-center justify-between gap-4 px-5 py-4.5">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-44 rounded bg-surface-3" />
                <Skeleton className="h-3.5 w-64 max-w-full rounded bg-surface-3" />
              </div>
              <Skeleton className="h-9 w-28 shrink-0 rounded-full bg-surface-3" />
            </div>

            {/* Figure row */}
            <div className="panel grid grid-cols-1 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`px-5 py-5 ${i < 2 ? 'border-b border-rule sm:border-r sm:border-b-0' : ''}`}>
                  <Skeleton className="h-7 w-14 rounded bg-surface-3" />
                  <Skeleton className="mt-3 h-2.5 w-20 rounded bg-surface-3" />
                </div>
              ))}
            </div>

            {/* Exam rows */}
            <div className="space-y-3">
              <Skeleton className="h-3 w-36 rounded bg-surface-3" />
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="panel px-5 py-4.5">
                  <Skeleton className="mb-3 h-5 w-20 rounded-full bg-surface-3" />
                  <Skeleton className="h-5 w-2/3 rounded bg-surface-3" />
                  <Skeleton className="mt-2.5 h-2.5 w-32 rounded bg-surface-3" />
                  <div className="mt-4 border-t border-rule-soft pt-4">
                    <Skeleton className="h-1.5 w-full rounded-none bg-surface-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right rail */}
          <div className="space-y-4">
            <div className="rounded-panel bg-ink px-6 pt-5.5 pb-6">
              <Skeleton tone="ink" className="mb-5 h-3 w-32 rounded" />
              <Skeleton tone="ink" className="h-12 w-24 rounded" />
            </div>
            <div className="panel">
              <div className="panel-head">
                <Skeleton className="h-3 w-28 rounded bg-surface-3" />
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-rule-soft px-5 py-3.5">
                  <Skeleton className="h-2 w-2 shrink-0 rounded-none bg-surface-3" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-3/4 rounded bg-surface-3" />
                    <Skeleton className="h-2.5 w-1/2 rounded bg-surface-3" />
                  </div>
                  <Skeleton className="h-5 w-12 shrink-0 rounded-full bg-surface-3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}
