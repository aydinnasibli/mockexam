import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Geri Qaytarma Siyasəti',
  description: 'Testcentre rəqəmsal xidmətlər üçün geri qaytarma aparılmır.',
};

export default function RefundPage() {
  return (
    <>
      <Navbar />
      <main className="pt-17">
        <div className="max-w-215 mx-auto px-8 py-24">

          <div className="flex items-center gap-3 mb-8 rise">
            <span className="dot" />
            <span className="eyebrow">Hüquqi</span>
          </div>
          <h1 className="t-display mb-4 rise rise-1">Geri Qaytarma Siyasəti</h1>
          <p className="t-lede mb-4 rise rise-2" style={{ color: 'var(--color-ink-soft)' }}>
            Son yenilənmə: 26 may 2026
          </p>

          <div className="flex flex-col gap-12 mt-12">

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow tabular-nums" style={{ color: 'var(--color-ink-mute)', minWidth: '2rem' }}>00</span>
                <h2 className="t-title">Ödəniş emalçısı</h2>
              </div>
              <div className="pl-13">
                <p className="text-[15px] leading-[1.75]" style={{ color: 'var(--color-ink-soft)' }}>
                  Bütün ödənişlər LemonSqueezy tərəfindən emal edilir. LemonSqueezy Merchant of Record kimi
                  fəaliyyət göstərir — yəni qanuni satıcı LemonSqueezy-dir və onların şərtləri ödəniş
                  proseslərinə şamil olunur.
                </p>
              </div>
            </div>

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow tabular-nums" style={{ color: 'var(--color-ink-mute)', minWidth: '2rem' }}>01</span>
                <h2 className="t-title">Bütün satışlar qətidir</h2>
              </div>
              <div className="pl-13">
                <p className="text-[15px] leading-[1.75] mb-4" style={{ color: 'var(--color-ink-soft)' }}>
                  Testcentre rəqəmsal xidmət satır. Ödəniş tamamlandıqdan sonra sınağa giriş dərhal açılır
                  və bu an ötürüldüyündən geri qaytarma aparılmır.
                </p>
                <p className="text-[15px] leading-[1.75]" style={{ color: 'var(--color-ink-soft)' }}>
                  Ödəniş etməzdən əvvəl sınaq səhifəsindəki nümunə məlumatları ilə platformanı tanıya bilərsiniz.
                </p>
              </div>
            </div>

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow tabular-nums" style={{ color: 'var(--color-ink-mute)', minWidth: '2rem' }}>02</span>
                <h2 className="t-title">İstisna: texniki xəta</h2>
              </div>
              <div className="pl-13">
                <p className="text-[15px] leading-[1.75] mb-4" style={{ color: 'var(--color-ink-soft)' }}>
                  Ödəniş uğurla başa çatdı, lakin texniki problem səbəbindən sınağa giriş heç vaxt açılmadısa —
                  bu istisnadır və həll edilir.
                </p>
                <p className="text-[15px] leading-[1.75]" style={{ color: 'var(--color-ink-soft)' }}>
                  Belə vəziyyətdə 72 saat ərzində help@testcentre.online ünvanına LemonSqueezy
                  sifariş nömrəsini qeyd edərək yazın.
                </p>
              </div>
            </div>

            <div className="border-t border-rule pt-10">
              <div className="flex items-baseline gap-5 mb-4">
                <span className="eyebrow tabular-nums" style={{ color: 'var(--color-ink-mute)', minWidth: '2rem' }}>03</span>
                <h2 className="t-title">Əlaqə</h2>
              </div>
              <div className="pl-13">
                <p className="text-[15px] leading-[1.75]" style={{ color: 'var(--color-ink-soft)' }}>
                  Suallarınız üçün: help@testcentre.online — hər mesaja 24 saat ərzində insan cavab verir.
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
