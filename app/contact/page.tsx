'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FadeUp from "@/components/ui/FadeUp";
import { StaggerContainer, StaggerItem } from "@/components/ui/StaggerChildren";
import { sendContactMessage } from '@/lib/actions/contact';

const MONO_LABEL = "font-mono text-[10px] tracking-[0.16em] uppercase";
const MONO_SECTION = "font-mono text-[11px] tracking-[0.16em] uppercase";

/** Replaces the old <select>: the subject is chosen from pills, and the choice
 *  is submitted through a hidden field so the server action sees the same
 *  `subject` value it always did. */
const SUBJECTS = ['Texniki dəstək', 'Ödəniş', 'Akademik sual', 'Tərəfdaşlıq', 'Başqa'];

const EMAIL = 'testcentreaz@proton.me';

/** Mirrors the server action's `message` limit — the counter is only shown once
 *  the writer is close enough to it for the number to matter. */
const MESSAGE_MAX = 5000;

/** The promises the form makes, stated once beside it rather than scattered
 *  through the fields as helper text. */
const ASSURANCES = [
  { label: 'Cavab',    value: 'İnsan yazır, bot deyil' },
  { label: 'Müddət',   value: '24 saat, iş günləri' },
  { label: 'Məlumat',  value: 'Üçüncü tərəflə paylaşılmır' },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [messageLength, setMessageLength] = useState(0);
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kopyalana bilmədi. Ünvanı əl ilə seçin.');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setSending(true);
    try {
      const result = await sendContactMessage({
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        subject: String(data.get('subject') ?? ''),
        message: String(data.get('message') ?? ''),
      });
      if (result.ok) {
        setSubmitted(true);
        form.reset();
        setMessageLength(0);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Gözlənilməz xəta. Bir az sonra yenidən cəhd edin.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Navbar />
      <main>

        {/* ── Statement ── */}
        <section className="mx-auto w-full max-w-320 px-6 pt-14 pb-12 lg:px-10 lg:pt-22 lg:pb-16">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_400px] lg:gap-20">
            <div>
              <div className={`${MONO_SECTION} mb-6 text-ink-mute lg:mb-8`}>Əlaqə</div>
              <h1 className="m-0 text-[52px] font-light leading-[0.94] tracking-[-0.045em] text-ink md:text-[72px] lg:text-[88px]">
                Yazın.<br />
                <span className="text-ink-soft">Oxuyan bir insandır.</span>
              </h1>
            </div>

            <p className="m-0 max-w-140 text-[17px] leading-[1.65] text-ink-soft lg:pb-3">
              Texniki problem, ödəniş sualı, akademik dəqiqləşdirmə və ya təklif —
              hamısı eyni qutuya düşür. 24 saat ərzində cavab yazırıq.
            </p>
          </div>
        </section>

        {/* ── Channels ── */}
        <section className="mx-auto w-full max-w-320 px-6 pb-16 lg:px-10 lg:pb-22">
          <StaggerContainer className="grid gap-x-12 sm:grid-cols-3">
            <StaggerItem className="border-t border-ink pt-5 pb-6">
              <div className={`${MONO_LABEL} mb-3.5 text-ink-mute`}>E-poçt</div>
              <a
                href={`mailto:${EMAIL}`}
                className="block text-[19px] tracking-[-0.02em] wrap-break-word text-ink underline decoration-ink-faint underline-offset-4 transition-colors duration-150 hover:decoration-ink"
              >
                {EMAIL}
              </a>
              <button
                type="button"
                onClick={copyEmail}
                className={`${MONO_LABEL} mt-3.5 cursor-pointer text-ink-mute transition-colors duration-150 hover:text-ink`}
              >
                {copied ? '✓ Kopyalandı' : 'Ünvanı kopyala'}
              </button>
            </StaggerItem>

            <StaggerItem className="border-t border-rule pt-5 pb-6 sm:border-ink">
              <div className={`${MONO_LABEL} mb-3.5 text-ink-mute`}>Cavab müddəti</div>
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-[38px] leading-none font-light tracking-[-0.04em] tabular-nums text-ink">
                  24
                </span>
                <span className={`${MONO_SECTION} text-ink-mute`}>saat</span>
              </div>
              <div className="mt-3.5 text-[15px] text-ink-soft">Adətən daha tez</div>
            </StaggerItem>

            <StaggerItem className="border-t border-rule pt-5 pb-6 sm:border-ink">
              <div className={`${MONO_LABEL} mb-3.5 text-ink-mute`}>Ünvan</div>
              <div className="text-[19px] tracking-[-0.02em] text-ink">Bakı, Azərbaycan</div>
              <div className="mt-3.5 text-[15px] text-ink-soft">Uzaqdan işləyən komanda</div>
            </StaggerItem>
          </StaggerContainer>
        </section>

        {/* ── The form ── */}
        <section className="border-t border-rule bg-surface-2">
          <div className="mx-auto w-full max-w-320 px-6 py-16 lg:px-10 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-20">

              <aside className="lg:sticky lg:top-28 lg:self-start">
                <div className={`${MONO_SECTION} mb-5 text-ink-mute`}>Forma</div>
                <h2 className="m-0 mb-4 text-[30px] font-light leading-[1.05] tracking-[-0.035em] text-ink md:text-[38px]">
                  Bir neçə sətir kifayətdir.
                </h2>
                <p className="m-0 mb-8 max-w-100 text-[15px] leading-[1.65] text-ink-soft">
                  Nə baş verdiyini və hansı imtahanla bağlı olduğunu yazsanız,
                  ilk cavabda həll təklif edə bilərik.
                </p>

                <dl className="m-0">
                  {ASSURANCES.map((item, i) => (
                    <div
                      key={item.label}
                      className={`flex items-baseline justify-between gap-4 py-3.5 ${
                        i === 0 ? "border-t border-ink-faint" : "border-t border-[#E0DDD4]"
                      } ${i === ASSURANCES.length - 1 ? "border-b border-[#E0DDD4]" : ""}`}
                    >
                      <dt className={`${MONO_LABEL} shrink-0 text-ink-mute`}>{item.label}</dt>
                      <dd className="m-0 text-right text-[15px] text-ink">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </aside>

              <FadeUp y={12} className="min-w-0">
                <div className="rounded-[16px] border border-rule bg-surface px-6 py-8 shadow-sm sm:px-9 sm:py-10 lg:px-11">
                  {submitted ? (
                    <div className="py-6 sm:py-10">
                      <div className="mb-6 flex items-center gap-2.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-correct" aria-hidden />
                        <span className={`${MONO_LABEL} text-ink-mute`}>Qəbul edildi</span>
                      </div>
                      <p className="m-0 mb-3 text-[32px] font-light leading-[1.05] tracking-[-0.035em] text-ink">
                        Təşəkkür edirik.
                      </p>
                      <p className="m-0 mb-8 max-w-120 text-[17px] leading-[1.6] text-ink-soft">
                        Mesajınız bizə çatdı. Növbəti 24 saat ərzində
                        yazdığınız e-poçt ünvanına cavab yazacağıq.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSubmitted(false)}
                        className="cursor-pointer text-sm font-medium text-ink underline underline-offset-4 hover:text-accent-deep"
                      >
                        Yeni mesaj göndər
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit}>
                      <div className="grid gap-x-9 sm:grid-cols-2">
                        <div className="border-b border-rule pb-3.5 transition-colors focus-within:border-ink">
                          <label htmlFor="contact-name" className={`${MONO_LABEL} mb-3 flex items-baseline gap-2 text-ink-mute`}>
                            <span className="text-ink-faint" aria-hidden>01</span> Ad Soyad
                          </label>
                          <input
                            id="contact-name"
                            name="name"
                            maxLength={100}
                            required
                            autoComplete="name"
                            placeholder="Aysel Məmmədova"
                            className="w-full border-none bg-transparent p-0 text-[17px] text-ink placeholder:text-ink-faint focus:ring-0 focus:outline-none"
                          />
                        </div>

                        <div className="mt-7 border-b border-rule pb-3.5 transition-colors focus-within:border-ink sm:mt-0">
                          <label htmlFor="contact-email" className={`${MONO_LABEL} mb-3 flex items-baseline gap-2 text-ink-mute`}>
                            <span className="text-ink-faint" aria-hidden>02</span> E-poçt
                          </label>
                          <input
                            id="contact-email"
                            name="email"
                            type="email"
                            maxLength={200}
                            required
                            autoComplete="email"
                            placeholder="ad@nümunə.az"
                            className="w-full border-none bg-transparent p-0 text-[17px] text-ink placeholder:text-ink-faint focus:ring-0 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Subject — pills, not a dropdown. */}
                      <fieldset className="mt-7 border-b border-rule pb-4">
                        <legend className={`${MONO_LABEL} mb-3.5 flex items-baseline gap-2 text-ink-mute`}>
                          <span className="text-ink-faint" aria-hidden>03</span> Mövzu
                        </legend>
                        <input type="hidden" name="subject" value={subject} />
                        <div className="flex flex-wrap gap-1.75">
                          {SUBJECTS.map((option) => {
                            const active = option === subject;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setSubject(option)}
                                aria-pressed={active}
                                className={`cursor-pointer rounded-full px-4 py-2.25 text-[13px] transition-colors duration-150 ${
                                  active
                                    ? "bg-ink font-medium text-bg"
                                    : "border border-[#E0DDD4] text-ink-soft hover:border-ink hover:text-ink"
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>

                      <div className="mt-7 border-b border-rule pb-3.5 transition-colors focus-within:border-ink">
                        <label htmlFor="contact-message" className={`${MONO_LABEL} mb-3 flex items-baseline gap-2 text-ink-mute`}>
                          <span className="text-ink-faint" aria-hidden>04</span> Mesaj
                        </label>
                        <textarea
                          id="contact-message"
                          name="message"
                          rows={6}
                          maxLength={MESSAGE_MAX}
                          required
                          onChange={(e) => setMessageLength(e.currentTarget.value.length)}
                          placeholder="Nə baş verdi? Hansı imtahan?"
                          className="w-full resize-y border-none bg-transparent p-0 text-[17px] leading-[1.6] text-ink placeholder:text-ink-faint focus:ring-0 focus:outline-none"
                        />
                        {/* Only worth a line once the limit is actually in reach. */}
                        {messageLength > MESSAGE_MAX - 500 && (
                          <div className={`${MONO_LABEL} mt-2 text-right tabular-nums text-ink-mute`}>
                            {messageLength} / {MESSAGE_MAX}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-8">
                        <button
                          type="submit"
                          disabled={sending}
                          className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-ink px-6.5 py-3.75 text-sm font-medium text-bg transition-colors duration-150 hover:bg-[#2A2A2A] active:translate-y-px disabled:opacity-60"
                        >
                          {sending ? 'Göndərilir…' : (<>Göndər <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5">→</span></>)}
                        </button>
                        <span className={`${MONO_LABEL} text-ink-mute`}>Məlumat paylaşılmır</span>
                      </div>
                    </form>
                  )}
                </div>

                <p className="m-0 mt-6 text-[15px] leading-[1.6] text-ink-soft">
                  Ödəniş və nəticə suallarının çoxu{' '}
                  <Link href="/#suallar" className="text-ink underline underline-offset-2 hover:text-accent-deep">
                    suallar bölməsində
                  </Link>{' '}
                  cavablanıb — orada daha tez tapa bilərsiniz.
                </p>
              </FadeUp>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
