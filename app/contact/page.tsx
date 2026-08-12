'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FadeUp from "@/components/ui/FadeUp";
import { sendContactMessage } from '@/lib/actions/contact';

const MONO_LABEL = "font-mono text-[9px] tracking-[0.16em] uppercase";
const MONO_META = "font-mono text-[11px] tracking-[0.14em] uppercase";

/** Replaces the old <select>: the subject is chosen from pills, and the choice
 *  is submitted through a hidden field so the server action sees the same
 *  `subject` value it always did. */
const SUBJECTS = ['Texniki dəstək', 'Ödəniş', 'Akademik sual', 'Tərəfdaşlıq', 'Başqa'];

const EMAIL = 'testcentreaz@proton.me';

/** Response-time sparkline: seven recent days, the pale bar being the slowest. */
const SPARKLINE = [
  { height: 'h-2.5',  slow: false },
  { height: 'h-4',    slow: false },
  { height: 'h-2',    slow: false },
  { height: 'h-5',    slow: true  },
  { height: 'h-3',    slow: false },
  { height: 'h-3.5',  slow: false },
  { height: 'h-2.25', slow: false },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState(SUBJECTS[0]);

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
        <div className="mx-auto w-full max-w-320 px-6 pt-14 pb-20 lg:px-10 lg:pt-20 lg:pb-28">
          <div className="grid items-start gap-14 lg:grid-cols-[1fr_420px] lg:gap-24">

            {/* ── Left: the form ── */}
            <div className="min-w-0">
              <h1 className="m-0 mb-5 text-[52px] font-light leading-[0.96] tracking-[-0.045em] text-ink md:text-[64px] lg:text-[76px]">
                Yazın.
              </h1>
              <div className="mb-12 flex items-center gap-2.5 lg:mb-14">
                <span className="h-1.5 w-1.5 rounded-full bg-correct" aria-hidden />
                <span className={`${MONO_META} text-ink-mute`}>insan cavabı · 24 saat</span>
              </div>

              {submitted ? (
                <div className="border-t border-ink pt-8">
                  <div className={`${MONO_LABEL} mb-3 text-ink-mute`}>Qəbul edildi</div>
                  <p className="m-0 mb-3 text-2xl font-light tracking-tight text-ink">Təşəkkür edirik.</p>
                  <p className="m-0 mb-6 max-w-120 text-base leading-[1.6] text-ink-soft">
                    Mesajınız bizə çatdı. Növbəti 24 saat ərzində geri yazacağıq.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="cursor-pointer text-sm font-medium text-ink underline underline-offset-4"
                  >
                    Yeni mesaj göndər
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate={false}>
                  {/* Name + email share one ruled block. */}
                  <div className="grid gap-x-8 sm:grid-cols-2">
                    <div className="border-t border-ink py-4.5 transition-colors focus-within:border-ink">
                      <label htmlFor="contact-name" className={`${MONO_LABEL} mb-2.5 block text-ink-mute`}>
                        Ad Soyad
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        maxLength={100}
                        required
                        placeholder="Aysel Məmmədova"
                        className="w-full border-none bg-transparent p-0 text-lg text-ink placeholder:text-ink-mute focus:ring-0 focus:outline-none"
                      />
                    </div>
                    <div className="border-t border-rule py-4.5 transition-colors focus-within:border-ink sm:border-ink">
                      <label htmlFor="contact-email" className={`${MONO_LABEL} mb-2.5 block text-ink-mute`}>
                        E-poçt
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        maxLength={200}
                        required
                        placeholder="ad@nümunə.az"
                        className="w-full border-none bg-transparent p-0 text-lg text-ink placeholder:text-ink-mute focus:ring-0 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Subject — pills, not a dropdown. */}
                  <fieldset className="border-t border-rule pt-5.5 pb-4.5">
                    <legend className={`${MONO_LABEL} mb-3.5 text-ink-mute`}>Mövzu</legend>
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

                  <div className="border-t border-rule border-b border-b-ink pt-5.5 pb-4.5 transition-colors focus-within:border-t-ink">
                    <label htmlFor="contact-message" className={`${MONO_LABEL} mb-2.5 block text-ink-mute`}>
                      Mesaj
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={5}
                      maxLength={5000}
                      required
                      placeholder="Nə üzərində işləyirsiniz?"
                      className="w-full resize-y border-none bg-transparent p-0 text-lg leading-[1.55] text-ink placeholder:text-ink-mute focus:ring-0 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-5 pt-7">
                    <button
                      type="submit"
                      disabled={sending}
                      className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-ink px-6.5 py-3.75 text-sm font-medium text-bg transition-colors duration-150 hover:bg-[#2A2A2A] active:translate-y-px disabled:opacity-60"
                    >
                      {sending ? 'Göndərilir…' : (<>Göndər <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5">→</span></>)}
                    </button>
                    <span className={`${MONO_LABEL} text-[10px] tracking-[0.12em] text-ink-mute`}>
                      məlumat paylaşılmır
                    </span>
                  </div>
                </form>
              )}
            </div>

            {/* ── Right: the rail ── */}
            <div className="min-w-0">
              <FadeUp>
              <a
                href={`mailto:${EMAIL}`}
                className="block rounded-[14px] bg-ink px-7 py-7.5 transition-colors duration-150 hover:bg-[#242424]"
              >
                <div className={`${MONO_LABEL} mb-4 text-bg/45`}>E-poçt</div>
                <div className="text-xl font-normal tracking-[-0.02em] wrap-break-word text-bg lg:text-[22px]">
                  {EMAIL}
                </div>
              </a>
              </FadeUp>

              <FadeUp delay={0.08} className="mt-8">
                <div className={`${MONO_LABEL} border-b border-ink pb-3 text-ink-mute`}>Cavab müddəti</div>
                <div className="flex items-end gap-4 border-b border-rule py-5">
                  <span className="font-mono text-[44px] leading-[0.9] font-light tracking-[-0.04em] tabular-nums text-ink">
                    24
                  </span>
                  <span className={`${MONO_META} pb-1.5 text-ink-mute`}>saat</span>
                  <div className="flex flex-1 items-end gap-0.5 pb-1.5" aria-hidden>
                    {SPARKLINE.map((bar, i) => (
                      <span key={i} className={`flex-1 ${bar.height} ${bar.slow ? "bg-ink-faint" : "bg-ink"}`} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-rule py-4">
                  <span className="text-[15px] text-ink-soft">Ünvan</span>
                  <span className="text-[15px] text-ink">Bakı, Azərbaycan</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-rule py-4">
                  <span className="text-[15px] text-ink-soft">Bot</span>
                  <span className="font-mono text-[13px] text-ink-mute">yoxdur</span>
                </div>
              </FadeUp>

              <FadeUp delay={0.16} className="mt-8 rounded-xl bg-surface-2 px-6 py-5.5">
                <div className={`${MONO_LABEL} mb-2.5 text-ink-mute`}>Daha tez</div>
                <p className="m-0 text-[15px] leading-[1.6] text-ink">
                  Ödəniş və nəticə sualları{' '}
                  <Link href="/#suallar" className="underline underline-offset-2 hover:text-accent-deep">
                    suallar bölməsində
                  </Link>.
                </p>
              </FadeUp>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
