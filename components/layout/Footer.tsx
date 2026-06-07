import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-rule bg-surface-2">
      <div className="max-w-310 mx-auto px-8 pt-20 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-16">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="dot" />
              <span className="font-display text-[22px] font-medium text-ink tracking-tight">
                Test<span className="font-normal">centre</span>
              </span>
            </div>
            <p className="text-[15px] text-ink-soft leading-[1.6] max-w-85">
              Akademik imtahan hazırlığı — sadə, ölçülə bilən, ciddi.
            </p>
          </div>

          {/* Platforma */}
          <div>
            <div className="eyebrow mb-4">Platforma</div>
            <div className="flex flex-col gap-3">
              <Link href="/exams" className="text-[15px] text-ink-soft hover:text-ink transition-colors">
                Sınaqlar
              </Link>
              <Link href="/dashboard" className="text-[15px] text-ink-soft hover:text-ink transition-colors">
                Kabinet
              </Link>
              <Link href="/dashboard/analytics" className="text-[15px] text-ink-soft hover:text-ink transition-colors">
                Analitika
              </Link>
              <span className="text-[15px] text-ink-mute">Qiymətlər</span>
            </div>
          </div>

          {/* Şirkət */}
          <div>
            <div className="eyebrow mb-4">Şirkət</div>
            <div className="flex flex-col gap-3">
              <Link href="/about" className="text-[15px] text-ink-soft hover:text-ink transition-colors">
                Haqqımızda
              </Link>
              <Link href="/contact" className="text-[15px] text-ink-soft hover:text-ink transition-colors">
                Əlaqə
              </Link>
              <span className="text-[15px] text-ink-mute">Karyera</span>
              <span className="text-[15px] text-ink-mute">Blog</span>
            </div>
          </div>

          {/* Hüquqi */}
          <div>
            <div className="eyebrow mb-4">Hüquqi</div>
            <div className="flex flex-col gap-3">
              <Link href="/legal/terms" className="text-[15px] text-ink-soft hover:text-ink transition-colors">
                İstifadə şərtləri
              </Link>
              <Link href="/legal/privacy" className="text-[15px] text-ink-soft hover:text-ink transition-colors">
                Məxfilik
              </Link>
              <Link href="/legal/cookies" className="text-[15px] text-ink-soft hover:text-ink transition-colors">
                Cookie
              </Link>
              <Link href="/legal/refund" className="text-[15px] text-ink-soft hover:text-ink transition-colors">
                Geri qaytarma
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-rule flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="eyebrow">© 2026 Testcentre · Bakı, Azərbaycan</p>
          <span className="eyebrow">tr · az · en</span>
        </div>
      </div>
    </footer>
  );
}
