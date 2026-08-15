'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';
import Button from '@/components/ui/Button';

/*
 * Numbered rows rather than an icon column, matching the kabinet sidebar and
 * the numbered sections on the public pages. The admin panel used to be the
 * one place in the product still wearing the pre-redesign navy palette
 * (`text-ink`, `bg-accent-soft`, gradient buttons); it now speaks the
 * same ink language as everything else.
 */
const navLinks = [
  { href: '/admin',           n: '01', label: 'Ümumi Baxış',        exact: true  },
  { href: '/admin/exams',     n: '02', label: 'İmtahanlar',         exact: false },
  { href: '/admin/writing',   n: '03', label: 'Yazı Qiymətləndirmə', exact: false },
  { href: '/admin/purchases', n: '04', label: 'Satışlar',           exact: false },
  { href: '/admin/users',     n: '05', label: 'İstifadəçilər',      exact: false },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside
      className={`fixed top-0 left-0 z-40 flex h-screen w-60 flex-col border-r border-rule bg-bg transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Brand */}
      <div className="border-b border-rule px-5 py-5">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.25">
          <Image src="/logo.svg" alt="Testcentre" width={22} height={20} className="shrink-0" />
          <span className="text-subhead leading-none font-medium tracking-tight text-ink">
            Test<span className="font-light text-ink-soft">centre</span>
          </span>
        </Link>
      </div>

      {/* The admin marker is an ink chip, the same object the home page uses to
          mark its own column in the comparison table. */}
      <div className="px-5 pt-6 pb-3">
        <span className="inline-flex items-center rounded-full bg-ink px-2.5 py-1 font-mono text-caption tracking-[0.16em] text-bg uppercase">
          Admin
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto border-t border-rule-soft">
        {navLinks.map(({ href, n, label, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
            onClick={onClose}
              aria-current={active ? 'page' : undefined}
              className={`side-link border-b border-rule-soft ${active ? 'side-link-active' : ''}`}
            >
              <span className="n">{n}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-rule px-5 py-5">
        <Button variant="ghost" size="sm" className="w-full justify-center" href="/dashboard">
          İstifadəçi Paneli
        </Button>
        <SignOutButton>
          <button className="w-full cursor-pointer text-left text-note font-medium text-ink-mute transition-colors duration-150 hover:text-ink">
            Çıxış
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}
