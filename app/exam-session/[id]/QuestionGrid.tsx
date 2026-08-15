'use client';

import { X } from 'lucide-react';
import { MONO_SECTION } from '@/components/ui/type-styles';
import type { PublicExam } from '@/lib/db/exams';
import type { SessionQuestion } from '@/lib/actions/questions';

/**
 * The jump-to-question drawer.
 *
 * Grouped by module rather than as one flat run of 98 buttons, because that is
 * how a student thinks about where they are in a paper. Each cell encodes two
 * independent facts — answered and flagged — and the aria-label spells both out,
 * since colour alone would not carry them.
 */

interface ModuleGroup {
  mod: PublicExam['modules'][number];
  modIdx: number;
  qs: SessionQuestion[];
}

interface Props {
  questionsByModule: ModuleGroup[];
  indexById: Map<string, number>;
  answers: Map<string, number>;
  openAnswers: Map<string, string>;
  matchingAnswers: Map<string, number[]>;
  flagged: Set<string>;
  currentIdx: number;
  answeredCount: number;
  totalQuestions: number;
  onGoTo: (idx: number) => void;
  onClose: () => void;
}

export default function QuestionGrid({
  questionsByModule, indexById, answers, openAnswers, matchingAnswers,
  flagged, currentIdx, answeredCount, totalQuestions, onGoTo, onClose,
}: Props) {
  /** Answered means something different per question type; keep it in one place. */
  function isAnswered(q: SessionQuestion): boolean {
    switch (q.type) {
      case 'mcq':      return answers.has(q.id);
      case 'open':
      case 'writing':  return !!openAnswers.get(q.id)?.trim();
      case 'matching': return matchingAnswers.has(q.id);
      default:         return false;
    }
  }

  return (
    <div className="fixed inset-0 z-40 pt-14 md:pt-16 bg-ink/20" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-nav-title"
        className="absolute right-0 top-14 md:top-16 bottom-0 w-full max-w-xs overflow-y-auto bg-surface shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between border-b border-rule">
          <div>
            <p id="question-nav-title" className="text-sm font-medium text-ink">Sual navigasiyası</p>
            <p className="text-sm mt-0.5">
              {answeredCount}/{totalQuestions} cavablandı
              {flagged.size > 0 && ` · ${flagged.size} işarəli`}
            </p>
          </div>
          <button onClick={onClose} aria-label="Sual siyahısını bağla" className="p-1.5 rounded-lg transition-colors">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {questionsByModule.map(({ mod, modIdx, qs }) => (
            <div key={modIdx}>
              <p className={`${MONO_SECTION} text-ink-mute mb-2`}>{mod.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {qs.map(q => {
                  const globalIdx = indexById.get(q.id) ?? 0;
                  const answered  = isAnswered(q);
                  const isFlagged = flagged.has(q.id);
                  const isCurrent = globalIdx === currentIdx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => onGoTo(globalIdx)}
                      aria-current={isCurrent ? 'true' : undefined}
                      aria-label={`Sual ${globalIdx + 1}${answered ? ' — cavablandırılıb' : ' — cavablandırılmayıb'}${isFlagged ? ', işarələnib' : ''}`}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        isCurrent ? 'ring-2 ring-offset-1' : ''
                      } ${
                        answered
                          ? isFlagged ? 'bg-warn text-bg' : 'bg-ink text-bg'
                          : isFlagged
                            ? 'border border-warn bg-warn/10 text-warn'
                            : 'bg-surface-2 text-ink-soft'
                      }`}
                    >
                      {globalIdx + 1}
                    </button>
                  );
                })}
                {qs.length === 0 && <p className="text-sm text-ink-mute">Bu modulda sual yoxdur</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 flex flex-wrap gap-3 text-xs border-t border-rule text-ink-soft">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block bg-ink" /> Cavablandı</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block bg-warn" /> İşarəli</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block bg-surface-2" /> Cavabsız</span>
        </div>
      </div>
    </div>
  );
}
