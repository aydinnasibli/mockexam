'use client';

import Navbar from "@/components/layout/Navbar";
import { mockExams } from "@/lib/data";
import { useAuth, useUser, SignInButton } from "@clerk/nextjs";
import Script from "next/script";
import { use, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { notFound } from "next/navigation";

type CheckoutStatus = 'idle' | 'loading' | 'ready' | 'processing' | 'success' | 'already_owned' | 'error' | 'unconfigured';

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const exam = mockExams.find(e => e.id === resolvedParams.id);
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lsScriptReady, setLsScriptReady] = useState(false);

  if (!exam) return notFound();

  // Handle redirect back from LemonSqueezy with ?purchased=examId
  useEffect(() => {
    if (searchParams.get('purchased') === exam.id) {
      setStatus('success');
    }
  }, [searchParams, exam.id]);

  // Check if already purchased
  useEffect(() => {
    if (!isSignedIn) return;
    fetch('/api/purchases')
      .then(r => r.json())
      .then(data => {
        if (data.examIds?.includes(exam.id)) {
          setStatus('already_owned');
        }
      })
      .catch(() => {});
  }, [isSignedIn, exam.id]);

  const handlePay = useCallback(async () => {
    if (status === 'processing' || status === 'success') return;
    setStatus('processing');
    setErrorMessage('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: exam.id }),
      });

      const data = await res.json();

      if (res.status === 409 && data.alreadyPurchased) {
        setStatus('already_owned');
        return;
      }

      if (res.status === 503) {
        setStatus('unconfigured');
        setErrorMessage(data.error);
        return;
      }

      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? 'Ödəniş sessiyası yaradılmadı');
      }

      // Open LemonSqueezy checkout overlay
      const LemonSqueezy = (window as Window & {
        LemonSqueezy?: {
          Url: { Open: (url: string) => void };
          Setup: (config: { eventHandler: (event: { event: string }) => void }) => void;
        };
      }).LemonSqueezy;

      if (LemonSqueezy) {
        LemonSqueezy.Setup({
          eventHandler: (event) => {
            if (event.event === 'Checkout.Success') {
              setStatus('success');
              setTimeout(() => router.push('/dashboard'), 2500);
            }
          },
        });
        LemonSqueezy.Url.Open(data.checkoutUrl);
        setStatus('ready');
      } else {
        // Fallback: redirect to hosted checkout page
        window.location.href = data.checkoutUrl;
      }
    } catch (err: unknown) {
      console.error('Checkout error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Bilinməyən xəta baş verdi');
      setStatus('error');
    }
  }, [exam.id, router, status]);

  return (
    <>
      {/* LemonSqueezy Overlay JS */}
      <Script
        src="https://app.lemonsqueezy.com/js/lemon.js"
        onLoad={() => setLsScriptReady(true)}
        defer
      />
      <Navbar />
      <main className="pt-16 min-h-screen bg-surface-subtle flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg mb-8">

          {/* Header */}
          <div className="text-center mb-6">
            <span className="material-symbols-outlined text-4xl text-secondary">
              {status === 'success' ? 'check_circle' : 'shopping_bag'}
            </span>
            <h1 className="text-2xl font-black text-primary font-headline mt-2">
              {status === 'success' ? 'Ödəniş Tamamlandı!' : 'Sifarişi Tamamla'}
            </h1>
          </div>

          {/* Success state */}
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <span className="material-symbols-outlined text-green-500 text-5xl">task_alt</span>
              <h3 className="font-bold text-green-900 text-lg mt-3 mb-2">
                Ödəniş müvəffəqiyyətlə tamamlandı!
              </h3>
              <p className="text-sm text-green-800/80 mb-4">
                <strong>{exam.title}</strong> imtahanına giriş əldə etdiniz.
              </p>
              <p className="text-xs text-green-700 mb-4">Panel səhifəsinə yönləndirilirsiniz...</p>
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
              >
                Panelə Get →
              </button>
            </div>
          )}

          {/* Already owned state */}
          {status === 'already_owned' && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
              <span className="material-symbols-outlined text-blue-500 text-4xl">inventory</span>
              <h3 className="font-bold text-blue-900 text-lg mt-3 mb-2">Artıq satın alınıb</h3>
              <p className="text-sm text-blue-800/80 mb-6">
                Bu imtahanı artıq satın almısınız. Panelinizdən başlaya bilərsiniz.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Panelə Get
              </button>
            </div>
          )}

          {/* Not-configured state (dev helper) */}
          {status === 'unconfigured' && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="material-symbols-outlined text-amber-500">settings</span>
                <h3 className="font-bold text-amber-900">LemonSqueezy konfiqurasiya tələb olunur</h3>
              </div>
              <p className="text-sm text-amber-800 mb-4 leading-relaxed">
                Ödənişi aktivləşdirmək üçün LemonSqueezy panelinizdə bir məhsul yaradın, sonra Variant ID-ni <code className="bg-amber-100 px-1 rounded">.env.local</code> faylına əlavə edin:
              </p>
              <div className="bg-amber-100 rounded-xl p-4 font-mono text-xs text-amber-900 space-y-1">
                <p>1. <a href="https://app.lemonsqueezy.com/products" target="_blank" rel="noopener noreferrer" className="underline">app.lemonsqueezy.com/products</a> → yeni məhsul yaradın</p>
                <p>2. Məhsulun Variant ID-sini kopyalayın</p>
                <p>3. <code>.env.local</code> faylında əlavə edin:</p>
                <p className="pl-3 text-amber-700">LEMONSQUEEZY_VARIANT_ID=<em>variant_id_buraya</em></p>
                <p>4. Dev serveri yenidən başladın</p>
              </div>
              <button
                onClick={() => { setStatus('idle'); setErrorMessage(''); }}
                className="mt-4 text-sm text-amber-700 underline"
              >
                Geri
              </button>
            </div>
          )}

          {/* Normal checkout flow */}
          {(status === 'idle' || status === 'processing' || status === 'ready' || status === 'error') && (
            <>
              {/* Order summary */}
              <div className="tc-card p-6 mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">
                  Sifariş məlumatları
                </p>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-primary">{exam.title}</span>
                  <span className="font-black text-primary text-lg">{exam.price} AZN</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-on-surface-variant mt-3 pt-3 border-t border-outline-variant/20">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">timer</span>
                    {exam.durationMinutes} dəq
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">quiz</span>
                    {exam.totalQuestions} sual
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">all_inclusive</span>
                    Limitsiz baxış
                  </span>
                </div>
              </div>

              {isSignedIn ? (
                <div className="tc-card p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-5">
                    Ödəniş metodunu seçin
                  </p>

                  {/* What you get */}
                  <div className="space-y-3 mb-6">
                    {exam.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* Error message */}
                  {status === 'error' && errorMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                      <span className="material-symbols-outlined text-red-500 text-sm mt-0.5">error</span>
                      <p className="text-xs text-red-700">{errorMessage}</p>
                    </div>
                  )}

                  {/* Pay button */}
                  <button
                    id="pay-button"
                    onClick={handlePay}
                    disabled={status === 'processing'}
                    className="w-full flex items-center justify-center gap-2 py-4 tc-gradient text-white rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary-mid/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {status === 'processing' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Hazırlanır...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">lock</span>
                        Ödənişə Keç — {exam.price} AZN
                      </>
                    )}
                  </button>

                  {/* Trust badges */}
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">security</span>
                      SSL şifrəli
                    </div>
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">payments</span>
                      Lemon Squeezy
                    </div>
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">verified_user</span>
                      Təhlükəsiz
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                  <span className="material-symbols-outlined text-amber-500 text-4xl">person_lock</span>
                  <h3 className="font-bold text-amber-900 text-lg mt-3 mb-2">
                    Hesaba daxil olmaq lazımdır
                  </h3>
                  <p className="text-sm text-amber-800/80 mb-6 leading-relaxed">
                    Ödəniş etmək və imtahana giriş əldə etmək üçün əvvəlcə hesabınıza daxil olun.
                  </p>
                  <SignInButton mode="modal">
                    <button className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold shadow hover:bg-amber-600 transition-colors">
                      Daxil ol / Qeydiyyat
                    </button>
                  </SignInButton>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
