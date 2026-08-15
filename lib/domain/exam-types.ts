// Client-safe constants — no Mongoose imports

/** transactionId prefix marking a Purchase as a free admin grant, not a real payment. */
export const ADMIN_GRANT_PREFIX = 'ADMIN-GRANT';

/**
 * The single source of truth for exam types.
 *
 * Everything that validates, stores, or displays an exam type derives from this
 * list: the Exam + UserSettings schemas, the admin create/edit validator, the
 * JSON importer, the admin form dropdown, and the public catalog filter. Adding
 * a type here makes it usable everywhere at once — previously these lists had
 * drifted apart, so `dim`/`gre` exams were storable but not creatable/editable.
 */
export const EXAM_TYPES = [
  { value: 'sat',              label: 'SAT' },
  { value: 'ielts',            label: 'IELTS' },
  { value: 'toefl',            label: 'TOEFL' },
  { value: 'dim',              label: 'DİM' },
  { value: 'gre',              label: 'GRE' },
  { value: 'general_english',  label: 'General English (CEFR)' },
] as const;

export type ExamType = typeof EXAM_TYPES[number]['value'];

export const EXAM_TYPE_VALUES = EXAM_TYPES.map(t => t.value) as readonly ExamType[];

/** Short display label keyed by type — used by the catalog filter and settings. */
export const EXAM_TYPE_LABELS: Record<ExamType, string> = Object.fromEntries(
  EXAM_TYPES.map(t => [t.value, t.label]),
) as Record<ExamType, string>;

export function isExamType(value: unknown): value is ExamType {
  return typeof value === 'string' && (EXAM_TYPE_VALUES as readonly string[]).includes(value);
}

/**
 * Display label for an exam type coming from the database (typed as `string`).
 * Falls back to an upper-cased form so a type added to the schema but not yet
 * to this file still renders something sensible instead of blank.
 */
export function examTypeLabel(type: string): string {
  return (EXAM_TYPE_LABELS as Record<string, string>)[type] ?? type.toUpperCase();
}

export const MODULE_TYPES = [
  { value: 'rw',           label: 'Reading & Writing (SAT)' },
  { value: 'reading',      label: 'Reading' },
  { value: 'writing',      label: 'Writing' },
  { value: 'listening',    label: 'Listening' },
  { value: 'speaking',     label: 'Speaking' },
  { value: 'grammar',      label: 'Grammar / Qrammatika' },
  { value: 'math',         label: 'Math / Riyaziyyat' },
  { value: 'verbal',       label: 'Verbal Reasoning' },
  { value: 'quantitative', label: 'Quantitative Reasoning' },
  { value: 'analytical',   label: 'Analytical Writing' },
  { value: 'general',      label: 'Ümumi / General' },
] as const;

export type ModuleType = typeof MODULE_TYPES[number]['value'];
