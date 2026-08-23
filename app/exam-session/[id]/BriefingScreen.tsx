'use client';

import Link from 'next/link';
import { ArrowRight, TriangleAlert } from 'lucide-react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import { MONO_SECTION } from '@/components/ui/type-styles';
import type { PublicExam } from '@/lib/db/exams';
import type { SessionQuestion } from '@/lib/actions/questions';
import { moduleIcon } from './module-icon';

/**
 * Everything the student sees before the clock exists.
 *
 * This is a separate screen rather than a branch inside the player because it
 * is a different thing: there is no session, no timer and no question yet, and
 * the whole point of the briefing is that pressing "Başla" — not loading the
 * page — is what starts the server clock.
 *
 * Rendering the module breakdown here is deliberate: a student should be able
 * to see how long each section is, and whether there is listening audio they
 * only get one pass at, before committing to the timer.
 */

interface ModuleGroup {
  mod: PublicExam['modules'][number];
  modIdx: number;
  qs: SessionQuestion[];
}

interface Props {
  exam: PublicExam;
  questions: SessionQuestion[];
  questionsByModule: ModuleGroup[];
  /** 'loading' shows the spinner; anything else shows the briefing. */
  loading: boolean;
  starting: boolean;
  hasNoQuestions: boolean;
  onStart: () => void;
}

export default function BriefingScreen({
  exam, questions, questionsByModule, loading, starting, hasNoQuestions, onStart,
}: Props) {
  return (
    <div className="min-h-dvh flex flex-col bg-bg text-ink">
      <header className="h-14 md:h-16 px-4 md:px-8 flex items-center shrink-0 border-b border-rule">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span className="font-display text-lg font-normal text-ink">Test<span>centre</span></span>
        </Link>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <span className="w-9 h-9 rounded-full animate-spin border-[3px] border-rule border-t-ink" />
          <p className="text-sm">Hazırlanır…</p>
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-5 py-10 md:py-14">

            <div className="flex items-center gap-2 mb-4">
              <Tag tone="accent">{exam.tag}</Tag>
              <span className={`${MONO_SECTION} text-ink-mute`}>İmtahan brifinqi</span>
            </div>

            <h1 className="font-display font-normal text-ink text-3xl md:text-4xl leading-tight tracking-tight m-0 mb-3">
              {exam.title}
            </h1>
            <p className="text-base leading-[1.6] m-0 mb-8">
              Başlamazdan əvvəl imtahanın quruluşunu nəzərdən keçirin. Vaxt yalnız
              aşağıdakı düyməyə basdıqdan sonra işləməyə başlayacaq.
            </p>

            {/* Headline numbers */}
            <div className="grid grid-cols-3 gap-4 border-y py-6 mb-8 border-rule">
              <div>
                <div className={`${MONO_SECTION} text-ink-mute mb-2`}>Müddət</div>
                <div className="font-display tabular-nums lining-nums text-ink text-2xl md:text-3xl leading-none">
                  {exam.durationMinutes}<span className="text-sm ml-1 text-ink-mute">dəq</span>
                </div>
              </div>
              <div className="border-l pl-5 border-rule">
                <div className={`${MONO_SECTION} text-ink-mute mb-2`}>Sual</div>
                <div className="font-display tabular-nums lining-nums text-ink text-2xl md:text-3xl leading-none">
                  {questions.length}
                </div>
              </div>
              <div className="border-l pl-5 border-rule">
                <div className={`${MONO_SECTION} text-ink-mute mb-2`}>Bölmə</div>
                <div className="font-display tabular-nums lining-nums text-ink text-2xl md:text-3xl leading-none">
                  {exam.modules.length}
                </div>
              </div>
            </div>

            {/* Module breakdown */}
            <p className={`${MONO_SECTION} text-ink-mute mb-3`}>İmtahanın quruluşu</p>
            <ol className="list-none p-0 m-0 space-y-2 mb-8">
              {questionsByModule.map(({ mod, modIdx, qs }) => {
                const Icon = moduleIcon(mod.type);
                return (
                  <li key={modIdx} className="flex items-start gap-4 p-4 rounded-2xl border border-rule bg-surface">
                    <span className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-surface-2 text-ink-soft">
                      <Icon size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-mono text-xs text-ink-mute">
                          {String(modIdx + 1).padStart(2, '0')}
                        </span>
                        <span className="text-sm font-medium text-ink">{mod.name}</span>
                      </div>
                      <p className="text-sm mt-1 m-0 text-ink-mute">
                        {qs.length > 0 ? `${qs.length} sual` : 'Açıq tapşırıq'}
                        {mod.durationMinutes > 0 && ` · təxminən ${mod.durationMinutes} dəq`}
                      </p>
                      {mod.instructions && (
                        <p className="text-sm mt-2 mb-0 leading-relaxed">{mod.instructions}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Rules */}
            <div className="rounded-2xl p-5 mb-8 border border-rule bg-surface-2">
              <div className="flex items-center gap-2 mb-3">
                <TriangleAlert size={14} className="text-warn" />
                <span className={`${MONO_SECTION} text-ink-mute`}>Başlamazdan əvvəl</span>
              </div>
              <ul className="list-none p-0 m-0 space-y-2 text-xs leading-relaxed">
                {/*
                  Section timing leads, because it is the rule that most changes
                  how a candidate should pace themselves — and the one they will
                  otherwise discover only when a module closes on them.
                */}
                {exam.modules.length > 1 && (
                  <li>· <span className="font-medium text-ink">Hər bölmənin öz vaxtı var.</span> Bölmənin vaxtı bitdikdə suallar bağlanır, növbəti bölmə avtomatik açılır və geri qayıtmaq mümkün olmur.</li>
                )}
                <li>· Bölməni erkən bitirmək olmaz — qalan vaxtı cavablarınızı yoxlamaq üçün istifadə edin. İstifadə olunmayan vaxt növbəti bölməyə keçmir.</li>
                {exam.modules.some(m => m.breakAfterMinutes > 0) && (
                  <li>· Fasilə vaxtı imtahan vaxtından çıxılmır.</li>
                )}
                <li>· Vaxt serverdə saxlanılır — səhifəni yeniləmək və ya bağlamaq sayğacı dayandırmır.</li>
                <li>· Vaxt bitdikdə imtahan avtomatik təhvil verilir.</li>
                <li>· Cavablarınız avtomatik yadda saxlanılır; qayıdanda qaldığınız yerdən davam edirsiniz.</li>
                {exam.modules.some(m => m.layout === 'block') && (
                  <li>· Bəzi bölmələrdə bir hissənin bütün sualları eyni ekranda göstərilir — səs başlamazdan əvvəl hamısını oxuyun.</li>
                )}
                {questions.some(q => q.hasAudio) && (
                  <li>· Dinləmə audioları <span className="font-medium text-ink">yalnız bir dəfə</span> oxunur — dayandırmaq və geri sarmaq mümkün deyil.</li>
                )}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                size="none"
                className="justify-center gap-2.5 px-8 py-3.5 text-base disabled:opacity-60"
                onClick={onStart}
                disabled={starting || hasNoQuestions}
              >
                {starting ? 'Başladılır…' : 'Başla'}
                {!starting && <ArrowRight size={17} />}
              </Button>
              <Button variant="ghost" size="none" className="justify-center gap-2.5 px-6 py-3.5 text-base" href="/dashboard">
                Panelə qayıt
              </Button>
            </div>
            {hasNoQuestions && (
              <p className="text-sm mt-3 m-0 text-warn">
                Bu imtahan üçün sual bankı hələ hazırlanır.
              </p>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
