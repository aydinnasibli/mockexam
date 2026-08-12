'use client';

import Link from "next/link";
import Image from "next/image";
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

const MONO_LABEL = "font-mono text-[11px] tracking-[0.14em] uppercase";

interface Props {
  /** The bulletin strip is the top tier of the nav; pages that need the
   *  chrome as short as possible can drop it. */
  showBulletin?: boolean;
}

/**
 * Two stacked bars in normal flow — bulletin strip, then the 72px nav bar.
 * It is deliberately not fixed: the redesign runs an ink masthead directly
 * under the nav on several pages, and a floating bar would sit on top of it.
 * Pages therefore carry no top offset for the nav.
 */
export default function Navbar({ showBulletin = true }: Props) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="w-full bg-bg">
      {showBulletin && (
        <div className="border-b border-rule bg-surface-2">
          <div className="mx-auto flex h-8.5 w-full max-w-320 items-center justify-between gap-4 px-6 lg:px-10">
            <span className={`${MONO_LABEL} truncate text-ink-mute`}>
              Akademik sınaq mərkəzi · Bakı
            </span>
            <span className={`${MONO_LABEL} hidden text-ink-mute sm:block`}>
              Sual bankı həftəlik yenilənir
            </span>
          </div>
        </div>
      )}

      <div className="border-b border-rule">
        <nav className="relative mx-auto flex h-18 w-full max-w-320 items-center justify-between px-6 lg:px-10">

          {/* ── Logo ── */}
          <Link href="/" className="flex shrink-0 items-center gap-2.25">
            <Image src="/logo.svg" alt="Testcentre" width={22} height={20} className="shrink-0" />
            <span className="text-[22px] leading-none font-medium tracking-tight text-ink">
              Test<span className="font-light text-ink-soft">centre</span>
            </span>
          </Link>

          {/* ── Centre nav (desktop) ──
              Absolutely centred rather than a flex sibling: as a sibling its
              position depended on the auth group's width, so the links slid
              sideways the moment Clerk resolved. */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 md:flex">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center gap-1.25 text-[13px] font-medium tracking-[0.005em] transition-colors duration-150 ${
                    isActive ? "text-ink" : "text-ink-mute hover:text-ink"
                  }`}
                >
                  {label}
                  {/* The active marker is a rule under the label, not a pill. */}
                  <span className={`block h-px w-full ${isActive ? 'bg-ink' : 'bg-transparent'}`} />
                </Link>
              );
            })}
          </div>

          {/* ── Right: auth (desktop) + mobile hamburger ── */}
          <div className="flex items-center gap-2">
            {/* The reserved width is the widest of the three states (signed-out
                is 163px), so the auth area's right edge never moves as Clerk
                resolves — only the content inside it changes. */}
            <div className="hidden items-center justify-end gap-4.5 md:flex md:min-w-41">
              {!isLoaded ? (
                /* Reserve space until Clerk resolves — prevents the signed-out
                   buttons flashing before swapping to the signed-in state. */
                <div className="h-9 w-41" aria-hidden />
              ) : !isSignedIn ? (
                <>
                  <SignInButton mode="modal">
                    <button className="cursor-pointer text-[13px] font-medium text-ink-soft transition-colors duration-150 hover:text-ink">
                      Daxil ol
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="cursor-pointer rounded-full bg-ink px-5 py-2.25 text-[13px] font-medium text-bg transition-colors duration-150 hover:bg-[#2A2A2A]">
                      Qeydiyyat
                    </button>
                  </SignUpButton>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-150 ${
                      pathname.startsWith("/dashboard") ? "text-ink" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    <LayoutDashboard size={15} />
                    Kabinet
                  </Link>
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-rule">
                    {user?.imageUrl
                      ? <Image src={user.imageUrl} alt="" width={32} height={32} className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center bg-ink text-xs font-bold text-bg">
                          {user?.firstName?.[0] ?? '?'}
                        </div>
                    }
                  </div>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="-mr-2 p-2 text-ink-soft transition-colors hover:text-ink md:hidden"
              onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? 'Menyu bağla' : 'Menyu aç'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b border-rule bg-bg md:hidden"
          >
            <div className="mx-auto w-full max-w-320 px-6 py-2">
              {navLinks.map(({ href, label }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`block border-b border-rule py-3.5 text-base font-medium transition-colors last:border-b-0 ${
                      isActive ? "text-ink" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}

              <div className="border-t border-rule py-4">
                {!isSignedIn ? (
                  <div className="flex gap-2">
                    <SignInButton mode="modal">
                      <button
                        onClick={() => setMobileOpen(false)}
                        className="flex-1 cursor-pointer rounded-full border border-rule px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2"
                      >
                        Daxil ol
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button
                        onClick={() => setMobileOpen(false)}
                        className="flex-1 cursor-pointer rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-[#2A2A2A]"
                      >
                        Qeydiyyat
                      </button>
                    </SignUpButton>
                  </div>
                ) : (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 text-base font-medium text-ink"
                  >
                    <LayoutDashboard size={16} className="opacity-70" />
                    Kabinetim
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
