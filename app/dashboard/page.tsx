'use client';

import Link from 'next/link';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import type { PublicExam } from '@/lib/db/exams';
import {
  LayoutDashboard, BookOpen, LogOut,
  GraduationCap, ShoppingBag,
  PlusCircle, Play, ArrowRight, Inbox,
  Timer, HelpCircle, Tag,
} from 'lucide-react';

function todayString() {
  return new Date().toLocaleDateString('az-AZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [allExams, setAllExams] = useState<PublicExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/purchases').then(r => r.json()),
      fetch('/api/exams').then(r => r.json()),
    ])
      .then(([purchases, examsData]) => {
        if (purchases.examIds) setPurchasedIds(purchases.examIds);
        if (examsData.exams) setAllExams(examsData.exams);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const purchasedExams  = allExams.filter(e => purchasedIds.includes(e.id));
  const availableExams  = allExams.filter(e => !purchasedIds.includes(e.id));

  const firstName = user?.firstName ?? 'Tələbə';
  const fullName  = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Tələbə';

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-on-surface-variant font-medium">Yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen">

      {/* ── Sidebar ── */}
      <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col py-6 bg-surface-container-low border-r border-outline-variant/40 z-40">

        {/* Brand */}
        <div className="px-6 mb-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg editorial-gradient flex items-center justify-center">
              <span className="text-white text-[10px] font-black">TC</span>
            </div>
            <span className="text-base font-extrabold text-primary tracking-tight font-headline">Test Centre</span>
          </Link>
        </div>

        {/* User profile */}
        <div className="flex items-center px-6 mb-7 gap-3">
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-primary/20" />
          ) : (
            <div className="w-10 h-10 rounded-full editorial-gradient flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-black">{firstName[0]}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-primary text-sm leading-tight truncate">{fullName}</p>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-0.5">
              {user?.emailAddresses?.[0]?.emailAddress ?? ''}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-white text-primary shadow-sm">
            <LayoutDashboard size={18} className="text-secondary" /> Panel
          </Link>
          <Link href="/exams" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/60 hover:text-primary transition-all">
            <BookOpen size={18} className="opacity-70" /> İmtahanlar
          </Link>
        </nav>

        {/* Bottom actions */}
        <div className="px-4 mt-4 space-y-2">
          <Link
            href="/exams"
            className="w-full editorial-gradient text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity text-sm"
          >
            <PlusCircle size={16} /> Sınaq Əldə Et
          </Link>
          <SignOutButton>
            <button className="w-full text-on-surface-variant py-3 px-4 flex items-center gap-3 hover:text-error transition-colors text-sm font-medium rounded-xl hover:bg-white/50">
              <LogOut size={16} /> Çıxış
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ml-64 p-8 min-h-screen">

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">
            Xoş gəlmisiniz, {firstName}!
          </h1>
          <p className="text-on-surface-variant font-medium text-sm">
            {todayString()}
          </p>
        </header>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10 max-w-xl">
          <div className="bg-white p-6 rounded-2xl border border-outline-variant/40 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-secondary-fixed/60 text-secondary rounded-xl">
                <GraduationCap size={18} />
              </div>
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Aktiv Sınaqlar</span>
            </div>
            <div className="text-3xl font-black text-primary">{purchasedExams.length}</div>
            <p className="text-xs text-on-surface-variant mt-1">satın alınan sınaq</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-outline-variant/40 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-secondary-fixed/60 text-secondary rounded-xl">
                <ShoppingBag size={18} />
              </div>
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Kataloqda</span>
            </div>
            <div className="text-3xl font-black text-primary">{availableExams.length}</div>
            <p className="text-xs text-on-surface-variant mt-1">əldə ediləbilən sınaq</p>
          </div>
        </div>

        {/* ── My Exams ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-primary font-headline mb-5">Mənim Sınaqlarım</h2>

          {purchasedExams.length === 0 ? (
            <div className="bg-white rounded-2xl border border-outline-variant/40 p-12 flex flex-col items-center text-center shadow-sm">
              <Inbox className="text-outline mb-4" size={40} />
              <h3 className="text-base font-bold text-primary mb-2">Hələ sınaq yoxdur</h3>
              <p className="text-sm text-on-surface-variant mb-6 max-w-xs">
                SAT, IELTS və ya TOEFL sınaqlarından birini seçib giriş əldə edin.
              </p>
              <Link href="/exams" className="editorial-gradient text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-md">
                Sınaqlara bax
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {purchasedExams.map(exam => {
                const examMinutes = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
                return (
                  <div
                    key={exam.id}
                    className="bg-white rounded-2xl border border-outline-variant/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-secondary-fixed/60 text-secondary rounded-full">
                          {exam.tag}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-primary font-headline leading-snug">{exam.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1"><Timer size={12} />{examMinutes} dəq</span>
                        <span className="flex items-center gap-1"><HelpCircle size={12} />{exam.totalQuestions} sual</span>
                        <span className="flex items-center gap-1"><Tag size={12} />{exam.modules.length} modul</span>
                      </div>
                    </div>
                    <Link
                      href={`/exam-session/${exam.id}`}
                      className="flex items-center gap-2 px-6 py-3 editorial-gradient text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm shrink-0"
                    >
                      <Play size={15} /> Sınağa başla
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Available exams ── */}
        {availableExams.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-primary font-headline">Kəşf et</h2>
              <Link href="/exams" className="text-sm font-bold text-secondary hover:underline underline-offset-2">
                Hamısına bax <ArrowRight size={14} className="inline" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableExams.slice(0, 3).map(exam => {
                const examMinutes = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
                return (
                  <Link
                    key={exam.id}
                    href={`/exams/${exam.id}`}
                    className="bg-white rounded-2xl border border-outline-variant/40 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-secondary-fixed/60 text-secondary rounded-full">
                        {exam.tag}
                      </span>
                      <span className="text-base font-black text-primary">{exam.price} ₼</span>
                    </div>
                    <h3 className="font-bold text-primary text-sm font-headline leading-snug mb-2 group-hover:text-secondary transition-colors">{exam.title}</h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2 flex-1">{exam.description}</p>
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-outline-variant/20 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1"><Timer size={12} />{examMinutes} dəq</span>
                      <span className="flex items-center gap-1"><HelpCircle size={12} />{exam.totalQuestions} sual</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
