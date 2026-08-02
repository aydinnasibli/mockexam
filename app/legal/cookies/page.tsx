import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Cookie Siyasəti',
  description: 'Testcentre-nin cookie qaydaları — hansı cookie fayllarından istifadə edilir və nə üçün.',
  alternates: { canonical: '/legal/cookies' },
};

export default function CookiesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-18">
        <div className="max-w-215 mx-auto px-8 py-24">

          <div className="flex items-center gap-3 mb-8 rise">
            <span className="dot" />
            <span className="eyebrow">Hüquqi</span>
          </div>
          <h1 className="t-display mb-4 rise rise-1">Cookie Siyasəti</h1>
          <p className="t-lede mb-4 rise rise-2" style={{ color: 'var(--color-ink-soft)' }}>
            Son yenilənmə: 26 may 2026
          </p>
          <p className="text-[16px] leading-[1.7] mb-16 rise rise-2" style={{ color: 'var(--color-ink-soft)', maxWidth: '640px' }}>
            Bu siyasət platformanın cookie fayllarından necə istifadə etdiyini izah edir.
          </p>

          <div className="flex flex-col gap-12">

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow tabular-nums" style={{ color: 'var(--color-ink-mute)', minWidth: '2rem' }}>01</span>
                <h2 className="t-title">Cookie nədir?</h2>
              </div>
              <div className="pl-13">
                <p className="text-[15px] leading-[1.75]" style={{ color: 'var(--color-ink-soft)' }}>
                  Cookie — brauzerin cihazınızda saxladığı kiçik mətn faylıdır. Növbəti ziyarətinizdə
                  sizin kim olduğunuzu tanımağa, oturum vəziyyətinizi qorumağa kömək edir.
                </p>
              </div>
            </div>

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow tabular-nums" style={{ color: 'var(--color-ink-mute)', minWidth: '2rem' }}>02</span>
                <h2 className="t-title">İstifadə etdiyimiz cookie-lər</h2>
              </div>
              <div className="pl-13 flex flex-col gap-6">
                <div className="card-new" style={{ padding: '20px 24px' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                      style={{ background: 'var(--color-accent-soft)', color: 'var(--color-ink)' }}
                    >
                      Zəruri
                    </span>
                    <span className="text-[14px] font-medium text-ink">Autentifikasiya cookie-ləri</span>
                  </div>
                  <p className="text-[14px] leading-[1.7]" style={{ color: 'var(--color-ink-soft)' }}>
                    Clerk autentifikasiya xidməti tərəfindən yerləşdirilir. Hesabınıza daxil olduğunuzu yadda saxlayır
                    və sessiya boyunca girişinizi qoruyur. Bu cookie-lər olmadan platforma işləmir — deaktiv edilə bilmir.
                  </p>
                  <p className="text-[13px] mt-3" style={{ color: 'var(--color-ink-mute)' }}>
                    Müddət: sessiya müddəti və ya çıxış edənə qədər.
                  </p>
                </div>

                <div
                  className="card-new"
                  style={{ padding: '20px 24px', opacity: 0.6 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                      style={{ background: 'var(--color-surface-3)', color: 'var(--color-ink-soft)' }}
                    >
                      Yoxdur
                    </span>
                    <span className="text-[14px] font-medium" style={{ color: 'var(--color-ink-soft)' }}>
                      Analitik / reklam cookie-ləri
                    </span>
                  </div>
                  <p className="text-[14px] leading-[1.7]" style={{ color: 'var(--color-ink-mute)' }}>
                    Platformada Google Analytics, Meta Pixel, reklam izləmə və ya istifadəçi davranışını
                    üçüncü tərəflərlə paylaşan heç bir cookie mövcud deyil.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow tabular-nums" style={{ color: 'var(--color-ink-mute)', minWidth: '2rem' }}>03</span>
                <h2 className="t-title">Cookie-ləri idarə etmək</h2>
              </div>
              <div className="pl-13">
                <p className="text-[15px] leading-[1.75] mb-4" style={{ color: 'var(--color-ink-soft)' }}>
                  Brauzerin parametrlərindən cookie-ləri bloklaya bilərsiniz. Lakin autentifikasiya
                  cookie-ləri bloklandıqda hesabınıza daxil olmaq mümkün olmayacaq.
                </p>
                <p className="text-[15px] leading-[1.75]" style={{ color: 'var(--color-ink-soft)' }}>
                  Əksər brauzerlərdə cookie idarəsi üçün: <strong>Parametrlər → Məxfilik → Cookie-lər</strong> bölməsinə baxın.
                </p>
              </div>
            </div>

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow tabular-nums" style={{ color: 'var(--color-ink-mute)', minWidth: '2rem' }}>04</span>
                <h2 className="t-title">Üçüncü tərəf cookie-ləri</h2>
              </div>
              <div className="pl-13">
                <p className="text-[15px] leading-[1.75]" style={{ color: 'var(--color-ink-soft)' }}>
                  Ödəniş prosesi zamanı Epoint-in təhlükəsiz ödəniş səhifəsi 3D Secure autentifikasiyası üçün öz texniki cookie-lərini yerləşdirə bilər.
                  Bu cookie-lər Epoint-in məxfilik siyasəti çərçivəsindədir və bizim nəzarətimizdən kənardır.
                </p>
              </div>
            </div>

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow tabular-nums" style={{ color: 'var(--color-ink-mute)', minWidth: '2rem' }}>05</span>
                <h2 className="t-title">Lokal yaddaş (localStorage / sessionStorage)</h2>
              </div>
              <div className="pl-13">
                <p className="text-[15px] leading-[1.75] mb-4" style={{ color: 'var(--color-ink-soft)' }}>
                  Cookie-lərlə yanaşı, platforma brauzer lokal yaddaşından da istifadə edir:
                </p>
                <p className="text-[15px] leading-[1.75] mb-4" style={{ color: 'var(--color-ink-soft)' }}>
                  <strong style={{ color: 'var(--color-ink)' }}>sessionStorage</strong> — aktiv imtahan sessiyasının vəziyyəti (cari sual, vaxt qalığı). Brauzer nişanı bağlandıqda avtomatik silinir.
                </p>
                <p className="text-[15px] leading-[1.75]" style={{ color: 'var(--color-ink-soft)' }}>
                  <strong style={{ color: 'var(--color-ink)' }}>localStorage və cookie</strong> — PostHog analitika və xəta izləyicisi anonim cihaz identifikatorunu saxlayır. Texniki xətaların diaqnostikası və istifadə statistikası üçün PostHog həmçinin sessiyaların maskalanmış təkrarını (session replay — bütün görünən mətn gizlədilir, reklam və ya profilləşdirmə üçün istifadə edilmir) qeydə alıb Avropa İttifaqındakı serverlərinə göndərə bilər. Brauzerinizdə “Do Not Track” aktivdirsə, bu izləmə tamamilə söndürülür.
                </p>
              </div>
            </div>

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow tabular-nums" style={{ color: 'var(--color-ink-mute)', minWidth: '2rem' }}>06</span>
                <h2 className="t-title">Əlaqə</h2>
              </div>
              <div className="pl-13">
                <p className="text-[15px] leading-[1.75]" style={{ color: 'var(--color-ink-soft)' }}>
                  Cookie qaydaları ilə bağlı suallarınız üçün: testcentreaz@proton.me
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
