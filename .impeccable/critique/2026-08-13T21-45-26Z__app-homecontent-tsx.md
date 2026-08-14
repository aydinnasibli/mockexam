---
target: homepage hero section
total_score: 26
p0_count: 1
p1_count: 3
timestamp: 2026-08-13T21-45-26Z
slug: app-homecontent-tsx
---
# Critique — Homepage hero (`app/HomeContent.tsx` lines 109–251)

Target inspected live at `http://localhost:3000/` at 390, 1024, 1366 and 1440 px.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Nothing marks the right-hand composition as an illustration; it reads as a live session |
| 2 | Match System / Real World | 3 | "1:1 Format uyğunluğu" is a rhetorical ratio sitting in a row of real measurements |
| 3 | User Control and Freedom | 3 | Two clean paths, anchor jump respects reduced motion |
| 4 | Consistency and Standards | 3 | Figure row misaligns at mobile; contrast standard enforced on `ink-mute` but not on the ink card |
| 5 | Error Prevention | 2 | Composition clips itself from 1024–1400px; nothing in the layout prevents it |
| 6 | Recognition Rather Than Recall | 1 | Above the fold the visitor cannot learn which exams exist |
| 7 | Flexibility and Efficiency | 2 | No path from the hero to a specific exam; the program strip sits below the fold |
| 8 | Aesthetic and Minimalist Design | 3 | Genuinely composed, but Roboto gives it no voice and the canvas has 101px of dead height |
| 9 | Error Recovery | 3 | Not exercised by a hero; nothing broken |
| 10 | Help and Documentation | 3 | "Nümunə sual" is a strong proof affordance |
| **Total** | | **26/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**Does this look AI-generated? No.** This is the honest headline. It has a real point of view: bone ground, ink black, hairline rules, mono numerals set as printed measurements, numbered sections. Nobody would look at it and say "an AI made that." It reads as designed by a person with a reference in mind.

Two qualifications:

1. **The lane is saturated.** Mono micro-labels + ruled separators + monochrome restraint + numbered sections + figure captions is the editorial-typographic family that impeccable's brand register flags as the second-order reflex. Here it partly earns itself: this is an exam product, so "official document" is a real referent rather than costume. But it is one tier from the trap.
2. **The typeface is the reflex.** `--font-display` and `--font-sans` both resolve to Roboto. On a page with zero imagery, typography carries 100% of the visual weight, and the face carrying it is Android's system font.

**Automated detection:** the bundled detector (`npx impeccable detect`) never completed — it pulls Puppeteer/Chromium on first run and was still downloading after 5 minutes. Substituted axe-core against the live hero, which produced the contrast findings below.

## Overall Impression

The hero has genuine taste and one specific, expensive flaw: **at the widths most people actually browse at, half of it is cut off.**

From 1024px to roughly 1400px the section's `overflow-hidden` amputates the right-hand composition. At 1024 the exam preview loses 335 of its 536 pixels — options B and D are gone, the question truncates mid-formula at "3x² − 5x +". At 1366, still 29px clipped. That range covers 1366×768 (the most common laptop resolution worldwide) and 1280×800. The design only resolves correctly above ~1400px.

The single biggest opportunity: the hero currently says *how* the product feels (official, timed, precise) but never says *what it is for*. A visitor who does not already know Testcentre cannot learn from this fold that it covers SAT, DİM, IELTS, TOEFL and GRE.

## What's Working

**The figure row is the best idea on the page.** `05 / 11 / 1:1` in JetBrains Mono Light at 32px with tabular numerals, sitting on a full-width ink rule, divided by hairlines. It reads as a printed specification sheet, not a SaaS stat bar. The `padStart(2, "0")` on the count is a real detail — "05" is a catalogue number, "5" would be a boast. It is the hero-metric template's structure redeemed by genuinely committed execution.

**The data integrity is exemplary.** `page.tsx` derives the strip status, the hero's open-exam figure and the CTA price rail from one grouping, so the page cannot advertise a count and a price that disagree. The DİM `toLowerCase()` comment documents a real indexed-URL bug. Most landing pages hard-code these numbers.

**Motion restraint.** One orchestrated entrance (700ms left, 800ms @120ms canvas, 800ms @300ms score card), one easing curve, `both` fill mode, and a reduced-motion block that correctly kills delays as well as durations — with a comment explaining why the delays had to go. That is more care than most production sites take.

## Priority Issues

### [P0] The hero composition is clipped from 1024px to ~1400px

**What**: The right column is `lg:grid-cols-[600px_1fr]` with a fixed 600px left column, but the absolutely-positioned exam card needs 640px of room (`lg:left-26` + `lg:w-134`). It only gets that above ~1400px viewport width. Below, `overflow-hidden` on the section cuts it.

Measured: at 1024px, exam preview clipped **335px**, score card clipped **71px**. At 1366px, exam preview clipped **29px**.

**Why it matters**: The product proof is the composition. On a 1366×768 laptop the visitor sees a headline, a truncated math question, and half a chart. It reads as a rendering bug, which is fatal for a product whose entire pitch is "we reproduce the official format exactly."

**Fix**: Drop the fixed `600px` left column for a fractional or `minmax()` track, and scale the canvas with container units instead of fixed `lg:w-134` / `lg:left-26` / `lg:h-150`. Or move the overlap composition to an `xl:` breakpoint and let `lg` use the stacked layout that already works.

**Suggested command**: `impeccable adapt`

### [P1] Above the fold, the page never says which exams it covers

**What**: At 1440×900 the hero occupies exactly 108–900px. The program strip (SAT / DİM / IELTS / TOEFL / GRE / GMAT with live counts) begins at exactly 900px — one pixel below the fold. The headline names no programme, and the subhead, "İmtahan gününü əvvəlcədən yaşayın," names no programme either. The only clue is `SAT · Math · Module II` at 10px inside the preview card, which is the first thing clipped at laptop widths.

**Why it matters**: A visitor arriving from search for "IELTS sınaq" has no confirmation they are in the right place. The code comment says the subhead deliberately names no programme because listing three of six undersold the catalogue and the strip below enumerates them honestly. The reasoning is sound; the placement is not. The honest list needs to be *in* the fold, not adjacent to it.

**Fix**: Pull the program strip up into the hero's bottom edge, or trade the `1:1` figure for a live programme count. Reducing the hero's `lg:pb-26` alone would lift the strip into view.

**Suggested command**: `impeccable layout`

### [P1] WITHDRAWN — "the overlap does not overlap"

This finding was wrong and is retracted. The composition's interlock is
**horizontal**: the ink card juts left past the inset preview card. The 8px
vertical separation is deliberate adjacency, not a failed overlap. Forcing a
vertical overlap makes the ink card cover answer options C and D. The original
geometry was correct; only its brittleness (fixed offsets against a fixed
column height) needed changing.

### [P1] Six WCAG AA contrast failures, all inside the score card

**What**: axe-core against the live hero, WCAG 2.1 AA:

| Element | Class | Ratio | Required |
|---|---|---|---|
| `SAT` | `text-bg/35` | **3.12** | 4.5 |
| `cəhd 01` / `02` / `03` | `text-bg/40` | **3.71** | 4.5 |
| `1180` / `1272` | `text-bg/45` | **4.33** | 4.5 |

All at 10px, all on `#1A1A1A`.

**Why it matters**: `globals.css` carries a comment documenting that `ink-mute` was raised from `#9A9A92` to `#6E6E66` specifically to clear 4.5:1 on all three page backgrounds. That standard was set deliberately and then not applied to the ink surfaces. This is the project's own bar, missed in one place.

**Fix**: Raise `text-bg/35` and `text-bg/40` to `/55`, and `text-bg/45` to `/55`. `text-bg/50` already passes at 4.89, so `/55` is a safe floor for 10px on ink.

**Suggested command**: `impeccable audit`

### [P1] The mobile figure row is visibly misaligned

**What**: At 390px, the row is `flex items-end`, but the labels wrap unevenly: "Açıq sınaq" is one line (15px), "Analiz ölçüsü" and "Format uyğunluğu" are two (30px). With `items-end`, cell 1 bottom-aligns and its numeral sits **15px lower** than the other two. The hairline dividers also render at unequal heights (71px vs 86px).

**Why it matters**: This is the one moment where the design's central claim, precision, is contradicted by the design itself. A row of measurements that does not line up undermines a product selling exact format reproduction. And it lands on the majority-traffic device.

**Fix**: `items-stretch` with the numerals in a fixed-height top row, or shorten the labels so all three fit on one line at 390px, or drop to a two-column arrangement below `sm`.

**Suggested command**: `impeccable adapt`

### [P2] The typeface has no voice

**What**: `--font-display` and `--font-sans` both resolve to Roboto. The h1 renders Roboto Light 88px at -0.042em. The site previously paired Newsreader with Geist and collapsed to a single family.

**Why it matters**: This hero has zero imagery. Typography carries the entire visual load, and the face carrying it is the most neutral grotesk in circulation. Everything else here is specific: the bone ground, the ink rules, the tabular mono. The face is the one element chosen by default. `globals.css` already anticipates this — the tokens are kept separate precisely so a display face is a one-line change.

**Fix**: Keep JetBrains Mono for numerals and labels; give the display role a face with a position. Given the "official document, precisely reproduced" brief, look at grotesks with drawn character rather than neutral ones. Avoid the reflex-reject list (Inter, DM Sans, Instrument, Space Grotesk).

**Suggested command**: `impeccable typeset`

## Persona Red Flags

**Jordan (Confused First-Timer)**: Reads "Rəsmi formatda sınaq" and "İmtahan gününü əvvəlcədən yaşayın" and still does not know what is sold here. Scans for a price — the hero has none, and the price rail is at the very bottom of an 8,344px page. Sees "1:1 FORMAT UYĞUNLUĞU" at 10px uppercase and cannot decode what a 1:1 ratio of format even measures. Sees an English math question in an Azerbaijani interface with no explanation of why. Two of the three figures are not self-explanatory.

**Casey (Distracted Mobile User)**: Gets the misaligned figure row on the first screen. The question text in the preview wraps mid-formula. The primary CTA sits at ~430px from the top, well outside the thumb zone, and there is no persistent bottom action. The document is 8,344px tall on a 844px screen, so the price rail is roughly ten screens of scrolling away.

**Sam (Accessibility-Dependent)**: Six confirmed AA contrast failures at 10px. Worse, the entire right composition is decorative but not marked `aria-hidden`, so a screen reader announces 25 fragments of fake UI as page content: *"SAT · Math · Module II, 32:14, 14 / 22, If, ƒ(x) = 3x² − 5x + 2, what is, ƒ(−1), ?, A, −6, B, 0, C, 10, D, 14, Bal tərəqqisi, SAT, +184, orta artım, 1180, 1272, 1364, cəhd 01, 02, 03."* An unanswerable math question and a fabricated score history, presented as fact. Separately, `<h1>` uses `<br />` for line breaks, so `textContent` is `"Rəsmiformatdasınaq."` with no spaces.

## Minor Observations

- **The Clerk avatar is the only chromatic element in the fold.** A saturated indigo circle in a strictly bone-and-ink palette, top right. It breaks the monochrome discipline harder than anything else on screen.
- **The same math question appears twice**, in the hero preview and again in §03, with contradictory narratives: the hero shows C selected as correct, §03 shows the user chose B and got it wrong. Same question, two stories.
- **The right canvas is `lg:h-150` (600px) but its content ends at 499px** — 101px of dead height baked into the layout, and a fixed height that will clip if any preview content grows.
- **`1:1` is not a measurement.** "05" is a live database count and "11" is a real product fact; "1:1" is a rhetorical claim wearing the same typographic uniform. It weakens the other two.
- **Ten hero elements set at 10px**, several in Azerbaijani uppercase with 0.14em tracking. `globals.css` states 10px labels are "scanned, not read" — but "AÇIQ SINAQ" is doing real explanatory work under a headline number.
- **The top bulletin strip** ("AKADEMİK SINAQ MƏRKƏZİ · BAKI") consumes 34px of fold height for low-value content.

## Questions to Consider

- The hero withholds the programme list on purpose, and the reasoning is genuinely good. But what does a visitor arriving from "IELTS sınaq Bakı" see in their first five seconds?
- If the composition only resolves above 1400px, is it the right composition, or is it a 1440px comp that was never re-tested at 1366?
- What if the third figure were a live number instead of `1:1`? Two real measurements and one claim currently makes all three read as decoration.
- The design's whole argument is precision. What would it look like if the layout itself never missed by 8 pixels, never clipped, and never misaligned a row of numerals?
