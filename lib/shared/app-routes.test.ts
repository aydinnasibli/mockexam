/**
 * VALIDATION — every route pattern handed to `revalidatePath` names a real file.
 *
 * A wrong pattern is not an error at runtime. `revalidatePath` builds a cache
 * tag from whatever string it is given, and a tag nothing carries simply
 * invalidates nothing: no throw, no warning, no log. The route rename that
 * broke this last time (`/exams/[id]` → `[slug]` → `[type]/[id]`) shipped, and
 * the only symptom was an admin's price edit not appearing for an hour.
 *
 * So the pattern is checked against the filesystem instead. `existsSync` on
 * `app/<pattern>/page.tsx` fails on both ways of getting it wrong: a segment
 * renamed out from under the constant, and a route group left out of it.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { EXAM_TYPE_ROUTE, EXAM_PAPER_ROUTE } from './app-routes';

const APP_DIR = path.join(process.cwd(), 'app');

describe('revalidatePath route patterns', () => {
  it.each([
    ['EXAM_TYPE_ROUTE', EXAM_TYPE_ROUTE],
    ['EXAM_PAPER_ROUTE', EXAM_PAPER_ROUTE],
  ])('%s names a page that exists on disk', (_name, route) => {
    expect(existsSync(path.join(APP_DIR, route, 'page.tsx'))).toBe(true);
  });

  /*
   * Both exam routes live under `(public)`. Stating it separately from the
   * `existsSync` check is deliberate: that check would still pass if someone
   * "simplified" the constants by moving the pages out of the route group, and
   * this is the line that then explains why the group mattered.
   */
  it.each([EXAM_TYPE_ROUTE, EXAM_PAPER_ROUTE])(
    '%s keeps the route group Next includes in the cache tag',
    (route) => {
      expect(route.startsWith('/(public)/')).toBe(true);
    },
  );
});
