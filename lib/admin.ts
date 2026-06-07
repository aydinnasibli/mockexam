import { auth } from '@clerk/nextjs/server';
import type { Roles } from '@/types/globals';

export async function checkRole(role: Roles): Promise<boolean> {
  const { sessionClaims } = await auth();
  return sessionClaims?.metadata?.role === role;
}
