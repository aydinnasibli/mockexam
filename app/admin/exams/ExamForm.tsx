'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, X, Save, Loader2, ArrowUp, ArrowDown,
  Clock, HelpCircle, Coffee, ChevronDown, ChevronRight, RefreshCw,
} from 'lucide-react';
import { createExam, updateExam, type ActionResult, type ParsedModule } from '@/lib/actions/admin';
import { MODULE_TYPES } from '@/lib/exam-types';

// ─── Exam types ───────────────────────────────────────────────────────────────

const EXAM_TYPES = [
  { value: 'sat',   label: 'SAT' },
  { value: 'ielts', label: 'IELTS' },
  { value: 'toefl', label: 'TOEFL' },
];

// ─── Type-specific module presets ─────────────────────────────────────────────

type PresetModule = Omit<ParsedModule, never>;

const EXAM_PRESETS: Record<string, PresetModule[]> = {
  sat: [
    { name: 'Reading & Writing — Module 1', type: 'reading',  durationMinutes: 32, questions: 27, breakAfterMinutes: 0,  isAdaptive: false, instructions: 'Bu bölmədə 27 sual var. Hər sualın yalnız bir düzgün cavabı var.' },
    { name: 'Reading & Writing — Module 2', type: 'reading',  durationMinutes: 32, questions: 27, breakAfterMinutes: 10, isAdaptive: true,  instructions: 'Adaptiv modul: çətinlik səviyyəsi 1-ci modulun nəticəsinə əsasən müəyyən edilir.' },
    { name: 'Math — Module 1',              type: 'math',     durationMinutes: 35, questions: 22, breakAfterMinutes: 0,  isAdaptive: false, instructions: '22 sualdan 4-ü açıq cavab formatındadır.' },
    { name: 'Math — Module 2',              type: 'math',     durationMinutes: 35, questions: 22, breakAfterMinutes: 0,  isAdaptive: true,  instructions: 'Adaptiv modul: çətinlik səviyyəsi 1-ci modulun nəticəsinə əsasən müəyyən edilir.' },
  ],
  ielts: [
    { name: 'Listening', type: 'listening', durationMinutes: 30, questions: 40, breakAfterMinutes: 0, isAdaptive: false, instructions: '4 hissə, 40 sual. Hər cavab 1 bal.' },
    { name: 'Reading',   type: 'reading',   durationMinutes: 60, questions: 40, breakAfterMinutes: 0, isAdaptive: false, instructions: '3 mətn, 40 sual. Academic version.' },
    { name: 'Writing',   type: 'writing',   durationMinutes: 60, questions: 2,  breakAfterMinutes: 0, isAdaptive: false, instructions: 'Task 1: qrafik/diaqram (150+ söz). Task 2: esse (250+ söz).' },
    { name: 'Speaking',  type: 'speaking',  durationMinutes: 14, questions: 0,  breakAfterMinutes: 0, isAdaptive: false, instructions: '3 hissə: Giriş/Müsahibə, Uzun nitq (cue card), Müzakirə.' },
  ],
  toefl: [
    { name: 'Reading',   type: 'reading',   durationMinutes: 35, questions: 20, breakAfterMinutes: 0,  isAdaptive: false, instructions: '2 akademik mətn, hər birindən 10 sual.' },
    { name: 'Listening', type: 'listening', durationMinutes: 36, questions: 28, breakAfterMinutes: 10, isAdaptive: false, instructions: '3 lecture + 2 conversation. 10 dəqiqəlik fasilə bu bölmədən sonra.' },
    { name: 'Speaking',  type: 'speaking',  durationMinutes: 16, questions: 4,  breakAfterMinutes: 0,  isAdaptive: false, instructions: '1 Independent + 3 Integrated tapşırıq.' },
    { name: 'Writing',   type: 'writing',   durationMinutes: 29, questions: 2,  breakAfterMinutes: 0,  isAdaptive: false, instructions: '1 Integrated (20 dəq) + 1 Academic Discussion (10 dəq).' },
  ],
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModuleRow extends ParsedModule {
  _key: string;
  _expanded: boolean;
}

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function makePreset(type: string): ModuleRow[] {
  const preset = EXAM_PRESETS[type];
  if (!preset?.length) return [emptyModule()];
  return preset.map(m => ({ ...m, _key: makeKey(), _expanded: false }));
}

function emptyModule(): ModuleRow {
  return {
    _key: makeKey(), _expanded: true,
    name: '', type: 'general',
    durationMinutes: 30, questions: 0,
    breakAfterMinutes: 0, isAdaptive: false, instructions: '',
  };
}

export interface ExamFormDefaults {
  examId?: string;
  title?: string;
  type?: string;
  description?: string;
  tag?: string;
  price?: number;
  features?: string[];
  isActive?: boolean;
  modules?: ParsedModule[];
}

interface Props {
  mode: 'create' | 'edit';
  examId?: string;
  defaultValues?: ExamFormDefaults;
}

const initialState: ActionResult = {};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExamForm({ mode, examId, defaultValues }: Props) {
  const router = useRouter();

  const action = mode === 'edit' && examId
    ? updateExam.bind(null, examId)
    : createExam;

  const [state, formAction, pending] = useActionState(action, initialState);

  const [examType, setExamType] = useState(defaultValues?.type ?? 'sat');

  const [features, setFeatures] = useState<string[]>(
    defaultValues?.features?.length ? defaultValues.features : ['']
  );

  const [modules, setModules] = useState<ModuleRow[]>(() => {
    if (defaultValues?.modules?.length) {
      return defaultValues.modules.map(m => ({ ...m, _key: makeKey(), _expanded: false }));
    }
    return makePreset(defaultValues?.type ?? 'sat');
  });

  // ── Module helpers ──────────────────────────────────────────────────────────

  const addModule = () => setModules(prev => [...prev, emptyModule()]);

  const removeModule = (key: string) =>
    setModules(prev => prev.filter(m => m._key !== key));

  const moveModule = (key: string, dir: -1 | 1) =>
    setModules(prev => {
      const i = prev.findIndex(m => m._key === key);
      if (i < 0) return prev;
      const next = i + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[i], arr[next]] = [arr[next], arr[i]];
      return arr;
    });

  const updateModule = (key: string, patch: Partial<ModuleRow>) =>
    setModules(prev => prev.map(m => m._key === key ? { ...m, ...patch } : m));

  const toggleExpanded = (key: string) =>
    setModules(prev => prev.map(m => m._key === key ? { ...m, _expanded: !m._expanded } : m));

  const handleTypeChange = (newType: string) => {
    setExamType(newType);
    if (mode === 'create') {
      setModules(makePreset(newType));
    }
  };

  const applyPreset = () => {
    const label = EXAM_TYPES.find(t => t.value === examType)?.label ?? examType.toUpperCase();
    if (confirm(`Mövcud modulları "${label}" presetilə əvəz etmək istəyirsiniz?`)) {
      setModules(makePreset(examType));
    }
  };

  // ── Computed totals ─────────────────────────────────────────────────────────

  const totalQuestions = modules.reduce((s, m) => s + (m.questions || 0), 0);
  const totalBreak     = modules.reduce((s, m) => s + (m.breakAfterMinutes || 0), 0);
  const totalDuration  = modules.reduce((s, m) => s + m.durationMinutes + (m.breakAfterMinutes || 0), 0);
  const examMinutes    = totalDuration - totalBreak;

  const modulesJson = JSON.stringify(
    modules.map(({ _key, _expanded, ...rest }) => rest)
  );

  // ── Feature helpers ─────────────────────────────────────────────────────────

  const addFeature    = () => setFeatures(f => [...f, '']);
  const removeFeature = (i: number) => setFeatures(f => f.filter((_, idx) => idx !== i));
  const setFeature    = (i: number, v: string) =>
    setFeatures(f => { const n = [...f]; n[i] = v; return n; });

  return (
    <form action={formAction} className="max-w-4xl space-y-6">
      <input type="hidden" name="modulesJson" value={modulesJson} />

      {state.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-semibold">
          {state.error}
        </div>
      )}

      {/* ── Basic info ─────────────────────────────────────────────────────── */}
      <Section title="Əsas Məlumatlar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="İmtahan ID *" hint="Kiçik hərf, rəqəm, tire (maks. 64). Sonradan dəyişdirilmir.">
            <input
              type="text" name="examId"
              defaultValue={mode === 'edit' ? examId : (defaultValues?.examId ?? '')}
              placeholder="sat-mock-4"
              required disabled={mode === 'edit'}
              className="input-field disabled:bg-surface-container disabled:cursor-not-allowed"
            />
          </Field>
          <Field label="Növ *">
            <select
              name="type"
              value={examType}
              onChange={e => handleTypeChange(e.target.value)}
              className="input-field"
              required
            >
              {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Başlıq *" className="sm:col-span-2">
            <input type="text" name="title" defaultValue={defaultValues?.title ?? ''} placeholder="Digital SAT Full Mock #4" required className="input-field" />
          </Field>
          <Field label="Etiket (Tag) *">
            <input type="text" name="tag" defaultValue={defaultValues?.tag ?? ''} placeholder="SAT" required className="input-field" />
          </Field>
          <Field label="Qiymət (₼) *">
            <input type="number" name="price" min="0" step="0.01" defaultValue={defaultValues?.price ?? ''} placeholder="12" required className="input-field" />
          </Field>
          <Field label="Status" className="sm:col-span-2">
            <label className="flex items-center gap-3 h-11 cursor-pointer select-none">
              <input type="checkbox" name="isActive" value="true" defaultChecked={defaultValues?.isActive !== false} className="w-4 h-4 accent-secondary" />
              <span className="text-sm font-medium text-on-surface">Aktiv (istifadəçilərə görünür)</span>
            </label>
          </Field>
        </div>
      </Section>

      {/* ── Description ────────────────────────────────────────────────────── */}
      <Section title="Təsvir">
        <textarea name="description" defaultValue={defaultValues?.description ?? ''} rows={4} placeholder="İmtahan haqqında ətraflı məlumat..." required className="input-field w-full resize-none" />
      </Section>

      {/* ── Modules ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-outline-variant/20">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-primary font-headline">Modullar / Bölmələr</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Hər imtahan bir və ya bir neçə moduldan ibarət olur. Sıra mühümdür.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button" onClick={applyPreset}
                className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary border border-outline-variant/50 px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors"
              >
                <RefreshCw size={12} />
                {EXAM_TYPES.find(t => t.value === examType)?.label ?? examType.toUpperCase()} preseti
              </button>
              <button type="button" onClick={addModule} className="flex items-center gap-1.5 text-sm font-bold text-secondary hover:underline">
                <Plus size={15} /> Modul əlavə et
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-outline-variant/10">
          {modules.map((mod, idx) => (
            <ModuleCard
              key={mod._key}
              mod={mod}
              index={idx}
              total={modules.length}
              onUpdate={patch => updateModule(mod._key, patch)}
              onRemove={() => removeModule(mod._key)}
              onMoveUp={() => moveModule(mod._key, -1)}
              onMoveDown={() => moveModule(mod._key, 1)}
              onToggle={() => toggleExpanded(mod._key)}
            />
          ))}
        </div>

        {/* Totals summary */}
        <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant/20">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <HelpCircle size={15} className="text-secondary" />
              <span className="text-on-surface-variant">Ümumi sual:</span>
              <span className="font-black text-primary">{totalQuestions}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-secondary" />
              <span className="text-on-surface-variant">İmtahan müddəti:</span>
              <span className="font-black text-primary">{examMinutes} dəq</span>
            </div>
            {totalBreak > 0 && (
              <div className="flex items-center gap-2">
                <Coffee size={15} className="text-secondary" />
                <span className="text-on-surface-variant">Fasilə:</span>
                <span className="font-black text-primary">{totalBreak} dəq</span>
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto text-on-surface-variant font-semibold">
              Ümumi: {totalDuration} dəq
            </div>
          </div>
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <Section
        title="Xüsusiyyətlər"
        action={<button type="button" onClick={addFeature} className="flex items-center gap-1.5 text-sm font-bold text-secondary hover:underline"><Plus size={14} /> Əlavə et</button>}
      >
        <div className="space-y-3">
          {features.map((f, i) => (
            <div key={i} className="flex gap-3">
              <input type="text" name="features" value={f} onChange={e => setFeature(i, e.target.value)} placeholder={`Xüsusiyyət ${i + 1}`} className="input-field flex-1" />
              {features.length > 1 && (
                <button type="button" onClick={() => removeFeature(i)} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="editorial-gradient text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity disabled:opacity-60">
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {mode === 'create' ? 'İmtahan Yarat' : 'Dəyişiklikləri Saxla'}
        </button>
        <button type="button" onClick={() => router.back()} className="px-6 py-3 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm">
          Ləğv et
        </button>
      </div>
    </form>
  );
}

// ─── Module Card ──────────────────────────────────────────────────────────────

interface ModuleCardProps {
  mod: ModuleRow;
  index: number;
  total: number;
  onUpdate: (patch: Partial<ModuleRow>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: () => void;
}

function ModuleCard({ mod, index, total, onUpdate, onRemove, onMoveUp, onMoveDown, onToggle }: ModuleCardProps) {
  return (
    <div className="px-6 py-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="p-1 rounded hover:bg-surface-container-low transition-colors disabled:opacity-25 text-on-surface-variant">
            <ArrowUp size={13} />
          </button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="p-1 rounded hover:bg-surface-container-low transition-colors disabled:opacity-25 text-on-surface-variant">
            <ArrowDown size={13} />
          </button>
        </div>

        <span className="w-7 h-7 rounded-lg editorial-gradient text-white text-xs font-black flex items-center justify-center shrink-0">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={mod.name}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder={`Modul ${index + 1} adı`}
            className="w-full font-semibold text-sm text-primary bg-transparent border-b border-transparent focus:border-outline-variant focus:outline-none pb-0.5 transition-colors placeholder:text-on-surface-variant placeholder:font-normal"
          />
        </div>

        <span className="text-[10px] font-black text-secondary bg-secondary-fixed/60 px-2 py-0.5 rounded-full shrink-0">
          {MODULE_TYPES.find(t => t.value === mod.type)?.label ?? mod.type}
        </span>

        <button type="button" onClick={onToggle} className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors shrink-0">
          {mod._expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {total > 1 && (
          <button type="button" onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors shrink-0">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Expanded details */}
      {mod._expanded && (
        <div className="mt-4 ml-[52px] space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="field-label">Modul növü *</label>
              <select value={mod.type} onChange={e => onUpdate({ type: e.target.value as ModuleRow['type'] })} className="input-field">
                {MODULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Müddət (dəq) *</label>
              <input
                type="number" min="1" max="480"
                value={mod.durationMinutes}
                onChange={e => onUpdate({ durationMinutes: parseInt(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
            <div>
              <label className="field-label">Sual sayı</label>
              <input
                type="number" min="0" max="1000"
                value={mod.questions}
                onChange={e => onUpdate({ questions: parseInt(e.target.value) || 0 })}
                placeholder="0 = açıq tapşırıq"
                className="input-field"
              />
            </div>
            <div>
              <label className="field-label">Fasilə sonra (dəq)</label>
              <input
                type="number" min="0" max="120"
                value={mod.breakAfterMinutes}
                onChange={e => onUpdate({ breakAfterMinutes: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="input-field"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
              <input
                type="checkbox" checked={mod.isAdaptive}
                onChange={e => onUpdate({ isAdaptive: e.target.checked })}
                className="w-4 h-4 accent-secondary"
              />
              <span className="text-sm font-medium text-on-surface">Adaptiv modul</span>
              <span className="text-[10px] text-on-surface-variant">(nəticəyə əsasən çətinlik dəyişir)</span>
            </label>
          </div>

          <div>
            <label className="field-label">Modul təlimatları <span className="normal-case font-normal">(ixtiyari — imtahandan əvvəl göstərilir)</span></label>
            <textarea
              value={mod.instructions}
              onChange={e => onUpdate({ instructions: e.target.value })}
              rows={2}
              maxLength={1000}
              placeholder="Bu bölmədə 27 sual var. Hər sualı diqqətlə oxuyun..."
              className="input-field w-full resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-on-surface-variant bg-surface-container-low rounded-xl px-4 py-2.5">
            <span className="flex items-center gap-1"><Clock size={12} /> {mod.durationMinutes} dəq imtahan</span>
            {mod.breakAfterMinutes > 0 && <span className="flex items-center gap-1"><Coffee size={12} /> {mod.breakAfterMinutes} dəq fasilə</span>}
            {mod.questions > 0 && <span className="flex items-center gap-1"><HelpCircle size={12} /> {mod.questions} sual</span>}
            {mod.isAdaptive && <span className="font-bold text-secondary">Adaptiv</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-bold text-primary font-headline">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      {hint && <p className="text-[10px] text-on-surface-variant mb-1.5 -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}
