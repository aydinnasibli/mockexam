export default function ExamSessionLoading() {
  /*
   * A spinner, not a skeleton: sketching a fake exam interface — timer,
   * question, answer options — for a timed assessment would be misleading in
   * the one place where the UI must never suggest state that isn't real.
   */
  return (
    <main role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-[#f0f2f5]">
      <div className="text-center">
        <div aria-hidden className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-ink/20 border-t-primary" />
        <p className="text-sm font-semibold text-ink-soft">İmtahan yüklənir...</p>
      </div>
    </main>
  );
}
