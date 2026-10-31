# Prospect Learn — Build Spec for Claude Code

**What this is:** a new `/learn` section in Prospect (prospectapp.co) with interactive technical lessons for PE@Broad freshmen. Self-paced, no deadlines. Each lesson walks start-to-end through a topic, with fill-in-the-blanks, calculations, and expandable deep dives for the nuanced follow-ups (e.g., "can beta be negative?"). Each lesson links to a downloadable Excel workbook; answer keys unlock after a student completes the lesson.

**Files that come with this spec (put them in the repo first):**
- `LESSON_CONTENT_Nuance_Bank.md` → `content/LESSON_CONTENT.md` — **the full written content for all 56 lessons**: walkthroughs, fill-in answers, all 246 deep dives with explanations and "Say it" interview answers, and checkpoints. **Source of truth for lesson content.** Claude Code converts it to JSON; it does not write new content.
- `CURRICULUM.md` → `content/CURRICULUM.md` — the 56-lesson map with recommended order and workbook links.
- `lesson-5-2-capm-beta.json` → `content/lessons/5-2-capm-and-beta.json` — the fully written sample lesson. **This is the quality and format bar for every other lesson.**
- 14 Excel files → upload through the admin page once Phase 3 is built (7 student workbooks + 7 answer keys).
- Optional: the BIWS 400 Questions PDF and WSP Red Book → `content/sources/` (**add `content/sources/` to `.gitignore`** — these are paid materials and must not be committed or served).

**Stack reminders (existing app):** Next.js App Router, Prisma, Neon Postgres, Anthropic API (`claude-sonnet-4-5`), deployed with `npx vercel --prod` from inside `dealflow-crm/`. Seeds use `skipDuplicates`, never `deleteMany`. Long-running API routes need `export const maxDuration = 60`.

**How to use this spec:** paste one phase per Claude Code session. Start each session with: *"Read `CLAUDE_CODE_SPEC_Prospect_Learn.md`, `content/CURRICULUM.md`, and `content/LESSON_CONTENT.md`. Build Phase N only. Don't touch existing features outside what's listed."*

---

## Phase 1 — Lesson engine + the sample lesson

### 1.1 Content format
Lessons live as JSON files in `content/lessons/{id}-{slug}.json`. Write a Zod schema in `lib/learn/schema.ts` matching the sample. Validate every lesson at build time (`npm run validate-lessons`) so a malformed lesson fails the build instead of breaking a page.

Top-level fields: `id, slug, module, moduleTitle, title, difficulty ("core" | "follow-up" | "advanced"), estMinutes, prerequisites[], relatedQuestionTags[], workbook?, sourceRefs[], objectives[], blocks[]`.

### 1.2 Block types (one React component each, in `components/learn/blocks/`)

| Block | Behavior |
|---|---|
| `text` | Markdown (react-markdown + remark-gfm). |
| `formula` | KaTeX render + a legend table of symbols. Tap a symbol to highlight its legend row. |
| `stepThrough` | Shows one step at a time with "Next" / "Back"; completed when the last step is reached. |
| `fillBlank` | Renders `template` with inline inputs at `{{n}}`. Text blanks: case-insensitive, trim, strip punctuation, match any `accept` value. Numeric blanks: parse (allow `%`, `$`, commas, `x`) and compare within `tolerance`. Wrong answer → red + show `hint`. After 2 wrong attempts → "Show answer" button. |
| `calc` | Single numeric input with unit; same parsing/tolerance. On correct or reveal, show `solution`. |
| `mcq` | Radio options; on submit show correct/incorrect + `explanation`. Shuffle option order per user. |
| `deepDive` | Collapsible accordion, collapsed by default. Badge by difficulty: follow-up (amber), gotcha (red), advanced (purple). Track "opened". Deep-link support: `/learn/5-2#b9` opens and scrolls to that dropdown — so you can send a freshman a link straight to "Can beta be negative?". |
| `orderSteps` | Drag-to-reorder (dnd-kit, touch-friendly). Items shuffled on load; "Check" highlights correct positions. |
| `checkpoint` | List of out-loud prompts. Each has "I nailed it" / "Shaky". Shaky ones get added to the student's review list. |
| `excelLink` | Card that pulls the lesson's workbook from `LessonResource` (Phase 3). Before Phase 3, render a placeholder. |

### 1.3 Pages
- `/learn` — the path map: modules as sections, lessons as cards in recommended order (from CURRICULUM.md table). Card shows title, difficulty, est. minutes, status (not started / in progress / done), and a lock-free "recommended next" highlight. No locking — anyone can open anything.
- `/learn/[lessonId]` — lesson page. Sticky progress bar (blocks completed / interactive blocks). Left rail on desktop: block outline with checkmarks. Bottom: "Drill related questions" (links to existing `/questions` filtered by `relatedQuestionTags`), "Next lesson".
- Mobile-first: most freshmen will open this on a phone. Inputs must not zoom the page on iOS (font-size ≥ 16px).

### 1.4 Data model (Prisma)
```prisma
model LessonProgress {
  id           String   @id @default(cuid())
  userId       String
  lessonId     String
  status       String   @default("in_progress") // in_progress | completed
  blockState   Json     @default("{}")          // { [blockId]: { done: bool, attempts: int, correct: bool, opened?: bool } }
  score        Int      @default(0)              // % of graded blocks correct on first or second try
  completedAt  DateTime?
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id])
  @@unique([userId, lessonId])
}

model ReviewItem {
  id        String   @id @default(cuid())
  userId    String
  lessonId  String
  blockId   String
  prompt    String
  createdAt DateTime @default(now())
  resolved  Boolean  @default(false)
  user      User     @relation(fields: [userId], references: [id])
}
```
Save progress with a debounced server action. A lesson is **completed** when every graded block (`fillBlank`, `calc`, `mcq`, `orderSteps`) is done and the checkpoint has been self-graded.

### 1.5 XP / streak integration
Hook into the existing XP and streak system: +5 XP per graded block correct on first try, +2 on second try, +25 on lesson completion, +10 per deep dive opened (capped at 3 per lesson, so it rewards curiosity without farming). Lesson activity counts toward the daily streak.

### 1.6 Done when
Lesson 5-2 renders every block correctly on desktop and mobile, progress persists across refresh, XP awards fire, `/learn#b9` deep link works, `npm run validate-lessons` passes.

---

## Phase 2 — Convert the written content into the remaining 55 lessons

All lesson content is already written in `content/LESSON_CONTENT.md`. This phase is **conversion, not authoring**. Run it as its own session, **one module per session**.

Prompt to give Claude Code:

> Convert Module N of `content/LESSON_CONTENT.md` into lesson JSON files, using `content/lessons/5-2-capm-and-beta.json` as the exact format. Rules:
> 1. **Don't add, drop, or reword substance.** Every walkthrough step, fill-in, deep dive, and checkpoint prompt in the source must appear in the JSON. You may split long walkthrough text into `text` and `stepThrough` blocks and fix formatting.
> 2. Mapping: **Walkthrough** → `text` / `stepThrough` (use `formula` blocks with KaTeX for any equation). **Fill-ins** → `fillBlank` (the bolded answer is the accepted answer; add sensible synonyms to `accept`) or `calc` when the answer is a number. **Deep dives** → `deepDive` blocks in the same order; the tag maps to difficulty (🟢 = "core", 🟡 = "follow-up", 🔴 = "gotcha" if it's a trick question, otherwise "advanced"); keep the "Say it" line at the end of the body as **Interview answer:**. **Checkpoint** → `checkpoint`.
> 3. Where a lesson mentions a workbook (PEB_0X), add an `excelLink` block at the end.
> 4. Add one `mcq` per lesson built from the most important deep dive, with plausible wrong answers.
> 5. Lesson 5.2 already exists — only add the two deep dives marked "Additional deep dive to add."
> 6. Set `relatedQuestionTags` from the lesson's topic so "Drill related questions" links to the existing question bank.
> 7. Run `npm run validate-lessons` before finishing.
> 8. If `content/sources/` has the BIWS 400 Questions or WSP Red Book PDFs, read the matching sections and **list** (in your reply, not in the lessons) any testable concept they cover that this module is missing. Don't add it yourself — Aiden will review and write it.

**Your review step (Aiden):** deep dives are already checked. After conversion, open each lesson on your phone and click through every interactive block once to catch broken blanks or answer-matching problems.

---

## Phase 3 — Excel resources (upload + download)

### 3.1 Storage
Use **Vercel Blob** (`@vercel/blob`) — fits the existing Vercel deploy. Add `BLOB_READ_WRITE_TOKEN` to Vercel env vars.

### 3.2 Model
```prisma
model LessonResource {
  id          String   @id @default(cuid())
  workbookKey String                       // e.g. "PEB_03_CAPM_Beta_WACC"
  kind        String                       // "student" | "answer_key"
  title       String
  description String?
  blobUrl     String
  fileName    String
  sizeBytes   Int
  version     Int      @default(1)
  uploadedBy  String
  createdAt   DateTime @default(now())
  @@unique([workbookKey, kind, version])
}

model ResourceDownload {
  id         String   @id @default(cuid())
  userId     String
  resourceId String
  createdAt  DateTime @default(now())
}
```

### 3.3 Admin page `/admin/learn/resources`
- Admin-only (reuse existing admin check).
- Upload `.xlsx` (max 10 MB, validate extension and MIME). Pick `workbookKey` from a dropdown of keys referenced by lessons, choose kind (student / answer key), title, description.
- Re-uploading the same key + kind creates a new version; the newest version is what students get.
- Table of all resources with download counts.

### 3.4 Student downloads
- `excelLink` block shows: workbook title, description, "Download workbook" button.
- **Answer key** button stays disabled with "Finish the lesson to unlock the answer key" until `LessonProgress.status = completed`. Admins always see it.
- Downloads go through `/api/learn/resources/[id]/download`, which checks auth (and the unlock rule for keys), logs a `ResourceDownload`, then redirects to the blob URL. Don't expose answer-key blob URLs in page HTML.
- File naming conventions: student files are `PEB_0X_Name.xlsx`; keys are `PEB_0X_Name_KEY.xlsx`.

### 3.5 Workbook ↔ lesson map
| Workbook | Lessons |
|---|---|
| PEB_01_Accounting_3Statement_Linking | 1.2, 1.3 |
| PEB_02_EV_Equity_Bridge | 2.2, 2.3, 2.4, 2.5 |
| PEB_03_CAPM_Beta_WACC | 5.1, 5.2, 5.3, 5.4 |
| PEB_04_DCF | 6.1–6.5 |
| PEB_05_Comps_Precedents_FootballField | 3.3, 4.2, 4.3 |
| PEB_06_Merger_Model | 1.6, 7.2, 7.3, 7.4 |
| PEB_07_LBO | 8.2, 8.4, 8.5 |

---

## Phase 4 — Fewer questions landing in Aiden's DMs

### 4.1 "Ask about this lesson" tutor
Button on each lesson opens a chat drawer. API route `/api/learn/tutor` (`maxDuration = 60`) calls `claude-sonnet-4-5` with a system prompt containing the lesson's JSON as context, and instructions: answer the student's question about this topic; teach, don't just give answers to workbook cells; if the question is outside the lesson, answer briefly and point to the right lesson ID from CURRICULUM.md. Rate-limit per user (e.g., 30 messages/day).

### 4.2 "Ask a mentor" queue
- Button: "Still stuck? Ask a PE@Broad mentor." Student submits a question tied to a lesson + block.
- `MentorQuestion` model: userId, lessonId, blockId?, question, answer?, answeredBy?, status (open/answered), public (bool).
- `/admin/learn/questions`: Aiden (and anyone with mentor role) sees open questions grouped by lesson, answers them, and can tick **"Add to lesson as FAQ"** — the answer then shows as a new deep dive on that lesson for everyone. Over time, the questions freshmen keep asking become part of the lessons.
- Notify the student in-app when answered.

### 4.3 Mentor dashboard `/admin/learn/cohort`
For the PE@Broad club: a table of members × modules showing completion %, average score, and most-marked "Shaky" checkpoint prompts across the cohort. This tells you what to cover at the next meeting without anyone having to ask.

---

## Design notes
- Keep the existing dark theme and design system.
- Deep dives should feel inviting, not like fine print: clear title, badge, one-line teaser visible when collapsed.
- Formulas: KaTeX, never images.
- Every interactive block must work with keyboard only and on touch.
- No timers or deadlines anywhere in `/learn`.

## Out of scope
Grading uploaded student workbooks, certificates, paywalling `/learn` (keep it free for club members for now).
