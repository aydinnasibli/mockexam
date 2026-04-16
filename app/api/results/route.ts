import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamResult from '@/lib/models/ExamResult';
import { getExamById } from '@/lib/db/exams';

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const results = await ExamResult.find({ userId })
      .sort({ completedAt: -1 })
      .lean();
    return NextResponse.json({ results });
  } catch (err) {
    console.error('[/api/results GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { examId?: string; startedAt?: string; durationSeconds?: number; score?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { examId, startedAt, durationSeconds, score } = body;
  if (!examId || !startedAt || durationSeconds == null || score == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (typeof durationSeconds !== 'number' || durationSeconds < 0) {
    return NextResponse.json({ error: 'Invalid durationSeconds' }, { status: 400 });
  }
  if (typeof score !== 'number' || score < 0 || score > 100) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
  }

  try {
    await dbConnect();

    const purchase = await Purchase.findOne({ userId, examId, status: 'COMPLETED' }).lean();
    if (!purchase) return NextResponse.json({ error: 'Exam not purchased' }, { status: 403 });

    const exam = await getExamById(examId);
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

    const attemptNumber = (await ExamResult.countDocuments({ userId, examId })) + 1;

    const result = await ExamResult.create({
      userId,
      examId,
      examTitle: exam.title,
      examTag: exam.tag,
      attemptNumber,
      startedAt: new Date(startedAt),
      completedAt: new Date(),
      durationSeconds,
      totalQuestions: exam.totalQuestions,
      score,
    });

    return NextResponse.json({ resultId: result._id.toString(), attemptNumber });
  } catch (err) {
    console.error('[/api/results POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
