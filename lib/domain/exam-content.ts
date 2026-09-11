// Client-safe: no database imports. Rendered by the public hub pages and read
// by the sitemap, so it must stay importable from both.

import { isExamType, type ExamType } from './exam-types';

/**
 * The editorial record behind one exam type's hub page.
 *
 * Why this exists at all: /exams?type=sat was never a landing page. The filter
 * ran in `useState`, so the server sent byte-identical HTML for every value and
 * only the <title> changed — Google saw one page wearing six titles and indexed
 * none of them. The fix is a real route per type, and a real route needs
 * something to say.
 *
 * Why it is DATA and not six hand-built pages: the catalog is about to take on
 * driving-licence and magistratura papers, and more after those. A new exam
 * type has to cost one record, not one page build, or the fifth one never gets
 * written.
 *
 * ── On the empty fields ──
 *
 * `facts`, `scoring` and parts of `faq` are deliberately empty for the three
 * Azerbaijani exams. Those pages exist to be the authoritative source for
 * "magistratura imtahanı neçə sualdır" and its neighbours, and the entire value
 * of that is being RIGHT. Question counts, pass marks and block structures for
 * DİM and DYP papers are set by regulation, change between admission years, and
 * are not something to reconstruct from memory — a confidently wrong pass mark
 * is worse for this site than a page that stays quiet, because it is the exact
 * claim a candidate would act on.
 *
 * So those slots stay empty until a human fills them from the current official
 * source, and `HubSection` below simply renders nothing for an empty array.
 * The international formats (IELTS, SAT, TOEFL, CEFR) are stable, published in
 * English by the boards themselves, and are stated here.
 */
export interface ExamTypeContent {
  /**
   * URL segment: `/exams/<slug>`.
   *
   * English, matching the stored type value and every other route in the app
   * (`/exams`, `/checkout`, `/dashboard`, `/legal/terms`). An earlier draft used
   * Azerbaijani slugs to put the search phrase in the URL; that is a weak
   * ranking signal at best, and it is not worth having one part of the URL
   * space speak a different language from the rest.
   *
   * The Azerbaijani lives where it actually does the work — `h1`, `metaTitle`,
   * `metaDescription` and the body copy, which is what search engines and
   * answer engines read.
   */
  slug: string;
  /** Visible page heading. */
  h1: string;
  /** Bare <title>; the root layout appends " — Testcentre". */
  metaTitle: string;
  metaDescription: string;
  /** Short label for breadcrumbs and the catalog tab row. */
  shortLabel: string;
  /** Lead paragraphs. First one carries the query this page is answering. */
  intro: string[];
  /** Factual spec rows. Empty = section omitted. */
  facts: ReadonlyArray<{ label: string; value: string }>;
  /** How the paper is scored, in prose. Empty = section omitted. */
  scoring: readonly string[];
  /** Rendered as <details> AND emitted as FAQPage JSON-LD. */
  faq: ReadonlyArray<{ q: string; a: string }>;
  /**
   * schema.org class for this program.
   *
   * `Course` is the right fit for preparation with an assessment attached;
   * `EducationalOccupationalProgram` is for a qualification that licenses you
   * to do something, which is what a driving licence actually is.
   */
  schemaType: 'Course' | 'EducationalOccupationalProgram';
}

/**
 * `dim` covers both the school-leaving and the university-admission paper.
 *
 * Kept as one record because the stored column value is `dim` on live rows and
 * splitting the type is a migration, not a content edit. The SLUG stays `dim`
 * for consistency with the other routes, but the page no longer CALLS itself
 * DİM: that is the agency administering the exam, and nobody searches for an
 * agency. They search "buraxılış imtahanı" and "qəbul imtahanı", so those are
 * the words in the h1, the title and the description.
 *
 * Worth revisiting: those are two different exams with two different audiences,
 * and one page cannot rank first for both. Splitting `dim` into `buraxilis` and
 * `qebul` is the better end state once there are papers for each.
 */
export const EXAM_CONTENT: Partial<Record<ExamType, ExamTypeContent>> = {
  ielts: {
    slug: 'ielts',
    shortLabel: 'IELTS',
    h1: 'IELTS sınaq imtahanları',
    metaTitle: 'IELTS sınaq imtahanı — onlayn, rəsmi formatda',
    metaDescription:
      'IELTS imtahanına hazırlıq üçün rəsmi formata uyğun onlayn sınaqlar. Dinləmə, oxu və yazı modulları, vaxt limiti, band hesablanması və hər sual üçün izahat.',
    intro: [
      'IELTS (International English Language Testing System) dünyada ən geniş tanınan ingilis dili imtahanlarından biridir və universitetlər, işəgötürənlər və miqrasiya orqanları tərəfindən qəbul edilir. Nəticə keçdi/keçmədi şəklində deyil, 0-dan 9-a qədər band şkalası ilə verilir.',
      'Testcentre-dəki IELTS sınaqları rəsmi imtahanın quruluşunu təkrarlayır: hər modul öz vaxt limiti ilə işləyir, dinləmə materialı bir dəfə səslənir və nəticə rəsmi çevirmə cədvəli ilə banda çevrilir — faizlə deyil.',
    ],
    facts: [
      { label: 'Şkala', value: '0–9 band, yarım bandlarla' },
      { label: 'Modullar', value: 'Listening, Reading, Writing, Speaking' },
      { label: 'Listening', value: '40 sual' },
      { label: 'Reading', value: '40 sual, 60 dəqiqə' },
      { label: 'Writing', value: '2 tapşırıq, 60 dəqiqə' },
      { label: 'Növ', value: 'Academic və General Training' },
    ],
    scoring: [
      'Listening və Reading modullarında 40 sualdan neçəsinə düzgün cavab verdiyiniz rəsmi çevirmə cədvəli ilə banda çevrilir. Academic və General Training Reading üçün cədvəllər FƏRQLİDİR — General Training-də eyni band üçün daha çox düzgün cavab tələb olunur.',
      'Writing-də iki tapşırıq ayrı-ayrılıqda qiymətləndirilir və Task 2 iki dəfə çox çəkiyə malikdir: yekun band (Task 1 + 2 × Task 2) / 3 düsturu ilə hesablanır.',
      'Ümumi band modul bandlarının ortalamasıdır və ən yaxın yarım banda yuvarlaqlaşdırılır. 0.25 yuxarı, 0.75 isə növbəti tam banda yuvarlaqlaşır.',
    ],
    faq: [
      {
        q: 'Academic və General Training arasında fərq nədir?',
        a: 'Listening və Speaking hər ikisində eynidir. Reading və Writing fərqlənir, həmçinin Reading üçün band cədvəlləri fərqlidir — General Training-də eyni band üçün daha çox düzgün cavab lazımdır.',
      },
      {
        q: 'Sınaqda dinləmə materialını təkrar dinləyə bilərəmmi?',
        a: 'Xeyr. Rəsmi imtahandakı kimi hər yazı yalnız bir dəfə səslənir — bu qayda sınaqda da tətbiq olunur.',
      },
      {
        q: 'Band necə hesablanır?',
        a: 'Düzgün cavabların sayı rəsmi çevirmə cədvəli ilə banda çevrilir, yazı isə rəsmi rubrika üzrə hər kriteriya ayrılıqda qiymətləndirilir.',
      },
      {
        q: 'Sınaqları neçə dəfə təkrar edə bilərəm?',
        a: 'Limitsiz. Hər cəhd ayrıca hesabatla saxlanılır, beləliklə tərəqqinizi cəhddən cəhdə müqayisə edə bilirsiniz.',
      },
    ],
    schemaType: 'Course',
  },

  sat: {
    slug: 'sat',
    shortLabel: 'SAT',
    h1: 'SAT sınaq imtahanları',
    metaTitle: 'SAT sınaq imtahanı — onlayn, rəsmi formatda',
    metaDescription:
      'SAT imtahanına hazırlıq üçün rəsmi formata uyğun onlayn sınaqlar. Adaptiv modullar, vaxt limiti, 400–1600 şkalası üzrə bal və hər sual üçün izahat.',
    intro: [
      'SAT ABŞ və digər ölkələrin universitetlərinə qəbul üçün istifadə olunan standartlaşdırılmış imtahandır. Yekun bal 400–1600 aralığındadır və iki bölmənin — Reading & Writing və Math — şkala ballarının cəmindən ibarətdir.',
      'Testcentre-dəki SAT sınaqları rəsmi rəqəmsal formatı təkrarlayır: hər bölmə modullara bölünür, modullar arasında keçid qaydaları imtahandakı kimi işləyir və nəticə faizlə deyil, şkala balı ilə verilir.',
    ],
    facts: [
      { label: 'Şkala', value: '400–1600' },
      { label: 'Bölmələr', value: 'Reading & Writing, Math' },
      { label: 'Bölmə şkalası', value: 'Hər biri 200–800' },
      { label: 'Format', value: 'Rəqəmsal, modul əsaslı' },
    ],
    scoring: [
      'Hər bölmədə düzgün cavabların sayı 200–800 aralığında şkala balına çevrilir. İki bölmənin şkala balı toplanaraq 400–1600 aralığında yekun balı verir.',
      'Səhv cavab üçün bal silinmir — cavabsız buraxmaqla səhv cavab vermək arasında bal fərqi yoxdur.',
    ],
    faq: [
      {
        q: 'SAT balı necə hesablanır?',
        a: 'Hər bölmədə düzgün cavabların sayı 200–800 şkala balına çevrilir, iki bölmənin balı toplanaraq 400–1600 aralığında yekun bal alınır.',
      },
      {
        q: 'Səhv cavab bal aparırmı?',
        a: 'Xeyr. Cavabsız sual ilə səhv cavab arasında fərq yoxdur, ona görə də hər sualı cavablamaq sərfəlidir.',
      },
      {
        q: 'Kalkulyatordan istifadə edə bilərəmmi?',
        a: 'Math bölməsində sınaq daxilində kalkulyator mövcuddur — rəsmi imtahandakı kimi.',
      },
    ],
    schemaType: 'Course',
  },

  toefl: {
    slug: 'toefl',
    shortLabel: 'TOEFL',
    h1: 'TOEFL sınaq imtahanları',
    metaTitle: 'TOEFL sınaq imtahanı — onlayn, rəsmi formatda',
    metaDescription:
      'TOEFL imtahanına hazırlıq üçün rəsmi formata uyğun onlayn sınaqlar. Dörd bölmə, vaxt limiti, 0–120 şkalası üzrə bal və hər sual üçün izahat.',
    intro: [
      'TOEFL (Test of English as a Foreign Language) akademik mühitdə ingilis dili biliyini ölçən imtahandır və dünya üzrə universitetlərin böyük hissəsi tərəfindən qəbul edilir. Yekun bal 0–120 aralığındadır.',
      'Testcentre-dəki TOEFL sınaqları rəsmi imtahanın bölmə quruluşunu və vaxt limitlərini təkrarlayır, nəticə isə hər bölmə üzrə ayrıca göstərilir.',
    ],
    facts: [
      { label: 'Şkala', value: '0–120' },
      { label: 'Bölmələr', value: 'Reading, Listening, Speaking, Writing' },
      { label: 'Bölmə şkalası', value: 'Hər biri 0–30' },
    ],
    scoring: [
      'Dörd bölmənin hər biri 0–30 aralığında qiymətləndirilir və bunların cəmi 0–120 aralığında yekun balı verir.',
    ],
    faq: [
      {
        q: 'TOEFL balı necə hesablanır?',
        a: 'Hər bölmə 0–30 aralığında qiymətləndirilir və dörd bölmənin cəmi 0–120 aralığında yekun balı verir.',
      },
      {
        q: 'TOEFL, yoxsa IELTS?',
        a: 'Hər ikisi eyni məqsədlə tanınır. Seçim müraciət etdiyiniz qurumun tələbindən və hansı formatın sizə daha rahat gəldiyindən asılıdır — hər ikisinin sınağını keçərək müqayisə edə bilərsiniz.',
      },
    ],
    schemaType: 'Course',
  },

  general_english: {
    slug: 'english-level',
    shortLabel: 'CEFR',
    h1: 'İngilis dili səviyyə testləri (CEFR)',
    metaTitle: 'İngilis dili səviyyə testi — CEFR üzrə onlayn qiymətləndirmə',
    metaDescription:
      'İngilis dili biliyinizi CEFR şkalası (A1–C2) üzrə ölçün. Onlayn səviyyə testləri, dərhal nəticə və hansı səviyyədən davam etməli olduğunuza dair aydın cavab.',
    intro: [
      'CEFR (Common European Framework of Reference) dil biliyini A1-dən C2-yə qədər altı səviyyəyə bölən beynəlxalq şkaladır. IELTS və ya TOEFL kimi konkret bir qurum üçün deyil, ümumi bilik səviyyəsini təyin etmək üçün istifadə olunur.',
      'Bu testlər hazırlığa haradan başlamalı olduğunuzu müəyyən etmək üçündür: səviyyənizi bilmədən IELTS-ə hazırlaşmaq çox vaxt yanlış materialla işləmək deməkdir.',
    ],
    facts: [
      { label: 'Şkala', value: 'A1, A2, B1, B2, C1, C2' },
      { label: 'Başlanğıc', value: 'A1 — ilkin səviyyə' },
      { label: 'Ən yüksək', value: 'C2 — ana dili səviyyəsinə yaxın' },
    ],
    scoring: [
      'Nəticə faizlə göstərilir və uyğun CEFR səviyyəsi ilə birlikdə verilir, beləliklə hansı materialdan davam etməli olduğunuz aydın olur.',
    ],
    faq: [
      {
        q: 'Səviyyəmi bilmirəm, haradan başlamalıyam?',
        a: 'Pulsuz qiymətləndirmə testindən başlayın — nəticə CEFR səviyyənizi göstərir və hansı sınaqların sizə uyğun olduğunu müəyyən edir.',
      },
      {
        q: 'CEFR səviyyəsi IELTS bandına necə uyğun gəlir?',
        a: 'Təxmini uyğunluq var: B2 təqribən 5.5–6.5, C1 isə 7.0–8.0 band aralığına düşür. Bu dəqiq çevirmə deyil, istiqamətləndirici müqayisədir.',
      },
    ],
    schemaType: 'Course',
  },

  /*
   * ── Azerbaijani papers ──
   *
   * Structure only. Every regulated number — question counts, block layout,
   * pass marks, admission-year changes — is left out on purpose; see the note
   * at the top of this file. Fill `facts` and `scoring` from the current
   * official source and the sections appear on their own.
   */
  dim: {
    slug: 'dim',
    shortLabel: 'Buraxılış',
    h1: 'Buraxılış və qəbul imtahanı sınaqları',
    metaTitle: 'Buraxılış və qəbul imtahanı sınaqları — onlayn',
    metaDescription:
      'Buraxılış və qəbul imtahanlarına hazırlıq üçün onlayn sınaqlar. Vaxt limitli bloklar, dərhal nəticə və hər sual üçün izahat.',
    intro: [
      'Buraxılış imtahanı məktəbi bitirmək, qəbul imtahanı isə ali təhsil müəssisəsinə daxil olmaq üçün keçirilən imtahanlardır. Hər ikisi Dövlət İmtahan Mərkəzi tərəfindən təşkil olunur.',
      'Testcentre-dəki sınaqlar imtahanın blok quruluşunu və vaxt limitini təkrarlayır: cavabları göndərdikdən sonra hər sual üçün izahat və mövzu üzrə zəif nöqtələrin təhlili açılır.',
    ],
    facts: [],
    scoring: [],
    faq: [
      {
        q: 'Sınaq nəticəsi necə göstərilir?',
        a: 'Hər cəhd üçün düzgün və səhv cavablar, mövzu üzrə bölgü və hər sual üçün ayrıca izahat verilir.',
      },
      {
        q: 'Sınağı təkrar edə bilərəmmi?',
        a: 'Bəli, limitsiz. Hər cəhd ayrıca saxlanılır və nəticələri müqayisə edə bilirsiniz.',
      },
    ],
    schemaType: 'Course',
  },

  masters: {
    slug: 'masters',
    shortLabel: 'Magistr',
    h1: 'Magistratura imtahanı sınaqları',
    metaTitle: 'Magistratura imtahanı sınaqları — onlayn hazırlıq',
    metaDescription:
      'Magistratura qəbul imtahanına hazırlıq üçün onlayn sınaqlar. Vaxt limitli bloklar, dərhal nəticə və hər sual üçün izahat.',
    intro: [
      'Magistratura imtahanı ali təhsilin magistratura pilləsinə qəbul üçün keçirilən imtahandır. İmtahan həm ümumi qabiliyyət, həm də ixtisas bilikləri üzrə hissələrdən ibarətdir.',
      'Testcentre-dəki magistratura sınaqları imtahanın vaxt rejimini və blok quruluşunu təkrarlayır, nəticə isə hər blok üzrə ayrıca təhlil edilir.',
    ],
    facts: [],
    scoring: [],
    faq: [
      {
        q: 'Sınaq imtahanın formatına uyğundurmu?',
        a: 'Sınaqlar imtahanın blok quruluşuna və vaxt limitinə uyğun qurulub. Hər blok öz vaxtı ilə işləyir.',
      },
      {
        q: 'Nəticəni nə vaxt görürəm?',
        a: 'Sınağı göndərdikdən dərhal sonra — hər sual üçün izahat və mövzu üzrə zəif nöqtələrlə birlikdə.',
      },
    ],
    schemaType: 'Course',
  },

  driving: {
    slug: 'driving',
    shortLabel: 'Sürücülük',
    h1: 'Sürücülük vəsiqəsi imtahanı sınaqları',
    metaTitle: 'Sürücülük vəsiqəsi imtahanı — onlayn sınaq testləri',
    metaDescription:
      'Sürücülük vəsiqəsi nəzəri imtahanına hazırlıq üçün onlayn sınaq testləri. Yol hərəkəti qaydaları üzrə suallar, vaxt limiti və hər sual üçün izahat.',
    intro: [
      'Sürücülük vəsiqəsi almaq üçün nəzəri imtahan yol hərəkəti qaydaları, yol nişanları və təhlükəsizlik üzrə bilikləri yoxlayır.',
      'Testcentre-dəki sınaqlar imtahanın vaxt rejimini təkrarlayır və hər səhv cavab üçün qaydanın izahatını göstərir — beləliklə səhvi yadda saxlamaq əvəzinə səbəbini başa düşürsünüz.',
    ],
    facts: [],
    scoring: [],
    faq: [
      {
        q: 'Suallar rəsmi imtahandakı kimidirmi?',
        a: 'Sınaqlar rəsmi imtahanın mövzu bölgüsünə və format qaydalarına uyğun hazırlanır.',
      },
      {
        q: 'Səhv cavablarımı necə təhlil edə bilərəm?',
        a: 'Hər cəhddən sonra səhv cavablar mövzu üzrə qruplaşdırılır və hər biri üçün qaydanın izahatı verilir.',
      },
    ],
    schemaType: 'EducationalOccupationalProgram',
  },
};

/** Content record for a stored exam type, when the type has a hub page. */
export function examContent(type: string): ExamTypeContent | undefined {
  return EXAM_CONTENT[type as ExamType];
}

/** Every type with a hub page, in `EXAM_TYPES` order via the caller. */
export const CONTENT_TYPES = Object.keys(EXAM_CONTENT) as ExamType[];

/**
 * Reverse lookup: `/exams/driving` → `driving`.
 *
 * Falls back to the raw type value, so EVERY exam type has a working filtered
 * URL the moment it exists — not only the ones that have had editorial copy
 * written for them. `/exams/gre` renders the register filtered to GRE with no
 * copy beneath it; adding a record later fills that in with no routing change.
 *
 * This is what lets the catalog's tab row be plain links: a tab can always
 * point somewhere real.
 */
export function typeForSlug(slug: string): ExamType | undefined {
  const withContent = CONTENT_TYPES.find((t) => EXAM_CONTENT[t]?.slug === slug);
  if (withContent) return withContent;
  return isExamType(slug) ? slug : undefined;
}

/**
 * The URL segment a type occupies: `general_english` → `english-level`.
 *
 * Stored type values and URL segments are deliberately allowed to differ. The
 * value is a database identifier and has to stay stable; the segment is public
 * and has to be readable, which rules out `general_english` with its underscore.
 */
export function typeSlug(type: string): string {
  return EXAM_CONTENT[type as ExamType]?.slug ?? type;
}

/** `driving` → `/exams/driving`. Every type resolves; see `typeForSlug`. */
export function typePath(type: string): string {
  return `/exams/${typeSlug(type)}`;
}

/**
 * The least a caller must hold to name a paper's URL.
 *
 * Named rather than written inline at `examPath` because it is a REQUIREMENT
 * that travels: a mutation that wants its paper re-crawled has to carry the
 * type as far as the ping, and an id alone cannot be turned back into one after
 * the row is gone. `PublicExam` and the admin rows satisfy it structurally, so
 * nothing has to be converted to pass it.
 */
export interface ExamRef {
  id: string;
  type: string;
}

/**
 * Where a paper lives: `/exams/<type slug>/<id>`.
 *
 * The single place any exam URL is constructed. Papers are nested under their
 * type so the two dynamic segments describe two different things — a collection
 * and an item — instead of sharing one segment and needing a resolver to tell
 * them apart. That also removes the collision the resolver could only paper
 * over: an exam whose id happened to be `ielts` is reachable at
 * `/exams/sat/ielts` and shadows nothing.
 */
export function examPath(exam: ExamRef): string {
  return `${typePath(exam.type)}/${exam.id}`;
}
