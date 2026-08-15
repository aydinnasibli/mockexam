import { describe, expect, it } from 'vitest';
import { validateModules } from './exam-modules';

const validModule = {
  name: 'Reading',
  type: 'reading',
  durationMinutes: 60,
  questions: 40,
  breakAfterMinutes: 0,
};

/** Narrowing helper — `validateModules` returns either the list or an error. */
function expectModules(result: ReturnType<typeof validateModules>) {
  if ('error' in result) throw new Error(`expected modules, got error: ${result.error}`);
  return result;
}

describe('validateModules', () => {
  it('accepts a well-formed module and fills the optional fields', () => {
    const modules = expectModules(validateModules([validModule]));
    expect(modules).toHaveLength(1);
    expect(modules[0]).toMatchObject({
      name: 'Reading',
      type: 'reading',
      durationMinutes: 60,
      questions: 40,
      breakAfterMinutes: 0,
      isAdaptive: false,
      instructions: '',
    });
  });

  it('rejects an empty or non-array list', () => {
    expect(validateModules([])).toHaveProperty('error');
    expect(validateModules(null)).toHaveProperty('error');
    expect(validateModules('reading')).toHaveProperty('error');
  });

  it('rejects a module type that is not in the schema enum', () => {
    // Would otherwise fail at the Mongoose layer as an opaque 500.
    expect(validateModules([{ ...validModule, type: 'telepathy' }])).toHaveProperty('error');
  });

  it('rejects out-of-range numbers rather than storing them', () => {
    expect(validateModules([{ ...validModule, durationMinutes: 0 }])).toHaveProperty('error');
    expect(validateModules([{ ...validModule, durationMinutes: 481 }])).toHaveProperty('error');
    expect(validateModules([{ ...validModule, questions: -1 }])).toHaveProperty('error');
    expect(validateModules([{ ...validModule, questions: 1001 }])).toHaveProperty('error');
    expect(validateModules([{ ...validModule, breakAfterMinutes: 121 }])).toHaveProperty('error');
  });

  it('rejects non-numeric durations instead of coercing them to NaN', () => {
    expect(validateModules([{ ...validModule, durationMinutes: 'sixty' }])).toHaveProperty('error');
  });

  it('requires a name and caps its length', () => {
    expect(validateModules([{ ...validModule, name: '   ' }])).toHaveProperty('error');
    expect(validateModules([{ ...validModule, name: 'x'.repeat(101) }])).toHaveProperty('error');
  });

  it('truncates instructions to the stored limit', () => {
    const modules = expectModules(
      validateModules([{ ...validModule, instructions: 'x'.repeat(2000) }]),
    );
    expect(modules[0].instructions).toHaveLength(1000);
  });

  it('reports which module failed, so the admin form can point at it', () => {
    const result = validateModules([validModule, { ...validModule, type: 'nope' }]);
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('Modul 2');
  });
});
