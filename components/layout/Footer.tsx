import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-outline-variant/30 bg-slate-100 mt-20">
      <div className="w-full py-12 px-6 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto gap-8">
        <div className="mb-4 md:mb-0 text-center md:text-left">
          <span className="text-base font-bold text-primary block mb-2 font-headline">Məşqçi</span>
          <p className="text-xs text-on-surface-variant max-w-xs">
            Azərbaycanın ən qabaqcıl onlayn sınaq platforması ilə gələcəyinizi bu gündən qurun.
          </p>
        </div>
        <div className="flex flex-col md:items-end gap-6">
          <div className="flex flex-wrap justify-center md:justify-end gap-6">
            <Link href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors underline-offset-4 hover:underline">İstifadə şərtləri</Link>
            <Link href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors underline-offset-4 hover:underline">Məxfilik siyasəti</Link>
            <Link href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors underline-offset-4 hover:underline">Dəstək</Link>
            <Link href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors underline-offset-4 hover:underline">Əlaqə</Link>
          </div>
          <p className="text-xs text-on-surface-variant">© 2025 Məşqçi Platforması. Bütün hüquqlar qorunur.</p>
        </div>
      </div>
    </footer>
  );
}
