import type { Metadata } from 'next';
import { ORGANIZATION_REF, jsonLd, pageMetadata, webPageSchema } from '@/lib/shared/seo';

const DESCRIPTION =
  'Testcentre ilə əlaqə saxlayın — testcentreaz@proton.me. Sual, geri bildirim və tərəfdaşlıq müraciətlərinizə 24 saat ərzində insan cavab verir.';

export const metadata: Metadata = pageMetadata({
  title: 'Əlaqə',
  description: DESCRIPTION,
  path: '/contact',
});

/*
 * `ContactPage`, pointing at the organisation whose `contactPoint` the root
 * layout already declares. Rendered here rather than in `page.tsx` because the
 * page is a client component, and this layout is the server file that owns the
 * route's metadata anyway.
 */
const contactSchema = webPageSchema({
  type: 'ContactPage',
  path: '/contact',
  name: 'Əlaqə',
  description: DESCRIPTION,
  mainEntity: ORGANIZATION_REF,
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(contactSchema) }} />
      {children}
    </>
  );
}
