'use client';

import Navbar from '@/components/layout/Navbar';
import { useAuth, SignInButton } from '@clerk/nextjs';
import Script from 'next/script';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, ShoppingBag, Settings, UserLock,
  Timer, HelpCircle, Infinity, AlertCircle, Lock, Shield, CreditCard, ShieldCheck,
} from 'lucide-react';
import type { PublicExam } from '@/lib/db/exams';
import { createCheckoutSession } from '@/lib/actions/checkout';

type CheckoutStatus = 'idle' | 'processing' | 'ready' | 'success' | 'error' | 'unconfigured';

interface Props {
  exam: PublicExam;
}

export default function CheckoutClient({ exam }: Props) {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handlePay = useCallback(async () => {
    if (status === 'processing' || status === 'success') return;
    setStatus('processing');
    setErrorMessage('');
    try {
      const result = await createCheckoutSession(exam.id);

      if ('alreadyPurchased' in result) { router.push('/dashboard'); return; }
      if ('unconfigured' in result) { setStatus('unconfigured'); setErrorMessage(result.error); return; }
      if ('error' in result) throw new Error(result.error);

      const LemonSqueezy = (window as Window & {
        LemonSqueezy?: { Url: { Open: (url: string) => void }; Setup: (c: { eventHandler: (e: { event: string }) => void }) => void };
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
        LemonSqueezy.Url.Open(result.checkoutUrl);
        setStatus('ready');
      } else {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Bilinməyən xəta baş verdi');
      setStatus('error');
    }
  }, [exam.id, router, status]);

  const examTime = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);

  return (
    <>
      <Script src="https://app.lemonsqueezy.com/js/lemon.js" defer />
      <Navbar />
      <main className="pt-16 min-h-screen bg-surface-subtle flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg mb-8">
          <div className="text-center mb-6">
            {status === 'success' ? <CheckCircle2 className="text-secondary mx-auto" size={40} /> : <ShoppingBag className="text-secondary mx-auto" size={40} />}
            <h1 className="text-2xl font-black text-primary font-headline mt-2">
              {status === 'success' ? 'Ödəniş Tamamlandı!' : 'Sifarişi Tamamla'}
            </h1>
          </div>

          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <CheckCircle2 className="text-green-500 mx-auto" size={48} />
              <h3 className="font-bold text-green-900 text-lg mt-3 mb-2">Ödəniş müvəffəqiyyətlə tamamlandı!</h3>
              <p className="text-sm text-green-800/80 mb-4"><strong>{exam.title}</strong> imtahanına giriş əldə etdiniz.</p>
              <p className="text-xs text-green-700 mb-4">Panel səhifəsinə yönləndirilirsiniz...</p>
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <button onClick={() => router.push('/dashboard')} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors">Panelə Get →</button>
            </div>
          )}

          {status === 'unconfigured' && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <Settings className="text-amber-500 shrink-0" size={20} />
                <h3 className="font-bold text-amber-900">LemonSqueezy konfiqurasiya tələb olunur</h3>
              </div>
              <p className="text-sm text-amber-800 mb-4 leading-relaxed">{errorMessage}</p>
              <button onClick={() => { setStatus('idle'); setErrorMessage(''); }} className="mt-2 text-sm text-amber-700 underline">Geri</button>
            </div>
          )}

          {(status === 'idle' || status === 'processing' || status === 'ready' || status === 'error') && (
            <>
              <div className="tc-card p-6 mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">Sifariş məlumatları</p>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-primary">{exam.title}</span>
                  <span className="font-black text-primary text-lg">{exam.price} AZN</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-on-surface-variant mt-3 pt-3 border-t border-outline-variant/20">
                  <span className="flex items-center gap-1"><Timer size={14} />{examTime} dəq</span>
                  <span className="flex items-center gap-1"><HelpCircle size={14} />{exam.totalQuestions} sual</span>
                  <span className="flex items-center gap-1"><Infinity size={14} />Limitsiz baxış</span>
                </div>
              </div>

              {isSignedIn ? (
                <div className="tc-card p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-5">Ödəniş metodunu seçin</p>
                  {exam.features.length > 0 && (
                    <div className="space-y-3 mb-6">
                      {exam.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-on-surface-variant">
                          <CheckCircle2 className="text-secondary shrink-0" size={16} />{f}
                        </div>
                      ))}
                    </div>
                  )}
                  {status === 'error' && errorMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                      <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                      <p className="text-xs text-red-700">{errorMessage}</p>
                    </div>
                  )}
                  <button
                    onClick={handlePay}
                    disabled={status === 'processing'}
                    className="w-full flex items-center justify-center gap-2 py-4 editorial-gradient text-white rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {status === 'processing'
                      ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Hazırlanır...</>)
                      : (<><Lock size={18} />Ödənişə Keç — {exam.price} AZN</>)}
                  </button>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant"><Shield size={14} />SSL şifrəli</div>
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant"><CreditCard size={14} />Lemon Squeezy</div>
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant"><ShieldCheck size={14} />Təhlükəsiz</div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                  <UserLock className="text-amber-500 mx-auto" size={40} />
                  <h3 className="font-bold text-amber-900 text-lg mt-3 mb-2">Hesaba daxil olmaq lazımdır</h3>
                  <p className="text-sm text-amber-800/80 mb-6 leading-relaxed">Ödəniş etmək üçün əvvəlcə hesabınıza daxil olun.</p>
                  <SignInButton mode="modal">
                    <button className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold shadow hover:bg-amber-600 transition-colors">Daxil ol / Qeydiyyat</button>
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
