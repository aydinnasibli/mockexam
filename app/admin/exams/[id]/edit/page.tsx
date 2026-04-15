import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import ExamModel from '@/lib/models/Exam';
import ExamForm from '../../ExamForm';

export const metadata = { title: 'İmtahanı Düzəlt — Admin' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditExamPage({ params }: Props) {
  const { id } = await params;

  await dbConnect();
  const exam = await ExamModel.findOne({ examId: id }).lean();
  if (!exam) notFound();

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
      <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-2">
        İmtahanı Düzəlt
      </h1>
      <p className="text-on-surface-variant text-sm mb-8 font-mono">{id}</p>
      <ExamForm
        mode="edit"
        examId={id}
        defaultValues={{
          title: exam.title,
          type: exam.type,
          description: exam.description,
          tag: exam.tag,
          price: exam.price,
          durationMinutes: exam.durationMinutes,
          totalQuestions: exam.totalQuestions,
          features: exam.features.length > 0 ? exam.features : [''],
          isActive: exam.isActive,
        }}
      />
    </div>
  );
}
