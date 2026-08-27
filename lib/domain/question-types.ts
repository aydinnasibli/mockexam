// Client-safe question type constants — no database imports.
//
// These lived on the Mongoose model, which meant a component wanting the union
// had to import a database model to get it. They are domain vocabulary and
// outlive any particular store.

export const QUESTION_TYPES = ['mcq', 'open', 'matching', 'writing'] as const;
export type QuestionType = typeof QUESTION_TYPES[number];

export const WRITING_TASK_TYPES = ['task1', 'task2', 'integrated', 'independent', 'general'] as const;
export type WritingTaskType = typeof WRITING_TASK_TYPES[number];
