import 'server-only';
import { cache } from 'react';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { exams, type Exam, type ExamModule } from '@/lib/db/schema';
import type { ExamVariant } from '@/lib/domain/exam-types';

/** Shape exposed to all public-facing pages — no database internals. */
export interface PublicExam {
  id: string;
  title: string;
  type: string;
  /** Academic vs General Training. Only affects grading for IELTS. */
  variant: ExamVariant;
  description: string;
  tag: string;
  price: number;
  durationMinutes: number;
  totalQuestions: number;
  features: string[];
  /** Whether the exam is on sale. Owners keep access to one that is not. */
  isActive: boolean;
  updatedAt: Date;
  modules: Array<{
    name: string;
    type: string;
    durationMinutes: number;
    questions: number;
    breakAfterMinutes: number;
    isAdaptive: boolean;
    instructions: string;
    layout: 'single' | 'block';
  }>;
}

function serialize(m: ExamModule) {
  return {
    name:              m.name,
    type:              m.type,
    durationMinutes:   m.durationMinutes,
    questions:         m.questions,
    breakAfterMinutes: m.breakAfterMinutes,
    isAdaptive:        m.isAdaptive ?? false,
    instructions:      m.instructions ?? '',
    layout:            m.layout === 'block' ? ('block' as const) : ('single' as const),
  };
}

/**
 * `price` is stored as `numeric`, which the Postgres driver hands back as a
 * STRING — numeric is arbitrary precision and has no lossless JS number to
 * decode into, so the driver refuses to guess. Every caller of `PublicExam`
 * treats price as a number (checkout multiplies it into `amountCents`), so the
 * conversion belongs here, once, at the boundary.
 */
function toPublicExam(e: Exam): PublicExam {
  return {
    id:              e.id,
    title:           e.title,
    type:            e.type,
    variant:         e.variant,
    description:     e.description,
    tag:             e.tag,
    price:           Number(e.price),
    durationMinutes: e.durationMinutes,
    totalQuestions:  e.totalQuestions,
    features:        e.features,
    isActive:        e.isActive,
    updatedAt:       e.updatedAt,
    modules:         e.modules.map(serialize),
  };
}

/*
 * All three readers are wrapped in React's `cache()`, which memoises per
 * request (or per prerender).
 *
 * Every one of them is called more than once while rendering a single page:
 * `generateMetadata` and the page body both resolve the same exam, and /exams
 * queries the catalog once for its canonical-URL decision and again for the
 * list itself. Next dedupes `fetch`, but these are database calls, so without
 * this each duplicate was a second round-trip.
 */

/** Returns all active exams, newest first. */
export const getActiveExams = cache(async function getActiveExams(): Promise<PublicExam[]> {
  const rows = await db
    .select()
    .from(exams)
    .where(eq(exams.isActive, true))
    .orderBy(desc(exams.createdAt));
  return rows.map(toPublicExam);
});

/** Returns a single active exam by its id, or null. */
export const getExamById = cache(async function getExamById(examId: string): Promise<PublicExam | null> {
  const [e] = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, examId), eq(exams.isActive, true)))
    .limit(1);
  return e ? toPublicExam(e) : null;
});

/**
 * Every exam, active or not, newest first.
 *
 * The dashboard needs this rather than `getActiveExams`: a candidate who has
 * PAID for an exam must keep seeing it — and its past attempts — after an admin
 * takes it off sale. Filtering the dashboard through the active catalog made a
 * purchased exam and its whole result history disappear from the buyer's own
 * page, while `hasExamAccess` still let them in by URL. Deactivation is the
 * route `deleteExam` explicitly recommends, so this is not a rare state.
 *
 * Callers must still filter to what the viewer owns before showing anything.
 */
export const getAllExams = cache(async function getAllExams(): Promise<PublicExam[]> {
  const rows = await db
    .select()
    .from(exams)
    .orderBy(desc(exams.createdAt));
  return rows.map(toPublicExam);
});

/** Returns any exam (including inactive) — used for checkout access checks etc. */
export const getExamByIdAdmin = cache(async function getExamByIdAdmin(examId: string): Promise<PublicExam | null> {
  const [e] = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);
  return e ? toPublicExam(e) : null;
});
