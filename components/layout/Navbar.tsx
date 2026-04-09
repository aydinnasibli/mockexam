'use client';

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function Navbar() {
  const { isSignedIn } = useAuth();

  return (
    <header className="fixed top-0 w-full z-50 glass-nav border-b border-outline-variant/60 shadow-sm">
      <nav className="flex justify-between items-center w-full px-6 py-3.5 max-w-7xl mx-auto">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg tc-gradient flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-primary font-headline">
              Test Centre
            </span>
          </Link>
          <div className="hidden md:flex gap-1">
            <Link
              href="/exams"
              className="px-3 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors duration-150"
            >
              Exams
            </Link>
            <Link
              href="/#pricing"
              className="px-3 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors duration-150"
            >
              Pricing
            </Link>
            <Link
              href="/#about"
              className="px-3 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors duration-150"
            >
              About
            </Link>
            {isSignedIn && (
              <Link
                href="/dashboard"
                className="px-3 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors duration-150"
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isSignedIn ? (
            <>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors rounded-lg hover:bg-surface-container">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-5 py-2 bg-primary-mid text-white rounded-lg font-semibold text-sm shadow-sm hover:bg-primary transition-colors">
                  Get Started
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
