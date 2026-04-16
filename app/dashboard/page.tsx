'use client';

import Link from "next/link";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import type { PublicExam } from "@/lib/db/exams";
import {
  LayoutDashboard, BookOpen, ClipboardCheck, BarChart2,
  User, HelpCircle, LogOut, Bell, Settings,
  GraduationCap, TrendingUp, Clock, Trophy,
  ChevronRight, PlusCircle, Inbox, Play,
} from "lucide-react";

const sidebarLinks = [
  { href: "/dashboard", label: "Panel",      icon: LayoutDashboard, active: true },
  { href: "/exams",     label: "İmtahanlar", icon: BookOpen },
  { href: "/analytics", label: "Nəticələr",  icon: ClipboardCheck },
  { href: "/analytics", label: "Statistika", icon: BarChart2 },
  { href: "#",          label: "Profil",     icon: User },
  { href: "/contact",   label: "Kömək",      icon: HelpCircle },
];

const chartBars = [
  { label: "MAY", height: "40%",  fill: "20%" },
  { label: "İYN", height: "60%",  fill: "30%" },
  { label: "İYL", height: "55%",  fill: "40%" },
  { label: "AVQ", height: "75%",  fill: "60%" },
  { label: "SEN", height: "85%",  fill: "80%" },
  { label: "OKT", height: "95%",  fill: "100%", current: true },
];

function todayString() {
  return new Date().toLocaleDateString("az-AZ", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [allExams, setAllExams] = useState<PublicExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/purchases").then(r => r.json()),
      fetch("/api/exams").then(r => r.json()),
    ])
      .then(([purchases, examsData]) => {
        if (purchases.examIds) setPurchasedIds(purchases.examIds);
        if (examsData.exams) setAllExams(examsData.exams);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const purchasedExams = allExams.filter(e => purchasedIds.includes(e.id));
  const recommendedExams = allExams.filter(e => !purchasedIds.includes(e.id)).slice(0, 2);

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

  const firstName = user?.firstName ?? "Tələbə";
  const fullName  = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Tələbə";

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
            <span className="text-base font-extrabold text-primary tracking-tight font-headline">
              Test Centre
            </span>
          </Link>
        </div>

        {/* User profile */}
        <div className="flex items-center px-6 mb-7 gap-3">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-primary/20"
            />
          ) : (
            <div className="w-10 h-10 rounded-full editorial-gradient flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-black">{firstName[0]}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-primary text-sm leading-tight truncate">{fullName}</p>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-0.5">
              Editorial Scholar
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3">
          {sidebarLinks.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? "bg-white text-primary shadow-sm font-bold"
                  : "text-on-surface-variant hover:bg-white/60 hover:text-primary"
              }`}
            >
              <Icon size={18} className={active ? "text-secondary" : "opacity-70"} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-4 mt-4 space-y-2">
          <Link
            href="/exams"
            className="w-full editorial-gradient text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity text-sm"
          >
            <PlusCircle size={16} />
            İmtahana Başla
          </Link>
          <SignOutButton>
            <button className="w-full text-on-surface-variant py-3 px-4 flex items-center gap-3 hover:text-error transition-colors text-sm font-medium rounded-xl hover:bg-white/50">
              <LogOut size={16} />
              Çıxış
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* ── Main canvas ── */}
      <main className="ml-64 p-8 max-w-[calc(1280px+16rem)] min-h-screen">

        {/* Welcome header */}
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">
              Xoş gəlmisiniz, {firstName}!
            </h1>
            <p className="text-on-surface-variant font-medium text-sm">
              Bu gün: {todayString()} · Uğurlu nəticələr üçün hazırlaşın
            </p>
          </div>
          <div className="flex gap-2">
            <button className="p-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors">
              <Bell size={20} />
            </button>
            <button className="p-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {[
            { icon: GraduationCap, label: "Ümumi Sınaqlar", value: purchasedExams.length.toString(), accent: false },
            { icon: TrendingUp,    label: "Ortalama Bal",   value: "85%",  accent: false },
            { icon: Clock,         label: "Davam edən",     value: String(Math.min(2, purchasedExams.length)), accent: true },
            { icon: Trophy,        label: "Reytinq",        value: "#12",  accent: false },
          ].map(({ icon: Icon, label, value, accent }) => (
            <div
              key={label}
              className={`bg-white p-6 rounded-2xl border shadow-sm hover:-translate-y-0.5 transition-transform ${
                accent ? "border-secondary/30 border-l-4 border-l-secondary" : "border-outline-variant/40"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-secondary-fixed/60 text-secondary rounded-xl">
                  <Icon size={18} />
                </div>
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-tight">
                  {label}
                </span>
              </div>
              <div className="text-3xl font-black text-primary">{value}</div>
            </div>
          ))}
        </div>

        {/* ── Primary grid: table + recommended ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 mb-8">

          {/* Son Nəticələr table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary font-headline">Son Nəticələr</h2>
              <Link href="/analytics" className="text-secondary font-bold text-sm hover:underline underline-offset-2">
                Hamısına bax
              </Link>
            </div>
            <div className="overflow-x-auto">
              {purchasedExams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                  <Inbox className="text-outline mb-3" size={36} />
                  <p className="text-sm font-semibold text-primary mb-1">Hələ nəticə yoxdur</p>
                  <p className="text-xs text-on-surface-variant mb-4">Sınaq tamamladıqdan sonra nəticələriniz burada görünəcək</p>
                  <Link href="/exams" className="text-xs font-bold text-secondary hover:underline">Sınaqlara bax →</Link>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest">
                      <th className="px-6 py-4 font-black">İmtahan Adı</th>
                      <th className="px-6 py-4 font-black">Növ</th>
                      <th className="px-6 py-4 font-black">Müddət</th>
                      <th className="px-6 py-4 font-black">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {purchasedExams.slice(0, 5).map(exam => (
                      <tr key={exam.id} className="hover:bg-surface-container-low/60 transition-colors group">
                        <td className="px-6 py-4">
                          <Link href={`/exam-session/${exam.id}`} className="font-bold text-primary text-sm group-hover:text-secondary transition-colors">
                            {exam.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant text-sm font-medium">{exam.tag}</td>
                        <td className="px-6 py-4 text-on-surface-variant text-sm">{exam.durationMinutes} dəq</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">Aktiv</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Tövsiyə olunanlar */}
          <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 flex flex-col shadow-sm">
            <h2 className="text-xl font-bold text-primary font-headline mb-6">Tövsiyə olunanlar</h2>
            <div className="space-y-3 flex-1">
              {recommendedExams.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-8">Bütün sınaqlar aktivdir</p>
              ) : (
                recommendedExams.map(exam => (
                  <Link
                    key={exam.id}
                    href={`/exams/${exam.id}`}
                    className="group block p-4 rounded-xl hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant/30"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[10px] font-black text-secondary uppercase tracking-wider">{exam.tag}</span>
                      <ChevronRight size={14} className="text-outline group-hover:text-secondary transition-colors mt-0.5" />
                    </div>
                    <h3 className="font-bold text-primary text-sm mb-1 leading-snug">{exam.title}</h3>
                    <p className="text-xs text-on-surface-variant">{exam.totalQuestions} sual · {exam.durationMinutes} dəq · {exam.price} ₼</p>
                  </Link>
                ))
              )}
            </div>
            <Link
              href="/exams"
              className="mt-6 w-full py-3 text-secondary border-2 border-secondary font-bold rounded-xl hover:bg-secondary hover:text-white transition-all text-sm text-center block"
            >
              Kataloqa keç
            </Link>
          </div>
        </div>

        {/* ── Performance chart ── */}
        <div className="bg-white rounded-2xl border border-outline-variant/40 p-8 relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-2xl font-bold text-primary font-headline">Performans Qrafiki</h2>
              <p className="text-on-surface-variant text-sm mt-1">Son 6 ayın akademik inkişaf göstəriciləri</p>
            </div>
            <div className="flex gap-4">
              <span className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                <span className="w-3 h-3 rounded-full bg-secondary inline-block" />
                Məqsəd
              </span>
              <span className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                <span className="w-3 h-3 rounded-full bg-primary inline-block" />
                Cari
              </span>
            </div>
          </div>

          <div className="h-56 w-full flex items-end gap-4 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="w-full border-t border-outline-variant/20" />
              ))}
            </div>

            {chartBars.map(({ label, height, fill, current }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-2 group">
                <div
                  className="w-full bg-surface-container-high rounded-t-xl transition-all group-hover:opacity-90 relative"
                  style={{ height }}
                >
                  <div
                    className={`absolute bottom-0 w-full rounded-t-xl transition-all ${current ? "bg-primary" : "bg-primary/30"}`}
                    style={{ height: fill }}
                  />
                </div>
                <span className={`text-[10px] font-black ${current ? "text-primary" : "text-on-surface-variant"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Decorative blur */}
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Purchased exams quick-launch (if any) */}
        {purchasedExams.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-primary font-headline mb-5">Mənim Sınaqlarım</h2>
            <div className="space-y-3">
              {purchasedExams.map(exam => (
                <div
                  key={exam.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-outline-variant/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-secondary-fixed/60 text-secondary rounded-full">
                      {exam.tag}
                    </span>
                    <h3 className="text-base font-bold text-primary font-headline mt-2">{exam.title}</h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {exam.durationMinutes} dəq · {exam.totalQuestions} sual · Limitsiz cəhd
                    </p>
                  </div>
                  <Link
                    href={`/exam-session/${exam.id}`}
                    className="flex items-center gap-2 px-6 py-3 editorial-gradient text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm shrink-0"
                  >
                    <Play size={16} />
                    Sınağı başlat
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── FAB ── */}
      <Link
        href="/exams"
        className="fixed bottom-8 right-8 bg-secondary text-white px-6 py-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-bold text-sm z-50"
      >
        <PlusCircle size={20} />
        Yeni Sınaq
      </Link>
    </div>
  );
}
