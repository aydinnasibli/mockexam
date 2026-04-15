'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Save, Loader2 } from 'lucide-react';

export type ExamFormData = {
  examId: string;
  title: string;
  type: string;
  description: string;
  tag: string;
  price: string;
  durationMinutes: string;
  totalQuestions: string;
  features: string[];
  isActive: boolean;
};

const EXAM_TYPES = [
  { value: 'sat', label: 'SAT' },
  { value: 'ielts', label: 'IELTS' },
  { value: 'toefl', label: 'TOEFL' },
  { value: 'dim', label: 'DİM' },
  { value: 'gre', label: 'GRE' },
];

const defaultForm: ExamFormData = {
  examId: '',
  title: '',
  type: 'sat',
  description: '',
  tag: 'SAT',
  price: '',
  durationMinutes: '',
  totalQuestions: '',
  features: [''],
  isActive: true,
};

interface ExamFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<ExamFormData>;
  examId?: string; // for edit mode URL
}

export default function ExamForm({ mode, initialData, examId }: ExamFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ExamFormData>({ ...defaultForm, ...initialData });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof ExamFormData, value: string | boolean | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setFeature = (index: number, value: string) => {
    setForm((prev) => {
      const updated = [...prev.features];
      updated[index] = value;
      return { ...prev, features: updated };
    });
  };

  const addFeature = () => setForm((prev) => ({ ...prev, features: [...prev.features, ''] }));

  const removeFeature = (index: number) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      price: parseFloat(form.price),
      durationMinutes: parseInt(form.durationMinutes, 10),
      totalQuestions: parseInt(form.totalQuestions, 10),
      features: form.features.filter((f) => f.trim()),
    };

    try {
      const url =
        mode === 'create'
          ? '/api/admin/exams'
          : `/api/admin/exams/${examId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Xəta baş verdi.');
        return;
      }

      router.push('/admin/exams');
      router.refresh();
    } catch {
      setError('Şəbəkə xətası baş verdi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-primary font-headline mb-5">Əsas Məlumatlar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          <Field label="İmtahan ID *" hint="URL-safe, unikal (məs. sat-mock-4)">
            <input
              type="text"
              value={form.examId}
              onChange={(e) => set('examId', e.target.value)}
              placeholder="sat-mock-4"
              required
              disabled={mode === 'edit'}
              className="input-field disabled:bg-surface-container disabled:cursor-not-allowed"
            />
          </Field>

          <Field label="Növ *">
            <select
              value={form.type}
              onChange={(e) => {
                const t = e.target.value;
                set('type', t);
                set('tag', t.toUpperCase().replace('dim', 'DİM'));
              }}
              className="input-field"
              required
            >
              {EXAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Başlıq *" className="sm:col-span-2">
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Digital SAT Full Mock #4"
              required
              className="input-field"
            />
          </Field>

          <Field label="Etiket (Tag) *">
            <input
              type="text"
              value={form.tag}
              onChange={(e) => set('tag', e.target.value)}
              placeholder="SAT"
              required
              className="input-field"
            />
          </Field>

          <Field label="Status">
            <label className="flex items-center gap-3 h-11 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
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
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              placeholder="12"
              required
              className="input-field"
            />
          </Field>
          <Field label="Müddət (dəqiqə) *">
            <input
              type="number"
              min="1"
              value={form.durationMinutes}
              onChange={(e) => set('durationMinutes', e.target.value)}
              placeholder="134"
              required
              className="input-field"
            />
          </Field>
          <Field label="Sual sayı *">
            <input
              type="number"
              min="1"
              value={form.totalQuestions}
              onChange={(e) => set('totalQuestions', e.target.value)}
              placeholder="98"
              required
              className="input-field"
            />
          </Field>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-primary font-headline mb-5">Təsvir</h2>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
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
            type="button"
            onClick={addFeature}
            className="flex items-center gap-1.5 text-sm font-bold text-secondary hover:underline"
          >
            <Plus size={14} /> Əlavə et
          </button>
        </div>
        <div className="space-y-3">
          {form.features.map((f, i) => (
            <div key={i} className="flex gap-3">
              <input
                type="text"
                value={f}
                onChange={(e) => setFeature(i, e.target.value)}
                placeholder={`Xüsusiyyət ${i + 1}`}
                className="input-field flex-1"
              />
              {form.features.length > 1 && (
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
          disabled={saving}
          className="editorial-gradient text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
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
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
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
