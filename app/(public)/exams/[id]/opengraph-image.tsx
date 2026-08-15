import { ImageResponse } from 'next/og';
import { getActiveExams, getExamById } from '@/lib/db/exams';
import { examTypeLabel } from '@/lib/domain/exam-types';

export const alt = 'Testcentre sınaq imtahanı';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Prebuild one card per active exam rather than rendering on the first share.
export async function generateStaticParams() {
  try {
    const exams = await getActiveExams();
    return exams.map((exam) => ({ id: exam.id }));
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
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await getExamById(id);

  const title = exam?.title ?? 'Testcentre';
  const tag = exam?.tag ?? (exam ? examTypeLabel(exam.type) : 'Sınaq imtahanı');

  const stats = exam
    ? [
        { label: 'Sual', value: String(exam.totalQuestions) },
        { label: 'Dəqiqə', value: String(exam.durationMinutes) },
        { label: 'Modul', value: String(exam.modules.length) },
      ]
    : [];

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
