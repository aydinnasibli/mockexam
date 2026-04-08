import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm">
      <nav className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-tighter text-blue-950 dark:text-white font-headline">
            Məşqçi
          </Link>
          <div className="hidden md:flex gap-6">
            <Link
              href="/exams"
              className="font-manrope text-sm font-semibold tracking-tight text-slate-600 dark:text-slate-400 hover:text-blue-800 transition-all duration-300 hover:opacity-80"
            >
              İmtahanlar
            </Link>
            <Link
              href="/#pricing"
              className="font-manrope text-sm font-semibold tracking-tight text-slate-600 dark:text-slate-400 hover:text-blue-800 transition-all duration-300 hover:opacity-80"
            >
              Qiymətlər
            </Link>
            <Link
              href="/#about"
              className="font-manrope text-sm font-semibold tracking-tight text-slate-600 dark:text-slate-400 hover:text-blue-800 transition-all duration-300 hover:opacity-80"
            >
              Haqqımızda
            </Link>
            <Link
              href="/dashboard"
              className="font-manrope text-sm font-semibold tracking-tight text-slate-600 dark:text-slate-400 hover:text-blue-800 transition-all duration-300 hover:opacity-80"
            >
              Panel
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-semibold text-blue-900 transition-all duration-200 hover:opacity-80">
            Daxil ol
          </button>
          <button className="px-5 py-2 bg-primary text-white rounded-xl font-semibold text-sm shadow-sm transition-all duration-200 scale-95 hover:scale-100">
            Qeydiyyat
          </button>
        </div>
      </nav>
    </header>
  );
}
