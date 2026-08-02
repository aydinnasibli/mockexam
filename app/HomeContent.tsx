'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

interface Props {
  countsByType: Record<string, number>;
}

const categories = [
  { code: "SAT", name: "Digital SAT", desc: "College Board Bluebook formatı. Reading/Writing + Math, adaptive.", featured: true },
  { code: "IELTS", name: "IELTS Academic", desc: "Listening, Reading, Writing band sınaqları. Cambridge formatı.", featured: false },
  { code: "TOEFL", name: "TOEFL iBT", desc: "ETS strukturu. Dörd bölmə — Reading, Listening, Speaking, Writing.", featured: false },
  { code: "DİM", name: "DİM Buraxılış", desc: "Riyaziyyat, ədəbiyyat, məntiq, dil bilikləri blokları.", featured: true },
  { code: "GMAT", name: "GMAT Focus", desc: "Quant, Verbal, Data Insights. MBA hazırlığı.", featured: false },
  { code: "GRE", name: "GRE General", desc: "Verbal Reasoning, Quantitative, Analytical Writing.", featured: false },
];

const steps = [
  { n: "01", t: "Diaqnostika", d: "İlk sınaq mövcud səviyyənizi 11 ölçü üzrə müəyyən edir. Vaxt itkisi yoxdur, yalnız real nəticə." },
  { n: "02", t: "Adaptive hazırlıq", d: "Süni intellekt zəif istiqamətləri seçir və hər gün üçün 30 dəqiqəlik məşq planı qurur." },
  { n: "03", t: "Real format simulyasiyası", d: "İmtahandan əvvəl tam vaxtlı sınaqlar — eyni interfeys, eyni təzyiq, heç bir sürpriz qalmır." },
];

const checklist = [
  "1 tam diaqnostik sınaq",
  "Süni intellekt analitikası",
  "Şəxsi tərəqqi hesabatı",
  "Bütün sual izahları videoda",
  "Mobil və desktop dəstək",
];

const reviews = [
  {
    initials: "AM",
    quote: "On səkkiz dəfə cəhd etdim. Sayı eyni qalır, lakin hər səhvim üçün yeni izahat verən başqa platforma tapmadım. Bal 200 vahid artdı.",
    name: "Aysel Məmmədova",
    detail: "SAT 1480 · Boğaziçi Universiteti",
    accent: "hər səhvim üçün yeni izahat",
  },
  {
    initials: "KH",
    quote: "IELTS üçün altı ay hazırlandım amma nəticə yaxşı deyildi. Buraya keçdikdən sonra iki ayda 6.0-dan 7.5-ə çıxdım. Band analizi hər şeyi dəyişdi.",
    name: "Kərim Hüseynov",
    detail: "IELTS 7.5 · Edinburq Universiteti",
    accent: "iki ayda 6.0-dan 7.5-ə çıxdım",
  },
  {
    initials: "NQ",
    quote: "Adaptive suallar mənim nəyə görə yanıldığımı dəqiq göstərdi. TOEFL Reading bölməsini tam yenidən öyrəndim — nəticə 105 oldu.",
    name: "Nigar Quliyeva",
    detail: "TOEFL 105 · Amsterdam",
    accent: "nəyə görə yanıldığımı dəqiq göstərdi",
  },
  {
    initials: "TA",
    quote: "SAT Math modullarını dörd dəfə keçdim. Hər dəfə fərqli zəif nöqtə çıxdı. Platforma olmadan 1540 balı görmək mümkün olmazdı.",
    name: "Tural Əliyev",
    detail: "SAT 1540 · MIT",
    accent: "Hər dəfə fərqli zəif nöqtə çıxdı",
  },
];

export default function HomeContent({ countsByType }: Props) {
  const [reviewIndex, setReviewIndex] = useState(0);
  const current = reviews[reviewIndex];

  useEffect(() => {
    const t = setInterval(() => setReviewIndex(i => (i + 1) % reviews.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <Navbar />
      <main className="pt-18">

        {/* ── HERO ── */}
        <section className="max-w-340 mx-auto px-8" style={{ padding: "96px 32px 64px" }}>
          <div className="grid md:grid-cols-[1.3fr_1fr] gap-20 items-center">

            {/* Left */}
            <div className="rise">
              <div className="flex items-center gap-3 mb-8">
                <span className="dot" />
                <span className="eyebrow">Akademik İmtahan Platforması</span>
              </div>
              <h1 className="t-display mb-8">
                Gələcəyinizi{" "}
                <span style={{ color: "var(--color-accent)" }}>sınağa</span>{" "}
                çəkin.
              </h1>
              <p className="t-lede mb-10 max-w-135" style={{ color: "var(--color-ink-soft)" }}>
                On minlərlə tələbə real imtahan formatında hazırlaşır. Süni intellekt yön verir,
                statistika doğrulayır — heç bir şey təxmin deyil.
              </p>
              <div className="flex gap-3">
                <Link href="/exams" className="btn-primary">
                  Başla <span className="arrow">→</span>
                </Link>
                <Link href="/about" className="btn-ghost">
                  Necə işləyir
                </Link>
              </div>
            </div>

            {/* Right — exam card mockup */}
            <div className="rise rise-2">
              <div
                className="card-new"
                style={{ padding: 0, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}
              >
                <div
                  className="flex items-center justify-between px-6 py-4"
                  style={{ borderBottom: "1px solid var(--color-rule)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="tag tag-accent">SAT</span>
                    <span className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>Math · Module II</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="dot" />
                    <span className="t-mono text-[13px] text-ink">32:14</span>
                  </div>
                </div>

                <div className="px-6 py-8">
                  <div className="eyebrow mb-4">Sual 14 / 22</div>
                  <p className="font-display font-normal text-ink leading-[1.4]" style={{ fontSize: 22 }}>
                    If{" "}
                    <span style={{ color: "var(--color-accent)" }}>ƒ(x) = 3x² − 5x + 2</span>
                    , what is the value of{" "}
                    <span style={{ color: "var(--color-accent)" }}>ƒ(−1)</span>?
                  </p>
                  <div className="flex flex-col gap-2.5 mt-7">
                    {[
                      { k: "A", v: "−6", correct: false },
                      { k: "B", v: "0", correct: false },
                      { k: "C", v: "10", correct: true },
                      { k: "D", v: "14", correct: false },
                    ].map(opt => (
                      <div
                        key={opt.k}
                        className="flex items-center gap-4 px-4 py-3 rounded-btn"
                        style={{
                          border: `1px solid ${opt.correct ? "var(--color-ink)" : "var(--color-rule)"}`,
                          background: opt.correct ? "var(--color-ink)" : "var(--color-surface)",
                          color: opt.correct ? "var(--color-bg)" : "var(--color-ink)",
                        }}
                      >
                        <span className="font-mono text-[11px] opacity-60 w-3.5">{opt.k}</span>
                        <span className="font-display text-[18px] font-normal">{opt.v}</span>
                        {opt.correct && <span className="ml-auto text-[14px]">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="flex items-center justify-between px-6 py-4"
                  style={{ borderTop: "1px solid var(--color-rule)", background: "var(--color-surface-2)" }}
                >
                  <span className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>Tərəqqi 52%</span>
                  <div className="w-35 h-1 rounded-full overflow-hidden" style={{ background: "var(--color-rule-soft)" }}>
                    <div className="h-full rounded-full" style={{ width: "52%", background: "var(--color-ink)" }} />
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div
                className="relative -mt-5 -ml-4 max-w-50"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-rule)",
                  borderRadius: 10,
                  padding: "16px 20px",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                <div className="eyebrow mb-1">Orta bal artımı</div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="t-num font-display text-ink" style={{ fontSize: 36, lineHeight: 1 }}>+184</span>
                  <span className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>SAT</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CATEGORIES ── */}
        <section className="max-w-340 mx-auto px-8 py-24">
          <div className="section-head">
            <div className="eyebrow mb-4">Kateqoriyalar</div>
            <h2 className="t-headline">Beynəlxalq və yerli imtahanlar üçün tam hazırlıq.</h2>
            <p className="t-body-lg mt-4">
              Hər bir sınaq akademik mütəxəssislər tərəfindən yoxlanılır və rəsmi formatla 1:1 üst-üstə düşür.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {categories.map((c) => (
              <Link
                key={c.code}
                href={`/exams?type=${c.code.toLowerCase()}`}
                className="card-new card-new-hover flex flex-col"
              >
                <div className="flex items-center justify-between mb-8">
                  <span className={`tag ${c.featured ? "tag-accent" : ""}`}>{c.code}</span>
                  <span className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                    {countsByType[c.code.toLowerCase()] ?? 0} sınaq
                  </span>
                </div>
                <h3 className="t-headline mb-3" style={{ fontSize: 24 }}>{c.name}</h3>
                <p className="text-[15px] leading-[1.6] flex-1 mb-8" style={{ color: "var(--color-ink-soft)" }}>{c.desc}</p>
                <div className="flex items-center gap-2 text-[14px] font-medium text-ink">
                  Sınaqlara bax <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── REVIEWS ── */}
        <section style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-rule)", borderBottom: "1px solid var(--color-rule)" }}>
          <div className="max-w-340 mx-auto px-8 py-24">
            <div className="flex items-center justify-between mb-14">
              <div>
                <div className="eyebrow mb-3">Tələbə rəyləri</div>
                {/*
                  The dot is 6px for visual reasons, but the *button* is 24px so
                  it meets the WCAG 2.5.8 minimum target size. The dot itself is
                  a child span; the button is transparent padding around it.
                */}
                <div className="flex items-center mt-2">
                  {reviews.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setReviewIndex(i)}
                      aria-label={`Rəy ${i + 1}`}
                      aria-current={i === reviewIndex ? 'true' : undefined}
                      style={{
                        width: 24,
                        height: 24,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        padding: 0,
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          width: i === reviewIndex ? 20 : 6,
                          height: 6,
                          borderRadius: 3,
                          background: i === reviewIndex ? 'var(--color-ink)' : 'var(--color-rule)',
                          transition: 'width 0.2s ease, background 0.2s ease',
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setReviewIndex(i => (i - 1 + reviews.length) % reviews.length)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ border: "1px solid var(--color-rule)", color: "var(--color-ink-soft)", background: "transparent" }}
                >
                  ←
                </button>
                <button
                  onClick={() => setReviewIndex(i => (i + 1) % reviews.length)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ border: "1px solid var(--color-rule)", color: "var(--color-ink-soft)", background: "transparent" }}
                >
                  →
                </button>
              </div>
            </div>

            <blockquote
              className="font-display font-normal text-ink leading-[1.35] tracking-[-0.015em] mb-10"
              style={{ fontSize: "clamp(20px, 2.2vw, 32px)", maxWidth: 820 }}
            >
              {(() => {
                const parts = current.quote.split(current.accent);
                return parts.map((part, i) => (
                  <span key={i}>
                    {part}
                    {i < parts.length - 1 && (
                      <span style={{ color: "var(--color-accent)" }}>{current.accent}</span>
                    )}
                  </span>
                ));
              })()}
            </blockquote>

            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[9px] font-medium shrink-0"
                style={{
                  background: "linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface-3) 100%)",
                  color: "var(--color-ink-mute)",
                }}
              >
                {current.initials}
              </div>
              <div>
                <div className="text-[14px] font-medium text-ink">{current.name}</div>
                <div className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>{current.detail}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="max-w-340 mx-auto px-8 py-30">
          <div className="section-head">
            <div className="eyebrow mb-4">Metod</div>
            <h2 className="t-headline">Hazırlıq üç sadə pillədir.</h2>
            <p className="t-body-lg mt-4">
              Hər mərhələ ölçülə bilən nəticə ilə bitir — boş söz yox, yalnız tərəqqi.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="pt-8 border-t border-rule">
                <div className="t-num mb-8 text-ink" style={{ fontSize: 18 }}>{s.n}</div>
                <h3 className="t-headline mb-4" style={{ fontSize: 24 }}>{s.t}</h3>
                <p className="text-[15px] leading-[1.6]" style={{ color: "var(--color-ink-soft)" }}>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA CARD ── */}
        <section className="max-w-340 mx-auto px-8 pb-24">
          <div
            className="card-ink rounded-2xl grid md:grid-cols-[1.4fr_1fr] gap-16 items-center"
            style={{ padding: "72px 56px" }}
          >
            <div>
              <h2
                className="font-display font-normal leading-[1.02] tracking-[-0.02em] mb-6"
                style={{ fontSize: "clamp(30px, 3.6vw, 54px)", color: "var(--color-bg)" }}
              >
                Hazırlığa başlamaq üçün heç bir{" "}
                <span style={{ color: "var(--color-accent-soft)" }}>bəhanə</span>{" "}
                qalmır.
              </h2>
              <p
                className="text-[16px] leading-[1.55] mb-8 max-w-135"
                style={{ color: "rgba(250,250,246,0.7)" }}
              >
                Qeydiyyat 30 saniyə çəkir.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/exams"
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-medium transition-colors"
                  style={{ background: "var(--color-bg)", color: "var(--color-ink)", border: "1px solid var(--color-bg)" }}
                >
                  Başla →
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-medium"
                  style={{ background: "transparent", color: "var(--color-bg)", border: "1px solid rgba(250,250,246,0.2)" }}
                >
                  Bizimlə danış
                </Link>
              </div>
            </div>

            <div style={{ borderLeft: "1px solid rgba(250,250,246,0.15)", paddingLeft: 48 }}>
              <div className="eyebrow mb-5" style={{ color: "rgba(250,250,246,0.5)" }}>Nə daxildir</div>
              <div className="flex flex-col gap-3.5">
                {checklist.map((t, i) => (
                  <div key={i} className="flex items-center gap-3" style={{ color: "var(--color-bg)" }}>
                    <span style={{ color: "var(--color-accent-soft)" }}>✓</span>
                    <span className="text-[14px]">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
