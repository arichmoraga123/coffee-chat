# Prospect: handoff for a new session

Prospect is a recruiting and learning app for MSU finance students and the PE@Broad club. The repo is `arichmoraga123/coffee-chat`, and the app lives in `dealflow-crm/`. Round 1–2 work is on `claude/dazzling-lamport-tujeoy`; round 3 (resume reviewer v2, UI cleanup, openings) continues on `claude/youthful-mccarthy-3qlrk8`, which includes all of it. Nothing has been merged, and no pull request is open.

## Stack and conventions
- **Framework:** Next.js 16 App Router. Route `params` and `searchParams` are Promises. Read `node_modules/next/dist/docs/` before using unfamiliar APIs (see `AGENTS.md`).
- **Database:** Prisma 6 on Postgres, with Neon in production.
  - Migrations are idempotent SQL (`IF NOT EXISTS`, and foreign keys inside `DO $$ … EXCEPTION WHEN duplicate_object`).
  - The owner pastes the SQL into the Neon SQL editor by hand.
  - Seeds upsert and never delete.
- **UI:** Tailwind v4 design tokens (`bg-surface`, `text-ink-2`, `bg-accent-tint`, `text-warn`, and so on); components in `src/components/ui/`.
  - Shared components: `Button`, `Card`, `PageHeader`, `Modal`, `DataTable`, `StatTile`, `EmptyState`.
  - Dropdowns: `SearchSelect` is the combobox, and the drop-in `Select` replaces native `<select>`.
- **Libraries:** sonner for toasts, zod for validation, lucide for icons.
- **AI:** Anthropic SDK. The model comes from an env var, and AI features need `ANTHROPIC_API_KEY`.
- **Gotchas:**
  - `server-only` imports break `tsx` scripts, so keep shared libs free of it.
  - The lint rule `react-hooks/purity` forbids `Date.now()` during render. Use `new Date().getTime()` or compute on the server.
  - The typecheck needs extra memory: `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`
- **Deploy:** `cd dealflow-crm && npx vercel --prod`.
- **Private files:** `content/private/` is git-ignored. It holds the roster CSV and the v2 student workbooks used by the tests.

## What's built (in order)

### Round 1 (Learn, club and design)
- **Learn:** 56 interactive lessons, compiled from `content/lessons/*.json` into `src/lib/learn/lessons.generated.ts` by `npm run validate-lessons`.
  - XP, an AI tutor, and an "Ask a mentor" queue.
  - Workbook downloads with an answer key that unlocks after the lesson is finished.
- **Practice:** a bank of 236 PE@Broad multiple-choice questions, graded on the server, plus a spaced-repetition daily set.
- **Club:** PE@Broad roster auto-join, one standings board, member profiles and sharing, direct messages, and challenges.
- **Design:** the redesign (tokens, sidebar, mobile tabs, ⌘K search), with emojis removed from the sidebar.
- **AI writing tools:** a better follow-up email and one-pager, cold email templates plus a generator, and a Storybank (6 stories cleaned up by AI and mapped to interview questions).

### Round 2: spec `content/specs/CLAUDE_CODE_SPEC_Outreach_Club_Workbooks.md`, phases G to M

**G: search and bulk editing**
- Search and dropdowns: `SearchSelect` (`src/components/ui/search-select.tsx`) replaces every dropdown.
- Fuzzy search: `/api/search/[entity]` for firms, contacts and members, using pg_trgm.
- Bulk editing: shared `src/lib/bulk.ts` plus `src/components/ui/bulk.tsx`, with a 10-second Undo.
- Firm pages at `/firms/[id]`.

**H: contacts cleanup**
- Soft delete with a 30-day Trash (`/contacts/trash`), and a Network list for connections you aren't working yet.
- Import history with per-import undo (`/contacts/imports`).
- An editable interaction timeline on the contact page.
- Data repair for the old "everything is overdue" import bug: `src/lib/data-repair.ts`, `npm run repair-dates -- --dry-run`, and a card under Settings → Data.

**I: Rolodex import v2**
- Page `/contacts/import` with three paths: the template, LinkedIn's `Connections.csv`, and any other CSV.
- Engine: `src/lib/rolodex-import.ts` and `rolodex-fields.ts`.
- One planner builds the preview, and the import is written in one transaction tagged with an ImportBatch.
- Test: `npm run test-import`.

**J: follow-ups and tasks**
- Rules: `src/lib/followups.ts`, a pure function. Test: `npm run test-followups`.
- `syncFollowupTasks` creates the task rows.
- `/tasks` page; the Home "This week" card and the Contacts badge read from `src/lib/tasks-data.ts`.
- "Mark as sent" in the Email writer.
- A contact's stage never moves backwards (`mergeStage`).

**K: notifications**
- Everything goes through `notify()` in `src/lib/notify.ts`: in-app, plus queued email and texts.
- Sending: `src/lib/outbound.ts` handles Resend email and Twilio texts. Texts only send when `SMS_ENABLED=true`, after a phone is verified and consent is recorded, at most 2 a day, never in quiet hours.
- A bell with unread count; settings under Settings → Notifications; unsubscribe links in every email.
- Daily cron `/api/cron/daily` at 13:30 UTC (`src/lib/daily.ts`): follow-up digest, mentor-question reminders, event reminders, Trash purge.
- Mentor questions alert admins and mentors right away (`src/lib/mentor-alerts.ts`).

**L: club publishing**
- "Post to club" for admins and officers: `src/components/club/publish-dialog.tsx`, the `/api/club/publish` route, and `src/lib/club-publish*.ts`.
- Seven types: Resource, Assignment, Reading, Case study, Project, Event, Announcement.
- Audience and delivery options.
- Files go to private Vercel Blob through browser upload (`/api/club/files/upload`). Downloads go through a members-only route that logs each download.
- Members see:
  - Overview, Content (filters, detail page, Mark done)
  - Events (Going / Can't make it, `.ics` download)
  - Projects, Announcements (bold, links, lists)
  - a "From PE@Broad" section in Tools → Resources
- Officers get insight (views, downloads, done, who hasn't opened, reminders) and edit, archive, pin, delete.

**M: workbooks v2**
- **Upload:** admins upload the whole zip at `/admin/learn/resources`, with preview then confirm. Old versions can be deleted one at a time or all at once.
- **Lesson map:** `src/lib/learn/workbook-map.ts` is the workbook↔lesson map, shared with the lesson converter.
- **Guided mode:** `/learn/workbooks/[key]/guided` (`src/components/learn/guided/guided-workbook.tsx`).
  - Grid, formula bar, sheet tabs, step panel, Show me, hints.
  - Progress saves and resumes; "Download my workbook"; XP.
- **Formula engine:** `src/lib/formula/engine.ts`, MIT with no dependencies, covering the 18 required functions.
- **Test:** `npm run test-walkthroughs`. All 1,070 steps pass against the v2 student files. It runs before `next build` and only checks function support when the files are missing.
- **Local development:** without a Blob token, workbooks and club files are saved to a temp folder. Production never does this.

### Round 3: spec `CLAUDE_CODE_SPEC_Resume_Reviewer.md` (repo root)

**Part A: resume reviewer v2** (behind `RESUME_V2=true`; the old reviewer runs otherwise)
- Grades against a strong resume at the student's class year. Level, target and experience pickers default from the profile.
- Rubric weights and grading rules: `src/lib/resume/rubric.ts`. The overall score is computed in code (rounded to 0.5).
- Formatting is measured from the PDF with `unpdf` (13 checks): `src/lib/resume/format-checks.ts`. Test: `npm run test-resume-format` against PDFs in `scripts/fixtures/resumes/`.
- Prompt, schema and validation: `src/lib/resume/grader.ts`. Route: `src/app/api/resume/review/v2.ts`. Screen: `src/components/resume/resume-review-v2.tsx`.
- Stored PDFs (for re-grading) use the same private Blob store; last 10 reviews kept; students can delete. `.docx` gets content-only feedback.
- Calibration: `npm run test-resume-grader` (needs `ANTHROPIC_API_KEY`; cases in `scripts/fixtures/resumes/calibration.json`). Not run yet. Optional exemplars go in `content/resume-exemplars/[level]/` as .txt/.md.
- Skipped as agreed: the admin rubric page and calibration screens.

**Part C: UI cleanup and guided Excel**
- Collapsible sidebar (Ctrl/Cmd+\\), saved in `User.sidebarCollapsed`; starts collapsed at 1024–1279px and on /pipeline and guided workbooks.
- Section tabs render under the page title (`src/components/ui/section-tabs.tsx`, used by `PageHeader`); `Tabs` never shows a vertical scrollbar and moves overflow into "More".
- Pipeline board: 280px columns, collapsed empty stages, untruncated cards, "⋯" menu, Board/Table toggle.
- Practice: SearchSelect for Module/Lesson, segmented questions-per-session.
- Guided workbook grid rewritten: `src/components/learn/guided/spreadsheet-grid.tsx` (keyboard, point mode, F4, copy/paste/fill with shifted refs via `src/lib/formula/refs.ts`, undo, locked inputs, auto-check). Test: `npm run test-formula-refs`.
- Skipped as agreed: the full Excel shortcut set and the screenshot audit.

**Part B: recruiting openings**
- Models `Opening` and `OpeningReminder`. Firms are per user, so an opening stores `firmName` + `firmNorm` and matches each member's own firm list.
- Upload (admins/officers): `/recruiting/openings/upload`, parse in `src/lib/openings-parse.ts`, plan/commit/undo in `src/lib/openings-import.ts`. Test: `npm run test-openings-import`.
- Openings page `/recruiting/openings`: filters, Add to pipeline, Remind me, Mark applied, admin bulk/inline edit (entity `openings` in `src/lib/bulk.ts`).
- Reminders run in the daily cron (`opening_reminder`, under the event-reminders setting). Home "This week" shows deadlines.
- Skipped as agreed: the calendar view.

**Browser tests** (Playwright): `tests/guided-excel.spec.ts`, `tests/openings.spec.ts`. They need a local Postgres seeded with `npx tsx tests/seed-e2e.ts` and the app on port 3100; run `npm run test:e2e`.

### Round 4: spec `CLAUDE_CODE_SPEC_Fit_and_Practice.md` (repo root), phases F1–F4

**F1: question bank v2 and challenge picks**
- The bank, seed and validator use `content/questions/PEB_Question_Bank_v2.json` (505 questions; the 236 v1 ids are unchanged). Load it with `npm run seed:questions`.
- Challenge picker: `src/lib/challenge-picker.ts` (scope, then module top-up with a note; fresh questions first; about 3/5/2 easy/medium/hard). Test: `npm run test-challenge-picker`.
- Practice modes: Weak spots, Missed before, Hard only (`practiceModeQuestions` in `src/lib/mcq/server.ts`).

**F2: fit questions** (Storybank → Fit questions, `/stories/fit`)
- Builder pre-filled from the rolodex (firm conversations, city contacts + hometown, Group Finder result), linked stories, "Assemble draft" (no AI, `assembleDraft` in `src/lib/fit.ts`), "Improve with AI" and feedback (`src/lib/fit-ai.ts`, rules verbatim), practice timer with in-browser recording, versions with compare.
- Interview prep pack: `/prep/[firmId]` (from the firm page and the pipeline card "⋯" menu), printable.
- Test: `npm run test-fit`.

**F3: Group Finder** (`/stories/group-finder`)
- Scoring in `src/lib/groupFinder.ts`; persona tests `npm run test-group-finder`. Results saved per take; cohort page shows each member's top group and club counts.

**F4: admin editing** (`/admin/fit`)
- Fit questions, group profiles and questionnaire weights live in the `FitContent` table, seeded from `content/fit/*.json` (missing ids are added; edits are never overwritten; questions are archived, not deleted). Max scores recalculate from the weights. "Run persona tests" button.
- Admin → Questions has an "Underfilled lessons" list (fewer than 9 questions).

Browser test for all of it: `tests/fit.spec.ts` and `tests/practice.spec.ts`.

### Schema
The latest migration is `prisma/migrations/20261103120000_round2_outreach_notifications_workbooks/migration.sql`. It adds:
- `ImportBatch`, `Notification`, `NotificationPref`, `OutboundMessage`, `ClubPostProgress`, `WorkbookProgress`
- many new columns on Contact, Interaction, Task, ClubPost, ClubProject and ClubEvent
- pg_trgm indexes

Round 3 adds two more (run both in Neon, in order; both are idempotent):
- `prisma/migrations/20261104120000_sidebar_pref/migration.sql`
- `prisma/migrations/20261104130000_recruiting_openings/migration.sql`

Round 4 adds one more: `prisma/migrations/20261105120000_fit_and_group_finder/migration.sql`.

## Owner's to-do list (may not be done yet; ask)
1. Run the round-2 migration SQL in Neon.
2. Run `npm run repair-dates -- --dry-run` against production and review it before applying.
3. In Vercel, set:
   - `RESEND_API_KEY` and `EMAIL_FROM` (verify the domain in Resend)
   - `CRON_SECRET`
   - a Blob store (`BLOB_READ_WRITE_TOKEN`)
   - later: the `TWILIO_*` variables plus `SMS_ENABLED=true`, once Twilio approves. The webhook is `/api/notifications/twilio`.
4. Upload `PEB_Practice_Workbooks_v2.zip` at Admin → Learn · Workbooks, then click "Delete old versions".
5. Give club officers the "officer" role on the roster page.

## Owner's to-do for round 3
1. Run the two round-3 migrations above in Neon.
2. Set `RESUME_V2=true` in Vercel once you've tried the new reviewer (it needs `ANTHROPIC_API_KEY`, already used by the old one).
3. Optional: run `npm run test-resume-grader` with an API key and add exemplar resumes.
4. Upload the openings template at Recruiting → Openings → Upload.

## Owner's to-do for round 4
1. Run `20261105120000_fit_and_group_finder/migration.sql` in Neon **before** deploying.
2. Load question bank v2 into production: `npm run seed:questions` with the production `DATABASE_URL` (upserts only).
3. Deploy.

## Next up (not started)
Nothing queued. Round 3 (Parts A, B, C) is built.
