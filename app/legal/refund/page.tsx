import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Geri Qaytarma Siyasəti',
  description: 'Testcentre rəqəmsal xidmətlər üçün geri qaytarma qaydaları.',
  path: '/legal/refund',
});

const sections = [
  {
    id: 'processor',
    title: 'Ödəniş emalçısı',
    content: `Bütün ödənişlər Epoint ödəniş sistemi vasitəsilə, 3D Secure protokolu ilə təhlükəsiz şəkildə emal edilir. Kart rekvizitləriniz bizim sistemlərimizdə saxlanılmır.`,
  },
  {
    id: 'no-refund',
    title: 'Ümumi qayda: geri qaytarma aparılmır',
    content: `Testcentre rəqəmsal xidmət satır. Ödəniş tamamlandığı anda imtahana giriş dərhal açılır — xidmət o anda başlayır.

İstifadəçi ödəniş əməliyyatını tamamlamaqla xidmətin dərhal icrasına açıq razılıq verir. Bu səbəbdən "İstehlakçıların hüquqlarının müdafiəsi haqqında" Qanunun müvafiq müddəaları çərçivəsində ümumi qaydada nəzərdə tutulan imtina müddəti tətbiq edilmir.

Satın almadan əvvəl hər imtahan səhifəsində onun strukturu, sual sayı, müddəti və modulları ilə tanış ola bilərsiniz.`,
  },
  {
    id: 'exception-technical',
    title: 'İstisna: texniki xəta',
    content: `Ödəniş uğurla başa çatdı, lakin texniki problem səbəbindən imtahana giriş açılmadısa — bu istisnadır.

Belə vəziyyətdə ödənişdən sonrakı 72 (yetmiş iki) saat ərzində testcentreaz@proton.me ünvanına ödəniş əməliyyatının nömrəsini (bank çıxarışındakı əməliyyat ID-si) qeyd edərək müraciət edin. Məsələ araşdırılıb həll ediləcək.`,
  },
  {
    id: 'exception-duplicate',
    title: 'İstisna: eyni imtahanın təkrar alışı',
    content: `Artıq aktiv girişiniz olan imtahanı səhvən ikinci dəfə satın aldıysanız — bu istisnadır.

Belə vəziyyətdə alışdan sonrakı 72 (yetmiş iki) saat ərzində testcentreaz@proton.me ünvanına hər iki ödəniş əməliyyatının nömrəsini qeyd edərək müraciət edin. Təkrar ödəniş geri qaytarılır.`,
  },
  {
    id: 'dispute',
    title: 'Ödəniş mübahisəsi',
    content: `Ödənişlə bağlı narahatlığınız yaranarsa, bank vasitəsilə geri çağırma tələbi (chargeback) təqdim etməzdən əvvəl bizimlə birbaşa əlaqə saxlamanızı xahiş edirik. Əksər məsələlər 24 saat ərzində həll edilir.

Əsassız geri çağırma tələbi halında Epoint-in mübahisə emal qaydaları tətbiq edilir və müvafiq hesab müvəqqəti dayandırıla bilər.`,
  },
  {
    id: 'contact',
    title: 'Əlaqə',
    content: `Suallarınız üçün: testcentreaz@proton.me — hər müraciətə 24 saat ərzində cavab verilir.`,
  },
];

export default function RefundPage() {
  return (
    <>
      <Navbar />
      <main className="pt-18">
        <div className="max-w-215 mx-auto px-8 py-24">

          <div className="flex items-center gap-3 mb-8 rise">
            <span className="dot" />
            <span className="eyebrow">Hüquqi</span>
          </div>
          <h1 className="t-display mb-4 rise rise-1">Geri Qaytarma Siyasəti</h1>
          <p className="t-lede mb-4 rise rise-2" style={{ color: 'var(--color-ink-soft)' }}>
            Son yenilənmə: 26 may 2026
          </p>
          <p className="text-[16px] leading-[1.7] mb-16 rise rise-2" style={{ color: 'var(--color-ink-soft)', maxWidth: '640px' }}>
            Testcentre rəqəmsal xidmət satır. Ödəniş tamamlandıqda xidmət dərhal başladığından ümumi qaydada
            geri qaytarma aparılmır. Aşağıda istisna hallar ətraflı izah edilir.
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
