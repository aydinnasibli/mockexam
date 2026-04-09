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
          <div className="w-8 h-8 border-4 border-primary-mid border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen pt-16 bg-surface-subtle">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col h-[calc(100vh-4rem)] w-64 fixed left-0 top-16 p-4 gap-1 bg-surface border-r border-outline-variant">
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
            <span className="flex items-center gap-3 px-3 py-2.5 bg-accent-container text-primary-mid rounded-lg font-bold text-sm cursor-default">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
              Dashboard
            </span>
            <Link href="/exams" className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors text-sm">
              <span className="material-symbols-outlined text-xl">menu_book</span>
              Browse Exams
            </Link>
            <Link href="/analytics" className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors text-sm">
              <span className="material-symbols-outlined text-xl">analytics</span>
              Analytics
            </Link>
          </nav>

          <div className="mt-auto p-4 bg-accent-container rounded-xl border border-accent/20">
            <p className="text-xs text-primary-mid font-semibold mb-3">Get more exams</p>
            <Link href="/exams" className="w-full flex justify-center py-2 bg-primary-mid text-white text-xs font-bold rounded-lg hover:bg-primary transition-colors">
              Browse Catalog
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 md:ml-64 p-6 lg:p-10">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-primary font-headline">
              Welcome back, {user?.firstName || "Student"}!
            </h1>
            <p className="text-on-surface-variant mt-1">Access your purchased exams and track your progress.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            <div className="tc-card p-5">
              <span className="material-symbols-outlined text-accent text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
              <p className="text-2xl font-black text-primary mt-2">{purchasedExams.length}</p>
              <p className="text-xs text-on-surface-variant font-medium mt-1">Purchased exams</p>
            </div>
            <div className="tc-card p-5">
              <span className="material-symbols-outlined text-primary-mid text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>assignment_turned_in</span>
              <p className="text-2xl font-black text-primary mt-2">0</p>
              <p className="text-xs text-on-surface-variant font-medium mt-1">Completed</p>
            </div>
            <div className="tc-gradient p-5 rounded-2xl shadow-sm col-span-2 md:col-span-1">
              <span className="material-symbols-outlined text-white/70 text-2xl">library_add</span>
              <p className="text-base font-bold text-white mt-2">Add more exams</p>
              <Link href="/exams" className="inline-block mt-2 text-xs font-bold text-white/80 hover:text-white underline underline-offset-2">
                View catalog →
              </Link>
            </div>
          </div>

          {/* My Exams */}
          <div className="mb-12">
            <h2 className="text-xl font-bold text-primary font-headline mb-5">My Exams</h2>

            {purchasedExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-outline-variant rounded-2xl bg-surface">
                <span className="material-symbols-outlined text-5xl text-outline mb-4">inbox</span>
                <h3 className="text-lg font-bold text-primary mb-2">No exams yet</h3>
                <p className="text-sm text-on-surface-variant mb-5">Browse the catalog and purchase an exam to get started.</p>
                <Link href="/exams" className="tc-btn-primary">
                  Browse Exams
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
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-accent-container text-primary-mid rounded-full">
                          {exam.tag}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-primary font-headline">{exam.title}</h3>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {exam.durationMinutes} min · {exam.totalQuestions} questions · Unlimited retakes
                      </p>
                    </div>
                    <Link
                      href={`/exam-session/${exam.id}`}
                      className="flex items-center gap-2 px-6 py-3 tc-gradient text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm shrink-0"
                    >
                      <span className="material-symbols-outlined text-lg">play_arrow</span>
                      Start Exam
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended */}
          <div>
            <h2 className="text-xl font-bold text-primary font-headline mb-5">Recommended for you</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendedExams.map(exam => (
                <div key={exam.id} className="tc-card p-5 hover:shadow-md transition-shadow">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-surface-container text-on-surface-variant rounded-full">
                    {exam.tag}
                  </span>
                  <h4 className="font-bold text-primary mt-3 mb-1 text-sm font-headline">{exam.title}</h4>
                  <p className="text-xs text-on-surface-variant mb-4">{exam.durationMinutes} min · {exam.totalQuestions} questions</p>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-primary">{exam.price} AZN</span>
                    <Link href={`/exams/${exam.id}`} className="text-xs font-bold text-primary-mid hover:underline underline-offset-2">
                      View details →
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
