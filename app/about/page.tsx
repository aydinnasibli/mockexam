import type { Metadata } from 'next';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: 'Haqqımızda',
  description:
    'Testcentre tələbənin imtahan günündə heç bir sürprizlə qarşılaşmaması üçün qurulmuşdur — rəsmi format, ölçülə bilən tərəqqi və hər sualın arxasındakı izahat.',
  path: '/about',
});

const MONO_LABEL = "font-mono text-[10px] tracking-[0.14em] uppercase";
const MONO_SECTION = "font-mono text-[11px] tracking-[0.16em] uppercase";

/** The statement ledger: what the platform refuses, and what it commits to. */
const STANCE = [
  { mark: "✗", text: "Oyunlaşdırma",                 kind: "no"  },
  { mark: "✗", text: "Abunəlik tələsi",              kind: "no"  },
  { mark: "✗", text: "“Qarantili 100 bal”",          kind: "no"  },
  { mark: "✓", text: "Rəsmi format, ölçülən nəticə", kind: "yes" },
];

const NUMBERS = [
  { figure: "11",  label: "analiz ölçüsü" },
  { figure: "1:1", label: "format uyğunluğu" },
  { figure: "7",   label: "günə bir yenilənmə" },
  { figure: "24s", label: "insan cavabı" },
];

/** How a question reaches the bank — the four-step pipeline. */
const PIPELINE = [
  { n: "01", verb: "Yazılır",     by: "Mövzu mütəxəssisi" },
  { n: "02", verb: "Yoxlanır",    by: "Dil və UX redaktoru" },
  { n: "03", verb: "Kalibrlənir", by: "Çətinlik indeksi" },
  { n: "04", verb: "Sınağa düşür", by: "Həftəlik dövr" },
];

const POLICIES = [
  { label: "Məlumat",           value: "Üçüncü tərəflə paylaşılmır" },
  { label: "Hesab silinməsi",   value: "30 gün ərzində tam məhv" },
  { label: "Dəstək",            value: "İnsan, 24 saat" },
  { label: "Qiymət",            value: "Bir ödəniş, gizli ödəniş yox" },
  { label: "Reklam izləməsi",   value: "Yoxdur" },
  { label: "Format dəyişikliyi", value: "30 gündə uyğunlaşma" },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>

        {/* ── Statement ── */}
        <section className="mx-auto w-full max-w-320 px-6 pt-14 pb-16 lg:px-10 lg:pt-22 lg:pb-24">
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_380px] lg:gap-20">
            <h1 className="m-0 text-[52px] font-light leading-[0.94] tracking-[-0.045em] text-ink md:text-[72px] lg:text-[92px]">
              Vəd yox.<br /><span className="font-medium">Ölçü var.</span>
            </h1>

            <div className="lg:pb-3.5">
              {STANCE.map((item, i) => (
                <div
                  key={item.text}
                  className={`flex items-center gap-3 py-3.5 ${
                    i === 0 ? "border-t border-ink" : "border-t border-rule"
                  } ${i === STANCE.length - 1 ? "border-b border-rule" : ""}`}
                >
                  <span
                    className={`w-4 shrink-0 font-mono text-xs ${item.kind === "no" ? "text-error" : "text-correct"}`}
                    aria-hidden
                  >
                    {item.mark}
                  </span>
                  <span className={`text-base ${item.kind === "no" ? "text-ink-soft" : "text-ink"}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Numbers band ── */}
        <section className="bg-ink text-bg">
          <div className="mx-auto grid w-full max-w-320 grid-cols-2 gap-y-8 px-6 py-14 sm:grid-cols-4 lg:gap-y-0 lg:px-10 lg:py-18">
            {NUMBERS.map((item, i) => (
              <div
                key={item.label}
                className={[
                  i < NUMBERS.length - 1 ? 'sm:border-r sm:border-bg/20' : '',
                  i === 0 ? 'sm:pr-9' : 'sm:px-9',
                  i === NUMBERS.length - 1 ? 'sm:pr-0 sm:pl-9' : '',
                  i % 2 === 0 ? 'border-r border-bg/20 pr-6 sm:pr-0' : 'pl-6 sm:pl-0',
                ].filter(Boolean).join(' ')}
              >
                <div className="font-mono text-[40px] font-light tracking-[-0.04em] tabular-nums lg:text-[52px]">
                  {item.figure}
                </div>
                <div className={`${MONO_LABEL} mt-3 text-bg/50`}>{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── §01 Question pipeline ── */}
        <section className="mx-auto w-full max-w-320 px-6 py-20 lg:px-10 lg:py-28">
          <div className="mb-10 grid gap-4 lg:mb-14 lg:grid-cols-[96px_1fr] lg:gap-8">
            <div className={`${MONO_SECTION} text-ink-mute lg:pt-2.5`}>01</div>
            <h2 className="m-0 text-[32px] font-light leading-[1.04] tracking-[-0.035em] text-ink md:text-[44px]">
              Sual bazaya necə düşür.
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-[96px_1fr] lg:gap-8">
            <div aria-hidden />
            <div className="grid gap-0.5 sm:grid-cols-2 lg:grid-cols-4">
              {PIPELINE.map((step, i) => {
                const last = i === PIPELINE.length - 1;
                return (
                  <div
                    key={step.n}
                    className={`border-t-2 border-ink px-6 pt-6.5 pb-7 ${
                      last ? "bg-ink text-bg" : "bg-surface-2"
                    }`}
                  >
                    <div className={`${MONO_SECTION} mb-5 text-[11px] tracking-[0.14em] ${last ? "text-bg/50" : "text-ink-mute"}`}>
                      {step.n}
                    </div>
                    <div className={`mb-2 text-lg font-medium tracking-[-0.015em] ${last ? "text-bg" : "text-ink"}`}>
                      {step.verb}
                    </div>
                    <div className={`text-[15px] ${last ? "text-bg/60" : "text-ink-soft"}`}>{step.by}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── §02 Policies ── */}
        <section className="border-t border-rule bg-surface-2">
          <div className="mx-auto w-full max-w-320 px-6 py-20 lg:px-10 lg:py-24">
            <div className="mb-10 grid gap-4 lg:mb-12 lg:grid-cols-[96px_1fr] lg:gap-8">
              <div className={`${MONO_SECTION} text-ink-mute lg:pt-2`}>02</div>
              <h2 className="m-0 text-[32px] font-light leading-[1.04] tracking-[-0.035em] text-ink md:text-[44px]">
                Qaydalar.
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-[96px_1fr] lg:gap-8">
              <div aria-hidden />
              <div className="grid lg:grid-cols-2 lg:gap-x-18">
                {POLICIES.map((policy, i) => (
                  <div
                    key={policy.label}
                    className={`grid grid-cols-1 items-baseline gap-1.5 py-5 sm:grid-cols-[190px_1fr] sm:gap-6 ${
                      i < 2 ? "border-t border-ink-faint" : "border-t border-[#E0DDD4]"
                    } ${i >= POLICIES.length - 2 ? "border-b border-[#E0DDD4]" : ""}`}
                  >
                    <span className={`${MONO_SECTION} text-[11px] tracking-[0.14em] text-ink-mute`}>
                      {policy.label}
                    </span>
                    <span className="text-[17px] text-ink">{policy.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mx-auto w-full max-w-320 px-6 py-20 lg:px-10 lg:py-24">
          <div className="flex flex-col items-start gap-6 border-t border-ink pt-7 sm:flex-row sm:items-baseline sm:justify-between sm:gap-10">
            <h2 className="m-0 text-[36px] font-light leading-none tracking-[-0.04em] text-ink lg:text-[52px]">
              Sınaqlara keçin.
            </h2>
            <Link
              href="/exams"
              className="inline-flex shrink-0 items-center gap-2.5 rounded-full bg-ink px-6.5 py-3.75 text-sm font-medium text-bg transition-colors duration-150 hover:bg-[#2A2A2A]"
            >
              Kataloq <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
