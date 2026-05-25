import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p
          className="font-display font-normal text-ink-faint leading-none select-none"
          style={{ fontSize: 'clamp(80px, 15vw, 140px)', letterSpacing: '-0.04em' }}
        >
          404
        </p>
        <h1 className="t-headline mt-4 mb-3">
          Səhifə tapılmadı
        </h1>
        <p className="text-[15px] text-ink-soft mb-8 leading-relaxed">
          Axtardığınız səhifə mövcud deyil və ya köçürülüb.
        </p>
        <Link href="/" className="btn-primary">
          Ana səhifəyə qayıt <span className="arrow">→</span>
        </Link>
      </div>
    </main>
  );
}
