'use client';

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { mockExams } from "@/lib/data";
import { useState, useEffect } from "react";

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
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen pt-20">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col h-[calc(100vh-5rem)] w-60 fixed left-0 top-20 p-4 gap-1 bg-slate-50 border-r border-outline-variant/20">
          <div className="px-3 py-4 mb-2 border-b border-outline-variant/20">
            <div className="flex items-center gap-3">
              {user?.imageUrl && (
                <img src={user.imageUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-primary leading-tight truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-on-surface-variant truncate">{user?.emailAddresses[0]?.emailAddress}</p>
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            <span className="flex items-center gap-3 px-3 py-2.5 bg-primary/10 text-primary rounded-lg font-bold text-sm cursor-default">
              <span className="material-symbols-outlined text-xl">dashboard</span>
              Panel
            </span>
            <Link href="/exams" className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors text-sm">
              <span className="material-symbols-outlined text-xl">menu_book</span>
              İmtahanlar
            </Link>
          </nav>

          <div className="mt-auto p-4 bg-primary-container rounded-xl">
            <p className="text-xs text-on-primary-container font-medium mb-3">Yeni sınaq al</p>
            <Link href="/exams" className="w-full flex justify-center py-2 bg-secondary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity">
              Kataloqa Get
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 md:ml-60 p-6 lg:p-10">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-primary font-headline">
              Xoş gəldin, {user?.firstName || "Tələbə"}!
            </h1>
            <p className="text-on-surface-variant mt-1">Aldığınız imtahanlara buradan daxil ola bilərsiniz.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            <div className="bg-surface-container-lowest border border-outline-variant/20 p-5 rounded-xl shadow-sm">
              <span className="material-symbols-outlined text-secondary text-2xl">task_alt</span>
              <p className="text-2xl font-black text-primary mt-2">{purchasedExams.length}</p>
              <p className="text-xs text-on-surface-variant font-medium mt-1">Alınan imtahan</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/20 p-5 rounded-xl shadow-sm">
              <span className="material-symbols-outlined text-primary text-2xl">assignment_turned_in</span>
              <p className="text-2xl font-black text-primary mt-2">0</p>
              <p className="text-xs text-on-surface-variant font-medium mt-1">Bitirilmiş</p>
            </div>
            <div className="bg-primary text-white p-5 rounded-xl shadow-sm col-span-2 md:col-span-1">
              <span className="material-symbols-outlined text-white/70 text-2xl">library_add</span>
              <p className="text-base font-bold text-white mt-2">Yeni imtahan al</p>
              <Link href="/exams" className="inline-block mt-2 text-xs font-bold text-white/80 hover:text-white underline underline-offset-2">
                Kataloqa bax →
              </Link>
            </div>
          </div>

          {/* My Exams */}
          <div className="mb-12">
            <h2 className="text-xl font-bold text-primary font-headline mb-5">Mənim İmtahanlarım</h2>

            {purchasedExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-outline-variant/40 rounded-2xl">
                <span className="material-symbols-outlined text-5xl text-outline mb-4">inbox</span>
                <h3 className="text-lg font-bold text-primary mb-2">Hələ imtahan alınmayıb</h3>
                <p className="text-sm text-on-surface-variant mb-5">Kataloqdan bir imtahan seçib satın alın.</p>
                <Link href="/exams" className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                  İmtahanlara Bax
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {purchasedExams.map(exam => (
                  <div
                    key={exam.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded">
                          {exam.tag}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-primary font-headline">{exam.title}</h3>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {exam.durationMinutes} dəq · {exam.totalQuestions} sual · Limitsiz baxış
                      </p>
                    </div>
                    <Link
                      href={`/exam-session/${exam.id}`}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm shrink-0"
                    >
                      <span className="material-symbols-outlined text-lg">play_arrow</span>
                      Sınağa Başla
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended */}
          <div>
            <h2 className="text-xl font-bold text-primary font-headline mb-5">Tövsiyə olunan digər sınaqlar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendedExams.map(exam => (
                <div key={exam.id} className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-surface-container text-on-surface-variant rounded">
                    {exam.tag}
                  </span>
                  <h4 className="font-bold text-primary mt-3 mb-1 text-sm font-headline">{exam.title}</h4>
                  <p className="text-xs text-on-surface-variant mb-4">{exam.durationMinutes} dəq · {exam.totalQuestions} sual</p>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-primary">{exam.price} AZN</span>
                    <Link href={`/exams/${exam.id}`} className="text-xs font-bold text-secondary hover:underline">
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
