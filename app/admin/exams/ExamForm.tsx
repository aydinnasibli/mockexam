'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus, X, Save, Loader2, ArrowUp, ArrowDown,
  ChevronDown, ChevronRight, RefreshCw,
} from 'lucide-react';
import { createExam, updateExam, type ActionResult } from '@/lib/actions/admin';
import type { ParsedModule } from '@/lib/domain/exam-modules';
import { MODULE_TYPES, EXAM_TYPES } from '@/lib/domain/exam-types';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';

// Module types allowed per exam type. Types absent here fall back to the full
// module list (see ModuleCard), which is what DİM/GRE want — their sections
// don't map onto a fixed template the way SAT/IELTS/TOEFL do.
const ALLOWED_MODULE_TYPES: Record<string, string[]> = {
  sat:   ['rw', 'math'],
  ielts: ['listening', 'reading', 'writing'],
  toefl: ['reading', 'listening', 'writing'],
  general_english: ['grammar', 'reading', 'listening'],
  gre:   ['verbal', 'quantitative', 'analytical'],
};

// Auto-fill defaults per exam type
const TYPE_DEFAULTS: Record<string, { tag: string; description: string }> = {
  sat: {
    tag: 'SAT',
    description: 'Digital SAT tam mock imtahanı (College Board, 2025–2026 format). Reading & Writing: 2 adaptiv modul × 27 sual × 32 dəq (54 sual). Math: 2 adaptiv modul × 22 sual × 35 dəq (44 sual). Cəmi: 98 sual, 134 dəq test vaxtı + 10 dəq fasilə. Desmos kalkulyator daxildir.',
  },
  ielts: {
    tag: 'IELTS',
    description: 'IELTS Academic tam sınaq imtahanı. Listening (30 dəq, 40 sual) + Reading (60 dəq, 40 sual) + Writing (60 dəq, 2 tapşırıq) + Speaking (11–14 dəq). Ümumi: 80 sual, Band 0–9 sistemi.',
  },
  toefl: {
    tag: 'TOEFL',
    description: 'TOEFL iBT tam mock imtahanı (ETS, 2026 format — yanvar 21, 2026-dan etibarən). Reading + Listening (adaptiv, çoxmərhələli) + Speaking (~8 dəq, 11 tapşırıq) + Writing (~17 dəq, 3 tapşırıq). Cəmi ~67–85 dəq. Bal: 1.0–6.0 band (+ 0–120 keçid dövrü).',
  },
  general_english: {
    tag: 'General English',
    description: 'Ümumi İngilis dili imtahanı (CEFR standartı: A1-C2). Grammar, Reading və Listening bölmələri. 45 dəqiqə, 45 sual.',
  },
  dim: {
    tag: 'DİM',
    description: 'DİM (Dövlət İmtahan Mərkəzi) formatına uyğun sınaq imtahanı. Fənn blokları ayrı-ayrı modul kimi qurulur və hər biri müstəqil qiymətləndirilir.',
  },
  gre: {
    tag: 'GRE',
    description: 'GRE General Test sınağı. Verbal Reasoning, Quantitative Reasoning və Analytical Writing bölmələri daxildir.',
  },
};

// ─── Type-specific module presets ─────────────────────────────────────────────
//
// `layout: 'block'` puts every question sharing a `blockId` on one screen. It is
// set on the sections whose real-world equivalent shows the candidate a whole
// task at once — an IELTS listening part, an IELTS reading task, a General
// English dialogue set — and left at 'single' where one-question-per-screen is
// what the real test does, which is TOEFL listening and all of SAT.
//
// No preset carries a Speaking module. Speaking is not offered on this platform
// and there is no recording UI to render one; a module with an empty question
// bank is now skipped by the scheduler (see lib/domain/exam-timing.ts), but
// shipping one in a preset only invited an exam that advertises a section it
// cannot deliver. The catalog states the omission explicitly instead.

const EXAM_PRESETS: Record<string, ParsedModule[]> = {
  // Digital SAT (College Board, 2024 format)
  // Section 1 – Reading & Writing: 2 modules × 27 questions × 32 min
  // 10-min break between sections
  // Section 2 – Math: 2 modules × 22 questions × 35 min
  // Total test time: 134 min | With break: 144 min | Questions: 98
  //
  // Module 2 is NOT adaptive here. Real Digital SAT routes candidates into an
  // easier or harder second module on their first-module performance, and
  // scoring it honestly needs two authored forms per section plus College
  // Board's equating curves, which are not published. Rather than label a
  // linear test "adaptive" and report a scaled score the routing was never
  // applied to, the modules are fixed and the score is presented as an estimate.
  sat: [
    {
      name: 'Reading & Writing — Module 1',
      type: 'rw', durationMinutes: 32, questions: 27,
      breakAfterMinutes: 0, isAdaptive: false, layout: 'single',
      instructions: 'Reading & Writing bölməsi, 1-ci modul. 27 sual, 32 dəqiqə. Suallar 4 kateqoriyadan ibarətdir: Information & Ideas, Craft & Structure, Expression of Ideas, Standard English Conventions. Hər sualın yalnız bir düzgün cavabı var.',
    },
    {
      name: 'Reading & Writing — Module 2',
      type: 'rw', durationMinutes: 32, questions: 27,
      breakAfterMinutes: 10, isAdaptive: false, layout: 'single',
      instructions: 'Reading & Writing bölməsi, 2-ci modul. 27 sual, 32 dəqiqə. Bu moduldan sonra 10 dəqiqəlik fasilə başlayır — fasilə vaxtı imtahan vaxtından ayrıdır.',
    },
    {
      name: 'Math — Module 1',
      type: 'math', durationMinutes: 35, questions: 22,
      breakAfterMinutes: 0, isAdaptive: false, layout: 'single',
      instructions: 'Math bölməsi, 1-ci modul. 22 sual, 35 dəqiqə. 17 sual çoxseçimli, 5 sual student-produced response (SPR) formatındadır. Sual kateqoriyaları: Algebra, Advanced Math, Problem-Solving & Data Analysis, Geometry & Trigonometry. Kalkulyator və düstur vərəqi bütün suallar üçün açıqdır.',
    },
    {
      name: 'Math — Module 2',
      type: 'math', durationMinutes: 35, questions: 22,
      breakAfterMinutes: 0, isAdaptive: false, layout: 'single',
      instructions: 'Math bölməsi, 2-ci modul. 22 sual, 35 dəqiqə. 17 çoxseçimli + 5 SPR sual. Kalkulyator və düstur vərəqi açıqdır.',
    },
  ],

  // IELTS Academic (British Council / IDP / Cambridge)
  // Listening: 30 min, 40 questions, 4 parts on one continuous recording
  // Reading:   60 min, 40 questions, 3 academic texts
  // Writing:   60 min, 2 tasks
  // Speaking is not offered — see the note above.
  ielts: [
    {
      name: 'Listening',
      type: 'listening', durationMinutes: 30, questions: 40,
      breakAfterMinutes: 0, isAdaptive: false, layout: 'block',
      instructions: 'IELTS Listening: 30 dəqiqə, 40 sual. 4 hissə: Part 1 — gündəlik sosial dialoq (1–10), Part 2 — ictimai mövzu monoloqu (11–20), Part 3 — akademik müzakirə (21–30), Part 4 — akademik mühazirə (31–40). Hər hissənin bütün sualları eyni ekranda göstərilir və səs yazısı fasiləsiz oxunur — sualları qabaqcadan oxuyun. Səs yalnız bir dəfə səslənir.',
    },
    {
      name: 'Reading',
      type: 'reading', durationMinutes: 60, questions: 40,
      breakAfterMinutes: 0, isAdaptive: false, layout: 'block',
      instructions: 'IELTS Academic Reading: 60 dəqiqə, 40 sual. 3 uzun akademik mətn. Sual növləri: Multiple choice, Matching headings, True/False/Not Given, Yes/No/Not Given, Matching information, Sentence completion, Short-answer. Hər tapşırığın sualları mətnlə yanaşı bir ekranda verilir.',
    },
    {
      name: 'Writing',
      type: 'writing', durationMinutes: 60, questions: 2,
      breakAfterMinutes: 0, isAdaptive: false, layout: 'single',
      instructions: 'IELTS Academic Writing: 60 dəqiqə, 2 tapşırıq. Task 1 (~20 dəq, minimum 150 söz): verilmiş qrafik, cədvəl, diaqram və ya xəritəni akademik üslubda təsvir edin. Task 2 (~40 dəq, minimum 250 söz): bir arqument və ya problemə dair esse yazın. Task 2-nin çəkisi daha yüksəkdir. Yuxarı söz həddi yoxdur.',
    },
  ],

  // TOEFL iBT — Reading, Listening and Writing. Speaking is not offered.
  // Listening stays 'single': the real test plays the lecture, then presents
  // its questions one at a time with no going back, so one-per-screen is the
  // faithful behaviour here rather than a limitation.
  toefl: [
    {
      name: 'Reading',
      type: 'reading', durationMinutes: 35, questions: 20,
      breakAfterMinutes: 0, isAdaptive: false, layout: 'single',
      instructions: 'TOEFL Reading: 35 dəqiqə, 20 sual. 2 akademik mətn, hər birinə 10 sual. Sual növləri: main idea, detail, negative detail, vocabulary in context, inference, rhetorical purpose, insert sentence, summary. Bölmə daxilində suallara geri qayıda bilərsiniz.',
    },
    {
      name: 'Listening',
      type: 'listening', durationMinutes: 36, questions: 28,
      breakAfterMinutes: 0, isAdaptive: false, layout: 'single',
      instructions: 'TOEFL Listening: 36 dəqiqə, 28 sual. 3 mühazirə (hər birinə 6 sual) və 2 söhbət (hər birinə 5 sual). Səs yazısı bir dəfə səslənir; suallar səsdən SONRA bir-bir verilir və əvvəlki suala qayıtmaq olmur. Qeyd götürməyiniz tövsiyə olunur.',
    },
    {
      name: 'Writing',
      type: 'writing', durationMinutes: 29, questions: 2,
      breakAfterMinutes: 0, isAdaptive: false, layout: 'single',
      instructions: 'TOEFL Writing: 29 dəqiqə, 2 tapşırıq. Integrated (20 dəq): mətni oxuyun, mühazirəni dinləyin, sonra əlaqəni izah edin — minimum 150 söz. Academic Discussion (10 dəq): onlayn müzakirəyə cavab yazın — minimum 100 söz.',
    },
  ],

  // General English (CEFR A1–C1) — our own placement format.
  // Listening is 'block' so all questions for a dialogue sit on one screen
  // while it plays, the same reason IELTS listening needs it.
  general_english: [
    {
      name: 'Grammar',
      type: 'grammar', durationMinutes: 15, questions: 15,
      breakAfterMinutes: 0, isAdaptive: false, layout: 'single',
      instructions: 'Grammar bölməsi. 15 sual, 15 dəqiqə. Boşluqları doldurma və düzgün qrammatik formanı seçmə tipli suallardan ibarətdir.',
    },
    {
      name: 'Reading',
      type: 'reading', durationMinutes: 15, questions: 15,
      breakAfterMinutes: 0, isAdaptive: false, layout: 'single',
      instructions: 'Reading bölməsi. 15 sual, 15 dəqiqə. Qısa mətnləri oxuyub çoxseçimli və ya doğru/yanlış suallarına cavab verin.',
    },
    {
      name: 'Listening',
      type: 'listening', durationMinutes: 15, questions: 15,
      breakAfterMinutes: 0, isAdaptive: false, layout: 'block',
      instructions: 'Listening bölməsi. 15 sual, 15 dəqiqə. 3 dialoq, hər birinə 5 sual. Hər dialoqun sualları eyni ekranda göstərilir — səs başlamazdan əvvəl onları oxuyun. Səs yalnız bir dəfə səslənir.',
    },
  ],
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModuleRow extends ParsedModule {
  id: string;
  expanded: boolean;
}

function toServerModule(m: ModuleRow): ParsedModule {
  return {
    name: m.name,
    type: m.type,
    durationMinutes: m.durationMinutes,
    questions: m.questions,
    breakAfterMinutes: m.breakAfterMinutes,
    isAdaptive: m.isAdaptive,
    instructions: m.instructions,
    layout: m.layout,
  };
}

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function makePreset(type: string): ModuleRow[] {
  const preset = EXAM_PRESETS[type];
  if (!preset?.length) return [emptyModule()];
  return preset.map(m => ({ ...m, id: makeKey(), expanded: false }));
}

function emptyModule(): ModuleRow {
  return {
    id: makeKey(), expanded: true,
    name: '', type: 'general',
    durationMinutes: 30, questions: 0,
    breakAfterMinutes: 0, isAdaptive: false, instructions: '', layout: 'single',
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

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  const [examType, setExamType] = useState(defaultValues?.type ?? 'sat');
  const [tag, setTag] = useState(defaultValues?.tag ?? TYPE_DEFAULTS['sat'].tag);
  const [description, setDescription] = useState(defaultValues?.description ?? '');

  const [features, setFeatures] = useState<string[]>(
    defaultValues?.features?.length ? defaultValues.features : ['']
  );

  const [modules, setModules] = useState<ModuleRow[]>(() => {
    if (defaultValues?.modules?.length) {
      return defaultValues.modules.map(m => ({ ...m, id: makeKey(), expanded: false }));
    }
    return makePreset(defaultValues?.type ?? 'sat');
  });

  // ── Module helpers ──────────────────────────────────────────────────────────

  const addModule = () => setModules(prev => [...prev, emptyModule()]);

  const removeModule = (key: string) =>
    setModules(prev => prev.filter(m => m.id !== key));

  const moveModule = (key: string, dir: -1 | 1) =>
    setModules(prev => {
      const i = prev.findIndex(m => m.id === key);
      if (i < 0) return prev;
      const next = i + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[i], arr[next]] = [arr[next], arr[i]];
      return arr;
    });

  const updateModule = (key: string, patch: Partial<ModuleRow>) =>
    setModules(prev => prev.map(m => m.id === key ? { ...m, ...patch } : m));

  const toggleExpanded = (key: string) =>
    setModules(prev => prev.map(m => m.id === key ? { ...m, expanded: !m.expanded } : m));

  const handleTypeChange = (newType: string) => {
    setExamType(newType);
    if (mode === 'create') {
      setModules(makePreset(newType));
      const defaults = TYPE_DEFAULTS[newType];
      if (defaults) {
        setTag(defaults.tag);
        setDescription(defaults.description);
      }
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

  const modulesJson = JSON.stringify(modules.map(toServerModule));

  // ── Feature helpers ─────────────────────────────────────────────────────────

  const addFeature    = () => setFeatures(f => [...f, '']);
  const removeFeature = (i: number) => setFeatures(f => f.filter((_, idx) => idx !== i));
  const setFeature    = (i: number, v: string) =>
    setFeatures(f => { const n = [...f]; n[i] = v; return n; });

  return (
    <form action={formAction} className="max-w-4xl space-y-6">
      <input type="hidden" name="modulesJson" value={modulesJson} />

      {/* ── Basic info ─────────────────────────────────────────────────────── */}
      <Section title="Əsas Məlumatlar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="İmtahan ID *" hint="Kiçik hərf, rəqəm, tire (maks. 64). Sonradan dəyişdirilmir." htmlFor="exam-id">
            <input
              type="text" id="exam-id" name="examId"
              defaultValue={mode === 'edit' ? examId : (defaultValues?.examId ?? '')}
              placeholder="sat-mock-4"
              required disabled={mode === 'edit'}
              className="input-field disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-mute"
            />
          </Field>
          <Field label="Növ *" htmlFor="exam-type">
            <select
              id="exam-type" name="type"
              value={examType}
              onChange={e => handleTypeChange(e.target.value)}
              className="input-field"
              required
            >
              {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Başlıq *" className="sm:col-span-2" htmlFor="exam-title">
            <input type="text" id="exam-title" name="title" defaultValue={defaultValues?.title ?? ''} placeholder="Digital SAT Full Mock #4" required className="input-field" />
          </Field>
          <Field label="Etiket (Tag) *" htmlFor="exam-tag">
            <input type="text" id="exam-tag" name="tag" value={tag} onChange={e => setTag(e.target.value)} placeholder="SAT" required className="input-field" />
          </Field>
          <Field label="Qiymət (₼) *" htmlFor="exam-price">
            <input type="number" id="exam-price" name="price" min="0" step="0.01" defaultValue={defaultValues?.price ?? ''} placeholder="12" required className="input-field" />
          </Field>
          <Field label="Status" className="sm:col-span-2">
            <label className="flex h-11 cursor-pointer items-center gap-3 select-none">
              <input type="checkbox" name="isActive" value="true" defaultChecked={defaultValues?.isActive !== false} className="h-4 w-4 accent-ink" />
              <span className="text-sm font-medium text-ink">Aktiv (istifadəçilərə görünür)</span>
            </label>
          </Field>
        </div>
      </Section>

      {/* ── Description ────────────────────────────────────────────────────── */}
      <Section title="Təsvir">
        <textarea id="exam-description" aria-label="İmtahan təsviri" name="description" value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="İmtahan haqqında ətraflı məlumat..." required className="input-field w-full resize-none" />
      </Section>

      {/* ── Modules ────────────────────────────────────────────────────────── */}
      <div className="rounded-panel border border-rule bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule px-5 py-4">
          <div className="min-w-0">
            <h2 className="m-0 text-body font-medium tracking-[-0.01em] text-ink">Modullar / Bölmələr</h2>
            <p className="m-0 mt-1 text-note text-ink-mute">
              Hər imtahan bir və ya bir neçə moduldan ibarət olur. Sıra mühümdür.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="xs" type="button" onClick={applyPreset}>
              <RefreshCw size={12} />
              {EXAM_TYPES.find(t => t.value === examType)?.label ?? examType.toUpperCase()} preseti
            </Button>
            <Button variant="ghost" size="xs" type="button" onClick={addModule}>
              <Plus size={13} /> Modul əlavə et
            </Button>
          </div>
        </div>

        <div>
          {modules.map((mod, idx) => (
            <ModuleCard
              key={mod.id}
              mod={mod}
              index={idx}
              total={modules.length}
              examType={examType}
              onUpdate={patch => updateModule(mod.id, patch)}
              onRemove={() => removeModule(mod.id)}
              onMoveUp={() => moveModule(mod.id, -1)}
              onMoveDown={() => moveModule(mod.id, 1)}
              onToggle={() => toggleExpanded(mod.id)}
            />
          ))}
        </div>

        {/* Totals summary */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule bg-surface-2 px-5 py-3.5">
          <span className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute">
            Ümumi sual <span className="ml-1 text-sm text-ink">{totalQuestions}</span>
          </span>
          <span className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute">
            İmtahan müddəti <span className="ml-1 text-sm text-ink">{examMinutes} dəq</span>
          </span>
          {totalBreak > 0 && (
            <span className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute">
              Fasilə <span className="ml-1 text-sm text-ink">{totalBreak} dəq</span>
            </span>
          )}
          <span className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute ml-auto">
            Ümumi <span className="ml-1 text-sm text-ink">{totalDuration} dəq</span>
          </span>
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <Section
        title="Xüsusiyyətlər"
        action={<Button variant="ghost" size="xs" type="button" onClick={addFeature}><Plus size={13} /> Əlavə et</Button>}
      >
        <div className="space-y-3">
          {features.map((f, i) => (
            <div key={i} className="flex gap-3">
              <input type="text" aria-label={`Xüsusiyyət ${i + 1}`} name="features" value={f} onChange={e => setFeature(i, e.target.value)} placeholder={`Xüsusiyyət ${i + 1}`} className="input-field flex-1" />
              {features.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFeature(i)}
                  aria-label={`Xüsusiyyət ${i + 1} sil`}
                  className="cursor-pointer rounded-btn p-2.5 text-ink-mute transition-colors hover:bg-surface-2 hover:text-error"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button className="disabled:opacity-60" type="submit" disabled={pending}>
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {mode === 'create' ? 'İmtahan yarat' : 'Dəyişiklikləri saxla'}
        </Button>
        <Button variant="ghost" type="button" onClick={() => router.back()}>
          Ləğv et
        </Button>
      </div>
    </form>
  );
}

// ─── Module Card ──────────────────────────────────────────────────────────────

interface ModuleCardProps {
  mod: ModuleRow;
  index: number;
  total: number;
  examType: string;
  onUpdate: (patch: Partial<ModuleRow>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: () => void;
}

function ModuleCard({ mod, index, total, examType, onUpdate, onRemove, onMoveUp, onMoveDown, onToggle }: ModuleCardProps) {
  const allowedTypes = ALLOWED_MODULE_TYPES[examType] ?? MODULE_TYPES.map(t => t.value);
  /*
   * The module's CURRENT type is always offered, even when the exam type no
   * longer allows it.
   *
   * A <select> whose `value` matches no <option> renders the first option
   * instead, while state keeps the real value — so a legacy module (Speaking,
   * since it was removed from the IELTS and TOEFL lists) would display as
   * "Listening" and save as `speaking`, with nothing on screen admitting the
   * difference. Keeping the current value in the list makes the mismatch
   * visible and the change deliberate.
   */
  const filteredModuleTypes = MODULE_TYPES.filter(
    t => allowedTypes.includes(t.value) || t.value === mod.type,
  );
  const iconButton =
    'cursor-pointer rounded-btn p-1.5 text-ink-mute transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-25';

  return (
    <div className="px-5 py-4 not-first:border-t not-first:border-rule-soft">
      {/* Header row */}
      <div className="flex items-center gap-2.5">
        <div className="flex shrink-0 flex-col gap-0.5">
          <button type="button" onClick={onMoveUp} disabled={index === 0} aria-label="Yuxarı köçür" className={iconButton}>
            <ArrowUp size={13} />
          </button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} aria-label="Aşağı köçür" className={iconButton}>
            <ArrowDown size={13} />
          </button>
        </div>

        {/* Mono index, the way the home page numbers its own sections. */}
        <span className="w-6 shrink-0 text-center font-mono text-note tabular-nums text-ink-mute">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={mod.name}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder={`Modul ${index + 1} adı`}
            aria-label={`Modul ${index + 1} adı`}
            className="w-full border-b border-transparent bg-transparent pb-1 text-sm font-medium text-ink transition-colors placeholder:font-normal placeholder:text-ink-mute focus:border-ink focus:outline-none"
          />
        </div>

        <Tag className="shrink-0">
          {MODULE_TYPES.find(t => t.value === mod.type)?.label ?? mod.type}
        </Tag>

        <button type="button" onClick={onToggle} aria-expanded={mod.expanded} aria-label="Modul detalları" className={`${iconButton} shrink-0`}>
          {mod.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {total > 1 && (
          <button type="button" onClick={onRemove} aria-label="Modulu sil" className={`${iconButton} shrink-0 hover:text-error!`}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Expanded details */}
      {mod.expanded && (
        <div className="mt-5 ml-13 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">Modul növü *</label>
              <select value={mod.type} onChange={e => onUpdate({ type: e.target.value as ModuleRow['type'] })} className="input-field">
                {filteredModuleTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">Müddət (dəq) *</label>
              <input
                type="number" min="1" max="480"
                value={mod.durationMinutes}
                onChange={e => onUpdate({ durationMinutes: parseInt(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">Sual sayı</label>
              <input
                type="number" min="0" max="1000"
                value={mod.questions}
                onChange={e => onUpdate({ questions: parseInt(e.target.value) || 0 })}
                placeholder="0 = açıq tapşırıq"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">Fasilə sonra (dəq)</label>
              <input
                type="number" min="0" max="120"
                value={mod.breakAfterMinutes}
                onChange={e => onUpdate({ breakAfterMinutes: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">Sualların göstərilməsi</label>
            <select
              value={mod.layout}
              onChange={e => onUpdate({ layout: e.target.value as ModuleRow['layout'] })}
              className="input-field"
            >
              <option value="single">Bir ekranda bir sual</option>
              <option value="block">Bloklar — eyni blockId-li suallar bir ekranda</option>
            </select>
            <p className="mt-2 text-note text-ink-mute">
              Dinləmə və uzun mətn tapşırıqları üçün «Bloklar» seçin: səs yazısı
              fasiləsiz oxunduğu üçün namizəd bütün hissəni eyni anda görməlidir.
              Sualların JSON-da <code>blockId</code> sahəsi olmalıdır.
            </p>
          </div>

          <div>
            <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">Modul təlimatları <span className="normal-case font-normal">(ixtiyari — imtahandan əvvəl göstərilir)</span></label>
            <textarea
              value={mod.instructions}
              onChange={e => onUpdate({ instructions: e.target.value })}
              rows={2}
              maxLength={1000}
              placeholder="Bu bölmədə 27 sual var. Hər sualı diqqətlə oxuyun..."
              className="input-field w-full resize-none"
            />
          </div>

          <div className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-rule-soft pt-3.5">
            <span>{mod.durationMinutes} dəq imtahan</span>
            {mod.breakAfterMinutes > 0 && <span>{mod.breakAfterMinutes} dəq fasilə</span>}
            {mod.questions > 0 && <span>{mod.questions} sual</span>}
            {mod.layout === 'block' && <span className="text-ink">Bloklar</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-panel border border-rule bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
        <h2 className="m-0 text-body font-medium tracking-[-0.01em] text-ink">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, className, htmlFor, children }: { label: string; hint?: string; className?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute">{label}</label>
      {hint && <p className="m-0 -mt-1 mb-2 text-note text-ink-mute">{hint}</p>}
      {children}
    </div>
  );
}
