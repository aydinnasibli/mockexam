export default function AdminLoading() {
  /*
   * A spinner, not a skeleton: the admin segment covers a dashboard, several
   * tables and a question editor, and one shared skeleton would mis-preview
   * most of them. An honest "working" indicator beats a lying preview.
   */
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] items-center justify-center">
      <span className="sr-only">Yüklənir…</span>
      <div aria-hidden className="h-7 w-7 animate-spin rounded-full border-2 border-rule border-t-ink" />
    </div>
  );
}
