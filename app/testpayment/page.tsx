import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { checkRole } from '@/lib/admin';
import TestPaymentClient from './TestPaymentClient';

export const metadata = {
  title: 'Epoint Test Harness — Testcentre',
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ result?: string; order?: string }>;
}

export default async function TestPaymentPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!(await checkRole('admin'))) redirect('/dashboard');

  const { result, order } = await searchParams;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const config = {
    hasPublicKey: Boolean(process.env.EPOINT_PUBLIC_KEY),
    hasPrivateKey: Boolean(process.env.EPOINT_PRIVATE_KEY),
    publicKeyPreview: process.env.EPOINT_PUBLIC_KEY ?? null,
    appUrl,
    webhookUrl: appUrl ? `${appUrl}/api/webhooks/epoint` : '/api/webhooks/epoint',
  };

  return (
    <TestPaymentClient
      config={config}
      returnedResult={result ?? null}
      returnedOrder={order ?? null}
    />
  );
}
