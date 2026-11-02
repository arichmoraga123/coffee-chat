# Resume Reviewer v2 — Build Spec for Claude Code

**Problem:** the current reviewer grades everyone against an experienced-candidate bar. A freshman with no finance internship got 4/10 for not having finance experience, which no freshman is expected to have.

**Goal:** grade each student **relative to a strong resume at their own level**. Most of the grade comes from how well they describe what they have done. Formatting is measured from the PDF with code, not guessed by the AI.

Use the tokens and components from `CLAUDE_CODE_SPEC_Design.md`. **Three sessions, in this order:** Part C (UI cleanup and the guided Excel fix — affects every page, so do it first), then Part A (resume reviewer), then Part B (recruiting openings upload). Open each with:
> Read `CLAUDE_CODE_SPEC_Resume_Reviewer.md`. Build Part C only.

> Read `CLAUDE_CODE_SPEC_Resume_Reviewer.md`. Build Part A only (do step 0 first and report back).

> Read `CLAUDE_CODE_SPEC_Resume_Reviewer.md`. Build Part B (section 8) only.

**File for Part B:** `Prospect_Recruiting_Openings_Template.xlsx` → `public/templates/`.

---

## 0. Before changing anything
Read the current resume reviewer: the route, the prompt, the scoring, and the UI. Report:
- what it currently checks
- how the score is produced
- which model and settings it uses

Then build v2 alongside it, at the same route, behind `RESUME_V2=true`. Switch over once it's verified.

---

## 1. Grading level (the student picks; defaulted from their profile)

At the top of the reviewer, above the upload box:

- **Class year:** Freshman · Sophomore · Junior · Senior. Default from the profile's class year.
- **Recruiting for:** IB · PE · VC · Growth Equity · Private Credit · Hedge Fund / Markets · Consulting · Corporate Finance · Other. Default from the profile track. Use `SearchSelect`.
- **Experience so far** (optional checkboxes, used to calibrate feedback):
  - finance internship
  - other internship
  - part-time or summer job
  - finance club
  - case competition
  - self-study (WSP, BIWS, etc.)

The results header always shows the level used: **"Graded as: Freshman · IB."** A "Re-grade at a different level" link sits beside it.

---

## 2. Rubric by level (weights out of 100)

| Category | Freshman | Sophomore | Junior / Senior | What it measures |
|---|---|---|---|---|
| Formatting & structure | 20 | 15 | 15 | Computed in code from section 3 |
| Bullet writing quality | 30 | 25 | 25 | Strong action verb, specific, shows result, quantified where possible, concise, consistent tense |
| Experience relevance | 10 | 20 | 30 | How well experiences show skills banks want. **Any job counts** — see rules below |
| Leadership & involvement | 20 | 15 | 10 | Roles with responsibility: clubs, teams, organizing, varsity sports, jobs with trust |
| Finance interest & skills | 10 | 15 | 10 | Finance clubs, coursework, case competitions, stock pitches, modeling self-study, Excel |
| Education & academics | 10 | 10 | 10 | GPA presentation, honors, relevant coursework, test scores where helpful |

Store the weights in a config file (`lib/resume/rubric.ts`) so admins can adjust them later from `/admin/resume-rubric`.

### Grading rules the AI must follow (put these in the prompt verbatim)
1. **Grade against a strong resume for this level, not against professionals.** A 9/10 freshman resume is one a bank would happily see from a freshman.
2. **Freshman:** a missing finance internship is never a deduction. A freshman with no finance internship and well-written bullets should be able to score 8 or higher.
3. **Sophomore:** finance exposure is expected through clubs, coursework, case competitions, or self-study. An internship is a plus, not a requirement.
4. **Junior/Senior:** a relevant internship is expected. Its absence lowers Experience relevance, but bullets and leadership still count fully.
5. **Transferable experience counts.** Restaurant, retail, tutoring, lifeguarding, family business, varsity sports, and military are graded on what the bullets show: responsibility, client service, attention to detail, working under pressure, numbers handled, people led.
6. **Grade the writing, not the prestige.** The same job described well scores higher than a big-name internship described vaguely.
7. **Every deduction cites the exact text it's about,** and says how to fix it.
8. **Rewrites never invent facts.** Use `[X]` placeholders where a number would help ("Served [X] customers per shift").

### Score bands (shown with the score)
| Score | Meaning (relative to the chosen level) |
|---|---|
| 9–10 | Ready to send |
| 7–8 | Strong — a few fixes |
| 5–6 | Solid base — needs a revision pass |
| Below 5 | Needs a rewrite — start with the Top 3 fixes |

---

## 3. Formatting checks (deterministic, in code)

Extract text and layout from the PDF on the server with **`unpdf`**. It runs on Vercel serverless; the current setup notes say `pdfjs-dist` with canvas fails there. Use `getDocumentProxy` → `page.getTextContent()` (items have x/y via `transform`, `fontName`, and height) and `page.view` for page size. Fonts come from `textContent.styles`; normalize names by stripping the subset prefix (`ABCDEF+`) and weight/style suffixes, so bold and italic variants count as one family.

| Check | Pass rule | Message when it fails |
|---|---|---|
| Length | Exactly 1 page | "Your resume is 2 pages. Students should keep it to one." |
| Page fill | Text reaches at least 85% of the page height | "About 30% of the page is blank — add a project, activity, or skills line." |
| Margins | Each side between 0.5″ and 1.0″ (36–72 pt) | "Left margin is 0.3″ — widen to at least 0.5″." |
| Font families | At most 2 | "3 fonts found: Garamond, Arial, Calibri. Use one (two at most)." |
| Body font size | 10–12 pt, consistent | "Bullet text varies between 9.5 and 11 pt." |
| Name | Largest text on the page, 14–20 pt | |
| Section headers | All the same size and style | |
| Dates | One format throughout ("May 2026" vs "05/2026" mixed = fail); right edges aligned within 6 pt | "Dates aren't right-aligned in 2 entries." |
| Bullets | Same bullet character throughout; each bullet ≤ 2 lines | "4 bullets run to 3 lines — tighten them." |
| Bullets per entry | 2–5 for jobs; 1–4 for activities | |
| Section order | Education first (standard for students) | |
| Contact line | Email, phone, and LinkedIn present | "Add your LinkedIn URL." |
| No photos or graphics | No images on the page (`getOperatorList`, image paint operations) | |

- **Formatting & structure score** = share of checks passed, weighted: length, margins, and fonts count double. It's computed in code so it's the same every time for the same file.
- The AI gets the check results so its comments don't contradict them, but it can't change the formatting score.
- **Uploads:** PDF only for full grading. If a student uploads a `.docx`, grade the content and show "Export to PDF to check formatting."

---

## 4. The AI call

- Keep sending the PDF to Claude as a base64 document block (current setup). Keep the existing model setting, `export const maxDuration = 60`, and temperature 0 for consistency.
- **System prompt includes:**
  - the level
  - that level's rubric weights
  - the grading rules from section 2, verbatim
  - the formatting check results
  - **exemplars:** 2–3 de-identified strong resumes per class year from the PE@Broad resume book, stored in `content/resume-exemplars/[level]/`. Load them only if present. Strip names, emails, and phone numbers before storing.
- **Structured output** (tool use / JSON schema), validated with Zod:
```json
{
  "categories": [{ "name": "Bullet writing quality", "score": 0-10, "summary": "...", "evidence": ["exact quote", "..."] }],
  "bullets": [{ "section": "Experience", "original": "...", "issues": ["no result", "weak verb"], "rewrite": "...", "rating": "strong|ok|weak" }],
  "strengths": ["...", "..."],
  "topFixes": ["...", "...", "..."],
  "levelNote": "One sentence on how this compares to a strong [level] resume."
}
```
- **Overall score** = weighted average of the category scores (Formatting from code; the rest from the AI), rounded to 0.5. Compute it in code, not by the AI.

---

## 5. Results page

1. **Header:** score, band label, "Graded as: Freshman · IB" with the re-grade link, and the `levelNote`.
2. **What's already strong:** 2–3 bullets. Show this before the fixes.
3. **Top 3 fixes:** each one concrete and actionable.
4. **Category breakdown:** a bar per category with its weight, score, a summary, and expandable evidence quotes.
5. **Formatting checklist:** each check with ✓ or ✗ and the fix message.
6. **Bullet-by-bullet:** a table of original, issues, suggested rewrite (with `[X]` placeholders), and a **Copy** button. Filter: Weak only / All.
7. **History:** past uploads with dates and scores. "Compare with previous" shows which fixes were made and how the scores moved.
8. Students can delete any stored resume and its results.

Tone: direct and encouraging. No "unfortunately" and no lecturing. Every negative comes with a fix.

---

## 6. Calibration test (so this doesn't happen again)

- Admin page `/admin/resume-rubric` → **Calibration set:** upload test resumes, tag each with a level and an expected score range (e.g., "Freshman, no finance internship, well-written → 7.5–9").
- `npm run test-resume-grader` grades the whole set and reports any resume outside its expected range.
- Seed the set with at least:
  - a freshman with only non-finance jobs and strong bullets (expect 7.5+)
  - a freshman with vague bullets (expect 4–6)
  - a sophomore with finance clubs (expect 7+)
  - a junior with a strong internship (expect 8+)
  - a 2-page, 3-font resume (expect a Formatting score at or below 5)
- Grade each resume twice. The two scores must be within 0.5 of each other.

---

## 7. Done when
- The level selector defaults correctly from the profile.
- Formatting checks match a manual look at 3 sample PDFs.
- The calibration set passes.
- The freshman case is fixed: a non-finance, well-written freshman resume scores 7.5+ at the Freshman level.

---

# Part B

## 8. Recruiting openings upload (admin) and Openings page

Aiden collects application openings from a tracker site and needs to upload them in bulk. Members then see what's open for their class year, add openings to their pipeline, and get deadline reminders.

**Depends on:** `SearchSelect` and the bulk-edit table (Outreach spec, Phase G). Reminders use the notification system (Outreach spec, Phase K). If Phase K isn't built yet, store reminders and show them in-app only.

### 8.1 Model
```prisma
model Opening {
  id              String    @id @default(cuid())
  clubId          String?            // null = visible to all users; PE@Broad uploads set the club
  firmId          String
  program         String             // "2027 Investment Banking Summer Analyst"
  roleType        String?            // Summer Analyst | Sophomore / early insight program | Diversity program | Off-cycle internship | Full-time Analyst | Externship / spring week | Other
  track           String?
  group           String?
  classYears      String[]           // Freshman | Sophomore | Junior | Senior
  recruitingSummer Int?
  city            String
  opensOn         DateTime?
  deadline        DateTime?
  deadlineType    String   @default("Unknown") // Fixed | Rolling | Unknown
  statusOverride  String?            // only when the file sets Status
  link            String?
  source          String?
  notes           String?
  importBatchId   String?
  archivedAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@unique([firmId, program, city, recruitingSummer])
}
model OpeningReminder { userId String; openingId String; remindOpen Boolean @default(true); remindDaysBefore Int @default(7); @@id([userId, openingId]) }
```
- **Status is computed, not stored** (unless `statusOverride` is set):
  - today before `opensOn` → Not yet open
  - after `deadline` → Closed
  - otherwise → Open
  - With no dates: Open if Rolling, Unknown if Unknown.

### 8.2 Upload (admins and officers): Recruiting → Openings → **Upload**
- Accepts `.xlsx` or `.csv`. "Download template" button serves `/templates/Prospect_Recruiting_Openings_Template.xlsx`.
- A "Copy Claude prompt" button copies the same prompt as the template's Start here tab.
- **Header matching** is case-insensitive and ignores `*`. Accept common tracker aliases:
  - Company → Firm
  - Role / Programme / Program / Position / Title → Program / Position
  - Location / Office → City
  - Opening date / Open date / Opens → Opens On
  - Closing date / Close date / Deadline / Apply by → Deadline
  - Link / URL / Apply link → Application Link
  - Category / Sector / Division → Track
  - Year / Class → Class Years Eligible
- **Parsing:**
  - Dates accept real Excel dates, `YYYY-MM-DD`, `MM/DD/YYYY`, and `Nov 15, 2026`.
  - The words "Rolling", "ASAP", or "Open now" in a date cell → blank date + Deadline Type Rolling.
  - "TBC", "TBD", "N/A", or "Unknown" → blank date + Unknown.
  - **Never guess a date.**
  - Multiple cities separated by `;` or `/` become one opening per city.
- **Firms:** match with the same normalization and fuzzy-merge suggestions as the rolodex import (Outreach spec I.2). Create the firm if it's new.
- **Preview before saving:** new, updated (field diff on click), unchanged, and error rows (with row number and reason), plus out-of-list values with suggested matches.
- **Option:** "Archive openings from this source that aren't in this file". Off by default, for when a re-upload should replace the old list.
- Upserts on Firm + Program + City + Recruiting Summer, and the batch is recorded so the upload can be undone (same pattern as Outreach H.4).

### 8.3 Openings page (`/recruiting/openings`, in the sidebar under Recruiting)
- **Filters:** search bar plus `SearchSelect` filters for Track, Role Type, Class Year, City, Firm, Status, and Recruiting Summer.
  - Default view: the user's class year and track, Status = Open or Not yet open, sorted by deadline (soonest first, Rolling next, Unknown last).
- **Table columns:** Firm (links to the firm page), Program, City, Opens, Deadline (with "in 6 days" in `--warn` when ≤ 7 days), Status badge, Apply link, and actions.
- **Row actions:**
  - **Add to pipeline** — creates an opportunity at stage Target with the deadline, role, and link prefilled. The row then shows "In your pipeline · Applied". If the user has contacts at that firm, it shows "You know 2 people here" linking to them.
  - **Remind me** — when the opening opens, and N days before the deadline (default 7). Reminders go through `notify()`; the daily digest includes "Opens today" and "Deadline in 7 days".
  - **Mark applied** — moves the pipeline opportunity to Applied.
- **Calendar view toggle:** a month grid showing opens and deadlines.
- **Admins:** bulk edit with the shared pattern (set track, class years, status, archive), and inline editing of any cell.
- **Home page:** the "This week" card adds "Deadlines this week" from openings the user saved or added to their pipeline.
- **Club feed:** after an upload, an optional "Post to club" checkbox announces "12 new openings added" with a link.

### 8.4 Done when
- The sample template uploads with zero errors and produces 11 openings (one row lists two cities).
- Re-uploading the same file changes nothing.
- A tracker-style CSV with Company / Role / Location / Closing date headers maps automatically.
- Add to pipeline and Remind me both work end to end.

---

# Part C — UI cleanup and guided Excel fix (run this first)

Problems Aiden found on the live app:
- the guided Excel mode can't be typed into or navigated with arrow keys, and its labels are cut off
- the pipeline board is cramped, with text cut to "George Kh…" and "M…"
- page tabs sit on a tiny scroll area, with the page title jammed against the tab underline
- dropdowns remain on Practice
- the sidebar can't be collapsed

## 9. Collapsible sidebar
- **Toggle:** a button at the top of the sidebar (panel icon, `aria-label="Collapse sidebar"`), plus the shortcut **Ctrl/Cmd + \\**.
- **Collapsed state:** a 64px icon rail. Each icon shows a tooltip with its label on hover. Count badges become small dots. Section labels are hidden, and Search becomes an icon that opens ⌘K.
- **Remember the choice** per user (save it to the user's settings; fall back to `localStorage`).
- **Automatic behavior:**
  - The sidebar starts collapsed between 1024 and 1279px wide.
  - The **guided Excel** page and the **pipeline board** open with it collapsed, with the toggle still available.
  - Below 768px the mobile tab bar is used, as already specified.
- The main content area animates its width with the sidebar (150ms) without layout jumps.

## 10. Page header and tabs (fix on every page)
- **Order on every page:** breadcrumb (if nested) → **title + subtitle on the left, actions on the right** → **tabs underneath**.
  - Today the tabs sit above the title. Move them below, as `CLAUDE_CODE_SPEC_Design.md` §1.5 says.
- **Spacing:**
  - page top padding 32px
  - title → subtitle 4px
  - header → tabs 20px
  - tabs → content 24px
  - Never put text closer than 16px to a divider line.
- **The scroll arrows next to the tabs:**
  - These come from a tab row with a fixed height and `overflow: auto`. Make the tab row `height: auto; overflow-y: visible`.
  - If the tabs are wider than the screen: `overflow-x: auto` with the scrollbar hidden, a fade on the clipped edge, and small chevron buttons to scroll. **No vertical scrollbar ever.**
- **Long tab rows** (the club page has 9 tabs): show the first 6, and put the rest in a "More ▾" menu when they don't fit.

## 11. Pipeline board
- **Columns:** min 280px wide; the board scrolls horizontally inside the page, with fade edges. Column headers stick to the top and show a count ("Offer · 2").
- **"Hide empty stages"** toggle, on by default: empty stages collapse to a 48px strip with the stage name written vertically. A strip expands when a card is dragged over it.
- **Cards:**
  - Firm name wraps to at most 2 lines; never truncated.
  - Role chip (SA), plus a track chip **only if a track is set** — remove the "OTHER" placeholder.
  - Deadline line ("Deadline Nov 15 · in 14 days" or "No deadline").
  - Contacts: up to 2 names wrapping onto their own lines, then "+N more".
  - **Remove the "M…" dropdown** inside the card. Change stage by dragging, or through a "⋯" menu at the card's top right: Move to → stage list, Edit, Delete.
  - The whole card is draggable; a grip icon appears on hover, without reserving a left gutter.
  - Card padding 14px; gap between cards 10px.
- **Board / Table toggle:** the table view uses the shared bulk-edit table from Outreach Phase G.2b.

## 12. Practice page filters
- **Module** and **Lesson** become `SearchSelect`. Lesson options are filtered by the chosen module, and lessons can be found by number or title ("6.4" or "terminal").
- **Questions per session** becomes a segmented control: 5 · 10 · 20 · 30.
- The filter card wraps onto two rows at narrower widths, without squeezing labels.

## 13. Guided Excel: make it behave like Excel

### 13.1 Grid engine
- The grid must be keyboard-first. Either build it carefully, or use an MIT-licensed grid such as **Glide Data Grid**.
- **Don't use Handsontable or AG Grid Enterprise** without checking their licenses; both need paid licenses for commercial apps.
- The formula engine and checking from Outreach Phase M stay the same.

### 13.2 Rendering
- **Column widths and row heights** come from the workbook (SheetJS `!cols` / `!rows`). Column A is wide enough for its labels, as in Excel.
- **Text overflow:** text overflows into empty cells to its right, like Excel, and is only clipped when the next cell has content. Text is left-aligned and numbers right-aligned.
  - This fixes labels showing as "ue", "arn", "in 3 years".
- **Merged cells** (`!merges`) render merged. Wrapped-text cells wrap.
- **Number formats** are applied with SheetJS's formatter (SSF): `$#,##0`, `0.0%`, `0.0x`, and dates.
- **Fonts:** the app font with tabular numbers, not monospace.
- **Colors:** blue for inputs, black for formulas. Answer cells keep a clear yellow tint in light mode, and a readable amber tint in dark mode with enough contrast for the typed value.
- **Headers:** column letters and row numbers stay pinned while scrolling. No frozen panes inside the sheet.
- **The Instructions sheet** isn't shown as a grid. Show it as the first tab rendered as readable text: the steps and the color legend.

### 13.3 Keyboard and mouse (must all work)
| Action | Behavior |
|---|---|
| Click a cell | Selects it. The formula bar shows its formula or value |
| Arrow keys | Move the selection one cell |
| Ctrl/Cmd + arrow | Jump to the edge of the data region |
| Tab / Shift+Tab | Move right / left |
| Enter / Shift+Enter | Commit and move down / up |
| Typing any character | Starts editing and replaces the contents (like Excel) |
| F2 or double-click | Edit in place, keeping the contents, with the cursor at the end |
| Esc | Cancel editing |
| Delete / Backspace | Clear the selected answer cell(s) |
| Click the formula bar | Edit there; Enter commits |
| **Point mode** | While editing a formula after an operator or `(`, clicking a cell or pressing arrows inserts its reference; Shift+click or Shift+arrows extends it to a range (`B5:B9`) |
| F4 | Cycles the reference under the cursor: B5 → $B$5 → B$5 → $B5 |
| Ctrl/Cmd+C / V | Copy and paste between answer cells, shifting relative references like Excel |
| Ctrl/Cmd+D / R | Fill down / right from the top or left cell of the selection, shifting references |
| Ctrl/Cmd+Z / Y | Undo / redo |
| Shift+click or Shift+arrows | Select a range |

- **Locked cells:** input and label cells are read-only. Typing in one shows a small tooltip: "Inputs are locked here — change them in the downloaded workbook."
- **Checking:** happens automatically on Enter.
  - A correct cell gets a small green ✓ in its corner, and the step panel moves to the next unfinished step.
  - A wrong cell gets a red corner mark, and the panel shows the feedback rules from Outreach M.2.
  - The **Check** button stays available for students who prefer it.
- **Free order:** students can fill answer cells in any order. The step panel follows whichever answer cell is selected.

### 13.4 Layout
- The grid takes the full width of the main area. The step panel is a right-hand drawer (360px) that collapses to a slim "Steps" tab.
- With the sidebar collapsed (section 9), the grid has room for at least 8 columns at 1280px.
- The sheet tabs at the bottom are always visible.

### 13.5 Test (Playwright)
Add `tests/guided-excel.spec.ts`. It must:
1. Open guided PEB_00 and press → until E5 is selected.
2. Type `=B5/(1+C5)^D5` and press Enter.
3. Check: E5 shows `$751.31` with a ✓, and the selection is now on E6.
4. In E6, type `=`, click B6, type `*(1+`, press ← to insert C6 by point mode, finish the formula, and press Enter.
5. Check: the value is correct.
6. Check: Ctrl+D fills the discount-factor grid correctly.
7. Check: typing into an input cell is blocked.

## 14. Whole-app layout audit
1. With Playwright, screenshot every main page at **1024, 1280, 1440, and 390px wide**, in light and dark themes. Save them to `docs/ui-audit/before/` (gitignored).
2. Fix every instance of:
   - text cut off where it matters: names, firm names, buttons, selected dropdown values, tab labels
   - text closer than 16px to a divider
   - nested or unexpected scrollbars
   - controls squeezed below their minimum width
   - inconsistent spacing between header, tabs, and content
   - any leftover native dropdown
3. In dense tables, long values may truncate with a tooltip showing the full text, but never in cards, headers, or buttons.
4. Save matching screenshots to `docs/ui-audit/after/` and list what changed per page, so Aiden can review.
