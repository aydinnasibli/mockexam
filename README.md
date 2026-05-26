# Test Centre — Academic Exam Preparation Platform

A full-stack exam preparation platform for SAT, IELTS, TOEFL, DİM, GMAT, and GRE. Students take timed mock exams in the real test format, get AI-powered feedback, and track their progress over time.

Live at [testcentre.az](https://www.testcentre.az).

## Features

- **Exam catalog** — browse and purchase exam packages by type (SAT, IELTS, TOEFL, DİM, GMAT, GRE)
- **Timed exam sessions** — module-by-module structure with breaks, adaptive modules, and countdown timers
- **AI writing evaluation** — OpenAI grades open-ended writing and speaking responses
- **Math rendering** — KaTeX renders LaTeX in questions and explanations
- **Audio questions** — server actions stream audio for listening modules
- **User dashboard** — analytics, result history, and account settings
- **Admin panel** — manage exams, view purchases, seed question banks, import question data
- **Payments** — LemonSqueezy handles checkout and purchase webhooks
- **Auth** — Clerk for sign-up, sign-in, and session management

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | MongoDB via Mongoose |
| Auth | Clerk |
| Payments | LemonSqueezy |
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

# LemonSqueezy — https://app.lemonsqueezy.com
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_VARIANT_ID=...
LEMONSQUEEZY_WEBHOOK_SECRET=...

# OpenAI
OPENAI_API_KEY=sk-...

# Comma-separated Clerk user IDs that get admin access
ADMIN_USER_IDS=user_...

# Public app URL (used for OG tags and sitemaps)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

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

## Exam Module Types

Exams are composed of one or more modules. Supported module types:

`rw` · `reading` · `writing` · `listening` · `speaking` · `grammar` · `math` · `verbal` · `quantitative` · `analytical` · `general`

Each module has a duration, question count, optional break, and an `isAdaptive` flag (used for SAT-style adaptive routing).
