import { auth } from '@clerk/nextjs/server';
import SettingsClient from './SettingsClient';

export const metadata = { title: 'Parametrlər' };

export default async function SettingsPage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return <SettingsClient />;
}
