# Prospect upgrade — start here

Everything for the redesign, the Learn section, the new question bank, and the PE@Broad club features.

## 1. Put these files in the repo

| File | Put it at | What it is |
|---|---|---|
| `START_HERE.md` | repo root | This file |
| `CLAUDE_CODE_SPEC_Design.md` | repo root | New look and navigation |
| `CLAUDE_CODE_SPEC_PEBroad_Club.md` | repo root | Question bank fix, roster, leaderboard, members, DMs, challenges |
| `CLAUDE_CODE_SPEC_Prospect_Learn.md` | repo root | Interactive lessons and workbook downloads |
| `LESSON_CONTENT_Nuance_Bank.md` | `content/LESSON_CONTENT.md` | Full content for all 56 lessons |
| `CURRICULUM.md` | `content/CURRICULUM.md` | Lesson map, order, workbook links |
| `lesson-5-2-capm-beta.json` | `content/lessons/5-2-capm-and-beta.json` | Sample lesson; the format for the rest |
| `PEB_Question_Bank_v1.json` | `content/questions/PEB_Question_Bank_v1.json` | 236 MCQs with hand-written options |
| `pebroad-roster.csv` | `content/private/pebroad-roster.csv` | 44 members. **Add `content/private/` to `.gitignore` before committing.** |

**Don't put in the repo:**
- `PEB_Question_Bank_v1_review.csv` — for your own review in Excel
- `PEB_Practice_Workbooks.zip` — upload these through the admin page after Learn Phase 3 is built
- The BIWS / WSP PDFs — if you add them, put them in `content/sources/` (gitignored)

## 2. Run order in Claude Code (one session each)

| # | Spec | Phase | Why this order |
|---|---|---|---|
| 1 | Club | **A — Replace the MCQ system** | Fixes the broken questions that are live right now |
| 2 | Design | **0 — Tokens, fonts, base components** | Everything after this gets built in the new style |
| 3 | Design | **1 — Navigation** | New sidebar, mobile tabs, ⌘K search |
| 4 | Design | **2 — Key screens** | Home, practice, lesson shell, club pages |
| 5 | Club | **B — Roster auto-join** | |
| 6 | Club | **C — One leaderboard + bot cleanup** | |
| 7 | Learn | **1 — Lesson engine + sample lesson** | |
| 8 | Learn | **2 — Convert lessons** | One module per session (12 sessions) |
| 9 | Learn | **3 — Workbook upload/download** | Then upload the 14 workbooks |
| 10 | Club | **D — Member profiles & sharing** | |
| 11 | Club | **E — Direct messages** | |
| 12 | Club | **F — Challenges** | |
| 13 | Learn | **4 — Tutor & mentor queue** | |
| 14 | Design | **3 — Convert remaining pages** | |

Open each session with:
> Read `START_HERE.md` and `<the spec named in the table>`. Build **<Phase>** only. Don't change features outside what that phase lists.

## 2b. Round 2: outreach, search, notifications, club posting, workbooks v2

Spec: `CLAUDE_CODE_SPEC_Outreach_Club_Workbooks.md`. Run phases **G → H → I → J → K → L → M** after the steps above, one session each.

| File | Put it at |
|---|---|
| `CLAUDE_CODE_SPEC_Outreach_Club_Workbooks.md` | repo root |
| `Prospect_Rolodex_Import_Template.xlsx` | `public/templates/` |
| `prospect-contacts-sample.csv`, `prospect-interactions-sample.csv` | `public/templates/` |
| contents of `PEB_Walkthroughs.zip` (15 JSON files) | `content/walkthroughs/` |
| `PEB_Practice_Workbooks_v2.zip` | Don't commit. Upload on the admin resources page in Phase M |

Before Phase H's repair script runs for everyone, review its `--dry-run` output.

## 3. After each phase
- `npm run build` passes, then deploy: `cd dealflow-crm && npx vercel --prod`.
- Click through the new screens on your phone before moving on.
- Seeds must upsert. If any seed or migration would delete rows, stop and check.
