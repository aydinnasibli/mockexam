'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const navLinks = [
  { href: "/exams",   label: "Sınaqlar" },
  { href: "/about",   label: "Haqqımızda" },
  { href: "/contact", label: "Əlaqə" },
];

export default function Navbar() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 nav-premium border-b transition-shadow duration-300 ${
          scrolled ? "border-rule shadow-[0_4px_24px_rgba(26,26,26,0.07),0_1px_4px_rgba(26,26,26,0.05)]" : "border-rule/60"
        }`}
      >
        <nav className="flex items-center justify-between w-full px-6 md:px-10 h-18 max-w-7xl mx-auto">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <Image src="/logo.svg" alt="Testcentre" width={24} height={22} className="shrink-0 group-hover:scale-110 transition-transform duration-200" />
            <span className="font-display text-2xl font-medium text-ink tracking-tight leading-none">
              Test<span className="font-normal" style={{ color: 'var(--color-ink-soft)' }}>centre</span>
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
                  className={`relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-150 ${
                    isActive
                      ? "text-ink"
                      : "text-ink-mute hover:text-ink hover:bg-surface-2"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-bg"
                      className="absolute inset-0 bg-surface-3 rounded-xl -z-10"
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    />
                  )}
                  {label}
                </Link>
              );
            })}
          </div>

          {/* ── Right: desktop auth + mobile hamburger ── */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              {!isLoaded ? (
                /* Reserve space until Clerk resolves — prevents the signed-out
                   buttons flashing before swapping to the signed-in state. */
                <div className="w-44 h-9" aria-hidden />
              ) : !isSignedIn ? (
                <>
                  <SignInButton mode="modal">
                    <button className="text-ink-mute hover:text-ink text-sm font-medium px-4 py-2 rounded-lg hover:bg-surface-2 transition-all duration-200">
                      Daxil ol
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="text-sm font-medium px-5 py-2 bg-ink text-bg rounded-full hover:bg-ink/85 transition-colors">
                      Qeydiyyat
                    </button>
                  </SignUpButton>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname.startsWith("/dashboard")
                        ? "bg-surface-2 text-ink"
                        : "text-ink-mute hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    <LayoutDashboard size={15} />
                    Kabinet
                  </Link>
                  <div className="w-px h-5 bg-rule mx-1" />
                  <div className="w-8 h-8 rounded-full ring-2 ring-rule ring-offset-1 overflow-hidden shrink-0 flex items-center justify-center">
                    {user?.imageUrl
                      ? <Image src={user.imageUrl} alt="" width={32} height={32} className="w-full h-full object-cover" />
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
              className="md:hidden p-2 rounded-lg hover:bg-surface-2 transition-colors text-ink-soft"
              onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? 'Menyu bağla' : 'Menyu aç'}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={mobileOpen ? 'close' : 'open'}
                  initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="block"
                >
                  {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-[72px] left-0 right-0 z-50 nav-premium border-b border-rule md:hidden"
            >
              <div className="px-4 py-3 space-y-0.5 max-w-7xl mx-auto">
                {navLinks.map(({ href, label }) => {
                  const isActive = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-4 py-3 text-base font-medium rounded-xl transition-colors ${
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
                          className="flex-1 py-2.5 px-4 rounded-xl border border-rule text-sm font-medium text-ink-soft hover:bg-surface-2 transition-colors"
                        >
                          Daxil ol
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button
                          onClick={() => setMobileOpen(false)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-ink text-bg text-sm font-medium hover:bg-ink/90 transition-colors"
                        >
                          Qeydiyyat
                        </button>
                      </SignUpButton>
                    </div>
                  ) : (
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-base font-medium text-ink hover:bg-surface-2 transition-colors"
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
