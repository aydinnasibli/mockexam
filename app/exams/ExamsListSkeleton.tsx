/**
 * Mirrors the register layout in ExamsCatalog — ink masthead, column header,
 * then ruled rows — so the fallback does not reflow the page when the exams
 * resolve.
 */
export default function ExamsListSkeleton() {
  return (
    <main className="min-h-screen bg-bg">

      <div className="bg-ink text-bg">
        <div className="mx-auto w-full max-w-320 px-6 pt-14 lg:px-10 lg:pt-19">
          <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-20 lg:items-end">
            <div>
              <div className="mb-6 h-3 w-20 animate-pulse bg-bg/20 lg:mb-7" />
              <div className="h-11 w-[70%] animate-pulse bg-bg/15 lg:h-20" />
              <div className="mt-3 h-11 w-[45%] animate-pulse bg-bg/15 lg:h-20" />
            </div>
            <div className="lg:pb-2.5">
              <div className="mb-3.5 h-3 w-24 animate-pulse bg-bg/20" />
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <span key={i} className="h-8 w-20 animate-pulse rounded-full border border-bg/20" />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-end lg:mt-14">
            <span className="h-13 w-28 rounded-t-btn bg-bg" />
            <span className="ml-2 h-6 w-20 animate-pulse self-center bg-bg/15" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-320 px-6 pb-24 lg:px-10 lg:pb-32">
        <div className="h-10.75 border-b border-ink" />

        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="grid gap-y-5 border-b border-rule py-7 xl:grid-cols-[112px_1fr_360px_156px] xl:items-center xl:gap-x-10 xl:gap-y-0 xl:py-9.5"
          >
            <div>
              <div className="h-4 w-16 animate-pulse bg-surface-2" />
              <div className="mt-2.5 h-6 w-14 animate-pulse rounded-full bg-surface-2" />
            </div>
            <div>
              <div className="h-7 w-[80%] animate-pulse bg-surface-2 xl:h-8" />
              <div className="mt-3.5 h-5 w-56 animate-pulse bg-surface-2" />
            </div>
            <div className="max-w-90">
              <div className="h-8.5 w-full animate-pulse bg-surface-2" />
              <div className="mt-2.5 h-3 w-44 animate-pulse bg-surface-2" />
            </div>
            <div className="flex items-center gap-4.5 xl:justify-end">
              <div className="h-7 w-20 animate-pulse bg-surface-2" />
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
