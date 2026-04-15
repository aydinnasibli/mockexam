import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import ExamModel from '@/lib/models/Exam';
import { isAdmin } from '@/lib/admin';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/exams/[id]
 * Returns a single exam by its examId.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await dbConnect();
    const exam = await ExamModel.findOne({ examId: id }).lean();
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }
    return NextResponse.json({ exam });
  } catch (err) {
    console.error('[/api/admin/exams/[id] GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/exams/[id]
 * Updates an exam by its examId.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const allowedFields = [
      'title', 'type', 'description', 'tag', 'price',
      'durationMinutes', 'totalQuestions', 'features', 'isActive',
    ];

    const update: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        update[field] = body[field];
      }
    }

    await dbConnect();
    const exam = await ExamModel.findOneAndUpdate(
      { examId: id },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    return NextResponse.json({ exam });
  } catch (err) {
    console.error('[/api/admin/exams/[id] PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/exams/[id]
 * Deletes an exam by its examId.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await dbConnect();
    const exam = await ExamModel.findOneAndDelete({ examId: id }).lean();
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[/api/admin/exams/[id] DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
