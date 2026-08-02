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
MAIL_USER=...
MAIL_APP_PASSWORD=...
CONTACT_TO=...

# Sentry (optional locally; source maps upload only when all three are set)
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...
SENTRY_AUTH_TOKEN=...

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

Remaining `npm audit` findings are all in the ESLint toolchain
(`eslint`/`eslint-plugin-*`/`minimatch`), which is a devDependency that never
ships. Clearing them needs ESLint 10, which `eslint-config-next` doesn't
support yet.

## Scoring integrity

Attempts are graded **server-side against the question bank**, never against the
submitted payload — see [`lib/grading.ts`](lib/grading.ts). The score denominator
is the exam's real question count, `moduleIndex` and `correctIndex` always come
from the database, duplicate answers are collapsed, and unknown question IDs are
ignored. [`lib/grading.test.ts`](lib/grading.test.ts) covers these cases directly.

Score conversion (IELTS bands, SAT scaled scores) lives in
[`lib/scoring.ts`](lib/scoring.ts) and is documented in [docs/scoring.md](docs/scoring.md).
