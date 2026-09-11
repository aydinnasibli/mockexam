import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { getActiveExamsForPrerender, getExamById } from '@/lib/db/exams';
import { examTypeLabel } from '@/lib/domain/exam-types';
import { typeSlug } from '@/lib/domain/exam-content';

export const alt = 'Testcentre sınaq imtahanı';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * The same hour the paper's own page runs on.
 *
 * Without this a metadata route is a pure build artefact — `revalidate: false`
 * in the prerender manifest — and nothing can invalidate it afterwards.
 * `revalidateExam` cannot: this route's cache tag ends in
 * `/opengraph-image-1c9bfn/route`, and reproducing that hash suffix is exactly
 * what the rest of this restructure refuses to do (see `lib/shared/seo.ts`).
 *
 * So an admin retitling a paper got the page updated within the hour and a
 * social card still showing the old title until somebody happened to redeploy
 * — on the artefact that gets shared to WhatsApp and Telegram, which is the
 * whole reason this file renders per-exam instead of serving the site banner.
 * Every value on the card is read from the exam row, so it belongs on the same
 * clock as every other page that reads it.
 */
export const revalidate = 3600;

/**
 * Prebuild one card per active exam rather than rendering on the first share.
 *
 * BOTH segments, because this image lives under `[type]/[id]`. Returning only
 * `{ slug }` — the shape this file carried when it sat one level up — matched
 * neither segment: nothing prerendered, and at request time `params.slug` was
 * `undefined`, so every card fell through to the generic branch below. Nothing
 * caught it, because the props type is hand-written and a build with no
 * matching params is not an error.
 */
export async function generateStaticParams() {
  try {
    // Same snapshot as the paper pages, so every prerendered page has its card.
    const exams = await getActiveExamsForPrerender();
    return exams.map((exam) => ({ type: typeSlug(exam.type), id: exam.id }));
  } catch {
    // No database at build time (CI): render each card on first share.
    return [];
  }
}

/**
 * Per-exam social card. The catalog and detail pages are shared over WhatsApp
 * and Telegram far more than they are linked to, so the preview is doing real
 * work — a generic site banner wastes it.
 */
export default async function Image({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  const exam = await getExamById(id);

  /*
   * BOTH segments have to name a real paper, exactly as they do on the page
   * next door.
   *
   * This route read only `id`, so `/exams/sat/ielts-academic-1/…` and
   * `/exams/anything-at-all/ielts-academic-1/…` both answered 200 with the
   * byte-identical IELTS card. The page one level up permanently redirects
   * those; the image happily served them, which made this the one route on the
   * site with an unbounded set of valid URLs — each one rendered by Satori and
   * then cached on its own.
   *
   * An unknown ID is the same hole on the other axis, and it outlived the first
   * attempt at closing this: guarding only the MISMATCH (`exam && …`) left
   * every `/exams/<anything>/<anything>/opengraph-image` pair falling through
   * to a generic card, measured at 200 and 31KB. So the guard is `!exam ||`,
   * which is what actually bounds the set.
   *
   * The generic branch it replaces was unreachable for legitimate traffic
   * anyway: the only URL that reaches this file is the canonical one Next
   * writes into `og:image`, and a paper with no row has no page to write it.
   *
   * A 404 rather than a redirect, deliberately. A crawler that followed a
   * redirect here would just fetch the same bytes at the canonical URL, and a
   * social scraper does not follow one at all — there is nothing to send anyone
   * to, only a request that should not have been made.
   */
  if (!exam || typeSlug(exam.type) !== type) notFound();

  const title = exam.title;
  const tag = exam.tag ?? examTypeLabel(exam.type);

  const stats = [
    { label: 'Sual', value: String(exam.totalQuestions) },
    { label: 'Dəqiqə', value: String(exam.durationMinutes) },
    { label: 'Modul', value: String(exam.modules.length) },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#1a1a1a',
          padding: 72,
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg viewBox="0 0 200 180" width="44" height="40">
            <polygon points="100,105 15,30 40,30 100,82 160,30 185,30" fill="#fafaf6" />
            <polygon points="100,150 15,75 40,75 100,127 160,75 185,75" fill="#fafaf6" />
          </svg>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: '#fafaf6', letterSpacing: '-0.02em' }}>
            Testcentre
          </div>
        </div>

        {/* Title block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              padding: '8px 18px',
              borderRadius: 999,
              border: '1px solid rgba(250,250,246,0.25)',
              color: '#c8c8c0',
              fontSize: 22,
              letterSpacing: '0.08em',
            }}
          >
            {tag}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 40 ? 60 : 74,
              fontWeight: 600,
              color: '#fafaf6',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 56, alignItems: 'flex-end' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', fontSize: 44, fontWeight: 600, color: '#fafaf6' }}>{s.value}</div>
              <div style={{ display: 'flex', fontSize: 20, color: '#8a8a84', letterSpacing: '0.06em' }}>
                {s.label}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', marginLeft: 'auto', fontSize: 22, color: '#8a8a84' }}>
            testcentre.az
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
