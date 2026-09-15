/**
 * VALIDATION — the order a register lists its papers in.
 *
 * Two things read `registerOrder`: the rows the visitor sees, and the
 * `ItemList` JSON-LD whose `position` values claim to describe those rows. The
 * cases below pin the ordering itself; sharing the function is what keeps the
 * two readers on it.
 */
import { describe, expect, it } from 'vitest';
import type { PublicExam } from '@/lib/db/exams';
import { catalogTypes, examCodes, registerOrder } from './structure';

/** Only the fields the ordering reads. */
function paper(id: string, type: string): PublicExam {
  return { id, type } as PublicExam;
}

/** Catalog order is database order: newest first, types interleaved. */
const CATALOG = [
  paper('ielts-2', 'ielts'),
  paper('sat-1', 'sat'),
  paper('ielts-1', 'ielts'),
  paper('gre-1', 'gre'),
  paper('sat-2', 'sat'),
];

const ids = (exams: PublicExam[]) => exams.map((e) => e.id);

describe('catalogTypes', () => {
  it('follows EXAM_TYPES order, not database order', () => {
    // EXAM_TYPES lists sat before ielts, and gre after both.
    expect(catalogTypes(CATALOG)).toEqual(['sat', 'ielts', 'gre']);
  });

  it('appends a stored type EXAM_TYPES does not know', () => {
    expect(catalogTypes([paper('x', 'legacy'), paper('s', 'sat')])).toEqual(['sat', 'legacy']);
  });
});

describe('registerOrder', () => {
  it('groups by type and keeps catalog order within a type', () => {
    expect(ids(registerOrder(CATALOG))).toEqual(['sat-1', 'sat-2', 'ielts-2', 'ielts-1', 'gre-1']);
  });

  it('lists a filtered register in the same relative order', () => {
    expect(ids(registerOrder(CATALOG, 'ielts'))).toEqual(['ielts-2', 'ielts-1']);
  });

  /** The register prints codes beside the rows; they must read 01, 02, … down the page. */
  it('agrees with the codes the register prints', () => {
    const codes = examCodes(CATALOG, (type) => type.toUpperCase());
    expect(registerOrder(CATALOG, 'sat').map((e) => codes.get(e.id))).toEqual(['SAT—01', 'SAT—02']);
  });

  /**
   * The case string comparison of codes got wrong: `SAT—100` sorts before
   * `SAT—99` as text. Order within a type is catalog order, whatever the count.
   */
  it('keeps catalog order past 99 papers of one type', () => {
    const many = Array.from({ length: 101 }, (_, i) => paper(`sat-${i + 1}`, 'sat'));
    expect(ids(registerOrder(many)).slice(98)).toEqual(['sat-99', 'sat-100', 'sat-101']);
  });

  it('does not reorder the caller’s array', () => {
    const input = [...CATALOG];
    registerOrder(input);
    expect(ids(input)).toEqual(ids(CATALOG));
  });
});
