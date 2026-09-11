// Client-safe: plain strings, no imports.

/**
 * App-router PAGE PATHS, in the form `revalidatePath(path, 'page')` wants.
 *
 * These are not URLs. A URL is what `lib/domain/exam-content.ts` builds; this is
 * the path of a `page.tsx` file inside `app/`, route group and all.
 *
 * The route group is the trap. `revalidatePath` turns its argument into a cache
 * tag by plain string concatenation — `_N_T_` + path + `/page` — and Next builds
 * each page's own tag the same way from its app-directory path, with the group
 * left in. So the page rendered by `app/(public)/exams/[type]/[id]/page.tsx`
 * carries the tag `_N_T_/(public)/exams/[type]/[id]/page`, and the obvious
 * `revalidatePath('/exams/[type]/[id]', 'page')` builds
 * `_N_T_/exams/[type]/[id]/page`, which matches nothing.
 *
 * Nothing reports that. No error, no warning, no revalidation — an admin
 * reprices a paper and the page keeps serving the old price until the hourly
 * `revalidate` expires on its own. That is the whole reason these live in one
 * named place with `app-routes.test.ts` pinning each one to the file it claims
 * to name: the next time these routes move, a test fails instead of the cache
 * quietly going deaf.
 *
 * `/exams` needs no entry. It is not a dynamic route, so the literal-path form
 * of `revalidatePath` matches it through the pathname tag, which carries no
 * route group.
 */

/** `app/(public)/exams/[type]/page.tsx` — one register per exam type. */
export const EXAM_TYPE_ROUTE = '/(public)/exams/[type]';

/** `app/(public)/exams/[type]/[id]/page.tsx` — one paper. */
export const EXAM_PAPER_ROUTE = '/(public)/exams/[type]/[id]';
