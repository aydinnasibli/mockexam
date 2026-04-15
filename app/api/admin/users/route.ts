import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/admin';

/**
 * GET /api/admin/users
 * Returns paginated list of all Clerk users.
 * Query params: page (default 1), limit (default 20)
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));

  try {
    const clerk = await clerkClient();
    const [response, total] = await Promise.all([
      clerk.users.getUserList({ limit, offset, orderBy: '-created_at' }),
      clerk.users.getCount(),
    ]);

    const users = response.data.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.emailAddresses[0]?.emailAddress ?? null,
      imageUrl: u.imageUrl,
      createdAt: u.createdAt,
      lastSignInAt: u.lastSignInAt,
    }));

    return NextResponse.json({ users, total });
  } catch (err) {
    console.error('[/api/admin/users GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
