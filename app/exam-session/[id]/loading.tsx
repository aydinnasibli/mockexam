export default function ExamSessionLoading() {
  /*
   * A spinner, not a skeleton: sketching a fake exam interface — timer,
   * question, answer options — for a timed assessment would be misleading in
   * the one place where the UI must never suggest state that isn't real.
   */
  return (
    <main role="status" aria-live="polite" className="flex min-h-dvh items-center justify-center bg-bg">
      <div className="text-center">
        <div aria-hidden className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-rule border-t-ink" />
        <p className="text-sm text-ink-soft">İmtahan yüklənir...</p>
      </div>
    </main>
  );
}
