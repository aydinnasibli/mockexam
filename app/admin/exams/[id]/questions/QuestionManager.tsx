'use client';

import 'katex/dist/katex.min.css';
import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import katex from 'katex';
import {
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2,
  Circle, FileText, Pencil, X, Save, Sigma, Eye, EyeOff,
} from 'lucide-react';
import { addQuestion, updateQuestion, deleteQuestion } from '@/lib/actions/questions';
import type { QuestionData } from '@/lib/actions/questions';
import type { QuestionType } from '@/lib/models/Question';

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

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

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

// ─── Math rendering helpers ──────────────────────────────────────────────────

function renderMath(text: string): string {
  // Replace $$...$$ (block) then $...$ (inline)
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
      try { return katex.renderToString(expr, { displayMode: true, throwOnError: false }); }
      catch { return _; }
    })
    .replace(/\$([^$\n]+?)\$/g, (_, expr) => {
      try { return katex.renderToString(expr, { displayMode: false, throwOnError: false }); }
      catch { return _; }
    });
}

function MathPreview({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = renderMath(text) || '<span class="text-on-surface-variant italic text-xs">Önizləmə...</span>';
  }, [text]);
  return <div ref={ref} className={`prose prose-sm max-w-none leading-relaxed ${className}`} />;
}

// ─── Math toolbar ────────────────────────────────────────────────────────────

function MathToolbar({ onInsert }: { onInsert: (s: string) => void }) {
  const [tab, setTab] = useState<'symbols' | 'templates'>('symbols');
  return (
    <div className="border border-outline-variant/60 rounded-xl bg-surface-container-low overflow-hidden">
      <div className="flex border-b border-outline-variant/40">
        <button type="button" onClick={() => setTab('symbols')}
          className={`flex-1 px-3 py-2 text-xs font-bold transition-colors ${tab === 'symbols' ? 'bg-white text-primary' : 'text-on-surface-variant hover:bg-white/50'}`}>
          Simvollar
        </button>
        <button type="button" onClick={() => setTab('templates')}
          className={`flex-1 px-3 py-2 text-xs font-bold transition-colors ${tab === 'templates' ? 'bg-white text-primary' : 'text-on-surface-variant hover:bg-white/50'}`}>
          Şablonlar
        </button>
      </div>
      <div className="p-2">
        {tab === 'symbols' ? (
          <div className="flex flex-wrap gap-1">
            {MATH_SYMBOLS.map(s => (
              <button key={s.label} type="button" onClick={() => onInsert(`$${s.insert}$`)}
                className="px-2 py-1 rounded-lg bg-white border border-outline-variant/40 text-xs font-mono hover:border-primary hover:text-primary transition-colors">
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {MATH_TEMPLATES.map(t => (
              <button key={t.label} type="button" onClick={() => onInsert(`$${t.insert}$`)}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white border border-outline-variant/40 text-xs hover:border-primary hover:text-primary transition-colors group">
                <span className="font-semibold">{t.label}</span>
                <MathPreview text={`$${t.insert}$`} className="text-[10px] opacity-70 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="px-3 pb-2 text-[10px] text-on-surface-variant">İnline: <code>$formula$</code> · Blok: <code>$$formula$$</code></p>
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
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${toolbar ? 'bg-primary text-white' : 'border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'}`}>
            <Sigma size={12} /> Riyaziyyat
          </button>
        )}
        <button type="button" onClick={() => setPreview(p => !p)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${preview ? 'bg-secondary text-white' : 'border border-outline-variant text-on-surface-variant hover:border-secondary hover:text-secondary'}`}>
          {preview ? <EyeOff size={12} /> : <Eye size={12} />}
          {preview ? 'Redaktə' : 'Önizləmə'}
        </button>
      </div>
      {toolbar && showToolbar && <MathToolbar onInsert={insertAtCursor} />}
      {preview ? (
        <div className="min-h-[80px] border border-outline-variant rounded-xl px-4 py-3 bg-white">
          {value ? <MathPreview text={value} /> : <span className="text-on-surface-variant text-xs italic">Mətn yoxdur...</span>}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-outline-variant px-4 py-3 text-sm text-on-surface bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono"
        />
      )}
    </div>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

function emptyForm(moduleIndex: number, type: QuestionType = 'mcq') {
  return { moduleIndex, type, passage: '', stem: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' };
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
  const [form, setForm] = useState<FormState>(
    initial
      ? { moduleIndex: initial.moduleIndex, type: initial.type, passage: initial.passage, stem: initial.stem, options: initial.options.length === 4 ? [...initial.options] : ['', '', '', ''], correctIndex: initial.correctIndex, explanation: initial.explanation }
      : emptyForm(moduleIndex)
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  function set<K extends keyof FormState>(key: K, value: FormState[K]) { setForm(f => ({ ...f, [key]: value })); }
  function setOption(i: number, value: string) { setForm(f => { const options = [...f.options]; options[i] = value; return { ...f, options }; }); }

  function handleSubmit() {
    if (!form.stem.trim()) { setError('Sual mətni tələb olunur'); return; }
    if (form.type === 'mcq' && form.options.some(o => !o.trim())) { setError('Bütün variantlar doldurulmalıdır'); return; }
    setError('');
    start(async () => {
      let result;
      if (isEdit && initial) {
        result = await updateQuestion(initial.id, { type: form.type, passage: form.passage, stem: form.stem, options: form.type === 'mcq' ? form.options : [], correctIndex: form.type === 'mcq' ? form.correctIndex : -1, explanation: form.explanation });
      } else {
        result = await addQuestion({ examId, moduleIndex: form.moduleIndex, type: form.type, passage: form.passage, stem: form.stem, options: form.type === 'mcq' ? form.options : [], correctIndex: form.type === 'mcq' ? form.correctIndex : -1, explanation: form.explanation });
      }
      if ('error' in result) { setError(result.error); return; }
      onDone();
    });
  }

  return (
    <div className="border border-primary/20 rounded-2xl p-6 bg-primary/5 space-y-5">
      {/* Type toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Sual növü:</span>
        {(['mcq', 'open'] as QuestionType[]).map(t => (
          <button key={t} type="button" onClick={() => set('type', t)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${form.type === t ? 'bg-primary text-white' : 'bg-white border border-outline-variant text-on-surface-variant'}`}>
            {t === 'mcq' ? 'Çoxseçimli (MCQ)' : 'Açıq (Yazı/Nitq)'}
          </button>
        ))}
      </div>

      {/* Passage */}
      <div>
        <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
          Mətn / Passage <span className="font-normal normal-case">(ixtiyari)</span>
        </label>
        <MathTextarea value={form.passage} onChange={v => set('passage', v)} placeholder="Sual üçün oxuma mətni..." rows={4} showToolbar={false} />
      </div>

      {/* Stem */}
      <div>
        <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
          Sual mətni <span className="text-error">*</span>
        </label>
        <MathTextarea value={form.stem} onChange={v => set('stem', v)} placeholder="Sualı daxil edin... Riyaziyyat üçün $formula$ istifadə edin" rows={3} showToolbar />
      </div>

      {/* MCQ options */}
      {form.type === 'mcq' && (
        <div>
          <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
            Variantlar <span className="text-error">*</span> <span className="font-normal normal-case">(düzgün cavabı seçmək üçün hərf düyməsini basın)</span>
          </label>
          <div className="space-y-3">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-start gap-3">
                <button type="button" onClick={() => set('correctIndex', i)}
                  className={`shrink-0 mt-1 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-colors ${form.correctIndex === i ? 'bg-secondary text-white' : 'bg-white border-2 border-outline-variant text-on-surface-variant hover:border-secondary'}`}>
                  {OPTION_LABELS[i]}
                </button>
                <div className="flex-1">
                  <MathTextarea value={opt} onChange={v => setOption(i, v)} placeholder={`Variant ${OPTION_LABELS[i]}`} rows={2} showToolbar />
                </div>
                {form.correctIndex === i && <CheckCircle2 size={16} className="text-secondary shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      <div>
        <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
          İzahat <span className="font-normal normal-case">(ixtiyari)</span>
        </label>
        <MathTextarea value={form.explanation} onChange={v => set('explanation', v)} placeholder="Düzgün cavabın izahatı... $formula$ dəstəklənir" rows={2} showToolbar />
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={handleSubmit} disabled={pending}
          className="flex items-center gap-2 px-5 py-2.5 editorial-gradient text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60">
          <Save size={15} /> {pending ? 'Saxlanılır...' : isEdit ? 'Yadda saxla' : 'Əlavə et'}
        </button>
        <button type="button" onClick={onCancel} disabled={pending}
          className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
          <X size={15} /> Ləğv et
        </button>
      </div>
    </div>
  );
}

// ─── Question card ────────────────────────────────────────────────────────────

function QuestionCard({ q, index, examId }: { q: QuestionData; index: number; examId: string }) {
  const [editing, setEditing] = useState(false);
  const [deleting, startDelete] = useTransition();

  if (editing) return <QuestionForm examId={examId} moduleIndex={q.moduleIndex} initial={q} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />;

  return (
    <div className="bg-white rounded-xl border border-outline-variant/40 p-5 flex gap-4">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-xs font-black text-on-surface-variant">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        {q.passage && (
          <div className="text-xs text-on-surface-variant bg-surface-container rounded-lg px-3 py-2 mb-2 line-clamp-2 italic">
            <FileText size={11} className="inline mr-1" />
            <MathPreview text={q.passage} className="inline" />
          </div>
        )}
        <div className="text-sm font-semibold text-on-surface leading-relaxed mb-3">
          <MathPreview text={q.stem} />
        </div>
        {q.type === 'mcq' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {q.options.map((opt, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${i === q.correctIndex ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' : 'bg-surface-container text-on-surface-variant'}`}>
                <span className="font-black shrink-0">{OPTION_LABELS[i]}.</span>
                <MathPreview text={opt} className="flex-1" />
                {i === q.correctIndex && <CheckCircle2 size={12} className="ml-auto shrink-0 text-emerald-600" />}
              </div>
            ))}
          </div>
        )}
        {q.type === 'open' && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-amber-100 text-amber-700 rounded-full">Açıq sual</span>}
        {q.explanation && (
          <div className="text-xs text-on-surface-variant mt-2 border-l-2 border-secondary/40 pl-2">
            <MathPreview text={q.explanation} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-secondary/10 text-secondary transition-colors" title="Düzəliş et">
          <Pencil size={14} />
        </button>
        <button onClick={() => { if (!confirm('Bu sualı silmək istəyirsiniz?')) return; startDelete(() => deleteQuestion(q.id)); }}
          disabled={deleting} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50" title="Sil">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuestionManager({ examId, modules, initialQuestions }: Props) {
  const [openModules, setOpenModules] = useState<Set<number>>(new Set([0]));
  const [addingTo, setAddingTo] = useState<number | null>(null);

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
          <div key={mod.index} className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden">
            <button type="button" onClick={() => toggleModule(mod.index)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container-low/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-secondary-fixed/60 text-secondary flex items-center justify-center text-xs font-black">{mod.index + 1}</span>
                <div className="text-left">
                  <p className="text-sm font-bold text-primary">{mod.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {qs.length} / {mod.questionCount} sual
                    {qs.length < mod.questionCount && <span className="ml-1 text-amber-600 font-medium">· {mod.questionCount - qs.length} çatışmır</span>}
                    {qs.length >= mod.questionCount && mod.questionCount > 0 && <span className="ml-1 text-emerald-600 font-medium">· Tam</span>}
                  </p>
                </div>
              </div>
              {isOpen ? <ChevronUp size={16} className="text-on-surface-variant" /> : <ChevronDown size={16} className="text-on-surface-variant" />}
            </button>

            {isOpen && (
              <div className="px-6 pb-6 space-y-3">
                {qs.length === 0 && !isAdding && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Circle className="text-outline mb-2" size={28} />
                    <p className="text-sm text-on-surface-variant">Bu modulda hələ sual yoxdur.</p>
                  </div>
                )}
                {qs.map((q, i) => <QuestionCard key={q.id} q={q} index={i} examId={examId} />)}
                {isAdding && <QuestionForm examId={examId} moduleIndex={mod.index} onDone={() => setAddingTo(null)} onCancel={() => setAddingTo(null)} />}
                {!isAdding && (
                  <button type="button" onClick={() => setAddingTo(mod.index)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-outline-variant rounded-xl text-sm font-bold text-on-surface-variant hover:border-primary hover:text-primary transition-colors">
                    <Plus size={16} /> Sual əlavə et
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
