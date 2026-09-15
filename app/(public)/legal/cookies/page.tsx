import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/shared/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Cookie Siyasəti',
  description: 'Testcentre-nin cookie və lokal yaddaş qaydaları — nə saxlanılır, nə üçün və nə qədər müddətə.',
  path: '/legal/cookies',
});

type Kind = 'necessary' | 'analytics' | 'none';

const BADGE: Record<Kind, { label: string; className: string }> = {
  necessary: { label: 'Zəruri', className: 'bg-accent-soft text-ink' },
  analytics: { label: 'Analitika', className: 'bg-surface-3 text-ink' },
  none: { label: 'Yoxdur', className: 'bg-surface-3 text-ink-soft' },
};

interface CookieEntry {
  kind: Kind;
  title: string;
  names?: string;
  description: string;
  duration?: string;
}

/*
 * Keep in step with the code that sets these: Clerk (auth), Cloudflare Turnstile
 * behind Clerk's bot protection, and PostHog as configured in
 * instrumentation-client.ts (`persistence: 'localStorage+cookie'`).
 */
const COOKIES: CookieEntry[] = [
  {
    kind: 'necessary',
    title: 'Autentifikasiya (Clerk)',
    names: '__session, __client_uat, __client',
    description:
      'Clerk autentifikasiya xidməti tərəfindən yerləşdirilir. Hesabınıza daxil olduğunuzu yadda saxlayır və hər sorğuda girişinizi təsdiqləyir. Bu cookie-lər olmadan hesaba daxil olmaq mümkün deyil, ona görə deaktiv edilə bilmir.',
    duration: '__session — 60 saniyə, avtomatik yenilənir; __client və __client_uat — hesabdan çıxana və ya sessiya bitənə qədər.',
  },
  {
    kind: 'necessary',
    title: 'Bot qorunması (Cloudflare)',
    names: '__cf_bm, _cfuvid',
    description:
      'Qeydiyyat və giriş zamanı Clerk-in istifadə etdiyi Cloudflare xidməti avtomatlaşdırılmış hücumları ayırd etmək üçün texniki cookie-lər yerləşdirə bilər.',
    duration: 'Qısamüddətli — brauzer sessiyası və ya 30 dəqiqə.',
  },
  {
    kind: 'analytics',
    title: 'Analitika və xəta izlənməsi (PostHog)',
    names: 'ph_<layihə açarı>_posthog',
    description:
      'Cihazınız üçün təsadüfi identifikator saxlayır ki, səhifə baxışları, istifadə hadisələri və texniki xətalar düzgün qruplaşdırılsın. Hesaba daxil olduqda bu identifikator e-poçt ünvanı olmadan, yalnız hesab identifikatorunuzla əlaqələndirilir. Cookie bildirişini bağladıqdan sonra sessiya təkrarı (session replay) da qeydə alına bilər; təkrarda daxil etdiyiniz bütün məlumatlar və imtahan məzmunu (suallar, mətnlər, esselər) gizlədilir, səhifədə göstərilən digər məlumatlar isə görünə bilər. Məlumatlar Avropa İttifaqındakı serverlərdə saxlanılır və reklam üçün istifadə edilmir.',
    duration: '365 gün.',
  },
  {
    kind: 'none',
    title: 'Reklam və marketinq cookie-ləri',
    description:
      'Platformada Google Analytics, Meta Pixel, reklam izləmə və ya məlumatları reklam şəbəkələri ilə paylaşan heç bir cookie yoxdur.',
  },
];

const LOCAL_STORAGE: { name: string; description: string; duration: string }[] = [
  {
    name: 'İmtahan qaralaması',
    description:
      'Aktiv imtahanda cavablarınızı, işarələdiyiniz sualları, cari sualı və mətn üzərindəki qeydlərinizi (highlight) saxlayır ki, səhifə yenilənsə və ya brauzer bağlansa işiniz itməsin. Cavablar imtahan zamanı serverdə də saxlanılır; mətn qeydləri isə yalnız bu brauzerdə qalır.',
    duration: 'İmtahan təqdim edildikdə və ya yenidən başladıldıqda silinir.',
  },
  {
    name: 'tc-cookie-notice',
    description: 'Cookie bildirişini nə vaxt bağladığınızı yadda saxlayır.',
    duration: '7 gün, sonra bildiriş yenidən göstərilir.',
  },
  {
    name: 'ph_<layihə açarı>_posthog',
    description: 'Yuxarıda təsvir olunan PostHog identifikatorunun surəti.',
    duration: 'Brauzer məlumatları silinənə qədər.',
  },
];

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="border-t border-rule pt-10">
      <div className="flex items-baseline gap-5 mb-4">
        <span className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase min-w-8 tabular-nums text-ink-mute">
          {String(n).padStart(2, '0')}
        </span>
        <h2 className="font-display font-medium text-xl leading-tight tracking-tight text-ink">{title}</h2>
      </div>
      <div className="pl-13">{children}</div>
    </div>
  );
}

export default function CookiesPage() {
  return (
    <>
        <div className="shell-prose py-24">

          <div className="flex items-center gap-3 mb-8 rise">
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute">Hüquqi</span>
          </div>
          <h1 className="font-display font-normal text-4xl md:text-6xl lg:text-7xl leading-none tracking-tight text-ink mb-4 rise rise-1">Cookie Siyasəti</h1>
          <p className="font-display font-normal text-xl md:text-2xl leading-normal text-ink-soft mb-4 rise rise-2">
            Son yenilənmə: 15 sentyabr 2026
          </p>
          <p className="mb-16 max-w-160 text-base leading-[1.7] text-ink-soft rise rise-2">
            Bu siyasət platformanın cookie fayllarından və brauzerin lokal yaddaşından necə istifadə etdiyini,
            nə saxlandığını və nə qədər müddətə saxlandığını izah edir.
          </p>

          <div className="flex flex-col gap-12">

            <Section n={1} title="Cookie və lokal yaddaş nədir?">
              <p className="text-base leading-[1.75]">
                Cookie — brauzerin cihazınızda saxladığı kiçik mətn faylıdır. Lokal yaddaş (localStorage) isə
                brauzerin sayt üçün ayırdığı oxşar saxlama sahəsidir. Hər ikisi hesabınıza daxil olmuş vəziyyətinizi
                qorumağa, işinizi itirməməyə və platformanın necə işlədiyini anlamağımıza kömək edir.
              </p>
            </Section>

            <Section n={2} title="İstifadə etdiyimiz cookie-lər">
              <div className="flex flex-col gap-6">
                {COOKIES.map(entry => (
                  <div
                    key={entry.title}
                    className={`rounded-card border border-rule bg-surface p-7 ${entry.kind === 'none' ? 'opacity-60' : ''}`}
                  >
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold tracking-wide uppercase ${BADGE[entry.kind].className}`}>
                        {BADGE[entry.kind].label}
                      </span>
                      <span className="text-sm font-medium text-ink">{entry.title}</span>
                    </div>
                    {entry.names && (
                      <p className="mb-3 font-mono text-xs break-all text-ink-soft">{entry.names}</p>
                    )}
                    <p className={`text-sm leading-[1.7] ${entry.kind === 'none' ? 'text-ink-mute' : ''}`}>
                      {entry.description}
                    </p>
                    {entry.duration && (
                      <p className="mt-3 text-sm text-ink-mute">Müddət: {entry.duration}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <Section n={3} title="Lokal yaddaş (localStorage)">
              <div className="flex flex-col gap-5">
                {LOCAL_STORAGE.map(item => (
                  <div key={item.name}>
                    <p className="mb-1 text-base font-medium text-ink">{item.name}</p>
                    <p className="text-base leading-[1.75]">{item.description}</p>
                    <p className="mt-1 text-sm text-ink-mute">Müddət: {item.duration}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section n={4} title="Seçimləriniz">
              <p className="text-base leading-[1.75] mb-4">
                Brauzerin parametrlərindən cookie-ləri bloklaya və ya sayt məlumatlarını silə bilərsiniz. Zəruri
                cookie-lər bloklandıqda hesabınıza daxil olmaq mümkün olmayacaq. Əksər brauzerlərdə bunun üçün{' '}
                <strong>Parametrlər → Məxfilik → Cookie-lər</strong> bölməsinə baxın.
              </p>
              <p className="text-base leading-[1.75] mb-4">
                Brauzerinizdə “Do Not Track” aktivdirsə, PostHog analitikası tamamilə söndürülür. Cookie bildirişini
                bağlamadığınız müddətdə sessiya təkrarı qeydə alınmır.
              </p>
              <p className="text-base leading-[1.75]">
                Artıq toplanmış analitik məlumatların silinməsini testcentreaz@proton.me ünvanına yazaraq tələb edə bilərsiniz.
              </p>
            </Section>

            <Section n={5} title="Üçüncü tərəf cookie-ləri">
              <p className="text-base leading-[1.75]">
                Ödəniş prosesi zamanı Epoint-in təhlükəsiz ödəniş səhifəsi 3D Secure autentifikasiyası üçün öz texniki cookie-lərini yerləşdirə bilər.
                Bu cookie-lər Epoint-in məxfilik siyasəti çərçivəsindədir və bizim nəzarətimizdən kənardır.
              </p>
            </Section>

            <Section n={6} title="Əlaqə">
              <p className="text-base leading-[1.75]">
                Cookie qaydaları ilə bağlı suallarınız üçün: testcentreaz@proton.me
              </p>
            </Section>

          </div>
        </div>
    </>
  );
}
