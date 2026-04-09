"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/exams", label: "Browse Exams", icon: "menu_book" },
    { href: "/results", label: "Results", icon: "assessment" },
    { href: "/analytics", label: "Analytics", icon: "analytics" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <aside className="hidden md:flex h-[calc(100vh-4rem)] w-64 bg-surface border-r border-outline-variant fixed left-0 top-16 flex-col p-4 gap-2 z-40">
      <div className="flex items-center gap-3 px-2 py-4 mb-2 border-b border-outline-variant">
        <div className="w-9 h-9 rounded-lg tc-gradient flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
        </div>
        <div>
          <p className="text-sm font-bold text-primary">Test Centre</p>
          <p className="text-xs text-on-surface-variant">Student Portal</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                isActive
                  ? "bg-accent-container text-primary-mid font-bold"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-primary"
              }`}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {link.icon}
              </span>
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 bg-accent-container rounded-xl border border-accent/20">
        <p className="text-xs text-primary-mid font-semibold mb-2">Boost your score</p>
        <Link href="/exams" className="w-full block text-center bg-primary-mid text-white py-2 rounded-lg text-xs font-bold hover:bg-primary transition-colors">
          Get New Exam
        </Link>
      </div>
    </aside>
  );
}
