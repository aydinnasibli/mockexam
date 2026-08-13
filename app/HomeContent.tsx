import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FadeUp from "@/components/ui/FadeUp";
import { StaggerContainer, StaggerItem } from "@/components/ui/StaggerChildren";
import WipeBar from "@/components/ui/WipeBar";

export interface ProgramData {
  count: number;
  minPrice: number;
  titles: string[];
  firstId: string;
}

interface Props {
  byType: Record<string, ProgramData>;
  totalExams: number;
}

const MONO_LABEL = "font-mono text-[10px] tracking-[0.14em] uppercase";
const MONO_SECTION = "font-mono text-[11px] tracking-[0.16em] uppercase";
const H2 = "m-0 text-[32px] font-light leading-[1.04] tracking-[-0.035em] text-ink md:text-[44px]";

/*
 * `type` is the database value and is written out literally — it must NOT be
 * derived with `code.toLowerCase()`.
 *
 * "DİM".toLowerCase() returns "di̇m" (U+0069 U+0307 — a plain i followed by a
 * combining dot above), not "dim". That produced the link
 * /exams?type=di%CC%87m, which matches no exam type, so the DİM card led to an
 * empty results page — and Google crawled and indexed that URL.
 *
 * GMAT is not in EXAM_TYPES at all, so it has no type and is never linked.
 */
const PROGRAMS: Array<{ code: string; type: string | null }> = [
  { code: "SAT",   type: "sat" },
  { code: "DİM",   type: "dim" },
  { code: "IELTS", type: "ielts" },
  { code: "TOEFL", type: "toefl" },
  { code: "GRE",   type: "gre" },
  { code: "GMAT",  type: null },
];

const STEPS = [
  { n: "01", title: "Diaqnostika",     line: "Zəif nöqtələr 11 ölçüdə işarələnir." },
  { n: "02", title: "Gündəlik plan",   line: "Günə 30 dəqiqə, hədəfli məşq." },
  { n: "03", title: "Tam simulyasiya", line: "Vaxt limiti, fasilə, adaptive keçid." },
];

/** The specimen report in §02 — an illustration of the analysis, not a record. */
const DIMENSIONS = [
  { label: "Algebra",             value: 92, weak: false },
  { label: "Advanced math",       value: 78, weak: false },
  { label: "Problem solving",     value: 64, weak: false },
  { label: "Geometry",            value: 41, weak: true  },
  { label: "Information & ideas", value: 86, weak: false },
  { label: "Craft & structure",   value: 71, weak: false },
  { label: "Expression of ideas", value: 57, weak: false },
];

const MODULE_TIMES = [
  { label: "R&W I",   pct: 88,  minutes: 28, over: false },
  { label: "R&W II",  pct: 100, minutes: 32, over: true  },
  { label: "Math I",  pct: 74,  minutes: 26, over: false },
  { label: "Math II", pct: 91,  minutes: 32, over: false },
];

const COMPARISON = [
  { criterion: "Vaxt limiti",    ours: "rəsmi",        theirs: "əl ilə"      },
  { criterion: "Adaptive modul", ours: "",             theirs: ""            },
  { criterion: "Səhv təhlili",   ours: "11 ölçü",      theirs: "özünüz"      },
  { criterion: "İzahat",         ours: "addım-addım",  theirs: "cavab açarı" },
  { criterion: "Bal proqnozu",   ours: "rəsmi cədvəl", theirs: "təxmini"     },
];

/** Carried over from the review carousel this section replaces. */
const REVIEWS = [
  { score: "1480", delta: "▲ 200", quote: "Hər səhvim üçün ayrı izahat gördüm.", name: "Aysel Məmmədova", place: "Boğaziçi" },
  { score: "7.5",  delta: "▲ 1.5", quote: "İki ayda 6.0-dan çıxdım.",            name: "Kərim Hüseynov",  place: "Edinburq" },
  { score: "1540", delta: "▲ 160", quote: "Hər cəhddə fərqli zəif nöqtə.",       name: "Tural Əliyev",    place: "MIT" },
];

const FAQ = [
  { q: "Bal necə hesablanır?",      a: "Rəsmi çevirmə cədvəli ilə — SAT-da şkala, IELTS-də band." },
  { q: "Təkrar cəhd olur?",         a: "Limitsiz. Hər cəhd ayrı hesabatla saxlanılır." },
  { q: "Abunəlik var?",             a: "Yox. Bir sınaq — bir ödəniş, müddətsiz giriş." },
  { q: "Sınaq yarımçıq qalarsa?",   a: "Sessiya serverdə qalır, vaxt rəsmi qaydada davam edir." },
  { q: "Yazı hissəsi qiymətlənir?", a: "Rəsmi rubrika üzrə, hər kriteriya ayrı balla." },
];

/** Section head: mono number in the left rail, heading in the right. */
function SectionHead({ n, children, className = "" }: { n: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-4 lg:grid-cols-[96px_1fr] lg:gap-8 ${className}`}>
      <div className={`${MONO_SECTION} text-ink-mute lg:pt-2.5`}>{n}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function HomeContent({ byType, totalExams }: Props) {
  const openPrograms = PROGRAMS.filter((p) => p.type && (byType[p.type]?.count ?? 0) > 0);

  return (
    <>
      <Navbar />
      <main>

        {/* ── HERO ── */}
        <section className="overflow-hidden">
          <div className="mx-auto grid w-full max-w-320 grid-cols-1 items-start gap-14 px-6 pt-14 pb-20 lg:grid-cols-[600px_1fr] lg:gap-16 lg:px-10 lg:pt-22 lg:pb-26">

            {/* Entrance timeline (INTERACTIONS §3): left column 700ms @0,
                canvas 800ms @120ms, score card a second rise 800ms @300ms on
                top of the canvas's — the double application is what gives the
                ink card its delayed settle. */}
            <div className="anim-rise">
              <h1 className="m-0 mb-7 text-[52px] font-light leading-[0.94] tracking-[-0.042em] text-ink md:text-[72px] lg:text-[88px]">
                Rəsmi<br />formatda<br /><span className="font-medium">sınaq.</span>
              </h1>

              {/* Deliberately names no programme. There are six exam types, so
                  listing three undersold the catalogue — and the programme
                  strip immediately below this section already enumerates them
                  with live counts, which is the honest place for the list. */}
              <p className="m-0 mb-10 max-w-100 text-lg leading-[1.5] text-ink-soft lg:text-[21px]">
                İmtahan gününü əvvəlcədən yaşayın.
              </p>

              <div className="flex flex-wrap items-center gap-3.5">
                <Link
                  href="/exams"
                  className="group inline-flex items-center gap-2.5 rounded-full bg-ink px-6.5 py-3.75 text-sm font-medium text-bg transition-colors duration-150 hover:bg-[#2A2A2A] active:translate-y-px"
                >
                  Sınaqlara bax <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
                </Link>
                <a
                  href="#numune"
                  className="inline-flex items-center gap-2 border-b border-ink-faint pb-0.75 text-sm font-medium text-ink transition-colors duration-150 hover:border-ink"
                >
                  Nümunə sual
                </a>
              </div>

              {/* Figure row */}
              <div className="mt-14 flex items-end border-t border-ink lg:mt-18">
                <div className="flex-1 border-r border-rule pt-4.5 pr-4.5">
                  <div className="font-mono text-2xl font-light tracking-[-0.02em] tabular-nums text-ink lg:text-[32px]">
                    {String(totalExams).padStart(2, "0")}
                  </div>
                  <div className={`${MONO_LABEL} mt-1.5 text-ink-mute`}>Açıq sınaq</div>
                </div>
                <div className="flex-1 border-r border-rule px-4.5 pt-4.5">
                  <div className="font-mono text-2xl font-light tracking-[-0.02em] tabular-nums text-ink lg:text-[32px]">11</div>
                  <div className={`${MONO_LABEL} mt-1.5 text-ink-mute`}>Analiz ölçüsü</div>
                </div>
                <div className="flex-1 pt-4.5 pl-4.5">
                  <div className="font-mono text-2xl font-light tracking-[-0.02em] tabular-nums text-ink lg:text-[32px]">1:1</div>
                  <div className={`${MONO_LABEL} mt-1.5 text-ink-mute`}>Format uyğunluğu</div>
                </div>
              </div>
            </div>

            {/* Overlapping product composition. It only overlaps at lg, where
                there is room for the canvas; below that the two cards stack in
                normal flow and the preview is not cropped. */}
            <div
              className="anim-rise flex flex-col gap-6 lg:relative lg:block lg:h-150"
              style={{ animationDuration: "800ms", animationDelay: "120ms" }}
            >

              {/* Exam UI preview */}
              <div className="overflow-hidden rounded-[14px] border border-rule bg-surface shadow-[0_24px_64px_rgba(26,26,26,0.10),0_2px_6px_rgba(26,26,26,0.04)] lg:absolute lg:top-0 lg:left-26 lg:w-134">
                <div className="flex items-center justify-between gap-4 bg-ink px-5 py-3.25">
                  <span className={`${MONO_LABEL} truncate text-bg/55`}>SAT · Math · Module II</span>
                  <span className="font-mono text-[13px] tabular-nums text-bg">32:14</span>
                </div>
                <div className="flex items-center gap-3.5 border-b border-rule bg-surface-2 px-5 py-2.5">
                  <span className={`${MONO_LABEL} shrink-0 text-ink-mute`}>14 / 22</span>
                  <div className="h-0.5 flex-1 overflow-hidden bg-[#E0DDD4]">
                    <div className="anim-wipe h-full w-[64%] bg-ink" style={{ animationDuration: "1200ms", animationDelay: "500ms" }} />
                  </div>
                </div>
                <div className="px-5 pt-7 pb-5.5">
                  <p className="m-0 mb-5 text-[17px] leading-[1.45] text-ink">
                    If <span className="font-mono text-base">ƒ(x) = 3x² − 5x + 2</span>, what is{" "}
                    <span className="font-mono text-base">ƒ(−1)</span>?
                  </p>
                  <div className="grid grid-cols-2 gap-1.75">
                    {[
                      { key: "A", value: "−6", correct: false },
                      { key: "B", value: "0",  correct: false },
                      { key: "C", value: "10", correct: true  },
                      { key: "D", value: "14", correct: false },
                    ].map((option) => (
                      <div
                        key={option.key}
                        className={`flex items-center gap-3 rounded-[9px] border px-3.5 py-2.75 ${
                          option.correct ? "border-ink bg-ink" : "border-rule"
                        }`}
                      >
                        <span className={`font-mono text-[11px] ${option.correct ? "text-bg/50" : "text-ink-mute"}`}>
                          {option.key}
                        </span>
                        <span className={`font-mono text-[15px] ${option.correct ? "text-bg" : "text-ink"}`}>
                          {option.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Score-delta card */}
              <div
                className="anim-rise rounded-[14px] bg-ink px-7 pt-6.5 pb-5.5 shadow-[0_24px_64px_rgba(26,26,26,0.22)] lg:absolute lg:top-71.5 lg:left-0 lg:w-94"
                style={{ animationDuration: "800ms", animationDelay: "300ms" }}
              >
                <div className="mb-5.5 flex items-baseline justify-between">
                  <span className={`${MONO_SECTION} text-bg/50`}>Bal tərəqqisi</span>
                  <span className="font-mono text-[10px] tracking-[0.1em] text-bg/35">SAT</span>
                </div>
                <div className="flex items-end gap-5">
                  <div>
                    <div className="font-mono text-[56px] leading-[0.9] font-light tracking-[-0.04em] tabular-nums text-bg">
                      +184
                    </div>
                    <div className={`${MONO_LABEL} mt-2.5 text-bg/50`}>orta artım</div>
                  </div>
                  <div className="flex h-21.5 flex-1 items-end gap-2.25">
                    {[
                      { score: "1180", height: "h-9",    fill: "bg-bg/22", delay: "500ms",  dim: true  },
                      { score: "1272", height: "h-13.5", fill: "bg-bg/45", delay: "650ms", dim: true  },
                      { score: "1364", height: "h-19",   fill: "bg-bg",    delay: "800ms",  dim: false },
                    ].map((bar) => (
                      <div key={bar.score} className="flex flex-1 flex-col justify-end gap-1.75">
                        <span className={`text-center font-mono text-[10px] ${bar.dim ? "text-bg/45" : "text-bg"}`}>
                          {bar.score}
                        </span>
                        <div className={`anim-grow ${bar.height} ${bar.fill}`} style={{ animationDelay: bar.delay }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`${MONO_LABEL} mt-3 flex justify-between border-t border-bg/16 pt-3 tracking-[0.12em] text-bg/40`}>
                  <span>cəhd 01</span><span>02</span><span>03</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PROGRAM INDEX ── */}
        <section className="border-t border-b border-ink border-b-rule bg-surface-2">
          <FadeUp y={12} className="mx-auto grid w-full max-w-320 grid-cols-2 px-6 sm:grid-cols-3 lg:grid-cols-6 lg:px-10">
            {PROGRAMS.map((program, i) => {
              const data = program.type ? byType[program.type] : undefined;
              const count = data?.count ?? 0;
              const body = (
                <>
                  <span className={`font-mono text-lg tracking-[0.01em] ${count > 0 ? "text-ink" : "text-ink-mute"}`}>
                    {program.code}
                  </span>
                  <span className={`${MONO_LABEL} flex items-center gap-1.75 tracking-[0.12em] ${count > 0 ? "text-ink" : "text-ink-mute"}`}>
                    <span
                      className={`h-1.25 w-1.25 rounded-full ${count > 0 ? "bg-correct" : "border border-ink-mute"}`}
                      aria-hidden
                    />
                    {count > 0 ? `${count} sınaq` : "hazırlanır"}
                  </span>
                </>
              );

              const cellClass = `flex flex-col gap-2.5 border-r border-[#E0DDD4] py-5.5 last:border-r-0 ${
                i === 0 ? "pr-5.5" : "px-5.5"
              }`;

              return count > 0 && program.type ? (
                <Link
                  key={program.code}
                  href={`/exams?type=${program.type}`}
                  className={`${cellClass} transition-colors duration-150 hover:bg-surface-3`}
                >
                  {body}
                </Link>
              ) : (
                <div key={program.code} className={cellClass}>{body}</div>
              );
            })}
          </FadeUp>
        </section>

        {/* ── §01 METOD ── */}
        <section className="mx-auto w-full max-w-320 px-6 pt-20 lg:px-10 lg:pt-28">
          <SectionHead n="01" className="mb-12 lg:mb-16">
            <h2 className={H2}>Üç mərhələ.</h2>
          </SectionHead>

          <div className="grid gap-4 lg:grid-cols-[96px_1fr] lg:gap-8">
            <div aria-hidden />
            <div className="relative">
              {/* The rule the three nodes sit on. */}
              <div className="absolute top-24 right-0 left-0 hidden h-px bg-rule lg:block" aria-hidden />
              <StaggerContainer className="relative grid gap-12 md:grid-cols-3 lg:gap-10">

                {STEPS.map((step, i) => (
                  <StaggerItem key={step.n}>
                    <div className="flex h-24 items-end pb-3.5" aria-hidden>
                      {i === 0 && (
                        <div className="flex items-end gap-1.5">
                          {[26, 52, 34, 64, 20, 44].map((h, j) => (
                            <div
                              key={j}
                              className={`w-3.5 ${j === 2 || j === 4 ? "bg-ink" : "bg-ink-faint"}`}
                              style={{ height: h }}
                            />
                          ))}
                        </div>
                      )}
                      {i === 1 && (
                        <div className="grid grid-cols-7 gap-1">
                          {[1,0,1,0,1,0,0, 0,1,0,1,0,1,0, 1,0,1,0,0,1,0].map((on, j) => (
                            <div key={j} className={`h-3.5 w-3.5 ${on ? "bg-ink" : "bg-rule"}`} />
                          ))}
                        </div>
                      )}
                      {i === 2 && (
                        <div className="flex items-end gap-2.5">
                          <div className="relative h-14 w-14 rounded-full border-2 border-ink">
                            <span className="absolute top-1/2 left-1/2 h-4.75 w-px origin-bottom -translate-x-1/2 -translate-y-full rotate-[38deg] bg-ink" />
                            <span className="absolute top-1/2 left-1/2 h-3.25 w-px origin-bottom -translate-x-1/2 -translate-y-full -rotate-[115deg] bg-ink-mute" />
                          </div>
                          <div className="flex flex-col gap-1.25 pb-1">
                            <div className="h-1.25 w-11 bg-ink" />
                            <div className="h-1.25 w-7.5 bg-ink-faint" />
                            <div className="h-1.25 w-9.5 bg-ink-faint" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative pt-6">
                      <span className="absolute -top-1.25 left-0 hidden h-2.75 w-2.75 rounded-full bg-ink lg:block" aria-hidden />
                      <div className={`${MONO_SECTION} mb-3 text-[11px] tracking-[0.14em] text-ink-mute`}>
                        Mərhələ {step.n}
                      </div>
                      <h3 className="m-0 mb-2.5 text-2xl font-normal tracking-[-0.025em] text-ink lg:text-[28px]">
                        {step.title}
                      </h3>
                      <p className="m-0 max-w-70 text-base leading-[1.55] text-ink-soft">{step.line}</p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </section>

        {/* ── §02 ANALİZ ── */}
        <section className="mx-auto w-full max-w-320 px-6 py-20 lg:px-10 lg:py-28">
          <SectionHead n="02">
            <div className="mb-10 grid gap-6 lg:mb-14 lg:grid-cols-[1fr_1.35fr] lg:items-end lg:gap-18">
              <h2 className={H2}>Nəticə<br />11 ölçüdə.</h2>
              <p className="m-0 max-w-105 text-[17px] leading-[1.6] text-ink-soft lg:pb-1.5">
                Hesabat sınaq bitdikdən dərhal sonra açılır.
              </p>
            </div>

            <FadeUp className="overflow-hidden rounded-[14px] border border-rule bg-surface">
              <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-4.5 lg:px-7">
                <span className="text-base font-medium tracking-[-0.01em] text-ink">Bölmə üzrə analiz</span>
                <span className={`${MONO_LABEL} shrink-0 text-ink-mute`}>Cəhd 03 · SAT—01</span>
              </div>

              <div className="grid lg:grid-cols-[1fr_372px]">
                {/* Dimension chart */}
                <div className="border-b border-rule px-5 pt-6 pb-7 lg:border-r lg:border-b-0 lg:px-7">
                  <div className={`${MONO_LABEL} mb-1.5 grid grid-cols-[110px_1fr_46px] items-center gap-4 border-b border-rule-soft pb-3 text-[9px] tracking-[0.16em] text-ink-mute sm:grid-cols-[180px_1fr_46px]`}>
                    <span>Ölçü</span><span>Dəqiqlik</span><span className="text-right">%</span>
                  </div>

                  {DIMENSIONS.map((dimension, i) => (
                    <div
                      key={dimension.label}
                      className={`grid grid-cols-[110px_1fr_46px] items-center gap-4 py-2.25 sm:grid-cols-[180px_1fr_46px] ${
                        dimension.weak ? "-mx-5 bg-surface-2 px-5 lg:-mx-7 lg:px-7" : ""
                      }`}
                    >
                      <span className={`truncate text-sm text-ink ${dimension.weak ? "font-medium" : ""}`}>
                        {dimension.label}
                      </span>
                      <div className={`h-2 ${dimension.weak ? "bg-[#E4E0D6]" : "bg-rule-soft"}`}>
                        <WipeBar
                          percent={dimension.value}
                          className={dimension.weak ? "bg-error" : "bg-ink"}
                          delay={i * 0.06}
                        />
                      </div>
                      <span className={`text-right font-mono text-[13px] tabular-nums ${dimension.weak ? "text-error" : "text-ink"}`}>
                        {dimension.value}
                      </span>
                    </div>
                  ))}

                  <div className="mt-4 flex items-center gap-2.5 border-t border-rule-soft pt-3.5">
                    <span className={`${MONO_LABEL} text-ink-mute`}>+ 4 ölçü</span>
                    <span className="h-px flex-1 bg-rule-soft" />
                    <span className={`${MONO_LABEL} text-error`}>1 zəif sahə</span>
                  </div>
                </div>

                {/* Forecast + time */}
                <div className="flex flex-col">
                  <div className="border-b border-rule px-5 pt-6 pb-6 lg:px-7">
                    <div className={`${MONO_SECTION} mb-3.5 text-[10px] text-ink-mute`}>Proqnoz bal</div>
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-[52px] leading-[0.9] font-light tracking-[-0.04em] tabular-nums text-ink">
                        1364
                      </span>
                      <span className="font-mono text-[13px] text-correct">▲ 92</span>
                    </div>
                    <div className="mt-5 flex h-6.5 gap-px">
                      <div className="flex-1 bg-rule-soft" />
                      <div className="flex-1 bg-rule-soft" />
                      <div className="flex-1 bg-[#E0DDD4]" />
                      <div className="flex-2 bg-ink" />
                      <div className="flex-1 bg-[#E0DDD4]" />
                      <div className="flex-1 bg-rule-soft" />
                    </div>
                    <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-mute">
                      <span>400</span><span>1600</span>
                    </div>
                  </div>

                  <div className="px-5 py-6 lg:px-7">
                    <div className={`${MONO_SECTION} mb-4 text-[10px] text-ink-mute`}>Vaxt bölgüsü</div>
                    <div className="flex flex-col gap-3">
                      {MODULE_TIMES.map((module) => (
                        <div key={module.label} className="flex items-center gap-3">
                          <span className="w-13 shrink-0 font-mono text-[11px] text-ink-mute">{module.label}</span>
                          <div className="h-1.5 flex-1 bg-rule-soft">
                            <WipeBar
                              percent={module.pct}
                              className={module.over ? "bg-error" : "bg-ink"}
                              delay={0.2 + MODULE_TIMES.indexOf(module) * 0.06}
                            />
                          </div>
                          <span className={`w-8 shrink-0 text-right font-mono text-[11px] ${module.over ? "text-error" : "text-ink"}`}>
                            {module.minutes}′
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>

            <div className={`${MONO_LABEL} mt-3.5 text-ink-mute`}>Şəkil 01 — nəticə hesabatı</div>
          </SectionHead>
        </section>

        {/* ── §03 NÜMUNƏ ── */}
        <section id="numune" className="scroll-mt-5 bg-ink text-bg">
          <div className="mx-auto w-full max-w-320 px-6 py-20 lg:px-10 lg:py-28">
            <div className="grid gap-4 lg:grid-cols-[96px_1fr] lg:gap-8">
              <div className={`${MONO_SECTION} text-bg/45 lg:pt-2.5`}>03</div>
              <div className="min-w-0">
                <h2 className="m-0 mb-10 max-w-140 text-[32px] font-light leading-[1.04] tracking-[-0.035em] text-bg md:text-[44px] lg:mb-14">
                  Səhv → izahat.
                </h2>

                <div className="grid items-start gap-10 lg:grid-cols-[1fr_340px] lg:gap-14">
                  <FadeUp className="overflow-hidden rounded-[14px] bg-bg text-ink">
                    <div className="flex items-center justify-between gap-4 border-b border-rule bg-surface-2 px-5 py-3.5 lg:px-6">
                      <span className={`${MONO_LABEL} text-ink-mute`}>Sual 14 / 22 · Geometry</span>
                      <span className={`${MONO_LABEL} text-error`}>səhv</span>
                    </div>
                    <div className="px-5 pt-7 pb-6 lg:px-6">
                      <p className="m-0 mb-6 text-lg leading-[1.45]">
                        If <span className="font-mono text-[18px]">ƒ(x) = 3x² − 5x + 2</span>, what is{" "}
                        <span className="font-mono text-[18px]">ƒ(−1)</span>?
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-3.5 rounded-[10px] border border-rule px-4 py-3.25">
                          <span className="font-mono text-[11px] text-ink-mute">A</span>
                          <span className="font-mono text-base">−6</span>
                        </div>
                        <div className="flex items-center gap-3.5 rounded-[10px] border border-error px-4 py-3.25">
                          <span className="font-mono text-[11px] text-error">B</span>
                          <span className="font-mono text-base text-error">0</span>
                          <span className={`${MONO_LABEL} ml-auto tracking-[0.12em] text-error`}>sizin</span>
                        </div>
                        <div className="flex items-center gap-3.5 rounded-[10px] border border-correct bg-correct px-4 py-3.25">
                          <span className="font-mono text-[11px] text-bg/60">C</span>
                          <span className="font-mono text-base text-bg">10</span>
                          <span className={`${MONO_LABEL} ml-auto tracking-[0.12em] text-bg/75`}>doğru</span>
                        </div>
                        <div className="flex items-center gap-3.5 rounded-[10px] border border-rule px-4 py-3.25">
                          <span className="font-mono text-[11px] text-ink-mute">D</span>
                          <span className="font-mono text-base">14</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-rule bg-surface-2 px-5 pt-5.5 pb-6 lg:px-6">
                      <div className={`${MONO_SECTION} mb-4 text-[10px] text-ink-mute`}>Addım-addım</div>
                      {[
                        { n: "01", step: "3(−1)² = 3",     note: null },
                        { n: "02", step: "−5(−1) = +5",    note: "← ən çox səhv" },
                        { n: "03", step: "3 + 5 + 2 = 10", note: null },
                      ].map((row, i, rows) => (
                        <div
                          key={row.n}
                          className={`grid grid-cols-[26px_1fr] items-baseline gap-3.5 border-t border-[#E4E0D6] py-2.5 ${
                            i === rows.length - 1 ? "border-b" : ""
                          }`}
                        >
                          <span className="font-mono text-[11px] text-ink-mute">{row.n}</span>
                          <span className="font-mono text-[15px] text-ink">
                            {row.step}
                            {row.note && <span className="ml-2 font-sans text-[13px] text-error">{row.note}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </FadeUp>

                  <FadeUp delay={0.1} className="lg:pt-2">
                    {[
                      { n: "01", label: "Səhvin növü",       value: "İşarə xətası"       },
                      { n: "02", label: "Təkrarlanma",       value: "3 cəhddə 5 dəfə"    },
                      { n: "03", label: "Təyin edilən məşq", value: "Geometry · 12 sual" },
                    ].map((row, i, rows) => (
                      <div
                        key={row.n}
                        className={`grid grid-cols-[24px_1fr] items-baseline gap-4 py-4 ${
                          i === 0 ? "border-t border-bg/25" : "border-t border-bg/14"
                        } ${i === rows.length - 1 ? "border-b border-bg/14" : ""}`}
                      >
                        <span className="font-mono text-[11px] text-bg/45">{row.n}</span>
                        <div>
                          <div className="mb-1 text-[17px] font-medium text-bg">{row.label}</div>
                          <div className="text-[15px] text-bg/60">{row.value}</div>
                        </div>
                      </div>
                    ))}
                    <div className="mt-7 rounded-xl bg-bg/8 px-5.5 py-5">
                      <div className="font-mono text-[32px] font-light tracking-[-0.03em] text-bg">98</div>
                      <div className="mt-1.5 text-sm text-bg/60">sualın hər biri belə açılır</div>
                    </div>
                  </FadeUp>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── §04 MÜQAYİSƏ ── */}
        <section className="mx-auto w-full max-w-320 px-6 py-20 lg:px-10 lg:py-28">
          <SectionHead n="04">
            <h2 className={`${H2} mb-10 max-w-130 lg:mb-12`}>Kitabla fərq.</h2>

            <FadeUp className="grid grid-cols-[1fr_100px_100px] border-t border-ink sm:grid-cols-[1fr_200px_200px]">
              <div className="py-3.5" />
              <div className={`${MONO_SECTION} bg-ink px-3 py-3.5 text-[10px] text-bg sm:px-5`}>Testcentre</div>
              <div className={`${MONO_SECTION} px-3 py-3.5 text-[10px] text-ink-mute sm:px-5`}>Sərbəst</div>

              {COMPARISON.map((row, i) => {
                const last = i === COMPARISON.length - 1;
                const rule = `border-t border-rule ${last ? "border-b" : ""}`;
                return (
                  <div key={row.criterion} className="contents">
                    <div className={`${rule} py-4.5 pr-3 text-[15px] text-ink sm:text-[17px]`}>{row.criterion}</div>
                    <div className={`${rule} bg-surface-2 px-3 py-4.5 font-mono text-[13px] text-correct sm:px-5 sm:text-[15px]`}>
                      ✓{row.ours && ` ${row.ours}`}
                    </div>
                    <div className={`${rule} px-3 py-4.5 font-mono text-[13px] text-ink-mute sm:px-5 sm:text-[15px]`}>
                      ✗{row.theirs && ` ${row.theirs}`}
                    </div>
                  </div>
                );
              })}
            </FadeUp>
          </SectionHead>
        </section>

        {/* ── §05 RƏYLƏR ── */}
        <section className="border-t border-rule bg-surface-2">
          <div className="mx-auto w-full max-w-320 px-6 py-20 lg:px-10 lg:py-24">
            <SectionHead n="05">
              <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-18">
                <FadeUp>
                  <div className="mb-5 flex items-baseline gap-4">
                    <span className="font-mono text-[56px] leading-[0.85] font-light tracking-[-0.045em] tabular-nums text-ink lg:text-[76px]">
                      {REVIEWS[0].score}
                    </span>
                    <span className={`${MONO_SECTION} text-[13px] text-correct`}>{REVIEWS[0].delta}</span>
                  </div>
                  <blockquote className="m-0 mb-5.5 max-w-130 text-[22px] leading-[1.35] font-light tracking-[-0.025em] text-ink lg:text-[26px]">
                    “{REVIEWS[0].quote}”
                  </blockquote>
                  <div className="text-[15px] text-ink">
                    {REVIEWS[0].name} <span className="text-ink-mute">· {REVIEWS[0].place}</span>
                  </div>
                </FadeUp>

                <StaggerContainer delay={0.15} className="flex flex-col justify-end gap-7 lg:pb-1.5">
                  {REVIEWS.slice(1).map((review) => (
                    <StaggerItem key={review.name} className="border-t border-ink-faint pt-5">
                      <div className="mb-2.5 flex items-baseline gap-3">
                        <span className="font-mono text-[34px] font-light tracking-[-0.03em] tabular-nums text-ink">
                          {review.score}
                        </span>
                        <span className={`${MONO_SECTION} text-[11px] text-correct`}>{review.delta}</span>
                      </div>
                      <p className="m-0 mb-2 text-[17px] leading-[1.45] text-ink">“{review.quote}”</p>
                      <div className="text-sm text-ink-mute">{review.name} · {review.place}</div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </SectionHead>
          </div>
        </section>

        {/* ── §06 FAQ ── */}
        <section id="suallar" className="mx-auto w-full max-w-320 scroll-mt-5 px-6 py-20 lg:px-10 lg:py-28">
          <SectionHead n="06">
            <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:gap-18">
              <h2 className={H2}>Suallar.</h2>
              <StaggerContainer>
                {FAQ.map((item, i) => (
                  <StaggerItem key={item.q}>
                  <details
                    className={`group ${i === 0 ? "border-t border-ink" : "border-t border-rule"} ${
                      i === FAQ.length - 1 ? "border-b border-rule" : ""
                    }`}
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-5 py-5">
                      <span className="flex-1 text-lg font-normal tracking-[-0.015em] text-ink">{item.q}</span>
                      <span className="font-mono text-base text-ink-mute" aria-hidden>
                        <span className="group-open:hidden">+</span>
                        <span className="hidden group-open:inline">−</span>
                      </span>
                    </summary>
                    <p className="m-0 mb-6 max-w-140 text-base leading-[1.65] text-ink-soft">{item.a}</p>
                  </details>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </SectionHead>
        </section>

        {/* ── CTA ── */}
        <section className="bg-ink text-bg">
          <div className="mx-auto w-full max-w-320 px-6 py-20 lg:px-10 lg:pt-24 lg:pb-22">
            <div className="grid items-end gap-12 lg:grid-cols-[1fr_480px] lg:gap-20">
              <div>
                <h2 className="m-0 mb-8 text-[44px] font-light leading-[0.98] tracking-[-0.042em] text-bg lg:text-[64px]">
                  Sessiya<br />açıqdır.
                </h2>
                <Link
                  href="/exams"
                  className="group inline-flex items-center gap-2.5 rounded-full bg-bg px-7 py-4 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface active:translate-y-px"
                >
                  Sınaq seç <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
                </Link>
              </div>

              {/* Price rail — real programs, real prices. `min-w-0` keeps the
                  rail inside its grid column: a grid item defaults to
                  min-width:auto, so a long title would stretch the page. */}
              <StaggerContainer className="min-w-0">
                {openPrograms.map((program, i) => {
                  const data = byType[program.type as string];
                  const href = data.count === 1 ? `/exams/${data.firstId}` : `/exams?type=${program.type}`;
                  return (
                    <StaggerItem key={program.code}>
                    <Link
                      href={href}
                      className={`flex items-baseline justify-between gap-5 py-4.5 text-bg transition-opacity duration-150 hover:opacity-70 ${
                        i === 0 ? "border-t border-bg/28" : "border-t border-bg/14"
                      } ${i === openPrograms.length - 1 ? "border-b border-bg/14" : ""}`}
                    >
                      <span className={`${MONO_SECTION} w-17 shrink-0 text-[11px] text-bg/50`}>{program.code}</span>
                      {/* min-w-0: without it the flex item cannot shrink below
                          its text width, and a long exam title widens the page
                          instead of truncating. */}
                      <span className="min-w-0 flex-1 truncate text-[17px]">
                        {data.count === 1 ? data.titles[0] : `${data.count} sınaq`}
                      </span>
                      <span className="shrink-0 font-mono text-xl tabular-nums">{data.minPrice}₼</span>
                    </Link>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
