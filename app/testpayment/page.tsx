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
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  if (!(await checkRole('admin'))) redirect('/dashboard');

  const { result, order } = await searchParams;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const publicKey = process.env.EPOINT_PUBLIC_KEY;
  const config = {
    hasPublicKey: Boolean(publicKey),
    hasPrivateKey: Boolean(process.env.EPOINT_PRIVATE_KEY),
    // A preview, as the name says — enough to tell which merchant account is
    // wired up, not the whole credential. `createTestPayment` already redacts
    // this same value out of the request-payload view it returns; the page was
    // shipping it in full two panels above.
    publicKeyPreview: publicKey ? `${publicKey.slice(0, 4)}…` : null,
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
