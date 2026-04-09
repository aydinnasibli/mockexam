import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import { mockExams } from '@/lib/data';

/**
 * POST /api/checkout
 * Body: { examId: string }
 *
 * Creates a LemonSqueezy checkout session for the given exam and returns
 * { checkoutUrl: string } so the frontend can open the overlay.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await currentUser();

  let body: { examId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { examId } = body;
  if (!examId) {
    return NextResponse.json({ error: 'Missing examId' }, { status: 400 });
  }

  try {
    const exam = mockExams.find((e) => e.id === examId);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;

    if (!variantId || variantId === 'REPLACE_WITH_YOUR_VARIANT_ID') {
      return NextResponse.json(
        { error: 'LemonSqueezy variant not configured. Please create a product in your LS dashboard and set LEMONSQUEEZY_VARIANT_ID.' },
        { status: 503 }
      );
    }

    // Prevent double-purchase
    await dbConnect();
    const existing = await Purchase.findOne({ userId, examId });
    if (existing) {
      return NextResponse.json({ alreadyPurchased: true }, { status: 409 });
    }

    // Initialize the SDK
    lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });

    // Price in cents (exam.price is in AZN)
    const customPrice = Math.round(exam.price * 100);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const { data, error } = await createCheckout(storeId!, variantId, {
      customPrice,
      productOptions: {
        name: exam.title,
        description: exam.description,
        redirectUrl: `${appUrl}/dashboard?purchased=${examId}`,
        receiptThankYouNote: `${exam.title} imtahanına giriş əldə etdiniz. Panelinizdən başlaya bilərsiniz.`,
        enabledVariants: [Number(variantId)],
      },
      checkoutOptions: {
        embed: true,
        media: false,
        logo: true,
        buttonColor: '#6200EE',
      },
      checkoutData: {
        email: user?.emailAddresses?.[0]?.emailAddress ?? undefined,
        name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
        custom: {
          user_id: userId,
          exam_id: examId,
        },
      },
    });

    if (error || !data?.data?.attributes?.url) {
      console.error('[/api/checkout POST] LemonSqueezy error:', error);
      return NextResponse.json(
        { error: error?.message ?? 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ checkoutUrl: data.data.attributes.url });
  } catch (err: unknown) {
    console.error('[/api/checkout POST] Fatal error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
