# Prospect Redesign — Build Spec for Claude Code

**Goal:** replace the gamified look with a clean, professional finance-tool interface that's easy to navigate. Think of a well-made internal tool at a bank: calm, dense where it should be, one obvious action per screen.

**Run this before the Learn and Club specs.** Phase 0 sets up the design tokens and navigation shell, so every new page gets built in the new style from the start. One phase per Claude Code session.

Start each session with: *"Read `CLAUDE_CODE_SPEC_Design.md`. Build Phase N only. Don't change data, APIs, or business logic — this is a visual and navigation change."*

---

## Principles (apply to every screen)

1. **One primary action per screen.** It's the only solid green button. Everything else is a white outlined (secondary) or text button.
2. **Navigation is always in the same place.** Left sidebar on desktop, bottom tab bar on phones, and a breadcrumb on any page more than one level deep.
3. **Numbers are information, not rewards.** No confetti, flames, trophies, level-ups, sound, or bouncing animations. Progress shows as thin bars and plain numbers.
4. **Calm color.** A neutral base with one accent (MSU green). Red, amber, and blue appear only for states: wrong, needs attention, info/advanced.
5. **Readable first.** 16px body text in lessons, generous line height, nothing truncated, every target at least 40px (44px on mobile).

---

## Phase 0 — Design tokens, fonts, and base components

### 0.1 Tokens
Put these in `globals.css` as CSS variables and map them in `tailwind.config` (`colors.bg`, `colors.surface`, etc.). **Delete** any other hard-coded colors, gradients, and neon/glow styles as each page is converted.

```css
:root {
  --bg: #F6F7F5;          /* page background */
  --surface: #FFFFFF;     /* cards, sidebar, tables */
  --surface-2: #F1F3F4;   /* subtle fills, code/formula boxes */
  --border: #E3E6E8;
  --border-strong: #D5D9DD; /* inputs, secondary buttons */
  --divider: #EEF0F2;
  --ink: #12161B;         /* primary text */
  --ink-2: #4A5260;       /* secondary text */
  --ink-3: #5B6470;       /* labels, captions (passes 4.5:1 on white) */
  --accent: #18453B;      /* MSU green: primary buttons, active nav, progress */
  --accent-hover: #0F2E27;
  --accent-tint: #E7EFEB; /* active nav background, selected states */
  --success: #1E6B45;  --success-bg: #E6F2EC;
  --danger:  #B42318;  --danger-bg:  #FCEBE9;
  --warn:    #8A5A00;  --warn-bg:    #FDF3DD;
  --info:    #1D4ED8;  --info-bg:    #E8EEFD;
  --radius-sm: 6px; --radius: 8px; --radius-lg: 10px; --radius-xl: 12px;
}
:root[data-theme="dark"] {
  --bg: #0F1214; --surface: #161A1D; --surface-2: #1C2125;
  --border: #262B30; --border-strong: #343A40; --divider: #22272B;
  --ink: #E8EAED; --ink-2: #B4BAC2; --ink-3: #9AA1AA;
  --accent: #5FAF8F; --accent-hover: #79C2A4; --accent-tint: #1C2E28;
  --success: #5FBF8A; --success-bg: #16271F;
  --danger: #F07A6E; --danger-bg: #2E1A18;
  --warn: #E0B04F; --warn-bg: #2B2414;
  --info: #7DA2F5; --info-bg: #19213A;
}
```
- **Default to light.** Add a Light / Dark / System toggle in Settings, saved per user. On dark, primary buttons use `--accent` with `--ink` near-black text (`#0F1214`) for contrast.

### 0.2 Type
- **Font:** Inter via `next/font/google` (weights 400, 500, 600, 700). Apply `font-variant-numeric: tabular-nums` globally so numbers line up in tables.
- **Scale:**
  - Page title: 26px / 650 / −0.015em
  - Section title: 16px / 600
  - Card title: 18px / 600
  - Body: 14px (app UI), 16px (lesson text, line-height 1.65)
  - Caption: 13px
  - Overline label: 12px / 600 / uppercase / 0.06em tracking / `--ink-3`
- Formulas in lessons: KaTeX, inside a `--surface-2` box with a symbol legend table underneath.

### 0.3 Spacing and layout
- 4px base grid. Card padding 20px (24px on lesson cards). Gap between cards 16px. Page padding 32px 40px on desktop, 16px on mobile.
- Content max width: 1200px for app pages, 780px for lesson text columns.
- Cards: `--surface`, 1px `--border`, `--radius-lg`, **no shadows** (or at most `0 1px 2px rgba(0,0,0,0.04)`).

### 0.4 Base components (`components/ui/`)
Build these once and use them everywhere. Remove one-off styled buttons and cards as pages are converted.

| Component | Spec |
|---|---|
| `Button` | Variants: `primary` (solid accent, white text, 600), `secondary` (white, `--border-strong` border, `--ink` text, 500), `ghost` (no border, accent text), `danger` (only for destructive confirms). Heights 32 / 36 / 40. Radius 8. Visible focus ring: 2px `--accent` with 2px offset. |
| `Card` | Section container; optional header row = title (left) + text link or small action (right). |
| `StatTile` | Big number (22–24px/600) + caption. No icons or colors unless it's a status. |
| `ProgressBar` | 4–6px tall, `--divider` track, `--accent` fill, rounded. Always paired with a text label ("4 of 7 lessons"). |
| `Badge` | 12px/600, radius 4, padding 2×8. Tones: neutral, accent ("Core"), warn ("Follow-up", "Focus"), danger ("Gotcha"), info ("Advanced"). |
| `Tabs` | Underline style: active = accent text + 2px accent bottom border. |
| `SegmentedControl` | Bordered group, active segment `--accent-tint` + accent text. Use for difficulty and mode filters. |
| `DataTable` | Uppercase 12px header in `--ink-3`, 1px `--divider` row lines, no zebra stripes, `overflow-x: auto` wrapper on small screens. |
| `EmptyState` | One sentence plus one action button. No illustrations. |
| `Avatar` | Initials in an `--accent-tint` circle; photo if uploaded. |
| `Accordion` | Built on `<details>`/`<summary>`: title left; badge + chevron right. Used for lesson deep dives. |
| `Toast` | Bottom-right on desktop, top on mobile, 4 seconds, plain text. Replaces any celebratory popups. |

---

## Phase 1 — Navigation and information architecture

### 1.1 Desktop sidebar (240px, always visible ≥1024px)
```
[P] Prospect
    PE@Broad · MSU
[Search ⌘K]

Home

LEARN
  Lessons            → /learn
  Practice           → /practice   (MCQ + flashcards, filters)
  Daily set   (5)    → /practice/daily

RECRUITING
  Pipeline           → /pipeline
  Contacts           → /contacts
  Firms              → /firms
  Calendar           → /calendar

PE@BROAD                           (only shown to club members)
  Members            → /club/pe-broad/members
  Standings          → /club/pe-broad/leaderboard
  Messages    (2)    → /messages
  Challenges  (1)    → /challenges

TOOLS
  Mock interviews    → /mock-interviews
  Resume review      → /resume
  Resources          → /resources

──────────
Settings
[AM] Aiden Moraga · Admin
```
- Active item: `--accent-tint` background, accent text, weight 600. Section labels are overline style.
- Count badges are small accent pills, used only for things that need action: daily set remaining, unread messages, pending challenges.
- **Admin** (roster, users review, question editor, resources upload) appears as one more group, "ADMIN," visible only to admins.

### 1.2 Route consolidation
Move existing features into the groups above. Anything that doesn't fit becomes a tab inside its parent instead of a top-level item:

| Existing feature | New home |
|---|---|
| Question bank, flashcards, drills | Learn → Practice (mode toggle: Multiple choice / Flashcards) |
| Learning path | Learn → Lessons |
| Deal tracker | Recruiting → Firms (tab "Deals") |
| Firm timelines | Recruiting → Firms (tab "Timelines") |
| Recruiting calendar | Recruiting → Calendar |
| Email templates | Recruiting → Contacts (tab "Templates") |
| Offer comparison | Recruiting → Pipeline (tab "Offers") |
| Study groups, club hub, announcements | PE@Broad → Members page header + Activity tab |
| Case competitions, consulting cases | Tools → Resources (tabs) |
| News feed | Home (small "Market news" card, collapsed by default) |

Keep old URLs working with redirects to the new routes.

### 1.3 Mobile (<768px)
- Bottom tab bar with 5 items: **Home, Learn, Recruiting, Club, More**. Each has an icon plus label, 48px tall, with safe-area padding at the bottom. The active tab is accent-colored.
- Each tab opens its group's first page. "More" holds Tools, Settings, and Admin.
- On phones the sidebar is hidden entirely; on tablets (768–1023px) it collapses to icons only.

### 1.4 Command palette (⌘K / Ctrl+K)
Searches lessons (by title and deep-dive titles), contacts, firms, members, and pages. Results are grouped by type, with arrow keys and Enter to open. Use `cmdk`.

### 1.5 Page header pattern (every page)
Breadcrumb (if nested) → title + one-line subtitle on the left → primary action (and at most one secondary) on the right. Tabs, if any, go directly under the header.

---

## Phase 2 — Key screens

Rebuild these screens first, in this order. They're shown in the mockup canvas ("Prospect Redesign").

### 2.1 Home `/`
- **Header:** date + "Good afternoon, [first name]". Actions: "Log a contact" (secondary), "Start daily set" (primary).
- **Row of three cards:**
  - **Daily set:** "5 questions · about 6 minutes," weakest topics, Start button, and "Active N days in a row" as plain text.
  - **Continue learning:** next lesson, its module, a progress bar, and "Resume lesson."
  - **This week:** upcoming calls from the calendar, club challenge due date, and overdue follow-ups shown in `--warn`.
- **Two columns:**
  - **Learning progress** table: module, lessons done, accuracy, progress bar. A "Focus" badge marks the lowest-accuracy module.
  - **Right column:** PE@Broad standings (top 3 + your row highlighted), plus a pending-challenge card with Accept / Decline.
- **Recruiting pipeline strip:** counts per stage (Target → Offer), linking to the pipeline.
- Remove XP bars, level badges, and mascot or celebration elements from home.

### 2.2 Lesson `/learn/[id]`
- Breadcrumb `Lessons / Module 5 · Cost of capital / 5.2`.
- Title, difficulty badge, time estimate. "Ask about this lesson" is a secondary button in the header.
- **Two columns:** content (max 780px) and a right rail.
  - **Content:** text cards, formula boxes, interactive check cards, "Go deeper" accordions, the workbook card, and Previous / "Practice N related questions" navigation at the bottom.
  - **Right rail:** "On this page" outline with done / current / not-started markers and a progress bar, plus the "Still stuck? Ask a mentor" card.
- On mobile, the right rail becomes a collapsible "On this page" button at the top.
- **Fill-in-the-blank states:**
  - empty: `--border-strong` border
  - correct: `--success` border + `--success-bg` fill + the word "Correct"
  - wrong: `--danger` border + `--danger-bg` fill + the word "Try again"
  - Never rely on color alone; always show the word too.

### 2.3 Practice `/practice`
- **Header controls:** Module select, Difficulty segmented control (All / Easy / Medium / Hard), Mode segmented control (Multiple choice / Flashcards).
- **Question card** (max 820px):
  - Progress line ("Question 3 of 10 · Lesson 2.2 · Medium") with a thin bar, then the question at 19px/500.
  - Four full-width option buttons, each with a letter chip (A–D), at least 56px tall, wrapping text.
  - **After answering:** the chosen wrong option turns `--danger` with a "Your answer" label; the correct option turns `--success` with a "Correct answer" label; the others dim. An Explanation box follows with a "Review lesson X.X" link, and a "Next question" primary button.
  - **Keyboard:** 1–4 or A–D selects an option; Enter goes to the next question.
- **Session panel:** correct, missed, average time, points earned, and a one-line note on spaced repetition.

### 2.4 PE@Broad `/club/pe-broad/*`
- Header "PE@Broad · 44 members · 31 active this week" with a "New challenge" primary button. Tabs: Members, Standings, Challenges, Activity.
- **Members table:** member (avatar, name, track, class year), targeting, lessons (N / 56 + bar), accuracy, firms in contact (outlined chips "Firm · Stage", or "Hidden by member"), and Message / Challenge buttons. Search filters members and firms.
- **Right rail:** "Firm overlap" card and "Weekly challenge" card, with a one-line privacy reminder.
- **Standings tab:** `DataTable` with rank, member, points, streak, accuracy, lessons. The current user's row is highlighted in `--accent-tint`.

### 2.5 Mobile home
Same content as desktop home, stacked: daily set card (full-width 44px Start button), continue learning, and a 3-row standings mini table. Bottom tab bar as in 1.3.

---

## Phase 3 — Convert the remaining pages

Apply the tokens, components, and header pattern to every other page (contacts, pipeline, firms, calendar, mock interviews, resume review, resources, settings, admin). Check each against this list:
- Uses only token colors; no leftover gradients, glows, or neon.
- One primary button per page.
- Tables use `DataTable`; nothing is truncated.
- Works at 375px width with no horizontal page scroll.
- Every interactive element is a real `<button>`/`<a>`/`<input>`, reachable by keyboard, with a visible focus ring.
- Text contrast meets 4.5:1 in both light and dark themes.

---

## Gamification: keep the motivation, drop the noise

| Remove | Replace with |
|---|---|
| XP bars, levels, rank titles | "Points" as a plain number on standings and the session panel |
| Flame/fire streak icons | "Active N days in a row" caption text |
| Trophies, badges grid, confetti, sounds | Nothing, or a short toast: "Module 6 complete" |
| Global leaderboards | One PE@Broad Standings table (see the Club spec) |
| Bright multicolor category chips | Neutral outlined chips; color only for status |

Points, streaks, and standings still exist and still drive engagement. They just look like data in a professional tool.
