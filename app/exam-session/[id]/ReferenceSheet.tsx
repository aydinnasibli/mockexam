'use client';

import { X } from 'lucide-react';
import MathText from '@/components/ui/MathText';
import { MONO_SECTION } from '@/components/ui/type-styles';

/**
 * The Digital SAT reference sheet.
 *
 * Every candidate sitting a real Digital SAT has this on screen for the whole
 * Math section, so a mock that withholds it is testing memorisation the real
 * exam does not test. Content matches the published College Board sheet; it is
 * static, so it lives in the bundle rather than the database.
 *
 * Shown only for `math` modules — see the toggle in ExamSessionClient.
 */

const FORMULAS: Array<{ label: string; tex: string }> = [
  { label: 'Dairə — sahə',            tex: 'A = \\pi r^{2}' },
  { label: 'Dairə — çevrə',           tex: 'C = 2\\pi r' },
  { label: 'Düzbucaqlı — sahə',       tex: 'A = \\ell w' },
  { label: 'Üçbucaq — sahə',          tex: 'A = \\tfrac{1}{2} b h' },
  { label: 'Pifaqor teoremi',         tex: 'c^{2} = a^{2} + b^{2}' },
  { label: 'Düzbucaqlı prizma — həcm', tex: 'V = \\ell w h' },
  { label: 'Silindr — həcm',          tex: 'V = \\pi r^{2} h' },
  { label: 'Kürə — həcm',             tex: 'V = \\tfrac{4}{3} \\pi r^{3}' },
  { label: 'Konus — həcm',            tex: 'V = \\tfrac{1}{3} \\pi r^{2} h' },
  { label: 'Piramida — həcm',         tex: 'V = \\tfrac{1}{3} \\ell w h' },
];

const SPECIAL_TRIANGLES: Array<{ label: string; tex: string }> = [
  { label: '30°–60°–90° üçbucaq', tex: 'x,\; x\\sqrt{3},\; 2x' },
  { label: '45°–45°–90° üçbucaq', tex: 's,\; s,\; s\\sqrt{2}' },
];

const FACTS = [
  'Dairədəki qövsün dərəcə sayı 360-dır.',
  'Dairədəki radianların sayı 2π-dir.',
  'Üçbucağın daxili bucaqlarının cəmi 180°-dir.',
];

export default function ReferenceSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-90 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Düstur vərəqi"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-card border border-rule bg-surface p-6 md:p-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className={`${MONO_SECTION} text-ink-mute mb-1`}>Reference</p>
            <h2 className="font-display m-0 text-xl leading-tight font-normal tracking-tight text-ink">
              Düstur vərəqi
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Bağla"
            className="shrink-0 rounded-xl p-2 text-ink-soft transition-colors hover:bg-surface-2"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {FORMULAS.map(f => (
            <div key={f.label} className="flex items-baseline justify-between gap-3 border-b border-rule-soft pb-3">
              <span className="text-sm text-ink-soft">{f.label}</span>
              <span className="shrink-0 text-ink"><MathText text={`$${f.tex}$`} /></span>
            </div>
          ))}
        </div>

        <p className={`${MONO_SECTION} text-ink-mute mt-7 mb-3`}>Xüsusi düzbucaqlı üçbucaqlar</p>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {SPECIAL_TRIANGLES.map(t => (
            <div key={t.label} className="flex items-baseline justify-between gap-3 border-b border-rule-soft pb-3">
              <span className="text-sm text-ink-soft">{t.label}</span>
              <span className="shrink-0 text-ink"><MathText text={`$${t.tex}$`} /></span>
            </div>
          ))}
        </div>

        <p className={`${MONO_SECTION} text-ink-mute mt-7 mb-3`}>Faktlar</p>
        <ul className="m-0 list-none space-y-1.5 p-0">
          {FACTS.map(f => (
            <li key={f} className="text-sm leading-relaxed text-ink-soft">{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
