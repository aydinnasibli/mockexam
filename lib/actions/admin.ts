'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/infra/mongodb';
import ExamModel, { computeExamTotals } from '@/lib/models/Exam';
import QuestionModel from '@/lib/models/Question';
import ExamResult from '@/lib/models/ExamResult';
import ExamSessionModel from '@/lib/models/ExamSession';
import Purchase from '@/lib/models/Purchase';
import { checkRole } from '@/lib/infra/admin';
import { isExamType, type ExamType } from '@/lib/domain/exam-types';
import { validateModules, type ParsedModule } from '@/lib/domain/exam-modules';
import { captureException } from '@/lib/infra/observability';
import { syncExamTotals } from '@/lib/db/exam-totals';

// ─── Seed data ────────────────────────────────────────────────────────────────

type SeedExam = { id: string; title: string; type: ExamType; description: string; tag: string; price: number; features: string[] };

const SEED_EXAMS: SeedExam[] = [
  { id: 'sat-mock-1', title: 'Digital SAT Full Mock #1', type: 'sat', tag: 'SAT', price: 12, description: 'College Board-un rəqəmsal SAT formatına uyğun tam sınaq. Reading & Writing və Math bölmələri modul-modul, ayrıca vaxtla verilir.', features: ['Modul üzrə ayrıca vaxt', 'Fasilə ekranı', 'Kalkulyator və düstur vərəqi', 'Hər suala izahat', 'Təxmini bal hesablaması'] },
  { id: 'sat-mock-2', title: 'Digital SAT Full Mock #2', type: 'sat', tag: 'SAT', price: 12, description: '1500+ bal hədəfi olan tələbələr üçün seçilmiş çətin suallardan ibarət ikinci tam SAT sınağı.', features: ['Yüksək çətinlik suallar', 'Riyaziyyat focus bölməsi', 'Detallı nəticə analizi', 'Təxmini bal hesablaması'] },
  { id: 'sat-mock-3', title: 'Digital SAT Full Mock #3', type: 'sat', tag: 'SAT', price: 12, description: 'SAT hazırlığı üçün üçüncü tam sınaq paketi. Bütün mövzu sahələri bərabər əhatə olunub.', features: ['Balanslaşdırılmış sual paylanması', 'Reading mövzu analizi', 'Vaxt idarəetmə tövsiyələri', 'Təxmini bal hesablaması'] },
  { id: 'ielts-academic-1', title: 'IELTS Academic Mock #1', type: 'ielts', tag: 'IELTS', price: 15, description: 'Kompüter əsaslı IELTS mühitini simulyasiya edən sınaq. Listening, Reading və Writing bölmələri daxildir — Speaking bölməsi yoxdur.', features: ['Band score hesablaması', 'Hissə-hissə Listening ekranı', 'Academic Writing qiymətləndirilməsi', 'Mövzu üzrə zəiflik analizi'] },
  { id: 'ielts-general-1', title: 'IELTS General Training Mock #1', type: 'ielts', tag: 'IELTS', price: 15, description: 'İmmiqrasiya və peşəkar qeydiyyat üçün IELTS General Training sınağı — Speaking bölməsi yoxdur.', features: ['General Training formatı', 'Letter writing tapşırığı', 'Gündəlik həyat reading mətnləri', 'Band score hesablaması'] },
  { id: 'toefl-ibt-1', title: 'TOEFL iBT Full Mock #1', type: 'toefl', tag: 'TOEFL', price: 18, description: 'ETS-in TOEFL iBT formatına uyğun hazırlanmış sınaq. Reading, Listening və Writing bölmələri daxildir — Speaking bölməsi yoxdur.', features: ['3 bölmə simulyasiyası', 'Integrated Writing tapşırığı', 'Bölmə üzrə ayrıca vaxt', 'AI yazı qiymətləndirməsi'] },
  { id: 'toefl-ibt-2', title: 'TOEFL iBT Full Mock #2', type: 'toefl', tag: 'TOEFL', price: 18, description: 'Akademik mühiti hədəfləyən konkret universitet tələblərinə hazır tam TOEFL iBT sınağı ikinci səviyyə.', features: ['Çətin akademik mətnlər', '3 Listening lecture', 'Independent Writing prompts', 'AI yazı qiymətləndirməsi'] },
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

    /*
     * Refuse an edit that would strand questions.
     *
     * The module array is replaced wholesale, but questions reference their
     * module by INDEX and are not touched — so removing a module silently
     * orphaned its entire bank. Those questions are unreachable and unscheduled
     * yet still counted in the paper's numbering, so a candidate was shown a
     * total they could not get to. Blocking the edit keeps the decision with
     * the admin, who can move or delete the questions deliberately; doing it
     * for them would mean destroying authored work on a form submit.
     */
    const stranded = await QuestionModel.countDocuments({
      examId,
      moduleIndex: { $gte: modules.length },
    });
    if (stranded > 0) {
      return {
        error: `Bu dəyişiklik ${stranded} sualı modulsuz qoyardı. `
             + `Əvvəlcə həmin sualları silin və ya başqa modula köçürün, sonra modul sayını azaldın.`,
      };
    }

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
    // Editing the module list changes the schedule, and with it the duration a
    // candidate will actually sit. Re-derive from the real bank.
    await syncExamTotals(examId);
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

/**
 * Delete an exam and everything that only exists to serve it.
 *
 * Two things were wrong before. The exam document was removed on its own, so
 * its entire question bank was orphaned in the collection forever — and because
 * questions are keyed by the string `examId`, recreating an exam under the same
 * id silently adopted the old bank, mixing a deleted paper's questions into a
 * new one. In-progress sessions were left behind the same way.
 *
 * Deletion is also refused once an attempt has been recorded, or once anyone
 * has paid. The review page reads the live question bank to show a candidate
 * what they got wrong, so removing it would break the results of people who
 * already sat — and paid for — the paper; and a purchase with no attempt yet is
 * someone still waiting to sit it. Deactivating takes it off sale without
 * destroying their history or their entitlement, which is what an admin
 * reaching for delete almost always means.
 */
export async function deleteExam(examId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await dbConnect();

    const attempts = await ExamResult.countDocuments({ examId });
    if (attempts > 0) {
      return {
        error: `Bu imtahan ${attempts} dəfə verilib — silmək tələbələrin nəticələrini sıradan çıxarardı. `
             + 'Bunun əvəzinə deaktiv edin.',
      };
    }

    /*
     * Refused once anyone has paid, for the same reason as attempts above.
     *
     * A purchase with no attempt behind it is someone who bought the paper and
     * has not sat it yet — the person with the strongest claim on it still
     * existing. Deleting the exam and leaving the row behind orphans their
     * entitlement, and because questions and purchases are keyed by the STRING
     * examId, recreating an exam under the same id would silently hand them
     * access to a different paper.
     *
     * The row is not deleted instead: it is a payment record, and destroying
     * one to make an admin form submit work is the wrong trade. Deactivating
     * takes the exam off sale while the purchase — and any refund claim against
     * it — stays intact, which is what an admin reaching for delete here
     * actually wants.
     */
    const purchases = await Purchase.countDocuments({ examId, status: { $ne: 'REFUNDED' } });
    if (purchases > 0) {
      return {
        error: `Bu imtahanı ${purchases} istifadəçi alıb — silmək onların girişini və ödəniş qeydini sıradan çıxarardı. `
             + 'Bunun əvəzinə deaktiv edin.',
      };
    }

    const exam = await ExamModel.findOneAndDelete({ examId });
    if (!exam) return { error: 'İmtahan tapılmadı.' };

    await Promise.all([
      QuestionModel.deleteMany({ examId }),
      ExamSessionModel.deleteMany({ examId }),
    ]);

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
  { name: 'Reading & Writing', type: 'rw',        durationMinutes: 64, questions: 54, breakAfterMinutes: 10, isAdaptive: false, layout: 'single', instructions: '' },
  { name: 'Math',              type: 'math',      durationMinutes: 70, questions: 44, breakAfterMinutes: 0,  isAdaptive: false, layout: 'single', instructions: '' },
];
const IELTS_MODULES = (): ParsedModule[] => [
  { name: 'Listening', type: 'listening', durationMinutes: 30, questions: 40, breakAfterMinutes: 0, isAdaptive: false, layout: 'block',  instructions: '' },
  { name: 'Reading',   type: 'reading',   durationMinutes: 60, questions: 40, breakAfterMinutes: 0, isAdaptive: false, layout: 'block',  instructions: '' },
  { name: 'Writing',   type: 'writing',   durationMinutes: 60, questions: 2,  breakAfterMinutes: 0, isAdaptive: false, layout: 'single', instructions: '' },
];
// No Speaking module: it is not offered, and a module whose bank stays empty
// would only advertise a section the player cannot render.
const TOEFL_MODULES = (): ParsedModule[] => [
  { name: 'Reading',   type: 'reading',   durationMinutes: 35, questions: 20, breakAfterMinutes: 0, isAdaptive: false, layout: 'single', instructions: '' },
  { name: 'Listening', type: 'listening', durationMinutes: 36, questions: 28, breakAfterMinutes: 0, isAdaptive: false, layout: 'single', instructions: '' },
  { name: 'Writing',   type: 'writing',   durationMinutes: 29, questions: 2,  breakAfterMinutes: 0, isAdaptive: false, layout: 'single', instructions: '' },
];
function buildModulesForSeed(exam: SeedExam): ParsedModule[] {
  switch (exam.type) {
    case 'sat':   return SAT_MODULES();
    case 'ielts': return IELTS_MODULES();
    case 'toefl': return TOEFL_MODULES();
    default:      return [{ name: 'İmtahan', type: 'general', durationMinutes: 60, questions: 0, breakAfterMinutes: 0, isAdaptive: false, layout: 'single', instructions: '' }];
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

// ─── Totals backfill ──────────────────────────────────────────────────────────

export type ResyncResult = { updated: number; error?: string };

/**
 * Recompute every exam's advertised totals from its real question bank.
 *
 * `syncExamTotals` now runs on every path that changes a bank or a module list,
 * but exams written before it existed still carry the DECLARED figures — the
 * `questions` number an admin typed per module, and the sum of every module's
 * minutes including ones with nothing behind them. This is the one-off backfill
 * that brings them in line; it is idempotent and safe to run at any time.
 */
export async function resyncExamTotals(
  _prev: ResyncResult,
  _formData: FormData,
): Promise<ResyncResult> {
  try {
    await requireAdmin();
    await dbConnect();
    const exams = await ExamModel.find({}).select('examId').lean();
    for (const e of exams) await syncExamTotals(e.examId);
    revalidatePath('/admin/exams');
    revalidatePath('/exams');
    return { updated: exams.length };
  } catch (err) {
    void captureException(err, { tags: { action: 'resyncExamTotals' } });
    return { updated: 0, error: 'Server xətası baş verdi.' };
  }
}
