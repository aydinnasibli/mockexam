'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { headers } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import { getExamById } from '@/lib/db/exams';

export type CheckoutResult =
  | { checkoutUrl: string }
  | { alreadyPurchased: true }
  | { unconfigured: true; error: string }
  | { error: string };

export async function createCheckoutSession(examId: string): Promise<CheckoutResult> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  const user = await currentUser();

  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;

  if (!variantId || variantId === 'REPLACE_WITH_YOUR_VARIANT_ID') {
    return {
      unconfigured: true,
      error: 'LemonSqueezy variant not configured. Set LEMONSQUEEZY_VARIANT_ID in your environment.',
    };
  }

  await dbConnect();

  const exam = await getExamById(examId);
  if (!exam) return { error: 'Exam not found' };

  const existing = await Purchase.findOne({ userId, examId });
  if (existing) return { alreadyPurchased: true };

  lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });

  const customPrice = Math.round(exam.price * 100);
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

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
    console.error('[createCheckoutSession] LemonSqueezy error:', error);
    return { error: error?.message ?? 'Failed to create checkout session' };
  }

  return { checkoutUrl: data.data.attributes.url };
}
