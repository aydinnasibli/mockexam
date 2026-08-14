import 'server-only';
import { cache } from 'react';
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
  updatedAt: Date;
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

/*
 * All three readers are wrapped in React's `cache()`, which memoises per
 * request (or per prerender).
 *
 * Every one of them is called more than once while rendering a single page:
 * `generateMetadata` and the page body both resolve the same exam, and /exams
 * queries the catalog once for its canonical-URL decision and again for the
 * list itself. Next dedupes `fetch`, but these go through Mongoose, so without
 * this each duplicate was a second round-trip to the database.
 */

/** Returns all active exams, newest first. */
export const getActiveExams = cache(async function getActiveExams(): Promise<PublicExam[]> {
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
    updatedAt:      e.updatedAt,
    modules:        e.modules.map(serialize),
  }));
});

/** Returns a single active exam by its examId, or null. */
export const getExamById = cache(async function getExamById(examId: string): Promise<PublicExam | null> {
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
    updatedAt:      e.updatedAt,
    modules:        e.modules.map(serialize),
  };
});

/** Returns any exam (including inactive) — used for checkout access checks etc. */
export const getExamByIdAdmin = cache(async function getExamByIdAdmin(examId: string): Promise<PublicExam | null> {
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
    updatedAt:      e.updatedAt,
    modules:        e.modules.map(serialize),
  };
});
