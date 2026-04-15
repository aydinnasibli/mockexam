import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import ExamModel from '@/lib/models/Exam';
import { mockExams } from '@/lib/data';
import { isAdmin } from '@/lib/admin';

/**
 * POST /api/admin/exams/seed
 * Seeds the database with the default exam catalog from lib/data.ts.
 * Skips exams that already exist (by examId). Safe to run multiple times.
 */
export async function POST() {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();

    let created = 0;
    let skipped = 0;

    for (const exam of mockExams) {
      const exists = await ExamModel.exists({ examId: exam.id });
      if (exists) {
        skipped++;
        continue;
      }
      await ExamModel.create({
        examId: exam.id,
        title: exam.title,
        type: exam.type,
        description: exam.description,
        tag: exam.tag,
        price: exam.price,
        durationMinutes: exam.durationMinutes,
        totalQuestions: exam.totalQuestions,
        features: exam.features,
        isActive: true,
      });
      created++;
    }

    return NextResponse.json({ created, skipped });
  } catch (err) {
    console.error('[/api/admin/exams/seed]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
