'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { sendContactMessage } from '@/lib/actions/contact';

const contacts = [
  { l: "Əlaqə",    k: "testcentreaz@proton.me", s: "Sual, geri bildirim, kömək, tərəfdaşlıq və digər bütün müraciətlər" },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

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
      <main className="pt-18">
        <div className="max-w-310 mx-auto px-8 py-24">
          <div className="grid md:grid-cols-[1.1fr_1fr] gap-24">

            {/* Left: form */}
            <div>
              <div className="flex items-center gap-3 mb-8 rise">
                <span className="dot" />
                <span className="eyebrow">Əlaqə</span>
              </div>
              <h1 className="font-display font-normal text-4xl md:text-6xl lg:text-7xl leading-none tracking-tight text-ink mb-8 rise rise-1">
                Birbaşa bizə{" "}
                <span style={{ color: "var(--color-accent)" }}>yazın.</span>
              </h1>
              <p className="font-display font-normal text-xl md:text-2xl leading-normal text-ink-soft max-w-120 mb-12 rise rise-2">
                Hər mesajı insan oxuyur. Bot yoxdur, avtomatik cavab yoxdur. 24 saat ərzində geri qayıdırıq.
              </p>

              {submitted ? (
                <div
                  className="card-new"
                  style={{ background: "var(--color-accent-soft)", border: "1px solid var(--color-ink)" }}
                >
                  <div className="eyebrow mb-2" style={{ color: "var(--color-ink)" }}>Qəbul edildi</div>
                  <h3 className="font-display font-medium text-xl leading-tight tracking-tight text-ink mb-3">Təşəkkür edirik.</h3>
                  <p className="text-base leading-[1.6]">
                    Mesajınız bizə çatdı. Növbəti 24 saat ərzində geri yazacağıq.
                  </p>
                  <button
                    className="mt-5 text-sm font-medium underline underline-offset-2"
                    style={{ color: "var(--color-ink)" }}
                    onClick={() => setSubmitted(false)}
                  >
                    Yeni mesaj göndər
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="contact-name" className="block text-sm font-medium mb-2">
                        Ad Soyad
                      </label>
                      <input id="contact-name" name="name" className="input-new" placeholder="Aysel Məmmədova" maxLength={100} required />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-sm font-medium mb-2">
                        E-poçt
                      </label>
                      <input id="contact-email" name="email" className="input-new" type="email" placeholder="ad@nümunə.az" maxLength={200} required />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className="block text-sm font-medium mb-2">
                      Mövzu
                    </label>
                    <select
                      id="contact-subject"
                      name="subject"
                      className="input-new"
                      defaultValue=""
                      required
                      style={{ appearance: "none", cursor: "pointer" }}
                    >
                      <option value="" disabled>— seçin —</option>
                      <option>Texniki dəstək</option>
                      <option>Ödəniş və qiymət</option>
                      <option>Akademik sual</option>
                      <option>Tərəfdaşlıq</option>
                      <option>Başqa</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="block text-sm font-medium mb-2">
                      Mesaj
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      className="input-new"
                      rows={5}
                      style={{ resize: "vertical" }}
                      placeholder="Nə üzərində işləyirsiniz, necə kömək edə bilərik?"
                      maxLength={5000}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={sending}>
                    {sending ? 'Göndərilir…' : (<>Mesajı Göndər <span className="arrow">→</span></>)}
                  </button>
                </form>
              )}
            </div>

            {/* Right: contact cards */}
            <div className="flex flex-col gap-6">
              {contacts.map((c, i) => (
                <div key={i} className="card-new">
                  <div className="eyebrow mb-3">{c.l}</div>
                  <div className="font-display font-medium text-ink text-xl mb-1.5">{c.k}</div>
                  <p className="text-sm leading-relaxed text-ink-soft">{c.s}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
