'use client';

import { useState } from 'react';
import { UploadCloud, FileJson, AlertCircle, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { importExamFromJson } from '@/lib/actions/import';
import Button, { ButtonArrow } from '@/components/ui/Button';

/** Best-effort read of the fields shown in the confirmation preview. */
function previewOf(data: unknown) {
  const d = (data ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '—');
  const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  return {
    examId:    str(d.examId),
    title:     str(d.title),
    type:      typeof d.type === 'string' ? d.type.toUpperCase() : '—',
    modules:   len(d.modules),
    questions: len(d.questions),
  };
}

export default function ImportExamPage() {
  const [file, setFile] = useState<File | null>(null);
  // Shape is validated server-side by importExamFromJson; the client only needs
  // to know whether the file parsed as JSON at all.
  const [parsedData, setParsedData] = useState<unknown>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError('');
    setParsedData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setParsedData(json);
      } catch {
        setError('Yüklədiyiniz fayl düzgün JSON formatında deyil. Zəhmət olmasa yoxlayın.');
        setParsedData(null);
      }
    };
    reader.readAsText(selected);
  };

  const handleUpload = async () => {
    if (!parsedData) return;
    setLoading(true);
    setError('');
    
    const result = await importExamFromJson(parsedData);
    
    // Server action throws REDIRECT on success, so if it returns here, it means there's an error.
    if (result && result.error) {
      setError(result.error);
      toast.error(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/exams" className="mb-7 inline-flex items-center gap-1.5 text-note font-medium text-ink-soft transition-colors hover:text-ink">
        <ArrowLeft size={15} /> İmtahanlara qayıt
      </Link>

      <header className="mb-8 border-b border-ink pb-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <span className="font-mono text-label font-normal tracking-[0.16em] uppercase text-ink-mute">İdxal</span>
        </div>
        <h1 className="m-0 text-3xl leading-[1.05] font-light tracking-[-0.035em] text-ink md:text-display-xs">
          İmtahan yüklə (JSON).
        </h1>
        <p className="m-0 mt-3.5 text-body text-ink-soft">
          AI tərəfindən yaradılmış məlumat bazasına uyğun <code className="font-mono text-sm">.json</code> faylını yükləyin.
        </p>
      </header>

      <div className="space-y-5">
        {/* File Input */}
        <div className="relative rounded-panel border border-dashed border-ink-faint bg-surface px-6 py-14 text-center transition-colors hover:border-ink">
          <input
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            aria-label="JSON faylı seçin"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />

          {file ? (
            <div className="flex flex-col items-center">
              <FileJson size={32} className="mb-4 text-ink" />
              <p className="m-0 text-base font-medium text-ink">{file.name}</p>
              <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-2">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud size={32} className="mb-4 text-ink-faint" />
              <p className="m-0 text-base font-light tracking-tight text-ink">Faylı seçin və ya bura sürüşdürün</p>
              <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-2">Yalnız .json formatı qəbul olunur</p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-3 rounded-panel border border-error/25 bg-error/5 px-5 py-4 text-sm text-error">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <p className="m-0">{error}</p>
          </div>
        )}

        {/* Success / Preview State */}
        {parsedData != null && !error && (
          <div className="rounded-panel border border-rule bg-surface overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
              <h2 className="m-0 text-body font-medium tracking-[-0.01em] text-ink flex items-center gap-2">
                <CheckCircle size={16} className="text-ok" /> Fayl uğurla oxundu
              </h2>
            </div>
            <div className="px-5">
              {[
                { label: 'İmtahan ID',      value: previewOf(parsedData).examId },
                { label: 'Başlıq',          value: previewOf(parsedData).title },
                { label: 'Növ',             value: previewOf(parsedData).type },
                { label: 'Modul sayı',      value: previewOf(parsedData).modules },
                { label: 'Sualların sayı',  value: previewOf(parsedData).questions },
              ].map(({ label, value }, i) => (
                <div
                  key={label}
                  className={`flex items-baseline justify-between gap-4 py-3 ${i > 0 ? 'border-t border-rule-soft' : ''}`}
                >
                  <span className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute">{label}</span>
                  <span className="truncate font-mono text-note tabular-nums text-ink">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        <Button className="w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleUpload}
          disabled={!parsedData || loading}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Yüklənir...
            </>
          ) : (
            <>
              İmtahanı verilənlər bazasına yaz <ButtonArrow />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
