import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Səhifə tapılmadı',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      {/*
        Navbar and Footer are rendered here so a 404 is not a dead end: it was
        previously a bare card whose only outbound link was the homepage, which
        wastes the crawl and strands the visitor.
      */}
      <Navbar />
      <main className="min-h-screen bg-bg flex items-center justify-center px-6 py-24">
        <div className="text-center max-w-md">
          <p
            className="font-display font-normal text-ink-faint text-8xl md:text-9xl leading-none tracking-tighter select-none"
          >
            404
          </p>
          <h1 className="font-display font-normal text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight text-ink mt-4 mb-3">
            Səhifə tapılmadı
          </h1>
          <p className="text-base text-ink-soft mb-8 leading-relaxed">
            Axtardığınız səhifə mövcud deyil və ya köçürülüb.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/exams" className="btn-primary">
              Sınaqlara bax <span className="arrow">→</span>
            </Link>
            <Link href="/" className="btn-ghost">
              Ana səhifə
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
