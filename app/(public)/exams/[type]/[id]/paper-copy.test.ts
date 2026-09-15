/**
 * VALIDATION — the prose a paper page generates about itself.
 *
 * Every sentence is built from the paper's record, so the thing to pin is that
 * it never says something the record makes false: a scale scoring does not
 * produce, a break the paper does not have, a hub section the hub does not
 * render.
 */
import { describe, expect, it } from 'vitest';
import type { PublicExam } from '@/lib/db/exams';
import { SCORE_SCALE } from '../../structure';
import {
  RESULT_SENTENCE, hubTopics, joinAz, paperAbout, siblingPapers, storedDescription,
} from './paper-copy';

type Module = PublicExam['modules'][number];

function mod(name: string, overrides: Partial<Module> = {}): Module {
  return {
    name,
    type: 'mcq',
    durationMinutes: 15,
    questions: 15,
    breakAfterMinutes: 0,
    isAdaptive: false,
    instructions: '',
    layout: 'single',
    ...overrides,
  };
}

/** The live General English A1 paper, as far as these functions read it. */
function paper(overrides: Partial<PublicExam> = {}): PublicExam {
  return {
    id: 'general-english-a1',
    title: 'General English A1 - 1',
    type: 'general_english',
    variant: 'academic',
    description: '',
    tag: '',
    price: 10,
    durationMinutes: 45,
    totalQuestions: 45,
    features: [],
    isActive: true,
    updatedAt: new Date('2026-08-01T00:00:00Z'),
    modules: [mod('Qrammatika'), mod('Oxu'), mod('Dinləmə')],
    ...overrides,
  };
}

describe('joinAz', () => {
  it.each<[string[], string]>([
    [[], ''],
    [['Oxu'], 'Oxu'],
    [['Oxu', 'Dinləmə'], 'Oxu və Dinləmə'],
    [['Qrammatika', 'Oxu', 'Dinləmə'], 'Qrammatika, Oxu və Dinləmə'],
  ])('joins %j as %j', (items, joined) => {
    expect(joinAz(items)).toBe(joined);
  });
});

describe('storedDescription', () => {
  it('returns an admin description that is a sentence, trimmed', () => {
    const text = 'Bu imtahan sizin İngilis dili üzrə A1 səviyyənizi yoxlamaq üçün nəzərdə tutulub.';
    expect(storedDescription({ description: `  ${text}  ` })).toBe(text);
  });

  it('treats a label-length value as no description', () => {
    expect(storedDescription({ description: 'SAT' })).toBeNull();
    expect(storedDescription({ description: '' })).toBeNull();
  });
});

describe('paperAbout', () => {
  it('describes the modules, the questions and the time', () => {
    expect(paperAbout(paper())[0]).toBe(
      'Sınaq 3 moduldan ibarətdir və Qrammatika, Oxu və Dinləmə bölmələrini əhatə edir. ' +
        'Ümumilikdə 45 sual var və cavablamaq üçün 45 dəqiqə verilir.',
    );
  });

  it('counts answering time without the breaks, and states the breaks on their own', () => {
    const [contents] = paperAbout(paper({
      durationMinutes: 170,
      modules: [
        mod('Listening', { durationMinutes: 30, breakAfterMinutes: 10 }),
        mod('Reading', { durationMinutes: 60, breakAfterMinutes: 10 }),
        mod('Writing', { durationMinutes: 60 }),
      ],
    }));
    expect(contents).toContain('cavablamaq üçün 150 dəqiqə verilir.');
    expect(contents).toContain('Modullar arasında cəmi 20 dəqiqə fasilə nəzərdə tutulub.');
  });

  it('never mentions a break the paper does not have', () => {
    expect(paperAbout(paper())[0]).not.toContain('fasilə');
  });

  it('names a repeated module once, by the band the timeline draws', () => {
    const [contents] = paperAbout(paper({
      type: 'sat',
      modules: [mod('Math — Module 1'), mod('Math — Module 2')],
    }));
    expect(contents).toContain('Sınaq 2 moduldan ibarətdir və Math bölməsini əhatə edir.');
  });

  it('says nothing about modules for a paper that declares none', () => {
    expect(paperAbout(paper({ modules: [], totalQuestions: 82, durationMinutes: 150 }))[0])
      .toBe('Ümumilikdə 82 sual var və cavablamaq üçün 150 dəqiqə verilir.');
  });

  it.each([
    ['ielts', '0–9 band'],
    ['sat', '400–1600'],
  ])('reports %s on its own scale', (type, scale) => {
    expect(paperAbout(paper({ type }))[1]).toContain(scale);
  });

  it.each(['general_english', 'toefl', 'dim', 'driving'])('reports %s as a percentage', (type) => {
    expect(paperAbout(paper({ type }))[1]).toContain('düzgün cavabların faizi');
  });

  /** One fact about scoring, stated in two places. See `RESULT_SENTENCE`. */
  it('promises a scale for exactly the types that publish a maximum score', () => {
    expect(Object.keys(RESULT_SENTENCE).sort()).toEqual(Object.keys(SCORE_SCALE).sort());
  });
});

describe('hubTopics', () => {
  const faq = [{ q: 'q', a: 'a' }];

  it('lists every section a full hub renders', () => {
    expect(hubTopics({ facts: [{ label: 'l', value: 'v' }], scoring: ['s'], faq }))
      .toBe('ümumi məlumat, format, bal hesablanması və tez-tez verilən suallar');
  });

  /** The shape of the Azerbaijani hubs today — see the note in `exam-content.ts`. */
  it('does not promise a format or scoring section the hub leaves out', () => {
    expect(hubTopics({ facts: [], scoring: [], faq })).toBe('ümumi məlumat və tez-tez verilən suallar');
  });
});

describe('siblingPapers', () => {
  const catalog = [
    paper({ id: 'b1' }),
    paper({ id: 'ielts-1', type: 'ielts' }),
    paper({ id: 'a2' }),
    paper({ id: 'a1' }),
  ];

  it('lists the rest of the programme in register order, without the paper itself', () => {
    expect(siblingPapers(catalog, { id: 'a1', type: 'general_english' }).shown.map((e) => e.id))
      .toEqual(['b1', 'a2']);
  });

  it('is empty for a paper alone in its programme', () => {
    expect(siblingPapers(catalog, { id: 'ielts-1', type: 'ielts' })).toEqual({ shown: [], more: false });
  });

  it('caps the list and reports that the hub holds more', () => {
    const result = siblingPapers(catalog, { id: 'a1', type: 'general_english' }, 1);
    expect(result.shown.map((e) => e.id)).toEqual(['b1']);
    expect(result.more).toBe(true);
  });
});
