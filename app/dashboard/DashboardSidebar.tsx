'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';

/** User data resolved server-side in the dashboard layout — avoids client-side pop-in. */
export interface ViewerSummary {
  firstName: string;
  fullName: string;
  email: string;
  imageUrl: string;
}

interface Props {
  viewer: ViewerSummary;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({ viewer, isOpen = false, onClose }: Props) {
  const pathname = usePathname();

  /*
   * The icons that used to sit on these rows are gone, replaced by the mono
   * index the public pages number their sections with. Nothing on the front
   * end is labelled by a glyph — it is labelled by a number and a rule — and
   * a column of lucide icons was the single loudest tell that the kabinet
   * belonged to a different product.
   */
  const navItems = [
    { href: '/dashboard',           n: '01', label: 'Panel',       active: pathname === '/dashboard' },
    { href: '/dashboard/analytics', n: '02', label: 'Nəticələr',   active: pathname === '/dashboard/analytics' || pathname.startsWith('/dashboard/analytics/') },
    { href: '/dashboard/settings',  n: '03', label: 'Parametrlər', active: pathname === '/dashboard/settings' },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 flex h-screen w-60 flex-col border-r border-rule bg-bg transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Brand — the public navbar's lockup at the public navbar's size. */}
      <div className="border-b border-rule px-5 py-5">
        <Link href="/" onClick={onClose} className="-my-1 flex items-center gap-2.25 py-1">
          <Image src="/logo.svg" alt="Testcentre" width={22} height={20} className="shrink-0" />
          <span className="text-[19px] leading-none font-medium tracking-tight text-ink">
            Test<span className="font-light text-ink-soft">centre</span>
          </span>
        </Link>
      </div>

      <div className="px-5 pt-6 pb-3">
        <span className="mono-label mono-label-lg text-ink">Kabinet</span>
      </div>

      <nav className="flex-1 overflow-y-auto border-t border-rule-soft">
        {navItems.map(({ href, n, label, active }) => (
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
        ))}
      </nav>

      <div className="space-y-3 border-t border-rule px-5 py-5">
        <Link
          href="/exams"
          onClick={onClose}
          className="btn-primary btn-sm w-full justify-center"
        >
          Sınaq əldə et <span className="arrow" aria-hidden>→</span>
        </Link>
        <SignOutButton>
          <button className="-my-1 w-full cursor-pointer py-1 text-left text-[13px] font-medium text-ink-mute transition-colors duration-150 hover:text-ink">
            Çıxış
          </button>
        </SignOutButton>
      </div>

      {/* Viewer */}
      <div className="flex items-center gap-3 border-t border-rule px-5 py-4">
        {viewer.imageUrl ? (
          <Image
            src={viewer.imageUrl}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-rule"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink">
            <span className="text-xs font-bold text-bg">{viewer.firstName[0]}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="m-0 truncate text-[13px] leading-tight font-medium text-ink">{viewer.fullName}</p>
          <p className="m-0 truncate text-xs text-ink-mute">{viewer.email}</p>
        </div>
      </div>
    </aside>
  );
}
