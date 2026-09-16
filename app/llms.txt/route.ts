import { getActiveExamsForPrerender } from '@/lib/db/exams';
import { BASE_URL } from '@/lib/shared/seo';
import { CONTENT_TYPES, EXAM_CONTENT, examPath, typePath } from '@/lib/domain/exam-content';

/**
 * /llms.txt — a plain-text map of the site for language models.
 *
 * The convention is young and no assistant is contractually bound to read it,
 * so this is a cheap bet rather than a load-bearing SEO asset. It costs one
 * route and it is the only file on the site that states, in one place and in
 * prose, what Testcentre is and which pages answer which question — which is
 * useful to a human auditor too.
 *
 * Regenerated hourly alongside the sitemap so a newly published paper appears
 * without a redeploy.
 */
export const revalidate = 3600;

export async function GET() {
  /*
   * The build tolerates an unreachable database; a regeneration does not.
   *
   * This read used to be `.catch(() => [])` unconditionally, on the reasoning
   * that "a partial map is worth more than a 500". Under `revalidate` that
   * trade is not the one on offer: the alternative to a 500 is not a 500, it is
   * Next continuing to serve the last good copy while it retries. Swallowing
   * instead replaces a complete map with a paper-less one and caches THAT for
   * an hour — on the one file whose stated purpose is that a newly published
   * paper shows up without a redeploy.
   */
  const exams = await getActiveExamsForPrerender();

  const hubLines = CONTENT_TYPES.map((type) => {
    const c = EXAM_CONTENT[type]!;
    return `- [${c.h1}](${BASE_URL}${typePath(type)}): ${c.metaDescription}`;
  }).join('\n');

  const examLines = exams
    .map(
      (e) =>
        `- [${e.title}](${BASE_URL}${examPath(e)}): ${e.totalQuestions} sual, ` +
        `${e.durationMinutes} dəqiqə, ${e.price} AZN.`,
    )
    .join('\n');

  const body = `# Testcentre

> Azərbaycanın onlayn sınaq imtahanı platforması. Dil, buraxılış/qəbul,
> magistratura, sürücülük vəsiqəsi və digər imtahanlar üçün rəsmi formata uyğun
> onlayn sınaq imtahanları. Hər sınaq vaxt limitli modullarla
> işləyir, nəticə rəsmi çevirmə cədvəli ilə hesablanır və hər sual üçün izahat
> verilir.

Testcentre sınaq imtahanları satır — kurs və ya abunəlik deyil. Bir sınaq bir
dəfə alınır, giriş müddətsizdir və cəhdlərin sayı limitsizdir. Bütün məzmun
Azərbaycan dilindədir.

## İmtahan növləri

${hubLines}

## Açıq sınaqlar

${examLines || '- Hazırda açıq sınaq yoxdur.'}

## Sayt haqqında

- [Ana səhifə](${BASE_URL}/): platformanın icmalı, metod və nümunə sual.
- [Bütün sınaqlar](${BASE_URL}/exams): tam kataloq.
- [Haqqımızda](${BASE_URL}/about): nə etdiyimiz və nə etmədiyimiz.
- [Əlaqə](${BASE_URL}/contact): testcentreaz@proton.me, 24 saat ərzində insan cavabı.

## Qeydlər

- Qiymətlər AZN ilə göstərilir.
- Nəticələr: IELTS üçün 0–9 band, SAT üçün 400–1600 şkala, digərləri üçün faiz.
- Saytda reklam izləməsi yoxdur.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      /*
       * Readable, not rankable. This file restates the site in plain text, and
       * indexed it becomes a thin duplicate that can surface in a results page
       * instead of the hub it summarises. `noindex` keeps it out of search
       * indexes; it does nothing to the agents this file is for, which fetch it
       * directly rather than finding it through a search result. `follow` so
       * the links in it still count as links.
       */
      'X-Robots-Tag': 'noindex, follow',
    },
  });
}
