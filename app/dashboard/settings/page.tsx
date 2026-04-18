import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

export const metadata = { title: 'Parametrlər — Test Centre' };

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return <SettingsClient />;
}
