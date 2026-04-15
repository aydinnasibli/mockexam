import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import ExamForm from '../ExamForm';

export const metadata = { title: 'Yeni İmtahan — Admin' };

export default function NewExamPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/exams"
          className="flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
        >
          <ChevronLeft size={16} /> İmtahanlara qayıt
        </Link>
      </div>
      <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-8">
        Yeni İmtahan
      </h1>
      <ExamForm mode="create" />
    </div>
  );
}
