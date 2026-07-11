/**
 * Skeleton for the dashboard content area. The sidebar/shell live in the
 * layout and stay interactive while this streams — so this only mirrors the
 * page content: dark welcome banner, stat row, and card grid.
 */
export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Yüklənir" className="flex-1 animate-pulse">
      <span className="sr-only">Yüklənir…</span>

      {/* Welcome banner */}
      <div className="px-8 py-10 bg-ink shrink-0">
        <div className="h-3 w-40 rounded bg-white/10 mb-5" />
        <div className="h-10 w-72 max-w-full rounded bg-white/15 mb-3" />
        <div className="h-4 w-56 max-w-full rounded bg-white/10" />
      </div>

      <div className="px-8 py-8 space-y-8">
        {/* Stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-rule bg-surface p-5">
              <div className="h-3 w-20 rounded bg-surface-3 mb-3" />
              <div className="h-7 w-14 rounded bg-surface-3" />
            </div>
          ))}
        </div>

        {/* Content cards */}
        <div className="grid lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-rule bg-surface p-6">
              <div className="h-4 w-32 rounded bg-surface-3 mb-6" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-surface-3 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-3/4 rounded bg-surface-3" />
                      <div className="h-3 w-1/2 rounded bg-surface-3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
