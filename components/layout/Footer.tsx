import Link from "next/link";
import { Share2, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-outline-variant/20 bg-surface-container-low">
      <div className="w-full py-12 px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div>
            <div className="text-lg font-bold text-primary font-headline mb-4">Test Centre</div>
            <p className="text-sm text-on-surface-variant max-w-sm mb-6 leading-relaxed">
              Azərbaycanın ən qabaqcıl onlayn imtahan platforması. Peşəkar hazırlıq üçün doğru ünvan.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary hover:bg-secondary hover:text-white transition-all"
              >
                <Share2 size={18} />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary hover:bg-secondary hover:text-white transition-all"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <h5 className="font-bold text-primary text-sm uppercase tracking-wide">Platforma</h5>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-sm text-on-surface-variant hover:text-secondary transition-colors">
                    İstifadəçi şərtləri
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-on-surface-variant hover:text-secondary transition-colors">
                    Məxfilik siyasəti
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h5 className="font-bold text-primary text-sm uppercase tracking-wide">Dəstək</h5>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-sm text-on-surface-variant hover:text-secondary transition-colors">
                    Yardım mərkəzi
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-on-surface-variant hover:text-secondary transition-colors">
                    Vakansiyalar
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-on-surface-variant">
            © 2024 Test Centre. Bütün hüquqlar qorunur.
          </p>
          <span className="text-xs text-on-surface-variant font-medium">Bakı, Azərbaycan</span>
        </div>
      </div>
    </footer>
  );
}
