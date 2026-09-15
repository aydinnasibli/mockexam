import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/shared/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Məxfilik Siyasəti',
  description: 'Testcentre-nin məxfilik siyasəti — hansı məlumatları topladığımız, necə emal etdiyimiz və hüquqlarınız.',
  path: '/legal/privacy',
});

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
    content: `Hesab məlumatları: ad, soyad, e-poçt ünvanı, profil şəkli. Bu məlumatlar qeydiyyat zamanı Clerk autentifikasiya xidməti vasitəsilə toplanır; hesabın idarə edilməsi və ödənişlərlə bağlı dəstək üçün onların surəti bizim verilənlər bazamızda da saxlanılır. Qeydiyyatdan üçüncü tərəf hesabı (məsələn, Google) ilə keçdikdə bu məlumatlar həmin xidmətdən alınır.

İstifadə məlumatları: hansı sınaqları keçdiyiniz, cavablarınız (o cümlədən yazı tapşırıqlarının mətni), hər suala sərf olunan vaxt, bölmələr üzrə nəticələriniz, həmçinin parametrlərdə qeyd etdiyiniz hədəf imtahan və tarix.

Ödəniş məlumatları: məbləğ, ödəniş statusu, tarix və əməliyyat nömrəsi. Kart rekvizitləri bizdə saxlanılmır — ödənişlər Epoint ödəniş sistemi vasitəsilə, 3D Secure protokolu ilə təhlükəsiz şəkildə emal edilir.

İmtahan sessiyası məlumatları: sessiyanın başlanğıc vaxtı, cavabların qaralaması və dinlənilmiş audio yazılarının qeydi.

Texniki məlumatlar: IP ünvanı, brauzer növü, cihaz tipi. IP ünvanı təhlükəsizlik və sui-istifadənin qarşısını almaq üçün istifadə olunur. PostHog vasitəsilə səhifə baxışları, istifadə hadisələri və texniki xətalar qeydə alınır; hesaba daxil olduqda bu məlumatlar e-poçt ünvanı olmadan, yalnız hesab identifikatorunuzla əlaqələndirilir. Cookie bildirişini bağladıqdan sonra PostHog sessiya təkrarını (session replay) da qeydə ala bilər; təkrarda daxil etdiyiniz bütün məlumatlar, həmçinin suallar, mətnlər və esselər gizlədilir, lakin səhifədə göstərilən digər məlumatlar (məsələn, hesab panelindəki adınız və e-poçt ünvanınız) görünə bilər.

Əlaqə formu: adınız, e-poçt ünvanınız, mövzu və mesajın mətni. Bu məlumatlar verilənlər bazasında saxlanılmır — Resend xidməti vasitəsilə e-poçt kimi bizə çatdırılır.`,
  },
  {
    id: 'purpose',
    title: 'Emal məqsədləri',
    content: `Fərdi məlumatlarınız aşağıdakı məqsədlər üçün emal edilir:

— Xidmətin göstərilməsi: hesabın idarə olunması, sınaqların keçirilməsi, nəticələrin saxlanması və proqresin izlənməsi.
— Yazı tapşırıqlarının qiymətləndirilməsi: esse mətninin süni intellekt vasitəsilə yoxlanılması.
— Ödənişlərin emalı: satın alma əməliyyatlarının tamamlanması və ödənişlə bağlı müraciətlərin araşdırılması.
— Təhlükəsizlik: sui-istifadənin, bot fəaliyyətinin və icazəsiz girişin qarşısının alınması.
— Texniki dəstək və inkişaf: xətaların aşkar edilməsi və platformadan istifadə statistikası.
— Kommunikasiya: hesabınız və müraciətlərinizlə bağlı cavablar və vacib bildirişlər.

Fərdi məlumatlarınız satılmır və reklam məqsədi ilə üçüncü şəxslərə verilmir.`,
  },
  {
    id: 'legal-basis',
    title: 'Emalın hüquqi əsası',
    content: `"Fərdi məlumatlar haqqında" Qanunun 9-cu maddəsinə uyğun olaraq fərdi məlumatlarınız aşağıdakı hüquqi əsaslarla emal edilir:

— Müqavilənin icrası: hesabın yaradılması, sınaqların keçirilməsi, yazı tapşırıqlarının qiymətləndirilməsi, nəticələrin saxlanması və ödəniş əməliyyatları Sizinlə bağlanan xidmət müqaviləsinin icrasına əsaslanır.
— Qanuni maraq: platformanın təhlükəsizliyi, sui-istifadənin qarşısının alınması, texniki xətaların izlənməsi və psevdonim istifadə statistikası (PostHog) qanuni maraqlar əsasında həyata keçirilir.
— Hüquqi öhdəlik: ödəniş qeydlərinin vergi və mühasibat qanunvericiliyinə uyğun saxlanılması.
— Razılıq: marketinq bildirişləri yalnız ayrıca razılığınız olduqda göndərilir.`,
  },
  {
    id: 'third-parties',
    title: 'Alt-emalçılar',
    content: `Xidmətin göstərilməsi üçün aşağıdakı alt-emalçılardan istifadə edilir:

Clerk, Inc. — istifadəçi autentifikasiyası və hesab idarəsi.
Cloudflare, Inc. — qeydiyyat və giriş zamanı bot fəaliyyətinə qarşı yoxlama (Clerk vasitəsilə).
Epoint ("Global Innovations" MMC) — kart ödənişlərinin qəbulu və emalı.
Neon, LLC (Databricks) — verilənlər bazasının yerləşdirilməsi. Verilənlər bazası Avropa İttifaqında (Almaniya, Frankfurt) yerləşir.
Vercel, Inc. — tətbiqin yerləşdirilməsi, məzmun çatdırılması şəbəkəsi (CDN) və sınaq materiallarının (audio, şəkil) saxlanması.
OpenAI, L.L.C. — yazı (writing) tapşırıqlarının süni intellekt əsaslı qiymətləndirilməsi. OpenAI-yə yalnız tapşırığın mətni, qiymətləndirmə meyarları və yazdığınız cavab göndərilir — adınız, e-poçt ünvanınız və ya hesab identifikatorunuz göndərilmir. Bu mətn OpenAI tərəfindən model təliminə istifadə edilmir.
PostHog, Inc. — məhsul analitikası, texniki xəta izlənməsi və sessiya təkrarları. Məlumatlar Avropa İttifaqı (EU) regionunda saxlanılır.
Upstash, Inc. — sorğu tezliyinin məhdudlaşdırılması (rate limiting) üçün IP ünvanı və ya hesab identifikatoru ilə bağlı qısamüddətli texniki sayğacların saxlanması.
Resend, Inc. — əlaqə formu vasitəsilə göndərdiyiniz mesajların e-poçt kimi bizə çatdırılması.

Hər bir alt-emalçı öz fəaliyyəti çərçivəsində fərdi məlumatların mühafizəsinə dair müqavilə öhdəlikləri daşıyır.`,
  },
  {
    id: 'transfers',
    title: 'Beynəlxalq məlumat ötürülməsi',
    content: `Alt-emalçılarımız Azərbaycan Respublikasının hüdudlarından kənarda yerləşir. Verilənlər bazası (Neon) və PostHog məlumatları Avropa İttifaqında (Almaniya) saxlayır. Clerk, Cloudflare, Vercel, OpenAI, Upstash və Resend ABŞ şirkətləridir və məlumatları ABŞ-da və ya digər ölkələrdəki serverlərdə emal edə bilər. Fərdi məlumatlarınız həmin şirkətlərin serverlərinə ötürülür və orada saxlanılır.

Ödəniş əməliyyatları isə Azərbaycan Respublikası ərazisində fəaliyyət göstərən Epoint vasitəsilə yerli olaraq emal olunur və sərhədaşırı ötürülməyə məruz qalmır.

Ötürülmə zamanı hər bir alt-emalçının öz məxfilik siyasəti və müştəri məlumatlarının mühafizəsinə dair müqavilə öhdəlikləri tətbiq edilir.

Beynəlxalq ötürülmə ilə bağlı suallarınız üçün: testcentreaz@proton.me`,
  },
  {
    id: 'retention',
    title: 'Saxlanma müddətləri',
    content: `Hesab və təhsil məlumatları (profil, sınaq nəticələri, cavablar, parametrlər): hesab aktiv olduğu müddətdə.
İmtahan sessiyası məlumatları: 7 (yeddi) gün — müddətin sonunda avtomatik silinir.
Dinlənilmiş audio qeydləri: 24 (iyirmi dörd) saat — müddətin sonunda avtomatik silinir.
Ödəniş qeydləri: vergi və mühasibat qanunvericiliyinə uyğun olaraq 5 (beş) il saxlanılır.
Sorğu tezliyi sayğacları: bir neçə dəqiqə.
Əlaqə formu mesajları: müraciətin cavablandırılması və sonrakı yazışma üçün lazım olan müddətdə.

Hesabınız silindikdə sınaq nəticələriniz, cavablarınız, imtahan sessiyalarınız və parametrləriniz dərhal silinir; bizim verilənlər bazamızdakı ad, e-poçt və profil şəkli də təmizlənir. Ödəniş qeydləri qanunla tələb olunan müddət ərzində ad və e-poçt ünvanı olmadan saxlanılır. Ehtiyat nüsxələrdən silinmə 30 (otuz) gün ərzində tamamlanır. Clerk hesab məlumatlarını öz siyasətinə uyğun silir; PostHog-dakı psevdonim analitika məlumatlarının silinməsini ayrıca tələb edə bilərsiniz.

Hesabınızı silmək üçün testcentreaz@proton.me ünvanına müraciət edin.`,
  },
  {
    id: 'security',
    title: 'Məlumatların mühafizəsi',
    content: `"Fərdi məlumatlar haqqında" Qanunun 18-ci maddəsinə uyğun olaraq aşağıdakı texniki və təşkilati tədbirlər həyata keçirilir:

— Bütün məlumat ötürülmələri TLS/HTTPS protokolu vasitəsilə şifrələnir.
— Verilənlər bazası Neon infrastrukturunda saxlanılır və disk səviyyəsində şifrələnir.
— İstifadəçi autentifikasiyası Clerk tərəfindən idarə edilir; istifadəçi şifrələri bizim sistemlərimizdə saxlanılmır.
— Kart rekvizitləri yalnız Epoint tərəfindən emal edilir və bizim sistemlərimizə daxil olmur.
— Analitika hadisələrinə və xəta hesabatlarına e-poçt ünvanı göndərilmir; sessiya təkrarlarında daxil etdiyiniz bütün məlumatlar və imtahan məzmunu gizlədilir.
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
    content: `Platforma zəruri (autentifikasiya, təhlükəsizlik) və analitik cookie fayllarından, həmçinin brauzerin lokal yaddaşından istifadə edir. Ətraflı məlumat üçün Cookie Siyasətimizə baxın.`,
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
        <div className="shell-prose py-24">

          <div className="flex items-center gap-3 mb-8 rise">
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute">Hüquqi</span>
          </div>
          <h1 className="font-display font-normal text-4xl md:text-6xl lg:text-7xl leading-none tracking-tight text-ink mb-4 rise rise-1">Məxfilik Siyasəti</h1>
          <p className="font-display font-normal text-xl md:text-2xl leading-normal text-ink-soft mb-4 rise rise-2">
            Son yenilənmə: 15 sentyabr 2026
          </p>
          <p className="mb-16 max-w-160 text-base leading-[1.7] text-ink-soft rise rise-2">
            Bu siyasət hansı fərdi məlumatları topladığımızı, nə məqsədlə emal etdiyimizi və məlumat subyekti kimi
            hansı hüquqlara malik olduğunuzu izah edir. Platformadan istifadə etməklə bu siyasəti qəbul etmiş sayılırsınız.
          </p>

          <div className="flex flex-col gap-12">
            {sections.map((s, i) => (
              <div key={s.id} id={s.id} className="border-t border-rule pt-10">
                <div className="flex items-baseline gap-5 mb-4">
                  <span className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase min-w-8 tabular-nums text-ink-mute">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 className="font-display font-medium text-xl leading-tight tracking-tight text-ink">{s.title}</h2>
                </div>
                <div className="pl-13">
                  {s.content.split('\n\n').map((para, j) => (
                    <p
                      key={j}
                      className="mb-4 text-base leading-[1.75] whitespace-pre-line text-ink-soft last:mb-0"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
    </>
  );
}
