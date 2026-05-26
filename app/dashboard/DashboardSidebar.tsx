'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { LayoutDashboard, BarChart2, Settings, PlusCircle, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

const navContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
};
const navItem: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({ isOpen = false, onClose }: Props) {
  const { user } = useUser();
  const pathname = usePathname();

  const firstName = user?.firstName ?? 'Tələbə';
  const fullName  = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Tələbə';
  const email     = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const imageUrl  = user?.imageUrl;

  const navItems = [
    { href: '/dashboard',           icon: LayoutDashboard, label: 'Panel',       active: pathname === '/dashboard' },
    { href: '/dashboard/analytics', icon: BarChart2,       label: 'Nəticələr',   active: pathname === '/dashboard/analytics' || pathname.startsWith('/dashboard/analytics/') },
    { href: '/dashboard/settings',  icon: Settings,        label: 'Parametrlər', active: pathname === '/dashboard/settings' },
  ];

  return (
    <motion.aside
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`h-screen w-60 fixed left-0 top-0 flex flex-col bg-surface border-r border-rule z-40 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Brand */}
      <motion.div
        className="px-5 py-5 border-b border-rule"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Link href="/" onClick={onClose} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-ink flex items-center justify-center shrink-0">
            <span className="text-bg text-[10px] font-black">TC</span>
          </div>
          <span className="text-[15px] font-black text-ink tracking-tight font-display">
            Test<span className="font-light">centre</span>
          </span>
        </Link>
      </motion.div>

      {/* Eyebrow */}
      <div className="px-5 pt-5 pb-1">
        <p className="eyebrow">Kabinet</p>
      </div>

      {/* Nav */}
      <motion.nav
        className="flex-1 px-3 pt-2 space-y-0.5 overflow-y-auto"
        variants={navContainer}
        initial="hidden"
        animate="show"
      >
        {navItems.map(({ href, icon: Icon, label, active: isActive }) => (
          <motion.div key={href} variants={navItem}>
            <Link
              href={href}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-surface-2 text-ink'
                  : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-ink shrink-0" />
              )}
              <Icon size={15} className={isActive ? 'text-ink opacity-70' : 'opacity-40'} style={isActive ? {} : {}} />
              {label}
            </Link>
          </motion.div>
        ))}
      </motion.nav>

      {/* Bottom actions */}
      <motion.div
        className="px-3 py-4 border-t border-rule space-y-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.45 }}
      >
        <Link
          href="/exams"
          onClick={onClose}
          className="w-full bg-ink text-bg py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-ink/90 transition-colors text-sm"
        >
          <PlusCircle size={14} /> Sınaq əldə et
        </Link>
        <SignOutButton>
          <button className="w-full text-ink-soft py-2 px-4 flex items-center gap-2.5 hover:text-error transition-colors text-sm font-medium rounded-xl hover:bg-surface-2">
            <LogOut size={14} /> Çıxış
          </button>
        </SignOutButton>
      </motion.div>

      {/* Avatar */}
      <motion.div
        className="px-4 py-4 border-t border-rule"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-2">
          {imageUrl ? (
            <Image src={imageUrl} alt="Avatar" width={30} height={30} className="rounded-full object-cover shrink-0 ring-2 ring-rule" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center shrink-0">
              <span className="text-bg text-xs font-bold">{firstName[0]}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-ink text-xs leading-tight truncate">{fullName}</p>
            <p className="text-[10px] text-ink-mute truncate">{email}</p>
          </div>
        </div>
      </motion.div>
    </motion.aside>
  );
}
