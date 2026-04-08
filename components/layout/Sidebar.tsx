"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Panel", icon: "dashboard" },
    { href: "/exams/my", label: "İmtahanlarım", icon: "menu_book" },
    { href: "/results", label: "Nəticələr", icon: "assessment" },
    { href: "/analytics", label: "Analitika", icon: "analytics" },
    { href: "/settings", label: "Ayarlar", icon: "settings" },
  ];

  return (
    <aside className="hidden md:flex h-[calc(100vh-80px)] w-64 bg-slate-50 dark:bg-slate-950 border-r-0 fixed left-0 top-20 flex-col p-4 gap-2 z-40">
      <div className="flex items-center gap-3 px-2 py-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center overflow-hidden">
          <img
            className="w-full h-full object-cover"
            alt="User avatar"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAea_5K6-XNLcFV-LbZHnvvqKE9b8KyLy21aw8obXHn016e6zmZIWdX-jaPBsAmvmy9QfsnlX44TcgtuZNyNV-iTFHlWeMba6tUqN_mwa8wJlpl7FElqPPOQhgSaByIneEQhD8Fm2P56MiZ_kXpIv3ScHBN8qNLPYQ3vcizuIPQmYj1x4r3YadrUMV3KWcs1OwCDc5BV0pl-0zhU-LGhZRVodKMtwP0pXFigSUFboVy_nzUZSx1jnlIdEstFCE1AFT7sKnre4A6A_cy"
          />
        </div>
        <div>
          <p className="font-inter text-sm font-bold text-blue-900">İstifadəçi Paneli</p>
          <p className="font-inter text-xs text-slate-500">Akademik tərəqqi</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-transform hover:translate-x-1 ${
                isActive
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {link.icon}
              </span>
              <span className="font-inter text-sm font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 bg-primary-container rounded-xl text-white">
        <p className="text-xs text-on-primary-container font-medium mb-2">Hazırlıq səviyyəni artır</p>
        <button className="w-full bg-secondary text-white py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
          Yeni İmtahan Al
        </button>
      </div>
    </aside>
  );
}
