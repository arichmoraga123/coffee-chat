# Fit Questions, Group Finder & Practice Bank v2 — Build Spec for Claude Code

Builds on the existing Story Bank, Practice, and Challenges features. Use the tokens and components from `CLAUDE_CODE_SPEC_Design.md`, including `SearchSelect` and the shared bulk table.

**Files that come with this spec:**

| File | Put it at | What it is |
|---|---|---|
| `PEB_Question_Bank_v2.json` | `content/questions/PEB_Question_Bank_v2.json` | 505 MCQs (was 236). Every lesson now has at least 9. IDs `peb-0001`–`peb-0236` are unchanged; `peb-0237`–`peb-0505` are new |
| `PEB_Fit_Questions.json` | `content/fit/PEB_Fit_Questions.json` | 26 behavioral/fit questions in 7 categories, each with: what the interviewer is testing, framework, must-include, avoid, guided builder fields, outline template, likely follow-ups, story themes, target length |
| `PEB_Group_Finder.json` | `content/fit/PEB_Group_Finder.json` | 13 coverage and product group profiles, plus a 14-question weighted questionnaire with scoring rules |
| `PEB_Question_Bank_v2_review.csv` | Don't commit | Aiden's Excel review copy; new questions are flagged |

**Run order:** one session per phase, **F1 → F2 → F3 → F4**. Open each with:
> Read `CLAUDE_CODE_SPEC_Fit_and_Practice.md`. Build Phase F[n] only.

---

## F1 — Question bank v2 and larger challenge pools

### F1.1 Seed
- Point the existing question seed (Club spec Phase A) at `PEB_Question_Bank_v2.json`. Upsert by `id`, so existing attempt history stays attached to `peb-0001`–`peb-0236`.
- Run `npm run validate-questions` (exactly 4 unique options, one correct, explanation present). It must pass.

### F1.2 Practice vs. lesson checks
- The quick checks inside lessons stay separate.
- Practice and challenges draw from the bank. Each lesson's **"Practice"** button opens a session for that lesson only, and shows the pool size ("9 questions").

### F1.3 Challenge (duel) question selection
Replace the current picker with `lib/challenges/pickQuestions.ts`:
1. **Scope order:** start with the chosen lesson(s). If there are fewer eligible questions than the challenge length, top up from the same module, and show "Includes 2 questions from Module 8" on the challenge card.
2. **Prefer fresh questions:** first questions **neither player** has answered in the last 30 days, then questions one player has seen, then any. Never repeat a question within the same challenge.
3. **Difficulty mix:**
   - For 10 questions: about 3 easy, 5 medium, 2 hard (or the closest the pool allows).
   - A challenge set to "Hard" uses hard first, then medium.
4. **Weekly club challenge:** weight toward the club's lowest-accuracy lessons from the previous week, and still avoid questions most members answered in the last 30 days.
5. **Tests:** the picker never returns duplicates, honors the scope order, and works when a lesson has exactly 9 questions.

### F1.4 Extra practice modes (on the Practice page)
- **Weak spots:** questions from the user's three lowest-accuracy lessons (at least 5 attempts each), mixed.
- **Missed before:** only questions the user got wrong, oldest first.
- **Hard only:** the hard questions for the chosen module.

---

## F2 — Fit questions in the Story Bank

### F2.1 Layout
Add a **"Fit questions"** tab to the Story Bank, next to the existing stories.
- **Left:** the 7 categories from the JSON: Your story · Why IB · Why this city · Why this group · Why this firm · Strengths, weaknesses & fit · Markets & deals · Closing. Each lists its questions, with a status dot: Not started / Drafted / Practiced.
- **Right:** the selected question's page.

### F2.2 Question page
1. **Prompt**, plus target length ("Aim for 60–90 seconds").
2. **What they're testing**: one short paragraph.
3. **Framework**: numbered steps.
4. **Builder**: one input per `builderFields` entry, with its hint. Above the inputs, **"Use a story"** lets the student link stories from their Story Bank whose themes match `suggestedStoryThemes`; the linked story's key details fill in. The fields are pre-filled from data the student already has:
   - **Why this firm:** "People you spoke with" lists logged interactions with contacts at that firm, pulled from the rolodex. Each shows date, name, and the first line of notes, with a checkbox to include it.
   - **Why this city:** the profile's hometown and any contacts in that city.
   - **Why this group:** the student's Group Finder result (F3) and any logged conversations with contacts whose Group matches.
   - Questions with `[city]`, `[group]`, or `[firm]` placeholders show a `SearchSelect` at the top to choose one. Each choice is saved as its own version, e.g. "Why Houlihan Lokey" and "Why Jefferies" are separate drafts.
5. **Draft**:
   - **"Assemble draft"** fills the `outlineTemplate` with the builder inputs. That's plain text substitution, no AI.
   - **"Improve with AI"** (optional) uses the existing Anthropic setup.
6. **Feedback** (on demand; AI, structured JSON validated with Zod):
   - Scores (1–5): Structure, Specificity, Authenticity, Length, and Fit to the question.
   - Flags phrases from the question's `avoid` list and common generic lines ("fast-paced environment", "I want to learn a lot", "collaborative culture") with a suggested replacement, as quote → suggestion.
   - Checks every `mustInclude` item and marks each as present or missing.
   - Estimates speaking time at about 150 words per minute.
7. **Practice out loud**:
   - a timer that turns amber at the target length's upper bound
   - "I nailed it" / "Needs work" self-rating
   - optional recording with the browser's MediaRecorder, kept in the browser only, never uploaded, with a clear note saying so
   - the "Likely follow-ups" list shown after practicing
8. **Versions**: each save keeps a version with a date. Students can compare two versions.

### F2.3 AI rules (put these in the system prompt verbatim)
1. Use only facts the student provided in the builder, their linked stories, or their logged interactions. **Never invent experiences, names, numbers, or deals.**
2. If something important is missing, write `[ADD: …]` instead of making it up.
3. Keep their voice: plain, first person, no corporate filler.
4. Stay within the target length (about 150 words per 60 seconds).
5. Grade at the student's class-year level (same setting as the resume reviewer). Freshmen aren't expected to have deal experience.

### F2.4 Interview prep pack
On a firm page and on a pipeline opportunity: **"Prep for interview"** builds one printable page with:
- their saved Why IB, Why this firm, Why this city, and Why this group drafts for that firm
- the contacts they've spoken with there, with notes
- 3 suggested questions to ask, drawn from the group profile and their notes

There's a Print / Save as PDF button.

---

## F3 — Group Finder

### F3.1 Entry points
- **Story Bank → Fit questions → Why this group:** a "Not sure which group? Take the 3-minute Group Finder" banner.
- **Recruiting → Openings and Pipeline:** a small link.
- **Profile → Targets:** "Find my groups".

### F3.2 Questionnaire
- One question per screen from `PEB_Group_Finder.json`, with a progress bar (e.g., 4 of 14), Back and Next, and keyboard support (1–9 picks an option, Enter goes next).
- Show `note` text where present. q10 (city) is optional and has a Skip option.

### F3.3 Scoring
Follow the `scoring` field exactly:
- For each group, sum (option weight × question weight) and divide by `maxScores[group]`.
- Show the top 3 as a match out of 100.
- **"Why this fits":** for each top group, list the 2–3 answers that contributed the most points, quoting the option labels.
- Put this logic in `lib/groupFinder.ts`, with unit tests covering these personas:
  - bio major → Healthcare first
  - distressed-debt enthusiast → Restructuring first
  - live-markets person → ECM first
  - PE-curious generalist → FSG first
  - Houston energy → Energy first
  - tech student → TMT first

### F3.4 Results page
- **Top 3 cards:** name, coverage or product badge, match score, "Why this fits", one-liner, what you'd do, typical deals, skills, good fit if, trade-offs, common hubs, and related lessons (linked).
- **"All groups"** expands the other 10 profiles, so students can read about any group.
- **Actions on each card:**
  - **Start your "Why [group]" answer**: opens the F2 builder with the group preselected and the group's `whyAngles` shown as prompts.
  - **Add to my targets**: adds the group to the profile's targets (multi-select).
  - **Find people in this group**: contacts filtered by Group / Team.
  - **See openings**: Openings filtered by the matching track.
  - **Questions to ask bankers**: copyable list.
- Show `disclaimer` under the results in muted text.
- Save results with a date. Students can retake any time, and earlier results stay visible.

### F3.5 Club view (admins)
`/admin/learn/cohort` gains a column showing each member's top Group Finder result, plus a club-wide count by group. Aiden can use it to pair freshmen with older members in the same group.

---

## F4 — Admin editing
- `/admin/fit`: edit fit questions and group profiles through forms (not raw JSON). Changes are stored in the database and seeded from the JSON on first run, upserting by `id`.
- The questionnaire weights are editable in a table: one row per option, one column per group, numbers 0–3.
  - "Run persona tests" re-runs the F3.3 personas and shows whether each still lands where expected.
- The question editor from the Club spec gets an **"Underfilled lessons"** view listing lessons with fewer than 9 questions, so gaps are visible as the bank grows.
