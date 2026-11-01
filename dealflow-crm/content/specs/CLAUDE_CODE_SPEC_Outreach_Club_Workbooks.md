# Prospect — Outreach, Search, Notifications, Club Publishing & Workbooks v2

Build spec for Claude Code. It builds on the existing app and on `CLAUDE_CODE_SPEC_Design.md` (tokens and components), `CLAUDE_CODE_SPEC_PEBroad_Club.md`, and `CLAUDE_CODE_SPEC_Prospect_Learn.md`.

**Files that come with this spec:**

| File | Put it at | What it is |
|---|---|---|
| `Prospect_Rolodex_Import_Template.xlsx` | `public/templates/Prospect_Rolodex_Import_Template.xlsx` | Downloadable import template: Contacts + Interactions tabs, dropdowns, field guide, Claude conversion prompt, 12 fictional sample people |
| `prospect-contacts-sample.csv`, `prospect-interactions-sample.csv` | `public/templates/` | Same sample data as two CSVs |
| `walkthroughs/*.walkthrough.json` (15 files) | `content/walkthroughs/` | Step-by-step guides for the in-browser Excel mode, generated from the answer keys |
| `PEB_Practice_Workbooks_v2.zip` | **Don't commit.** Upload on the admin page (Phase M) | 15 workbooks × student + answer key. Replaces v1 |

**Run order:** one phase per session, **G → H → I → J → K → L → M**. Open each session with:
> Read `CLAUDE_CODE_SPEC_Outreach_Club_Workbooks.md` and `CLAUDE_CODE_SPEC_Design.md`. Build Phase X only. Don't change features outside what that phase lists.

After each phase: `npm run build` passes, then deploy with `cd dealflow-crm && npx vercel --prod`. Migrations and seeds must never delete user data unless a phase explicitly says so and shows a dry-run first.

---

## Phase G — Search everywhere (build this first; later phases use it)

### G.1 One `SearchSelect` component (`components/ui/SearchSelect.tsx`)
Replaces **every dropdown in the app, whatever its length**: firms, contacts, roles/titles, groups/teams, targets, cities, schools, tracks, stages, priorities, categories, lessons, members. The only exceptions are yes/no toggles and the segmented controls from the design spec (difficulty, mode). No native `<select>` should remain anywhere.

**Behavior:**
- Click or focus → the list opens immediately below with suggestions:
  - recent and most-used first, then alphabetical
  - first 8 visible, scroll for more
- Typing → the list updates on every keystroke. Match order:
  1. exact
  2. starts with
  3. a word starts with ("pike" finds "Halvorsen & Pike")
  4. contains
  5. fuzzy, tolerating typos
  - Matched characters are bolded.
- Keyboard: ↑/↓ moves, Enter picks, Esc closes, Tab keeps the highlighted option. Works on touch.
- Optional `allowCreate`: last row is "Add 'Raymond James'" when there's no exact match. This creates the record inline (firms, roles, tags).
- Optional `multiple`: chips with ×, for targets and tags.
- Empty result: "No matches for 'xyz'" plus the create option if allowed.

**Data:**
- Small fixed lists filter on the client.
- Large or server-backed lists (contacts, firms, members) use `GET /api/search/[entity]?q=` with a 150 ms debounce, returning ≤ 20 results.
- Enable `pg_trgm` on Neon (`CREATE EXTENSION IF NOT EXISTS pg_trgm;`).
- Add GIN trigram indexes on `Firm.name`, `Contact.firstName || ' ' || Contact.lastName`, `Contact.title`, `Contact.email`.
- Rank results with `similarity()` plus a prefix boost, scoped to the current user's data, or to the club for member search.

**Accessibility:** ARIA combobox pattern (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, listbox options). Use `cmdk` (already used for ⌘K) or Radix Popover + cmdk.

### G.2 Replace existing dropdowns
1. Grep the codebase for `<select`, `Select`, and `Dropdown` components. List every instance with its file and what it picks.
2. Convert every one. Include at least:
   - **Add opportunity** (and Edit opportunity), every field:
     - **Firm:** `SearchSelect` with `allowCreate`. Open shows recent firms first; typing "hou" shows Houlihan Lokey.
     - **Role:** `SearchSelect` with `allowCreate`. Options are the existing role list (SA — Summer Analyst, etc.) plus anything the user has added.
     - **Contact:** replace the free-text "Contact name" box with a contact `SearchSelect`, filtered to people at the chosen firm first. Include an "Add new contact" option that opens the quick-add form with the firm prefilled.
     - **Stage:** `SearchSelect`.
     - Also add **Group** and **Location** fields, both `SearchSelect` with `allowCreate`.
   - **Pipeline:** firm, stage filters
   - **Contacts filters:** "All firms", "All categories"
   - **Email writer:** "Pick a contact"
   - **Targets** on the profile: firms, groups
   - **Members** filters
   - **Admin forms**
3. Keep segmented controls for tiny fixed lists (difficulty, mode).

3. Finish with a check: a grep for `<select` returns nothing outside the shared component, and every list page has a search bar.

### G.2b Bulk editing everywhere (shared, not just contacts)
Build one reusable pattern (`components/ui/BulkTable.tsx` + `BulkActionBar.tsx`) and apply it to **every list in the app**: contacts, Network, firms, pipeline opportunities (table view, and multi-select on the board), tasks, interactions on a contact, imports, club posts, roster, account review, question editor, mentor queue, and lesson resources.

- **Selecting:**
  - Checkbox column; shift-click selects a range.
  - The header checkbox selects the page, then offers "Select all N matching this search".
  - On the pipeline board, Cmd/Ctrl-click cards to multi-select.
- **Action bar** shows the count selected plus actions for that list. At minimum:
  - **Edit fields:** pick a field (stage, priority, firm, role, tags, owner, due date, status, track) and set one value for all selected, using `SearchSelect`. Tags support add and remove.
  - **Delete** (soft delete with Undo, as in H.1)
  - **Export CSV**
- **List-specific actions:**
  - Contacts: Move to Network, Mark Do Not Contact
  - Firms: **Merge firms** (choose the one to keep; contacts and opportunities move over)
  - Opportunities: Move stage, Set deadline
  - Tasks: Done, Snooze
  - Club posts: Archive, Re-send notification
  - Roster: Change role, Deactivate
- **Inline editing:** click any cell in a table to edit that one value in place. Enter saves, Esc cancels.
- **Safety:**
  - Over 10 items: a confirmation dialog states exactly what will change ("Set stage to First round for 14 opportunities").
  - Every bulk change shows a 10-second Undo toast.
  - The server applies each bulk change in one transaction, scoped to records the user owns, or to the club for admins.

### G.3 Contacts search bar
- At the top of Contacts. Searches name, firm, title, group, email, school, tags, personal notes, and interaction notes. Results update as you type.
- **Search by firm:** results group under a firm header, e.g. "Halvorsen & Pike · 3 contacts", listing the people beneath. Clicking the header opens the firm page.
- Shortcut: `/` focuses the search.
- The current search and filters are kept in the URL, so Back works and links can be shared.

### G.4 Firm pages
`/firms/[id]` shows the user's contacts at that firm with stage and last contact, their pipeline entry, tasks, and PE@Broad overlap (from the Club spec). Firm names in tables link here.

---

## Phase H — Contacts cleanup: delete, bulk actions, network list, data repair

### H.1 Delete and undo
- **Delete** from the row "⋯" menu and from the contact page.
- Delete is a soft delete (`deletedAt`). A toast shows "Deleted Maya Chen · Undo" for 10 seconds.
- **Trash** at `/contacts/trash`: restore, or "Delete forever". Items are purged automatically after 30 days.
- A deleted contact's tasks and reminders stop immediately.

### H.2 Bulk actions (uses the shared pattern from G.2b)
- Checkbox column. Shift-click selects a range. A header checkbox selects the page, then offers "Select all 412 matching this search".
- Action bar on selection, in addition to G.2b's Edit fields / Delete / Export:
  - Delete
  - Move to Network
  - Change stage
  - Change priority
  - Add tag
  - Mark Do Not Contact
  - Export CSV
- Confirmation dialog for over 10 contacts: "Delete 412 contacts? You can restore them from Trash for 30 days."

### H.3 Network vs. Contacts
- Add `Contact.list`: `"active"` (default) or `"network"`.
- **Network** holds people you're connected with but not actively working, such as LinkedIn connections. It's searchable and has its own tab, but it's excluded from follow-ups, tasks, the Outreach Queue, and the default Contacts view.
- "Add to contacts" promotes someone from Network to active, one at a time or in bulk.
- Logging any interaction with a Network person promotes them automatically.

### H.4 Import history and undo
- Add an `ImportBatch` model: id, userId, source (`rolodex_template` | `linkedin` | `csv`), fileName, createdAt, counts, status.
- `Contact` and `Interaction` get `importBatchId`.
- `/contacts/imports` lists past imports with their counts and an **"Undo this import"** button. It soft-deletes the contacts and interactions that import created. Contacts that already existed keep their record; only the interactions that import added are removed.

### H.5 Data repair (fixes what's live now)
The current importer marks every imported contact as contacted on the upload date, which makes everything "Overdue".
1. Read the current import code and find exactly what it writes: an auto-created interaction, a `lastInteractionDate` set to `now()`, or both.
2. Add `scripts/repair-imported-dates.ts` with a `--dry-run` mode that prints, per user:
   - how many interactions it would remove: importer-created interactions with no notes, dated within the import's minute
   - how many `lastInteractionDate` values it would reset
3. Without `--dry-run`:
   - remove those interactions
   - recompute `lastInteractionDate` from the remaining real interactions (null if there are none)
   - recompute stage and follow-ups
4. Add a matching button in Settings → Data, "Fix dates from old imports", that runs the same logic for the current user. Aiden runs the script once for everyone after reviewing the dry run.
5. Also offer the button **"Move LinkedIn-imported contacts with no conversations to Network"**, with a count in the confirmation.
6. Remove the "Imported" badge from table rows; show the import source on the contact page instead. "Stale" is calculated only from real interaction dates.

### H.6 Add and edit
- **New contact** (shortcut `C`): a short form where only first name, last name, and firm are required. Firm and role use `SearchSelect` with `allowCreate`. "Save & add another" keeps the dialog open.
- Every field on the contact page is editable inline.
- Duplicate warning when the email, LinkedIn URL, or name + firm matches an existing contact: "Looks like Maya Chen at Halvorsen & Pike already exists · Open · Create anyway".

---

## Phase I — Rolodex import v2

### I.1 Import screen (`/contacts/import`)
Three cards:
1. **Rolodex file (recommended):**
   - "Download template" button (`/templates/Prospect_Rolodex_Import_Template.xlsx`)
   - "Copy Claude prompt" button: the same prompt as the template's Start here tab, so students can convert their own spreadsheet
   - Drop zone for `.xlsx` (with Contacts + Interactions tabs) or the two CSVs
2. **LinkedIn connections:** instructions for exporting `Connections.csv` from LinkedIn, plus a drop zone. People land in **Network** (H.3), with no interactions created.
3. **Other CSV:** column-mapping step, as it works today, mapping to Contacts fields only.

### I.2 Parsing rules
- **Header matching** is case-insensitive and ignores `*` and punctuation. Accept common aliases:
  - "Company" → Firm
  - "Position" → Title
  - "Email Address" → Email
  - "URL" → LinkedIn URL
- **LinkedIn CSV:** skip the note rows above the real header (find the row containing "First Name"). "Connected On" goes to `connectedOn` on the contact only. **It's not an interaction.**
- **Matching an existing contact**, in this order:
  1. email (case-insensitive)
  2. LinkedIn URL (normalized: lowercase, no trailing slash or query)
  3. first + last + normalized firm
  - On a match, update empty fields and append to notes. Never overwrite a non-empty field without showing it in the preview.
- **Firm normalization:** lowercase, strip punctuation and "LLC/Inc/LP/Group/Partners/&/and" when comparing. If a firm is close to an existing one (trigram similarity > 0.6), suggest merging in the preview: "Halvorsen and Pike → Halvorsen & Pike?"
- **Interactions:**
  - Link by Contact Email, else by First + Last + Firm.
  - **A row without a valid Date is rejected and listed as an error. Never default to today.**
  - Dedupe on (contact, date, type, first 60 characters of the summary), so re-uploading the same file is safe.
- **Last contacted** = the latest interaction date. No interactions → null → shown as "Not contacted yet".
- **Stage:** use the Relationship Stage column if given. Otherwise derive it from the latest interaction:

| Latest interaction type | Stage |
|---|---|
| Cold email sent, LinkedIn message sent, Follow-up email sent | Emailed – no reply |
| They replied | Replied |
| Coffee chat, Phone call, Video call, In-person meeting, Thank-you sent | Chatted |
| Referral / resume sent | Referred me |
| Interview | Interviewing |
| Event / info session | Chatted |

- **Next Step + Next Step Due** → a Task (Phase J), with the interaction's notes attached.
- **Do Not Contact = Yes** → no reminders ever.

### I.3 Preview before saving
Shows:
- new contacts, updated contacts (with a field-by-field diff on click), new interactions, tasks to create, rows skipped as duplicates
- errors, with row number, tab, and reason, plus a "Download error rows" CSV
- dropdown values not in the allowed lists, with the closest suggestion ("Coffee Chat" → "Coffee chat") and a one-click "Accept all suggestions"

Then the **"Import"** button. Everything is written in one transaction and tagged with an `ImportBatch` (H.4).

### I.4 Interaction log on the contact page
A timeline, newest first. Each entry shows date, type, summary, advice, personal details, and next step. Entries are editable and deletable. The latest entry's summary appears under the contact's name in the table ("Last: Coffee chat · Oct 14 — Analyst class is 8 people…").

---

## Phase J — Follow-up engine, tasks, and outreach tracking

### J.1 Rules (`lib/followups.ts`, one pure function so it's testable)
Given a contact's interactions, return the next reminder, or none:

| Situation (latest relevant interaction) | Reminder | Due |
|---|---|---|
| Cold email or LinkedIn message sent, no reply since | Bump #1 | +5 business days |
| Bump #1 sent, still no reply | Bump #2 | +7 business days after bump #1 |
| Bump #2 sent, still no reply | Mark "Gone cold" | No reminder. Suggest re-engaging in 60 days |
| They replied, nothing sent since | Reply | +1 business day |
| Coffee chat / phone / video / in-person / interview, no thank-you after | Send thank-you | +1 day |
| Thank-you sent after a conversation | Send an update | +21 days |
| Any conversation, then quiet | Check in | A: +6 weeks · B: +8 weeks · C: +12 weeks |
| Referral / resume sent | Check in on the referral | +7 days |
| Event / info session | Follow-up email | +2 days |

- An explicit **Next Step Due** overrides the automatic date.
- No reminders for: Network list, Do Not Contact, Not pursuing, or deleted contacts.
- "Follow-up email sent" counts as a bump when it comes after an unanswered cold email.
- Unit tests cover every row in the table, plus the sample template data. For example, Priya Natarajan's Oct 21 cold email → bump due Oct 28. Use a fixed "today" in tests.

### J.2 Tasks page (`/tasks`)
- Sections: **Overdue · Today · This week · Later · Done**.
- Two kinds of task: automatic follow-ups (J.1) and Next Steps from imports or logged interactions.
- Each task row shows:
  - contact name and firm, linked to the contact
  - reason: "Bump #1 — cold email Oct 21, no reply"
  - the latest conversation snippet and the "Advice they gave" line
- Actions on each task:
  - **Draft email** — opens the email writer with the contact and email type preselected (bump, thank-you, update)
  - **Log** — quick interaction log, which completes the task
  - **Snooze** — 2 days, 1 week, or pick a date
  - **Done**
  - **Dismiss**
- Home "This week" card and the sidebar badge use the same data.

### J.3 Outreach tracker (Contacts → Outreach Queue tab)
- **Funnel of cold outreach:** Sent → Waiting → Bump #1 due → Bump #2 due → Replied → Gone cold. Show counts, plus the reply rate over the last 30 days.
- **List view:** each person's sent date, bumps sent, and days since the last touch, with the next action button.
- **Email writer integration:** after generating an email, the user clicks **"Mark as sent"**. That creates the interaction (Cold email sent, Follow-up email sent, Thank-you sent…) with today's date and starts the right reminder. Copying text alone never logs anything.

---

## Phase K — Notifications (in-app, email, text message)

### K.1 Model
```prisma
model Notification { id String @id @default(cuid()); userId String; kind String; title String; body String; url String; readAt DateTime?; createdAt DateTime @default(now()); @@index([userId, readAt]) }
model NotificationPref { userId String @id; timezone String @default("America/New_York"); email Boolean @default(true); sms Boolean @default(false); phone String?; phoneVerifiedAt DateTime?; smsConsentAt DateTime?; quietStart Int @default(21); quietEnd Int @default(8); followupDigest Boolean @default(true); mentorAlerts Boolean @default(true); clubPosts Boolean @default(true); challenges Boolean @default(true); messages Boolean @default(true) }
```
- All sending goes through one function, `notify(userId, kind, payload)`. It checks preferences and quiet hours, writes the in-app notification, and queues email and SMS.
- No SMS during quiet hours; it waits until `quietEnd`.

### K.2 In-app
A bell in the top bar with an unread count and a dropdown list. Clicking a notification opens its `url` and marks it read.

### K.3 Email (Resend)
- Use Resend. Its free tier covers a club this size.
- Plain, professional templates in the design-spec colors. Every email links into the app and has a working unsubscribe link per category.
- Env: `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `Prospect <notifications@prospectapp.co>`). Verify the domain in Resend (DNS records in Namecheap).

### K.4 Text messages (Twilio)
- **Opt-in only:** Settings → Notifications → "Text me".
  - Enter a phone number and verify it with a code (Twilio Verify).
  - A checkbox stores the exact consent text and a timestamp: "I agree to receive follow-up and club reminder texts from Prospect. Msg & data rates may apply. Reply STOP to opt out."
- **Send through a Twilio Messaging Service with Advanced Opt-Out on,** so STOP and HELP are handled automatically. Sync opt-outs back to `sms=false` via a status webhook.
- **US carrier registration is required before texts will deliver.** Register for A2P 10DLC (brand + campaign) or use a toll-free number with toll-free verification. Approval can take days to a couple of weeks.
  - Build SMS behind a feature flag (`SMS_ENABLED`).
  - Ship email and in-app notifications first; turn texts on once Twilio approves.
- **What gets texted (keep it rare):**
  1. the daily follow-up digest, only if something is due
  2. mentor-question alerts for admins (K.6)
  3. day-of event reminders, only if the user opted in
  - At most 2 texts per user per day.
- **Format example:** `Prospect: 3 follow-ups due today — Maya Chen, Priya Natarajan +1. prospectapp.co/tasks`
- **Env:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_VERIFY_SERVICE_SID`.

### K.5 Daily digest (Vercel Cron)
- `vercel.json` cron calls `/api/cron/daily` once a day (about 8:30 AM Eastern: `30 13 * * *` UTC). Protect it with `CRON_SECRET`.
- For each user with tasks Overdue or due Today: one in-app notification, one email digest (tasks grouped, each with a "Draft email" link), and one SMS if opted in.
- Also checks mentor questions unanswered for over 24 hours (K.6) and sends event reminders for that day.

### K.6 Mentor question alerts for admins
- When a student submits "Ask a mentor":
  - **immediately** notify every admin and mentor: in-app, email, and SMS if opted in
  - message: "New question on 5.2 CAPM & beta from Jordan K.: 'Why does Hamada assume…'", linking to `/admin/learn/questions/[id]`
- **Reminder** to admins if still unanswered after 24 hours, once.
- When answered, notify the student in-app and by email with a link to the answer.
- The admin queue shows open questions oldest first, with the time waiting.

---

## Phase L — Club publishing: content, projects, events, announcements, resources

The Content, Projects, Events, and Announcements tabs exist but have no way to add anything.

### L.1 Who can post
Admins, plus a new `officer` club role (set on the roster page). Members only view, download, RSVP, and mark items done.

### L.2 One "Post to club" flow
- A primary button on the club header, **"Post to club"**, and an "Add" button on each tab's empty state, shown to admins and officers only.
- The form starts with type: **Resource · Assignment · Reading · Case study · Project · Event · Announcement**.

| Type | Fields |
|---|---|
| Resource | Title, description, files (PDF, XLSX, PPTX, DOCX, images; up to 25 MB each) and/or links, tags, related lessons |
| Assignment / Reading / Case study | Same as Resource, plus an optional due date and "Members can mark done" |
| Project | Title, description, team (member `SearchSelect`, multiple), lead, due date, status (Planning / In progress / Done), files, links |
| Event | Title, start and end date/time (Eastern), location or meeting link, description, capacity (optional), RSVP on/off |
| Announcement | Title, rich text (bold, links, lists), pin to Overview |

**Audience** (all types): All members (default), or selected tracks, or selected members.

**Delivery options** (checkboxes):
- Show in Activity feed (on by default)
- Notify in app (on)
- Email members (off by default)
- Text members (admins only; off; for urgent items only; uses K.4 and respects opt-ins)

**Files:** Vercel Blob. Downloads go through an authenticated route that checks club membership and logs a download.

### L.3 What members see
- **Overview:** pinned announcement, next event, newest 3 posts, open assignments due soon.
- **Content:** filter chips All / Resource / Assignment / Reading / Case study, plus search. Cards show type, title, posted by, date, due date, and "Done" status.
- **Events:** upcoming and past.
  - RSVP buttons (Going / Can't make it) with counts.
  - "Add to calendar" downloads an `.ics` file.
  - A reminder the morning of the event for anyone who RSVP'd Going.
- **Projects:** cards with team avatars, status, and due date; a detail page with files and updates.
- **Announcements:** newest first; pinned at top.

### L.4 Admin insight
On each post: views, downloads, done count, and RSVP list, with "Who hasn't opened this?" and a one-click reminder to those members. Posts can be edited, archived, or deleted.

### L.5 Extra resources in Tools
Tools → Resources gets a **"From PE@Broad"** section at the top, showing every Resource post, searchable.

---

## Phase M — Workbooks v2 and guided in-browser Excel

### M.1 Replace the workbook set
- The admin resources page accepts the whole `PEB_Practice_Workbooks_v2.zip`:
  - The server unzips it and maps each file to a `workbookKey` (name without `_KEY`) and kind (`_KEY` → answer key).
  - It creates new versions and shows a summary before confirming.
- v2 files have **no frozen panes**.
- PEB_03 gains a Country Risk tab, and there are 8 new workbooks.

**Workbook ↔ lesson map (replaces the v1 table in the Learn spec).** Update each lesson's `workbook` field. A lesson can list more than one workbook; show the first as primary.

| Workbook | Lessons |
|---|---|
| PEB_00_TVM_IRR_MOIC | 0.1, 0.2, 0.3, 11.1 |
| PEB_01_Accounting_3Statement_Linking | 1.1, 1.2, 1.3 |
| PEB_08_Working_Capital | 1.4 |
| PEB_09_Deferred_Taxes_NOLs | 1.5 |
| PEB_06_Merger_Model | 1.6, 7.2, 7.3, 7.4 |
| PEB_02_EV_Equity_Bridge | 2.1, 2.2, 2.3, 2.4, 2.5 |
| PEB_10_Sum_of_the_Parts | 3.1 |
| PEB_05_Comps_Precedents_FootballField | 3.2, 3.3, 4.1, 4.2, 4.3, 4.4 |
| PEB_03_CAPM_Beta_WACC | 5.1, 5.2, 5.3, 5.4, 5.5 |
| PEB_04_DCF | 6.1, 6.2, 6.3, 6.4, 6.5, 6.7 |
| PEB_07_LBO | 8.1, 8.2, 8.4, 8.5, 8.7 |
| PEB_11_Credit_Analysis_Recovery | 8.3, 9.1, 9.2, 9.3 |
| PEB_12_Bank_Valuation | 6.6, 10.1 |
| PEB_13_REIT_Valuation | 10.2 |
| PEB_14_SaaS_Metrics | 10.4 |

### M.2 Guided mode: "Walk me through it" (optional)
- **Optional, never required.** On every workbook card: **"Download workbook"** (primary) and **"Walk me through it in the browser"** (secondary). The answer-key unlock rule stays the same.

**Route:** `/learn/workbooks/[key]/guided`.

**Data:**
- Load the **student** `.xlsx` with SheetJS (`xlsx`, community edition): values, formulas, and column widths.
- Load `content/walkthroughs/[key].walkthrough.json`. Each step has:
  - `sheet`, `cell`, `kind` (`formula` | `formula-text` | `value` | `choice` | `text`)
  - `instruction`, `hint`, `expectedFormula`, `expectedValue`, `tolerance`, `numberFormat`
  - `references` (each referenced cell with a plain-English label and value)
  - `options` (for choices)
- Steps are already ordered so each step's inputs come first.

**Formula engine:** must evaluate in the browser and support exactly these functions plus array arithmetic inside `SUMPRODUCT`:
`AVERAGE, CORREL, COVAR, IF, IRR, MAX, MEDIAN, MIN, NPV, PV, QUARTILE, SLOPE, SQRT, STDEV, SUM, SUMIF, SUMPRODUCT, VARP`.
- **Licensing:** HyperFormula is GPLv3 unless you buy a license, and Prospect charges money, so check before using it. An MIT alternative is `fast-formula-parser` with `@formulajs/formulajs`.
- Whatever engine you pick, `npm run test-walkthroughs` must pass (M.4).

**Layout:**
- **Left: a spreadsheet grid.**
  - Column letters and row numbers, sheet tabs at the bottom, and a formula bar.
  - Inputs in blue, step cells yellow until completed, then plain. The current step's cell gets a thick accent outline and is scrolled into view.
  - Referenced cells get a light highlight while the step is active.
- **Right: the step panel.**
  - "Step 12 of 139 · DCF"
  - the instruction, and a **"Uses"** list of reference chips (hovering one highlights the cell)
  - **Hint** (click to reveal)
  - **Show me:** reveals the formula plus a plain-English version built from the reference labels, e.g. "= Revenue (2027E) × CapEx (% of revenue)"
  - **Check** and **Skip** buttons
  - a collapsible list of all steps grouped by sheet, so students can jump around

**Checking:**
- The student types into the cell or formula bar.
- `formula` steps: evaluate the input with the engine against their current sheet state. Correct if the result is within `tolerance` of `expectedValue`.
  - If they typed a plain number that's right: "Right number — now enter it as a formula that references the cells, so it updates when inputs change." Don't mark it complete.
  - If wrong: show their result next to "Expected about [value]" only after 2 tries; otherwise show "Not quite — check the Uses list."
- `choice` steps: dropdown with the options.
- `text` steps: textarea, then reveal the model answer and let them mark Got it / Review.

**Saving and finishing:**
- Progress saves per user (`WorkbookProgress`: userId, workbookKey, entries JSON, completedStepIds, updatedAt), so students can leave and resume.
- **Download my workbook** exports their filled-in version as `.xlsx` with their formulas.
- Small XP: +2 per step correct on the first try, +25 for finishing a workbook. No penalties.
- On phones, show "Best on a laptop" with a "Continue anyway" option.

### M.3 Lessons
- Each lesson's `excelLink` block lists its workbook(s) with both buttons.
- The Practice "Review lesson" links and the guided mode's "Related lesson" link go both ways.

### M.4 Test
`scripts/test-walkthroughs.ts` runs, for every walkthrough JSON:
1. Load the student file.
2. Enter each step's `expectedFormula` in order, using the chosen engine.
3. Assert every computed value is within tolerance.

Run it in `npm run build` or CI. If a function isn't supported, implement it before shipping.

---

## Out of scope (for now)
Gmail/Outlook inbox sync (logging is manual or via "Mark as sent"), web push notifications, grading uploaded workbooks.
