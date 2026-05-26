import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'İstifadə Şərtləri',
  description: 'Testcentre platformasından istifadə qaydaları və şərtlər.',
};

const sections = [
  {
    id: 'acceptance',
    title: 'Şərtlərin qəbulu',
    content: `Testcentre platformasına daxil olmaq və ya istifadə etməklə bu İstifadə Şərtlərini tam qəbul etmiş sayılırsınız. Şərtləri qəbul etmirsinizsə, platformadan istifadə etməyin.

Bu şərtlər Aydin Vaqif oğlu Nasibli, fiziki şəxs (VÖEN: 1309635092) ilə siz (istifadəçi) arasında hüquqi müqavilədir. Azərbaycan Respublikasının qanunvericiliyi tətbiq edilir.`,
  },
  {
    id: 'service',
    title: 'Xidmətin təsviri',
    content: `Testcentre SAT, IELTS, TOEFL, DİM, GMAT, GRE imtahanlarına hazırlıq üçün rəqəmsal sınaq platformasıdır. Xidmətlər arasında:

— Adaptiv sınaq sessiyaları
— Süni intellekt əsaslı analitika
— Nəticə hesabatları
— Sual izahatları

Xidmətlər hər zaman mövcud olacağına zəmanət verilmir; baxım işləri üçün müvəqqəti fasilələr mümkündür.`,
  },
  {
    id: 'eligibility',
    title: 'Yaş tələbi',
    content: `Platformadan istifadə etmək üçün ən az 13 yaşınız olmalıdır. 13-18 yaş arasındakı istifadəçilərin valideyn və ya qanuni qəyyumun yazılı razılığı tələb olunur. Qeydiyyatdan keçməklə yaş tələbini qarşıladığınızı təsdiq etmiş sayılırsınız.`,
  },
  {
    id: 'account',
    title: 'Hesab',
    content: `Hesab yaratmaq üçün düzgün və tam məlumat verməlisiniz. Hesabınızın təhlükəsizliyinə görə məsuliyyət sizə aiddir.

Bir şəxsə bir hesab açıla bilər. Hesab başqasına verilə, satıla və ya icarəyə verilə bilməz.

Hesabınızı silmək istədikdə help@testcentre.online ünvanına yazın. Silinmədən əvvəl bütün aktiv imtahan girişləriniz bitmiş olmalıdır.`,
  },
  {
    id: 'payments',
    title: 'Ödəniş şərtləri',
    content: `Ödənişli xidmətlər LemonSqueezy vasitəsilə emal edilir. Ödəniş zamanı LemonSqueezy-nin şərtləri də tətbiq edilir.

Qiymətlər saytda göstərildiyi kimi ödənilir. Gizli ödəniş, abunəlik tələsi və ya avtomatik yenilənmə yoxdur — hər alış ayrıca və könüllüdür.

Ödəniş uğurla başa çatdıqdan sonra müvafiq imtahana giriş dərhal açılır.`,
  },
  {
    id: 'refund',
    title: 'Geri qaytarma',
    content: `Geri qaytarma şərtləri üçün ayrıca Geri Qaytarma Siyasətimizə baxın.`,
  },
  {
    id: 'ip',
    title: 'Əqli mülkiyyət',
    content: `Platformadakı bütün məzmun — sual bankı, izahatlar, video materiallar, dizayn, kod — Testcentre-nin əqli mülkiyyətidir. İcazəsiz surətdə kopyalanması, paylaşılması, satışa çıxarılması qəti qadağandır.

İstifadəçilər yalnız şəxsi hazırlıq məqsədilə platformadan istifadə edə bilər.`,
  },
  {
    id: 'prohibited',
    title: 'Qadağan olunmuş istifadə',
    content: `Aşağıdakılar qəti qadağandır:

— Sınaq suallarını kopyalamaq, yaymaq, satmaq
— Başqasının adından sınaq keçmək
— Avtomatlaşdırılmış alətlər (botlar, skriptlər) ilə platforma ilə qarşılıqlı əlaqə
— Platformanın təhlükəsizliyini pozmağa cəhd etmək
— Digər istifadəçilərin hesabına müdaxilə etmək

Qadağan olunmuş istifadə aşkar edildikdə hesab dərhal bağlanır.`,
  },
  {
    id: 'liability',
    title: 'Məsuliyyətin məhdudlaşdırılması',
    content: `Testcentre platforma xidmətini "olduğu kimi" təqdim edir. Texniki nasazlıqlar, müvəqqəti mövcud olmaması, məlumat itkisi hallarında dolayı zərərlər üçün məsuliyyət daşımırıq.

Məsuliyyətimizin ümumi həddi ödəniş etdiyiniz məbləği keçmir.

Xidmətin dayandırılması halında istifadəçilərə ən azı 30 gün əvvəl e-poçt vasitəsilə xəbərdarlıq ediləcək.`,
  },
  {
    id: 'changes',
    title: 'Şərtlərin dəyişdirilməsi',
    content: `Bu şərtlər zərurət yarandıqda dəyişdirilə bilər. Əhəmiyyətli dəyişikliklər barədə e-poçt vasitəsilə məlumat veriləcək. Dəyişiklikdən sonra platformadan istifadə davam etdirilməsi yeni şərtlərin qəbulu sayılır.`,
  },
  {
    id: 'law',
    title: 'Tətbiq edilən qanun',
    content: `Bu müqavilə Azərbaycan Respublikasının qanunvericiliyinə uyğun tənzimlənir. Mübahisələr Bakı şəhərinin müvafiq məhkəmələrinin yurisdiksiyasına aiddir.`,
  },
  {
    id: 'contact',
    title: 'Əlaqə',
    content: `Hər hansı sualınız varsa: help@testcentre.online`,
  },
];

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-17">
        <div className="max-w-215 mx-auto px-8 py-24">

          <div className="flex items-center gap-3 mb-8 rise">
            <span className="dot" />
            <span className="eyebrow">Hüquqi</span>
          </div>
          <h1 className="t-display mb-4 rise rise-1">İstifadə Şərtləri</h1>
          <p className="t-lede mb-4 rise rise-2" style={{ color: 'var(--color-ink-soft)' }}>
            Son yenilənmə: 26 may 2026
          </p>
          <p className="text-[16px] leading-[1.7] mb-16 rise rise-2" style={{ color: 'var(--color-ink-soft)', maxWidth: '640px' }}>
            Bu şərtlər Testcentre platformasından istifadə qaydalarını müəyyən edir.
            Platformaya daxil olmaqla bu şərtləri qəbul etmiş sayılırsınız.
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
