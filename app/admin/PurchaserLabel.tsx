import Link from 'next/link';

interface Props {
  userId: string;
  email: string | null;
  deletedAt: Date | null;
}

/**
 * Who made a purchase, for the admin purchase tables.
 *
 * The email is joined from the local `users` copy in the same query as the
 * purchase. It can be missing for two different reasons, and each is labelled
 * rather than left blank: the profile has not synced yet (show the id), or the
 * account was deleted and its tombstone holds no profile (nothing to link to —
 * Clerk no longer has the user either).
 */
export default function PurchaserLabel({ userId, email, deletedAt }: Props) {
  if (deletedAt) {
    return <span className="text-xs text-ink-mute">Silinmiş hesab</span>;
  }
  return (
    <Link
      href={`/admin/users/${userId}`}
      className="text-xs text-ink-soft transition-colors hover:text-ink"
    >
      {email ?? <span className="num">…{userId.slice(-10)}</span>}
    </Link>
  );
}
