import type { Metadata } from 'next';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: 'Haqqımızda',
  description: 'Testcentre tələbənin imtahan günündə özünü heç bir sürprizlə qarşılaşmasın deyə qurulmuşdur.',
};

const stats = [
  { l: "Mövcud sınaq", v: "248" },
  { l: "Sual bankı",   v: "21K+" },
  { l: "Aktiv tələbə", v: "12,800" },
  { l: "Sertifikat",   v: "ISO 9001" },
];

const features = [
  {
    n: "01",
    t: "Rəsmi format",
    d: "Hər sınaq College Board, ETS, Cambridge və DİM rəsmi formatları ilə tam üst-üstə düşür. Adaptive sual seçimi və modul strukturu real imtahanla eynidir.",
  },
  {
    n: "02",
    t: "Süni intellekt analitikası",
    d: "Hər cəhd 11 müxtəlif ölçü üzrə təhlil edilir. Sistem zəif istiqamətləri görür, gündəlik 30 dəqiqəlik hədəfli məşq planı qurur.",
  },
  {
    n: "03",
    t: "Tam izahat",
    d: "Səhv etdiyiniz hər sual üçün addım-addım həll yolu, müvafiq formul vərəqi və qısa video izah. Səhv — yeni bilik mənbəyidir.",
  },
];

const values = [
  { t: "Akademik nəzarət", d: "Hər sual əvvəlcə mövzu üzrə mütəxəssis, sonra isə dil və UX redaktoru tərəfindən yoxlanılır. Heç bir sual təsadüfən bazaya daxil olmur." },
  { t: "Şəxsi məxfilik",   d: "Tələbə məlumatları üçüncü tərəflərlə paylaşılmır. Reklam izləməsi yoxdur. Hesab silindikdə bütün məlumat 30 gün ərzində məhv edilir." },
  { t: "İnsan dəstəyi",    d: "İstifadəçinin hər sualı 24 saat ərzində insan tərəfindən cavablanır. Bot yoxdur, avtomatik cavab yoxdur." },
  { t: "Pulsuz başlanğıc", d: "Hər sınaq növündə ən azı bir tam pulsuz diaqnostik nümunə var. Ödəniş yalnız sistemi və nəticəni gördükdən sonra." },
  { t: "Şəffaf qiymət",    d: "Gizli ödəniş, avtomatik yeniləmə, abunəlik tələsi yoxdur. Ödədiyiniz tam olaraq aldığınızdır." },
  { t: "Daimi yenilənmə",  d: "Sual bankı hər həftə yenilənir. Rəsmi imtahan formatı dəyişdikdə platforma 30 gün ərzində uyğunlaşır." },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-17">

        {/* Hero */}
        <section className="max-w-310 mx-auto px-8 py-24">
          <div className="max-w-220">
            <div className="flex items-center gap-3 mb-8 rise">
              <span className="dot" />
              <span className="eyebrow">Haqqımızda</span>
            </div>
            <h1 className="t-display rise rise-1">
              Hazırlıq, <em className="italic" style={{ color: "var(--color-accent)" }}>ciddiyyətlə.</em>
            </h1>
            <p className="t-lede mt-8 max-w-180 rise rise-2" style={{ color: "var(--color-ink-soft)" }}>
              Testcentre tələbənin imtahan günündə özünü heç bir sürprizlə qarşılaşmasın deyə qurulmuşdur.
              Burada oyunlaşdırma və boş vədlər yoxdur — yalnız rəsmi format, ölçülə bilən tərəqqi və
              hər sualın arxasındakı izahat.
            </p>
            <div className="flex gap-3 mt-10 rise rise-3">
              <Link href="/exams" className="btn-primary">
                Sınaqlara bax <span className="arrow">→</span>
              </Link>
              <Link href="/contact" className="btn-ghost">
                Bizimlə əlaqə
              </Link>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-t border-b border-rule bg-surface">
          <div className="max-w-310 mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 py-12">
              {stats.map((s, i) => (
                <div
                  key={i}
                  className={`px-8 ${i < 3 ? 'border-r border-rule' : ''} ${i >= 2 ? 'mt-8 md:mt-0' : ''}`}
                >
                  <div className="eyebrow mb-3">{s.l}</div>
                  <div className="t-num leading-none" style={{ fontSize: 48, letterSpacing: "-0.025em" }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What we do */}
        <section className="max-w-310 mx-auto px-8 py-24">
          <div className="section-head">
            <div className="eyebrow mb-4">Nə edirik</div>
            <h2 className="t-headline">Üç prinsipdə qurulan bir platforma.</h2>
            <p className="t-body-lg mt-4">Mürəkkəblik gizlənmiş, mühüm olan üzdə.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((v, i) => (
              <div key={i} className="pt-8 border-t border-rule">
                <div className="t-num mb-6" style={{ fontSize: 18, color: "var(--color-ink)" }}>{v.n}</div>
                <h3 className="t-headline mb-4" style={{ fontSize: 26 }}>{v.t}</h3>
                <p className="text-[15px] leading-[1.6]" style={{ color: "var(--color-ink-soft)" }}>{v.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Principles quote */}
        <section className="max-w-310 mx-auto px-8 pb-24">
          <div className="bg-surface border border-rule rounded-2xl px-16 py-18 text-center">
            <div className="eyebrow mb-6" style={{ color: "var(--color-ink)" }}>Bizim prinsiplərimiz</div>
            <blockquote
              className="font-display font-normal text-ink leading-[1.3] tracking-[-0.015em] max-w-220 mx-auto"
              style={{ fontSize: "clamp(28px, 3.4vw, 44px)" }}
            >
              Akademik hazırlıq{" "}
              <em className="italic" style={{ color: "var(--color-accent)" }}>oyun mexaniki</em>{" "}
              deyil. Burada gizli abunəlik, qondarma sertifikat və{" "}
              <em className="italic">"qarantili 100 bal"</em>{" "}
              vədi yoxdur — yalnız ciddi iş və ölçülə bilən nəticə.
            </blockquote>
          </div>
        </section>

        {/* Values grid */}
        <section className="max-w-310 mx-auto px-8 pb-24">
          <div className="section-head">
            <div className="eyebrow mb-4">Necə işləyirik</div>
            <h2 className="t-headline">Vacib detallar.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {values.map((v, i) => (
              <div key={i} className="card-new">
                <h3 className="t-title mb-3" style={{ fontSize: 18 }}>{v.t}</h3>
                <p className="text-[14px] leading-[1.6]" style={{ color: "var(--color-ink-soft)" }}>{v.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA card */}
        <section className="max-w-310 mx-auto px-8 pb-24">
          <div className="card-ink text-center rounded-2xl py-16 px-14">
            <div className="eyebrow mb-5" style={{ color: "var(--color-accent-soft)" }}>Başlayın</div>
            <h2
              className="font-display font-normal leading-[1.1] tracking-[-0.02em] mb-6"
              style={{ fontSize: "clamp(32px, 4vw, 56px)", color: "var(--color-bg)" }}
            >
              İlk sınaq <em className="italic">pulsuzdur.</em>
            </h2>
            <p
              className="text-[17px] leading-[1.55] max-w-135 mx-auto mb-8"
              style={{ color: "rgba(250,250,246,0.7)" }}
            >
              Heç bir kart, heç bir abunəlik. Qeydiyyat 30 saniyə çəkir, nəticə dərhal görünür.
            </p>
            <Link
              href="/exams"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full text-sm font-medium transition-colors"
              style={{ background: "var(--color-bg)", color: "var(--color-ink)", border: "1px solid var(--color-bg)" }}
            >
              Sınaqları kəşf et →
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
