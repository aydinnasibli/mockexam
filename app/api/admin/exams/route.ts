import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import ExamModel from '@/lib/models/Exam';
import { isAdmin } from '@/lib/admin';

/**
 * GET /api/admin/exams
 * Returns all exams (including inactive).
 */
export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    const exams = await ExamModel.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ exams });
  } catch (err) {
    console.error('[/api/admin/exams GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/exams
 * Creates a new exam.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      examId,
      title,
      type,
      description,
      tag,
      price,
      durationMinutes,
      totalQuestions,
      features,
      isActive,
    } = body;

    if (!examId || !title || !type || !description || !tag || price == null || !durationMinutes || !totalQuestions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    const exam = await ExamModel.create({
      examId: examId.trim(),
      title: title.trim(),
      type,
      description: description.trim(),
      tag: tag.trim(),
      price: Number(price),
      durationMinutes: Number(durationMinutes),
      totalQuestions: Number(totalQuestions),
      features: Array.isArray(features) ? features.filter(Boolean) : [],
      isActive: isActive !== false,
    });

    return NextResponse.json({ exam }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'Exam ID already exists' }, { status: 409 });
    }
    console.error('[/api/admin/exams POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
