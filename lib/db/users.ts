import 'server-only';
import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { UserWebhookEvent } from '@clerk/nextjs/webhooks';
import { db } from '@/lib/infra/db';
import {
  users,
  examResults,
  examSessions,
  playedAudio,
  userSettings,
  freeClaims,
  type NewUser,
} from '@/lib/db/schema';

/** A Clerk user as it arrives in a `user.created` or `user.updated` payload. */
export type ClerkUserJSON = Extract<
  UserWebhookEvent,
  { type: 'user.created' | 'user.updated' }
>['data'];

/** `excluded.<column>`: the value the conflicting INSERT proposed. */
const excluded = (column: AnyPgColumn) => sql`excluded.${sql.identifier(column.name)}`;

/** The columns this app keeps from a Clerk user. */
export function userRowFromClerk(data: ClerkUserJSON): NewUser {
  const primaryEmail = data.email_addresses.find(e => e.id === data.primary_email_address_id);
  return {
    id: data.id,
    email: primaryEmail?.email_address ?? null,
    firstName: data.first_name || null,
    lastName: data.last_name || null,
    imageUrl: data.image_url || null,
    clerkCreatedAt: new Date(data.created_at),
    clerkUpdatedAt: new Date(data.updated_at),
  };
}

/**
 * Guarantees a `users` row for this id, so the insert that follows cannot trip
 * a foreign key.
 *
 * The webhook cannot be the only way a row appears: Clerk sends `user.created`
 * asynchronously, and a new account can reach checkout inside the same second.
 * A bare id is enough — the webhook fills the profile in when it lands, and a
 * row with no `clerk_updated_at` loses to anything Clerk sends.
 *
 * DO NOTHING, so an existing row is never touched, and a tombstone is never
 * revived.
 *
 * Called wherever a user-owned row is CREATED from an id nothing yet vouches
 * for: checkout, the payment webhook, the free claim, an admin grant and
 * settings. Sessions, audio claims and results need no call — each is gated on
 * `hasExamAccess`, which requires a COMPLETED purchase, and `purchases.user_id`
 * is itself a foreign key, so the row is already guaranteed.
 */
export async function ensureUser(userId: string): Promise<void> {
  await db.insert(users).values({ id: userId }).onConflictDoNothing({ target: users.id });
}

/**
 * Applies a Clerk user payload. Idempotent, and safe against out-of-order
 * delivery.
 *
 * `setWhere` carries both guards in the one statement:
 *   - a tombstone matches nothing, so a deleted account stays deleted however
 *     late a `user.updated` for it arrives;
 *   - an update older than what is stored matches nothing, so a delayed retry
 *     cannot overwrite a newer email with a stale one.
 * A redelivery of the same event carries the same `updated_at`, so `<=` lets it
 * through as a harmless rewrite of identical values.
 */
export async function upsertUserFromClerk(data: ClerkUserJSON): Promise<void> {
  await db
    .insert(users)
    .values(userRowFromClerk(data))
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: excluded(users.email),
        firstName: excluded(users.firstName),
        lastName: excluded(users.lastName),
        imageUrl: excluded(users.imageUrl),
        clerkCreatedAt: excluded(users.clerkCreatedAt),
        clerkUpdatedAt: excluded(users.clerkUpdatedAt),
        updatedAt: new Date(),
      },
      setWhere: and(
        isNull(users.deletedAt),
        or(isNull(users.clerkUpdatedAt), lte(users.clerkUpdatedAt, excluded(users.clerkUpdatedAt))),
      ),
    });
}

/**
 * Carries out an account deletion: the person's activity goes, their payment
 * records stay, and their `users` row becomes a tombstone.
 *
 * Removed: results (answers cascade), sessions, audio claims, settings and the
 * free claim — everything describing what the person did. Kept: `purchases`. A
 * sale is a financial record the business must retain, and once the tombstone
 * has nulled the email and name it no longer identifies anyone.
 *
 * One batch, which Neon runs as a single transaction over HTTP, so a deletion
 * is applied completely or not at all. If it fails, the webhook answers 500 and
 * Svix delivers it again; every statement is idempotent, so that retry is safe.
 *
 * The tombstone is inserted when no row exists yet, so a `user.deleted` that
 * arrives before `user.created` still blocks the profile from being written.
 */
export async function deleteUserData(userId: string): Promise<void> {
  await db.batch([
    db
      .insert(users)
      .values({ id: userId, deletedAt: new Date() })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: null,
          firstName: null,
          lastName: null,
          imageUrl: null,
          // The first deletion's timestamp stands; a redelivery must not move it.
          deletedAt: sql`coalesce(${users.deletedAt}, now())`,
          updatedAt: new Date(),
        },
      }),
    db.delete(examResults).where(eq(examResults.userId, userId)),
    db.delete(examSessions).where(eq(examSessions.userId, userId)),
    db.delete(playedAudio).where(eq(playedAudio.userId, userId)),
    db.delete(userSettings).where(eq(userSettings.userId, userId)),
    db.delete(freeClaims).where(eq(freeClaims.userId, userId)),
  ]);
}
