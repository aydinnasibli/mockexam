import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'İstifadə Şərtləri',
  description: 'Testcentre platformasından istifadə qaydaları və şərtlər.',
  alternates: { canonical: '/legal/terms' },
};

const sections = [
  {
    id: 'acceptance',
    title: 'Şərtlərin qəbulu',
    content: `Testcentre platformasına daxil olmaq və ya ondan istifadə etməklə bu İstifadə Şərtlərini tam həcmdə qəbul etmiş sayılırsınız. Şərtləri qəbul etmirsinizsə, platformadan istifadə etməyin.

Bu şərtlər Azərbaycan Respublikasının Mülki Məcəlləsinə, "İstehlakçıların hüquqlarının müdafiəsi haqqında" Qanuna və "Elektron ticarət haqqında" Qanuna uyğun olaraq hazırlanmışdır. Tərəflər: Aydin Vaqif oğlu Nasibli, fiziki şəxs (VÖEN: 1309635092) — bundan sonra "Testcentre" — və Siz — bundan sonra "İstifadəçi".`,
  },
  {
    id: 'service',
    title: 'Xidmətin təsviri',
    content: `Testcentre SAT, IELTS, TOEFL, DİM, GMAT, GRE imtahanlarına hazırlıq üçün rəqəmsal test platformasıdır. Xidmətlər arasında:

— Adaptiv test sessiyaları
— Süni intellekt əsaslı analitika
— Nəticə hesabatları
— Sual izahatları

Xidmətlərin fasiləsiz mövcudluğuna zəmanət verilmir; texniki baxım işləri zamanı müvəqqəti dayanmalar mümkündür.`,
  },
  {
    id: 'eligibility',
    title: 'Əhliyyət tələbi',
    content: `Platformadan istifadə etmək üçün ən az 13 (on üç) yaşında olmaq tələb olunur. 13–18 yaş arasındakı şəxslər platformadan yalnız valideyn və ya qanuni qəyyumun razılığı əsasında istifadə edə bilər. Qeydiyyatdan keçməklə bu tələblərə cavab verdiyinizi təsdiqləmiş sayılırsınız.`,
  },
  {
    id: 'account',
    title: 'Hesab',
    content: `Qeydiyyat zamanı düzgün, tam və aktual məlumat verməlisiniz. Hesabın məxfiliyinin və təhlükəsizliyinin qorunmasına görə məsuliyyət İstifadəçiyə aiddir.

Bir şəxs yalnız bir hesab aça bilər. Hesabı başqa şəxsə vermək, satmaq, icarəyə vermək və ya ötürmək qadağandır.

Hesabınızı silmək istədikdə testcentreaz@proton.me ünvanına müraciət edin. Silinmədən əvvəl aktiv imtahan girişlərindən istifadə etməyi tövsiyə edirik.`,
  },
  {
    id: 'payments',
    title: 'Ödəniş şərtləri',
    content: `Ödənişli xidmətlər Epoint ödəniş sistemi vasitəsilə, 3D Secure protokolu ilə təhlükəsiz şəkildə emal edilir. Xidmətin satıcısı və qanuni təchizatçısı Məxfilik Siyasətinin "Məlumat nəzarətçisi" bölməsində göstərilən şəxsdir; vergi və ƏDV öhdəlikləri Azərbaycan Respublikasının qanunvericiliyinə uyğun olaraq həyata keçirilir.

Qiymətlər platformada göstərildiyi kimi tətbiq edilir. Gizli ödəniş, avtomatik yenilənən abunəlik və ya tələ xarakterli qiymətləndirmə yoxdur — hər alış ayrıca və könüllüdür.

Uğurlu ödənişdən dərhal sonra müvafiq imtahana giriş açılır.`,
  },
  {
    id: 'digital-content',
    title: 'Rəqəmsal xidmətin çatdırılması',
    content: `Ödəniş tamamlandığı anda rəqəmsal xidmət (imtahana giriş) dərhal başlayır. Satın alma əməliyyatını tamamlamaqla İstifadəçi xidmətin dərhal icrasına açıq razılıq verir.

"İstehlakçıların hüquqlarının müdafiəsi haqqında" Qanunun müvafiq müddəaları çərçivəsində — İstifadəçi xidmətin dərhal icrasına razılıq verdiyi üçün — ümumi qaydada nəzərdə tutulan imtina müddəti tətbiq edilmir.

Satın almadan əvvəl platformanı tanımaq üçün sınaq səhifəsindəki nümunə materiallarından istifadə edə bilərsiniz.`,
  },
  {
    id: 'refund',
    title: 'Geri qaytarma',
    content: `Geri qaytarma şərtləri üçün Geri Qaytarma Siyasətimizə baxın.`,
  },
  {
    id: 'ip',
    title: 'Əqli mülkiyyət',
    content: `Platformadakı bütün məzmun — sual bankı, izahatlar, audio materiallar, dizayn, proqram kodu — "Əqli mülkiyyət haqqında" Azərbaycan Respublikasının Qanunu ilə mühafizə olunan Testcentre-nin əqli mülkiyyətidir.

İstifadəçilər yalnız şəxsi hazırlıq məqsədi ilə platformadan istifadə edə bilər. Hər hansı məzmunun icazəsiz surətdə çoxaldılması, paylaşılması və ya satışa çıxarılması qanuna ziddir.`,
  },
  {
    id: 'prohibited',
    title: 'Qadağan olunmuş istifadə',
    content: `Aşağıdakılar qəti qadağandır:

— Sınaq suallarını kopyalamaq, yaymaq və ya satmaq.
— Başqasının adından sınaq keçmək.
— Avtomatlaşdırılmış alətlər (bot, skript, veb-kraulator) vasitəsilə platforma ilə əlaqə yaratmaq.
— Platformanın texniki mühafizəsini pozmağa cəhd etmək.
— Başqa istifadəçilərin hesablarına icazəsiz daxil olmaq.

Qadağan olunmuş istifadə aşkar edildikdə hesab xəbərdarlıq olmadan bağlanır.`,
  },
  {
    id: 'termination',
    title: 'Müqavilənin xitamı',
    content: `Testcentre aşağıdakı hallarda xidməti dayandıra və ya hesabı bağlaya bilər:

— Bu şərtlərin ciddi və ya sistemli şəkildə pozulması.
— Qadağan olunmuş istifadənin aşkar edilməsi.
— Fırıldaqçılıq şübhəsinin yaranması.

İstifadəçilər istənilən vaxt testcentreaz@proton.me ünvanına müraciət edərək hesablarını silə bilər. Müqavilənin xitamından sonra fərdi məlumatlar Məxfilik Siyasətinin "Saxlanma müddətləri" bəndinə uyğun emal edilir.

Xidmətin tamamilə dayandırılması halında istifadəçilərə ən azı 30 (otuz) gün əvvəl e-poçt bildirişi göndəriləcək.`,
  },
  {
    id: 'liability',
    title: 'Məsuliyyətin məhdudlaşdırılması',
    content: `Testcentre platforma xidmətlərini "olduğu kimi" (as-is) təqdim edir. Texniki nasazlıqlar, xidmətin müvəqqəti mövcud olmaması və məlumat itkisi hallarında dolayı zərərlər üçün məsuliyyət daşınmır.

Testcentre-nin hər hansı iddia üzrə məsuliyyətinin ümumi həddi İstifadəçinin ödədiyi məbləği keçmir.`,
  },
  {
    id: 'disclaimer',
    title: 'Zəmanətsizlik',
    content: `Platforma xidmətləri "olduğu kimi" və "mövcud olduğu kimi" (as-is, as-available) əsasda göstərilir. Xidmətin hər hansı xüsusi məqsədə uyğunluğuna, fasiləsiz və xətasız işləməsinə dair açıq və ya nəzərdə tutulan heç bir zəmanət verilmir.

Testcentre imtahan nəticəsinin konkret hədəfə çatacağına zəmanət vermir. Platforma hazırlıq alətlərini təqdim edir; real imtahan nəticəsi bir çox müstəqil amillərdən asılıdır.`,
  },
  {
    id: 'force-majeure',
    title: 'Fors-major',
    content: `Testcentre-nin ağlabatan nəzarəti xaricindəki hadisələr — internet infrastrukturunun dayanması, elektrik kəsilməsi, təbii fəlakətlər, hökumət aktları, kiber hücumlar, üçüncü tərəf xidmətlərinin (Clerk, Vercel, MongoDB Atlas) nasazlıqları — nəticəsindən yaranan gecikmələr və ya xidmətin mövcud olmaması üçün məsuliyyət daşınmır.`,
  },
  {
    id: 'general',
    title: 'Ümumi müddəalar',
    content: `Müddəaların ayrılıqlığı: Bu şərtlərin hər hansı müddəası tətbiq edilən qanunvericiliyə görə qüvvəsiz hesab edildikdə, yalnız həmin müddəa şərtlərdən ayrılır; qalan müddəalar tam qüvvədə qalır.

Tam müqavilə: Bu İstifadə Şərtləri, Məxfilik Siyasəti, Cookie Siyasəti və Geri Qaytarma Siyasəti birlikdə tərəflər arasındakı tam müqaviləni təşkil edir.

Hüquqdan imtinasızlıq: Testcentre-nin hər hansı hüququ bir dəfə tətbiq etməməsi həmin hüquqdan daimi imtina sayılmır.`,
  },
  {
    id: 'changes',
    title: 'Şərtlərin dəyişdirilməsi',
    content: `Bu şərtlər zərurət yarandıqda dəyişdirilə bilər. Məzmun baxımından əhəmiyyətli dəyişikliklər barədə qeydiyyatda olan e-poçt ünvanınıza bildiriş göndəriləcək. Dəyişiklikdən sonra platformadan istifadəyə davam etmək yeni şərtlərin qəbulu sayılır.`,
  },
  {
    id: 'law',
    title: 'Tətbiq edilən hüquq və mübahisələrin həlli',
    content: `Bu müqavilə Azərbaycan Respublikasının qanunvericiliyi — xüsusilə Mülki Məcəllə, "İstehlakçıların hüquqlarının müdafiəsi haqqında" Qanun və "Elektron ticarət haqqında" Qanun — ilə tənzimlənir.

Mübahisələr ilk növbədə danışıqlar yolu ilə həll edilir. Razılığa gəlinmədikdə iş Bakı şəhəri üzrə aidiyyəti məhkəməyə verilir.`,
  },
  {
    id: 'contact',
    title: 'Əlaqə',
    content: `Hər hansı sualınız üçün: testcentreaz@proton.me`,
  },
];

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-18">
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
