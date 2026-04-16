'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveExamResult } from '@/lib/actions/results';
import { Timer, Flag, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import type { PublicExam } from '@/lib/db/exams';

interface Props {
  exam: PublicExam;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ExamSessionClient({ exam }: Props) {
  const router = useRouter();
  const startedAtRef = useRef(new Date());
  const [elapsed, setElapsed] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Remaining time from exam total duration
  const totalSeconds = exam.durationMinutes * 60;
  const remaining = Math.max(0, totalSeconds - elapsed);

  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-submit when time runs out
  useEffect(() => {
    if (remaining === 0 && !submitting && !showConfirm) {
      handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setShowConfirm(false);
    setSubmitError('');
    try {
      const result = await saveExamResult({
        examId: exam.id,
        startedAt: startedAtRef.current.toISOString(),
        durationSeconds: Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000),
        score: 0,
      });
      if ('error' in result) throw new Error(result.error);
      router.push(`/analytics/${exam.id}`);
    } catch {
      setSubmitError('Nəticə göndərilmədi. Yenidən cəhd edin.');
      setSubmitting(false);
    }
  }, [exam.id, router]);

  return (
    <div className="text-on-surface select-none bg-surface min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm h-16 flex items-center justify-between px-6 border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg editorial-gradient flex items-center justify-center">
              <span className="text-white text-xs font-black">TC</span>
            </div>
            <span className="text-base font-extrabold tracking-tight text-primary font-headline group-hover:text-secondary transition-colors">Test Centre</span>
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">İmtahan Rejimi</span>
            <span className="text-sm font-bold text-primary">{exam.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 border rounded-full shadow-sm transition-colors ${remaining < 300 ? 'bg-red-50 border-red-200' : 'bg-surface-container-lowest border-primary/10'}`}>
            <Timer className={remaining < 300 ? 'text-red-500' : 'text-primary'} size={18} />
            <span className={`font-headline font-bold tabular-nums ${remaining < 300 ? 'text-red-600' : 'text-primary'}`}>
              {formatTime(remaining)}
            </span>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="editorial-gradient hover:opacity-90 transition-all text-white px-5 py-2 rounded-xl text-sm font-bold font-headline shadow-lg disabled:opacity-60"
          >
            {submitting ? 'Göndərilir...' : 'İmtahanı bitir'}
          </button>
        </div>
      </header>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
            <CheckCircle2 className="text-secondary mx-auto mb-4" size={40} />
            <h3 className="text-xl font-bold text-primary font-headline text-center mb-2">İmtahanı bitirmək istəyirsiniz?</h3>
            <p className="text-sm text-on-surface-variant text-center mb-6">
              Bütün cavablarınız saxlanılacaq. Bu əməliyyat geri qaytarıla bilməz.
            </p>
            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-700">{submitError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container transition-colors text-sm">
                Davam et
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 rounded-xl editorial-gradient text-white font-bold hover:opacity-90 transition-opacity text-sm disabled:opacity-60">
                {submitting ? 'Göndərilir...' : 'Bitir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <main className="pt-16 h-screen flex overflow-hidden">
        {/* Left Panel — Passage */}
        <section className="w-1/2 border-r border-slate-100 bg-surface flex flex-col overflow-hidden">
          <div className="px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-surface-container-low">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Mətn</span>
            <span className="text-xs text-on-surface-variant">{exam.modules[0]?.name ?? 'Modul 1'}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-12 py-10 no-scrollbar pb-32">
            <article className="max-w-2xl mx-auto">
              <h2 className="text-xl font-headline font-bold text-primary mb-6 leading-tight">The Evolution of Digital Architecture</h2>
              <div className="space-y-6 text-on-surface/90 leading-relaxed font-body">
                <p>In the burgeoning era of technological sophistication, the architectural landscape has shifted from tactile drafting boards to immersive digital environments. This transition, while primarily logistical, carries profound implications for the spatial cognition of the designer.</p>
                <p>Historically, the physical act of drawing allowed for a &quot;productive friction&quot; — a moment of hesitation where the hand&apos;s movement across the grain of the paper invited reflection. Digital tools, conversely, prioritize efficiency and seamlessness, potentially bypassing this contemplative phase of the creative process.</p>
                <p>The question then remains: does the precision of the algorithm enrich the soul of the structure, or does it merely standardize the human experience into a series of optimized nodes?</p>
              </div>
            </article>
          </div>
        </section>

        {/* Right Panel — Question */}
        <section className="w-1/2 bg-white flex flex-col overflow-hidden relative">
          <div className="flex-1 flex flex-col overflow-y-auto px-12 py-10 no-scrollbar pb-32">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-8">
                <span className="bg-primary text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold font-headline text-sm">1</span>
                <span className="text-on-surface-variant font-medium text-sm">Sual {exam.totalQuestions > 0 ? `1 / ${exam.totalQuestions}` : '1'}</span>
              </div>

              <p className="text-lg font-medium leading-relaxed text-on-surface mb-8">
                Based on the text, which of the following best describes the author&apos;s view on the relationship between digital tools and the creative process?
              </p>

              <div className="space-y-3">
                {[
                  'Digital tools have completely replaced the need for traditional drafting.',
                  'Digital tools prioritize efficiency, which may shorten the period of reflection in design.',
                  'The absence of physical friction makes the design process more prone to technical errors.',
                  'Algorithms ensure that all human needs are met with mathematical precision.',
                ].map((opt, i) => (
                  <label key={i} className="flex items-start gap-4 p-4 rounded-xl border-2 border-transparent bg-surface-container-low hover:bg-surface-container-high transition-all cursor-pointer">
                    <input className="mt-1 text-primary focus:ring-primary h-4 w-4 shrink-0" name="q1" type="radio" value={i} />
                    <span className="text-on-surface leading-normal text-sm">{opt}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-4 pt-6">
                <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">
                  <Flag size={16} /> İşarələ
                </button>
              </div>
            </div>
          </div>

          <footer className="absolute bottom-0 w-full h-20 bg-surface-container-low border-t border-slate-200 px-8 flex items-center justify-between">
            <button className="flex items-center gap-2 text-primary font-bold font-headline hover:bg-white px-4 py-2 rounded-xl transition-all">
              <ChevronLeft size={20} /> Əvvəlki
            </button>
            <span className="text-xs text-on-surface-variant font-medium">
              Keçən vaxt: {formatTime(elapsed)}
            </span>
            <button className="flex items-center gap-2 editorial-gradient text-white font-bold font-headline px-6 py-2 rounded-xl hover:opacity-90 shadow-lg transition-all">
              Növbəti <ChevronRight size={20} />
            </button>
          </footer>
        </section>
      </main>
    </div>
  );
}
