import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Məxfilik Siyasəti',
  description: 'Testcentre-nin məxfilik siyasəti — hansı məlumatları topladığımız, necə istifadə etdiyimiz və hüquqlarınız.',
};

const sections = [
  {
    id: 'controller',
    title: 'Məlumat nəzarətçisi',
    content: `Testcentre platformasının sahibi və məlumat nəzarətçisi Aydin Vaqif oğlu Nasibli, fiziki şəxs (VÖEN: 1309635092)-dir. Ünvan: Bakı, Azərbaycan. Əlaqə: help@testcentre.online

Bu Məxfilik Siyasəti Azərbaycan Respublikasının "Fərdi məlumatlar haqqında" Qanunu (2010) ilə uyğundur.`,
  },
  {
    id: 'data-collected',
    title: 'Topladığımız məlumatlar',
    content: `Hesab məlumatları: ad, soyad, e-poçt ünvanı, profil şəkli. Bu məlumatlar Clerk autentifikasiya xidməti vasitəsilə toplanır.

İstifadə məlumatları: hansı sınaqları keçdiyiniz, nə qədər vaxt sərf etdiyiniz, cavablarınız, bölmə üzrə nəticələriniz.

Ödəniş məlumatları: ödəniş tarixçəsi (kart məlumatları bizdə saxlanılmır — bunlar LemonSqueezy tərəfindən emal edilir).

Texniki məlumatlar: IP ünvanı, brauzer növü, cihaz tipi, sessiya jurnalları.

Eksam sessiyası məlumatları: başlanğıc vaxtı, keçirilmiş müddət, dinlənilmiş audio URL-lər. Seans məlumatları avtomatik olaraq 7 gün sonra silinir.`,
  },
  {
    id: 'purpose',
    title: 'Məlumatların istifadə məqsədi',
    content: `— Xidmətin göstərilməsi: hesabınızın idarəsi, sınaq nəticələrinin saxlanması, proqresinizin izlənməsi.
— Ödənişlərin emalı: satın alma əməliyyatlarının tamamlanması.
— Texniki dəstək: xəta aşkarlanması (Sentry xidməti vasitəsilə).
— Kommunikasiya: hesabınızla bağlı vacib bildirişlər.
— Platforma təkmilləşdirilməsi: anonim istifadə statistikası.

Məlumatlarınız reklam məqsədi ilə üçüncü tərəflərlə paylaşılmır.`,
  },
  {
    id: 'third-parties',
    title: 'Üçüncü tərəf xidmət təminatçıları',
    content: `Xidmətimizin göstərilməsi üçün aşağıdakı alt-emalçılardan istifadə edirik:

Clerk, Inc. — istifadəçi autentifikasiyası və hesab idarəsi.
LemonSqueezy — ödəniş emalı. LemonSqueezy-nin öz məxfilik siyasəti tətbiq edilir.
Sentry — texniki xəta izlənməsi.
MongoDB Atlas — məlumat bazası hosting.
Vercel — tətbiq hosting və CDN.

Hər alt-emalçının öz məxfilik siyasəti və məlumat qoruma öhdəlikləri vardır. Onların siyasətləri ilə tanış olmağı tövsiyə edirik.`,
  },
  {
    id: 'retention',
    title: 'Məlumatların saxlanma müddəti',
    content: `Seans məlumatları: 7 gün (avtomatik silinir).
Hesab məlumatları: hesab aktiv olduğu müddət + hesab silindikdən 30 gün sonra tamamilə məhv edilir.
Ödəniş tarixçəsi: vergi və mühasibat tələblərinə uyğun olaraq 5 il saxlanılır.

Hesabınızı silmək istəyirsinizsə, help@testcentre.online ünvanına yazın.`,
  },
  {
    id: 'rights',
    title: 'Sizin hüquqlarınız',
    content: `Azərbaycan Respublikasının qanunvericiliyinə əsasən aşağıdakı hüquqlara maliksiniz:

— Giriş hüququ: saxladığımız məlumatlarınıza baxmaq.
— Düzəliş hüququ: yanlış məlumatların dəyişdirilməsi.
— Silmə hüququ: məlumatlarınızın silinməsini tələb etmək.
— Etiraz hüququ: müəyyən emal məqsədlərinə etiraz etmək.

Bu hüquqları həyata keçirmək üçün help@testcentre.online ünvanına yazın. Sorğularınıza 30 gün ərzində cavab veririk.`,
  },
  {
    id: 'children',
    title: 'Yetkinlik yaşı',
    content: `Platformamız 13 yaşından yuxarı istifadəçilər üçün nəzərdə tutulmuşdur. 13-18 yaş arasındakı istifadəçilərin valideyn və ya qanuni qəyyumunun razılığı tələb olunur. Bilmədən 13 yaşından kiçik uşağa məxsus məlumat topladığımızı aşkar etsək, həmin məlumatları dərhal silirik.`,
  },
  {
    id: 'cookies',
    title: 'Cookie faylları',
    content: `Platforma əsas funksionallığı üçün zəruri cookie fayllarından istifadə edir. Ətraflı məlumat üçün Cookie Siyasətimizə baxın.`,
  },
  {
    id: 'changes',
    title: 'Siyasətin dəyişdirilməsi',
    content: `Bu siyasəti zərurət yarandıqda yeniləyə bilərik. Əhəmiyyətli dəyişikliklər barədə e-poçt vasitəsilə xəbərdarlıq edəcəyik. Siyasətin cari versiyası həmişə bu səhifədə yerləşdirilir.`,
  },
  {
    id: 'contact',
    title: 'Əlaqə',
    content: `Məxfiliklə bağlı hər hansı sualınız varsa: help@testcentre.online`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-17">
        <div className="max-w-215 mx-auto px-8 py-24">

          <div className="flex items-center gap-3 mb-8 rise">
            <span className="dot" />
            <span className="eyebrow">Hüquqi</span>
          </div>
          <h1 className="t-display mb-4 rise rise-1">Məxfilik Siyasəti</h1>
          <p className="t-lede mb-4 rise rise-2" style={{ color: 'var(--color-ink-soft)' }}>
            Son yenilənmə: 26 may 2026
          </p>
          <p className="text-[16px] leading-[1.7] mb-16 rise rise-2" style={{ color: 'var(--color-ink-soft)', maxWidth: '640px' }}>
            Bu siyasət hansı məlumatları topladığımızı, niyə topladığımızı və onları necə qoruduğumuzu izah edir.
            Platformamızdan istifadə etməklə bu siyasəti qəbul etmiş sayılırsınız.
          </p>

          <div className="flex flex-col gap-12">
            {sections.map((s, i) => (
              <div key={s.id} id={s.id} className="border-t border-rule pt-10">
                <div className="flex items-baseline gap-5 mb-4">
                  <span className="eyebrow tabular-nums" style={{ color: 'var(--color-ink-mute)', minWidth: '2rem' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 className="t-title">{s.title}</h2>
                </div>
                <div className="pl-13">
                  {s.content.split('\n\n').map((para, j) => (
                    <p
                      key={j}
                      className="text-[15px] leading-[1.75] mb-4 last:mb-0"
                      style={{ color: 'var(--color-ink-soft)', whiteSpace: 'pre-line' }}
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
