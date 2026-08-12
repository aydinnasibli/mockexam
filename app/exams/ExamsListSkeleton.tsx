import { Skeleton, SkeletonScreen } from '@/components/ui/Skeleton';

/**
 * Mirrors ExamsCatalog exactly — ink masthead, tab row, column header, then
 * four register rows — so when the exams resolve nothing on the page moves.
 * The row grid, breakpoints and paddings are copied from the catalog on
 * purpose: if that layout changes, this has to change with it.
 */
export default function ExamsListSkeleton() {
  return (
    <main className="min-h-screen bg-bg">
      <SkeletonScreen label="Sınaqlar yüklənir">

        {/* Masthead */}
        <div className="bg-ink">
          <div className="mx-auto w-full max-w-320 px-6 pt-14 lg:px-10 lg:pt-19">
            <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-20 lg:items-end">
              <div>
                <Skeleton tone="ink" className="mb-6 h-3 w-20 lg:mb-7" />
                <Skeleton tone="ink" className="h-11 w-[70%] lg:h-20" />
                <Skeleton tone="ink" className="mt-3 h-11 w-[45%] lg:h-20" />
              </div>
              <div className="lg:pb-2.5">
                <Skeleton tone="ink" className="mb-3.5 h-3 w-24" />
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} tone="ink" className="h-8 w-20 rounded-full" />
                  ))}
                </div>
              </div>
            </div>

            {/* Tab row — the active tab is a solid bone shape, as in the catalog */}
            <div className="mt-10 flex items-end lg:mt-14">
              <span aria-hidden className="h-13 w-28 rounded-t-btn bg-bg" />
              <Skeleton tone="ink" className="ml-2 h-6 w-20 self-center" />
            </div>
          </div>
        </div>

        {/* Register */}
        <div className="mx-auto w-full max-w-320 px-6 pb-24 lg:px-10 lg:pb-32">
          <div className="h-10.75 border-b border-ink" />

          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="grid gap-y-5 border-b border-rule py-7 xl:grid-cols-[112px_1fr_360px_156px] xl:items-center xl:gap-x-10 xl:gap-y-0 xl:py-9.5"
            >
              <div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="mt-2.5 h-6 w-14 rounded-full" />
              </div>
              <div>
                <Skeleton className="h-7 w-[80%] xl:h-8" />
                <Skeleton className="mt-3.5 h-5 w-56" />
              </div>
              <div className="max-w-90">
                <Skeleton className="h-8.5 w-full" />
                <Skeleton className="mt-2.5 h-3 w-44" />
              </div>
              <div className="flex items-center gap-4.5 xl:justify-end">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              </div>
            </div>
          ))}

          {/* "Hər sınağa" strip */}
          <div className="grid gap-6 pt-10 lg:grid-cols-[112px_1fr] lg:gap-10 lg:pt-14">
            <Skeleton className="h-3 w-24 lg:mt-1.5" />
            <div className="grid grid-cols-2 gap-0.5 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-surface-2 px-5 pt-5.5 pb-6 lg:px-5.5">
                  <Skeleton className="mb-3 h-7 w-14 bg-surface-3" />
                  <Skeleton className="h-4 w-28 bg-surface-3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </SkeletonScreen>
    </main>
  );
}
