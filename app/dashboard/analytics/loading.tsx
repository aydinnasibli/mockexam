import { Skeleton, SkeletonScreen } from '@/components/ui/Skeleton';

/**
 * Analytics is a heading, a ruled totals band and a results table — again
 * unlike the dashboard home, so it carries its own skeleton rather than
 * inheriting one whose shape it does not share.
 */
export default function AnalyticsLoading() {
  return (
    <SkeletonScreen className="p-8" label="Nəticələr yüklənir">

      {/* Heading */}
      <div className="mb-10">
        <div className="mb-5 flex items-center gap-3">
          <Skeleton className="h-1.5 w-1.5 rounded-full bg-surface-3" />
          <Skeleton className="h-3 w-24 rounded bg-surface-3" />
        </div>
        <Skeleton className="mb-3 h-9 w-72 max-w-full rounded bg-surface-3 md:h-10" />
        <Skeleton className="h-4 w-96 max-w-full rounded bg-surface-3" />
      </div>

      {/* Totals band */}
      <div className="mb-10 border-y border-rule py-8">
        <div className="mb-7 flex items-baseline gap-3">
          <Skeleton className="h-9 w-16 rounded bg-surface-3 md:h-10" />
          <Skeleton className="h-3 w-20 rounded bg-surface-3" />
        </div>

        <Skeleton className="mb-4 h-3 w-32 rounded bg-surface-3" />

        {/* Per-type result rows */}
        <div className="hidden pb-2 sm:grid sm:grid-cols-[1fr_90px_120px_120px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={`h-3 w-16 rounded bg-surface-3 ${i > 0 ? 'justify-self-end' : ''}`} />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-2 items-center gap-y-1.5 border-t border-rule px-1 py-3 sm:grid-cols-[1fr_90px_120px_120px]"
          >
            <Skeleton className="h-4 w-28 rounded bg-surface-3" />
            <Skeleton className="h-4 w-10 justify-self-end rounded bg-surface-3" />
            <Skeleton className="hidden h-4 w-14 justify-self-end rounded bg-surface-3 sm:block" />
            <Skeleton className="hidden h-4 w-14 justify-self-end rounded bg-surface-3 sm:block" />
          </div>
        ))}
      </div>

      {/* Attempt cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div  key={i} className="rounded-panel border border-rule bg-surface">
            <div className="flex items-center justify-between gap-4 p-6">
              <div className="min-w-0 flex-1 space-y-2.5">
                <Skeleton className="h-5 w-20 rounded-full bg-surface-3" />
                <Skeleton className="h-6 w-2/3 rounded bg-surface-3" />
                <Skeleton className="h-2.5 w-40 max-w-full rounded bg-surface-3" />
              </div>
              <Skeleton className="h-9 w-24 shrink-0 rounded-full bg-surface-3" />
            </div>
            <div className="border-t border-rule bg-surface-2 px-6 py-2.5">
              <Skeleton className="h-2.5 w-full rounded bg-surface-3" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
