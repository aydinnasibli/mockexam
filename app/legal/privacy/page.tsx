import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Məxfilik Siyasəti',
  description: 'Testcentre-nin məxfilik siyasəti — hansı məlumatları topladığımız, necə emal etdiyimiz və hüquqlarınız.',
};

const sections = [
  {
    id: 'controller',
    title: 'Məlumat nəzarətçisi',
    content: `Testcentre platformasının sahibi və məlumat nəzarətçisi: Aydin Vaqif oğlu Nasibli, fiziki şəxs (VÖEN: 1309635092). Hüquqi ünvan: AZ, Bakı şəhəri, Yasamal rayonu, Zahid Xəlilov küçəsi, Məhəllə 586, Mənzil 15, Azərbaycan Respublikası. Əlaqə: testcentreaz@proton.me

Bu Məxfilik Siyasəti 11 may 2010-cu il tarixli "Fərdi məlumatlar haqqında" Azərbaycan Respublikasının Qanununa (№ 998-IIIQD) uyğun olaraq hazırlanmışdır.`,
  },
  {
    id: 'data-collected',
    title: 'Toplanan fərdi məlumatlar',
    content: `Hesab məlumatları: ad, soyad, e-poçt ünvanı, profil şəkli. Bu məlumatlar Clerk autentifikasiya xidməti vasitəsilə toplanır.

İstifadə məlumatları: hansı sınaqları keçdiyiniz, hər sınağa sərf olunan vaxt, cavablarınız, bölmə üzrə nəticələriniz.

Ödəniş məlumatları: ödəniş tarixçəsi. Kart rekvizitləri bizdə saxlanılmır — onlar Merchant of Record (qanuni satıcı) statusunda fəaliyyət göstərən LemonSqueezy tərəfindən emal edilir.

Texniki məlumatlar: IP ünvanı, brauzer növü, cihaz tipi, sessiya qeydləri.

İmtahan sessiyası məlumatları: başlanğıc vaxtı, keçirilmiş müddət, dinlənilmiş audio URL-lər. Bu məlumatlar 7 (yeddi) gün sonra avtomatik silinir.`,
  },
  {
    id: 'purpose',
    title: 'Emal məqsədləri',
    content: `Fərdi məlumatlarınız aşağıdakı məqsədlər üçün emal edilir:

— Xidmətin göstərilməsi: hesabın idarə olunması, sınaq nəticələrinin saxlanması, proqresin izlənməsi.
— Ödənişlərin emalı: satın alma əməliyyatlarının tamamlanması.
— Texniki dəstək: xətaların aşkar edilməsi (Sentry vasitəsilə).
— Kommunikasiya: hesabınızla bağlı vacib bildirişlər.
— Platformanın inkişafı: anonim istifadə statistikası.

Fərdi məlumatlarınız reklam məqsədi ilə üçüncü şəxslərə verilmir.`,
  },
  {
    id: 'legal-basis',
    title: 'Emalın hüquqi əsası',
    content: `"Fərdi məlumatlar haqqında" Qanunun 9-cu maddəsinə uyğun olaraq fərdi məlumatlarınız aşağıdakı hüquqi əsaslarla emal edilir:

— Müqavilənin icrası: hesabın yaradılması, sınaq nəticələrinin saxlanması və ödəniş əməliyyatları Sizimlə bağlanan xidmət müqaviləsinin icrasına əsaslanır.
— Qanuni maraq: platformanın təhlükəsizliyinin təmin edilməsi, texniki xətaların izlənməsi (Sentry) və anonim statistika qanuni maraqlar əsasında həyata keçirilir.
— Hüquqi öhdəlik: ödəniş tarixçəsinin vergi və mühasibat qanunvericiliyinə uyğun saxlanılması.
— Razılıq: marketinq bildirişlərinin göndərilməsi üçün ayrıca razılığınız alınır.`,
  },
  {
    id: 'third-parties',
    title: 'Alt-emalçılar',
    content: `Xidmətin göstərilməsi üçün aşağıdakı alt-emalçılardan istifadə edilir:

Clerk, Inc. — istifadəçi autentifikasiyası və hesab idarəsi.
Lemon Squeezy, LLC — ödəniş emalı; Merchant of Record kimi fəaliyyət göstərir.
Functional Software, Inc. (Sentry) — texniki xəta izlənməsi.
MongoDB, Inc. (MongoDB Atlas) — verilənlər bazasının yerləşdirilməsi.
Vercel, Inc. — tətbiqin yerləşdirilməsi və məzmun çatdırılması şəbəkəsi (CDN).

Hər bir alt-emalçı öz fəaliyyəti çərçivəsində fərdi məlumatların mühafizəsinə dair müqavilə öhdəlikləri daşıyır.`,
  },
  {
    id: 'transfers',
    title: 'Beynəlxalq məlumat ötürülməsi',
    content: `Alt-emalçılarımız (Clerk, LemonSqueezy, Sentry, MongoDB Atlas, Vercel) Azərbaycan Respublikasının hüdudlarından kənarda — ABŞ-da yerləşir. Fərdi məlumatlarınız həmin şirkətlərin serverlərinə ötürülür və saxlanılır.

Ötürülmə zamanı hər bir alt-emalçının öz məxfilik siyasəti və müştəri məlumatlarının mühafizəsinə dair müqavilə öhdəlikləri tətbiq edilir.

Beynəlxalq ötürülmə ilə bağlı suallarınız üçün: testcentreaz@proton.me`,
  },
  {
    id: 'retention',
    title: 'Saxlanma müddətləri',
    content: `İmtahan sessiyası məlumatları: 7 (yeddi) gün — müddətin sonunda avtomatik silinir.
Hesab məlumatları: hesab aktiv olduğu müddət; hesab silindikdən sonra 30 (otuz) gün ərzində tamamilə məhv edilir.
Ödəniş tarixçəsi: vergi və mühasibat qanunvericiliyinə uyğun olaraq 5 (beş) il saxlanılır.

Hesabınızı silmək üçün testcentreaz@proton.me ünvanına müraciət edin.`,
  },
  {
    id: 'security',
    title: 'Məlumatların mühafizəsi',
    content: `"Fərdi məlumatlar haqqında" Qanunun 18-ci maddəsinə uyğun olaraq aşağıdakı texniki və təşkilati tədbirlər həyata keçirilir:

— Bütün məlumat ötürülmələri TLS/HTTPS protokolu vasitəsilə şifrələnir.
— Verilənlər bazası MongoDB Atlas infrastrukturunda şifrələnmiş formada saxlanılır.
— İstifadəçi autentifikasiyası Clerk tərəfindən idarə edilir; istifadəçi şifrələri bizim sistemlərimizdə saxlanılmır.
— Sentry vasitəsilə ötürülən xəta məlumatlarından şəxsi məlumatlar süzülür.
— Daxili sistemlərə giriş hüququ "minimum imtiyaz" prinsipinə uyğun məhdudlaşdırılır.

Heç bir texniki sistem mütləq mühafizəni zəmanət verə bilməz. Hesabınızda şübhəli fəaliyyət aşkar etsəniz, dərhal testcentreaz@proton.me ünvanına məlumat verin.`,
  },
  {
    id: 'rights',
    title: 'Məlumat subyektinin hüquqları',
    content: `"Fərdi məlumatlar haqqında" Qanunun 8-ci maddəsinə əsasən aşağıdakı hüquqlara maliksiniz:

— Məlumat alma: haqqınızda emal olunan fərdi məlumatlar barədə məlumat almaq.
— Düzəliş tələbi: natamam və ya yanlış məlumatların dəqiqləşdirilməsini tələb etmək.
— Silmə tələbi: hüquqi əsas olmadan emal edilən məlumatların silinməsini tələb etmək.
— Etiraz: müəyyən məqsədlər üçün aparılan emal əməliyyatlarına etiraz etmək.
— Məlumat portabilitəsi: məlumatlarınızı oxunaqlı formatda (JSON) almaq — bu imkan Testcentre tərəfindən könüllü olaraq təqdim edilir.
— Hüquqi müdafiə: hüquqlarınız pozulduqda Azərbaycan Respublikasının müvafiq məhkəməsinə müraciət etmək.

Bu hüquqları həyata keçirmək üçün testcentreaz@proton.me ünvanına müraciət edin. Sorğularınıza 30 (otuz) gün ərzində cavab verilir.`,
  },
  {
    id: 'children',
    title: 'Uşaqların fərdi məlumatları',
    content: `Platforma 13 (on üç) yaşından yuxarı şəxslər üçün nəzərdə tutulmuşdur. 13–18 yaş arasındakı istifadəçilər platformadan yalnız valideyn və ya qanuni qəyyumun razılığı əsasında istifadə edə bilər. 13 yaşından kiçik uşağa məxsus məlumatların toplanıldığı müəyyən edildikdə həmin məlumatlar dərhal silinir.`,
  },
  {
    id: 'cookies',
    title: 'Cookie faylları',
    content: `Platforma əsas funksionallığını təmin etmək üçün zəruri cookie fayllarından istifadə edir. Ətraflı məlumat üçün Cookie Siyasətimizə baxın.`,
  },
  {
    id: 'changes',
    title: 'Siyasətin yenilənməsi',
    content: `Bu siyasət zərurət yarandıqda yenilənə bilər. Məzmun baxımından əhəmiyyətli dəyişikliklər barədə qeydiyyatda olan e-poçt ünvanınıza bildiriş göndəriləcək. Siyasətin hazırkı versiyası həmişə bu səhifədə yerləşdirilir.`,
  },
  {
    id: 'contact',
    title: 'Əlaqə',
    content: `Məxfilik siyasəti ilə bağlı hər hansı sualınız üçün: testcentreaz@proton.me`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-18">
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
            Bu siyasət hansı fərdi məlumatları topladığımızı, nə məqsədlə emal etdiyimizi və məlumat subyekti kimi
            hansı hüquqlara malik olduğunuzu izah edir. Platformadan istifadə etməklə bu siyasəti qəbul etmiş sayılırsınız.
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
