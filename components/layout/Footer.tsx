import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 mt-20">
      <div className="w-full py-12 px-6 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto">
        <div className="mb-8 md:mb-0 space-y-4 text-center md:text-left flex flex-col items-center md:items-start">
          <span className="text-base font-bold text-blue-900 font-headline">Məşqçi Platforması</span>
          <p className="font-inter text-xs text-slate-500 max-w-xs">
            Gələcəyinizi bizimlə qurun. Peşəkar sınaq mühiti və ətraflı statistika ilə hədəflərinizə çatın.
          </p>
        </div>
        <div className="flex flex-col md:items-end gap-6">
          <div className="flex gap-6 flex-wrap justify-center">
            <Link
              className="font-inter text-xs text-slate-500 hover:text-blue-600 transition-all underline-offset-4 hover:underline"
              href="#"
            >
              İstifadə şərtləri
            </Link>
            <Link
              className="font-inter text-xs text-slate-500 hover:text-blue-600 transition-all underline-offset-4 hover:underline"
              href="#"
            >
              Məxfilik siyasəti
            </Link>
            <Link
              className="font-inter text-xs text-slate-500 hover:text-blue-600 transition-all underline-offset-4 hover:underline"
              href="#"
            >
              Dəstək
            </Link>
            <Link
              className="font-inter text-xs text-slate-500 hover:text-blue-600 transition-all underline-offset-4 hover:underline"
              href="#"
            >
              Əlaqə
            </Link>
          </div>
          <p className="font-inter text-xs text-slate-500 text-center md:text-right">
            © 2024 Məşqçi Platformasından. Bütün hüquqlar qorunur.
          </p>
        </div>
      </div>
    </footer>
  );
}
