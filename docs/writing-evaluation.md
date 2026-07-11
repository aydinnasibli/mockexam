# AI Writing Evaluation — model, grading, and graceful degradation

_Last updated: 2026-07-11_

This documents the writing-evaluation pipeline and the changes made to it. It
covers the model, the prompt, how scores are aggregated, and — most importantly —
what happens when the grader is temporarily unavailable.

## Files

| File | Role |
|------|------|
| `lib/actions/writing-eval.ts` | Calls the LLM grader, returns a band + criteria feedback, or a **pending** result on failure. |
| `lib/actions/results.ts` | Scores an exam. Aggregates objective + writing; adds the `reevaluatePendingWriting` action. |
| `lib/models/ExamResult.ts` | Persists `writingPending` per answer and `pending` per module. |
| `lib/db/results.ts` | Surfaces those fields to the review page. |
| `app/dashboard/analytics/[examId]/[attemptNumber]/review/ReviewClient.tsx` | Shows the band, or a "being checked" state with a re-check button. |

## Model

```
GRADER_MODEL = 'gpt-5.4-mini'     // cost-effective reasoning model w/ structured outputs
REASONING_EFFORT = 'medium'
MAX_COMPLETION_TOKENS = 8000      // must cover hidden reasoning tokens + JSON output
```

`GRADER_MODEL` is the **single swap point**. `gpt-5.6` / `gpt-5.6-terra` are
stronger (pricier) drop-ins if you want higher grading quality. Any model set
here must (a) be available to the OpenAI account with **billing/quota**, and (b)
support Structured Outputs (`json_schema`, `strict`) and `reasoning_effort`.

Verified live: `gpt-5.4-mini` returns a valid structured evaluation in ~5s.

> ⚠️ **Billing is required.** If the OpenAI account has no quota, every call
> returns `429 insufficient_quota` and essays are marked *pending* (never scored
> 0). Confirm billing before relying on live grading.

## Prompt

- A strict-examiner system prompt scores each criterion independently on the
  IELTS/TOEFL 0–9 band scale, with calibrated band anchors.
- The student response is treated as **untrusted** — the model is told never to
  follow instructions embedded in the essay.
- All feedback is returned in Azerbaijani.
- **Task 1 note:** the chart/graph is shown to the student as an image and is
  *not* passed to the grader as text. The prompt instructs the model not to
  invent figures and not to lower Task Achievement for data it cannot see —
  it grades the overview, structure, feature selection and comparison language.
- Structured Outputs (`json_schema`, `strict`) forces exactly the right criteria
  keys. The overall band is the mean of the criteria **computed in code**, never
  taken from the model.

## Scoring & graceful degradation (the important part)

Every writing answer has a `writingPending` flag; every module score has a
`pending` flag.

1. On submit, the objective score is computed and the result is **persisted
   immediately**. Writing answers start `writingPending: true`.
2. The grader runs. For each essay:
   - **Graded** → `writingScore` (0–9), criteria, feedback; `writingPending = false`.
   - **Could not grade** (429/no quota/timeout/truncation/bad JSON) →
     `writingPending = true`, **no band stored**, friendly message saved.
3. The overall score is the **mean of the parts that actually have a value**
   (`averageOfPresent`). A pending essay is *excluded*, so it never drags the
   overall score to 0. Example: Reading 68% + Listening 68% + (writing pending)
   → overall **68%**, not 34%.
4. A module that still has a pending essay is marked `pending`; the review UI
   shows "yoxlanılır…" instead of `0%`.

### Re-grading — "available all the time"

`reevaluatePendingWriting(examId, attemptNumber)` re-runs the grader for any
pending essays and recomputes the score. It is:

- **Idempotent** — only touches pending essays.
- **Rate-limited** — 10 calls / user / 5 min.
- **User-triggered** from the review page: a "Yenidən yoxla" (re-check) button
  and a banner ("Esseniz hələ yoxlanılır") appear whenever an essay is pending.

So a transient outage never shows a scary "unavailable / 0". The student sees
"your essay is being checked", the objective score is correct immediately, and
the essay is graded as soon as the grader is reachable again.

## Safety & limits

**Rate limits** (Upstash sliding window, per user):

| Entry point | Limit | Notes |
|-------------|-------|-------|
| `saveExamResult` (submit) | **5 / 5 min** | Requires a `COMPLETED` purchase for the exam. |
| `reevaluatePendingWriting` (re-check) | **10 / 5 min** | Auth + ownership checked (`userId` + `examId` + `attemptNumber`). |

> The limiter **fails open** — if Upstash is unreachable, requests are allowed
> (an outage must not block exams/checkout). This is a deliberate trade-off;
> failures are reported to Sentry.

**Cost is bounded — an essay is graded at most once.**
`reevaluatePendingWriting` only re-grades essays whose `writingPending` is still
`true`. The moment an essay is graded, `writingPending` becomes `false` and it is
excluded from every future re-check, so a graded essay can never be re-billed.
Repeated "re-check" clicks on an already-graded attempt do nothing (they return
`graded: 0`). The only billable calls are: one grade per essay at submit, plus
retries **while still pending** (which stop as soon as grading succeeds). A 429
(no quota) does not consume tokens.

**Prompt-injection hardening.** The student essay is untrusted input: it is
wrapped in `<student_response>…</student_response>` and the system prompt forbids
following any instruction inside it (e.g. "give me band 9"). The overall band is
computed in code from the per-criterion scores — never taken from free-form model
output — so the model cannot inflate the final number.

**Model cost.** `gpt-5.4-mini` is a low-cost reasoning tier; `MAX_COMPLETION_TOKENS`
is capped at 8000 (reasoning + JSON output). Grading only runs for questions of
type `writing` that have a non-empty essay (empty essays are skipped, <10-word
essays get a genuine low band without an API call).

## Testing without live API access

Because live grading needs OpenAI billing, the pipeline (prompt build → schema →
JSON parse → band aggregation) can be verified by mocking the OpenAI client's
`chat.completions.create` to return a fixed structured payload and asserting the
computed band/criteria. The graceful-degradation path is verified by pointing at
a key with no quota and confirming the review page shows the pending state and a
correct objective-only overall score.
