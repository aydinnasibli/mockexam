'use server';

import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamResult from '@/lib/models/ExamResult';
import QuestionModel from '@/lib/models/Question';
import { getExamByIdAdmin } from '@/lib/db/exams';
import ExamSessionModel from '@/lib/models/ExamSession';

export type ClientAnswerInput = {
  questionId: string;
  moduleIndex: number;
  userAnswer: number;   // -1 = unanswered, 0-3 = selected option
  userAnswerText?: string;
  timeSeconds: number;
};

export async function saveExamResult(data: {
  examId: string;
  startedAt: string;
  durationSeconds: number;
  answers: ClientAnswerInput[];
}): Promise<{ resultId: string; attemptNumber: number } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  const { examId, startedAt, durationSeconds, answers } = data;

  if (typeof durationSeconds !== 'number' || durationSeconds < 0 || !Number.isFinite(durationSeconds)) return { error: 'Invalid durationSeconds' };
  const startDate = new Date(startedAt);
  if (isNaN(startDate.getTime())) return { error: 'Invalid startedAt date' };
  if (!Array.isArray(answers) || answers.length > 2000) return { error: 'Invalid answers' };

  try {
    await dbConnect();

    // Atomically claim the next attempt number — also validates the purchase exists
    const updatedPurchase = await Purchase.findOneAndUpdate(
      { userId, examId, status: 'COMPLETED' },
      { $inc: { attemptCount: 1 } },
      { new: true }
    );
    if (!updatedPurchase) return { error: 'Exam not purchased' };
    const attemptNumber = updatedPurchase.attemptCount;

    const exam = await getExamByIdAdmin(examId);
    if (!exam) return { error: 'Exam not found' };

    // Validate against server-side session. Log overtime but still accept the submission
    // (this is a practice platform — we never discard a student's work).
    const session = await ExamSessionModel.findOne({ userId, examId }).lean();
    if (session) {
      const serverElapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      if (serverElapsed > session.totalSeconds + 300) {
        console.warn(`[saveExamResult] Overtime: userId=${userId} examId=${examId} elapsed=${serverElapsed}s allowed=${session.totalSeconds}s`);
      }
      // Use server-tracked startedAt so the stored record is always authoritative
      startDate.setTime(new Date(session.startedAt).getTime());
    }

    // Fetch authoritative correct answers from the database
    const questionDocs = await QuestionModel.find({ examId })
      .select('_id correctIndex moduleIndex type openAnswers')
      .lean();
    const correctMap = new Map(
      questionDocs.map(q => [String(q._id), { correctIndex: q.correctIndex, moduleIndex: q.moduleIndex, type: q.type, openAnswers: q.openAnswers || [] }])
    );

    // Build verified answer records — correctIndex and isCorrect come from DB, not client
    const answerRecords = answers.map(a => {
      const authoritative = correctMap.get(a.questionId);
      const correctIndex = authoritative?.correctIndex ?? -1;
      let isCorrect = false;

      if (authoritative?.type === 'mcq') {
        isCorrect = a.userAnswer !== -1 && a.userAnswer === correctIndex;
      } else if (authoritative?.type === 'open') {
        if (a.userAnswerText && authoritative.openAnswers && authoritative.openAnswers.length > 0) {
          const normalizedInput = a.userAnswerText.replace(/\s+/g, '').toLowerCase().replace(/,/g, '.');
          isCorrect = authoritative.openAnswers.some(ans => {
            const normalizedAns = String(ans).replace(/\s+/g, '').toLowerCase().replace(/,/g, '.');
            return normalizedAns === normalizedInput;
          });
        }
      }

      return {
        questionId:  a.questionId,
        moduleIndex: a.moduleIndex,
        userAnswer:  a.userAnswer,
        userAnswerText: a.userAnswerText || '',
        correctIndex,
        isCorrect,
        timeSeconds: Math.max(0, Math.round(a.timeSeconds)),
      };
    });

    // Compute overall score from all questions
    const score = answerRecords.length > 0
      ? Math.round(answerRecords.filter(a => a.isCorrect).length / answerRecords.length * 100)
      : 0;

    // Compute per-module scores server-side
    const moduleScores = exam.modules.map((mod, modIdx) => {
      const modAnswers = answerRecords.filter(a => a.moduleIndex === modIdx);
      const correct = modAnswers.filter(a => a.isCorrect).length;
      return {
        moduleIndex:  modIdx,
        moduleName:   mod.name,
        correct,
        total:        modAnswers.length,
        scorePercent: modAnswers.length > 0 ? Math.round((correct / modAnswers.length) * 100) : 0,
      };
    });

    const result = await ExamResult.create({
      userId,
      examId,
      examTitle:       exam.title,
      examTag:         exam.tag,
      attemptNumber,
      startedAt:       startDate,
      completedAt:     new Date(),
      durationSeconds,
      totalQuestions:  exam.totalQuestions,
      score,
      answers:         answerRecords,
      moduleScores,
    });

    // Clean up the session record now that the exam is submitted
    await ExamSessionModel.deleteOne({ userId, examId });

    return { resultId: result._id.toString(), attemptNumber };
  } catch (err) {
    console.error('[saveExamResult]', err);
    return { error: 'Server xətası baş verdi.' };
  }
}
