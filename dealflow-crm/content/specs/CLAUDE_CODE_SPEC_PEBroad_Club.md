# PE@Broad Club Features — Build Spec for Claude Code

Companion to `CLAUDE_CODE_SPEC_Prospect_Learn.md`. Covers:
- (A) replacing the broken MCQ system with a hand-written question bank
- (B) auto-enrolling PE@Broad members from a roster
- (C) one club-only leaderboard and bot cleanup
- (D) shared member progress
- (E) direct messages
- (F) head-to-head challenges

**Files that come with this spec:**
- `PEB_Question_Bank_v1.json` → `content/questions/PEB_Question_Bank_v1.json` — 236 MCQs covering all 56 lessons. Every question has 4 hand-written options, an explanation, and a stable id.
- `pebroad-roster.csv` → `content/private/pebroad-roster.csv` — 44 members. **Add `content/private/` to `.gitignore`.** This is a list of student emails and must not be committed to the repo.
- `PEB_Question_Bank_v1_review.csv` — for Aiden to review in Excel. Not used by the app.

**How to run:** one phase per Claude Code session, in order A → F. Start each session with: *"Read `CLAUDE_CODE_SPEC_PEBroad_Club.md`. Build Phase X only. Don't change features outside what's listed."*

**Stack reminders:** Next.js App Router, Prisma, Neon Postgres, NextAuth, deployed with `npx vercel --prod` from `dealflow-crm/`. Seeds use upserts / `skipDuplicates`, never `deleteMany`. Long-running routes need `export const maxDuration = 60`.

---

## Phase A — Replace the MCQ system (do this first)

### A.1 The bug
MCQ wrong answers are currently built by pulling other questions' answers from the same category (the pool generator in `src/lib/question-mcq.ts` or the MCQ API route). That's why a question like "What is the most important financial statement?" shows options about CapEx and deferred revenue. **Delete that generator.** MCQs must only ever show the options stored on the question itself.

### A.2 Schema
Add to the existing `Question` model (keep existing fields so flashcard mode still works):
```prisma
options       String[]          // exactly 4, hand-written
correctIndex  Int?
explanation   String?
lessonId      String?           // links to /learn lesson, e.g. "2.2"
mcqEligible   Boolean @default(false)
source        String?
```
Add an attempt log if one doesn't exist:
```prisma
model QuestionAttempt {
  id         String   @id @default(cuid())
  userId     String
  questionId String
  correct    Boolean
  chosenText String
  msToAnswer Int
  context    String   // "drill" | "practice" | "challenge"
  createdAt  DateTime @default(now())
  @@index([userId, questionId])
}
```

### A.3 Seed
`prisma/seed/questions-peb-v1.ts` reads the JSON and **upserts by `id`**:
- Map `category` to the existing category field, `answer` to the existing answer field, and `keywords` to `keywords`.
- Set `mcqEligible = true`.
- Run with `npx prisma db seed`. Re-running must never duplicate or delete anything.

### A.4 Rules for every MCQ surface (practice mode, daily drill, challenges)
- Only use questions where `mcqEligible = true`. Existing older questions stay in Flashcard/Study mode with keyword grading, but never appear as MCQs.
- Shuffle the display order of the 4 options for each attempt, and grade by option text.
- **Don't send `correctIndex` to the browser before the student answers.** Grade on the server, then return correct/incorrect, the correct option, and the explanation.
- After every answer, show the explanation and a "Review lesson X.X" link to `/learn/[lessonId]`.
- No truncation anywhere: wrap all question and option text.

### A.5 Daily drill
- 5 questions per day.
- Weight selection toward the lessons where the student's accuracy is lowest.
- Spaced repetition: missed questions come back after 1, then 3, then 7 days, until answered correctly twice in a row.

### A.6 Admin question editor `/admin/questions`
- Add or edit MCQs with exactly 4 options and one marked correct, plus explanation, lesson, and difficulty.
- Saving fails if any option is blank or duplicated.
- Add `npm run validate-questions` with the same checks across the whole bank.

**Done when:** practice mode, the daily drill, and challenges only show questions with their own 4 options; the old generator is deleted; the seed re-runs cleanly.

---

## Phase B — PE@Broad roster and auto-enrollment

### B.1 Model
```prisma
model ClubRosterEntry {
  id        String   @id @default(cuid())
  clubId    String
  email     String   // lowercase
  name      String?
  role      String   @default("member") // "member" | "admin"
  active    Boolean  @default(true)
  addedAt   DateTime @default(now())
  @@unique([clubId, email])
}
```

### B.2 Matching
- On every sign-in, check the user's login email **and** any verified `.edu` email linked to their account, both lowercased. Use the NextAuth `signIn`/`session` callback, plus right after `.edu` verification completes.
- If either email matches an active roster entry, upsert their PE@Broad `ClubMembership` with the roster role.
- Matching on the verified `.edu` email matters because some members, including Aiden, may have signed up with a personal email.
- When a roster entry is added, immediately backfill any existing user whose email matches.
- If an entry is deactivated, mark the membership inactive. Don't delete the user's data.

### B.3 Admin roster page `/admin/club/roster`
- **Paste box:** accepts Outlook attendance text exactly as copied, e.g. `Tuvell, Boston <tuvellbo@msu.edu>  Required  Accepted`. Extract every `<email>`, and turn "Last, First" into "First Last". Show a preview before saving.
- **CSV import** with the same format as `pebroad-roster.csv`.
- **Table:** name, email, role, signed up yes/no, last active. Include filters for "Not signed up yet" and "Inactive 14+ days."
- Add, deactivate, or change role per row.
- Initial load: run `npm run roster:import content/private/pebroad-roster.csv` once. `moragaai@msu.edu` gets the admin role.

### B.4 Non-roster MSU students
Users with a verified `@msu.edu` email who aren't on the roster see a "Request to join PE@Broad" button. Admins approve or deny requests on the roster page.

---

## Phase C — One leaderboard, and bot cleanup

### C.1 Remove public leaderboards
- **Delete** the global and weekly leaderboards, along with any leaderboard visible to non-members.
- Replace them with **one** leaderboard at `/club/pe-broad/leaderboard`. Only active PE@Broad members can see it, and only they appear on it.
- Tabs:
  - Weekly XP (resets Monday 00:00 ET)
  - All-time XP
  - Current streak
  - MCQ accuracy (minimum 20 answers to qualify)
  - Lessons completed
- Remove any dashboard widget that showed a global ranking.

### C.2 Bot cleanup
Your screenshot shows random-string accounts on the leaderboard.
- **Admin page `/admin/users/review`** lists accounts that are likely bots:
  - email not verified
  - no activity since signup
  - names that look like random letters (heuristic: few vowels, no spaces, or a name that matches the email prefix pattern)
  - many signups from the same IP in a short window
- Each row has "Keep" and "Delete." Delete is a soft delete first (account hidden and disabled). A separate "Purge soft-deleted older than 30 days" action asks for confirmation before permanently removing anything.
- Nothing is deleted automatically.

### C.3 Prevention
- Accounts don't appear on any social surface (leaderboard, member directory, DMs, challenges) and don't earn XP until their email is verified.
- Add Cloudflare Turnstile to signup (free).
- Rate-limit signups: at most 3 per IP per hour.

---

## Phase D — Member profiles and shared progress

### D.1 Member directory `/club/pe-broad/members`
Each member card shows:
- name, class year, and recruiting track (IB / PE / VC / etc.)
- **Targeting:** groups and firms they're targeting (from their profile and pipeline)
- **Firms in contact:** firm names and pipeline stage only, e.g. "Jefferies — Networking" or "Houlihan Lokey — First Round"
- **Learning:** lessons completed per module (progress bars, from `LessonProgress`)
- **Drill:** XP, streak, and MCQ accuracy by category (from `QuestionAttempt`)
- Recent activity

Clicking a card opens a full profile with the same data in more detail, plus "Message" and "Challenge" buttons.

### D.2 Privacy rules (build these exactly)
- **Never** share contact names, emails, phone numbers, notes, or interaction logs. Only firm names and pipeline stages.
- Settings page `/settings/club-sharing` with a toggle for each shared field: Learning progress, Drill stats, Targets, Firms in contact.
- Learning progress, drill stats, and targets are on by default.
- **Firms in contact** shows a one-time prompt on first visit to the club: *"Share which firms you're networking with (firm name and stage only — never contact names or notes) with PE@Broad members?"* with Yes / Not now. Store the choice. It can be changed later.
- A member who turns a field off sees "Hidden by member" in its place for others.

### D.3 Firm overlap
On each firm page and in the directory, show *"3 PE@Broad members are also talking to Houlihan Lokey"* with their names. Only include members who share their firm list. This lets members compare notes before interviews.

### D.4 Club activity feed `/club/pe-broad`
Shows lesson and module completions, challenge results, streak milestones (7, 30, 100 days), and new members joining. Members can react to each item with one emoji. No comments, to keep it light.

### D.5 Mentor view
Reuse the cohort dashboard from the Learn spec (Phase 4.3), scoped to roster members. Add a column for "most-missed questions this week" so Aiden knows what to cover at meetings.

---

## Phase E — Direct messages

### E.1 Models
```prisma
model Conversation { id String @id @default(cuid()); clubId String; createdAt DateTime @default(now()); lastMessageAt DateTime @default(now()) }
model ConversationMember { conversationId String; userId String; lastReadAt DateTime @default(now()); muted Boolean @default(false); @@id([conversationId, userId]) }
model Message { id String @id @default(cuid()); conversationId String; senderId String; body String; kind String @default("text") /* "text" | "challenge" */; challengeId String?; createdAt DateTime @default(now()); @@index([conversationId, createdAt]) }
```

### E.2 Behavior
- 1:1 DMs between active PE@Broad members only. Group chats are optional later; study groups already exist.
- Inbox at `/messages` with unread counts and a badge in the nav.
- **Delivery by polling:**
  - While a conversation is open, fetch new messages every 4 seconds.
  - Everywhere else, check unread counts every 30 seconds.
  - This is plenty for a 45-person club and needs nothing beyond Vercel + Neon.
  - Write the fetch logic behind one function so it can later be swapped for Pusher or Ably if instant delivery is wanted.
- Block, mute, and "Report to admin" on every conversation. Rate-limit to 30 messages per minute per user. Max 2,000 characters per message.
- A "Challenge" button in the conversation header creates a challenge (Phase F) and posts it as a challenge card in the thread.

---

## Phase F — Challenges (Drillcore-style)

### F.0 Can Neon do this?
Yes for everything that needs storing: challenges, question sets, answers, scores, records. Neon is the database; it doesn't push live updates to a browser by itself.
- **Async challenges** need nothing extra.
- **Live duels** work by having each browser ask the server for the current state about once a second (polling). That's fine for 1v1 at club scale. If it ever feels laggy, add Pusher or Ably (both have free tiers) without changing the database design.

### F.1 Models
```prisma
model Challenge {
  id            String   @id @default(cuid())
  clubId        String
  mode          String   // "async" | "live" | "weekly"
  createdById   String
  topic         Json     // { modules?: number[], lessons?: string[], categories?: string[], difficulty?: string }
  questionIds   String[] // fixed set, chosen server-side at creation
  secondsPerQ   Int      @default(30)
  status        String   // "pending" | "accepted" | "live" | "complete" | "expired" | "declined"
  expiresAt     DateTime
  currentIndex  Int      @default(0)     // live mode
  questionStartedAt DateTime?            // live mode, server clock
  createdAt     DateTime @default(now())
}
model ChallengeParticipant { challengeId String; userId String; score Int @default(0); totalMs Int @default(0); finishedAt DateTime?; @@id([challengeId, userId]) }
model ChallengeAnswer { id String @id @default(cuid()); challengeId String; userId String; questionId String; correct Boolean; ms Int; createdAt DateTime @default(now()); @@unique([challengeId, userId, questionId]) }
```

### F.2 Async challenge (build first)
1. From a profile, a DM, or `/challenges/new`: pick an opponent, a topic (module, lesson, category, or "mixed"), and length (5 or 10), plus an optional difficulty.
2. The server picks `mcqEligible` questions matching the topic and stores the ids. Both players get the **same questions**, with options shuffled differently for each.
3. The opponent is notified in-app and in DMs, and has 48 hours to accept and play.
4. Score = correct answers; ties are broken by total time. Answers are graded on the server.
5. Results page: side-by-side answers for each question, with explanations, and the head-to-head record between the two players.
6. XP: +20 for the winner, +10 for finishing, +5 bonus for a perfect score.

### F.3 Live duel
- Both players hit "Ready" in a lobby. The status becomes `live`.
- The server sets `questionStartedAt` for each question. Clients poll `/api/challenges/[id]/state` every second.
- Each question gets a 30-second timer computed from **server time**, not the browser clock. Answers after the deadline are marked wrong.
- The next question starts when both players answer or the time runs out. Show "Opponent answered ✓" without revealing which option they picked.
- If a player disconnects for more than 60 seconds, they forfeit the remaining questions.

### F.4 Weekly club challenge
- Every Monday, the system creates one `weekly` challenge for all PE@Broad members: the same 10 questions, weighted toward the club's weakest lessons from the previous week.
- It gets its own leaderboard tab and is announced in the club feed. Aiden can override the topic from the admin page.

### F.5 Fairness
- Correct answers never reach the browser before submission.
- Students can't open a challenge's questions in normal practice mode until the challenge is complete.

---

## Out of scope for now
Group chats, voice/video, cross-school challenges, push notifications to phones.
