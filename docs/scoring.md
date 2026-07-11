# Exam-authentic scoring

_Last updated: 2026-07-11_

Every attempt stores a normalised **percentage** (`ExamResult.score`, 0–100) —
useful for cross-exam averages and progress charts. But each exam is **reported
the way it is actually graded**:

| Exam type | Reported as | Fields on `ExamResult` |
|-----------|-------------|------------------------|
| `ielts`   | Band **0–9** (half-bands) per section + overall | `overallBand`, `moduleScores[].band` |
| `sat`     | Scaled **200–800** per section, **400–1600** total | `totalScaled`, `rwScaled`, `mathScaled` |
| others (`general_english`, …) | Percentage | `score` |

All conversions live in **`lib/scoring.ts`** (pure, client-safe). They are
computed once at submit time (and on writing re-check) in `lib/actions/results.ts`
and stored, so every display surface (review page, dashboard, analytics) reads
the same numbers via `formatOverallScore()` / `formatModuleScore()`.

Results created **before** this feature have no band/scaled fields and fall back
to `%` automatically.

## IELTS

**Listening / Academic Reading** — raw correct out of 40 → band, using the
published Cambridge/British Council conversion tables (`IELTS_LISTENING`,
`IELTS_ACADEMIC_READING` in `lib/scoring.ts`). E.g. 27/40 reading → **6.5**.

**Writing** — the two AI task bands are combined with Task 2 weighted double:

```
writingBand = roundHalf( (task1 + 2 * task2) / 3 )
```

**Overall band** — mean of the available section bands (Listening, Reading,
Writing here; this mock has no Speaking), rounded to the nearest half-band
(`x.25` rounds up, IELTS-style):

```
overall = roundHalf( mean(sectionBands) )
```

Worked example (verified live): L 6.5 + R 6.5 + W 7.5 → mean 6.83 → **7.0**.

While the writing is still being graded, the writing section shows
"yoxlanılır…" and is **excluded** from the overall band until it is scored.

## SAT (Digital)

Each section is scaled to **200–800** from its raw score, then summed:

```
sectionScaled = clamp(200 + round(ratio * 600 / 10) * 10, 200, 800)   // ratio = correct / maxRaw
total         = rwScaled + mathScaled                                  // 400–1600
```

- Reading & Writing = modules of type `rw` combined (max 54 raw here).
- Math = modules of type `math` combined (max 44 raw here).

Worked example (verified live): R&W 36/54 → **600**, Math 30/44 → **610**,
total **1210 / 1600**.

> ⚠️ **Approximation.** The official Digital SAT raw→scaled curves are equated
> per form and are not public, so this uses a linear map rounded to the nearest
> 10. Real SAT curves compress the extremes. If you obtain an official
> conversion table, replace `satSectionScaled()` in `lib/scoring.ts` — it is the
> single swap point.

## Where scores render

| Surface | IELTS | SAT | Notes |
|---------|-------|-----|-------|
| Review page headline + section pills | band | scaled | `ReviewClient.tsx` |
| Per-exam analytics (best / avg / attempts / modules) | band | scaled | `analytics/[examId]/page.tsx` |
| All-results analytics (best / last / rows) | band | scaled | `analytics/page.tsx` |
| Dashboard (last result, recent activity) | band | scaled | `dashboard/page.tsx` |
| Cross-exam averages, trend deltas, progress-bar widths | % | % | intentionally normalised — you can't average a band with a scaled score |
