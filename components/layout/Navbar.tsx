'use client';

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function Navbar() {
  const { isSignedIn } = useAuth();

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm glass-nav">
      <nav className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-tighter text-primary font-headline">
            Məşqçi
          </Link>
          <div className="hidden md:flex gap-6">
            <Link
              href="/exams"
              className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              İmtahanlar
            </Link>
            <Link
              href="/#pricing"
              className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              Qiymətlər
            </Link>
            <Link
              href="/#about"
              className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              Haqqımızda
            </Link>
            {isSignedIn && (
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200"
              >
                Panel
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isSignedIn ? (
            <>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-semibold text-primary hover:opacity-80 transition-opacity">
                  Daxil ol
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-5 py-2 bg-primary text-white rounded-xl font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity">
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
