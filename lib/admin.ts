/**
 * Admin authorization utility.
 *
 * Admin user IDs are stored in the ADMIN_USER_IDS environment variable
 * as a comma-separated list of Clerk user IDs (e.g. "user_abc,user_xyz").
 *
 * To grant admin access, add the Clerk user ID to ADMIN_USER_IDS in your
 * environment configuration.
 */
export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const raw = process.env.ADMIN_USER_IDS ?? '';
  const adminIds = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}
