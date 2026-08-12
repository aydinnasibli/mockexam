export default function AdminLoading() {
  /*
   * A spinner, not a skeleton: the admin segment covers a dashboard, several
   * tables and a question editor, and one shared skeleton would mis-preview
   * most of them. An honest "working" indicator beats a lying preview.
   */
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] items-center justify-center">
      <span className="sr-only">Yüklənir…</span>
      <div aria-hidden className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  );
}
