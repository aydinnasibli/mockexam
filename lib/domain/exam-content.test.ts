/**
 * VALIDATION — the hub records as search engines and answer engines read them.
 *
 * Every string in `EXAM_CONTENT` ships twice: as a page, and as metadata or
 * structured data that is quoted out of context. These are the properties of
 * that second life which nothing else checks.
 */
import { describe, expect, it } from 'vitest';
import { CONTENT_TYPES, EXAM_CONTENT } from './exam-content';

const records = CONTENT_TYPES.map((type) => [type, EXAM_CONTENT[type]!] as const);

describe('hub metadata', () => {
  /**
   * Google cuts a snippet at roughly 155–160 characters. Past that the end of
   * the sentence — usually the part saying what the page offers — is replaced
   * by an ellipsis. Counted in code points, so ə and ş count once each.
   */
  it.each(records)('keeps the %s description inside the snippet', (_type, content) => {
    expect([...content.metaDescription].length).toBeLessThanOrEqual(160);
  });

  it.each(records)('gives %s a description that is a sentence, not a label', (_type, content) => {
    expect(content.metaDescription.length).toBeGreaterThanOrEqual(60);
  });
});

describe('hub entities', () => {
  it.each(records)('names the %s entity', (_type, content) => {
    expect(content.entity.name.trim()).not.toBe('');
  });

  /**
   * `sameAs` asserts an identity, so a malformed or off-site URL is worse than
   * none. The values themselves were confirmed against Wikipedia's API when
   * they were written; this pins the SHAPE, so a typo or a pasted mobile or
   * search URL fails here rather than quietly pointing a search engine at the
   * wrong thing.
   */
  it.each(records)('points %s only at canonical Wikipedia and Wikidata URLs', (_type, content) => {
    for (const url of content.entity.sameAs ?? []) {
      expect(url).toMatch(
        /^https:\/\/(en\.wikipedia\.org\/wiki\/[A-Za-z0-9_()%-]+|www\.wikidata\.org\/wiki\/Q\d+)$/,
      );
    }
  });

  it('never points two programmes at the same entity', () => {
    const all = records.flatMap(([, content]) => content.entity.sameAs ?? []);
    expect(new Set(all).size).toBe(all.length);
  });
});
