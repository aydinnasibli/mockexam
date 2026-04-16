import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, BookOpen, ArrowRight } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import ExamModel from '@/lib/models/Exam';
import QuestionModel from '@/lib/models/Question';
import ExamForm from '../../ExamForm';

export const metadata = { title: 'İmtahanı Düzəlt — Admin' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditExamPage({ params }: Props) {
  const { id } = await params;

  await dbConnect();
  const [exam, questionCount] = await Promise.all([
    ExamModel.findOne({ examId: id }).lean(),
    QuestionModel.countDocuments({ examId: id }),
  ]);
  if (!exam) notFound();

  const totalExpected = exam.modules.reduce((s, m) => s + (m.questions || 0), 0);

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/exams" className="flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
          <ChevronLeft size={16} /> İmtahanlara qayıt
        </Link>
      </div>
      <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-2">
        İmtahanı Düzəlt
      </h1>
      <p className="text-on-surface-variant text-sm mb-6 font-mono">{id}</p>

      {/* Question bank CTA */}
      <Link
        href={`/admin/exams/${id}/questions`}
        className="flex items-center justify-between gap-4 mb-8 p-5 bg-white border-2 border-secondary/30 hover:border-secondary rounded-2xl shadow-sm group transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-secondary-fixed/60 flex items-center justify-center shrink-0">
            <BookOpen size={20} className="text-secondary" />
          </div>
          <div>
            <p className="font-bold text-primary text-sm">Sual Bankı</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {questionCount} / {totalExpected} sual əlavə edilib
              {questionCount < totalExpected && (
                <span className="ml-1 text-amber-600 font-semibold">· {totalExpected - questionCount} çatışmır</span>
              )}
              {totalExpected > 0 && questionCount >= totalExpected && (
                <span className="ml-1 text-emerald-600 font-semibold">· Tam</span>
              )}
            </p>
          </div>
        </div>
        <ArrowRight size={18} className="text-secondary group-hover:translate-x-1 transition-transform shrink-0" />
      </Link>
      <ExamForm
        mode="edit"
        examId={id}
        defaultValues={{
          title:       exam.title,
          type:        exam.type,
          description: exam.description,
          tag:         exam.tag,
          price:       exam.price,
          features:    exam.features.length > 0 ? exam.features : [''],
          isActive:    exam.isActive,
          modules:     exam.modules.map(m => ({
            name:              m.name,
            type:              m.type,
            durationMinutes:   m.durationMinutes,
            questions:         m.questions,
            breakAfterMinutes: m.breakAfterMinutes,
            isAdaptive:        m.isAdaptive ?? false,
            instructions:      m.instructions ?? '',
          })),
        }}
      />
    </div>
  );
}
