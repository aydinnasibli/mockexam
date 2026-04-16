'use client';

import { useState, useTransition } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2,
  Circle, FileText, Pencil, X, Save,
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

function emptyForm(moduleIndex: number, type: QuestionType = 'mcq') {
  return {
    moduleIndex,
    type,
    passage: '',
    stem: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
  };
}

type FormState = ReturnType<typeof emptyForm>;

function QuestionForm({
  examId,
  moduleIndex,
  initial,
  onDone,
  onCancel,
}: {
  examId: string;
  moduleIndex: number;
  initial?: QuestionData;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          moduleIndex: initial.moduleIndex,
          type: initial.type,
          passage: initial.passage,
          stem: initial.stem,
          options: initial.options.length === 4 ? [...initial.options] : ['', '', '', ''],
          correctIndex: initial.correctIndex,
          explanation: initial.explanation,
        }
      : emptyForm(moduleIndex)
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function setOption(i: number, value: string) {
    setForm(f => {
      const options = [...f.options];
      options[i] = value;
      return { ...f, options };
    });
  }

  function handleSubmit() {
    if (!form.stem.trim()) { setError('Sual mətni tələb olunur'); return; }
    if (form.type === 'mcq' && form.options.some(o => !o.trim())) {
      setError('Bütün variantlar doldurulmalıdır');
      return;
    }
    setError('');

    start(async () => {
      let result;
      if (isEdit && initial) {
        result = await updateQuestion(initial.id, {
          type: form.type,
          passage: form.passage,
          stem: form.stem,
          options: form.type === 'mcq' ? form.options : [],
          correctIndex: form.type === 'mcq' ? form.correctIndex : -1,
          explanation: form.explanation,
        });
      } else {
        result = await addQuestion({
          examId,
          moduleIndex: form.moduleIndex,
          type: form.type,
          passage: form.passage,
          stem: form.stem,
          options: form.type === 'mcq' ? form.options : [],
          correctIndex: form.type === 'mcq' ? form.correctIndex : -1,
          explanation: form.explanation,
        });
      }
      if ('error' in result) { setError(result.error); return; }
      onDone();
    });
  }

  return (
    <div className="border border-primary/20 rounded-2xl p-6 bg-primary/5 space-y-4">
      {/* Type toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Sual növü:</span>
        <button
          type="button"
          onClick={() => set('type', 'mcq')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${form.type === 'mcq' ? 'bg-primary text-white' : 'bg-white border border-outline-variant text-on-surface-variant'}`}
        >
          Çoxseçimli (MCQ)
        </button>
        <button
          type="button"
          onClick={() => set('type', 'open')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${form.type === 'open' ? 'bg-primary text-white' : 'bg-white border border-outline-variant text-on-surface-variant'}`}
        >
          Açıq (Yazı/Nitq)
        </button>
      </div>

      {/* Passage */}
      <div>
        <label className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-widest">
          Mətn/Passage <span className="font-normal normal-case">(ixtiyari)</span>
        </label>
        <textarea
          rows={4}
          value={form.passage}
          onChange={e => set('passage', e.target.value)}
          placeholder="Sual üçün oxuma mətni..."
          className="w-full rounded-xl border border-outline-variant px-4 py-3 text-sm text-on-surface bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
        />
      </div>

      {/* Stem */}
      <div>
        <label className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-widest">
          Sual mətni <span className="text-error">*</span>
        </label>
        <textarea
          rows={3}
          value={form.stem}
          onChange={e => set('stem', e.target.value)}
          placeholder="Sualı daxil edin..."
          className="w-full rounded-xl border border-outline-variant px-4 py-3 text-sm text-on-surface bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
        />
      </div>

      {/* MCQ options */}
      {form.type === 'mcq' && (
        <div>
          <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
            Variantlar <span className="text-error">*</span>
          </label>
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set('correctIndex', i)}
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-colors ${
                    form.correctIndex === i
                      ? 'bg-secondary text-white'
                      : 'bg-white border-2 border-outline-variant text-on-surface-variant hover:border-secondary'
                  }`}
                  title="Düzgün cavab"
                >
                  {OPTION_LABELS[i]}
                </button>
                <input
                  type="text"
                  value={opt}
                  onChange={e => setOption(i, e.target.value)}
                  placeholder={`Variant ${OPTION_LABELS[i]}`}
                  className="flex-1 rounded-xl border border-outline-variant px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {form.correctIndex === i && (
                  <CheckCircle2 size={16} className="text-secondary shrink-0" />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-on-surface-variant mt-2">Düzgün cavabı seçmək üçün hərf düyməsini basın.</p>
        </div>
      )}

      {/* Explanation */}
      <div>
        <label className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-widest">
          İzahat <span className="font-normal normal-case">(ixtiyari)</span>
        </label>
        <textarea
          rows={2}
          value={form.explanation}
          onChange={e => set('explanation', e.target.value)}
          placeholder="Düzgün cavabın izahatı..."
          className="w-full rounded-xl border border-outline-variant px-4 py-3 text-sm text-on-surface bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
        />
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="flex items-center gap-2 px-5 py-2.5 editorial-gradient text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <Save size={15} /> {pending ? 'Saxlanılır...' : isEdit ? 'Yadda saxla' : 'Əlavə et'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <X size={15} /> Ləğv et
        </button>
      </div>
    </div>
  );
}

function QuestionCard({
  q,
  index,
  examId,
}: {
  q: QuestionData;
  index: number;
  examId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, startDelete] = useTransition();

  function handleDelete() {
    if (!confirm('Bu sualı silmək istəyirsiniz?')) return;
    startDelete(() => deleteQuestion(q.id));
  }

  if (editing) {
    return (
      <QuestionForm
        examId={examId}
        moduleIndex={q.moduleIndex}
        initial={q}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-outline-variant/40 p-5 flex gap-4">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-xs font-black text-on-surface-variant">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        {q.passage && (
          <div className="text-xs text-on-surface-variant bg-surface-container rounded-lg px-3 py-2 mb-2 line-clamp-2 italic">
            <FileText size={11} className="inline mr-1" />
            {q.passage}
          </div>
        )}
        <p className="text-sm font-semibold text-on-surface leading-relaxed mb-3">{q.stem}</p>
        {q.type === 'mcq' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {q.options.map((opt, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                  i === q.correctIndex
                    ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                <span className="font-black">{OPTION_LABELS[i]}.</span> {opt}
                {i === q.correctIndex && <CheckCircle2 size={12} className="ml-auto shrink-0 text-emerald-600" />}
              </div>
            ))}
          </div>
        )}
        {q.type === 'open' && (
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
            Açıq sual
          </span>
        )}
        {q.explanation && (
          <p className="text-xs text-on-surface-variant mt-2 italic border-l-2 border-secondary/40 pl-2">
            {q.explanation}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg hover:bg-secondary/10 text-secondary transition-colors"
          title="Düzəliş et"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
          title="Sil"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function QuestionManager({ examId, modules, initialQuestions }: Props) {
  const [openModules, setOpenModules] = useState<Set<number>>(new Set([0]));
  const [addingTo, setAddingTo] = useState<number | null>(null);

  function toggleModule(i: number) {
    setOpenModules(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
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
            {/* Module header */}
            <button
              type="button"
              onClick={() => toggleModule(mod.index)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container-low/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-secondary-fixed/60 text-secondary flex items-center justify-center text-xs font-black">
                  {mod.index + 1}
                </span>
                <div className="text-left">
                  <p className="text-sm font-bold text-primary">{mod.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {qs.length} / {mod.questionCount} sual
                    {qs.length < mod.questionCount && (
                      <span className="ml-1 text-amber-600 font-medium">
                        · {mod.questionCount - qs.length} çatışmır
                      </span>
                    )}
                    {qs.length >= mod.questionCount && mod.questionCount > 0 && (
                      <span className="ml-1 text-emerald-600 font-medium">· Tam</span>
                    )}
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

                {qs.map((q, i) => (
                  <QuestionCard key={q.id} q={q} index={i} examId={examId} />
                ))}

                {isAdding && (
                  <QuestionForm
                    examId={examId}
                    moduleIndex={mod.index}
                    onDone={() => setAddingTo(null)}
                    onCancel={() => setAddingTo(null)}
                  />
                )}

                {!isAdding && (
                  <button
                    type="button"
                    onClick={() => setAddingTo(mod.index)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-outline-variant rounded-xl text-sm font-bold text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                  >
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
