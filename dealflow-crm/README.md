# Prospect (dealflow-crm)

Recruiting platform for finance students: networking CRM, question bank with drill-style MCQs,
Summer 2028 program tracker, deal tracker with AI interview prep, resume review, and more.

## Setup

```bash
npm install
npx prisma db push      # sync the schema to your database
npm run db:seed         # load questions, deals, programs, calendar events (safe to re-run)
npm run dev
```

Re-run `npm run db:seed` after pulling updates — it upserts new questions, firm-specific
question sets, deals and recruiting calendar events without touching user data.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | yes | Auth |
| `ANTHROPIC_API_KEY` | for AI features | Resume review, deal pitches, practice questions, MCQ generation |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-opus-5-5` |
| `ANTHROPIC_FAST_MODE` | no | `1` = fast output mode (about 2x faster generation at about 2x token price) |
| `NEWS_API_KEY` | for live news/deals | NewsAPI key used by the daily news + deal ingest |
| `CRON_SECRET` | for cron | Protects `/api/cron/*` (Vercel sends it automatically) |
| `BLOB_READ_WRITE_TOKEN` | for Learn workbooks | Vercel Blob store for the Excel workbooks (Storage → Blob in Vercel) |

## How content updates

- **Deals**: `/api/cron/refresh-news` runs daily. Articles describing a real transaction with a
  disclosed dollar value are published to `/deals` automatically; admins can also click
  "Pull latest deals now" on `/admin/deals`.
- **Question bank MCQs**: seeded questions use hand-written near-miss choices
  (`src/lib/drill-mcq`). New or user-submitted questions get AI-generated choices on first use.
  Run `npm run check:mcq` after editing to catch missing choices or "longest answer wins" giveaways.
- **Program tracker**: `src/lib/recruiting-programs-2028.ts` — update dates there and re-seed to
  refresh calendar events.

## Prospect Learn (`/learn`)

56 interactive technical lessons (fill-ins, calculations, multiple choice, drag-to-order, deep dives,
checkpoints), downloadable Excel workbooks, an AI tutor and a mentor Q&A queue.

- **Content:** `content/LESSON_CONTENT.md` is the source of truth. `npm run learn:convert` regenerates
  `content/lessons/*.json` (lesson 5-2 is hand-built and only gets new deep dives appended). Formula
  blocks, one MCQ per lesson and question-bank tags live in `scripts/learn/overrides.ts`.
- **Checks:** `npm run validate-lessons` (also runs before every build — a malformed lesson fails the
  build) and `npm run learn:check` (verifies every walkthrough step, fill-in, deep dive and checkpoint
  from the source made it into the JSON).
- **Workbooks:** an admin uploads the `.xlsx` files at `/admin/learn/resources` (drop all 14 at once —
  names like `PEB_03_CAPM_Beta_WACC_KEY.xlsx` are matched automatically). Files are stored privately in
  Vercel Blob and streamed through `/api/learn/resources/[id]/download`; answer keys unlock after the
  student completes a lesson that uses the workbook.
- **Mentors:** promote a user with "Make Learn mentor" in the admin user list. Mentors see
  `/admin/learn/questions` (answer questions; "Add to lesson as FAQ" shows the answer to everyone) and
  `/admin/learn/cohort` (completion by module, average score, most-marked "Shaky" prompts).
- **Paid guides:** put BIWS / WSP PDFs in `content/sources/` for local cross-referencing only — that
  folder is git-ignored and never served.
- **Database:** the Learn tables are in `prisma/migrations/20261031120000_prospect_learn` — apply with
  `npx prisma db push` (or run that SQL) before deploying.
