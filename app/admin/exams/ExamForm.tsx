'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Save, Loader2 } from 'lucide-react';
import { createExam, updateExam, type ActionResult } from '@/lib/actions/admin';

const EXAM_TYPES = [
  { value: 'sat',   label: 'SAT' },
  { value: 'ielts', label: 'IELTS' },
  { value: 'toefl', label: 'TOEFL' },
  { value: 'dim',   label: 'DİM' },
  { value: 'gre',   label: 'GRE' },
];

interface ExamFormProps {
  mode: 'create' | 'edit';
  examId?: string;
  defaultValues?: {
    title?: string;
    type?: string;
    description?: string;
    tag?: string;
    price?: number;
    durationMinutes?: number;
    totalQuestions?: number;
    features?: string[];
    isActive?: boolean;
  };
}

const initialState: ActionResult = {};

export default function ExamForm({ mode, examId, defaultValues }: ExamFormProps) {
  const router = useRouter();

  // Bind the examId for edit mode so the action receives it as first arg
  const action = mode === 'edit' && examId
    ? updateExam.bind(null, examId)
    : createExam;

  const [state, formAction, pending] = useActionState(action, initialState);

  // Features need local state because they're dynamically added/removed
  const [features, setFeatures] = useState<string[]>(
    defaultValues?.features?.length ? defaultValues.features : ['']
  );

  const addFeature    = () => setFeatures((f) => [...f, '']);
  const removeFeature = (i: number) => setFeatures((f) => f.filter((_, idx) => idx !== i));
  const setFeature    = (i: number, v: string) =>
    setFeatures((f) => { const n = [...f]; n[i] = v; return n; });

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      {state.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-semibold">
          {state.error}
        </div>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-primary font-headline mb-5">Əsas Məlumatlar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          <Field label="İmtahan ID *" hint="URL-safe, unikal (məs. sat-mock-4)">
            <input
              type="text"
              name="examId"
              defaultValue={defaultValues ? examId : ''}
              placeholder="sat-mock-4"
              required
              disabled={mode === 'edit'}
              className="input-field disabled:bg-surface-container disabled:cursor-not-allowed"
            />
          </Field>

          <Field label="Növ *">
            <select name="type" defaultValue={defaultValues?.type ?? 'sat'} className="input-field" required>
              {EXAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Başlıq *" className="sm:col-span-2">
            <input
              type="text"
              name="title"
              defaultValue={defaultValues?.title ?? ''}
              placeholder="Digital SAT Full Mock #4"
              required
              className="input-field"
            />
          </Field>

          <Field label="Etiket (Tag) *">
            <input
              type="text"
              name="tag"
              defaultValue={defaultValues?.tag ?? ''}
              placeholder="SAT"
              required
              className="input-field"
            />
          </Field>

          <Field label="Status">
            <label className="flex items-center gap-3 h-11 cursor-pointer select-none">
              <input
                type="checkbox"
                name="isActive"
                value="true"
                defaultChecked={defaultValues?.isActive !== false}
                className="w-4 h-4 accent-secondary"
              />
              <span className="text-sm font-medium text-on-surface">
                Aktiv (istifadəçilərə görünür)
              </span>
            </label>
          </Field>
        </div>
      </div>

      {/* Numbers */}
      <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-primary font-headline mb-5">Parametrlər</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Field label="Qiymət (₼) *">
            <input
              type="number" name="price" min="0" step="0.01"
              defaultValue={defaultValues?.price ?? ''}
              placeholder="12" required className="input-field"
            />
          </Field>
          <Field label="Müddət (dəq) *">
            <input
              type="number" name="durationMinutes" min="1"
              defaultValue={defaultValues?.durationMinutes ?? ''}
              placeholder="134" required className="input-field"
            />
          </Field>
          <Field label="Sual sayı *">
            <input
              type="number" name="totalQuestions" min="1"
              defaultValue={defaultValues?.totalQuestions ?? ''}
              placeholder="98" required className="input-field"
            />
          </Field>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-primary font-headline mb-5">Təsvir</h2>
        <textarea
          name="description"
          defaultValue={defaultValues?.description ?? ''}
          rows={4}
          placeholder="İmtahan haqqında ətraflı məlumat..."
          required
          className="input-field w-full resize-none"
        />
      </div>

      {/* Features */}
      <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-primary font-headline">Xüsusiyyətlər</h2>
          <button
            type="button" onClick={addFeature}
            className="flex items-center gap-1.5 text-sm font-bold text-secondary hover:underline"
          >
            <Plus size={14} /> Əlavə et
          </button>
        </div>
        <div className="space-y-3">
          {features.map((f, i) => (
            <div key={i} className="flex gap-3">
              {/* All feature inputs share name="features"; FormData.getAll('features') collects them */}
              <input
                type="text"
                name="features"
                value={f}
                onChange={(e) => setFeature(i, e.target.value)}
                placeholder={`Xüsusiyyət ${i + 1}`}
                className="input-field flex-1"
              />
              {features.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFeature(i)}
                  className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="editorial-gradient text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {mode === 'create' ? 'İmtahan Yarat' : 'Dəyişiklikləri Saxla'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm"
        >
          Ləğv et
        </button>
      </div>
    </form>
  );
}

function Field({
  label, hint, className, children,
}: {
  label: string; hint?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-black text-on-surface-variant uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {hint && <p className="text-[11px] text-on-surface-variant mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}
