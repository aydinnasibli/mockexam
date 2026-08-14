'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import ExamModel, { computeExamTotals } from '@/lib/models/Exam';
import { checkRole } from '@/lib/admin';
import { isExamType, type ExamType } from '@/lib/exam-types';
import { validateModules, type ParsedModule } from '@/lib/exam-modules';
import { captureException } from '@/lib/observability';

// ─── Seed data ────────────────────────────────────────────────────────────────

type SeedExam = { id: string; title: string; type: ExamType; description: string; tag: string; price: number; features: string[] };

const SEED_EXAMS: SeedExam[] = [
  { id: 'sat-mock-1', title: 'Digital SAT Full Mock #1', type: 'sat', tag: 'SAT', price: 12, description: 'College Board-un Bluebook formatına 100% uyğunlaşdırılmış rəqəmsal SAT sınağı. Reading/Writing və Math bölmələri adaptive rejimdə verilir.', features: ['Adaptive modul sistemi', 'Dərhal bal hesablaması', 'Hər soruya izahat', 'Rəsmi Bluebook interfeysi'] },
  { id: 'sat-mock-2', title: 'Digital SAT Full Mock #2', type: 'sat', tag: 'SAT', price: 12, description: '1500+ bal hədəfi olan tələbələr üçün seçilmiş çətin suallardan ibarət ikinci tam SAT sınağı.', features: ['Yüksək çətinlik suallar', 'Riyaziyyat focus bölməsi', 'Detallı nəticə analizi', 'Rəsmi Bluebook interfeysi'] },
  { id: 'sat-mock-3', title: 'Digital SAT Full Mock #3', type: 'sat', tag: 'SAT', price: 12, description: 'SAT hazırlığı üçün üçüncü tam sınaq paketi. Bütün mövzu sahələri bərabər əhatə olunub.', features: ['Balanslaşdırılmış sual paylanması', 'Reading mövzu analizi', 'Vaxt idarəetmə tövsiyələri', 'Rəsmi Bluebook interfeysi'] },
  { id: 'ielts-academic-1', title: 'IELTS Academic Mock #1', type: 'ielts', tag: 'IELTS', price: 15, description: 'Kompüter əsaslı həqiqi IELTS mühitini simulyasiya edən tam sınaq. Listening, Reading və Writing bölmələri daxildir.', features: ['Band score hesablaması', 'Listening audio simulyasiyası', 'Academic Writing qiymətləndirilməsi', 'Mövzu üzrə zəiflik analizi'] },
  { id: 'ielts-general-1', title: 'IELTS General Training Mock #1', type: 'ielts', tag: 'IELTS', price: 15, description: 'İmmiqrasiya və peşəkar qeydiyyat üçün IELTS General Training sınağı.', features: ['General Training formatı', 'Letter writing tapşırığı', 'Gündəlik həyat reading mətnləri', 'Band score hesablaması'] },
  { id: 'toefl-ibt-1', title: 'TOEFL iBT Full Mock #1', type: 'toefl', tag: 'TOEFL', price: 18, description: 'ETS-in rəsmi TOEFL iBT formatına uyğun hazırlanmış tam sınaq. Reading, Listening, Speaking və Writing bölmələri daxildir.', features: ['4 bölmə tam simulyasiya', 'Integrated Writing tapşırığı', 'Speaking nümunə cavablar', 'Bal çevirmə cədvəli'] },
  { id: 'toefl-ibt-2', title: 'TOEFL iBT Full Mock #2', type: 'toefl', tag: 'TOEFL', price: 18, description: 'Akademik mühiti hədəfləyən konkret universitet tələblərinə hazır tam TOEFL iBT sınağı ikinci səviyyə.', features: ['Çətin akademik mətnlər', '3 Listening lecture', 'Independent Writing prompts', 'Bal çevirmə cədvəli'] },
];

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  if (!(await checkRole('admin'))) throw new Error('Forbidden');
}

// ─── Validation helpers ───────────────────────────────────────────────────────

const EXAM_ID_RE = /^[a-z0-9-]{1,64}$/;

function validateExamId(raw: string): string | { error: string } {
  if (!EXAM_ID_RE.test(raw))
    return { error: 'ID yalnız kiçik hərf, rəqəm və tire (-) içərə bilər (maks. 64 simvol).' };
  return raw;
}

// ─── Base field parsing ───────────────────────────────────────────────────────

function parseBaseFields(formData: FormData) {
  return {
    title:       (formData.get('title') as string)?.trim(),
    type:        formData.get('type') as string,
    description: (formData.get('description') as string)?.trim(),
    tag:         (formData.get('tag') as string)?.trim(),
    price:       parseFloat(formData.get('price') as string),
    features:    (formData.getAll('features') as string[]).filter(f => f.trim()).slice(0, 20),
    isActive:    formData.get('isActive') === 'true',
    modulesJson: formData.get('modulesJson') as string,
  };
}

type BaseFields = ReturnType<typeof parseBaseFields>;
/** Same shape, but `type` has been narrowed to a real ExamType. */
type ValidBaseFields = Omit<BaseFields, 'type'> & { type: ExamType };

/**
 * Validates the base fields and narrows `type` to `ExamType` so it can be
 * written straight to the schema (Mongoose types the enum field as the union).
 */
function validateBaseFields(f: BaseFields): { error: string } | { fields: ValidBaseFields } {
  if (!f.title || !f.type || !f.description || !f.tag)
    return { error: 'Bütün tələb olunan sahələri doldurun.' };
  if (!isExamType(f.type))
    return { error: 'Yanlış imtahan növü.' };
  if (isNaN(f.price) || f.price < 0 || f.price > 10_000)
    return { error: 'Qiymət 0 ilə 10 000 arasında olmalıdır.' };
  return { fields: { ...f, type: f.type } };
}

// ─── Exam Actions ─────────────────────────────────────────────────────────────

export type ActionResult = { error?: string };

export async function createExam(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const rawExamId = (formData.get('examId') as string)?.trim() ?? '';
  const examIdResult = validateExamId(rawExamId);
  if (typeof examIdResult === 'object') return examIdResult;

  const baseResult = validateBaseFields(parseBaseFields(formData));
  if ('error' in baseResult) return baseResult;
  const fields = baseResult.fields;

  let modules: ParsedModule[];
  try {
    const parsed = JSON.parse(fields.modulesJson || '[]');
    const result = validateModules(parsed);
    if ('error' in result) return result;
    modules = result;
  } catch (err) {
    void captureException(err, { tags: { action: 'createExam', step: 'moduleParse' } });
    return { error: 'Modul məlumatları yanlışdır.' };
  }

  const { totalQuestions, durationMinutes } = computeExamTotals(modules);

  try {
    await dbConnect();
    await ExamModel.create({
      examId:          rawExamId,
      title:           fields.title,
      type:            fields.type,
      description:     fields.description,
      tag:             fields.tag,
      price:           fields.price,
      features:        fields.features,
      modules,
      totalQuestions,
      durationMinutes,
      isActive:        fields.isActive,
    });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000)
      return { error: 'Bu ID ilə imtahan artıq mövcuddur.' };
    void captureException(err, { tags: { action: 'createExam' } });
    return { error: 'Server xətası baş verdi.' };
  }

  revalidatePath('/admin/exams');
  revalidatePath('/exams');
  redirect('/admin/exams');
}

export async function updateExam(examId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const baseResult = validateBaseFields(parseBaseFields(formData));
  if ('error' in baseResult) return baseResult;
  const fields = baseResult.fields;

  let modules: ParsedModule[];
  try {
    const parsed = JSON.parse(fields.modulesJson || '[]');
    const result = validateModules(parsed);
    if ('error' in result) return result;
    modules = result;
  } catch (err) {
    void captureException(err, { tags: { action: 'updateExam', step: 'moduleParse' } });
    return { error: 'Modul məlumatları yanlışdır.' };
  }

  const { totalQuestions, durationMinutes } = computeExamTotals(modules);

  try {
    await dbConnect();
    const exam = await ExamModel.findOneAndUpdate(
      { examId },
      {
        $set: {
          title: fields.title, type: fields.type, description: fields.description,
          tag: fields.tag, price: fields.price, features: fields.features,
          modules, totalQuestions, durationMinutes, isActive: fields.isActive,
        },
      },
      { returnDocument: 'after', runValidators: true }
    );
    if (!exam) return { error: 'İmtahan tapılmadı.' };
  } catch (err) {
    void captureException(err, { tags: { action: 'updateExam' } });
    return { error: 'Server xətası baş verdi.' };
  }

  revalidatePath('/admin/exams');
  revalidatePath('/exams');
  redirect('/admin/exams');
}

export async function toggleExamActive(examId: string, newActive: boolean): Promise<ActionResult> {
  try {
    await requireAdmin();
    await dbConnect();
    await ExamModel.findOneAndUpdate({ examId }, { $set: { isActive: newActive } });
    revalidatePath('/admin/exams');
    revalidatePath('/exams');
    return {};
  } catch (err) {
    void captureException(err, { tags: { action: 'toggleExamActive' } });
    return { error: 'Server xətası baş verdi.' };
  }
}

export async function deleteExam(examId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await dbConnect();
    await ExamModel.findOneAndDelete({ examId });
    revalidatePath('/admin/exams');
    revalidatePath('/exams');
    return {};
  } catch (err) {
    void captureException(err, { tags: { action: 'deleteExam' } });
    return { error: 'Server xətası baş verdi.' };
  }
}

// ─── Seed Action ──────────────────────────────────────────────────────────────

export type SeedResult = { created: number; skipped: number; error?: string };

/**
 * Per-type module templates reflecting real exam structures.
 * Each seeded exam gets one or two representative modules so totals are correct.
 */
const SAT_MODULES = (): ParsedModule[] => [
  { name: 'Reading & Writing', type: 'reading',  durationMinutes: 64, questions: 54, breakAfterMinutes: 10, isAdaptive: false, instructions: '' },
  { name: 'Math',              type: 'math',      durationMinutes: 60, questions: 44, breakAfterMinutes: 0,  isAdaptive: false, instructions: '' },
];
const IELTS_MODULES = (): ParsedModule[] => [
  { name: 'Listening', type: 'listening', durationMinutes: 40, questions: 40, breakAfterMinutes: 0, isAdaptive: false, instructions: '' },
  { name: 'Reading',   type: 'reading',   durationMinutes: 60, questions: 40, breakAfterMinutes: 0, isAdaptive: false, instructions: '' },
  { name: 'Writing',   type: 'writing',   durationMinutes: 65, questions: 0,  breakAfterMinutes: 0, isAdaptive: false, instructions: '' },
];
const TOEFL_MODULES = (): ParsedModule[] => [
  { name: 'Reading',   type: 'reading',   durationMinutes: 35, questions: 20, breakAfterMinutes: 0,  isAdaptive: false, instructions: '' },
  { name: 'Listening', type: 'listening', durationMinutes: 36, questions: 28, breakAfterMinutes: 10, isAdaptive: false, instructions: '' },
  { name: 'Speaking',  type: 'speaking',  durationMinutes: 16, questions: 4,  breakAfterMinutes: 0,  isAdaptive: false, instructions: '' },
  { name: 'Writing',   type: 'writing',   durationMinutes: 29, questions: 2,  breakAfterMinutes: 0,  isAdaptive: false, instructions: '' },
];
function buildModulesForSeed(exam: SeedExam): ParsedModule[] {
  switch (exam.type) {
    case 'sat':   return SAT_MODULES();
    case 'ielts': return IELTS_MODULES();
    case 'toefl': return TOEFL_MODULES();
    default:      return [{ name: 'İmtahan', type: 'general', durationMinutes: 60, questions: 0, breakAfterMinutes: 0, isAdaptive: false, instructions: '' }];
  }
}

export async function seedExams(_prev: SeedResult): Promise<SeedResult> {
  await requireAdmin();
  try {
    await dbConnect();
    let created = 0, skipped = 0;
    for (const exam of SEED_EXAMS) {
      const exists = await ExamModel.exists({ examId: exam.id });
      if (exists) { skipped++; continue; }
      const modules = buildModulesForSeed(exam);
      const { totalQuestions, durationMinutes } = computeExamTotals(modules);
      await ExamModel.create({
        examId: exam.id, title: exam.title, type: exam.type,
        description: exam.description, tag: exam.tag, price: exam.price,
        features: exam.features, modules, totalQuestions, durationMinutes, isActive: true,
      });
      created++;
    }
    revalidatePath('/admin');
    revalidatePath('/admin/exams');
    revalidatePath('/exams');
    return { created, skipped };
  } catch (err) {
    void captureException(err, { tags: { action: 'seedExams' } });
    return { created: 0, skipped: 0, error: 'Server xətası baş verdi.' };
  }
}
