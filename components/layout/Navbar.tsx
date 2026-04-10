'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const navLinks = [
  { href: "/exams", label: "Sınaqlar" },
  { href: "/about", label: "Haqqımızda" },
  { href: "/contact", label: "Əlaqə" },
];

export default function Navbar() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();

  return (
    <header className="fixed top-0 w-full z-50 glass-nav border-b border-outline-variant/40 shadow-sm">
      <nav className="flex justify-between items-center w-full px-8 h-20 max-w-7xl mx-auto">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-2xl font-black text-primary tracking-tighter font-headline">
            Test Centre
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? "text-secondary border-b-2 border-secondary"
                      : "text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            {isSignedIn && (
              <Link
                href="/dashboard"
                className={`px-3 py-2 text-sm font-semibold transition-all ${
                  pathname === "/dashboard"
                    ? "text-secondary border-b-2 border-secondary"
                    : "text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg"
                }`}
              >
                Kabinet
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isSignedIn ? (
            <>
              <SignInButton mode="modal">
                <button className="text-primary font-semibold px-4 py-2 hover:bg-surface-container rounded-lg transition-colors text-sm">
                  Daxil ol
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="editorial-gradient text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-all active:scale-95 duration-150">
                  Qeydiyyat
                </button>
              </SignUpButton>
            </>
          ) : (
            <UserButton />
          )}
        </div>
      </nav>
    </header>
  );
}
