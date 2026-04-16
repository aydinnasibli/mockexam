import dbConnect from '@/lib/mongodb';
import ExamModel, { IModule } from '@/lib/models/Exam';

/** Shape exposed to all public-facing pages — no Mongoose internals. */
export interface PublicExam {
  id: string;
  title: string;
  type: string;
  description: string;
  tag: string;
  price: number;
  durationMinutes: number;
  totalQuestions: number;
  features: string[];
  modules: Array<{
    name: string;
    type: string;
    durationMinutes: number;
    questions: number;
    breakAfterMinutes: number;
    isAdaptive: boolean;
    instructions: string;
  }>;
}

function serialize(m: IModule) {
  return {
    name:              m.name,
    type:              m.type,
    durationMinutes:   m.durationMinutes,
    questions:         m.questions,
    breakAfterMinutes: m.breakAfterMinutes,
    isAdaptive:        m.isAdaptive ?? false,
    instructions:      m.instructions ?? '',
  };
}

/** Returns all active exams, newest first. */
export async function getActiveExams(): Promise<PublicExam[]> {
  await dbConnect();
  const exams = await ExamModel.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  return exams.map((e) => ({
    id:             e.examId,
    title:          e.title,
    type:           e.type,
    description:    e.description,
    tag:            e.tag,
    price:          e.price,
    durationMinutes:e.durationMinutes,
    totalQuestions: e.totalQuestions,
    features:       e.features,
    modules:        e.modules.map(serialize),
  }));
}

/** Returns a single active exam by its examId, or null. */
export async function getExamById(examId: string): Promise<PublicExam | null> {
  await dbConnect();
  const e = await ExamModel.findOne({ examId, isActive: true }).lean();
  if (!e) return null;
  return {
    id:             e.examId,
    title:          e.title,
    type:           e.type,
    description:    e.description,
    tag:            e.tag,
    price:          e.price,
    durationMinutes:e.durationMinutes,
    totalQuestions: e.totalQuestions,
    features:       e.features,
    modules:        e.modules.map(serialize),
  };
}

/** Returns any exam (including inactive) — used for checkout access checks etc. */
export async function getExamByIdAdmin(examId: string): Promise<PublicExam | null> {
  await dbConnect();
  const e = await ExamModel.findOne({ examId }).lean();
  if (!e) return null;
  return {
    id:             e.examId,
    title:          e.title,
    type:           e.type,
    description:    e.description,
    tag:            e.tag,
    price:          e.price,
    durationMinutes:e.durationMinutes,
    totalQuestions: e.totalQuestions,
    features:       e.features,
    modules:        e.modules.map(serialize),
  };
}
