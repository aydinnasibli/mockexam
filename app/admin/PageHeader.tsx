/**
 * The masthead every admin screen opens with: dot, mono eyebrow, a light
 * heading at the size the public pages set their section heads, and an optional
 * mono meta line — the construction used by `SectionHead` on the home page.
 *
 * It exists because the six admin screens each carried their own copy of a
 * `text-3xl font-extrabold text-ink font-headline` header, which is how
 * they drifted apart from the rest of the product in the first place.
 */
export default function AdminPageHeader({
  eyebrow,
  title,
  meta,
  action,
}: {
  eyebrow: string;
  title: string;
  /** Counts and identifiers — set in mono, like every figure in the design. */
  meta?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-ink pb-6">
      <div className="min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <span className="font-mono text-label font-normal tracking-[0.16em] uppercase text-ink-mute">{eyebrow}</span>
        </div>
        <h1 className="m-0 text-3xl leading-[1.05] font-light tracking-[-0.035em] text-ink md:text-display-xs">
          {title}
        </h1>
        {meta && <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-3.5">{meta}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{action}</div>}
    </header>
  );
}
