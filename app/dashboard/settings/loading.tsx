import { Skeleton, SkeletonScreen } from '@/components/ui/Skeleton';

/**
 * Settings is a stack of four bordered cards on a narrow column — nothing like
 * the dashboard home's banner-and-tiles. Without this file it would inherit
 * that skeleton and the page would visibly rearrange itself on arrival.
 */
export default function SettingsLoading() {
  return (
    <main className="min-h-screen bg-surface-2">
      <SkeletonScreen className="mx-auto max-w-2xl px-6 py-10" label="Parametrlər yüklənir">

        <header className="mb-8">
          <Skeleton className="mb-2 h-8 w-52 rounded bg-surface-3" />
          <Skeleton className="h-4 w-64 max-w-full rounded bg-surface-3" />
        </header>

        <div className="space-y-4">
          {/* Profile card — avatar row, then three label/value rows */}
          <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
            <div className="border-b border-rule px-6 py-4">
              <Skeleton className="h-3 w-16 rounded bg-surface-3" />
            </div>
            <div className="p-6">
              <div className="mb-6 flex items-center gap-5 border-b border-rule pb-6">
                <Skeleton className="h-16 w-16 shrink-0 rounded-full bg-surface-3" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-40 rounded bg-surface-3" />
                  <Skeleton className="h-4 w-56 max-w-full rounded bg-surface-3" />
                </div>
              </div>
              <div className="divide-y divide-rule">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-3">
                    <Skeleton className="h-4 w-28 rounded bg-surface-3" />
                    <Skeleton className="h-4 w-36 max-w-[45%] rounded bg-surface-3" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Exam target, security, account */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-rule bg-surface">
              <div className="border-b border-rule px-6 py-4">
                <Skeleton className="h-3 w-24 rounded bg-surface-3" />
              </div>
              <div className="space-y-3 p-6">
                <Skeleton className="h-4 w-3/4 rounded bg-surface-3" />
                <Skeleton className="h-10 w-full rounded-xl bg-surface-3" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonScreen>
    </main>
  );
}
