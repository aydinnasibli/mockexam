import { auth } from '@clerk/nextjs/server';
import { getUserSettings } from '@/lib/actions/settings';
import SettingsClient from './SettingsClient';

export const metadata = { title: 'Parametrlər' };

export default async function SettingsPage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  // Read server-side and hand down as props. The client used to fetch this
  // itself in a mount effect, which meant a full client→server round-trip after
  // hydration and a target date/type that rendered blank and then filled in.
  // `getUserSettings` already returns null rather than throwing on a DB error,
  // so a failure here still renders the page with empty fields.
  const settings = await getUserSettings();

  return (
    <SettingsClient
      initialTargetDate={settings?.targetExamDate ?? ''}
      initialTargetType={settings?.targetExamType ?? ''}
    />
  );
}
