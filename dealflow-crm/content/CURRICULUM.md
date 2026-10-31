# Prospect Learn — Technical Curriculum Map
### PE@Broad freshman track · built to the topic structure of the BIWS 400 Questions Guide and the WSP Red Book

This file is the **map** of the 56 lessons. The full written content — every walkthrough, fill-in answer, and all 246 deep dives with interview answers — is in `LESSON_CONTENT_Nuance_Bank.md`. Each lesson below lists:

- **Walkthrough** — the start-to-finish narrative the main text should teach, in order
- **Fill-ins** — the facts/formulas that should become fill-in-the-blank or numeric-input checks
- **Deep dives** — the expandable "rabbit hole" dropdowns (the nuanced, testable stuff like "can beta be negative?")
- **Interview Qs** — questions the lesson must leave a student able to answer out loud
- **Workbook** — the matching Excel file (student + answer key)

Difficulty tags: 🟢 core (every interview) · 🟡 common follow-up · 🔴 advanced / superday / "gotcha"

> **Source rule:** BIWS and WSP materials are paid, copyrighted guides. Lessons must be written in original language. Cross-reference them for coverage and add a `sourceRefs` note (guide + section name) for mentors, but never paste their answer text onto the site.

---

## Recommended path (no deadlines — just the order that builds on itself)

| # | Module | Lessons | Why this order |
|---|---|---|---|
| 0 | Foundations | 3 | TVM and discounting underpin every model |
| 1 | Accounting | 7 | Asked in every first round; everything else assumes it |
| 2 | Equity Value & Enterprise Value | 5 | Needed before any multiple or DCF output makes sense |
| 3 | Valuation Overview | 3 | The "map" before the individual methods |
| 4 | Comps & Precedents | 4 | Relative valuation |
| 5 | Cost of Capital | 5 | CAPM, beta, WACC — where most "niche" questions live |
| 6 | DCF | 7 | The most-asked model walkthrough |
| 7 | M&A & Merger Models | 5 | Superday staple |
| 8 | LBO | 7 | PE@Broad core; every PE interview |
| 9 | Credit & Leveraged Finance | 3 | Follow-ups to LBO, needed for LevFin/RX interest |
| 10 | Industry-Specific Valuation | 5 | Banks, REITs, E&P, SaaS, insurance |
| 11 | Mental Math & Brain Teasers | 2 | Paper LBO speed, interview math |

**Total: 56 lessons.** Build Module 5, Lesson 5.2 (CAPM & beta) first — it's the fully written sample in `lesson-5-2-capm-beta.json`.

---

## MODULE 0 — Foundations

### 0.1 Time value of money 🟢
- **Walkthrough:** why $1 today > $1 later → future value → present value → discount rate as opportunity cost → compounding frequency.
- **Fill-ins:** PV = FV / (1 + r)^n · FV = PV × (1 + r)^n · higher discount rate → **lower** PV.
- **Deep dives:** why the discount rate = "required return" not "interest rate"; continuous compounding (one line, so they recognize it); real vs. nominal rates and why cash flows and rates must match.
- **Interview Qs:** "Would you rather have $100 today or $110 in a year?" (depends on your rate — the right answer is a framework, not a number).

### 0.2 NPV, IRR, and MOIC 🟢
- **Walkthrough:** NPV as sum of discounted cash flows minus cost → IRR as the rate where NPV = 0 → MOIC as cash-on-cash.
- **Fill-ins:** IRR is the discount rate that sets NPV to **zero** · MOIC = total cash returned / cash invested.
- **Deep dives:** why IRR can mislead (timing, multiple IRRs with sign changes, reinvestment assumption); why PE cares about both IRR and MOIC; why a quick dividend recap raises IRR but can lower MOIC.
- **Interview Qs:** "2x in 3 years — what's the IRR?" (~26%); "3x in 5 years?" (~25%).

### 0.3 Perpetuities and growing perpetuities 🟢
- **Walkthrough:** perpetuity = CF / r → growing perpetuity = CF₁ / (r − g) → this *is* the Gordon Growth terminal value.
- **Fill-ins:** the numerator uses **next year's** cash flow · formula breaks when g ≥ r.
- **Deep dives:** why g must be below long-run nominal GDP growth; what happens mathematically as g → r.
- **Workbook:** none (inline calculators only).

---

## MODULE 1 — Accounting

### 1.1 The three statements 🟢
- **Walkthrough:** what each statement shows (performance over time / snapshot at a point / cash movement) → major line items → accrual vs. cash accounting.
- **Fill-ins:** Assets = Liabilities + **Equity** · net income flows to retained earnings and the top of the CFS.
- **Deep dives:** why you need the CFS if you have the IS (non-cash charges, working capital, CapEx); if you could only have one statement (CFS, or BS + IS with explanation); cash vs. accrual examples (deferred revenue, accrued expenses).
- **Interview Qs:** "Walk me through the three statements." "Which statement is most important?"

### 1.2 How the statements link 🟢
- **Walkthrough:** NI → CFS → non-cash adds → working capital → CFI → CFF → net change in cash → BS cash; NI − dividends → retained earnings; balance check.
- **Fill-ins:** an increase in an operating asset is a **use** of cash · an increase in an operating liability is a **source** of cash.
- **Deep dives:** the sign logic of working capital (why AR up = cash down); why the BS must balance and the most common reasons a model doesn't.
- **Workbook:** `PEB_01_Accounting_3Statement_Linking.xlsx` (Tab "Mini 3-Statement").

### 1.3 "Walk me through" scenarios 🟢
- **Walkthrough:** fixed method: IS → CFS → BS, always check balance. Run the classics:
  - Depreciation +$10 (40% tax)
  - Inventory write-down $10
  - Buy $100 PP&E with cash; then depreciate
  - Issue $100 debt; pay interest; repay principal
  - Stock-based comp $10
  - AR +$10 / Accrued expenses +$10 / Deferred revenue +$10
  - Pay $10 dividends
  - Goodwill impairment $10
- **Fill-ins:** depreciation +$10 at 40% tax → NI down **$6**, cash up **$4**.
- **Deep dives:** why D&A *raises* cash (tax shield); why principal repayment never hits the IS; why SBC is added back yet still matters for valuation (dilution).
- **Interview Qs:** all of the above, timed at ≤ 45 seconds each.
- **Workbook:** `PEB_01` Tab "Scenarios".

### 1.4 Working capital deep dive 🟡
- **Walkthrough:** operating vs. total working capital → why cash and debt are excluded → change in NWC on the CFS.
- **Fill-ins:** NWC excludes **cash** and **debt** · a business with negative NWC (e.g., subscription models) gets cash *before* delivering.
- **Deep dives:** negative working capital as a good sign (Amazon, airlines, SaaS); working capital true-up at deal close; seasonal businesses.
- **Interview Qs:** "Can working capital be negative? Is that bad?"

### 1.5 Deferred taxes, NOLs, and SBC 🔴
- **Walkthrough:** book vs. cash taxes → DTLs from accelerated tax depreciation → DTAs from NOLs → valuation allowance.
- **Fill-ins:** accelerated tax depreciation creates a deferred tax **liability**.
- **Deep dives:** DTL from asset write-ups in M&A; NOL limits (Section 382 — awareness only); why SBC added back on the CFS doesn't mean it's free.
- **Interview Qs:** "What's a DTL and how is it created?" "How do NOLs affect a valuation?"

### 1.6 Goodwill, intangibles, and impairments 🟡
- **Walkthrough:** goodwill = purchase price − fair value of net identifiable assets → tested for impairment, not amortized (US GAAP) → impairment flows through IS.
- **Fill-ins:** goodwill is created only through **acquisitions**.
- **Deep dives:** why impairments are non-cash and tax non-deductible (usually); goodwill vs. other intangibles that *do* amortize.
- **Workbook:** `PEB_06` Tab "Merger Model" (goodwill calc).

### 1.7 Leases, IFRS vs. US GAAP 🔴
- **Walkthrough:** ASC 842 puts operating leases on the BS → IFRS 16 treats nearly all leases like finance leases → effect on EBITDA.
- **Fill-ins:** under IFRS 16, lease expense moves **below** EBITDA (into D&A + interest), so EBITDA is higher.
- **Deep dives:** why you must be consistent with leases in EV and EBITDA (if you add lease liabilities to EV, use EBITDAR or IFRS-style EBITDA); why this matters for APAC/European comps (relevant to MSU students targeting international).

---

## MODULE 2 — Equity Value & Enterprise Value

### 2.1 What they mean 🟢
- **Walkthrough:** Equity Value = value of all assets to common shareholders only → EV = value of core operations to all capital providers → house analogy ($500k house, $100k down, $400k mortgage).
- **Fill-ins:** Equity Value = share price × **diluted** shares outstanding.
- **Deep dives:** why both exist (different investors, different metrics); current vs. implied values.
- **Interview Qs:** "What's the difference between EV and Equity Value?" — the *meaning*, not just the formula.

### 2.2 The bridge 🟢
- **Walkthrough:** EV = Equity Value + debt + preferred + noncontrolling interest − cash (and non-operating assets).
- **Fill-ins:** cash is **subtracted** · noncontrolling interest is **added** · equity investments are **subtracted**.
- **Deep dives:** *why* NCI is added (consolidated 100% of the sub's EBITDA but don't own 100%); why equity investments are subtracted (their income is excluded from EBITDA); operating leases — add only if EBITDA is consistent; unfunded pensions — debt-like; whether to subtract all cash or excess cash only.
- **Workbook:** `PEB_02_EV_Equity_Bridge.xlsx`.

### 2.3 Diluted shares and the treasury stock method 🟢
- **Walkthrough:** basic shares → in-the-money options/warrants → TSM (assume exercise, company buys back shares with proceeds) → RSUs → convertibles (if-converted).
- **Fill-ins:** only **in-the-money** options are counted · TSM net new shares = options − (options × strike / share price).
- **Deep dives:** why TSM assumes buybacks; convertible bonds — when to count as debt vs. shares (in the money?); why not count out-of-the-money options.
- **Workbook:** `PEB_02` Tab "Diluted Shares".

### 2.4 Can EV be negative? Can Equity Value be negative? 🟡
- **Walkthrough:** Equity Value can't be negative (price × shares ≥ 0, limited liability) → EV can be negative when cash exceeds market cap + debt.
- **Deep dives:** what negative EV signals (market expects cash burn / distrust of management); why book equity *can* be negative (buybacks, accumulated losses — McDonald's, Starbucks) while market equity can't.
- **Workbook:** `PEB_02` Tab "Negative EV".

### 2.5 What affects EV vs. Equity Value 🟡
- **Walkthrough:** the test: does it change core operations, or just capital structure?
- **Fill-ins:** issuing $100 of stock and holding the cash → Equity Value **up $100**, EV **unchanged**.
- **Deep dives:** issue debt to buy a company (EV up, equity flat); pay a dividend (equity down, EV unchanged); EV is "capital-structure neutral" — mostly, and the exceptions (tax shield).
- **Interview Qs:** five rapid-fire "what happens to EV and Equity Value if…" questions.
- **Workbook:** `PEB_02` Tab "EV vs Equity Scenarios".

---

## MODULE 3 — Valuation Overview

### 3.1 The methods and when to use them 🟢
- **Walkthrough:** intrinsic (DCF) vs. relative (comps, precedents) → LBO as a floor → sum-of-the-parts → liquidation.
- **Fill-ins:** precedent transactions usually give the **highest** value because they include a **control premium**.
- **Deep dives:** exceptions where comps beat precedents (hot public markets); why a DCF can come out highest or lowest (it's assumption-driven); why the LBO is a floor (what a sponsor could pay and still hit target returns).
- **Interview Qs:** "Walk me through how you'd value a company." "Rank the methods from highest to lowest."

### 3.2 Pairing metrics with multiples 🟡
- **Walkthrough:** the consistency rule: EV multiples pair with metrics before interest (Revenue, EBITDA, EBIT) → equity multiples pair with metrics after interest (Net Income, EPS, levered FCF).
- **Fill-ins:** EV / **EBITDA** · Price / **EPS** · **never** EV / Net Income.
- **Deep dives:** why EV/Revenue for unprofitable companies; why P/E is distorted by capital structure; EBITDA vs. EBIT when CapEx-heavy.

### 3.3 The football field 🟢
- **Walkthrough:** each method gives a range → plotted side by side → 52-week range for context → how bankers use it in a pitch.
- **Workbook:** `PEB_05` Tab "Football Field".

---

## MODULE 4 — Comps & Precedents

### 4.1 Selecting comparable companies 🟢
- **Walkthrough:** industry, size, growth, margins, geography, business model → typically 5–10 comps.
- **Deep dives:** what to do when there are no good comps; size discounts; why "same industry" isn't enough.

### 4.2 Calculating and applying multiples 🟢
- **Walkthrough:** gather data → compute EV & equity value → LTM and forward multiples → stats (25th, median, 75th) → apply to target metric.
- **Fill-ins:** median is preferred over mean because it **reduces outlier** distortion.
- **Deep dives:** LTM calc (FY + YTD current − YTD prior); calendarization for different fiscal years; normalizing for one-time charges.
- **Workbook:** `PEB_05` Tab "Trading Comps".

### 4.3 Precedent transactions 🟢
- **Walkthrough:** select deals (industry, size, recency) → transaction EV / LTM metrics → control premium.
- **Deep dives:** why older deals are less useful (different markets/rates); why a strategic buyer can pay more (synergies); data issues with private-target deals.
- **Workbook:** `PEB_05` Tab "Precedents".

### 4.4 Comps gotchas 🔴
- **Deep dives:** negative EBITDA comps (exclude, use revenue); why EV/EBITDA differs between companies with similar growth (ROIC, risk); forward vs. LTM multiples for high-growth companies.

---

## MODULE 5 — Cost of Capital

### 5.1 WACC intuition 🟢
- **Walkthrough:** WACC = blended required return of all capital providers → why it's the DCF discount rate for UFCF.
- **Fill-ins:** WACC = (E/V)·Re + (D/V)·Rd·(1 − **t**) + (P/V)·Rp.
- **Deep dives:** market vs. book weights; target vs. current capital structure; why cost of debt is after-tax but cost of equity isn't.

### 5.2 CAPM and beta ⭐ (fully written sample lesson)
- **Walkthrough:** risk-free rate → equity risk premium → beta as sensitivity to the market → Re = Rf + β × ERP.
- **Fill-ins:** β = Cov(stock, market) / **Var(market)** · β of 1.0 = moves **with** the market.
- **Deep dives:** can beta be negative? · beta of cash = 0 · raw vs. adjusted (Blume) beta · beta vs. volatility (different things) · which risk-free rate to use.
- **Workbook:** `PEB_03_CAPM_Beta_WACC.xlsx`.

### 5.3 Levered vs. unlevered beta 🟢
- **Walkthrough:** observed beta includes financial risk → unlever comps' betas → take median → relever at target's capital structure.
- **Fill-ins:** βL = βU × [1 + (1 − t) × **D/E**].
- **Deep dives:** why we do this (private companies, different leverage); Hamada assumes debt beta = 0; why unlevered beta < levered beta (always, for positive debt).

### 5.4 Cost of debt and capital structure 🟡
- **Walkthrough:** YTM on existing debt, or credit-rating spread → after-tax.
- **Fill-ins:** cost of debt is **less** than cost of equity because debt is senior and interest is tax-deductible.
- **Deep dives:** does adding debt always lower WACC? (No — U-shape: cheaper capital vs. higher distress risk raising both Re and Rd); can WACC be less than the cost of debt (only in edge cases like negative beta).

### 5.5 Country risk and emerging markets 🔴
- **Walkthrough:** country risk premium → local vs. USD rates → currency consistency.
- **Deep dives:** sovereign spread method; why thin local bond markets complicate Rf; matching currency of cash flows and discount rate.

---

## MODULE 6 — DCF

### 6.1 DCF walkthrough 🟢
- **Walkthrough:** project UFCF 5–10 years → discount at WACC → terminal value → discount TV → sum = implied EV → bridge to equity value → per-share value.
- **Interview Qs:** "Walk me through a DCF." (≤ 90 seconds)

### 6.2 Building unlevered FCF 🟢
- **Walkthrough:** EBIT → less taxes (NOPAT) → + D&A → − CapEx → − ΔNWC.
- **Fill-ins:** UFCF starts from **EBIT** (excludes interest) · increase in NWC **reduces** FCF.
- **Deep dives:** UFCF vs. levered FCF (and the matching discount rate); SBC — add back or not (honest answer: debate; conservative is not to); why interest is excluded.
- **Workbook:** `PEB_04_DCF.xlsx`.

### 6.3 Discounting and the mid-year convention 🟡
- **Walkthrough:** discount factor = 1 / (1 + WACC)^t → mid-year: cash arrives through the year so use t − 0.5.
- **Fill-ins:** mid-year convention **raises** value (cash discounted less).
- **Deep dives:** stub periods; how TV discounting differs with mid-year (Gordon vs. exit-multiple subtlety).

### 6.4 Terminal value 🟢
- **Walkthrough:** Gordon Growth (UFCF × (1 + g) / (WACC − g)) vs. Exit Multiple (EBITDA × multiple).
- **Fill-ins:** g should be below long-term **nominal GDP growth** · TV is often **60–80%** of DCF value.
- **Deep dives:** cross-checking (implied multiple from GGM, implied growth from exit multiple); which method bankers prefer and why; what a TV that's 90%+ of value tells you.

### 6.5 Sensitivities and "what if" questions 🟡
- **Walkthrough:** WACC vs. g grid; revenue growth vs. margin grid.
- **Deep dives:** WACC +1% vs. g +1% — which matters more; why sensitivity tables matter more than the point estimate.
- **Workbook:** `PEB_04` Tab "Sensitivity".

### 6.6 Levered DCF 🟡
- **Walkthrough:** levered FCF (after interest & principal) → discount at cost of equity → result = equity value directly.
- **Deep dives:** why levered DCFs are rare (capital structure changes); when used (banks, financial institutions).

### 6.7 DCF gotchas 🔴
- **Deep dives:** DCF on a company with negative FCF (extend the forecast); DCF for a bank (doesn't work → DDM); what to check when a DCF output looks off (double-counting, TV dominance, mismatched FCF and rate); does a DCF include synergies (only in an acquirer's view).

---

## MODULE 7 — M&A & Merger Models

### 7.1 Why companies acquire 🟢
- Strategic rationale, synergies (revenue vs. cost), buy vs. build. **Interview Q:** "Why would a company acquire another?"

### 7.2 Accretion / dilution 🟢
- **Walkthrough:** purchase price → financing mix (cash, debt, stock) → pro forma net income (+ target NI, − foregone interest on cash, − new interest, + synergies, tax-effected) → pro forma shares → pro forma EPS vs. standalone.
- **Fill-ins:** a deal is accretive if pro forma EPS is **higher** than standalone EPS.
- **Deep dives:** the shortcut: compare weighted cost of acquisition (after-tax cost of cash/debt, inverse acquirer P/E for stock) to target's earnings yield (inverse purchase P/E); why "accretive" ≠ "good deal".
- **Workbook:** `PEB_06_Merger_Model.xlsx`.

### 7.3 Purchase price allocation 🟡
- **Walkthrough:** write-ups of assets → new DTL → goodwill as the plug.
- **Deep dives:** why asset write-ups create a DTL in a stock deal; stock vs. asset deals; 338(h)(10) (awareness only).

### 7.4 Synergies and breakeven 🟡
- **Walkthrough:** pre-tax synergies needed to make a dilutive deal breakeven.
- **Workbook:** `PEB_06` breakeven row.

### 7.5 M&A gotchas 🔴
- **Deep dives:** fixed vs. floating exchange ratio; why an acquirer with a higher P/E can buy a lower-P/E target with stock and be accretive (and the reverse); contribution analysis; earnouts.

---

## MODULE 8 — LBO

### 8.1 LBO intuition 🟢
- **Walkthrough:** buy with mostly debt → pay down debt with company's cash flow → sell → leverage amplifies equity returns.
- **Fill-ins:** leverage boosts returns because the sponsor contributes **less equity**.
- **Interview Qs:** "Walk me through an LBO." "Why does leverage increase returns?"

### 8.2 Sources & uses 🟢
- **Walkthrough:** uses (purchase equity, refinance debt, fees) = sources (debt tranches, sponsor equity, rollover).
- **Workbook:** `PEB_07_LBO.xlsx` Tab "LBO".

### 8.3 The debt stack 🟡
- **Walkthrough:** revolver → term loans (TLA amortizing, TLB minimal amortization) → senior notes → subordinated / mezz / PIK.
- **Deep dives:** covenants (maintenance vs. incurrence); call protection; why PIK raises risk but helps cash flow.

### 8.4 Returns: IRR, MOIC, and the drivers 🟢
- **Walkthrough:** EBITDA growth, multiple expansion, debt paydown → returns attribution.
- **Fill-ins:** for the same MOIC, a longer hold **lowers** IRR.
- **Deep dives:** dividend recaps (IRR up, risk up); why sponsors don't assume multiple expansion.
- **Workbook:** `PEB_07` Tab "Returns Attribution".

### 8.5 Paper LBO 🟢
- **Walkthrough:** the 5-step mental math method → solve for IRR via rule-of-thumb.
- **Workbook:** `PEB_07` Tab "Paper LBO".

### 8.6 The ideal LBO candidate 🟡
- Stable cash flow, low CapEx, strong market position, assets for collateral, clear exit, improvable operations.

### 8.7 LBO gotchas 🔴
- **Deep dives:** circularity (interest on average balance); minimum cash; transaction fees capitalized vs. expensed; management rollover; why IRR drops with more equity.

---

## MODULE 9 — Credit & Leveraged Finance

### 9.1 Credit metrics 🟢 — Debt / EBITDA, Net Debt / EBITDA, EBITDA / interest, (EBITDA − CapEx) / interest, FCF / Debt.
### 9.2 Seniority, security, and recovery 🟡 — senior secured vs. unsecured vs. sub; absolute priority rule.
### 9.3 Credit gotchas 🔴 — OID, call protection, covenant-lite, why yields rise when ratings fall.

---

## MODULE 10 — Industry-Specific Valuation

### 10.1 Banks 🔴 — P/BV, P/TBV, ROE, DDM; why EV/EBITDA doesn't apply.
### 10.2 REITs 🔴 — FFO, AFFO, NAV, cap rate.
### 10.3 Energy (E&P) 🔴 — EV/EBITDAX, NAV by reserves, $/flowing barrel.
### 10.4 SaaS / tech 🔴 — ARR, NRR, Rule of 40, EV/Revenue.
### 10.5 Insurance 🔴 — float, combined ratio, P/BV.

---

## MODULE 11 — Mental Math & Brain Teasers

### 11.1 Rules of thumb 🟢 — Rule of 72, 2x in 3 yrs ≈ 26%, 2x in 5 yrs ≈ 15%, 3x in 5 yrs ≈ 25%, 2.5x in 5 yrs ≈ 20%.
### 11.2 Interview math drills 🟡 — percentages, quick multiplication, compound growth.

---

## Lessons that map to student questions you've been getting

| Freshman question | Lesson | Deep dive |
|---|---|---|
| "Walk me through a DCF" | 6.1 | — |
| "What's CAPM?" | 5.2 | — |
| "Can beta be negative?" | 5.2 | "Can beta be negative?" |
| "Why subtract cash in EV?" | 2.2 | "Why subtract cash?" |
| "Why add back D&A?" | 1.3 | "Tax shield" |
