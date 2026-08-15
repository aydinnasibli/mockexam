'use client';

import 'katex/dist/katex.min.css';
import { useState, useTransition, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { renderMath } from '@/lib/shared/render-math';
import {
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2,
  FileText, Pencil, X, Save, Sigma, Eye, EyeOff,
} from 'lucide-react';
import { addQuestion, updateQuestion, deleteQuestion, reorderQuestions } from '@/lib/actions/questions';
import type { QuestionData } from '@/lib/actions/questions';
import type { QuestionType, WritingTaskType } from '@/lib/models/Question';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';

interface ModuleMeta {
  index: number;
  name: string;
  type: string;
  questionCount: number;
}

interface Props {
  examId: string;
  modules: ModuleMeta[];
  initialQuestions: QuestionData[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'mcq',      label: 'Çoxseçimli (MCQ)' },
  { value: 'open',     label: 'Açıq (qısa cavab)' },
  { value: 'matching', label: 'Uyğunlaşdırma' },
  { value: 'writing',  label: 'Yazı (esse)' },
];

const WRITING_TASK_TYPES: { value: WritingTaskType; label: string }[] = [
  { value: 'task1',       label: 'IELTS Task 1 (qrafik/diaqram)' },
  { value: 'task2',       label: 'IELTS Task 2 (esse)' },
  { value: 'integrated',  label: 'TOEFL Integrated' },
  { value: 'independent', label: 'TOEFL Independent' },
  { value: 'general',     label: 'Ümumi' },
];

// ─── Math symbols palette ────────────────────────────────────────────────────

const MATH_SYMBOLS = [
  { label: 'x²', insert: 'x^{2}' },
  { label: 'xⁿ', insert: 'x^{n}' },
  { label: '√', insert: '\\sqrt{x}' },
  { label: 'ⁿ√', insert: '\\sqrt[n]{x}' },
  { label: 'π', insert: '\\pi' },
  { label: '∞', insert: '\\infty' },
  { label: '±', insert: '\\pm' },
  { label: '≠', insert: '\\neq' },
  { label: '≤', insert: '\\leq' },
  { label: '≥', insert: '\\geq' },
  { label: '≈', insert: '\\approx' },
  { label: '×', insert: '\\times' },
  { label: '÷', insert: '\\div' },
  { label: 'frac', insert: '\\frac{a}{b}' },
  { label: '|x|', insert: '|x|' },
  { label: 'Σ', insert: '\\sum_{i=1}^{n}' },
  { label: 'sin', insert: '\\sin(x)' },
  { label: 'cos', insert: '\\cos(x)' },
  { label: 'log', insert: '\\log(x)' },
  { label: 'lnx', insert: '\\ln(x)' },
  { label: '∈', insert: '\\in' },
  { label: 'θ', insert: '\\theta' },
  { label: 'α', insert: '\\alpha' },
  { label: 'β', insert: '\\beta' },
];

const MATH_TEMPLATES = [
  { label: 'Xətti tənlik', insert: 'ax + b = c' },
  { label: 'Kvadrat tənlik', insert: 'ax^{2} + bx + c = 0' },
  { label: 'Kvadrat formula', insert: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { label: 'Mənfi eksponent', insert: 'x^{-n} = \\frac{1}{x^n}' },
  { label: 'Faiz', insert: '\\frac{part}{whole} \\times 100' },
  { label: 'Pifaqor', insert: 'a^2 + b^2 = c^2' },
  { label: 'Slope', insert: 'm = \\frac{y_2 - y_1}{x_2 - x_1}' },
  { label: 'Çevrə', insert: 'A = \\pi r^2' },
];


function MathPreview({ text, className = '' }: { text: string; className?: string }) {
  const rendered = renderMath(text) || '<span class="text-ink-mute text-xs">Önizləmə...</span>';
  return <div dangerouslySetInnerHTML={{ __html: rendered }} className={`prose prose-sm max-w-none leading-relaxed ${className}`} />;
}

// ─── Math toolbar ────────────────────────────────────────────────────────────

function MathToolbar({ onInsert }: { onInsert: (s: string) => void }) {
  const [tab, setTab] = useState<'symbols' | 'templates'>('symbols');
  return (
    <div className="overflow-hidden rounded-btn border border-rule bg-surface-2">
      <div className="flex border-b border-rule">
        <button type="button" onClick={() => setTab('symbols')}
          className={`flex-1 cursor-pointer px-3 py-2 text-xs font-medium transition-colors ${tab === 'symbols' ? 'bg-surface text-ink' : 'text-ink-mute hover:text-ink'}`}>
          Simvollar
        </button>
        <button type="button" onClick={() => setTab('templates')}
          className={`flex-1 cursor-pointer px-3 py-2 text-xs font-medium transition-colors ${tab === 'templates' ? 'bg-surface text-ink' : 'text-ink-mute hover:text-ink'}`}>
          Şablonlar
        </button>
      </div>
      <div className="p-2">
        {tab === 'symbols' ? (
          <div className="flex flex-wrap gap-1">
            {MATH_SYMBOLS.map(s => (
              <button key={s.label} type="button" onClick={() => onInsert(`$${s.insert}$`)}
                className="cursor-pointer rounded-btn border border-rule bg-surface px-2 py-1 font-mono text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink">
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {MATH_TEMPLATES.map(t => (
              <button key={t.label} type="button" onClick={() => onInsert(`$${t.insert}$`)}
                className="group flex cursor-pointer items-center justify-between gap-3 rounded-btn border border-rule bg-surface px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink">
                <span className="font-medium">{t.label}</span>
                <MathPreview text={`$${t.insert}$`} className="text-xs opacity-70 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute px-3 pb-2.5">İnline: <code>$formula$</code> · Blok: <code>$$formula$$</code></p>
    </div>
  );
}

// ─── Math-aware textarea ─────────────────────────────────────────────────────

function MathTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  showToolbar = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  showToolbar?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [toolbar, setToolbar] = useState(false);

  const insertAtCursor = useCallback((text: string) => {
    const el = textareaRef.current;
    if (!el) { onChange(value + text); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + text.length, start + text.length); }, 0);
  }, [value, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        {showToolbar && (
          <button type="button" onClick={() => setToolbar(t => !t)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${toolbar ? 'bg-ink text-bg' : 'border border-rule text-ink-soft hover:border-ink hover:text-ink'}`}>
            <Sigma size={12} /> Riyaziyyat
          </button>
        )}
        <button type="button" onClick={() => setPreview(p => !p)}
          className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${preview ? 'bg-ink text-bg' : 'border border-rule text-ink-soft hover:border-ink hover:text-ink'}`}>
          {preview ? <EyeOff size={12} /> : <Eye size={12} />}
          {preview ? 'Redaktə' : 'Önizləmə'}
        </button>
      </div>
      {toolbar && showToolbar && <MathToolbar onInsert={insertAtCursor} />}
      {preview ? (
        <div className="min-h-20 rounded-btn border border-rule bg-surface px-4 py-3">
          {value ? <MathPreview text={value} /> : <span className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute">Mətn yoxdur...</span>}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-3.5 resize-y text-sm"
        />
      )}
    </div>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

function emptyForm(moduleIndex: number, type: QuestionType = 'mcq') {
  return {
    moduleIndex, type,
    passage: '', audioUrl: '', imageUrl: '', stem: '', explanation: '',
    options: ['', '', '', ''],            // mcq choices OR matching right-column targets
    correctIndex: 0,                       // mcq
    openAnswers: [''],                     // open: accepted answers
    matchItems: [''],                      // matching: left-column items
    correctMatching: [0],                  // matching: option index per matchItem
    writingTaskType: 'task2' as WritingTaskType,
    minWords: 0,
    maxWords: 0,
    rubric: '',
  };
}
type FormState = ReturnType<typeof emptyForm>;

// ─── Question form ────────────────────────────────────────────────────────────

function QuestionForm({
  examId, moduleIndex, initial, onDone, onCancel,
}: {
  examId: string; moduleIndex: number; initial?: QuestionData;
  onDone: () => void; onCancel: () => void;
}) {
  const isEdit = !!initial;
  const router = useRouter();
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          moduleIndex: initial.moduleIndex, type: initial.type,
          passage: initial.passage, audioUrl: initial.audioUrl ?? '', imageUrl: initial.imageUrl ?? '',
          stem: initial.stem, explanation: initial.explanation,
          options: initial.options.length ? [...initial.options] : ['', '', '', ''],
          correctIndex: initial.correctIndex >= 0 ? initial.correctIndex : 0,
          openAnswers: initial.openAnswers?.length ? [...initial.openAnswers] : [''],
          matchItems: initial.matchItems?.length ? [...initial.matchItems] : [''],
          correctMatching: initial.correctMatching?.length ? [...initial.correctMatching] : [0],
          writingTaskType: initial.writingTaskType ?? 'task2',
          minWords: initial.minWords ?? 0,
          maxWords: initial.maxWords ?? 0,
          rubric: initial.rubric ?? '',
        }
      : emptyForm(moduleIndex)
  );
  const [pending, start] = useTransition();
  const [validationError, setValidationError] = useState('');

  function set<K extends keyof FormState>(key: K, value: FormState[K]) { setForm(f => ({ ...f, [key]: value })); }

  // Options (mcq choices / matching right-column targets)
  function setOption(i: number, value: string) { setForm(f => { const options = [...f.options]; options[i] = value; return { ...f, options }; }); }
  function addOption() { setForm(f => (f.options.length >= 8 ? f : { ...f, options: [...f.options, ''] })); }
  function removeOption(i: number) {
    setForm(f => {
      if (f.options.length <= 2) return f;
      const options = f.options.filter((_, idx) => idx !== i);
      const correctIndex = f.correctIndex >= options.length ? options.length - 1 : f.correctIndex > i ? f.correctIndex - 1 : f.correctIndex;
      const correctMatching = f.correctMatching.map(v => (v === i ? 0 : v > i ? v - 1 : v));
      return { ...f, options, correctIndex, correctMatching };
    });
  }

  // Open answers
  function setOpenAnswer(i: number, value: string) { setForm(f => { const a = [...f.openAnswers]; a[i] = value; return { ...f, openAnswers: a }; }); }
  function addOpenAnswer() { setForm(f => ({ ...f, openAnswers: [...f.openAnswers, ''] })); }
  function removeOpenAnswer(i: number) { setForm(f => (f.openAnswers.length <= 1 ? f : { ...f, openAnswers: f.openAnswers.filter((_, idx) => idx !== i) })); }

  // Matching items (left column) + their correct target
  function setMatchItem(i: number, value: string) { setForm(f => { const m = [...f.matchItems]; m[i] = value; return { ...f, matchItems: m }; }); }
  function setMatchTarget(i: number, optIdx: number) { setForm(f => { const cm = [...f.correctMatching]; cm[i] = optIdx; return { ...f, correctMatching: cm }; }); }
  function addMatchItem() { setForm(f => ({ ...f, matchItems: [...f.matchItems, ''], correctMatching: [...f.correctMatching, 0] })); }
  function removeMatchItem(i: number) { setForm(f => (f.matchItems.length <= 1 ? f : { ...f, matchItems: f.matchItems.filter((_, idx) => idx !== i), correctMatching: f.correctMatching.filter((_, idx) => idx !== i) })); }

  function handleSubmit() {
    const t = form.type;
    if (!form.stem.trim()) { setValidationError('Sual mətni tələb olunur'); return; }
    if (t === 'mcq') {
      if (form.options.filter(o => o.trim()).length < 2) { setValidationError('Ən azı 2 variant lazımdır'); return; }
      if (form.options.some(o => !o.trim())) { setValidationError('Boş variant qalmamalıdır — silin və ya doldurun'); return; }
    }
    if (t === 'open' && form.openAnswers.filter(a => a.trim()).length === 0) {
      setValidationError('Ən azı bir düzgün cavab əlavə edin — yoxsa sual avtomatik qiymətləndirilə bilməz'); return;
    }
    if (t === 'matching') {
      if (form.matchItems.some(m => !m.trim())) { setValidationError('Bütün uyğunlaşdırma elementləri doldurulmalıdır'); return; }
      if (form.options.filter(o => o.trim()).length < 2) { setValidationError('Ən azı 2 uyğunlaşdırma hədəfi lazımdır'); return; }
      if (form.options.some(o => !o.trim())) { setValidationError('Boş hədəf qalmamalıdır'); return; }
    }
    if (t === 'writing') {
      if (!form.rubric.trim()) { setValidationError('Yazı sualı üçün qiymətləndirmə meyarları (rubric) tələb olunur — AI onunla qiymətləndirir'); return; }
      if (form.maxWords > 0 && form.minWords > 0 && form.maxWords < form.minWords) { setValidationError('Maksimum söz sayı minimumdan az ola bilməz'); return; }
    }
    setValidationError('');

    const matchCount = form.matchItems.filter(m => m.trim()).length;
    const payload = {
      type: t,
      passage: form.passage,
      audioUrl: form.audioUrl,
      imageUrl: form.imageUrl,
      stem: form.stem,
      explanation: form.explanation,
      options: t === 'mcq' || t === 'matching' ? form.options.map(o => o.trim()).filter(Boolean) : [],
      correctIndex: t === 'mcq' ? form.correctIndex : -1,
      openAnswers: t === 'open' ? form.openAnswers.map(a => a.trim()).filter(Boolean) : [],
      matchItems: t === 'matching' ? form.matchItems.map(m => m.trim()).filter(Boolean) : [],
      correctMatching: t === 'matching' ? form.correctMatching.slice(0, matchCount) : [],
      writingTaskType: t === 'writing' ? form.writingTaskType : undefined,
      minWords: t === 'writing' ? form.minWords : undefined,
      maxWords: t === 'writing' ? form.maxWords : undefined,
      rubric: t === 'writing' ? form.rubric : undefined,
    };

    start(async () => {
      const result = isEdit && initial
        ? await updateQuestion(initial.id, payload)
        : await addQuestion({ examId, moduleIndex: form.moduleIndex, ...payload });
      if ('error' in result) { toast.error(result.error); return; }
      toast.success(isEdit ? 'Sual yeniləndi' : 'Sual əlavə edildi');
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 rounded-panel border border-ink-faint bg-surface-2 p-6">
      {/* Type toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute mr-1">Sual növü</span>
        {QUESTION_TYPES.map(t => (
          <button key={t.value} type="button" onClick={() => set('type', t.value)}
            className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              form.type === t.value
                ? 'border-ink bg-ink text-bg'
                : 'border-rule bg-surface text-ink-soft hover:border-ink-faint hover:text-ink'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Passage */}
      <div>
        <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">
          Mətn / Passage <span className="font-normal normal-case">(ixtiyari)</span>
        </label>
        <MathTextarea value={form.passage} onChange={v => set('passage', v)} placeholder="Sual üçün oxuma mətni..." rows={4} showToolbar={false} />
      </div>

      {/* Audio URL */}
      <div>
        <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">
          Audio URL <span className="font-normal normal-case">(ixtiyari, Listening üçün)</span>
        </label>
        <input
          type="text"
          value={form.audioUrl}
          onChange={e => set('audioUrl', e.target.value)}
          placeholder="https://example.com/audio.mp3"
          className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-3.5"
        />
      </div>

      {/* Image / chart URL */}
      <div>
        <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">
          Şəkil / Diaqram URL <span className="font-normal normal-case">(ixtiyari — məs. IELTS Task 1 qrafiki, riyaziyyat diaqramı)</span>
        </label>
        <input
          type="text"
          value={form.imageUrl}
          onChange={e => set('imageUrl', e.target.value)}
          placeholder="https://....public.blob.vercel-storage.com/chart.png"
          className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-3.5"
        />
        <p className="mt-1.5 text-note text-ink-mute">
          ⚠️ Şəkil Vercel Blob Storage-də (<code>*.public.blob.vercel-storage.com</code>) və ya saytın öz domenində (<code>/</code> ilə başlayan yol) saxlanılmalıdır. Başqa domenlər saxlanılarkən rədd ediləcək.
        </p>
        {form.imageUrl.trim() && (
          <div className="mt-2.5 rounded-btn border border-rule bg-surface p-2.5">
            <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute mb-2">Önizləmə</p>
            {/*
              Deliberately a raw <img>, not next/image: this is a live validation
              preview of a URL the admin is still typing. Its job is to FAIL
              visibly for an unreachable or CSP-blocked host (see the message
              below), which is exactly what the image optimizer would mask.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.imageUrl}
              alt="Şəkil önizləməsi"
              className="max-h-48 rounded-lg object-contain"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.style.setProperty('display', 'block'); }}
              onLoad={e => { (e.currentTarget as HTMLImageElement).style.display = 'block'; (e.currentTarget.nextElementSibling as HTMLElement)?.style.setProperty('display', 'none'); }}
            />
            <p className="text-sm text-error" style={{ display: 'none' }}>
              Şəkil yüklənmədi — URL yanlışdır və ya domen CSP tərəfindən bloklanır.
            </p>
          </div>
        )}
      </div>

      {/* Stem */}
      <div>
        <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">
          Sual mətni <span className="text-error">*</span>
        </label>
        <MathTextarea value={form.stem} onChange={v => set('stem', v)} placeholder="Sualı daxil edin... Riyaziyyat üçün $formula$ istifadə edin" rows={3} showToolbar />
      </div>

      {/* MCQ options */}
      {form.type === 'mcq' && (
        <div>
          <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">
            Variantlar <span className="text-error">*</span> <span className="font-normal normal-case">(düzgün cavabı seçmək üçün hərf düyməsini basın)</span>
          </label>
          <div className="space-y-3">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-start gap-2">
                {/* Green marks the correct answer here for the same reason it
                    does in the exam review: it is the answer key. */}
                <button type="button" onClick={() => set('correctIndex', i)}
                  aria-pressed={form.correctIndex === i}
                  className={`mt-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border font-mono text-label transition-colors ${
                    form.correctIndex === i
                      ? 'border-correct bg-correct text-bg'
                      : 'border-rule bg-surface text-ink-mute hover:border-ink hover:text-ink'
                  }`}
                  title="Düzgün cavab kimi işarələ">
                  {OPTION_LABELS[i]}
                </button>
                <div className="flex-1">
                  <MathTextarea value={opt} onChange={v => setOption(i, v)} placeholder={`Variant ${OPTION_LABELS[i]}`} rows={2} showToolbar />
                </div>
                {form.correctIndex === i && <CheckCircle2 size={16} className="mt-2 shrink-0 text-correct" />}
                {form.options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="mt-1.5 shrink-0 cursor-pointer rounded-btn p-1.5 text-ink-mute transition-colors hover:bg-surface-2 hover:text-error" title="Variantı sil">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {form.options.length < 8 && (
            <Button variant="ghost" size="xs" className="mt-3" type="button" onClick={addOption}>
              <Plus size={13} /> Variant əlavə et
            </Button>
          )}
        </div>
      )}

      {/* Open answers */}
      {form.type === 'open' && (
        <div>
          <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">
            Düzgün cavab(lar) <span className="text-error">*</span> <span className="font-normal normal-case">(hər sətir bir qəbul edilən cavab)</span>
          </label>
          <div className="space-y-2">
            {form.openAnswers.map((ans, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={ans} onChange={e => setOpenAnswer(i, e.target.value)} placeholder={`Cavab ${i + 1}`}
                  className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-2.5 flex-1" />
                {form.openAnswers.length > 1 && (
                  <button type="button" onClick={() => removeOpenAnswer(i)} className="shrink-0 cursor-pointer rounded-btn p-1.5 text-ink-mute transition-colors hover:bg-surface-2 hover:text-error" title="Sil">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <Button variant="ghost" size="xs" className="mt-3" type="button" onClick={addOpenAnswer}>
            <Plus size={13} /> Cavab variantı əlavə et
          </Button>
          <p className="mt-1.5 text-note text-ink-mute">Cavablar böyük/kiçik hərf və boşluqlara həssas deyil (məs. &quot;15 April&quot; = &quot;15april&quot;). Bütün düzgün variantları əlavə edin.</p>
        </div>
      )}

      {/* Matching */}
      {form.type === 'matching' && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">
              Hədəflər (sağ sütun) <span className="text-error">*</span>
            </label>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rule bg-surface font-mono text-label text-ink-mute">{OPTION_LABELS[i]}</span>
                  <input type="text" value={opt} onChange={e => setOption(i, e.target.value)} placeholder={`Hədəf ${OPTION_LABELS[i]}`}
                    className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-2.5 flex-1" />
                  {form.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)} className="shrink-0 cursor-pointer rounded-btn p-1.5 text-ink-mute transition-colors hover:bg-surface-2 hover:text-error" title="Sil">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {form.options.length < 8 && (
              <Button variant="ghost" size="xs" className="mt-3" type="button" onClick={addOption}>
                <Plus size={13} /> Hədəf əlavə et
              </Button>
            )}
          </div>
          <div>
            <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">
              Elementlər (sol sütun) və düzgün uyğunluq <span className="text-error">*</span>
            </label>
            <div className="space-y-2">
              {form.matchItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rule bg-surface font-mono text-label text-ink-mute">{i + 1}</span>
                  <input type="text" value={item} onChange={e => setMatchItem(i, e.target.value)} placeholder={`Element ${i + 1}`}
                    className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-2.5 flex-1" />
                  <span className="text-ink-mute text-xs">→</span>
                  <select value={form.correctMatching[i] ?? 0} onChange={e => setMatchTarget(i, parseInt(e.target.value))}
                    className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-2.5 shrink-0">
                    {form.options.map((opt, oi) => (
                      <option key={oi} value={oi}>{OPTION_LABELS[oi]}. {opt.trim() ? opt.slice(0, 24) : `Hədəf ${OPTION_LABELS[oi]}`}</option>
                    ))}
                  </select>
                  {form.matchItems.length > 1 && (
                    <button type="button" onClick={() => removeMatchItem(i)} className="shrink-0 cursor-pointer rounded-btn p-1.5 text-ink-mute transition-colors hover:bg-surface-2 hover:text-error" title="Sil">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="ghost" size="xs" className="mt-3" type="button" onClick={addMatchItem}>
              <Plus size={13} /> Element əlavə et
            </Button>
          </div>
        </div>
      )}

      {/* Writing */}
      {form.type === 'writing' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">Tapşırıq növü</label>
              <select value={form.writingTaskType} onChange={e => set('writingTaskType', e.target.value as WritingTaskType)}
                className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-2.5">
                {WRITING_TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">Min. söz</label>
              <input type="number" min={0} value={form.minWords} onChange={e => set('minWords', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-2.5" />
            </div>
            <div>
              <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">Maks. söz <span className="font-normal normal-case">(0 = limitsiz)</span></label>
              <input type="number" min={0} value={form.maxWords} onChange={e => set('maxWords', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-2.5" />
            </div>
          </div>
          <div>
            <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">
              Qiymətləndirmə meyarları / Rubric <span className="text-error">*</span> <span className="font-normal normal-case">(AI bununla qiymətləndirir)</span>
            </label>
            <textarea rows={4} value={form.rubric} onChange={e => set('rubric', e.target.value)}
              placeholder="Məs.: TA — bütün əsas trendləri və müqayisələri əhatə edir; CC — aydın struktur..."
              className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-3.5 resize-y" />
          </div>
        </div>
      )}

      {/* Explanation */}
      <div>
        <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">
          İzahat <span className="font-normal normal-case">(ixtiyari)</span>
        </label>
        <MathTextarea value={form.explanation} onChange={v => set('explanation', v)} placeholder="Düzgün cavabın izahatı... $formula$ dəstəklənir" rows={2} showToolbar />
      </div>

      {validationError && <p className="text-sm text-error">{validationError}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" className="disabled:opacity-60" type="button" onClick={handleSubmit} disabled={pending}>
          <Save size={14} /> {pending ? 'Saxlanılır...' : isEdit ? 'Yadda saxla' : 'Əlavə et'}
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={onCancel} disabled={pending}>
          <X size={14} /> Ləğv et
        </Button>
      </div>
    </div>
  );
}

// ─── Question card ────────────────────────────────────────────────────────────

/** Row actions: neutral ink, one shared shape — colour only where it means something. */
const cardIconButton =
  'cursor-pointer rounded-btn p-1.5 text-ink-mute transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30';

function QuestionCard({ q, index, examId, onMove, isFirst, isLast }: {
  q: QuestionData; index: number; examId: string;
  onMove: (dir: -1 | 1) => void; isFirst: boolean; isLast: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, startDelete] = useTransition();

  if (editing) return <QuestionForm examId={examId} moduleIndex={q.moduleIndex} initial={q} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />;

  return (
    <div className="flex gap-4 rounded-panel border border-rule bg-surface p-5">
      <div className="w-6 shrink-0 pt-0.5 text-center font-mono text-note tabular-nums text-ink-mute">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className="min-w-0 flex-1">
        {q.passage && (
          <div className="mb-2.5 line-clamp-2 rounded-btn bg-surface-2 px-3 py-2 text-xs text-ink-mute">
            <FileText size={11} className="mr-1 inline" />
            <MathPreview text={q.passage} className="inline" />
          </div>
        )}
        {q.audioUrl && (
          <div className="mb-2.5 line-clamp-1 rounded-btn bg-surface-2 px-3 py-2 text-xs text-ink-soft">
            🎧 Audio əlavə edilib: {q.audioUrl}
          </div>
        )}
        {q.imageUrl && (
          <div className="mb-2.5">
            <Image
              src={q.imageUrl}
              alt="Sual şəkli"
              width={0}
              height={0}
              sizes="16rem"
              className="max-h-32 w-auto rounded-btn border border-rule object-contain"
            />
          </div>
        )}
        <div className="mb-3 text-sm leading-relaxed font-medium text-ink">
          <MathPreview text={q.stem} />
        </div>
        {q.type === 'mcq' && (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {q.options.map((opt, i) => (
              <div key={i} className={`flex items-center gap-2 rounded-btn border px-3 py-1.5 text-xs ${
                i === q.correctIndex
                  ? 'border-correct bg-correct/7 text-correct'
                  : 'border-transparent bg-surface-2 text-ink-soft'
              }`}>
                <span className="shrink-0 font-mono">{OPTION_LABELS[i]}.</span>
                <MathPreview text={opt} className="flex-1" />
                {i === q.correctIndex && <CheckCircle2 size={12} className="ml-auto shrink-0" />}
              </div>
            ))}
          </div>
        )}
        {q.type === 'open' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag>Açıq</Tag>
            {(q.openAnswers ?? []).filter(a => a.trim()).map((a, i) => (
              <Tag tone="ok" key={i}>✓ {a}</Tag>
            ))}
            {(q.openAnswers ?? []).filter(a => a.trim()).length === 0 && (
              <span className="text-note text-error">⚠️ Cavab təyin edilməyib — qiymətləndirilə bilməz</span>
            )}
          </div>
        )}
        {q.type === 'matching' && (
          <div className="space-y-1.5">
            {(q.matchItems ?? []).map((item, i) => {
              const target = q.correctMatching?.[i];
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="shrink-0 font-mono text-label tabular-nums text-ink-mute">{String(i + 1).padStart(2, '0')}</span>
                  <MathPreview text={item} className="flex-1" />
                  <span className="text-ink-faint" aria-hidden>→</span>
                  <Tag tone="ok">
                    {typeof target === 'number' ? `${OPTION_LABELS[target]}. ${q.options[target] ?? ''}` : '—'}
                  </Tag>
                </div>
              );
            })}
          </div>
        )}
        {q.type === 'writing' && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag tone="accent">Yazı · {q.writingTaskType ?? 'general'}</Tag>
              {(q.minWords ?? 0) > 0 && <Tag>Min {q.minWords} söz</Tag>}
              {(q.maxWords ?? 0) > 0 && <Tag>Maks {q.maxWords} söz</Tag>}
            </div>
            {q.rubric?.trim()
              ? <p className="m-0 line-clamp-2 text-note text-ink-mute"><span className="font-medium text-ink-soft">Rubric:</span> {q.rubric}</p>
              : <span className="text-note text-error">⚠️ Rubric təyin edilməyib — AI qiymətləndirə bilməz</span>}
          </div>
        )}
        {q.explanation && (
          <div className="mt-3 border-l border-rule pl-3 text-xs text-ink-mute">
            <MathPreview text={q.explanation} />
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-0.5">
        <button onClick={() => onMove(-1)} disabled={isFirst} className={`${cardIconButton} disabled:cursor-not-allowed`} title="Yuxarı köçür">
          <ChevronUp size={14} />
        </button>
        <button onClick={() => onMove(1)} disabled={isLast} className={`${cardIconButton} disabled:cursor-not-allowed`} title="Aşağı köçür">
          <ChevronDown size={14} />
        </button>
        <button onClick={() => setEditing(true)} className={cardIconButton} title="Düzəliş et">
          <Pencil size={14} />
        </button>
        <button onClick={() => { if (!confirm('Bu sualı silmək istəyirsiniz?')) return; startDelete(async () => { const r = await deleteQuestion(q.id); if ('error' in r) { toast.error(r.error); } else { toast.success('Sual silindi'); router.refresh(); } }); }}
          disabled={deleting} className={`${cardIconButton} hover:text-error!`} title="Sil">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuestionManager({ examId, modules, initialQuestions }: Props) {
  const router = useRouter();
  const [openModules, setOpenModules] = useState<Set<number>>(new Set([0]));
  const [addingTo, setAddingTo] = useState<number | null>(null);

  function moveQuestion(moduleIndex: number, qs: QuestionData[], from: number, dir: -1 | 1) {
    const to = from + dir;
    if (to < 0 || to >= qs.length) return;
    const ids = qs.map(x => x.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    void reorderQuestions(examId, moduleIndex, ids).then(r => {
      if ('error' in r) toast.error(r.error); else router.refresh();
    });
  }

  function toggleModule(i: number) {
    setOpenModules(prev => { const next = new Set(prev); if (next.has(i)) next.delete(i); else next.add(i); return next; });
  }

  const questionsByModule = new Map<number, QuestionData[]>();
  for (const q of initialQuestions) {
    if (!questionsByModule.has(q.moduleIndex)) questionsByModule.set(q.moduleIndex, []);
    questionsByModule.get(q.moduleIndex)!.push(q);
  }

  return (
    <div className="space-y-4">
      {modules.map(mod => {
        const qs = questionsByModule.get(mod.index) ?? [];
        const isOpen = openModules.has(mod.index);
        const isAdding = addingTo === mod.index;

        return (
          <div  key={mod.index} className="rounded-panel border border-rule bg-surface">
            <button type="button" onClick={() => toggleModule(mod.index)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2">
              <div className="flex min-w-0 items-baseline gap-3.5">
                <span className="font-mono text-note tabular-nums text-ink-mute">
                  {String(mod.index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-body font-medium tracking-[-0.01em] text-ink">{mod.name}</p>
                  <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-1.5">
                    {qs.length} / {mod.questionCount} sual
                    {qs.length < mod.questionCount && <span className="ml-1 text-warn">· {mod.questionCount - qs.length} çatışmır</span>}
                    {qs.length >= mod.questionCount && mod.questionCount > 0 && <span className="ml-1 text-ok">· Tam</span>}
                  </p>
                </div>
              </div>
              {isOpen ? <ChevronUp size={16} className="shrink-0 text-ink-mute" /> : <ChevronDown size={16} className="shrink-0 text-ink-mute" />}
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-rule px-5 py-5">
                {qs.length === 0 && !isAdding && (
                  <p className="m-0 py-8 text-center text-note text-ink-mute">Bu modulda hələ sual yoxdur.</p>
                )}
                {qs.map((q, i) => (
                  <QuestionCard key={q.id} q={q} index={i} examId={examId}
                    onMove={dir => moveQuestion(mod.index, qs, i, dir)}
                    isFirst={i === 0} isLast={i === qs.length - 1} />
                ))}
                {isAdding && <QuestionForm examId={examId} moduleIndex={mod.index} onDone={() => setAddingTo(null)} onCancel={() => setAddingTo(null)} />}
                {!isAdding && (
                  <button type="button" onClick={() => setAddingTo(mod.index)}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-panel border border-dashed border-ink-faint py-3.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink">
                    <Plus size={15} /> Sual əlavə et
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
