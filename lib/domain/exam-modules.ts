// Module-list validation, shared by the admin create/edit form and the JSON
// importer so the two paths cannot drift apart.
//
// Deliberately NOT in a `'use server'` module. Every export of such a module
// becomes a callable Server Action — a public POST endpoint — and this is a
// pure validator that no client needs to reach. It used to live in
// `lib/actions/admin.ts`, which published it as an unauthenticated endpoint for
// no reason.

import { MODULE_TYPES, type ModuleType } from '@/lib/domain/exam-types';

const VALID_MOD_TYPES: ReadonlySet<string> = new Set(MODULE_TYPES.map(t => t.value));

export interface ParsedModule {
  name: string;
  type: ModuleType;
  durationMinutes: number;
  questions: number;
  breakAfterMinutes: number;
  isAdaptive: boolean;
  instructions: string;
}

export function validateModules(raw: unknown): ParsedModule[] | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0)
    return { error: 'Ən azı bir modul əlavə edin.' };

  const modules: ParsedModule[] = [];
  for (const [i, m] of raw.entries()) {
    if (!m || typeof m !== 'object') return { error: `Modul ${i + 1}: yanlış format.` };

    const name = String(m.name ?? '').trim();
    if (!name) return { error: `Modul ${i + 1}: ad tələb olunur.` };
    if (name.length > 100) return { error: `Modul ${i + 1}: ad çox uzundur.` };

    const rawType = String(m.type ?? '');
    if (!VALID_MOD_TYPES.has(rawType)) return { error: `Modul ${i + 1}: yanlış modul növü.` };
    const type = rawType as ModuleType;

    const durationMinutes = Number(m.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 480)
      return { error: `Modul ${i + 1}: müddət 1–480 dəqiqə arasında olmalıdır.` };

    const questions = Number(m.questions ?? 0);
    if (!Number.isFinite(questions) || questions < 0 || questions > 1000)
      return { error: `Modul ${i + 1}: sual sayı 0–1000 arasında olmalıdır.` };

    const breakAfterMinutes = Number(m.breakAfterMinutes ?? 0);
    if (!Number.isFinite(breakAfterMinutes) || breakAfterMinutes < 0 || breakAfterMinutes > 120)
      return { error: `Modul ${i + 1}: fasilə 0–120 dəqiqə arasında olmalıdır.` };

    modules.push({
      name,
      type,
      durationMinutes,
      questions,
      breakAfterMinutes,
      isAdaptive:   !!m.isAdaptive,
      instructions: String(m.instructions ?? '').slice(0, 1000),
    });
  }
  return modules;
}
