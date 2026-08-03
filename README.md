# Test Centre — Academic Exam Preparation Platform

A full-stack exam preparation platform for SAT, IELTS, TOEFL, DİM, and GRE. Students take timed mock exams in the real test format, get AI-powered feedback, and track their progress over time.

Live at [testcentre.az](https://www.testcentre.az).

## Features

- **Exam catalog** — browse and purchase exam packages by type (SAT, IELTS, TOEFL, DİM, GRE, General English)
- **Timed exam sessions** — module-by-module structure with breaks, adaptive modules, and countdown timers
- **AI writing evaluation** — OpenAI grades open-ended writing tasks against exam-specific rubrics (see [docs/writing-evaluation.md](docs/writing-evaluation.md))
- **Math rendering** — KaTeX renders LaTeX in questions and explanations
- **Audio questions** — server actions stream audio for listening modules
- **User dashboard** — analytics, result history, and account settings
- **Admin panel** — manage exams, view purchases, seed question banks, import question data
- **Payments** — Epoint.az handles checkout and purchase webhooks
- **Auth** — Clerk for sign-up, sign-in, and session management

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | MongoDB via Mongoose |
| Auth | Clerk |
| Payments | Epoint.az |
| AI | OpenAI API |
| Analytics & errors | PostHog (EU) |
| Animation | Framer Motion |
| Deployment | Vercel |

## Project Structure

```
app/
  page.tsx              # Landing page
  exams/                # Exam catalog & detail pages
  exam-session/[id]/    # Active exam session UI
  dashboard/            # User dashboard (results, analytics, settings)
  admin/                # Admin panel (exams, purchases, users)
  checkout/[id]/        # Purchase flow
  api/                  # Route handlers (webhooks, purchase status)
lib/
  models/               # Mongoose schemas (Exam, Question, ExamSession, ExamResult, Purchase, UserSettings)
  actions/              # Server actions (session, questions, results, checkout, AI eval, audio, import)
  db/                   # DB query helpers
  mongodb.ts            # Mongoose connection singleton
components/
  layout/               # Navbar, Footer, Sidebar
  ui/                   # Animation wrappers (FadeUp, StaggerChildren, PageTransition)
```

## Node version

Pinned to the **Node 24 LTS ("Krypton")** line via `.nvmrc` and `engines` in
`package.json`; CI reads `.nvmrc` so it cannot drift from local, and Vercel
reads `engines` so the deployed runtime matches too.

```bash
nvm use          # or: n 24
```

Node 24 is also Vercel's current default, so no project-level Node override is
needed. The previous 22.x pin existed only because `posthog-node` and
`@posthog/nextjs-config` require `^20.20.0 || >=22.22.0`; every Node 24 release
satisfies that.

## Local Setup

**1. Clone and install**

```bash
git clone <repo-url>
cd mockexam
npm install
```

**2. Configure environment variables**

Create `.env.local` in the project root:

```env
# Clerk — https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/mockexam

# Epoint.az — get from epoint.az dashboard > API idarəetmə
EPOINT_PUBLIC_KEY=...
EPOINT_PRIVATE_KEY=...

# OpenAI
OPENAI_API_KEY=sk-...

# Upstash Redis — rate limiting (checkout, contact form, submissions)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Contact form (Gmail account + 16-char App Password)
EMAIL_USER=...
EMAIL_PASS=...
CONTACT_TO=...

# PostHog — product analytics + error tracking (EU cloud)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# PostHog source-map upload — OPTIONAL. Without these the build simply skips
# the upload; stack traces are then minified but everything still works.
#   personal API key: https://eu.posthog.com/settings/user-api-keys
#                     (scope: error_tracking:write)
#   project ID:       the number in the dashboard URL,
#                     eu.posthog.com/project/<PROJECT_ID>/...
POSTHOG_PERSONAL_API_KEY=phx_...
POSTHOG_PROJECT_ID=...

# Public app URL (used for OG tags, sitemaps and payment redirect URLs)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Admin access** is granted through Clerk, not an environment variable. Set
> `{ "role": "admin" }` on a user's **public metadata** in the Clerk dashboard,
> and expose it on the session token (Sessions → Customize session token) as
> `{ "metadata": "{{user.public_metadata}}" }`. `lib/admin.ts` reads
> `sessionClaims.metadata.role`.

> **Deploying to production:** switch to Clerk *production* keys (`pk_live_` /
> `sk_live_`). The CSP in `next.config.ts` derives Clerk's Frontend API host
> from the publishable key, so it follows automatically — but the key must be
> present at build time.

**3. Run the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript with no emit |
| `npm test` | Run the unit tests (Vitest) |
| `npm run verify` | Typecheck + lint + test — what CI runs |

## Exam & Module Types

Exam types and module types are both defined once in [`lib/exam-types.ts`](lib/exam-types.ts)
and consumed everywhere (schemas, validators, importer, admin form, catalog filter).
Add a type there and it becomes usable across the whole app.

**Exam types:** `sat` · `ielts` · `toefl` · `dim` · `gre` · `general_english`

**Module types:** `rw` · `reading` · `writing` · `listening` · `speaking` · `grammar` · `math` · `verbal` · `quantitative` · `analytical` · `general`

Each module has a duration, question count, optional break, and an `isAdaptive` flag (used for SAT-style adaptive routing).

## Dependency overrides

`package.json` pins `sharp` and `postcss` via `overrides`. Next.js vendors its
own copies of both under `node_modules/next/node_modules`, and those versions
carried published advisories (sharp: libvips CVEs; postcss: `sourceMappingURL`
arbitrary file read + `</style>` XSS). The overrides force the patched,
semver-compatible releases and dedupe the nested copies away.

`brace-expansion@<1.1.17` is pinned to `^1.1.18` (GHSA-mh99-v99m-4gvg, a DoS
in glob expansion). The range-scoped key matters: the tree contains both a 1.x
copy (via `eslint`/`eslint-plugin-import` → `minimatch@3`) and a 5.x copy (via
`typescript-eslint` → `minimatch@10`). A bare `"brace-expansion"` override
would force the 5.x consumer down to v1.

`npm audit` currently reports **0 vulnerabilities**.

## Scoring integrity

Attempts are graded **server-side against the question bank**, never against the
submitted payload — see [`lib/grading.ts`](lib/grading.ts). The score denominator
is the exam's real question count, `moduleIndex` and `correctIndex` always come
from the database, duplicate answers are collapsed, and unknown question IDs are
ignored. [`lib/grading.test.ts`](lib/grading.test.ts) covers these cases directly.

Score conversion (IELTS bands, SAT scaled scores) lives in
[`lib/scoring.ts`](lib/scoring.ts) and is documented in [docs/scoring.md](docs/scoring.md).

## Observability

Error reporting goes through [`lib/observability.ts`](lib/observability.ts) —
`captureException` / `captureMessage` — rather than importing a vendor SDK at
each call site. Product events go through [`lib/analytics.ts`](lib/analytics.ts),
which defines every event name in one place so a typo can't silently break a
funnel. Both are `server-only` and neither ever throws; an observability outage
must not be able to fail a checkout or lose an exam submission.

Client-side errors, pageviews and session replay come from `posthog-js`,
initialised in [`instrumentation-client.ts`](instrumentation-client.ts). Server
errors are captured by `onRequestError` in
[`instrumentation.ts`](instrumentation.ts).

PostHog is reached through a same-origin rewrite at `/relay` (see
`next.config.ts`), so analytics survives ad blockers and no PostHog host needs
to appear in the CSP. Session replay masks all text and inputs — this app
renders exam questions and student essays.

Tracked funnel events: `checkout_started`, `purchase_completed`,
`purchase_refunded`, `exam_started`, `exam_submitted`.
