# Prospect: handoff for a new session

Prospect is a recruiting and learning app for MSU finance students and the PE@Broad club. The repo is `arichmoraga123/coffee-chat`, and the app lives in `dealflow-crm/`. Work has been on branch `claude/dazzling-lamport-tujeoy`. It has **not** been merged, and no pull request is open.

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

### Schema
The latest migration is `prisma/migrations/20261103120000_round2_outreach_notifications_workbooks/migration.sql`. It adds:
- `ImportBatch`, `Notification`, `NotificationPref`, `OutboundMessage`, `ClubPostProgress`, `WorkbookProgress`
- many new columns on Contact, Interaction, Task, ClubPost, ClubProject and ClubEvent
- pg_trgm indexes

There have been no schema changes since.

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

## Next up (not started)
Spec: `CLAUDE_CODE_SPEC_Resume_Reviewer.md`. The owner has this file; it isn't in the repo yet. Put `Prospect_Recruiting_Openings_Template.xlsx` in `public/templates/`. Credits are limited, so the plan agreed so far is:

1. **Part A: resume reviewer v2.** Grade relative to the student's class year, with formatting checks done in code using `unpdf`.
   - Skip the admin rubric page and the calibration screens; keep the weights in `lib/resume/rubric.ts`.
   - Do step 0 first: report how the current reviewer works.
2. **Part C core UI fixes:**
   - collapsible sidebar
   - title and subtitle above the tabs, with fixed spacing
   - pipeline cards that don't truncate
   - `SearchSelect` filters on Practice
   - guided Excel: typing, arrows, Tab and Enter, locked input cells, auto-check
   - skip: the full Excel shortcut set and the screenshot audit
3. **Part B: recruiting openings upload.** Reuse the rolodex import patterns; skip the calendar view.

Commit after each part. Commit messages and pull requests must not contain model names.
