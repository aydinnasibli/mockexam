'use server';

import * as Sentry from '@sentry/nextjs';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamResult from '@/lib/models/ExamResult';
import QuestionModel from '@/lib/models/Question';
import { getExamByIdAdmin } from '@/lib/db/exams';
import ExamSessionModel from '@/lib/models/ExamSession';
import { isRateLimited } from '@/lib/rate-limit';
import { evaluateWriting, type WritingCriterionResult } from '@/lib/actions/writing-eval';

type AnswerRecord = {
  questionId: string;
  moduleIndex: number;
  userAnswer: number;
  userAnswerText: string;
  correctIndex: number;
  isCorrect: boolean;
  timeSeconds: number;
  writingScore?: number;
  writingWordCount?: number;
  writingCriteria?: WritingCriterionResult[];
  aiFeedback?: string;
};

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

  // 5 submissions per user per 5 minutes — prevents spam
  if (await isRateLimited(`submit:${userId}`, 5, 5 * 60_000)) {
    return { error: 'Çox tez-tez imtahan göndərdiniz. Bir az gözləyin.' };
  }

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
      { returnDocument: 'after' }
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
        Sentry.captureMessage('Exam submission overtime', {
          level: 'warning',
          extra: { userId, examId, serverElapsed, allowed: session.totalSeconds },
        });
      }
      // Use server-tracked startedAt so the stored record is always authoritative
      startDate.setTime(new Date(session.startedAt).getTime());
    }

    // Fetch authoritative correct answers from the database
    const questionDocs = await QuestionModel.find({ examId })
      .select('_id correctIndex moduleIndex type openAnswers correctMatching stem passage writingTaskType rubric')
      .lean();
    const correctMap = new Map(
      questionDocs.map(q => [String(q._id), {
        correctIndex: q.correctIndex,
        moduleIndex: q.moduleIndex,
        type: q.type,
        openAnswers: q.openAnswers || [],
        correctMatching: q.correctMatching || [],
        stem: q.stem ?? '',
        passage: q.passage ?? '',
        writingTaskType: q.writingTaskType,
        rubric: q.rubric ?? '',
      }])
    );

    // Build verified answer records — correctIndex and isCorrect come from DB, not client
    // Writing questions are evaluated separately via AI after this map
    const answerRecords: AnswerRecord[] = answers.map(a => {
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
      } else if (authoritative?.type === 'matching') {
        // userAnswerText is a JSON array string e.g. "[1,0,2,0,1]"
        if (a.userAnswerText && authoritative.correctMatching && authoritative.correctMatching.length > 0) {
          try {
            const userMatches: number[] = JSON.parse(a.userAnswerText);
            isCorrect = authoritative.correctMatching.length === userMatches.length &&
              authoritative.correctMatching.every((correct, idx) => correct === userMatches[idx]);
          } catch {
            isCorrect = false;
          }
        }
      }
      // writing: isCorrect stays false (AI-scored separately below)

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

    // Compute non-writing scores first (instant, no external calls)
    const nonWritingAnswers = answerRecords.filter(a => {
      const auth = correctMap.get(a.questionId);
      return auth?.type !== 'writing';
    });
    const hasWriting = answerRecords.some(a => correctMap.get(a.questionId)?.type === 'writing');

    const nonWritingScore = nonWritingAnswers.length > 0
      ? (nonWritingAnswers.filter(a => a.isCorrect).length / nonWritingAnswers.length) * 100
      : null;

    const initialScore = nonWritingScore !== null ? Math.round(nonWritingScore) : 0;

    const moduleScores = exam.modules.map((mod, modIdx) => {
      const modAnswers = answerRecords.filter(a => a.moduleIndex === modIdx);
      const modNonWritingAnswers = modAnswers.filter(a => correctMap.get(a.questionId)?.type !== 'writing');

      const correct = modNonWritingAnswers.filter(a => a.isCorrect).length;
      const scorePercent = modNonWritingAnswers.length > 0
        ? Math.round((correct / modNonWritingAnswers.length) * 100)
        : 0;

      return {
        moduleIndex:  modIdx,
        moduleName:   mod.name,
        correct,
        total:        modAnswers.length,
        scorePercent,
      };
    });

    // Persist the result BEFORE AI evaluation — never lose student work
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
      score:           initialScore,
      answers:         answerRecords,
      moduleScores,
    });

    await ExamSessionModel.deleteOne({ userId, examId });

    // AI-evaluate writing answers after the result is safely persisted
    if (hasWriting) {
      try {
        const writingEvals = await Promise.all(
          answerRecords.map(async (record, idx) => {
            const authoritative = correctMap.get(record.questionId);
            if (authoritative?.type !== 'writing') return null;
            const essay = record.userAnswerText ?? '';
            if (!essay.trim()) return null;
            const evalResult = await evaluateWriting({
              essay,
              prompt: [authoritative.passage, authoritative.stem].filter(Boolean).join('\n\n'),
              rubric: authoritative.rubric,
              taskType: authoritative.writingTaskType as any,
              examType: exam.type,
            });
            return { idx, evalResult };
          })
        );

        for (const evalRes of writingEvals) {
          if (!evalRes) continue;
          const { idx, evalResult } = evalRes;
          const rec = answerRecords[idx];
          rec.writingScore = evalResult.bandScore;
          rec.writingWordCount = evalResult.wordCount;
          rec.writingCriteria = evalResult.criteriaFeedback;
          rec.aiFeedback = evalResult.overallComment;
        }

        const writingAnswers = answerRecords.filter(a => correctMap.get(a.questionId)?.type === 'writing');
        const writingScore = writingAnswers.length > 0
          ? (writingAnswers.reduce((sum, a) => sum + ((a.writingScore ?? 0) / 9) * 100, 0) / writingAnswers.length)
          : null;

        const allParts = [nonWritingScore, writingScore].filter(v => v !== null) as number[];
        const finalScore = allParts.length > 0
          ? Math.round(allParts.reduce((a, b) => a + b, 0) / allParts.length)
          : 0;

        const updatedModuleScores = exam.modules.map((mod, modIdx) => {
          const modAnswers = answerRecords.filter(a => a.moduleIndex === modIdx);
          const modWritingAnswers = modAnswers.filter(a => correctMap.get(a.questionId)?.type === 'writing');
          const modNonWritingAnswers = modAnswers.filter(a => correctMap.get(a.questionId)?.type !== 'writing');

          let scorePercent = 0;
          if (modWritingAnswers.length > 0 && modNonWritingAnswers.length === 0) {
            scorePercent = Math.round(modWritingAnswers.reduce((s, a) => s + ((a.writingScore ?? 0) / 9) * 100, 0) / modWritingAnswers.length);
          } else if (modNonWritingAnswers.length > 0) {
            scorePercent = Math.round((modNonWritingAnswers.filter(a => a.isCorrect).length / modNonWritingAnswers.length) * 100);
          }

          return {
            moduleIndex:  modIdx,
            moduleName:   mod.name,
            correct:      modNonWritingAnswers.filter(a => a.isCorrect).length,
            total:        modAnswers.length,
            scorePercent,
          };
        });

        await ExamResult.updateOne(
          { _id: result._id },
          { $set: { score: finalScore, answers: answerRecords, moduleScores: updatedModuleScores } },
        );
      } catch (err) {
        Sentry.captureException(err, { tags: { action: 'writingEvalPostSave' } });
      }
    }

    return { resultId: result._id.toString(), attemptNumber };
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'saveExamResult' } });
    return { error: 'Server xətası baş verdi.' };
  }
}
