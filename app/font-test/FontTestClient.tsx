'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Newsreader, Geist, Inter, Plus_Jakarta_Sans, Instrument_Serif, Fraunces,
  Source_Serif_4, IBM_Plex_Sans, Literata, Public_Sans, Bricolage_Grotesque,
  Schibsted_Grotesk, Poppins, Montserrat, Open_Sans, Roboto, Lato,
} from 'next/font/google';

/*
 * Every family here declares latin-ext, not just latin. Azerbaijani needs
 * ə (U+0259), Ə (U+018F), ğ, ş and ı — all outside the ASCII subset. A font
 * that ships latin-ext still isn't proof it draws the schwa, so the page
 * measures that at runtime (see GlyphCheck) rather than trusting the subset.
 */
/* Options are written out per call rather than shared from a constant or
   spread: next/font resolves them at build time and rejects both. */
const newsreader  = Newsreader({ subsets: ['latin', 'latin-ext'], display: 'swap' });
const geist       = Geist({ subsets: ['latin', 'latin-ext'], display: 'swap' });
const inter       = Inter({ subsets: ['latin', 'latin-ext'], display: 'swap' });
const jakarta     = Plus_Jakarta_Sans({ subsets: ['latin', 'latin-ext'], display: 'swap' });
const fraunces    = Fraunces({ subsets: ['latin', 'latin-ext'], display: 'swap' });
const sourceSerif = Source_Serif_4({ subsets: ['latin', 'latin-ext'], display: 'swap' });
const literata    = Literata({ subsets: ['latin', 'latin-ext'], display: 'swap' });
const publicSans  = Public_Sans({ subsets: ['latin', 'latin-ext'], display: 'swap' });
const bricolage   = Bricolage_Grotesque({ subsets: ['latin', 'latin-ext'], display: 'swap' });
const schibsted   = Schibsted_Grotesk({ subsets: ['latin', 'latin-ext'], display: 'swap' });
const montserrat  = Montserrat({ subsets: ['latin', 'latin-ext'], display: 'swap' });
const openSans    = Open_Sans({ subsets: ['latin', 'latin-ext'], display: 'swap' });
const roboto      = Roboto({ subsets: ['latin', 'latin-ext'], display: 'swap' });
// These are not variable fonts — next/font requires an explicit weight.
const plexSans    = IBM_Plex_Sans({ subsets: ['latin', 'latin-ext'], display: 'swap', weight: ['400', '500', '600'] });
const instrument  = Instrument_Serif({ subsets: ['latin', 'latin-ext'], display: 'swap', weight: '400' });
const poppins     = Poppins({ subsets: ['latin', 'latin-ext'], display: 'swap', weight: ['400', '500', '600'] });
const lato        = Lato({ subsets: ['latin', 'latin-ext'], display: 'swap', weight: ['400', '700'] });

/* No webfont: Helvetica is a licensed Linotype face and is not distributable
   here. This stack ships nothing and resolves to whatever the OS has, which
   means Mac visitors get Helvetica Neue, Windows gets Arial and Linux gets
   Liberation Sans — three different faces. Included so the tradeoff can be
   judged rather than assumed. */
const SYSTEM_HELVETICA = '"Helvetica Neue", Helvetica, Arial, sans-serif';

type Pairing = {
  id: string;
  name: string;
  group: 'Seçilmiş' | 'Populyar';
  display: { family: string; label: string };
  body: { family: string; label: string };
  note: string;
};

const CURATED: Pairing[] = [
  { id: 'current',    name: 'Current', group: 'Seçilmiş',
    display: { family: newsreader.style.fontFamily,  label: 'Newsreader' },
    body:    { family: geist.style.fontFamily,       label: 'Geist' },
    note: 'What the site ships today — soft bookish serif over a neutral geometric sans.' },

  { id: 'inter',      name: 'All-sans · Inter', group: 'Seçilmiş',
    display: { family: inter.style.fontFamily,       label: 'Inter' },
    body:    { family: inter.style.fontFamily,       label: 'Inter' },
    note: 'One family, no pairing to maintain. Neutral and technical. Reads modern, but Inter is everywhere.' },

  { id: 'jakarta',    name: 'All-sans · Jakarta', group: 'Seçilmiş',
    display: { family: jakarta.style.fontFamily,     label: 'Plus Jakarta Sans' },
    body:    { family: jakarta.style.fontFamily,     label: 'Plus Jakarta Sans' },
    note: 'Warmer and rounder than Inter, with more personality in the headline sizes.' },

  { id: 'instrument', name: 'Editorial · sharp', group: 'Seçilmiş',
    display: { family: instrument.style.fontFamily,  label: 'Instrument Serif' },
    body:    { family: geist.style.fontFamily,       label: 'Geist' },
    note: 'High-contrast display serif. Elegant and magazine-like; thin strokes need large sizes.' },

  { id: 'fraunces',   name: 'Editorial · warm', group: 'Seçilmiş',
    display: { family: fraunces.style.fontFamily,    label: 'Fraunces' },
    body:    { family: inter.style.fontFamily,       label: 'Inter' },
    note: 'Quirky old-style serif with real character. The most distinctive option here.' },

  { id: 'academic',   name: 'Academic', group: 'Seçilmiş',
    display: { family: sourceSerif.style.fontFamily, label: 'Source Serif 4' },
    body:    { family: plexSans.style.fontFamily,    label: 'IBM Plex Sans' },
    note: 'Sober and institutional. Closest to how real exam boards set their papers.' },

  { id: 'literary',   name: 'Literary', group: 'Seçilmiş',
    display: { family: literata.style.fontFamily,    label: 'Literata' },
    body:    { family: publicSans.style.fontFamily,  label: 'Public Sans' },
    note: 'Literata was drawn for long-form screen reading — strong choice for passage-heavy work.' },

  { id: 'bold',       name: 'Design-forward', group: 'Seçilmiş',
    display: { family: bricolage.style.fontFamily,   label: 'Bricolage Grotesque' },
    body:    { family: schibsted.style.fontFamily,   label: 'Schibsted Grotesk' },
    note: 'Opinionated contemporary grotesque. Highest personality, fastest to date.' },
];

/* The widely-used families. These were left out of the curated set on taste,
   not on any technical grounds — all of them cover Azerbaijani. Judge them
   against the real copy rather than the reputation. */
const POPULAR: Pairing[] = [
  { id: 'poppins',    name: 'Poppins', group: 'Populyar',
    display: { family: poppins.style.fontFamily,     label: 'Poppins' },
    body:    { family: poppins.style.fontFamily,     label: 'Poppins' },
    note: 'Geometric, friendly, extremely common. Watch the body copy: the low x-height relative to the caps makes long paragraphs harder to scan than the headlines suggest.' },

  { id: 'montserrat', name: 'Montserrat + Open Sans', group: 'Populyar',
    display: { family: montserrat.style.fontFamily,  label: 'Montserrat' },
    body:    { family: openSans.style.fontFamily,    label: 'Open Sans' },
    note: 'The default "professional" pairing of the last decade. Safe and legible; reads a little corporate-template.' },

  { id: 'roboto',     name: 'Roboto', group: 'Populyar',
    display: { family: roboto.style.fontFamily,      label: 'Roboto' },
    body:    { family: roboto.style.fontFamily,      label: 'Roboto' },
    note: 'Android’s system font. Neutral and highly legible at small sizes, familiar to the point of invisibility.' },

  { id: 'lato',       name: 'Lato', group: 'Populyar',
    display: { family: lato.style.fontFamily,        label: 'Lato' },
    body:    { family: lato.style.fontFamily,        label: 'Lato' },
    note: 'Humanist and slightly warm. Ages well, but only ships 400/700 here, so mid-weights are unavailable.' },

  { id: 'helvetica',  name: 'Helvetica (sistem)', group: 'Populyar',
    display: { family: SYSTEM_HELVETICA,             label: 'Helvetica Neue / Arial' },
    body:    { family: SYSTEM_HELVETICA,             label: 'Helvetica Neue / Arial' },
    note: 'No font file is downloaded — fastest possible load. But it is NOT one typeface: Mac shows Helvetica Neue, Windows shows Arial, Linux shows Liberation Sans. You are previewing your own machine’s version, not what most visitors will see.' },
];

const PAIRINGS: Pairing[] = [...CURATED, ...POPULAR];
const GROUPS = ['Seçilmiş', 'Populyar'] as const;

const HEADLINE = 'SAT, IELTS və DİM üçün sınaq imtahanları.';
const LEDE =
  'Gələcəyinizi sınağa çəkin. On minlərlə tələbə real imtahan formatında hazırlaşır. ' +
  'Süni intellekt yön verir, statistika doğrulayır — heç bir şey təxmin deyil.';
const BODY =
  'Hər sınaq College Board, ETS, Cambridge və DİM rəsmi formatları ilə tam üst-üstə düşür. ' +
  'Adaptive sual seçimi və modul strukturu real imtahanla eynidir. Səhv etdiyiniz hər sual üçün ' +
  'addım-addım həll yolu, müvafiq formul vərəqi və qısa video izah təqdim olunur.';
const PASSAGE =
  'The following text is adapted from a 2019 study of urban heat islands. Cities absorb and ' +
  'retain more solar radiation than surrounding rural areas, a consequence of both their ' +
  'materials and their geometry. Asphalt and concrete store heat through the day and release ' +
  'it slowly after sunset, while the vertical faces of buildings trap radiation that would ' +
  'otherwise escape to the sky. The result is a measurable temperature differential that ' +
  'persists well into the night.';

/* The Azerbaijani-specific glyphs plus the pairs that most often collapse
   into one shape in fonts that only half-support the language. */
const GLYPHS = 'ə Ə ğ Ğ ş Ş ı I İ i ç Ç ö Ö ü Ü';

/**
 * Detects whether a family actually draws U+0259 rather than falling back.
 * A missing glyph is served by the fallback face, so the schwa renders at a
 * different advance width than it does in a font that really has it. Compare
 * the candidate against a deliberately nonexistent family: identical widths
 * mean both fell back, i.e. the candidate has no schwa.
 */
function measure(text: string, family: string): number {
  const c = document.createElement('canvas').getContext('2d');
  if (!c) return 0;
  c.font = `32px ${family}`;
  return c.measureText(text).width;
}

function GlyphCheck({ pairings }: { pairings: Pairing[] }) {
  const [results, setResults] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    let cancelled = false;
    // Wait for the webfonts to actually load, otherwise every measurement is
    // of the fallback and every font looks broken.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      const out: Record<string, boolean | null> = {};
      for (const p of pairings) {
        for (const f of [p.display, p.body]) {
          if (out[f.label] !== undefined) continue;
          const bogus = measure('ə', '"__no_such_family__", monospace');
          const real = measure('ə', `${f.family}, "__no_such_family__", monospace`);
          out[f.label] = Math.abs(real - bogus) > 0.01;
        }
      }
      setResults(out);
    });
    return () => { cancelled = true; };
  }, [pairings]);

  const entries = Object.entries(results);
  if (entries.length === 0) return <p className="text-sm text-ink-mute">Measuring glyph coverage…</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([label, ok]) => (
        <span
          key={label}
          className={`text-xs px-2.5 py-1 rounded-full border ${
            ok ? 'border-rule text-ink-soft' : 'border-error text-error font-semibold'
          }`}
        >
          {ok ? '✓' : '✕'} {label}
        </span>
      ))}
    </div>
  );
}

export default function FontTestClient() {
  const [activeId, setActiveId] = useState('current');
  const active = useMemo(
    () => PAIRINGS.find(p => p.id === activeId) ?? PAIRINGS[0],
    [activeId],
  );

  // The pairing is applied by overriding the two font tokens the whole design
  // system already reads. Inline style is deliberate here: the value is chosen
  // at runtime, which is the one thing a utility class cannot express.
  const vars = {
    '--font-display': active.display.family,
    '--font-sans': active.body.family,
  } as React.CSSProperties;

  return (
    <main className="min-h-screen bg-bg">

      {/* Controls */}
      <div className="sticky top-0 z-20 nav-premium border-b border-rule">
        <div className="max-w-280 mx-auto px-6 py-4">
          <div className="flex items-baseline justify-between gap-4 mb-3 flex-wrap">
            <h1 className="font-sans text-base font-semibold text-ink m-0">Font seçimi</h1>
            <p className="text-xs text-ink-mute m-0">
              Seçim yalnız bu səhifəyə tətbiq olunur — sayt dəyişmir.
            </p>
          </div>
          {GROUPS.map(g => (
            <div key={g} className="flex flex-wrap items-center gap-2 mb-2 last:mb-0">
              <span className="text-xs font-semibold uppercase tracking-widest text-ink-mute w-20 shrink-0">
                {g}
              </span>
              {PAIRINGS.filter(p => p.group === g).map(p => (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  aria-pressed={p.id === activeId}
                  className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-colors ${
                    p.id === activeId
                      ? 'bg-ink text-bg border-ink'
                      : 'bg-transparent text-ink-soft border-rule hover:border-ink-faint'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-280 mx-auto px-6 py-10">

        {/* Azerbaijani glyph coverage */}
        <section className="mb-12">
          <div className="eyebrow mb-3">Azərbaycan hərfləri</div>
          <p className="text-sm text-ink-soft mb-4 max-w-160">
            Hər şrift ə, Ə, ğ, ş, ı hərflərini çəkməlidir. Aşağıdakı nişan avtomatik
            yoxlamadır: ✕ o deməkdir ki, şrift həmin hərfi əvəzləyici (fallback) ilə göstərir.
          </p>
          <GlyphCheck pairings={PAIRINGS} />
        </section>

        {/* Triage: same headline in every pairing */}
        <section className="mb-16">
          <div className="eyebrow mb-4">Hamısı bir baxışda</div>
          <div className="border-t border-rule">
            {PAIRINGS.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={`w-full text-left py-6 border-b border-rule group ${
                  i > 0 && p.group !== PAIRINGS[i - 1].group ? 'border-t-2 border-t-ink mt-6' : ''
                }`}
                style={{ '--font-display': p.display.family } as React.CSSProperties}
              >
                <div className="flex items-baseline justify-between gap-4 mb-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-widest text-ink-mute">
                    {p.name}
                  </span>
                  <span className="text-xs text-ink-mute">
                    {p.display.label} · {p.body.label}
                  </span>
                </div>
                <span className="font-display block text-2xl md:text-4xl leading-tight tracking-tight text-ink group-hover:opacity-70 transition-opacity">
                  {HEADLINE}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Full specimen in the selected pairing */}
        <section style={vars}>
          <div className="eyebrow mb-2">Tam nümunə</div>
          <p className="text-sm text-ink-mute mb-8">
            {active.display.label} + {active.body.label} — {active.note}
          </p>

          <div className="border-t border-rule pt-10">

            {/* Hero, at the real responsive sizes */}
            <h2 className="font-display font-normal text-4xl md:text-6xl lg:text-7xl leading-none tracking-tight text-ink mb-6">
              {HEADLINE}
            </h2>
            <p className="font-display font-normal text-xl md:text-2xl leading-normal text-ink-soft mb-12 max-w-160">
              {LEDE}
            </p>

            {/* Section heading + body */}
            <h3 className="font-display font-normal text-3xl md:text-4xl leading-tight tracking-tight text-ink mb-4">
              Üç prinsipdə qurulan bir platforma.
            </h3>
            <p className="text-base leading-relaxed text-ink-soft mb-12 max-w-160">
              {BODY}
            </p>

            {/* Numbers — tabular figures matter for scores and timers */}
            <div className="grid grid-cols-3 gap-6 border-y border-rule py-8 mb-12">
              {[['Müddət', '134'], ['Sual', '98'], ['Bal', '1480']].map(([label, value]) => (
                <div key={label}>
                  <div className="eyebrow mb-2">{label}</div>
                  <div className="font-display tabular-nums lining-nums text-ink text-3xl md:text-4xl leading-none tracking-tight">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Cards */}
            <div className="grid md:grid-cols-2 gap-4 mb-12">
              {[
                { t: 'Akademik nəzarət', d: 'Hər sual əvvəlcə mövzu üzrə mütəxəssis, sonra isə dil və UX redaktoru tərəfindən yoxlanılır.' },
                { t: 'Şəffaf qiymət', d: 'Gizli ödəniş, avtomatik yeniləmə, abunəlik tələsi yoxdur. Ödədiyiniz tam olaraq aldığınızdır.' },
              ].map(c => (
                <div key={c.t} className="card-new">
                  <h4 className="font-display font-medium text-lg leading-tight tracking-tight text-ink mb-3">{c.t}</h4>
                  <p className="text-base leading-relaxed text-ink-soft m-0">{c.d}</p>
                </div>
              ))}
            </div>

            {/* The passage — the longest sustained read in the product */}
            <div className="eyebrow mb-3">İmtahan mətni (17px)</div>
            <div className="passage-body text-ink max-w-160 mb-12 p-6 bg-surface rounded-2xl border border-rule">
              <p className="passage-title">Urban Heat Islands</p>
              <p className="passage-para">{PASSAGE}</p>
            </div>

            {/* Glyph specimen at display size */}
            <div className="eyebrow mb-3">Hərflər</div>
            <p className="font-display text-ink text-3xl md:text-5xl leading-tight tracking-tight mb-3">{GLYPHS}</p>
            <p className="text-ink text-xl mb-16">{GLYPHS}</p>

          </div>
        </section>
      </div>
    </main>
  );
}
