import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f0f2f5] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-8xl font-black text-primary/10 leading-none select-none">404</p>
        <h1 className="text-2xl font-extrabold text-primary font-headline mt-2 mb-3">
          Səhifə tapılmadı
        </h1>
        <p className="text-sm text-on-surface-variant mb-8">
          Axtardığınız səhifə mövcud deyil və ya köçürülüb.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 editorial-gradient text-white px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-sm"
        >
          Ana səhifəyə qayıt
        </Link>
      </div>
    </main>
  );
}
