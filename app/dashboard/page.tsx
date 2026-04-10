'use client';

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { mockExams } from "@/lib/data";
import { useState, useEffect } from "react";
import { LayoutDashboard, BookOpen, BarChart2, CircleCheckBig, ClipboardCheck, BookPlus, Inbox, Play } from "lucide-react";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);

  useEffect(() => {
    fetch('/api/purchases')
      .then(r => r.json())
      .then(data => {
        if (data.examIds) setPurchasedIds(data.examIds);
      })
      .catch(() => {})
      .finally(() => setPurchasesLoading(false));
  }, []);

  const purchasedExams = mockExams.filter(e => purchasedIds.includes(e.id));
  const recommendedExams = mockExams.filter(e => !purchasedIds.includes(e.id)).slice(0, 3);

  if (!isLoaded || purchasesLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen pt-20 bg-surface-subtle">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col h-[calc(100vh-5rem)] w-64 fixed left-0 top-20 p-4 gap-1 bg-surface border-r border-outline-variant">
          <div className="px-3 py-4 mb-2 border-b border-outline-variant">
            <div className="flex items-center gap-3">
              {user?.imageUrl && (
                <img src={user.imageUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-outline-variant" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-primary leading-tight truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-on-surface-variant truncate">{user?.emailAddresses[0]?.emailAddress}</p>
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            <span className="flex items-center gap-3 px-3 py-2.5 bg-secondary-fixed text-primary rounded-lg font-bold text-sm cursor-default">
              <LayoutDashboard size={20} />
              Kabinet
            </span>
            <Link href="/exams" className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors text-sm">
              <BookOpen size={20} />
              Sınaqlara bax
            </Link>
            <Link href="/analytics" className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors text-sm">
              <BarChart2 size={20} />
              Analitika
            </Link>
          </nav>

          <div className="mt-auto p-4 bg-secondary-fixed rounded-xl border border-secondary-fixed-dim/40">
            <p className="text-xs text-primary font-semibold mb-3">Daha çox sınaq əldə et</p>
            <Link href="/exams" className="w-full flex justify-center py-2 editorial-gradient text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity">
              Kataloqa bax
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 md:ml-64 p-6 lg:p-10">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-primary font-headline">
              Xoş gəldiniz, {user?.firstName || "Tələbə"}!
            </h1>
            <p className="text-on-surface-variant mt-1">Satın aldığınız sınaqlara daxil olun və tərəqqinizi izləyin.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            <div className="tc-card p-5">
              <CircleCheckBig className="text-secondary" size={24} />
              <p className="text-2xl font-black text-primary mt-2">{purchasedExams.length}</p>
              <p className="text-xs text-on-surface-variant font-medium mt-1">Satın alınan sınaqlar</p>
            </div>
            <div className="tc-card p-5">
              <ClipboardCheck className="text-primary" size={24} />
              <p className="text-2xl font-black text-primary mt-2">0</p>
              <p className="text-xs text-on-surface-variant font-medium mt-1">Tamamlanmış</p>
            </div>
            <div className="editorial-gradient p-5 rounded-2xl shadow-sm col-span-2 md:col-span-1">
              <BookPlus className="text-white/70" size={24} />
              <p className="text-base font-bold text-white mt-2">Daha çox sınaq əldə et</p>
              <Link href="/exams" className="inline-block mt-2 text-xs font-bold text-white/80 hover:text-white underline underline-offset-2">
                Kataloqa bax →
              </Link>
            </div>
          </div>

          {/* My Exams */}
          <div className="mb-12">
            <h2 className="text-xl font-bold text-primary font-headline mb-5">Mənim Sınaqlarım</h2>

            {purchasedExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-outline-variant rounded-2xl bg-surface">
                <Inbox className="text-outline mb-4" size={48} />
                <h3 className="text-lg font-bold text-primary mb-2">Hələ sınaq yoxdur</h3>
                <p className="text-sm text-on-surface-variant mb-5">Başlamaq üçün kataloqa baxın və bir sınaq satın alın.</p>
                <Link href="/exams" className="tc-btn-primary">
                  Sınaqlara bax
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {purchasedExams.map(exam => (
                  <div
                    key={exam.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 tc-card p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed rounded-full">
                          {exam.tag}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-primary font-headline">{exam.title}</h3>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {exam.durationMinutes} dəq · {exam.totalQuestions} sual · Limitsiz yenidən cəhd
                      </p>
                    </div>
                    <Link
                      href={`/exam-session/${exam.id}`}
                      className="flex items-center gap-2 px-6 py-3 editorial-gradient text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm shrink-0"
                    >
                      <Play size={18} />
                      Sınağı başlat
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended */}
          <div>
            <h2 className="text-xl font-bold text-primary font-headline mb-5">Sizin üçün tövsiyə olunanlar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendedExams.map(exam => (
                <div key={exam.id} className="tc-card p-5 hover:shadow-md transition-shadow">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-surface-container text-on-surface-variant rounded-full">
                    {exam.tag}
                  </span>
                  <h4 className="font-bold text-primary mt-3 mb-1 text-sm font-headline">{exam.title}</h4>
                  <p className="text-xs text-on-surface-variant mb-4">{exam.durationMinutes} dəq · {exam.totalQuestions} sual</p>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-primary">{exam.price} AZN</span>
                    <Link href={`/exams/${exam.id}`} className="text-xs font-bold text-secondary hover:underline underline-offset-2">
                      Ətraflı bax →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
