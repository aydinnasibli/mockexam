import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SkipLink from '@/components/ui/SkipLink';

/**
 * Chrome for the signed-out marketing pages.
 *
 * The public navbar/footer and the section's single `<main>` live here rather
 * than in the root layout: /dashboard, /admin and /exam-session are different
 * shells, and their sidebars are siblings of `<main>`, not children of it.
 * `(public)` is a route group, so none of these URLs change.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <Navbar />
      {/* `tabIndex={-1}` so the skip link actually moves focus here. Without it
          the browser scrolls to the landmark but leaves focus on <body>, and the
          next Tab returns to the top of the nav — the exact trap being avoided. */}
      <main id="content" tabIndex={-1} className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
