'use client';

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

interface Props {
  countsByType: Record<string, number>;
}

const categories = [
  { code: "SAT",   name: "Digital SAT",    desc: "College Board Bluebook formatı. Reading/Writing + Math, adaptive.", featured: true  },
  { code: "IELTS", name: "IELTS Academic", desc: "Listening, Reading, Writing band sınaqları. Cambridge formatı.",   featured: false },
  { code: "TOEFL", name: "TOEFL iBT",      desc: "ETS strukturu. Dörd bölmə — Reading, Listening, Speaking, Writing.", featured: false },
  { code: "DİM",   name: "DİM Buraxılış",  desc: "Riyaziyyat, ədəbiyyat, məntiq, dil bilikləri blokları.",           featured: true  },
  { code: "GMAT",  name: "GMAT Focus",     desc: "Quant, Verbal, Data Insights. MBA hazırlığı.",                     featured: false },
  { code: "GRE",   name: "GRE General",    desc: "Verbal Reasoning, Quantitative, Analytical Writing.",              featured: false },
];

const steps = [
  { n: "01", t: "Diaqnostika",             d: "İlk pulsuz sınaq mövcud səviyyənizi 11 ölçü üzrə müəyyən edir. Vaxt itkisi yoxdur, yalnız real nəticə." },
  { n: "02", t: "Adaptive hazırlıq",       d: "Süni intellekt zəif istiqamətləri seçir və hər gün üçün 30 dəqiqəlik məşq planı qurur." },
  { n: "03", t: "Real format simulyasiyası", d: "İmtahandan əvvəl tam vaxtlı sınaqlar — eyni interfeys, eyni təzyiq, heç bir sürpriz qalmır." },
];

const checklist = [
  "1 tam pulsuz diaqnostik sınaq",
  "Süni intellekt analitikası",
  "Şəxsi tərəqqi hesabatı",
  "Bütün sual izahları videoda",
  "Mobil və desktop dəstək",
];

export default function HomeContent({ countsByType }: Props) {
  return (
    <>
      <Navbar />
      <main>

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
                <em className="italic" style={{ color: "var(--color-accent)" }}>sınağa</em>{" "}
                çəkin.
              </h1>
              <p className="t-lede mb-10 max-w-135" style={{ color: "var(--color-ink-soft)" }}>
                On minlərlə tələbə real imtahan formatında hazırlaşır. Süni intellekt yön verir,
                statistika doğrulayır — heç bir şey təxmin deyil.
              </p>
              <div className="flex gap-3 mb-16">
                <Link href="/exams" className="btn-primary">
                  Pulsuz başla <span className="arrow">→</span>
                </Link>
                <Link href="/about" className="btn-ghost">
                  Necə işləyir
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-6">
                <div className="flex">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[9px] font-medium"
                      style={{
                        marginLeft: i > 0 ? -10 : 0,
                        border: "2px solid var(--color-bg)",
                        background: "linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface-3) 100%)",
                        color: "var(--color-ink-mute)",
                      }}
                    >
                      {["AY", "TR", "NQ", "EH"][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="t-num font-display" style={{ fontSize: 20, lineHeight: 1 }}>12,847</div>
                  <div className="text-[13px] mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
                    aktiv tələbə bizimlə hazırlaşır
                  </div>
                </div>
              </div>
            </div>

            {/* Right — exam card mockup */}
            <div className="rise rise-2">
              <div
                className="card-new"
                style={{ padding: 0, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}
              >
                {/* Card header */}
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

                {/* Card body */}
                <div className="px-6 py-8">
                  <div className="eyebrow mb-4">Sual 14 / 22</div>
                  <p className="font-display font-normal text-ink leading-[1.4]" style={{ fontSize: 22 }}>
                    If{" "}
                    <em className="italic" style={{ color: "var(--color-accent)" }}>ƒ(x) = 3x² − 5x + 2</em>
                    , what is the value of{" "}
                    <em className="italic" style={{ color: "var(--color-accent)" }}>ƒ(−1)</em>?
                  </p>
                  <div className="flex flex-col gap-2.5 mt-7">
                    {[
                      { k: "A", v: "−6",  correct: false },
                      { k: "B", v: "0",   correct: false },
                      { k: "C", v: "10",  correct: true  },
                      { k: "D", v: "14",  correct: false },
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

                {/* Card footer */}
                <div
                  className="flex items-center justify-between px-6 py-4"
                  style={{
                    borderTop: "1px solid var(--color-rule)",
                    background: "var(--color-surface-2)",
                  }}
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

        {/* ── STATS STRIP ── */}
        <section style={{ borderTop: "1px solid var(--color-rule)", borderBottom: "1px solid var(--color-rule)", background: "var(--color-surface)" }}>
          <div className="max-w-340 mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4" style={{ padding: "40px 0" }}>
              {[
                { v: "1,247", l: "Universitet qəbulu" },
                { v: "+184",  l: "Orta SAT bal artımı" },
                { v: "248",   l: "Mövcud sınaq" },
                { v: "98%",   l: "Tələbə məmnuniyyəti" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 justify-center px-8 py-4 md:py-0"
                  style={{ borderRight: i < 3 ? "1px solid var(--color-rule)" : "none" }}
                >
                  <span className="t-num font-display text-ink" style={{ fontSize: 40, lineHeight: 1 }}>{s.v}</span>
                  <span className="text-[13px] leading-[1.3]" style={{ color: "var(--color-ink-soft)" }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CATEGORIES ── */}
        <section className="max-w-340 mx-auto px-8 py-30">
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
                href="/exams"
                className="card-new card-new-hover block"
              >
                <div className="flex items-center justify-between mb-8">
                  <span className={`tag ${c.featured ? "tag-accent" : ""}`}>{c.code}</span>
                  <span className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                    {countsByType[c.code.toLowerCase()] ?? 0} sınaq
                  </span>
                </div>
                <h3 className="t-headline mb-3" style={{ fontSize: 28 }}>{c.name}</h3>
                <p className="text-[15px] leading-[1.6] mb-8" style={{ color: "var(--color-ink-soft)", minHeight: 48 }}>{c.desc}</p>
                <div className="flex items-center gap-2 text-[14px] font-medium text-ink">
                  Sınaqlara bax <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── PULL QUOTE ── */}
        <section style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-rule)", borderBottom: "1px solid var(--color-rule)" }}>
          <div className="max-w-340 mx-auto px-8 py-30 text-center">
            <span className="dot mx-auto mb-8" style={{ display: "block" }} />
            <blockquote
              className="font-display font-normal text-ink leading-tight tracking-[-0.02em] max-w-230 mx-auto"
              style={{ fontSize: "clamp(28px, 3.6vw, 48px)" }}
            >
              On səkkiz dəfə cəhd etdim. Sayı eyni qalır, lakin{" "}
              <em className="italic" style={{ color: "var(--color-accent)" }}>hər səhvim üçün yeni izahat</em>{" "}
              verən başqa platforma tapmadım. Bal 200 vahid artdı.
            </blockquote>
            <div className="flex items-center gap-3 justify-center mt-10">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[9px] font-medium"
                style={{
                  background: "linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface-3) 100%)",
                  color: "var(--color-ink-mute)",
                }}
              >
                AM
              </div>
              <div className="text-left">
                <div className="text-[14px] font-medium text-ink">Aysel Məmmədova</div>
                <div className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>SAT 1480 · Boğaziçi Universiteti</div>
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
                <h3 className="t-headline mb-4" style={{ fontSize: 28 }}>{s.t}</h3>
                <p className="text-[15px] leading-[1.6]" style={{ color: "var(--color-ink-soft)" }}>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA CARD ── */}
        <section className="max-w-340 mx-auto px-8 pb-24">
          <div
            className="card-ink rounded-2xl grid md:grid-cols-[1.4fr_1fr] gap-16 items-center"
            style={{ padding: "80px 64px" }}
          >
            <div>
              <h2
                className="font-display font-normal leading-[1.02] tracking-[-0.02em] mb-6"
                style={{ fontSize: "clamp(40px, 5vw, 76px)", color: "var(--color-bg)" }}
              >
                Hazırlığa başlamaq üçün heç bir{" "}
                <em className="italic" style={{ color: "var(--color-accent-soft)" }}>bəhanə</em>{" "}
                qalmır.
              </h2>
              <p
                className="text-[18px] leading-[1.55] mb-8 max-w-135"
                style={{ color: "rgba(250,250,246,0.7)" }}
              >
                İlk sınaq tamamilə pulsuzdur. Qeydiyyat 30 saniyə çəkir.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/exams"
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-medium transition-colors"
                  style={{ background: "var(--color-bg)", color: "var(--color-ink)", border: "1px solid var(--color-bg)" }}
                >
                  Pulsuz başla →
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
