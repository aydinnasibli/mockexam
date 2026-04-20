export default function ExamsListSkeleton() {
  return (
    <main className="pt-24 pb-16 min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <div className="flex items-end gap-4 mb-2">
          <div className="h-9 w-48 bg-surface-container rounded-lg animate-pulse" />
          <div className="h-6 w-16 bg-surface-container rounded-full animate-pulse" />
        </div>
        <div className="h-4 w-80 bg-surface-container rounded animate-pulse mt-1" />
      </div>

      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-72 flex-shrink-0 space-y-4">
          <div className="h-12 bg-surface-container rounded-xl animate-pulse" />
          <div className="h-52 bg-surface-container rounded-2xl animate-pulse" />
        </aside>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-5">
            <div className="h-4 w-24 bg-surface-container rounded animate-pulse" />
            <div className="h-9 w-40 bg-surface-container rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-outline-variant/50 h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
