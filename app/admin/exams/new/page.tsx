import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import ExamForm from '../ExamForm';
import AdminPageHeader from '../../PageHeader';

export const metadata = { title: 'Yeni İmtahan — Admin' };

export default function NewExamPage() {
  return (
    <div>
      <Link
        href="/admin/exams"
        className="mb-7 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ChevronLeft size={15} /> İmtahanlara qayıt
      </Link>
      <AdminPageHeader eyebrow="Kataloq" title="Yeni imtahan." />
      <ExamForm mode="create" />
    </div>
  );
}
