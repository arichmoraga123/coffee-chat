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

## How content updates

- **Deals**: `/api/cron/refresh-news` runs daily. Articles describing a real transaction with a
  disclosed dollar value are published to `/deals` automatically; admins can also click
  "Pull latest deals now" on `/admin/deals`.
- **Question bank MCQs**: seeded questions use hand-written near-miss choices
  (`src/lib/drill-mcq`). New or user-submitted questions get AI-generated choices on first use.
  Run `npm run check:mcq` after editing to catch missing choices or "longest answer wins" giveaways.
- **Program tracker**: `src/lib/recruiting-programs-2028.ts` — update dates there and re-seed to
  refresh calendar events.
