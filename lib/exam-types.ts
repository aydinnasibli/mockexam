// Client-safe constants — no Mongoose imports

export const MODULE_TYPES = [
  { value: 'rw',           label: 'Reading & Writing (SAT)' },
  { value: 'reading',      label: 'Reading' },
  { value: 'writing',      label: 'Writing' },
  { value: 'listening',    label: 'Listening' },
  { value: 'speaking',     label: 'Speaking' },
  { value: 'math',         label: 'Math / Riyaziyyat' },
  { value: 'verbal',       label: 'Verbal Reasoning' },
  { value: 'quantitative', label: 'Quantitative Reasoning' },
  { value: 'analytical',   label: 'Analytical Writing' },
  { value: 'general',      label: 'Ümumi / General' },
] as const;

export type ModuleType = typeof MODULE_TYPES[number]['value'];
