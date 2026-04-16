import { NextResponse } from 'next/server';
import { getActiveExams } from '@/lib/db/exams';

/**
 * GET /api/exams
 * Returns all active exams. Used by client components (dashboard, etc.)
 */
export async function GET() {
  try {
    const exams = await getActiveExams();
    return NextResponse.json({ exams });
  } catch (err) {
    console.error('[/api/exams GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
