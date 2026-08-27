import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { count, eq } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { exams as examsTable, questions as questionsTable } from '@/lib/db/schema';
import ExamForm from '../../ExamForm';
import AdminPageHeader from '../../../PageHeader';
import { requireAdminPage } from '@/lib/infra/admin';

export const metadata = { title: 'İmtahanı Düzəlt — Admin' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditExamPage({ params }: Props) {
  await requireAdminPage();
  const { id } = await params;

  const [[exam], [{ n: questionCount }]] = await Promise.all([
    db.select().from(examsTable).where(eq(examsTable.id, id)).limit(1),
    db.select({ n: count() }).from(questionsTable).where(eq(questionsTable.examId, id)),
  ]);
  if (!exam) notFound();

  const totalExpected = exam.modules.reduce((s, m) => s + (m.questions || 0), 0);

  return (
    <div>
      <Link href="/admin/exams" className="mb-7 inline-flex items-center gap-1.5 text-note font-medium text-ink-soft transition-colors hover:text-ink">
        <ChevronLeft size={15} /> İmtahanlara qayıt
      </Link>
      <AdminPageHeader eyebrow="Kataloq" title="İmtahanı düzəlt." meta={id} />

      {/* Question bank CTA */}
      <Link
        href={`/admin/exams/${id}/questions`}
        className="group mb-6 flex items-center justify-between gap-4 rounded-panel border border-rule bg-surface px-5 py-4.5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-md"
      >
        <div className="min-w-0">
          <p className="m-0 text-body font-medium tracking-[-0.01em] text-ink">Sual bankı</p>
          <p className="m-0 mt-1 text-sm text-ink-soft">
            <span className="font-mono tabular-nums text-ink">{questionCount} / {totalExpected}</span> sual əlavə edilib
            {questionCount < totalExpected && (
              <span className="ml-1.5 text-warn">· {totalExpected - questionCount} çatışmır</span>
            )}
            {totalExpected > 0 && questionCount >= totalExpected && (
              <span className="ml-1.5 text-ok">· Tam</span>
            )}
          </p>
        </div>
        <ArrowRight size={17} className="shrink-0 text-ink-mute transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink" />
      </Link>
      <ExamForm
        mode="edit"
        examId={id}
        defaultValues={{
          title:       exam.title,
          type:        exam.type,
          variant:     exam.variant,
          description: exam.description,
          tag:         exam.tag,
          price:       Number(exam.price),
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
            layout:            m.layout === 'block' ? 'block' as const : 'single' as const,
          })),
        }}
      />
    </div>
  );
}
