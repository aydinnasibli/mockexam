import type { Metadata } from 'next';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import FadeUp from "@/components/ui/FadeUp";
import { StaggerContainer, StaggerItem } from "@/components/ui/StaggerChildren";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: 'Haqqımızda',
  description:
    'Testcentre tələbənin imtahan günündə heç bir sürprizlə qarşılaşmaması üçün qurulmuşdur — rəsmi format, ölçülə bilən tərəqqi və hər sualın arxasındakı izahat.',
  path: '/about',
});

const MONO_LABEL = "font-mono text-[10px] tracking-[0.14em] uppercase";
const MONO_SECTION = "font-mono text-[11px] tracking-[0.16em] uppercase";
const H2 = "m-0 text-[32px] font-light leading-[1.04] tracking-[-0.035em] text-ink md:text-[44px]";

/** The statement ledger: what the platform refuses, and what it commits to. */
const REFUSE = [
  { title: "Oyunlaşdırma", line: "Ulduz, seriya, gündəlik bildiriş yoxdur. Ölçü baldır." },
  { title: "Abunəlik tələsi", line: "Avtomatik yenilənmə yoxdur, gizli ödəniş yoxdur." },
  { title: "“Qarantili 100 bal”", line: "Nəticəni tələbə yazır — biz ölçü və izahat veririk." },
];

const COMMIT = [
  { title: "Rəsmi format", line: "Vaxt limiti, modul quruluşu və keçid qaydaları imtahandakı kimi." },
  { title: "Ölçülən nəticə", line: "Hər cəhd 11 ölçü üzrə hesabatla bitir." },
  { title: "İnsan cavabı", line: "Yazdığınız sualı 24 saat ərzində insan oxuyur və cavablayır." },
];

/*
 * The hero's figure row. Deliberately NOT the product figures the home hero
 * states (05 açıq sınaq / 11 analiz ölçüsü / 1:1 format) — repeating two of
 * those three here is what made this page read as a restatement of the home
 * page. These are the commitments instead, so the row previews §03 and gives
 * "Nə etmirik" a number. Every value is already asserted further down the page.
 */
const HERO_FIGURES = [
  { value: "24s", label: "İnsan cavabı" },
  { value: "30",  label: "Gün, tam silinmə" },
  { value: "0",   label: "Reklam izləməsi" },
];

const POLICIES = [
  { label: "Məlumat",            value: "Üçüncü tərəflə paylaşılmır" },
  { label: "Hesab silinməsi",    value: "30 gün ərzində tam məhv" },
  { label: "Dəstək",             value: "İnsan, 24 saat" },
  { label: "Qiymət",             value: "Bir ödəniş, gizli ödəniş yox" },
  { label: "Reklam izləməsi",    value: "Yoxdur" },
  { label: "Format dəyişikliyi", value: "30 gündə uyğunlaşma" },
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

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>

        {/* ── Statement ──
            Two columns and a floor. The statement used to sit alone in the left
            45% of the viewport with nothing opposite it and nothing under it,
            which read as an unfinished page rather than as restraint: the
            principle carries the right column, and the figure row lands the
            whole thing on a rule the way the home hero does. */}
        <section className="mx-auto w-full max-w-320 px-6 pt-14 pb-18 lg:px-10 lg:pt-22 lg:pb-24">
          <div className="anim-rise">
            <div className="mb-8 flex items-center gap-3 lg:mb-10">
              {/* Every other eyebrow in the product is dot + mono label; this
                  one was the lone exception and read as a caption. */}
              <span className="h-1.75 w-1.75 rounded-full bg-ink" aria-hidden />
              <span className={`${MONO_SECTION} text-ink`}>Haqqımızda</span>
            </div>

            <h1 className="m-0 text-[44px] font-light leading-[0.98] tracking-[-0.042em] text-ink md:text-[64px] lg:text-[80px]">
              Rəsmi formatda<br /><span className="font-medium">sınaq platforması.</span>
            </h1>

            <p className="m-0 mt-9 max-w-130 text-[19px] leading-[1.6] text-ink-soft lg:mt-11">
              Hər sınaq rəsmi qaydalarla keçir — eyni vaxt limiti, eyni quruluş,
              eyni interfeys. İmtahan günü heç nə yeni görünməsin deyə.
            </p>
          </div>

          {/* Figure row — the same object that closes the home hero. */}
          <FadeUp delay={0.2} className="mt-14 flex items-end border-t border-ink lg:mt-20">
            {HERO_FIGURES.map((figure, i) => (
              <div
                key={figure.label}
                className={`flex-1 pt-4.5 ${i === 0 ? "pr-4.5" : "px-4.5"} ${
                  i < HERO_FIGURES.length - 1 ? "border-r border-rule" : ""
                }`}
              >
                <div className="font-mono text-2xl font-light tracking-[-0.02em] tabular-nums text-ink lg:text-[32px]">
                  {figure.value}
                </div>
                <div className={`${MONO_LABEL} mt-1.5 text-ink-mute`}>{figure.label}</div>
              </div>
            ))}
          </FadeUp>
        </section>

        {/* ── §01 Niyə ── */}
        <section className="border-t border-rule bg-surface-2">
          <div className="mx-auto w-full max-w-320 px-6 py-20 lg:px-10 lg:py-28">
            <SectionHead n="01">
              <h2 className={`${H2} mb-10 lg:mb-14`}>Niyə belə qurulub.</h2>

              <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-18">
                <FadeUp>
                  <p className="m-0 mb-6 max-w-130 text-[19px] leading-[1.55] tracking-[-0.015em] text-ink">
                    Hazırlıqda ən çox itirilən şey vaxt deyil — istiqamətdir.
                    Tələbə yüzlərlə sual həll edir, amma onu geridə saxlayanın
                    hansı bacarıq olduğunu bilmir.
                  </p>
                  <p className="m-0 max-w-130 text-[17px] leading-[1.65] text-ink-soft">
                    Ona görə ardıcıllığı tərsinə çevirdik: əvvəlcə ölçü, sonra məşq.
                    Hər sınaq rəsmi formatda keçir, hər səhv 11 ölçüdən birinə yazılır,
                    hər hesabat isə növbəti məşqin istiqamətini göstərir.
                  </p>
                </FadeUp>

                <FadeUp delay={0.1}>
                  <blockquote className="m-0 border-t border-ink pt-7">
                    <p className="m-0 mb-6 max-w-120 text-[26px] leading-[1.3] font-light tracking-[-0.03em] text-ink lg:text-[30px]">
                      “Sınaq imtahandan asan olanda, imtahan sınaqdan çətin olur.”
                    </p>
                    <footer className={`${MONO_LABEL} text-ink-mute`}>Prinsip</footer>
                  </blockquote>
                </FadeUp>
              </div>
            </SectionHead>
          </div>
        </section>

        {/* ── §02 Stance ── */}
        <section className="mx-auto w-full max-w-320 px-6 py-20 lg:px-10 lg:py-28">
            <SectionHead n="02">
              <h2 className={`${H2} mb-10 lg:mb-14`}>Nə etmirik.<br />Nə edirik.</h2>

              <div className="grid gap-12 lg:grid-cols-2 lg:gap-18">
                <StaggerContainer>
                  <div className={`${MONO_SECTION} mb-5 text-error`}>Etmirik</div>
                  {REFUSE.map((item, i) => (
                    <StaggerItem
                      key={item.title}
                      className={`py-5 ${i === 0 ? "border-t border-ink-faint" : "border-t border-rule"} ${
                        i === REFUSE.length - 1 ? "border-b border-rule" : ""
                      }`}
                    >
                      <div className="flex items-baseline gap-4">
                        {/* Sized to the title it marks, not to the fine print —
                            at 12px the glyph read as a bullet rather than a
                            verdict. */}
                        <span className="w-5 shrink-0 font-mono text-[22px] leading-none text-error" aria-hidden>✗</span>
                        <div className="min-w-0">
                          <div className="text-[19px] tracking-[-0.02em] text-ink-soft">{item.title}</div>
                          <p className="m-0 mt-2 max-w-100 text-[15px] leading-[1.6] text-ink-mute">{item.line}</p>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>

                <StaggerContainer delay={0.1}>
                  <div className={`${MONO_SECTION} mb-5 text-correct`}>Edirik</div>
                  {COMMIT.map((item, i) => (
                    <StaggerItem
                      key={item.title}
                      className={`py-5 ${i === 0 ? "border-t border-ink" : "border-t border-rule"} ${
                        i === COMMIT.length - 1 ? "border-b border-rule" : ""
                      }`}
                    >
                      <div className="flex items-baseline gap-4">
                        <span className="w-5 shrink-0 font-mono text-[22px] leading-none text-correct" aria-hidden>✓</span>
                        <div className="min-w-0">
                          <div className="text-[19px] font-medium tracking-[-0.02em] text-ink">{item.title}</div>
                          <p className="m-0 mt-2 max-w-100 text-[15px] leading-[1.6] text-ink-soft">{item.line}</p>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </SectionHead>
        </section>

        {/* ── §03 Policies ── */}
        <section className="border-t border-rule bg-surface-2">
          <div className="mx-auto w-full max-w-320 px-6 py-20 lg:px-10 lg:py-24">
            <SectionHead n="03">
              <div className="mb-10 grid gap-6 lg:mb-12 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-18">
                <h2 className={H2}>Qaydalar.</h2>
                <p className="m-0 max-w-105 text-[17px] leading-[1.6] text-ink-soft lg:pb-1.5">
                  Şərtlərin tam mətni{' '}
                  <Link href="/legal/terms" className="text-ink underline decoration-ink-faint underline-offset-4 transition-colors duration-150 hover:decoration-ink">
                    hüquqi bölmədədir
                  </Link>
                  .
                </p>
              </div>

              <StaggerContainer className="grid lg:grid-cols-2 lg:gap-x-18">
                {POLICIES.map((policy, i) => (
                  <StaggerItem
                    key={policy.label}
                    className={`grid grid-cols-1 items-baseline gap-1.5 py-5 sm:grid-cols-[190px_1fr] sm:gap-6 ${
                      i < 2 ? "border-t border-ink-faint" : "border-t border-[#E0DDD4]"
                    } ${i >= POLICIES.length - 2 ? "border-b border-[#E0DDD4]" : ""}`}
                  >
                    <span className={`${MONO_SECTION} text-[11px] tracking-[0.14em] text-ink-mute`}>
                      {policy.label}
                    </span>
                    <span className="text-[17px] text-ink">{policy.value}</span>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </SectionHead>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mx-auto w-full max-w-320 px-6 py-20 lg:px-10 lg:py-24">
          <FadeUp className="flex flex-col items-start gap-6 border-t border-ink pt-7 sm:flex-row sm:items-baseline sm:justify-between sm:gap-10">
            <div>
              <h2 className="m-0 text-[36px] font-light leading-none tracking-[-0.04em] text-ink lg:text-[52px]">
                Sınaqlara keçin.
              </h2>
              <p className="m-0 mt-4 max-w-100 text-[15px] leading-[1.6] text-ink-soft">
                Sualınız qalıbsa,{' '}
                <Link href="/contact" className="text-ink underline decoration-ink-faint underline-offset-4 transition-colors duration-150 hover:decoration-ink">
                  yazın
                </Link>
                {' '}— cavabı insan yazacaq.
              </p>
            </div>
            <Link
              href="/exams"
              className="group inline-flex shrink-0 items-center gap-2.5 rounded-full bg-ink px-6.5 py-3.75 text-sm font-medium text-bg transition-colors duration-150 hover:bg-[#2A2A2A] active:translate-y-px"
            >
              Kataloq <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
            </Link>
          </FadeUp>
        </section>
      </main>
      <Footer />
    </>
  );
}
