'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const navLinks = [
  { href: "/exams",   label: "Sınaqlar" },
  { href: "/about",   label: "Haqqımızda" },
  { href: "/contact", label: "Əlaqə" },
];

export default function Navbar() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ y: -68, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="fixed top-0 w-full z-50 nav-frosted border-b border-rule"
      >
        <nav className="flex items-center justify-between w-full px-4 md:px-6 h-17 max-w-7xl mx-auto">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <span className="dot shrink-0 relative top-px" />
            <span className="font-display text-[22px] font-medium text-ink tracking-tight leading-none">
              Test<em className="italic font-normal">centre</em>
            </span>
          </Link>

          {/* ── Centre nav (desktop) ── */}
          <div className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-3.5 py-2 text-[14px] font-medium rounded-full transition-all duration-150 ${
                    isActive
                      ? "text-ink bg-surface-2"
                      : "text-ink-soft hover:text-ink hover:bg-surface-2"
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-ink" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── Right: desktop auth + mobile hamburger ── */}
          <div className="flex items-center gap-2">
            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-2">
              {!isSignedIn ? (
                <>
                  <SignInButton mode="modal">
                    <button className="text-ink-soft font-medium px-4 py-2 hover:text-ink hover:bg-surface-2 rounded-lg transition-colors text-[13px]">
                      Daxil ol
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="btn-primary py-2! px-5! text-[13px]!">
                      Qeydiyyat
                    </button>
                  </SignUpButton>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                      pathname === "/dashboard"
                        ? "bg-surface-2 text-ink"
                        : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    <LayoutDashboard size={15} className="opacity-70" />
                    Kabinet
                  </Link>
                  <div className="w-px h-5 bg-rule mx-1" />
                  <div className="w-8 h-8 rounded-full ring-2 ring-rule ring-offset-1 overflow-hidden pointer-events-none select-none shrink-0 flex items-center justify-center">
                    {user?.imageUrl
                      ? <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-ink flex items-center justify-center text-bg text-xs font-black">
                          {user?.firstName?.[0] ?? '?'}
                        </div>
                    }
                  </div>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-surface-2 transition-colors text-ink"
              onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? 'Menyu bağla' : 'Menyu aç'}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed top-17 left-0 right-0 z-50 nav-frosted border-b border-rule md:hidden"
            >
              <div className="px-4 py-3 space-y-0.5">
                {navLinks.map(({ href, label }) => {
                  const isActive = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-4 py-3 text-[15px] font-medium rounded-xl transition-colors ${
                        isActive ? "text-ink bg-surface-2" : "text-ink-soft hover:text-ink hover:bg-surface-2"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}

                <div className="pt-2 pb-1 border-t border-rule mt-2">
                  {!isSignedIn ? (
                    <div className="flex gap-2 pt-2">
                      <SignInButton mode="modal">
                        <button
                          onClick={() => setMobileOpen(false)}
                          className="flex-1 py-2.5 px-4 rounded-xl border border-rule text-[14px] font-medium text-ink-soft hover:bg-surface-2 transition-colors"
                        >
                          Daxil ol
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button
                          onClick={() => setMobileOpen(false)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-ink text-bg text-[14px] font-medium hover:bg-ink/90 transition-colors"
                        >
                          Qeydiyyat
                        </button>
                      </SignUpButton>
                    </div>
                  ) : (
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[15px] font-medium text-ink hover:bg-surface-2 transition-colors"
                    >
                      <LayoutDashboard size={16} className="opacity-70" />
                      Kabinetim
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
