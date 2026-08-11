import type { Metadata } from 'next';
import FontTestClient from './FontTestClient';

/*
 * Internal type-chooser. Not linked from anywhere and explicitly de-indexed:
 * it loads twelve font families, so it must never be crawled or reachable
 * from navigation. Delete the route once a pairing is picked.
 */
export const metadata: Metadata = {
  title: 'Font seçimi',
  robots: { index: false, follow: false },
};

export default function FontTestPage() {
  return <FontTestClient />;
}
