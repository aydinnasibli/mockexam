import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container-low mt-20">
      <div className="w-full py-12 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
          <div className="flex flex-col gap-3 max-w-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg tc-gradient flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              </div>
              <span className="text-base font-extrabold text-primary font-headline tracking-tight">Test Centre</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Your premier destination for SAT, IELTS, TOEFL, GRE and DİM mock exams. Prepare smarter, score higher.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-10">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Platform</p>
              <Link href="/exams" className="text-xs text-on-surface-variant hover:text-primary-mid transition-colors">Exams</Link>
              <Link href="/dashboard" className="text-xs text-on-surface-variant hover:text-primary-mid transition-colors">Dashboard</Link>
              <Link href="/#pricing" className="text-xs text-on-surface-variant hover:text-primary-mid transition-colors">Pricing</Link>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Legal</p>
              <Link href="#" className="text-xs text-on-surface-variant hover:text-primary-mid transition-colors">Terms of Use</Link>
              <Link href="#" className="text-xs text-on-surface-variant hover:text-primary-mid transition-colors">Privacy Policy</Link>
              <Link href="#" className="text-xs text-on-surface-variant hover:text-primary-mid transition-colors">Support</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-on-surface-variant">© 2025 Test Centre. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="text-xs text-on-surface-variant hover:text-primary-mid transition-colors">Contact</Link>
            <Link href="#" className="text-xs text-on-surface-variant hover:text-primary-mid transition-colors">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
