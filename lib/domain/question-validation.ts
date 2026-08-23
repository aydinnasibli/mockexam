/**
 * Whether a question can actually be answered and marked.
 *
 * These rules used to live inline in the JSON importer, so the importer refused
 * an `open` question with no `openAnswers` while `addQuestion`/`updateQuestion`
 * accepted the identical document. That is not a cosmetic gap: an open question
 * with no accepted answers is worth one mark in `gradeAnswers`, always earns
 * zero, and still counts in the denominator — an unanswerable question that
 * silently lowers every candidate's score. The same is true of a `matching`
 * question whose `correctMatching` is shorter than its `matchItems`: the extra
 * dropdowns render but can never earn a mark.
 *
 * Pure: no I/O, no schema types, so both write paths and the unit tests share
 * exactly one definition of "gradable".
 */

/** The question fields these rules depend on. All optional — callers pass partials. */
export interface ValidatableQuestion {
  type?: string;
  stem?: string;
  options?: string[];
  openAnswers?: string[];
  correctIndex?: number;
  matchItems?: string[];
  correctMatching?: number[];
  minWords?: number;
  maxWords?: number;
}

/**
 * Returns an error message, or null when the question is gradable.
 *
 * `label` prefixes the message so the importer can say which row failed; the
 * single-question admin form passes nothing and gets a bare sentence.
 */
export function validateQuestion(q: ValidatableQuestion, label = ''): string | null {
  const at = label ? `${label}: ` : '';
  const type = q.type ?? 'mcq';

  // A writing task carries its prompt in `passage`/`rubric`, so a blank stem is
  // legitimate there and only there.
  if (!q.stem?.trim() && type !== 'writing') {
    return `${at}sual mətni (stem) boş ola bilməz.`;
  }

  if (type === 'mcq') {
    if (!q.options || q.options.length < 2) {
      return `${at}MCQ sualında ən azı 2 seçim olmalıdır.`;
    }
    if (q.correctIndex == null || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      return `${at}correctIndex seçimlər aralığında olmalıdır (0–${q.options.length - 1}).`;
    }
  }

  if (type === 'open' && !q.openAnswers?.some(a => a.trim())) {
    return `${at}açıq sual üçün ən azı bir düzgün cavab (openAnswers) lazımdır.`;
  }

  if (type === 'matching') {
    if (!q.matchItems?.length || !q.options?.length) {
      return `${at}uyğunlaşdırma sualı üçün matchItems və options tələb olunur.`;
    }
    // One mark per item, so a short key is a silently unmarkable dropdown.
    if (q.correctMatching?.length !== q.matchItems.length) {
      return `${at}correctMatching uzunluğu matchItems ilə eyni olmalıdır (${q.matchItems.length}).`;
    }
    const outOfRange = q.correctMatching.find(m => m >= q.options!.length || m < 0);
    if (outOfRange !== undefined) {
      return `${at}correctMatching dəyəri ${outOfRange} seçimlər aralığından kənardadır.`;
    }
  }

  if (type === 'writing' && q.minWords != null && q.maxWords != null
      && q.minWords > 0 && q.maxWords > 0 && q.minWords > q.maxWords) {
    return `${at}minWords maxWords-dan böyük ola bilməz.`;
  }

  return null;
}
