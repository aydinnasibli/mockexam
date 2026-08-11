'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  FlaskConical, CheckCircle2, XCircle, ExternalLink, Loader2,
  CreditCard, Search, KeyRound, Webhook, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import {
  createTestPayment,
  checkTestPaymentStatus,
  runSignatureSelfTest,
  type CreateTestPaymentResult,
  type StatusResult,
  type SignatureSelfTest,
} from '@/lib/actions/testpayment';

interface Config {
  hasPublicKey: boolean;
  hasPrivateKey: boolean;
  publicKeyPreview: string | null;
  appUrl: string;
  webhookUrl: string;
}

interface Props {
  config: Config;
  returnedResult: string | null;
  returnedOrder: string | null;
}

function Json({ value }: { value: unknown }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg bg-[#0d1117] p-4 text-sm leading-relaxed text-[#c9d1d9]">
      <code>{JSON.stringify(value, null, 2)}</code>
    </pre>
  );
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {label}
    </span>
  );
}

export default function TestPaymentClient({ config, returnedResult, returnedOrder }: Props) {
  const [amount, setAmount] = useState('1.00');
  const [currency, setCurrency] = useState<'AZN' | 'USD' | 'EUR' | 'RUB'>('AZN');
  const [language, setLanguage] = useState<'az' | 'en' | 'ru'>('az');
  const [description, setDescription] = useState('Epoint integration test');

  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<CreateTestPaymentResult | null>(null);

  const [transaction, setTransaction] = useState('');
  const [checking, setChecking] = useState(false);
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null);

  const [signing, setSigning] = useState(false);
  const [signResult, setSignResult] = useState<SignatureSelfTest | null>(null);

  useEffect(() => {
    if (returnedResult === 'success') {
      toast.success('Ödəniş uğurla tamamlandı və /testpayment səhifəsinə qayıtdı.');
    } else if (returnedResult === 'failed') {
      toast.error('Ödəniş uğursuz oldu (bankdan qayıtma).');
    }
  }, [returnedResult]);

  const configOk = config.hasPublicKey && config.hasPrivateKey;

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setCreateResult(null);
    try {
      const res = await createTestPayment({ amount, currency, language, description });
      setCreateResult(res);
      if (res.ok && res.redirectUrl) {
        toast.success('Ödəniş yaradıldı. Bank səhifəsini açın.');
      } else if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.warning('Epoint cavab verdi, amma redirect_url yoxdur. Cavaba baxın.');
      }
    } catch {
      toast.error('Gözlənilməz xəta.');
    } finally {
      setCreating(false);
    }
  }, [amount, currency, language, description, creating]);

  const handleCheck = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    setStatusResult(null);
    try {
      const res = await checkTestPaymentStatus(transaction);
      setStatusResult(res);
      if (!res.ok) toast.error(res.error);
    } catch {
      toast.error('Gözlənilməz xəta.');
    } finally {
      setChecking(false);
    }
  }, [transaction, checking]);

  const handleSelfTest = useCallback(async () => {
    if (signing) return;
    setSigning(true);
    setSignResult(null);
    try {
      const res = await runSignatureSelfTest();
      setSignResult(res);
      toast[res.ok ? 'success' : 'error'](
        res.ok ? 'İmza yoxlaması keçdi.' : (res.error ?? 'İmza yoxlaması uğursuz.'),
      );
    } catch {
      toast.error('Gözlənilməz xəta.');
    } finally {
      setSigning(false);
    }
  }, [signing]);

  return (
    <main className="min-h-screen bg-surface-subtle px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <FlaskConical className="text-secondary" size={28} />
            <h1 className="font-headline text-2xl font-black text-primary">Epoint Test Harness</h1>
          </div>
          <p className="mt-2 text-sm text-on-surface-variant">
            Epoint-in Stripe kimi test kartı yoxdur. Test canlı API-yə real sorğu göndərməklə
            aparılır — kiçik məbləğ yaradın, bank səhifəsini açın və status yoxlayın. Bu səhifə
            yalnız admin üçündür.
          </p>
        </header>

        {/* Config status */}
        <section className="tc-card mb-6 p-6">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound size={16} className="text-on-surface-variant" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
              Konfiqurasiya
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill ok={config.hasPublicKey} label={`EPOINT_PUBLIC_KEY${config.publicKeyPreview ? ` · ${config.publicKeyPreview}` : ''}`} />
            <Pill ok={config.hasPrivateKey} label="EPOINT_PRIVATE_KEY" />
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-on-surface-variant">
            <p className="flex items-center gap-1.5">
              <Webhook size={13} />
              Callback (result_url) — Epoint kabinetində bu ünvana yönləndirin:
            </p>
            <code className="block break-all rounded bg-surface-container px-2 py-1 font-mono text-xs text-primary">
              {config.webhookUrl}
            </code>
          </div>
          {!configOk && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Açarlar tam deyil. <code>.env.local</code>-da EPOINT_PUBLIC_KEY və EPOINT_PRIVATE_KEY
              təyin edin, sonra dev serveri yenidən başladın.
            </div>
          )}
        </section>

        {returnedResult && (
          <section
            className={`mb-6 flex items-center gap-2 rounded-xl border p-4 text-sm ${
              returnedResult === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {returnedResult === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            Bankdan qayıtma: <strong>{returnedResult}</strong>
            {returnedOrder && <span className="font-mono text-xs opacity-80">· {returnedOrder}</span>}
          </section>
        )}

        {/* 1. Create payment */}
        <section className="tc-card mb-6 p-6">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-on-surface-variant" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
              1 · Ödəniş yarat (POST /api/1/request)
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <label className="col-span-1 text-xs font-semibold text-on-surface-variant">
              Məbləğ
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none"
              />
            </label>
            <label className="col-span-1 text-xs font-semibold text-on-surface-variant">
              Valyuta
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as typeof currency)}
                className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none"
              >
                {['AZN', 'USD', 'EUR', 'RUB'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="col-span-1 text-xs font-semibold text-on-surface-variant">
              Dil
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as typeof language)}
                className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none"
              >
                {['az', 'en', 'ru'].map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <label className="col-span-2 text-xs font-semibold text-on-surface-variant sm:col-span-1">
              Təsvir
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none"
              />
            </label>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !configOk}
            className="mt-5 flex items-center justify-center gap-2 rounded-xl editorial-gradient px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            Ödəniş yarat
          </button>

          {createResult?.ok && createResult.redirectUrl && (
            <a
              href={createResult.redirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border-2 border-secondary px-5 py-3 text-sm font-bold text-secondary transition-colors hover:bg-secondary hover:text-white"
            >
              <ExternalLink size={16} />
              Bank ödəniş səhifəsini aç
            </a>
          )}

          {createResult && (
            <div className="mt-5 space-y-4">
              {!createResult.ok && (
                <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
                  <XCircle size={15} /> {createResult.error}
                </p>
              )}
              {createResult.ok && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Order ID
                  </p>
                  <code className="text-xs text-primary">{createResult.orderId}</code>
                </div>
              )}
              {'request' in createResult && createResult.request && (
                <details>
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Göndərilən sorğu (payload · data · signature)
                  </summary>
                  <Json value={createResult.request} />
                </details>
              )}
              {'response' in createResult && createResult.response && (
                <details open>
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Epoint cavabı
                  </summary>
                  <Json value={createResult.response} />
                </details>
              )}
            </div>
          )}
        </section>

        {/* 2. Check status */}
        <section className="tc-card mb-6 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Search size={16} className="text-on-surface-variant" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
              2 · Status yoxla (POST /api/1/get-status)
            </h2>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={transaction}
              onChange={(e) => setTransaction(e.target.value)}
              placeholder="transaction (məs. te_0000000001)"
              className="flex-1 rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 font-mono text-sm text-primary focus:border-secondary focus:outline-none"
            />
            <button
              onClick={handleCheck}
              disabled={checking || !configOk}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checking ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              Yoxla
            </button>
          </div>
          {statusResult && (
            <div className="mt-4">
              {!statusResult.ok && (
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
                  <XCircle size={15} /> {statusResult.error}
                </p>
              )}
              {'response' in statusResult && statusResult.response && (
                <Json value={statusResult.response} />
              )}
            </div>
          )}
        </section>

        {/* 3. Signature self-test */}
        <section className="tc-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-on-surface-variant" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
              3 · İmza yoxlaması (offline)
            </h2>
          </div>
          <p className="mb-4 text-sm text-on-surface-variant">
            Nümunə payload-u imzalayır və yerli olaraq təsdiqləyir — Epoint-ə sorğu göndərmədən
            data + signature kriptoqrafiyasının düzgün işlədiyini sübut edir.
          </p>
          <button
            onClick={handleSelfTest}
            disabled={signing}
            className="flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-surface-container disabled:opacity-50"
          >
            {signing ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
            İmza testini işə sal
          </button>
          {signResult && (
            <div className="mt-4">
              <Pill ok={signResult.verified} label={signResult.verified ? 'verified: true' : 'verified: false'} />
              <Json value={signResult} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
