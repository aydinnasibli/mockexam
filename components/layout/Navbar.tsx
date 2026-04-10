'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { LayoutDashboard } from "lucide-react";

const navLinks = [
  { href: "/exams",   label: "Sınaqlar" },
  { href: "/about",   label: "Haqqımızda" },
  { href: "/contact", label: "Əlaqə" },
];

export default function Navbar() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_1px_12px_0_rgba(0,30,64,0.06)]">
      <nav className="flex items-center justify-between w-full px-6 h-[68px] max-w-7xl mx-auto gap-8">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div className="w-8 h-8 rounded-[10px] editorial-gradient flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <span className="text-white text-[11px] font-black tracking-tight">TC</span>
          </div>
          <span className="text-[17px] font-black text-primary tracking-tight font-headline leading-none">
            Test Centre
          </span>
        </Link>

        {/* ── Centre nav ── */}
        <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-4 py-2 text-[13.5px] font-semibold rounded-lg transition-all duration-150 ${
                  isActive
                    ? "text-primary bg-primary/[0.07]"
                    : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                }`}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-secondary" />
                )}
              </Link>
            );
          })}
        </div>

        {/* ── Right: auth ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isSignedIn ? (
            <>
              <SignInButton mode="modal">
                <button className="text-primary font-semibold px-4 py-2 hover:bg-surface-container rounded-lg transition-colors text-[13.5px]">
                  Daxil ol
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="editorial-gradient text-white px-5 py-2.5 rounded-full font-bold text-[13px] hover:opacity-90 transition-all active:scale-95 shadow-sm">
                  Qeydiyyat
                </button>
              </SignUpButton>
            </>
          ) : (
            <>
              {/* Kabinet pill — sits right next to the avatar */}
              <Link
                href="/dashboard"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                  pathname === "/dashboard"
                    ? "bg-primary/[0.07] text-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-primary"
                }`}
              >
                <LayoutDashboard size={15} className="opacity-70" />
                Kabinet
              </Link>

              {/* Thin divider */}
              <div className="w-px h-6 bg-outline-variant/60 mx-1" />

              {/* Avatar */}
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 ring-2 ring-primary/20 ring-offset-1",
                  },
                }}
              />
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
