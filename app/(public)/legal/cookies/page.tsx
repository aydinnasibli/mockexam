import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Cookie Siyasəti',
  description: 'Testcentre-nin cookie qaydaları — hansı cookie fayllarından istifadə edilir və nə üçün.',
  path: '/legal/cookies',
});

export default function CookiesPage() {
  return (
    <>
        <div className="shell-prose py-24">

          <div className="flex items-center gap-3 mb-8 rise">
            <span className="dot" />
            <span className="eyebrow">Hüquqi</span>
          </div>
          <h1 className="font-display font-normal text-4xl md:text-6xl lg:text-7xl leading-none tracking-tight text-ink mb-4 rise rise-1">Cookie Siyasəti</h1>
          <p className="font-display font-normal text-xl md:text-2xl leading-normal text-ink-soft mb-4 rise rise-2">
            Son yenilənmə: 26 may 2026
          </p>
          <p className="mb-16 max-w-160 text-base leading-[1.7] text-ink-soft rise rise-2">
            Bu siyasət platformanın cookie fayllarından necə istifadə etdiyini izah edir.
          </p>

          <div className="flex flex-col gap-12">

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow min-w-8 tabular-nums text-ink-mute">01</span>
                <h2 className="font-display font-medium text-xl leading-tight tracking-tight text-ink">Cookie nədir?</h2>
              </div>
              <div className="pl-13">
                <p className="text-base leading-[1.75]">
                  Cookie — brauzerin cihazınızda saxladığı kiçik mətn faylıdır. Növbəti ziyarətinizdə
                  sizin kim olduğunuzu tanımağa, oturum vəziyyətinizi qorumağa kömək edir.
                </p>
              </div>
            </div>

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow min-w-8 tabular-nums text-ink-mute">02</span>
                <h2 className="font-display font-medium text-xl leading-tight tracking-tight text-ink">İstifadə etdiyimiz cookie-lər</h2>
              </div>
              <div className="pl-13 flex flex-col gap-6">
                <div className="card-new px-6 py-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="rounded bg-accent-soft px-2 py-0.5 text-xs font-semibold tracking-wide uppercase text-ink"
                    >
                      Zəruri
                    </span>
                    <span className="text-sm font-medium text-ink">Autentifikasiya cookie-ləri</span>
                  </div>
                  <p className="text-sm leading-[1.7]">
                    Clerk autentifikasiya xidməti tərəfindən yerləşdirilir. Hesabınıza daxil olduğunuzu yadda saxlayır
                    və sessiya boyunca girişinizi qoruyur. Bu cookie-lər olmadan platforma işləmir — deaktiv edilə bilmir.
                  </p>
                  <p className="mt-3 text-sm text-ink-mute">
                    Müddət: sessiya müddəti və ya çıxış edənə qədər.
                  </p>
                </div>

                <div className="card-new px-6 py-5 opacity-60">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="rounded bg-surface-3 px-2 py-0.5 text-xs font-semibold tracking-wide uppercase text-ink-soft"
                    >
                      Yoxdur
                    </span>
                    <span className="text-sm font-medium">
                      Analitik / reklam cookie-ləri
                    </span>
                  </div>
                  <p className="text-sm leading-[1.7] text-ink-mute">
                    Platformada Google Analytics, Meta Pixel, reklam izləmə və ya istifadəçi davranışını
                    üçüncü tərəflərlə paylaşan heç bir cookie mövcud deyil.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow min-w-8 tabular-nums text-ink-mute">03</span>
                <h2 className="font-display font-medium text-xl leading-tight tracking-tight text-ink">Cookie-ləri idarə etmək</h2>
              </div>
              <div className="pl-13">
                <p className="text-base leading-[1.75] mb-4">
                  Brauzerin parametrlərindən cookie-ləri bloklaya bilərsiniz. Lakin autentifikasiya
                  cookie-ləri bloklandıqda hesabınıza daxil olmaq mümkün olmayacaq.
                </p>
                <p className="text-base leading-[1.75]">
                  Əksər brauzerlərdə cookie idarəsi üçün: <strong>Parametrlər → Məxfilik → Cookie-lər</strong> bölməsinə baxın.
                </p>
              </div>
            </div>

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow min-w-8 tabular-nums text-ink-mute">04</span>
                <h2 className="font-display font-medium text-xl leading-tight tracking-tight text-ink">Üçüncü tərəf cookie-ləri</h2>
              </div>
              <div className="pl-13">
                <p className="text-base leading-[1.75]">
                  Ödəniş prosesi zamanı Epoint-in təhlükəsiz ödəniş səhifəsi 3D Secure autentifikasiyası üçün öz texniki cookie-lərini yerləşdirə bilər.
                  Bu cookie-lər Epoint-in məxfilik siyasəti çərçivəsindədir və bizim nəzarətimizdən kənardır.
                </p>
              </div>
            </div>

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow min-w-8 tabular-nums text-ink-mute">05</span>
                <h2 className="font-display font-medium text-xl leading-tight tracking-tight text-ink">Lokal yaddaş (localStorage / sessionStorage)</h2>
              </div>
              <div className="pl-13">
                <p className="text-base leading-[1.75] mb-4">
                  Cookie-lərlə yanaşı, platforma brauzer lokal yaddaşından da istifadə edir:
                </p>
                <p className="text-base leading-[1.75] mb-4">
                  <strong className="text-ink">sessionStorage</strong> — aktiv imtahan sessiyasının vəziyyəti (cari sual, vaxt qalığı). Brauzer nişanı bağlandıqda avtomatik silinir.
                </p>
                <p className="text-base leading-[1.75]">
                  <strong className="text-ink">localStorage və cookie</strong> — PostHog analitika və xəta izləyicisi anonim cihaz identifikatorunu saxlayır. Texniki xətaların diaqnostikası və istifadə statistikası üçün PostHog həmçinin sessiyaların maskalanmış təkrarını (session replay — bütün görünən mətn gizlədilir, reklam və ya profilləşdirmə üçün istifadə edilmir) qeydə alıb Avropa İttifaqındakı serverlərinə göndərə bilər. Brauzerinizdə “Do Not Track” aktivdirsə, bu izləmə tamamilə söndürülür.
                </p>
              </div>
            </div>

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow min-w-8 tabular-nums text-ink-mute">06</span>
                <h2 className="font-display font-medium text-xl leading-tight tracking-tight text-ink">Əlaqə</h2>
              </div>
              <div className="pl-13">
                <p className="text-base leading-[1.75]">
                  Cookie qaydaları ilə bağlı suallarınız üçün: testcentreaz@proton.me
                </p>
              </div>
            </div>

          </div>
        </div>
    </>
  );
}
