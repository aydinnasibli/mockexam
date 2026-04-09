"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, FileBarChart, BarChart2, Settings } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Kabinet", icon: LayoutDashboard },
  { href: "/exams", label: "Sınaqlar", icon: BookOpen },
  { href: "/results", label: "Nəticələr", icon: FileBarChart },
  { href: "/analytics", label: "Analitika", icon: BarChart2 },
  { href: "/settings", label: "Parametrlər", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex h-[calc(100vh-4rem)] w-64 bg-surface border-r border-outline-variant fixed left-0 top-16 flex-col p-4 gap-2 z-40">
      <div className="flex items-center gap-3 px-2 py-4 mb-2 border-b border-outline-variant">
        <div className="w-9 h-9 rounded-lg editorial-gradient flex items-center justify-center">
          <BookOpen className="text-white" size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-primary">Test Centre</p>
          <p className="text-xs text-on-surface-variant">Tələbə Portalı</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                isActive
                  ? "bg-secondary-fixed text-primary font-bold"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-primary"
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 bg-secondary-fixed rounded-xl border border-secondary-fixed-dim/40">
        <p className="text-xs text-primary font-semibold mb-2">Daha çox sınaq əldə et</p>
        <Link href="/exams" className="w-full block text-center editorial-gradient text-white py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
          Kataloqa bax
        </Link>
      </div>
    </aside>
  );
}
