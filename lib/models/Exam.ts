import mongoose, { Schema, Document, Model } from 'mongoose';
import { MODULE_TYPES, MODULE_LAYOUTS, EXAM_TYPE_VALUES, type ModuleType, type ExamType, type ModuleLayout } from '@/lib/domain/exam-types';

export { MODULE_TYPES, type ModuleType, type ExamType, type ModuleLayout };

export interface IModule {
  name: string;
  type: ModuleType;
  durationMinutes: number;
  questions: number;        // 0 for open-ended (speaking/writing)
  breakAfterMinutes: number; // rest before next module; 0 = no break
  /**
   * Stored and editable, but NOT implemented by the player: nothing in the exam
   * engine reads it, and no module's difficulty responds to an earlier one. It
   * used to be advertised on the public exam page as "çətinlik əvvəlki modulun
   * nəticəsinə görə seçilir", which was a claim made to someone before they
   * paid. The claim is gone; the field stays so the data authored against it is
   * not lost, and so real adaptive delivery has somewhere to land.
   */
  isAdaptive: boolean;
  instructions: string;     // shown to user before the module starts
  /**
   * How the module presents its questions.
   *   'single' — one question per screen (default; TOEFL listening, SAT).
   *   'block'  — every question sharing a `blockId` on one scrolling screen
   *              (IELTS listening parts and reading tasks, General English
   *              listening dialogues).
   * Defaulting to 'single' means no existing exam changes behaviour until its
   * questions are actually given block ids.
   */
  layout: ModuleLayout;
}

export interface IExam extends Document {
  examId: string;
  title: string;
  type: ExamType;
  description: string;
  tag: string;
  price: number;
  features: string[];
  modules: IModule[];
  // stored, auto-computed from modules when modules are present
  totalQuestions: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ModuleSchema = new Schema<IModule>(
  {
    name:               { type: String, required: true, trim: true },
    type:               { type: String, required: true, enum: MODULE_TYPES.map(t => t.value) },
    durationMinutes:    { type: Number, required: true, min: 1 },
    questions:          { type: Number, required: true, min: 0, default: 0 },
    breakAfterMinutes:  { type: Number, required: true, min: 0, default: 0 },
    isAdaptive:         { type: Boolean, default: false },
    instructions:       { type: String, default: '' },
    layout:             { type: String, enum: MODULE_LAYOUTS, default: 'single' },
  },
  { _id: false }
);

const ExamSchema = new Schema<IExam>(
  {
    examId:         { type: String, required: true, unique: true, trim: true },
    title:          { type: String, required: true, trim: true },
    type:           { type: String, required: true, enum: EXAM_TYPE_VALUES },
    description:    { type: String, required: true },
    tag:            { type: String, required: true, trim: true },
    price:          { type: Number, required: true, min: 0 },
    features:       [{ type: String }],
    modules:        [ModuleSchema],
    totalQuestions: { type: Number, required: true, default: 0 },
    durationMinutes:{ type: Number, required: true, default: 0 },
    isActive:       { type: Boolean, default: true },
  },
  { timestamps: true }
);

ExamSchema.index({ type: 1 });
ExamSchema.index({ isActive: 1 });

/** Compute totalQuestions and durationMinutes from the modules array. */
export function computeExamTotals(modules: Pick<IModule, 'questions' | 'durationMinutes' | 'breakAfterMinutes'>[]) {
  return {
    totalQuestions:  modules.reduce((s, m) => s + (m.questions ?? 0), 0),
    durationMinutes: modules.reduce((s, m) => s + m.durationMinutes + (m.breakAfterMinutes ?? 0), 0),
  };
}

const ExamModel: Model<IExam> =
  (mongoose.models.Exam as Model<IExam>) ||
  mongoose.model<IExam>('Exam', ExamSchema);

export default ExamModel;
