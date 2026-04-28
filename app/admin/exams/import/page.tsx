'use client';

import { useState } from 'react';
import { UploadCloud, FileJson, AlertCircle, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { importExamFromJson } from '@/lib/actions/import';

export default function ImportExamPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
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
      } catch (err) {
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
    <div className="max-w-2xl mx-auto py-8">
      <Link href="/admin/exams" className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary mb-6">
        <ArrowLeft size={16} /> İmtahanlara qayıt
      </Link>
      
      <div className="bg-white rounded-3xl border border-outline-variant/40 shadow-sm p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center shrink-0">
            <UploadCloud className="text-secondary" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-primary font-headline">İmtahan Yüklə (JSON)</h1>
            <p className="text-on-surface-variant text-sm mt-1">
              AI tərəfindən yaradılmış məlumat bazasına uyğun `.json` faylını yükləyin.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* File Input */}
          <div className="relative border-2 border-dashed border-outline-variant/50 rounded-2xl p-10 text-center hover:bg-surface-container-low transition-colors">
            <input 
              type="file" 
              accept="application/json" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {file ? (
              <div className="flex flex-col items-center">
                <FileJson size={48} className="text-secondary mb-3" />
                <h3 className="text-primary font-bold">{file.name}</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud size={48} className="text-outline mb-3" />
                <h3 className="text-primary font-bold mb-1">Faylı seçin və ya bura sürüşdürün</h3>
                <p className="text-sm text-on-surface-variant">
                  Yalnız .json formatı qəbul olunur
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl flex gap-3 items-start text-sm font-medium">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Success / Preview State */}
          {parsedData && !error && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
              <div className="flex items-center gap-2 text-emerald-800 font-bold mb-3">
                <CheckCircle size={18} />
                Fayl uğurla oxundu! Təfərrüatlar:
              </div>
              <ul className="text-sm text-emerald-700 space-y-1.5 ml-1">
                <li><strong>İmtahan ID:</strong> {parsedData.examId}</li>
                <li><strong>Başlıq:</strong> {parsedData.title}</li>
                <li><strong>Növ:</strong> {parsedData.type?.toUpperCase()}</li>
                <li><strong>Modul sayı:</strong> {parsedData.modules?.length || 0}</li>
                <li><strong>Sualların sayı:</strong> {parsedData.questions?.length || 0}</li>
              </ul>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!parsedData || loading}
            className="w-full editorial-gradient text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Yüklənir...
              </>
            ) : (
              <>
                <UploadCloud size={18} /> İmtahanı Verilənlər Bazasına Yaz
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
