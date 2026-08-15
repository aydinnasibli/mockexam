'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { MONO_SECTION as MONO_LABEL } from '@/components/ui/type-styles';

const navLinks = [
  { href: "/exams",   label: "Sınaqlar" },
  { href: "/about",   label: "Haqqımızda" },
  { href: "/contact", label: "Əlaqə" },
];


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
          <div className="shell flex h-8.5 items-center justify-between gap-4">
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
        <nav className="shell relative flex h-18 items-center justify-between">

          {/* ── Logo ── */}
          {/* -my-1 py-1: the lockup is 22px tall, 2px under the WCAG 2.5.8
              target minimum. The nav bar has a fixed height, so the padding
              cannot move anything. */}
          <Link href="/" className="-my-1 flex shrink-0 items-center gap-2.25 py-1">
            <Image src="/logo.svg" alt="Testcentre" width={22} height={20} className="shrink-0" />
            <span className="text-title leading-none font-medium tracking-tight text-ink">
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
                  className={`flex flex-col items-center gap-1.25 text-note font-medium tracking-[0.005em] transition-colors duration-150 ${
                    isActive ? "text-ink" : "text-ink-mute hover:text-ink"
                  }`}
                >
                  {label}
                  {/* The active marker is a rule under the label, not a pill.
                      `data-nav-underline` lets the route transition draw it in
                      from the left on arrival — see `.route-settle` in
                      globals.css. */}
                  <span
                    data-nav-underline={isActive ? '' : undefined}
                    className={`block h-px w-full ${isActive ? 'bg-ink' : 'bg-transparent'}`}
                  />
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
                    <button className="cursor-pointer text-note font-medium text-ink-soft transition-colors duration-150 hover:text-ink">
                      Daxil ol
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="cursor-pointer rounded-full bg-ink px-5 py-2.25 text-note font-medium text-bg transition-colors duration-150 hover:bg-ink-hover">
                      Qeydiyyat
                    </button>
                  </SignUpButton>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className={`-my-1 flex items-center gap-1.5 py-1 text-note font-medium transition-colors duration-150 ${
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
            <div className="shell py-2">
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

              {/* Same `isLoaded` gate as the desktop group: without it the
                  mobile menu shows "Daxil ol / Qeydiyyat" to a signed-in user
                  for the moment before Clerk resolves. */}
              <div className="border-t border-rule py-4">
                {!isLoaded ? (
                  <div className="h-10" aria-hidden />
                ) : !isSignedIn ? (
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
                        className="flex-1 cursor-pointer rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-ink-hover"
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
