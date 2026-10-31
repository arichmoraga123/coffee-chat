# Prospect Learn — Full Lesson Content & Nuance Bank
### PE@Broad freshman technical track · every lesson, every testable nuance

**How this file works.** Each lesson has four parts, which map directly onto the lesson-page blocks in the Claude Code spec:

- **Walkthrough** → `text` / `stepThrough` blocks (the main start-to-end narrative)
- **Fill-ins** → `fillBlank` / `calc` / `mcq` blocks (answer shown after the arrow)
- **Deep dives** → `deepDive` dropdowns. Each has the explanation and a **Say it** line — the 15–30 second answer a student should be able to give out loud.
- **Checkpoint** → `checkpoint` block (out-loud self-test)

Tags: 🟢 asked in almost every interview · 🟡 common follow-up · 🔴 advanced / superday / gotcha

All explanations are original. Every number in a worked example has been checked.

---

# MODULE 0 — FOUNDATIONS

## 0.1 Time value of money 🟢

**Walkthrough**
1. A dollar today is worth more than a dollar later because you can invest today's dollar and earn a return.
2. Future value: FV = PV × (1 + r)^n. $100 at 10% for 2 years = $121.
3. Present value runs it backwards: PV = FV / (1 + r)^n. $121 in 2 years at 10% = $100 today.
4. The discount rate is the return you *give up* by not investing elsewhere at similar risk — your opportunity cost.
5. Higher discount rate → lower present value. Further-out cash flows → hit harder by the discount rate.

**Fill-ins**
- PV of $110 received in 1 year at a 10% discount rate → **$100**
- If the discount rate rises, present value **falls**
- The discount rate represents the investor's **opportunity cost** / required return

**Deep dives**
- **Why is the discount rate called a "required return" and not an "interest rate"?** 🟡
  An interest rate is what a lender charges. A required return is what *any* investor needs to earn to accept a given level of risk. For a risky business, that's far above a bank interest rate. In valuation, the discount rate always reflects the risk of the cash flows being discounted.
  *Say it:* "The discount rate is the return investors require for the risk they're taking — their opportunity cost — so riskier cash flows get a higher rate and a lower present value."
- **Why are long-dated cash flows more sensitive to the discount rate?** 🟡
  The rate compounds. Moving from 8% to 10% barely changes the PV of a cash flow next year (0.926 → 0.909), but cuts the PV of a cash flow in 20 years by about a third (0.215 → 0.149). This is why growth companies — whose value sits far in the future — fall harder when interest rates rise.
  *Say it:* "Discounting compounds, so a rate change hits distant cash flows much harder. That's why long-duration assets like growth stocks are most rate-sensitive."
- **Nominal vs. real — why must cash flows and rates match?** 🔴
  Nominal figures include inflation; real figures strip it out. If you project nominal cash flows (with price increases) but discount at a real rate, you overstate value. Mixing them is a consistency error, the same family as using EV/Net Income.
  *Say it:* "Nominal cash flows get a nominal discount rate, real get real. Mismatching them inflates or deflates the value."
- **Does compounding frequency matter?** 🟢
  Yes — more frequent compounding means slightly more growth. 10% compounded annually turns $100 into $110; compounded monthly, about $110.47. Interviews rarely test the math, but you should know why a monthly-compounding loan costs more than its stated annual rate.

**Checkpoint:** Why is $1 today worth more than $1 tomorrow? · What happens to the PV of a 20-year cash flow if rates rise? · What does the discount rate represent?

---

## 0.2 NPV, IRR, and MOIC 🟢

**Walkthrough**
1. NPV = sum of discounted future cash flows − upfront cost. Positive NPV means the investment earns more than the required return.
2. IRR is the discount rate that makes NPV exactly zero — the annualized return the investment earns.
3. MOIC (multiple on invested capital) = total cash back ÷ cash put in. It ignores time.
4. PE firms report both: IRR for speed, MOIC for size of the win.

**Fill-ins**
- IRR is the discount rate that sets NPV equal to **zero**
- $100 invested, $250 returned → MOIC = **2.5x**
- If NPV > 0 at a 15% hurdle rate, the IRR must be **greater than** 15%

**Deep dives**
- **IRR vs. MOIC — why do PE firms care about both?** 🟢
  IRR rewards speed; MOIC rewards magnitude. Doubling money in 1 year is a 100% IRR but only 2.0x. Tripling it over 7 years is ~17% IRR but 3.0x. LPs need both: a high IRR on a quick flip doesn't put much money to work, and a high MOIC over a decade may underperform the market.
  *Say it:* "IRR tells you how fast you made money, MOIC tells you how much. A quick 1.5x can show a huge IRR, so you look at both."
- **How does a dividend recap affect IRR and MOIC?** 🟡
  A recap returns cash to the sponsor early. Getting money back sooner raises IRR. MOIC is roughly unchanged or slightly lower, because the company now carries more debt and pays more interest, which reduces the equity value at exit.
  *Say it:* "A dividend recap pulls cash forward, which boosts IRR. MOIC barely moves or dips, since the new debt reduces exit equity."
- **Can a project have more than one IRR?** 🔴
  Yes. If cash flows change sign more than once (negative, positive, negative — e.g., a mine with cleanup costs at the end), there can be multiple rates where NPV = 0. NPV doesn't have this problem.
- **What's wrong with ranking projects by IRR alone?** 🔴
  IRR ignores scale. A 50% IRR on $1,000 creates less value than a 20% IRR on $1,000,000. IRR also implicitly assumes interim cash flows are reinvested at the IRR itself, which overstates very high IRRs. For choosing between projects, NPV is the cleaner rule.
  *Say it:* "IRR ignores scale and assumes reinvestment at the IRR. To compare projects, NPV is more reliable."

**Checkpoint:** Define IRR. · Why would a PE firm accept a lower IRR for a higher MOIC? · What does a dividend recap do to IRR and MOIC?

---

## 0.3 Perpetuities 🟢

**Walkthrough**
1. A perpetuity pays the same cash flow forever. Value = CF ÷ r. $100 a year at 10% = $1,000.
2. A growing perpetuity grows each year at g. Value = CF₁ ÷ (r − g), where CF₁ is *next* year's cash flow.
3. This is exactly the Gordon Growth terminal value used in a DCF.

**Fill-ins**
- $50 per year forever at a 5% discount rate → **$1,000**
- Growing perpetuity: next year's CF of $100, r = 10%, g = 2% → **$1,250**
- The formula breaks down when g is **greater than or equal to** r

**Deep dives**
- **Why does the formula use *next year's* cash flow?** 🟡
  The formula values a stream starting one period from now. If you have this year's cash flow, multiply by (1 + g) first. Forgetting this in a DCF understates terminal value.
  *Say it:* "Gordon Growth values cash flows starting one year out, so you grow the final-year cash flow by (1 + g) first."
- **Why must g be lower than r — and lower than GDP growth?** 🟢
  If g ≥ r, the denominator is zero or negative and the value is infinite or nonsensical. Economically, a company can't grow faster than the overall economy forever, or it would eventually *become* the economy. So long-run g is capped around long-term nominal GDP growth (roughly 2–4%).
  *Say it:* "A company can't outgrow the economy forever, so terminal growth stays below long-run GDP growth — and it has to stay below the discount rate or the math breaks."

**Checkpoint:** Value a $20/year perpetuity at 8%. · Why does g have to be below r?

---

# MODULE 1 — ACCOUNTING

## 1.1 The three financial statements 🟢

**Walkthrough**
1. **Income statement:** revenue, expenses, and profit over a *period*. Ends in net income.
2. **Balance sheet:** what the company owns (assets), owes (liabilities), and what's left for owners (equity), at a *point in time*. Assets = Liabilities + Equity.
3. **Cash flow statement:** reconciles net income to the actual change in cash. Three sections — operating, investing, financing.
4. The IS uses **accrual accounting**: revenue when earned, expenses when incurred — not when cash moves. The CFS exists to bridge that gap.

**Fill-ins**
- Assets = Liabilities + **Equity**
- The balance sheet shows a company at a **point in time**; the IS and CFS cover a **period**
- Revenue is recognized when it is **earned**, not when cash is received

**Deep dives**
- **If you could only use one statement to judge a company, which?** 🟢
  The cash flow statement — it shows whether the business actually generates cash, which is what keeps it alive. With two statements, pick the BS and IS: you can rebuild the CFS from two balance sheets and an income statement.
  *Say it:* "The cash flow statement, because cash is what keeps a company solvent. With two, the balance sheet and income statement, since you can derive the cash flow statement from them."
- **Why isn't net income the same as cash flow?** 🟢
  Three reasons: (1) non-cash expenses like D&A and stock-based comp reduce net income without using cash; (2) working capital — revenue on credit increases net income before cash arrives; (3) some cash uses never hit the IS: CapEx, debt principal, dividends.
  *Say it:* "Non-cash charges, working capital timing, and items like CapEx and debt repayment that skip the income statement."
- **Examples of items on the IS but not the CFS, and vice versa?** 🟡
  IS but not cash: D&A, stock-based comp, impairments, unrealized gains. Cash but not IS: CapEx, buying inventory, issuing or repaying debt principal, dividends, share buybacks.
- **Where do dividends show up?** 🟡
  Not on the income statement. They're paid from net income, so they reduce retained earnings on the balance sheet and appear as a financing outflow on the CFS. *Preferred* dividends are subtracted to get net income available to common shareholders.
  *Say it:* "Dividends aren't an expense. They hit retained earnings and the financing section of the cash flow statement."
- **Accrual vs. cash accounting — give an example.** 🟢
  A software company bills $1,200 upfront for a 12-month subscription. Cash basis: $1,200 of revenue in month one. Accrual basis: $100 of revenue each month, with the unearned remainder sitting in deferred revenue (a liability).

**Checkpoint:** Walk me through the three statements. · Why do we need a cash flow statement? · Which statement matters most?

---

## 1.2 How the statements link 🟢

**Walkthrough**
1. Net income from the IS is the first line of the CFS.
2. CFO adds back non-cash items (D&A, SBC, impairments), subtracts non-cash gains, and adjusts for changes in working capital.
3. CFI: CapEx, acquisitions, asset sales, investments.
4. CFF: debt raised/repaid, stock issued/repurchased, dividends.
5. Net change in cash flows to the BS cash line. Net income (less dividends) flows to retained earnings.
6. The BS balances because every change on one side is matched elsewhere.

**Fill-ins**
- An increase in an operating asset (e.g., AR) is a **use** of cash
- An increase in an operating liability (e.g., AP) is a **source** of cash
- Retained earnings = beginning RE + net income − **dividends**

**Deep dives**
- **"Walk me through how the statements link."** 🟢
  *Say it:* "Net income from the income statement flows to the top of the cash flow statement and into retained earnings. On the CFS, you add back non-cash expenses, adjust for working capital, then add investing and financing activities to get the net change in cash, which flows to cash on the balance sheet. PP&E, debt, and equity on the balance sheet are also updated from the CFS, and the balance sheet balances."
- **Why does an increase in accounts receivable reduce cash?** 🟢
  AR rising means you recorded revenue (boosting net income) but haven't collected the cash. The CFS starts from net income, so it must subtract the uncollected amount.
  *Say it:* "Net income already counts that revenue, but the cash hasn't arrived, so we subtract the increase."
- **How does a gain on an asset sale flow through?** 🟡
  Sell equipment with a $100 book value for $120. IS: $20 gain (net income +$12 at 40% tax). CFS: subtract the $20 gain in CFO (it's not operating cash), then record the full $120 proceeds in CFI. Net cash +$112 (the +$120 proceeds less $8 of tax). BS: cash +$112, PP&E −$100 → assets +$12; equity +$12. Balanced.
  *Say it:* "Subtract the gain in operating cash flow so it isn't double counted, and show the full proceeds in investing."
- **D&A is a real economic cost — why add it back?** 🟡
  D&A spreads the cost of an asset bought in the past. The cash left when the asset was bought (CapEx in CFI). Adding back D&A just prevents counting that cost twice.
- **What are the most common reasons a model doesn't balance?** 🔴
  A CFS line not linked to the BS; a sign flipped in working capital; dividends not deducted from retained earnings; a new BS item with no CFS counterpart. Debug by checking the year the imbalance first appears and which line changed.

**Checkpoint:** Walk me through how the three statements link. · Why does AR going up reduce cash? · How do you treat a gain on sale?

---

## 1.3 "Walk me through" scenarios 🟢

**Walkthrough**
Use the same method every time: **IS → CFS → BS, then check that it balances.** Assume a 40% tax rate unless told otherwise. Practice with workbook PEB_01 "Scenarios."

**Fill-ins**
- Depreciation +$10 → net income **−$6**, cash **+$4**, PP&E **−$10**
- Buy $100 of PP&E with cash → net income **unchanged**, cash **−$100**
- Repay $50 of debt principal → income statement impact: **none**
- Stock-based comp of $10 → net income **−$6**, cash **+$4**, equity **+$4**

**Deep dives**
- **Depreciation goes up by $10 — walk me through it.** 🟢
  *Say it:* "Operating income falls by $10, so at a 40% tax rate net income falls by $6. On the cash flow statement, net income is down $6 but we add back the $10 of depreciation since it's non-cash, so cash is up $4. On the balance sheet, cash is up $4, PP&E is down $10, so assets are down $6. Retained earnings is down $6, so both sides are down $6 and it balances."
- **Why does depreciation *increase* cash?** 🟢
  Depreciation is tax-deductible but non-cash. It lowers taxable income, so the company pays less tax. The cash increase is the tax shield: $10 × 40% = $4.
  *Say it:* "It reduces taxes without using cash, so cash goes up by depreciation times the tax rate."
- **Inventory written down by $10.** 🟢
  Same mechanics as depreciation: non-cash expense. Net income −$6, add back $10 → cash +$4. BS: cash +$4, inventory −$10 → assets −$6; equity −$6. (Assumes the write-down is tax-deductible, the standard interview simplification.)
- **Raise $100 of debt, then pay $10 of interest.** 🟢
  Raising debt: no IS impact; CFF +$100; cash and debt both +$100. Paying interest: net income −$6; cash −$6; equity −$6. Interest is tax-deductible, so the after-tax cost is only $6.
- **Repay $50 of debt principal.** 🟢
  No IS impact — principal isn't an expense. CFF −$50. Cash −$50, debt −$50.
  *Say it:* "Principal repayment never hits the income statement. Cash and debt both fall by $50."
- **Stock-based compensation of $10.** 🟡
  IS: −$10 expense → net income −$6. CFS: add back $10 (non-cash) → cash +$4. BS: cash +$4; equity: retained earnings −$6 but common stock/APIC +$10 → equity +$4. Balanced.
  *Say it:* "Net income falls $6, we add back the $10 since it's non-cash, cash is up $4. Equity is up $4 because the new stock issued adds $10 while retained earnings falls $6."
- **AR increases by $10 (sale made on credit).** 🟢
  Revenue +$10 → net income +$6. CFS: net income +$6, subtract $10 increase in AR → cash −$4 (you paid tax on revenue you haven't collected). BS: cash −$4, AR +$10 → assets +$6; equity +$6.
- **A customer prepays $10 (deferred revenue).** 🟡
  No revenue yet → no IS impact. CFS: deferred revenue up $10 → cash +$10. BS: cash +$10, deferred revenue (liability) +$10. In reality the cash may be taxed when received; the interview version ignores that.
- **$10 bonus expensed but not yet paid (accrued expense).** 🟡
  Net income −$6. CFS: add back $10 increase in accrued expenses → cash +$4. BS: cash +$4; liabilities +$10; equity −$6.
- **Pay a $10 dividend.** 🟢
  No IS impact. CFF −$10. Cash −$10, retained earnings −$10.
- **Buy $10 of inventory with cash, then sell it for $15.** 🟡
  Buying: no IS impact; CFO −$10 (inventory up); cash −$10, inventory +$10. Selling: revenue $15, COGS $10 → pre-tax $5 → net income +$3. CFS: net income +$3, inventory decrease +$10 → +$13. Combined across both steps, cash +$3, which matches net income.

**Checkpoint:** Depreciation +$10. · Buy $100 of PP&E. · SBC of $10. · AR up $10. · All in under 45 seconds each.

---

## 1.4 Working capital 🟡

**Walkthrough**
1. Operating working capital = current operating assets (AR, inventory, prepaid expenses) − current operating liabilities (AP, accrued expenses, deferred revenue).
2. Cash and debt are excluded — they're financing items, not operations.
3. On the CFS, an increase in net working capital uses cash; a decrease provides cash.

**Fill-ins**
- Operating working capital excludes **cash** and **debt**
- Cash conversion cycle = DSO + DIO − **DPO**
- If NWC increases by $20, cash flow is **reduced** by $20

**Deep dives**
- **Can working capital be negative? Is that bad?** 🟡
  Yes, and it's often good. Negative NWC means the company collects cash from customers before paying suppliers. Subscription businesses, retailers with fast inventory turns, and airlines (tickets sold before flights) run negative NWC. It's only a red flag if it comes from failing to pay suppliers.
  *Say it:* "Yes — it means customers pay before the company pays suppliers, which is common for subscription businesses and retailers. It's a strength, unless it comes from stretching payables because the company is struggling."
- **Why is cash excluded from working capital?** 🟡
  Cash is the *result* of operations, not part of them. Including it would double-count when you calculate cash flow from changes in working capital. Debt is financing.
- **DSO, DIO, DPO — what do they tell you?** 🔴
  Days sales outstanding (AR ÷ revenue × 365): how fast customers pay. Days inventory outstanding (inventory ÷ COGS × 365): how long stock sits. Days payable outstanding (AP ÷ COGS × 365): how long the company takes to pay suppliers. Cash conversion cycle = DSO + DIO − DPO — the days cash is tied up. Shorter is better.
- **What's a working capital true-up at deal close?** 🔴
  The buyer and seller agree on a "normal" level of working capital (the peg). If the target delivers less at closing, the price falls dollar-for-dollar; more, and it rises. This stops the seller from boosting cash by delaying payables or rushing collections right before closing.
  *Say it:* "The price adjusts if delivered working capital differs from an agreed normal level, so the seller can't game it before closing."

**Checkpoint:** Define working capital. · Can it be negative? · Why exclude cash?

---

## 1.5 Deferred taxes, NOLs, and stock-based comp 🔴

**Walkthrough**
1. Companies keep two sets of books: book (GAAP, for investors) and tax (for the IRS). They often differ.
2. Timing differences create deferred tax liabilities (pay more tax later) or deferred tax assets (pay less later).
3. Net operating losses (NOLs) are past losses that can offset future taxable income — a DTA.

**Fill-ins**
- Accelerated depreciation for tax purposes creates a deferred tax **liability**
- NOLs create a deferred tax **asset**
- If a company might not use its DTAs, it records a **valuation allowance**

**Deep dives**
- **How does a DTL arise?** 🟡
  Tax rules let companies depreciate faster than they do on GAAP books. Early on, tax depreciation > book depreciation, so cash taxes are lower than book taxes. That difference is a liability: the company will owe it later when tax depreciation falls below book.
  *Say it:* "When tax depreciation is faster than book depreciation, the company pays less cash tax now and more later. The difference sits on the balance sheet as a deferred tax liability."
- **How do NOLs affect a valuation?** 🟡
  NOLs reduce future cash taxes. Value them separately as the present value of the tax savings, or reduce cash taxes in the DCF. Since 2017 tax reform, new US NOLs carry forward indefinitely but can offset only 80% of taxable income in a given year.
- **What happens to NOLs in an acquisition?** 🔴
  If ownership changes by more than 50%, Section 382 limits how much NOL can be used per year: roughly the target's equity value × a published long-term tax-exempt rate. So acquired NOLs are worth less than their face value.
  *Say it:* "Section 382 caps annual NOL usage after a change of control, so you can't buy a company just for its losses."
- **SBC is added back on the CFS — so is it free?** 🟡
  No. It doesn't use cash, but it dilutes existing shareholders, and companies often spend real cash buying back shares to offset it. In valuation, adding SBC back to cash flow overstates value unless dilution is captured elsewhere. Many practitioners treat it as a cash expense.
  *Say it:* "It's non-cash, but it's a real cost through dilution. Adding it back without counting the dilution overstates value."

**Checkpoint:** What's a DTL? · How do NOLs affect value? · Is SBC a real expense?

---

## 1.6 Goodwill, intangibles, and impairments 🟡

**Walkthrough**
1. When a company buys another for more than the fair value of its identifiable net assets, the excess is goodwill.
2. Goodwill = purchase price − fair value of net identifiable assets.
3. Under US GAAP (public companies), goodwill isn't amortized. It's tested for impairment at least yearly.
4. An impairment is a non-cash charge on the IS that reduces goodwill on the BS.

**Fill-ins**
- Goodwill is only created through **acquisitions**
- A goodwill impairment is a **non-cash** charge
- Under US GAAP, public companies **do not** amortize goodwill

**Deep dives**
- **Why can't a company create goodwill internally?** 🟡
  Goodwill only exists when someone pays a market price above book value. A company's own brand or culture isn't recorded as an asset, because there's no transaction to measure it.
- **What's the difference between goodwill and other intangibles?** 🟡
  Identifiable intangibles (customer lists, patents, trademarks) can be separated and valued. Most have finite lives and are amortized. Goodwill is the unidentifiable residual — synergies, workforce, reputation — and isn't amortized under US GAAP.
- **Is goodwill tax-deductible?** 🔴
  In a stock purchase, no — the tax basis doesn't change. In an asset purchase (or a 338(h)(10) election), the buyer gets a stepped-up basis and can amortize goodwill for tax over 15 years, which creates real tax savings.
- **What's negative goodwill?** 🔴
  If the buyer pays *less* than the fair value of net identifiable assets — a bargain purchase — the difference is recognized as a gain on the IS. It's rare and usually involves distressed sellers.
- **Why do analysts often ignore impairments?** 🟡
  An impairment says the company overpaid for a past deal. It's non-cash and doesn't change future cash flows, so it's excluded from adjusted EBITDA and EPS. It's still a signal about management's capital allocation.
  *Say it:* "It's a non-cash admission of overpaying for an acquisition. It doesn't change future cash flow, so we strip it out of adjusted metrics."

**Checkpoint:** How is goodwill created? · What happens when it's impaired? · Is it tax-deductible?

---

## 1.7 Accounting standards, leases, and inventory 🔴

**Walkthrough**
1. US companies use US GAAP; most of the rest of the world uses IFRS. The differences matter when comparing international comps.
2. Under US GAAP (ASC 842), operating leases go on the balance sheet as a right-of-use asset and lease liability, but the expense stays as one straight-line operating cost — EBITDA unchanged.
3. Under IFRS 16, nearly all leases are treated like finance leases: expense splits into depreciation + interest, both *below* EBITDA. So EBITDA is higher for IFRS companies.
4. Inventory methods (FIFO, LIFO) change COGS and taxes when prices move.

**Fill-ins**
- Under IFRS 16, lease costs are split into **depreciation** and **interest**
- LIFO is **not permitted** under IFRS
- With rising prices, LIFO produces **higher** COGS and **lower** taxes

**Deep dives**
- **Why do leases matter for EV/EBITDA?** 🔴
  Consistency. If EBITDA excludes lease costs (IFRS), the lease liability must be in EV. If EBITDA includes lease costs (US GAAP operating leases), leave lease liabilities out of EV. Comparing a US retailer to a European one without adjusting can mislead by a full turn of EBITDA or more.
  *Say it:* "Under IFRS, lease costs sit below EBITDA, so you'd add lease liabilities to EV. Under US GAAP they're in EBITDA, so you don't. Mixing them breaks comparability."
- **What's EBITDAR?** 🔴
  EBITDA before rent. It strips out lease costs so you can compare companies that own their real estate against those that lease. Pair it with EV including capitalized leases.
- **LIFO vs. FIFO — what changes when prices are rising?** 🟡
  FIFO sells the oldest (cheapest) inventory first → lower COGS, higher profit, higher taxes, and inventory on the BS closer to current cost. LIFO sells the newest (most expensive) first → higher COGS, lower profit, lower taxes, more cash. IFRS bans LIFO.
  *Say it:* "With rising prices, LIFO raises COGS and lowers taxes, so more cash. FIFO shows higher profit. IFRS doesn't allow LIFO."
- **Other IFRS differences worth knowing?** 🔴
  IFRS lets companies put interest paid and dividends paid in either operating or financing cash flow — so CFO can be inconsistent across companies. IFRS also allows capitalizing some development costs that US GAAP expenses.

**Checkpoint:** How do leases affect EBITDA under each standard? · LIFO vs. FIFO in inflation?

---

# MODULE 2 — EQUITY VALUE & ENTERPRISE VALUE

## 2.1 What they mean 🟢

**Walkthrough**
1. **Equity value:** the value of *all* of a company's assets, but only to common shareholders. Share price × diluted shares.
2. **Enterprise value:** the value of the company's *core business operations* to *all* investors — equity, debt, preferred.
3. House analogy: a $500k house bought with $100k down and a $400k mortgage. The house (EV) is worth $500k. Your equity is $100k.
4. Current EV uses today's market price; implied EV comes from a valuation (DCF, comps).

**Fill-ins**
- Equity value = share price × **diluted** shares outstanding
- EV represents the value of core operations to **all** investors
- In the house example, EV = **$500k**, equity value = **$100k**

**Deep dives**
- **Why do we need both?** 🟢
  Different questions, different investors. EV tells you what the business itself is worth regardless of how it's financed, so you can compare companies with different capital structures. Equity value tells shareholders what their stake is worth — it's what the share price reflects.
  *Say it:* "EV lets you compare businesses regardless of financing; equity value tells shareholders what their piece is worth."
- **Why is EV closer to the "real price" of a company?** 🟡
  An acquirer has to buy the equity *and* take on or repay the debt, while getting the cash. EV captures that total economic cost.
- **Book equity vs. market equity?** 🟡
  Book equity is an accounting figure from the balance sheet (historical cost). Market equity value is what investors pay today. Valuation uses market values.

**Checkpoint:** Explain EV vs. equity value without using a formula. · Why do we need both?

---

## 2.2 The EV bridge 🟢

**Walkthrough**
EV = Equity value + Debt + Preferred stock + Noncontrolling interest − Cash − Non-operating assets (equity investments). Work it in PEB_02 "EV Bridge."

**Fill-ins**
- Cash is **subtracted** in the bridge
- Noncontrolling interest is **added**
- Equity investments (associates) are **subtracted**
- Preferred stock is **added**

**Deep dives**
- **Why subtract cash?** 🟢
  Cash isn't part of core operations. If you bought the company, you'd get the cash and could use it to pay part of the price, so it effectively lowers what you're paying for the business. It also doesn't generate EBITDA, so leaving it in would mismatch EV and EBITDA.
  *Say it:* "Cash is non-operating, and an acquirer effectively gets it back. Also, it doesn't produce EBITDA, so removing it keeps EV and EBITDA consistent."
- **Why add debt?** 🟢
  Debt holders have a claim on the business. An acquirer must repay or assume the debt, so it's part of the cost of owning the operations.
- **Why add noncontrolling interest?** 🟡
  If a company owns 70% of a subsidiary, it consolidates 100% of that subsidiary's revenue and EBITDA. But its equity value only reflects its 70% ownership. Adding the 30% NCI makes EV cover 100% of the subsidiary, matching the 100% in EBITDA.
  *Say it:* "The parent consolidates 100% of the sub's EBITDA but owns less than 100%. Adding NCI makes EV match that EBITDA."
- **Why subtract equity investments?** 🟡
  The reverse of NCI. If the company owns 30% of another business, it doesn't consolidate that business's EBITDA — it just records its share of net income below EBITDA. The value of that stake is in equity value, so remove it to keep EV and EBITDA consistent.
- **Why add preferred stock?** 🟡
  Preferred acts like debt: fixed dividends and priority over common shareholders in a liquidation. An acquirer has to pay it off.
- **Do you subtract all cash or only "excess" cash?** 🔴
  In interviews and most banking work, all cash. In practice, some businesses need a minimum operating cash balance (e.g., retailers with cash in registers), and some analysts only subtract cash above that. Trapped cash overseas may also be discounted for repatriation tax.
- **What about unfunded pensions, operating leases, and other debt-like items?** 🔴
  Unfunded pension obligations are debt-like and often added (after-tax). Lease liabilities are added only if EBITDA excludes lease costs (see 1.7). The rule: anything that's a claim on the business and *isn't* reflected in EBITDA gets added.
- **Why isn't accounts payable added like debt?** 🟡
  AP is an operating liability — part of working capital, which is reflected in operating cash flow. Only financing claims go in the bridge.
  *Say it:* "AP is part of operations and already reflected in cash flow. The bridge only includes financing claims."

**Checkpoint:** Walk me through the bridge. · Why subtract cash? · Why add NCI?

---

## 2.3 Diluted shares and the treasury stock method 🟢

**Walkthrough**
1. Start with basic shares outstanding.
2. For each option/warrant tranche: if in the money (strike < share price), assume exercise.
3. TSM: the company uses exercise proceeds to repurchase shares at the current price. Net new shares = options − (options × strike ÷ price).
4. Add RSUs (no strike).
5. Convertibles: if in the money, add shares from conversion (face value ÷ conversion price) and remove the bond from debt.
6. Practice in PEB_02 "Diluted Shares."

**Fill-ins**
- Only **in-the-money** options are counted
- 10 options with a $20 strike, share price $50 → net new shares = **6**
- An in-the-money convertible is counted as **shares**, not debt

**Deep dives**
- **Why does TSM assume the company buys back shares?** 🟡
  When options are exercised, the company receives cash. TSM assumes it uses that cash to repurchase shares at the current price, offsetting part of the dilution. It's a convention that measures net economic dilution.
- **Why exclude out-of-the-money options?** 🟡
  No one pays $60 to exercise an option for a $50 stock. Counting them would overstate dilution.
- **How do convertible bonds work in the share count?** 🟡
  If the share price is above the conversion price, holders would convert. Count the new shares (face value ÷ conversion price) and remove the bond from debt in the EV bridge — counting both double-counts. If out of the money, keep it as debt.
  *Say it:* "If it's in the money, count the shares and take the bond out of debt. If not, it stays as debt."
- **Why does dilution create circularity when calculating an implied share price?** 🔴
  The implied share price determines which options are in the money, which changes diluted shares, which changes the implied price. Models solve this with iteration or by using the current share count as an approximation.

**Checkpoint:** Walk me through TSM. · When is a convertible counted as shares?

---

## 2.4 Can EV or equity value be negative? 🟡

**Walkthrough**
1. Equity value can't be negative: it's share price × shares, and with limited liability a share can't be worth less than zero.
2. EV *can* be negative if cash exceeds equity value + debt + other claims.
3. Practice in PEB_02 "Negative EV."

**Fill-ins**
- Market cap $150, debt $20, cash $260 → EV = **−$90**
- Market equity value can't be negative because of **limited liability**

**Deep dives**
- **What does a negative EV signal?** 🟡
  The market values the operating business at less than zero. Investors expect the company to burn through its cash, or don't trust management to return it. It shows up in struggling biotechs and companies with heavy losses.
  *Say it:* "The market thinks the business will destroy value — burn its cash — so it values operations below zero."
- **Can book equity be negative?** 🟡
  Yes. Large buybacks or accumulated losses can push shareholders' equity on the balance sheet below zero, even for healthy companies (McDonald's and Starbucks have had negative book equity from years of buybacks). That's an accounting figure, not market value.

**Checkpoint:** Can EV be negative? · Can equity value? · What about book equity?

---

## 2.5 What changes EV vs. equity value 🟡

**Walkthrough**
The test: **does the action change the core business, or just how it's financed?** Financing changes move equity value but not EV. Changes to operations move EV. Practice all nine scenarios in PEB_02.

**Fill-ins**
- Issue $100 of stock, hold the cash → equity value **up $100**, EV **unchanged**
- Issue $100 of debt, buy $100 of PP&E → EV **up $100**, equity value **unchanged**
- Pay a $50 dividend → equity value **down $50**, EV **unchanged**

**Deep dives**
- **Issue $100 of debt and hold the cash — what happens?** 🟡
  Equity unchanged. EV: debt +$100, cash +$100 → unchanged.
- **Use $100 of cash to buy another company.** 🟡
  Equity unchanged (one asset swapped for another). EV up $100: less cash, more operating business.
- **Is EV truly independent of capital structure?** 🔴
  Mostly, but not perfectly. Debt creates interest tax shields (raising value) and distress risk (lowering it). In practice, adding moderate leverage can raise EV a little; too much lowers it.
  *Say it:* "In theory EV is capital-structure neutral, but tax shields and distress costs mean leverage can shift it at the margins."
- **If a company's share price rises 10%, what happens?** 🟢
  Equity value up 10%. EV up by the same dollar amount (debt and cash unchanged), which is less than 10% in percentage terms if the company has net debt.

**Checkpoint:** Five rapid-fire "what happens to EV and equity value" scenarios.

---

# MODULE 3 — VALUATION OVERVIEW

## 3.1 The methods and when to use each 🟢

**Walkthrough**
1. **Relative valuation:** trading comps (what similar public companies trade at) and precedent transactions (what buyers paid for similar companies).
2. **Intrinsic valuation:** the DCF — value from the company's own projected cash flows.
3. **LBO analysis:** what a financial sponsor could pay and still hit its target return. Often the floor.
4. **Others:** sum-of-the-parts (conglomerates), liquidation (distressed), dividend discount model (banks).
5. Each gives a range; together they form the football field.

**Fill-ins**
- Precedent transactions usually give the highest values because they include a **control premium**
- An LBO analysis often sets the **floor** of a valuation range
- The DCF is an **intrinsic** method; comps are **relative**

**Deep dives**
- **"Walk me through how you'd value a company."** 🟢
  *Say it:* "I'd use three main methods. Trading comps — how similar public companies are valued, using multiples like EV/EBITDA. Precedent transactions — what buyers paid for similar companies. And a DCF — projecting the company's free cash flows and discounting them back. For a sponsor-relevant company, I'd add an LBO to see what a PE firm could pay. Then I'd compare the ranges on a football field."
- **Which method gives the highest value?** 🟢
  Usually precedent transactions, because buyers pay a control premium (typically 20–40%) plus sometimes synergies. The DCF can be highest or lowest — it depends entirely on assumptions. Trading comps sit in between. The LBO is usually lowest, because sponsors are constrained by target returns and debt capacity.
  *Say it:* "Generally precedents, because of the control premium. The DCF depends on assumptions so it can land anywhere. The LBO is usually the floor."
- **When would trading comps be higher than precedents?** 🔴
  When public markets are hot relative to the period when the precedent deals happened — for example, if multiples have expanded sharply since the deals closed, or the precedents were done during a downturn.
- **Pros and cons of each method?** 🟡
  Comps: market-based and current, but no perfectly comparable companies and subject to market mood. Precedents: reflect real prices paid, but data is often old or incomplete and deals have unique circumstances. DCF: based on fundamentals and independent of market mood, but extremely sensitive to assumptions, especially terminal value.
- **Why is the LBO the "floor"?** 🟡
  A financial buyer with no synergies can pay at least that much and still earn 20%+. A strategic buyer with synergies should be able to pay more. If a sale price falls below the LBO value, a sponsor would step in.
- **When do you use sum-of-the-parts?** 🟡
  When a company has distinct segments with different growth, margins, and peer multiples — e.g., a conglomerate with a software division and a manufacturing division. Value each segment separately, add them up, and adjust for corporate costs and net debt.
- **When do you use liquidation value?** 🔴
  For distressed companies where the going-concern value is in doubt. Estimate what assets would fetch in a sale (with haircuts — receivables recover more than inventory, which recovers more than specialized equipment) minus liabilities.

**Checkpoint:** Walk me through how you'd value a company. · Rank the methods. · When is the DCF most useful?

---

## 3.2 Pairing metrics with multiples 🟢

**Walkthrough**
1. The **consistency rule:** the numerator and denominator must refer to the same group of investors.
2. EV (all investors) pairs with metrics *before* interest: revenue, EBITDA, EBIT, unlevered FCF.
3. Equity value (shareholders only) pairs with metrics *after* interest: net income (P/E), EPS, levered FCF.

**Fill-ins**
- EV / **EBITDA** is valid; EV / **Net income** is not
- P/E = share price ÷ **EPS** (or equity value ÷ net income)
- For an unprofitable company, use EV / **revenue**

**Deep dives**
- **Why can't you use EV / Net income?** 🟢
  EV covers all investors, but net income is what's left *after* debt holders get paid interest. The numerator includes debt holders; the denominator excludes them.
  *Say it:* "EV belongs to all investors, but net income only belongs to shareholders, since interest is already paid. The two don't match."
- **Why is EV/EBITDA so popular?** 🟢
  It's capital-structure neutral (comparable across companies with different debt), unaffected by tax differences, and EBITDA roughly proxies operating cash flow. It's the default for most industries.
- **What are EBITDA's weaknesses?** 🟡
  It ignores CapEx (a company with huge capital needs looks better than it is), working capital, taxes, and SBC if added back. For capital-intensive businesses, EV/EBIT or EV/(EBITDA − CapEx) is more honest.
  *Say it:* "It ignores CapEx and working capital, so it flatters capital-intensive businesses. For them I'd look at EV/EBIT or EBITDA minus CapEx."
- **Why is P/E distorted by capital structure?** 🟡
  Two identical businesses with different debt levels have different interest costs, so different net income, so different P/E. EV/EBITDA strips that out.
- **Why might two companies with similar growth trade at different EV/EBITDA multiples?** 🔴
  Differences in margins, return on capital (how much reinvestment growth requires), risk/cyclicality, capital intensity, quality of management, or business model durability. Growth alone doesn't determine the multiple.
- **What's the PEG ratio?** 🔴
  P/E ÷ expected EPS growth rate. It adjusts P/E for growth so fast- and slow-growing companies can be compared. A PEG around 1.0 is often read as "fair."

**Checkpoint:** Why can't you use EV/Net income? · What are EBITDA's weaknesses? · When use EV/revenue?

---

## 3.3 The football field 🟢

**Walkthrough**
1. A horizontal bar chart: each bar shows the low–high per-share value from one method.
2. Usually includes the 52-week trading range for context.
3. Bankers use it to frame a price range for a sale, a fairness opinion, or a pitch.
4. Build it in PEB_05 "Football Field."

**Fill-ins**
- A football field shows **ranges**, not single values
- The 52-week range is a **reference point**, not a valuation method

**Deep dives**
- **Why show ranges instead of a single number?** 🟢
  Every method depends on assumptions. Showing ranges is honest about uncertainty and shows where methods overlap — the overlap is often where the negotiated price lands.
  *Say it:* "Every method has uncertainty, so ranges are more honest, and the overlap between methods shows the defensible price."
- **Why include the 52-week trading range?** 🟡
  It shows where the market has actually valued the stock. A buyer offering below the 52-week low would struggle to get shareholder approval.

**Checkpoint:** What's a football field and how is it used?

---

# MODULE 4 — COMPS & PRECEDENTS

## 4.1 Selecting comparable companies 🟢

**Walkthrough**
Screen on: industry/business model, size (revenue, market cap), growth, margins, geography, and customer type. Aim for 5–10 good comps rather than 20 loose ones.

**Fill-ins**
- A typical comps set has about **5–10** companies
- Comps are selected on business model, size, **growth**, margins, and geography

**Deep dives**
- **What if there are no good comps?** 🟡
  Widen the criteria (adjacent industries, different geographies), weight the closest comps more heavily, lean more on the DCF, or use a sum-of-the-parts with different comps for each segment.
  *Say it:* "I'd widen the screen to adjacent businesses, lean more on the DCF, and be clear about which comps are closest."
- **Why isn't "same industry" enough?** 🟡
  A 30%-growth SaaS company and a 3%-growth legacy software company are both "software" but deserve very different multiples. Business model, growth, and margins matter more than the label.
- **Should a small company be valued at the same multiple as large peers?** 🔴
  Often not. Smaller companies usually carry a discount for less liquidity, customer concentration, and higher risk.

**Checkpoint:** How do you choose comps? · What if there aren't any?

---

## 4.2 Calculating and applying multiples 🟢

**Walkthrough**
1. Gather share price, diluted shares, debt, cash, and financials for each comp.
2. Calculate equity value and EV for each.
3. Calculate LTM and forward (NTM) multiples.
4. Summarize: max, 75th percentile, median, 25th percentile, min.
5. Apply the 25th–75th percentile range to the target's metric → implied EV → bridge to equity value → per share.
6. Practice in PEB_05 "Trading Comps."

**Fill-ins**
- Bankers typically use the **median** rather than the mean
- LTM = last fiscal year + current YTD − **prior-year YTD**
- After applying an EV multiple, you bridge to **equity value** to get a share price

**Deep dives**
- **Why the median over the mean?** 🟢
  One outlier (a company trading at 40x on a takeover rumor) can drag the mean far from the typical multiple. The median ignores the extremes.
- **How do you calculate LTM?** 🟡
  Take the most recent full fiscal year, add the current year-to-date, and subtract the same year-to-date period from last year. LTM revenue through Q2 2026 = FY2025 + H1 2026 − H1 2025.
- **What's calendarization?** 🔴
  If one comp's fiscal year ends in June and the rest in December, you convert its numbers to a December year-end by weighting the overlapping periods. Otherwise you'd be comparing different time periods.
- **What adjustments do you make to comps' financials?** 🟡
  Remove non-recurring items — restructuring charges, litigation settlements, asset-sale gains, impairments — so multiples reflect ongoing earnings.
  *Say it:* "I normalize for one-time items so the multiples reflect recurring earnings."
- **LTM or forward multiples?** 🟡
  Forward multiples are better for growth companies, since LTM understates where they're heading, and markets price on the future. LTM is based on actual results and better for stable businesses or when forecasts are unreliable. Use both and be consistent.

**Checkpoint:** Walk me through building a comps table. · Why median? · How do you calculate LTM?

---

## 4.3 Precedent transactions 🟢

**Walkthrough**
1. Find past acquisitions of similar companies (industry, size, recency — typically last 3–5 years).
2. Calculate transaction EV ÷ the target's LTM revenue and EBITDA at announcement.
3. Summarize and apply like comps.
4. Practice in PEB_05 "Precedents."

**Fill-ins**
- Precedent multiples are usually based on **LTM** metrics at announcement
- A typical control premium is about **20–40%**

**Deep dives**
- **Why do precedents usually show higher multiples?** 🟢
  Buyers pay a control premium to take control of the company's cash flows and strategy. Strategic buyers may also pay for synergies.
  *Say it:* "Acquirers pay for control — and sometimes synergies — so deal multiples run above trading multiples."
- **Strategic vs. financial buyers — who pays more?** 🟡
  Strategic buyers usually, because they can realize synergies (cost cuts, cross-selling) and have a lower cost of capital. Financial buyers are limited by return targets, though in strong credit markets sponsors can compete aggressively.
- **Why are old deals less useful?** 🟡
  Interest rates, credit availability, and market multiples change. A deal from a zero-rate era can overstate what a buyer would pay today.
- **What's a premiums-paid analysis?** 🔴
  For public targets, look at the premium buyers paid over the pre-announcement share price in comparable deals, then apply that range to the target's current price.

**Checkpoint:** Why are precedents higher than comps? · Strategic vs. financial buyers?

---

## 4.4 Comps gotchas 🔴

**Deep dives**
- **What if a comp has negative EBITDA?** 🟡
  The EV/EBITDA multiple is meaningless (negative). Mark it "NM" (not meaningful) and exclude it from that column, or use EV/revenue.
- **What if one multiple is an outlier?** 🟡
  Investigate why — a pending acquisition, a one-time earnings hit, a data error. Exclude it if it's not representative, and say so.
- **Why might multiples compress even if a company's earnings grow?** 🔴
  Rising interest rates increase discount rates, so investors pay less per dollar of earnings. Sector sentiment and growth slowdowns also compress multiples.
- **Can you use a comp from a different country?** 🔴
  Yes, but adjust for accounting differences (leases under IFRS — see 1.7), tax rates, and country risk. Market multiples also differ by region.

**Checkpoint:** What do you do with a negative-EBITDA comp? · What drives multiple compression?

---

# MODULE 5 — COST OF CAPITAL

## 5.1 WACC intuition 🟢

**Walkthrough**
1. WACC = the blended required return of everyone who funds the company.
2. WACC = (E/V) × Re + (D/V) × Rd × (1 − t) + (P/V) × Rp.
3. It's the discount rate for *unlevered* FCF, because UFCF is available to all investors.
4. Weights use market values and ideally the company's target capital structure.

**Fill-ins**
- Cost of debt is multiplied by (1 − **tax rate**)
- WACC is used to discount **unlevered** free cash flow
- WACC weights should use **market** values, not book values

**Deep dives**
- **Why is cost of debt after-tax but cost of equity isn't?** 🟢
  Interest is tax-deductible, so the government effectively subsidizes part of it. Dividends to shareholders aren't deductible.
  *Say it:* "Interest is tax-deductible, so debt's true cost is lower after tax. Dividends aren't deductible, so equity gets no adjustment."
- **Why market values instead of book?** 🟡
  WACC is the return investors require today on what their capital is worth today. Book equity reflects historical accounting and can even be negative.
- **Current or target capital structure?** 🟡
  Target, because the DCF projects the long-term future. A company that's temporarily over-levered after an acquisition will likely delever.
- **Why does WACC match UFCF but cost of equity match levered FCF?** 🟢
  Match cash flows to the investors who receive them. UFCF goes to all investors → WACC. Levered FCF (after interest and debt payments) goes only to equity → cost of equity.
- **What's the WACC of a company with no debt?** 🟢
  It equals the cost of equity.

**Checkpoint:** Walk me through WACC. · Why after-tax cost of debt? · Why market weights?

---

## 5.2 CAPM and beta 🟢

*Fully built as the sample lesson: `lesson-5-2-capm-beta.json`. Its deep dives are listed here so this file is complete.*

**Fill-ins**
- Re = Rf + β × **ERP**
- β = Cov(stock, market) ÷ **Var(market)**
- A beta of 1.0 means the stock moves **with** the market

**Deep dives** (full text in the JSON)
- Why CAPM only rewards systematic risk 🟡
- **Can beta be negative?** 🔴 — yes; CAPM then gives Re below Rf; don't use it for an operating company in a DCF
- Beta of cash (0) and of the market (1.0) 🟡
- Beta vs. volatility — not the same 🔴
- Raw vs. adjusted (Blume) beta: 0.67 × raw + 0.33 🔴
- Which risk-free rate to use (match currency and duration) 🟡
- **Additional deep dive to add — Where does the equity risk premium come from?** 🟡
  Two approaches: historical (average past excess return of stocks over bonds, typically 4–6% depending on period and method) or implied (backed out of current market prices and expected cash flows). Practitioners often use a published source such as Kroll or Damodaran. There's no single "right" number — be consistent.
  *Say it:* "Either the historical average return of stocks over bonds or an implied premium from current prices — usually somewhere around 4 to 6 percent."
- **Additional deep dive to add — What kinds of stocks have betas above 1?** 🟢
  Cyclical, levered, or growth-heavy businesses: tech, airlines, luxury goods, homebuilders. Betas below 1: utilities, consumer staples, healthcare.

---

## 5.3 Levered vs. unlevered beta 🟢

**Walkthrough**
1. Observed (levered) beta includes two risks: business risk and financial risk from debt.
2. To compare companies or value a private one: unlever each comp's beta → take the median → relever at the target's capital structure.
3. Hamada: βU = βL ÷ [1 + (1 − t) × D/E]; βL = βU × [1 + (1 − t) × D/E].
4. Practice in PEB_03 "Bottom-Up Beta."

**Fill-ins**
- Levered beta 1.30, D/E 50%, tax 20% → unlevered beta = **0.93** (1.30 ÷ 1.40)
- Adding debt **increases** levered beta
- For a company with no debt, levered beta **equals** unlevered beta

**Deep dives**
- **Why unlever and relever?** 🟢
  Each comp's beta reflects its own debt level. Stripping out leverage isolates pure business risk, which is comparable across companies. Then you add back the target's own leverage.
  *Say it:* "Comps have different debt levels, so I strip leverage out to get pure business risk, take the median, and relever at the target's capital structure."
- **How do you get a beta for a private company?** 🟢
  It has no trading history, so you can't regress. Use the bottom-up method above from public comps.
- **Why is levered beta higher than unlevered?** 🟢
  Debt holders are paid first, so equity holders absorb more of the swings in business value. More debt → more volatile equity returns → higher beta.
- **What does Hamada assume?** 🔴
  That debt has a beta of zero (debt holders bear no market risk) and a constant debt level. For highly levered companies, debt carries real risk, so Hamada overstates levered beta. Some practitioners use a version that includes debt beta.
- **What if a company has more cash than debt?** 🔴
  Hamada uses gross debt, so it ignores the cash. But cash has zero beta, which drags observed beta down. A cash-rich company's operating business is riskier than its observed beta suggests. Some analysts adjust for this using net debt or a cash-adjusted beta.

**Checkpoint:** Why do we unlever beta? · Walk me through a bottom-up beta. · Why does debt raise beta?

---

## 5.4 Cost of debt and capital structure 🟡

**Walkthrough**
1. Cost of debt = yield to maturity on the company's existing debt (what the market demands today) — not the coupon.
2. If no traded debt: use the credit rating's typical spread over the risk-free rate (a synthetic rating from interest coverage).
3. Multiply by (1 − t) for the after-tax cost.

**Fill-ins**
- Cost of debt should use the **yield to maturity**, not the coupon rate
- Cost of debt is **lower** than cost of equity
- Pre-tax cost of debt 8%, tax 25% → after-tax **6%**

**Deep dives**
- **Why is debt cheaper than equity?** 🟢
  Debt holders get paid first (contractual interest, priority in bankruptcy), so they bear less risk and accept a lower return. Interest is also tax-deductible.
  *Say it:* "Debt is senior and contractual, so it's less risky, and interest is tax-deductible."
- **Why YTM and not the coupon?** 🟡
  The coupon was set when the bond was issued. YTM reflects what investors require today, which is what a new investor would demand.
- **If debt is cheaper, should a company use as much as possible?** 🟢
  No. WACC follows a U-shape. Adding some debt lowers WACC (cheap, tax-deductible capital). But as debt rises, bankruptcy risk rises, so both the cost of equity and cost of debt rise. Past a point, WACC increases.
  *Say it:* "Up to a point. More debt raises the risk for everyone, so the cost of debt and equity both rise, and eventually WACC goes back up."
- **What if the company has no taxable income?** 🔴
  It can't use the interest tax shield, so the after-tax cost of debt equals the pre-tax cost. Using (1 − t) would understate WACC.
- **Can cost of debt ever exceed cost of equity?** 🔴
  Not logically. Equity is junior and riskier, so it must require at least as much return. If your numbers show otherwise (e.g., distressed debt yields vs. a low beta), the beta is likely wrong.
- **What's Modigliani-Miller?** 🔴
  In a world with no taxes, bankruptcy costs, or frictions, a company's value doesn't depend on its capital structure. Real-world value differences come from the things MM assumes away — mainly the tax shield (adds value) and distress costs (subtracts).

**Checkpoint:** How do you find cost of debt? · Why not use unlimited debt?

---

## 5.5 Country risk and emerging markets 🔴

**Walkthrough**
1. Investing in emerging markets carries extra risk: currency, political, sovereign default.
2. Add a country risk premium (CRP) to cost of equity.
3. Match the currency of the cash flows and the discount rate.

**Fill-ins**
- A common CRP estimate uses the country's sovereign bond **spread** over US Treasuries
- USD cash flows should be discounted with a **USD** discount rate

**Deep dives**
- **How do you estimate a country risk premium?** 🔴
  Simplest: the spread of the country's USD-denominated government bonds over US Treasuries. A refinement scales that spread by how much more volatile the country's stock market is than its bond market. Damodaran publishes country risk premiums annually.
  *Say it:* "Start with the country's sovereign bond spread over Treasuries, sometimes scaled for equity market volatility, and add it to the cost of equity."
- **Where does the CRP go in CAPM?** 🔴
  Usually added to the cost of equity: Re = Rf + β × ERP + CRP. Some apply it via beta (exposure-weighted), reflecting that a company exporting most of its output is less exposed to local risk.
- **Should a company's country risk depend on where it's headquartered or where it sells?** 🔴
  Where it operates and earns. A Singapore-listed company with most revenue in Indonesia carries Indonesian risk.
- **Why does currency matching matter?** 🔴
  Local-currency cash flows include local inflation expectations; so must the discount rate. Discount Indonesian rupiah cash flows at a rupiah-based rate (or convert cash flows to USD using forward rates and use a USD rate). Mixing them misstates value.
- **What if the local government bond market is thin or unreliable?** 🔴
  Build the local risk-free rate synthetically: the US Treasury yield plus the expected inflation differential between the two countries.

**Checkpoint:** How would you adjust WACC for an emerging-market company?

---

# MODULE 6 — DCF

## 6.1 DCF walkthrough 🟢

**Walkthrough**
1. Project unlevered free cash flow for 5–10 years.
2. Calculate the discount rate (WACC).
3. Calculate terminal value (perpetuity growth or exit multiple).
4. Discount the projected cash flows and the terminal value to today.
5. Sum = implied enterprise value. Bridge to equity value; divide by diluted shares for a per-share value.

**Fill-ins**
- A DCF discounts unlevered FCF at **WACC** to get **enterprise value**
- Projection periods are typically **5–10** years

**Deep dives**
- **"Walk me through a DCF."** 🟢
  *Say it:* "A DCF values a company based on the present value of its future cash flows. First, project unlevered free cash flow — EBIT less taxes, plus D&A, less CapEx and the change in working capital — for five to ten years. Then calculate a discount rate, usually WACC. Then calculate terminal value, either with a perpetuity growth rate or an exit multiple. Discount the cash flows and terminal value back to today and add them up to get enterprise value. Then subtract net debt to get equity value and divide by diluted shares for the implied share price."
- **Why project 5–10 years?** 🟡
  Long enough for the company to reach a steady state (stable growth and margins), short enough that projections stay credible. A high-growth company needs a longer period, or its terminal value starts while it's still growing unsustainably.
- **When is a DCF most and least useful?** 🟡
  Most: stable, predictable cash flows (consumer staples, mature industrials). Least: early-stage companies with negative cash flow, highly cyclical businesses, and banks (debt is their raw material — see 10.1).

**Checkpoint:** Walk me through a DCF in under 90 seconds.

---

## 6.2 Building unlevered free cash flow 🟢

**Walkthrough**
UFCF = EBIT × (1 − t) + D&A − CapEx − increase in NWC. Build it in PEB_04 "DCF."

**Fill-ins**
- UFCF starts from **EBIT** (before interest)
- EBIT × (1 − tax rate) is called **NOPAT**
- An increase in net working capital **reduces** free cash flow

**Deep dives**
- **Why start from EBIT and not net income?** 🟢
  UFCF is the cash available to *all* investors, before any payments to lenders. Net income is already after interest, so it belongs only to equity.
  *Say it:* "Unlevered cash flow is before debt payments, so we exclude interest by starting from EBIT."
- **Why tax EBIT rather than use actual taxes?** 🟡
  Actual taxes are reduced by the interest tax shield. In an unlevered DCF, the tax shield is captured in WACC (the after-tax cost of debt). Using actual taxes would count it twice.
- **Unlevered vs. levered FCF?** 🟢
  Unlevered: before interest and debt repayments, available to all investors, discounted at WACC → EV. Levered: after interest and mandatory debt repayments, available to shareholders, discounted at cost of equity → equity value.
- **Should you add back stock-based comp?** 🔴
  Genuinely debated. Adding it back (treating it as non-cash) inflates FCF unless you also account for the future dilution. Conservative practice treats SBC as a cash cost, since the company would otherwise pay it in cash. Know both sides.
  *Say it:* "It's debated. It's non-cash, but it's a real cost through dilution, so the conservative approach treats it as a cash expense."
- **How do you treat one-time items?** 🟡
  Exclude non-recurring items (restructuring, litigation) from projected cash flows, since the DCF should reflect ongoing operations.

**Checkpoint:** Build UFCF from revenue. · UFCF vs. levered FCF?

---

## 6.3 Discounting and the mid-year convention 🟡

**Walkthrough**
1. Discount factor = 1 ÷ (1 + WACC)^t.
2. End-of-year convention assumes each year's cash arrives on Dec 31.
3. Mid-year convention assumes cash arrives evenly through the year, so discount periods are 0.5, 1.5, 2.5…
4. Toggle it on and off in PEB_04.

**Fill-ins**
- With the mid-year convention, year 1 cash flow is discounted **0.5** years
- The mid-year convention **increases** valuation

**Deep dives**
- **Why use the mid-year convention?** 🟡
  Businesses earn cash throughout the year, not in one lump at year-end. Mid-year is more realistic and gives a slightly higher value.
- **How does the mid-year convention affect terminal value?** 🔴
  For perpetuity growth TV (built from cash flows), use the mid-year discount period (e.g., 4.5 for a 5-year model). For exit-multiple TV (an assumed sale at year-end), discount the full 5 years.
  *Say it:* "Perpetuity growth TV uses the mid-year period because it's built from cash flows; exit-multiple TV assumes a sale at year-end, so it uses the full period."
- **What's a stub period?** 🔴
  If the valuation date is mid-year (say, Sept 30), the first projected period is only a partial year. You include only the remaining cash flow for that stub and adjust all later discount periods accordingly.

**Checkpoint:** What does the mid-year convention do and why?

---

## 6.4 Terminal value 🟢

**Walkthrough**
1. Perpetuity growth (Gordon Growth): TV = final-year UFCF × (1 + g) ÷ (WACC − g).
2. Exit multiple: TV = final-year EBITDA × multiple from comps.
3. Discount TV back to today.
4. Cross-check: the perpetuity method implies an exit multiple; the exit method implies a growth rate.

**Fill-ins**
- Terminal growth should stay below long-run **nominal GDP** growth
- TV is often **60–80%** of a DCF's enterprise value
- Final-year UFCF $100, WACC 10%, g 2% → TV = **$1,275**

**Deep dives**
- **Which TV method is better?** 🟡
  Perpetuity growth is more theoretically consistent (intrinsic), but small changes in g swing the value a lot. Exit multiple is grounded in market data that bankers can defend, but it makes the "intrinsic" DCF partly a relative valuation. Bankers often use exit multiple; academics prefer perpetuity growth. Best practice: use one and cross-check with the other.
  *Say it:* "Exit multiple is easier to defend with market data; perpetuity growth is more theoretically pure. I'd use one and check the implied figure from the other."
- **How do you cross-check them?** 🟡
  From perpetuity TV, divide by final-year EBITDA → implied exit multiple; does it look reasonable vs. comps? From exit-multiple TV, solve for g → implied growth; is it below GDP growth? Practice in PEB_04 "Cross-checks."
- **What does it mean if TV is 90%+ of value?** 🟡
  The valuation rests almost entirely on assumptions about the distant future. Usually this means the projection period is too short (the company is still growing fast in the final year), or the business genuinely produces little cash today.
- **Why is TV so large in the first place?** 🟢
  It captures every year after the projection period — potentially decades of cash flow — while the projection captures only 5–10.
- **Can terminal growth be negative?** 🔴
  Yes, for a business in permanent decline (legacy print media, coal). The formula still works as long as WACC − g is positive.
- **What should the final projection year look like?** 🔴
  A steady state: growth near the terminal rate, stable margins, and CapEx roughly in line with (or slightly above) D&A. If CapEx is far below D&A in the final year, the TV assumes the company can grow without reinvesting, which overstates value.
  *Say it:* "A normalized year — stable growth and margins, with CapEx at or slightly above D&A so growth is actually funded."

**Checkpoint:** Two TV methods? · Which do you prefer? · How do you sanity-check TV?

---

## 6.5 Sensitivities and "what if" questions 🟡

**Walkthrough**
1. Build tables that vary two key inputs: WACC vs. terminal growth, WACC vs. exit multiple, revenue growth vs. margin.
2. The range matters more than any single point estimate.
3. Build them in PEB_04 "Sensitivity."

**Fill-ins**
- If WACC increases, DCF value **decreases**
- If terminal growth increases, DCF value **increases**

**Deep dives**
- **Which has a bigger impact: +1% WACC or +1% terminal growth?** 🟡
  Usually WACC. It affects every discount factor *and* the TV denominator. g only affects the TV. (They're roughly symmetric in the TV denominator, but WACC also discounts every projected year.)
  *Say it:* "WACC, because it hits every discount factor as well as terminal value, while growth only changes terminal value."
- **D&A increases by $10 in every year. What happens to the DCF?** 🔴
  UFCF rises by the tax shield ($10 × t) each year, since D&A reduces taxable EBIT but is added back. With perpetuity growth TV, value rises further (higher final UFCF). With exit-multiple TV on EBITDA, the TV is unchanged (EBITDA isn't affected). In reality, higher D&A usually comes from higher CapEx, which would lower value.
- **CapEx increases by $10 a year.** 🟡
  UFCF falls by $10 a year; value falls. If the CapEx funds growth, revenue projections should rise too — always ask whether assumptions are consistent.
- **The tax rate rises.** 🟡
  NOPAT and UFCF fall. The after-tax cost of debt also falls (a larger tax shield), lowering WACC slightly. Net effect: usually value falls.
- **Why present sensitivity tables at all?** 🟢
  The DCF is only as good as its assumptions. Showing a range across plausible inputs is more honest and shows which assumptions drive value.

**Checkpoint:** What happens to the DCF if WACC rises 1%? · If CapEx rises $10?

---

## 6.6 Levered DCF 🟡

**Walkthrough**
1. Levered FCF = net income + D&A − CapEx − increase in NWC − mandatory debt repayment + new borrowing.
2. Discount at cost of equity.
3. Result = equity value directly (no bridge needed).

**Fill-ins**
- A levered DCF discounts at the **cost of equity**
- A levered DCF produces **equity value** directly

**Deep dives**
- **Why are levered DCFs rarely used?** 🟡
  You have to project every debt issuance and repayment, and changing leverage changes the cost of equity each year. It's more complex and assumption-heavy than the unlevered version.
- **When would you use one?** 🟡
  For financial institutions (where debt is operational and EV doesn't apply), or when the capital structure is fixed and known, as in an LBO.
- **Should levered and unlevered DCFs give the same equity value?** 🔴
  In theory, yes, if all assumptions are consistent. In practice they differ, because keeping leverage and discount rates consistent across years is hard.

**Checkpoint:** When would you use a levered DCF?

---

## 6.7 DCF gotchas 🔴

**Deep dives**
- **How do you value a company with negative cash flow?** 🟡
  Extend the projection period until the company reaches positive, stable cash flow, then apply TV. Accept that most of the value will be in TV and the result is highly uncertain. Cross-check with EV/revenue comps.
- **Can you use a DCF for a bank?** 🟡
  Not a standard one. For banks, interest and debt are core operations, so "unlevered FCF" isn't meaningful. Use a dividend discount model or P/BV instead (see 10.1).
- **Your DCF gives a share price 3x the current price. What do you check?** 🟡
  (1) Terminal value assumptions (growth too high? exit multiple above comps?); (2) projections far more aggressive than history or consensus; (3) WACC too low; (4) mistakes like double-counting cash or using EBITDA where you meant UFCF; (5) whether the final year is normalized.
  *Say it:* "Terminal value first, then whether projections are realistic versus history, then WACC, then mechanical errors like double-counting."
- **Should a DCF include synergies?** 🔴
  For valuing a company on a standalone basis, no. For an acquirer deciding its maximum price, it can run a separate synergies case — but paying for synergies hands that value to the seller.
- **Should cash be in the DCF projections?** 🔴
  No. Interest income on cash isn't part of UFCF, and the cash is added back in the EV → equity bridge. Including both double-counts.
- **How does growth relate to reinvestment?** 🔴
  Sustainable growth ≈ reinvestment rate × return on invested capital. A company can't grow 10% forever while reinvesting nothing. If terminal growth is high but final-year CapEx and working capital investment are low, the TV is inconsistent.

**Checkpoint:** DCF gives 3x the market price — what do you check? · Can you DCF a bank?

---

# MODULE 7 — M&A & MERGER MODELS

## 7.1 Why companies acquire 🟢

**Walkthrough**
1. Buy growth faster than building it.
2. Synergies: cost (cutting overlapping functions, purchasing power) and revenue (cross-selling, new markets).
3. Acquire technology, talent, or IP.
4. Gain market share or remove a competitor.
5. Diversify or enter new geographies.

**Fill-ins**
- **Cost** synergies are more reliable than **revenue** synergies

**Deep dives**
- **Why would a company acquire instead of build?** 🟢
  Speed, certainty (the target already works), access to customers or IP that would take years to build, and sometimes it's cheaper than organic investment.
  *Say it:* "Speed and certainty — the target already has the product, customers, or capabilities, which could take years to build internally."
- **Why are cost synergies valued more than revenue synergies?** 🟡
  Cost synergies are within management's control (closing a duplicate office, merging systems). Revenue synergies depend on customers' behavior and frequently fail to materialize. Bankers and investors often discount or exclude revenue synergies.
- **Why do many acquisitions destroy value?** 🟡
  Overpaying (the winner's curse in competitive auctions), overestimated synergies, integration problems, and culture clashes.
- **What's the difference between a strategic and a financial buyer?** 🟢
  A strategic buyer is an operating company buying to grow or combine its business. A financial buyer (PE firm) buys to generate a return over a holding period, typically using leverage, and plans to exit.

**Checkpoint:** Why would a company acquire another? · Why are revenue synergies discounted?

---

## 7.2 Accretion / dilution 🟢

**Walkthrough**
1. Determine purchase price (offer price × target shares).
2. Decide financing mix: cash, new debt, new stock.
3. Calculate pro forma net income: acquirer NI + target NI − after-tax foregone interest on cash − after-tax interest on new debt − after-tax extra D&A from write-ups + after-tax synergies.
4. Calculate pro forma shares: acquirer shares + new shares issued.
5. Pro forma EPS vs. standalone EPS → accretive or dilutive.
6. Build it in PEB_06.

**Fill-ins**
- A deal is accretive if pro forma EPS is **higher** than the acquirer's standalone EPS
- The cost of using cash is the after-tax **interest income** it would have earned
- The cost of issuing stock ≈ the acquirer's **earnings yield** (1 ÷ P/E)

**Deep dives**
- **"Walk me through a merger model."** 🟢
  *Say it:* "Start with the purchase price and how it's financed — cash, debt, or stock. Combine the two companies' net income, subtract the after-tax foregone interest on cash used and the after-tax interest on new debt, subtract any new D&A from asset write-ups, and add after-tax synergies. Divide by the new share count — the acquirer's shares plus any new shares issued. Compare that pro forma EPS to the acquirer's standalone EPS to see if the deal is accretive or dilutive."
- **What's the shortcut for accretion/dilution?** 🟡
  Compare the weighted after-tax cost of financing to the target's earnings yield at the purchase price (target NI ÷ purchase equity value). If what you're buying yields more than what you're paying for the money, the deal is accretive.
  *Say it:* "If the target's earnings yield at the purchase price is higher than the weighted cost of the cash, debt, and stock used, it's accretive."
- **In an all-stock deal, when is it accretive?** 🟡
  When the acquirer's P/E is higher than the P/E paid for the target. A high-P/E acquirer's stock is "expensive currency," so it gets more earnings per share issued.
- **Which financing is usually cheapest?** 🟡
  Cash (after-tax interest income is low), then debt (after-tax interest), then stock (earnings yield is typically higher). This flips if the acquirer has a very high P/E or interest rates are high.
- **Does accretive mean it's a good deal?** 🟢
  No. EPS accretion is a short-term accounting measure. A deal can be accretive because it's financed with cheap debt while destroying value — for example, overpaying for a low-growth business. The real test is whether the return on the investment exceeds the cost of capital.
  *Say it:* "No — accretion just compares financing cost to earnings yield. A deal can be accretive and still overpay. The real question is whether it earns more than the cost of capital."
- **Why use EPS as the metric?** 🔴
  Public company shareholders and boards focus on it, and it's easy to communicate. Its weakness is that it ignores risk, the time value of money, and balance sheet strength.

**Checkpoint:** Walk me through a merger model. · All-stock deal: when is it accretive? · Is accretion good?

---

## 7.3 Purchase price allocation 🟡

**Walkthrough**
1. The target's existing book value of equity is replaced.
2. Assets are written up to fair value (e.g., PP&E, identifiable intangibles).
3. In a stock deal, the write-up creates a deferred tax liability.
4. Goodwill = purchase price − book value − write-ups + new DTL. It's the plug.
5. Practice in PEB_06 "Purchase price allocation."

**Fill-ins**
- Goodwill is the **plug** in purchase price allocation
- Asset write-ups in a stock deal create a deferred tax **liability**
- The target's existing goodwill is **written off** and replaced

**Deep dives**
- **Why does an asset write-up create a DTL?** 🔴
  In a stock deal, the book value of assets rises (higher future book D&A) but the tax basis doesn't change (no extra tax D&A). So future book taxes are lower than cash taxes. That gap is a DTL = write-up × tax rate.
  *Say it:* "Book basis steps up but tax basis doesn't, so book taxes will be lower than cash taxes. That difference is recorded as a DTL."
- **Stock deal vs. asset deal?** 🔴
  In a stock deal, the buyer acquires the company's shares; the tax basis carries over; buyers inherit all liabilities. In an asset deal, the buyer acquires specific assets; the tax basis steps up to the price paid (more tax-deductible D&A); the buyer can leave liabilities behind. Buyers prefer asset deals; sellers (especially C-corps, facing double taxation) usually prefer stock deals.
- **What's a 338(h)(10) election?** 🔴
  A hybrid: legally a stock deal, but treated as an asset deal for tax, giving the buyer a stepped-up basis. Only available for certain targets (subsidiaries of corporations, S-corps). Know that it exists.
- **Where do transaction fees go?** 🔴
  M&A advisory and legal fees are expensed (reduce the buyer's equity). Debt financing fees are capitalized and amortized over the life of the debt.

**Checkpoint:** How do you calculate goodwill? · Why is a DTL created?

---

## 7.4 Synergies and breakeven 🟡

**Walkthrough**
1. Breakeven synergies: the pre-tax synergies needed to make pro forma EPS equal standalone EPS.
2. Calculate it in PEB_06.

**Fill-ins**
- Breakeven synergies make the deal **neither accretive nor dilutive**

**Deep dives**
- **How do you calculate breakeven synergies?** 🟡
  Required pro forma net income = standalone EPS × pro forma shares. The shortfall vs. pro forma NI (excluding synergies) is the after-tax synergy needed. Divide by (1 − t) to get pre-tax.
- **Are synergies realized immediately?** 🟡
  No. They phase in over 2–3 years, and achieving them usually requires one-time integration costs (severance, systems). Year-one accretion often looks worse than steady state.
- **If breakeven synergies are small, is the deal safe?** 🔴
  Safer on EPS, but still not proof of value creation. Compare the total synergies needed to justify the premium paid: the capitalized value of synergies should exceed the premium.

**Checkpoint:** What are breakeven synergies? · Why do synergies take time?

---

## 7.5 M&A gotchas 🔴

**Deep dives**
- **Fixed vs. floating exchange ratio?** 🔴
  Fixed: the target gets a set number of acquirer shares per target share; the deal *value* moves with the acquirer's stock price. Floating: the target gets a set dollar value; the number of shares issued adjusts. Collars cap how far either can move.
  *Say it:* "Fixed ratio locks the share count but the value moves; floating locks the value but the share count moves. Collars limit both."
- **Why does an acquirer's stock often fall when a deal is announced?** 🟡
  The market worries the acquirer is overpaying, synergies are overstated, or the deal is dilutive. The target's stock usually rises toward the offer price.
- **What's a contribution analysis?** 🔴
  Compares what each company contributes (revenue, EBITDA, net income) with its share of pro forma ownership. Used to check fairness, especially in mergers of equals.
- **What's an earnout?** 🔴
  Part of the price is paid later only if the target hits performance targets. It bridges valuation gaps when buyer and seller disagree on future performance.
- **What's pro forma ownership?** 🟡
  In a stock deal, target shareholders end up owning new shares ÷ total pro forma shares of the combined company.

**Checkpoint:** Fixed vs. floating exchange ratio? · Why might an acquirer's stock fall on announcement?

---

# MODULE 8 — LBO

## 8.1 LBO intuition 🟢

**Walkthrough**
1. A PE firm buys a company using a large amount of debt (often 50–70% of the price) and its own equity.
2. The company's cash flow pays interest and pays down the debt over the holding period (3–7 years).
3. The firm sells (exits) the company. Equity value at exit = exit EV − remaining net debt.
4. Because the sponsor put in relatively little equity, gains on the total enterprise translate into larger percentage returns on equity.
5. Sponsors typically target 20%+ IRR and 2.0–3.0x MOIC.

**Fill-ins**
- Leverage increases returns because the sponsor contributes **less equity**
- Typical PE target IRR: **20–25%**
- Equity at exit = exit EV − **net debt**

**Deep dives**
- **"Walk me through an LBO."** 🟢
  *Say it:* "A PE firm buys a company using a mix of debt and equity. First, set the purchase price and build sources and uses — how much debt and how much sponsor equity. Then project the company's financials over five years or so, using free cash flow to pay down debt. At exit, assume a sale at an EBITDA multiple, subtract remaining net debt to get the sponsor's equity, and calculate IRR and MOIC."
- **Why does leverage boost returns?** 🟢
  Example: buy a company for $100 and sell it for $150. With all equity, the return is 1.5x. With $60 of debt and $40 of equity (debt unchanged at exit), equity at exit is $90 — 2.25x on $40. The debt doesn't share in the upside.
  *Say it:* "Debt has a fixed claim, so all the gain in value goes to equity, and a smaller equity check gets a bigger percentage return."
- **What's the downside of leverage?** 🟢
  It magnifies losses too, adds fixed interest costs, and can lead to covenant breaches or bankruptcy if performance dips.
- **Why is an LBO like buying a house with a mortgage?** 🟢
  You put down 20%, borrow 80%, pay down the mortgage from rental income, and sell later. Even modest appreciation produces a large return on your down payment.

**Checkpoint:** Walk me through an LBO. · Why does leverage increase returns?

---

## 8.2 Sources & uses 🟢

**Walkthrough**
1. **Uses:** purchase price of equity, refinancing existing debt, transaction fees, financing fees, any cash to the balance sheet.
2. **Sources:** new debt tranches (sized as multiples of EBITDA), sponsor equity, management rollover, sometimes existing cash.
3. Sources must equal uses. Sponsor equity is usually the plug.
4. Build it in PEB_07.

**Fill-ins**
- Sources must **equal** uses
- Sponsor equity is usually the **plug**
- Debt is typically sized as a multiple of **EBITDA**

**Deep dives**
- **What does "cash-free, debt-free" mean?** 🟡
  The buyer pays for the business on an EV basis. The seller keeps the cash and repays the debt from the proceeds. It simplifies negotiation to one number: enterprise value.
- **How are fees treated?** 🔴
  M&A advisory fees are expensed (in the model, they reduce equity value created — "leakage"). Financing fees are capitalized and amortized over the debt term.
- **What's management rollover?** 🟡
  Existing management reinvests part of their proceeds in the new deal instead of cashing out. It aligns incentives and reduces the sponsor's equity check. Sponsors also set aside an option pool (often 5–10%) for management.
- **Why might a sponsor leave a minimum cash balance?** 🔴
  The company needs operating cash. So not all cash can go toward the purchase price or debt paydown.

**Checkpoint:** Build sources & uses for a $1,000 EV deal at 5x leverage on $100 EBITDA.

---

## 8.3 The debt stack 🟡

**Walkthrough**
From most to least senior:
1. **Revolver:** a credit line for liquidity; usually undrawn at close; floating rate; commitment fee on undrawn amount.
2. **Term Loan A:** amortizes significantly; held by banks; lower rate.
3. **Term Loan B:** minimal amortization (~1%/year); held by institutional investors; floating rate; prepayable.
4. **Senior notes / high-yield bonds:** fixed rate; no amortization (bullet maturity); call protection.
5. **Subordinated / mezzanine debt:** higher rate, often with PIK interest or equity warrants.
6. **Equity.**

**Fill-ins**
- Term Loan B typically amortizes about **1%** per year
- PIK interest accrues to the **principal** instead of being paid in cash
- Higher in the capital structure = **lower** risk and **lower** interest rate

**Deep dives**
- **Maintenance vs. incurrence covenants?** 🟡
  Maintenance covenants must be met every quarter (e.g., debt/EBITDA below 5.0x) — typical for bank loans. Incurrence covenants only apply when the company takes an action, like issuing more debt or paying a dividend — typical for bonds. "Covenant-lite" loans have only incurrence covenants.
  *Say it:* "Maintenance covenants are tested every quarter; incurrence covenants only kick in when the company does something, like borrowing more."
- **Why use PIK debt?** 🟡
  Interest accrues instead of being paid in cash, preserving cash flow for operations or paying down senior debt. The cost: the balance grows, the rate is higher, and it's riskier for the company at exit.
- **What's call protection?** 🔴
  Restrictions on repaying debt early. Bonds often have a non-call period, then call premiums that step down (e.g., 104% → 102% → 100% of par). Loans may have "soft call" protection (101% for 6–12 months). It protects lenders' expected returns.
- **Why does subordinated debt pay more?** 🟢
  It's repaid after senior debt in a bankruptcy, so it carries more risk of loss.
- **Floating vs. fixed rates?** 🟡
  Loans (revolver, TLA, TLB) are usually floating (SOFR + spread), so rising rates increase interest costs. Bonds are usually fixed.

**Checkpoint:** Name the debt tranches from senior to junior. · What's PIK? · Maintenance vs. incurrence covenants?

---

## 8.4 Returns: IRR, MOIC, and the drivers 🟢

**Walkthrough**
1. Three drivers of LBO returns: **EBITDA growth**, **multiple expansion**, and **debt paydown** (deleveraging).
2. Returns attribution splits the equity gain among these.
3. Practice in PEB_07 "Returns attribution."

**Fill-ins**
- For the same MOIC, a longer holding period **lowers** IRR
- The three return drivers: EBITDA growth, multiple expansion, and **debt paydown**

**Deep dives**
- **How can a PE firm increase returns?** 🟢
  Pay a lower purchase price, use more leverage (within reason), grow EBITDA faster (revenue growth, margin improvement), exit at a higher multiple, exit sooner, or pay dividend recaps.
  *Say it:* "Buy cheaper, use more debt, grow EBITDA, sell at a higher multiple, or exit sooner."
- **Why do sponsors assume exit multiple = entry multiple?** 🟡
  Multiple expansion depends on markets, which sponsors don't control. Assuming flat multiples tests whether the deal works on operational improvement and deleveraging alone. Underwriting multiple expansion is considered aggressive.
- **Which return driver is the "highest quality"?** 🔴
  EBITDA growth from operational improvement — it's repeatable and within the sponsor's control. Multiple expansion is market-dependent; deleveraging is mechanical.
- **Why does IRR fall the longer you hold?** 🟡
  IRR is annualized. Turning $100 into $200 in 3 years ≈ 26%; in 5 years ≈ 15%. Unless value keeps compounding fast, holding longer dilutes IRR. This is why sponsors often exit around year 3–5.

**Checkpoint:** What are the three drivers of returns? · How does holding period affect IRR?

---

## 8.5 Paper LBO 🟢

**Walkthrough**
Five steps in your head, with no Excel:
1. **Purchase price:** EBITDA × entry multiple.
2. **Sources:** debt (EBITDA × leverage multiple); equity = price − debt.
3. **Project:** EBITDA growth and cumulative free cash flow over the holding period.
4. **Exit:** exit EBITDA × exit multiple − remaining debt = exit equity.
5. **Returns:** MOIC = exit equity ÷ initial equity; estimate IRR with rules of thumb.

Practice in PEB_07 "Paper LBO."

**Fill-ins**
- 2x in 5 years ≈ **15%** IRR
- 3x in 5 years ≈ **25%** IRR
- 2x in 3 years ≈ **26%** IRR
- 2.5x in 5 years ≈ **20%** IRR

**Deep dives**
- **How do you estimate IRR without a calculator?** 🟢
  Memorize anchors: 2x in 3 years ≈ 26%, 2x in 5 ≈ 15%, 2.5x in 5 ≈ 20%, 3x in 5 ≈ 25%, 3x in 3 ≈ 44%. Interpolate between them. Rule of 72: years to double ≈ 72 ÷ rate.
- **What simplifications are acceptable in a paper LBO?** 🟡
  Ignore fees, round taxes, assume all FCF pays down debt, and use simple growth. The interviewer is testing your logic and speed, not decimal precision.
- **How would you solve for the maximum price to hit 25% IRR?** 🔴
  Work backwards: 25% IRR over 5 years ≈ 3.0x MOIC. Required equity = exit equity ÷ 3.0. Maximum purchase price = required equity + debt raised.

**Checkpoint:** $100 EBITDA, 10x entry, 5x leverage, EBITDA grows to $130, $150 paid down, exit at 10x. What are MOIC and IRR? (1.9x, ~14%)

---

## 8.6 The ideal LBO candidate 🟡

**Walkthrough**
- Stable, predictable cash flow (to service debt)
- Low CapEx needs (more cash for debt paydown)
- Strong market position and defensible moat
- Tangible assets for collateral
- Room for operational improvement or cost cuts
- Strong management team
- Clear exit path (strategic buyers or IPO)
- Reasonable purchase price

**Deep dives**
- **What makes a bad LBO candidate?** 🟡
  Highly cyclical revenue, heavy CapEx, rapid technological disruption, negative or volatile cash flow, or a business that depends on constant reinvestment (early-stage tech). All of these struggle to service fixed debt.
  *Say it:* "Volatile or cyclical cash flow and heavy CapEx, since the business has to reliably pay interest and debt."
- **Why do PE firms like recurring revenue?** 🟡
  It makes cash flow predictable, which lets the company carry more debt safely.

**Checkpoint:** What makes a good LBO candidate?

---

## 8.7 LBO gotchas 🔴

**Deep dives**
- **What creates circularity in an LBO model?** 🔴
  Interest depends on the average debt balance, which depends on how much debt is paid down, which depends on cash flow, which depends on interest. Fix by using beginning-of-period balances (as in PEB_07) or enabling iterative calculation.
- **Is more leverage always better?** 🟢
  No. It raises IRR on paper but increases interest costs, covenant risk, and bankruptcy risk. Lenders also cap leverage based on cash flow. Optimal leverage balances return against the risk of losing the equity.
- **Why does IRR fall if the sponsor contributes more equity?** 🟡
  Same dollar gain, larger base → lower percentage return. Less debt also means less leverage amplification.
- **LBO vs. DCF — why do they give different values?** 🔴
  A DCF tells you what the company is worth intrinsically. An LBO tells you what a sponsor can pay to hit a target return given debt capacity. The LBO is a price constraint, not a value estimate.
  *Say it:* "A DCF estimates intrinsic value; an LBO tells you the maximum price a sponsor can pay and still hit its return target."
- **Why would a sponsor accept a lower IRR?** 🔴
  A larger equity check in a high-quality, lower-risk business; deploying capital from a large fund; or strategic value as a platform for add-on acquisitions.
- **What's a dividend recap?** 🟡
  The company borrows new debt and pays the proceeds to the sponsor as a dividend. It returns capital early (boosting IRR) without selling the company, but increases leverage and risk.

**Checkpoint:** What causes circularity? · Is more leverage always better?

---

# MODULE 9 — CREDIT & LEVERAGED FINANCE

## 9.1 Credit metrics 🟢

**Walkthrough**
1. **Leverage:** Total debt ÷ EBITDA; Net debt ÷ EBITDA. How many years of EBITDA to repay debt.
2. **Coverage:** EBITDA ÷ interest; (EBITDA − CapEx) ÷ interest. Can the company afford its interest?
3. **Cash flow:** FCF ÷ debt. How fast can it pay down debt?
4. Typical LBO leverage: roughly 4–6x EBITDA, depending on the business and credit markets.

**Fill-ins**
- Debt $500, EBITDA $100 → leverage = **5.0x**
- EBITDA $100, interest $25 → interest coverage = **4.0x**
- Higher leverage ratios mean **more** credit risk

**Deep dives**
- **Why is (EBITDA − CapEx) ÷ interest more conservative than EBITDA ÷ interest?** 🟡
  CapEx is a real cash need. A capital-intensive company might cover interest easily on EBITDA but barely after funding CapEx.
- **Gross vs. net leverage?** 🟡
  Net leverage subtracts cash, reflecting debt the company couldn't repay immediately. Lenders often focus on gross leverage, since cash can be spent.
- **What do lenders care about most?** 🟢
  Getting repaid: stable cash flow, coverage, collateral, and covenants. They don't share in the upside, so they focus on downside protection.
  *Say it:* "Lenders don't get the upside, so they care about downside — cash flow stability, coverage, and collateral."

**Checkpoint:** Calculate leverage and coverage. · What do lenders focus on?

---

## 9.2 Seniority, security, and recovery 🟡

**Walkthrough**
1. **Secured** debt is backed by specific collateral; **unsecured** relies on the general claim.
2. In bankruptcy, the **absolute priority rule** says senior claims are paid in full before junior claims get anything.
3. Order: secured debt → senior unsecured → subordinated → preferred → common equity.

**Fill-ins**
- In bankruptcy, **common equity** is paid last
- Secured debt is backed by **collateral**

**Deep dives**
- **What's structural subordination?** 🔴
  Debt at a holding company is effectively junior to debt at its operating subsidiaries, because the subsidiaries' creditors get paid from the subsidiaries' assets before any value flows up to the holdco.
  *Say it:* "Holdco debt only gets what's left after opco creditors are paid, so it's effectively junior even if it's labeled senior."
- **Chapter 11 vs. Chapter 7?** 🟡
  Chapter 11 is a reorganization: the company keeps operating while restructuring debt (often converting debt to equity). Chapter 7 is liquidation: assets are sold and proceeds distributed by priority.
- **What's DIP financing?** 🔴
  Debtor-in-possession financing — new loans to a company in Chapter 11. It gets super-priority over existing debt so lenders are willing to fund a bankrupt company.
- **Why does recovery vary by tranche?** 🟡
  Senior secured lenders often recover most or all of their principal; unsecured and subordinated holders recover far less; equity is often wiped out.

**Checkpoint:** What's the absolute priority rule? · What's structural subordination?

---

## 9.3 Credit gotchas 🔴

**Deep dives**
- **What's OID?** 🔴
  Original issue discount: debt issued below par (e.g., at 98). The lender receives 100 at maturity, so the effective yield is higher than the coupon. It's a way to adjust pricing without changing the stated rate.
- **Why do bond prices fall when interest rates rise?** 🟢
  An existing bond pays a fixed coupon. If new bonds pay more, the old one is less attractive, so its price falls until its yield matches the market.
  *Say it:* "The coupon is fixed, so when new bonds pay more, the old one's price has to fall to offer a competitive yield."
- **Why do yields rise when credit ratings fall?** 🟢
  Higher default risk requires higher compensation. The spread over Treasuries widens.
- **What's covenant-lite and why does it matter?** 🟡
  Loans without maintenance covenants. Borrowers gain flexibility, but lenders lose early warning signals — they can't step in until a payment is missed, which often means lower recoveries.
- **Investment grade vs. high yield?** 🟡
  Investment grade is BBB−/Baa3 or above; below that is high yield ("junk"). LBO debt is almost always high yield.

**Checkpoint:** What's OID? · Why do bond prices fall when rates rise?

---

# MODULE 10 — INDUSTRY-SPECIFIC VALUATION

## 10.1 Banks 🔴

**Walkthrough**
1. Banks borrow (deposits) and lend at a higher rate. Interest is their core business, not financing.
2. So EV, EBITDA, and unlevered FCF don't make sense.
3. Use equity-based metrics: P/E, P/BV (price to book value), P/TBV (price to tangible book value).
4. Intrinsic valuation: dividend discount model (DDM) or excess returns model.

**Fill-ins**
- Banks are valued with equity metrics like P/**BV** and P/**TBV**
- A bank with ROE above its cost of equity should trade **above** book value
- The intrinsic model for banks is the **dividend discount** model

**Deep dives**
- **Why doesn't EV/EBITDA work for banks?** 🟡
  Debt (deposits) is a bank's raw material, not a financing choice. Interest is its main revenue and main cost. You can't separate "operations" from "financing," so EV and EBITDA lose meaning.
  *Say it:* "For a bank, debt is the product, not financing. Interest is operating, so EBITDA and EV aren't meaningful. We use P/E and P/BV."
- **What drives a bank's P/BV?** 🔴
  Return on equity vs. cost of equity. If ROE exceeds the cost of equity, the bank creates value on each dollar of book equity and trades above 1.0x book. Below, it trades at a discount.
- **Why use a DDM?** 🔴
  Regulators set minimum capital levels (e.g., CET1 ratios), so a bank can only pay out cash above those requirements. Dividends are the clearest measure of cash available to shareholders.
- **Why tangible book value?** 🔴
  Goodwill and intangibles wouldn't be available to absorb losses in a crisis. Regulators and investors focus on tangible equity.

**Checkpoint:** Why don't you use EV/EBITDA for a bank? · What drives P/BV?

---

## 10.2 REITs 🔴

**Walkthrough**
1. Real Estate Investment Trusts must distribute at least 90% of taxable income as dividends, avoiding corporate tax.
2. GAAP depreciation on real estate understates performance, because properties often hold or gain value.
3. Key metrics: FFO, AFFO, NAV, cap rate.

**Fill-ins**
- REITs must distribute at least **90%** of taxable income
- FFO = net income + real estate D&A − **gains on property sales**
- Cap rate = NOI ÷ **property value**

**Deep dives**
- **What's FFO and why use it?** 🔴
  Funds from operations adds back real estate depreciation (which doesn't reflect real value loss for buildings) and removes one-time gains from property sales. It's a better measure of recurring cash earnings. P/FFO replaces P/E.
- **AFFO vs. FFO?** 🔴
  AFFO (adjusted FFO) also subtracts recurring maintenance CapEx and adjusts for straight-line rent. It's closer to the cash actually available for dividends.
- **What's NAV?** 🔴
  Net asset value: estimate the market value of each property (NOI ÷ cap rate), sum them, and subtract debt. REITs often trade at a premium or discount to NAV.
- **What's a cap rate?** 🟡
  Net operating income ÷ property value — the unlevered yield on a property. Lower cap rate = higher value (similar to an earnings yield). Cap rates rise when interest rates rise.
  *Say it:* "NOI divided by property value — the property's yield. A lower cap rate means a higher valuation."

**Checkpoint:** Why not use P/E for a REIT? · What's a cap rate?

---

## 10.3 Energy (E&P) 🔴

**Walkthrough**
1. Exploration & production companies find and extract oil and gas. Value depends on reserves and commodity prices.
2. Metrics: EV/EBITDAX, NAV of reserves, EV/production ($ per flowing barrel), EV/reserves.
3. Reserves: proved (1P), probable (2P), possible (3P).

**Fill-ins**
- EBITDAX adds back **exploration** expense
- Proved reserves are abbreviated **1P**

**Deep dives**
- **Why EBITDAX instead of EBITDA?** 🔴
  Companies account for exploration differently. Under successful efforts, failed exploration costs (dry holes) are expensed; under full cost, they're capitalized. Adding back exploration expense makes companies using different methods comparable.
  *Say it:* "Exploration accounting differs between successful efforts and full cost, so we add exploration back to compare them."
- **How does an NAV model work?** 🔴
  Project production from each reserve category until depletion, apply a commodity price deck, subtract costs and taxes, and discount (often at 10% — PV-10). Sum the reserves, subtract net debt. Risk probable and possible reserves at lower percentages.
- **Why isn't a standard DCF terminal value used?** 🔴
  Reserves are finite and deplete. An NAV model projects to depletion instead of assuming cash flows forever.
- **How do hedges affect value?** 🔴
  Hedging locks in prices for part of production, reducing exposure to commodity swings. Model hedged volumes at hedge prices and the rest at the price deck.

**Checkpoint:** Why EBITDAX? · Why NAV instead of a perpetuity DCF?

---

## 10.4 SaaS / tech 🔴

**Walkthrough**
1. High-growth software companies often have low or negative current profits, so EV/revenue (often NTM) is common.
2. Key metrics: ARR, net revenue retention, gross retention, CAC payback, LTV/CAC, Rule of 40.
3. Subscription revenue creates deferred revenue (negative working capital).

**Fill-ins**
- Rule of 40: revenue growth % + profit margin % should be **≥ 40%**
- NRR above **100%** means existing customers grow revenue even after churn

**Deep dives**
- **What's net revenue retention?** 🔴
  Revenue this year from customers who existed a year ago ÷ their revenue last year. Includes upsells and churn. 120% means the existing base grew 20% on its own. It's one of the strongest drivers of SaaS multiples.
  *Say it:* "Revenue from last year's customers this year over last year — above 100% means the existing base grows even after churn."
- **What's the Rule of 40?** 🔴
  Growth rate + profit margin (usually EBITDA or FCF margin) ≥ 40%. It captures the tradeoff: a company growing 50% can lose 10%; one growing 10% should earn 30%.
- **LTV/CAC?** 🔴
  Lifetime value of a customer ÷ cost to acquire them. Above ~3x is generally considered healthy. CAC payback (months to recover acquisition cost) is the related metric.
- **Why is SBC a bigger issue for tech valuations?** 🔴
  Tech companies pay a large share of compensation in stock. Adjusted EBITDA that adds back SBC can make an unprofitable company look profitable. Investors increasingly subtract it.

**Checkpoint:** What's NRR? · What's the Rule of 40?

---

## 10.5 Insurance 🔴

**Walkthrough**
1. Insurers collect premiums upfront and pay claims later. The money held in between is "float," invested for returns.
2. Like banks, they're valued on equity metrics: P/BV, P/E, plus ROE vs. cost of equity.

**Fill-ins**
- A combined ratio below **100%** means an underwriting profit
- The premiums held before claims are paid are called **float**

**Deep dives**
- **What's the combined ratio?** 🔴
  (Claims + expenses) ÷ premiums earned. Below 100% means underwriting is profitable on its own; above 100% means the insurer relies on investment returns from the float.
  *Say it:* "Claims plus expenses over premiums — under 100% means the insurer profits from underwriting before any investment income."
- **Why does float matter?** 🔴
  The insurer invests money it will eventually pay out. If underwriting breaks even, the float is effectively free capital. This is the core of Berkshire Hathaway's model.
- **Why are reserves a key risk?** 🔴
  Insurers estimate future claims and set aside reserves. If those estimates are too low, they must take charges later that reduce book value.

**Checkpoint:** What's a combined ratio? · What's float?

---

# MODULE 11 — MENTAL MATH & BRAIN TEASERS

## 11.1 Rules of thumb 🟢

**Walkthrough**
Memorize these until they're automatic:

| MOIC | Years | IRR |
|---|---|---|
| 2.0x | 3 | ~26% |
| 2.0x | 5 | ~15% |
| 2.5x | 5 | ~20% |
| 3.0x | 3 | ~44% |
| 3.0x | 5 | ~25% |

Rule of 72: years to double ≈ 72 ÷ annual return. At 8%, ~9 years; at 12%, ~6 years.

**Fill-ins**
- 2x in 5 years ≈ **15%**
- At 9%, money doubles in about **8** years (Rule of 72)

**Deep dives**
- **How do you estimate an unusual IRR, like 2.2x in 4 years?** 🟡
  Bracket it with anchors. 2x in 4 years ≈ 19% (between 26% at 3 years and 15% at 5). 2.2x is a bit higher, so roughly 22%. Exact: 2.2^(1/4) − 1 ≈ 21.8%.
- **Why do interviewers ask mental math?** 🟢
  To see whether you can sanity-check numbers quickly in a meeting without a spreadsheet, and how you stay composed under pressure. Think out loud.

**Checkpoint:** Rattle off all five anchors.

---

## 11.2 Interview math and brain teasers 🟡

**Walkthrough**
1. Percentages: 15% of 240 = 10% (24) + 5% (12) = 36.
2. Compounding: 10% growth for 3 years ≈ 1.1 × 1.1 × 1.1 = 1.331, so ~33%.
3. Squaring numbers near 50 or 100: 48² = (50 − 2)² = 2,500 − 200 + 4 = 2,304.
4. Always talk through your reasoning — the process is graded as much as the answer.

**Fill-ins**
- 15% of 240 = **36**
- 48² = **2,304**
- 10% annual growth for 3 years ≈ **33%** total growth

**Deep dives**
- **What's the angle between the clock hands at 3:15?** 🟡
  The minute hand is at 90°. The hour hand moves 30° per hour plus 0.5° per minute: 90° + 7.5° = 97.5°. Difference: 7.5°.
  *Say it:* "The hour hand moves half a degree per minute, so at 3:15 it's 7.5 degrees past the 3, while the minute hand is on the 3. So 7.5 degrees."
- **How do you approach a market-sizing question?** 🟡
  State assumptions clearly, break the problem into pieces (population → segment → usage → price), estimate each, and sanity-check the result. Example: US coffee shop revenue ≈ adults × share who buy coffee out × cups per week × price × 52.
- **What if you get a math question wrong?** 🟢
  Stay calm, recheck out loud, and correct yourself. Interviewers respect catching your own error more than a silent guess.

**Checkpoint:** Do five mental-math problems in under two minutes.

---

# Appendix — Lessons mapped to the questions freshmen keep asking

| Question | Lesson · deep dive |
|---|---|
| "Walk me through a DCF" | 6.1 |
| "What's CAPM?" | 5.2 |
| "Can beta be negative?" | 5.2 · Can beta be negative? |
| "Why subtract cash in the EV bridge?" | 2.2 · Why subtract cash? |
| "Why does depreciation increase cash?" | 1.3 · Why does depreciation increase cash? |
| "Which TV method is better?" | 6.4 · Which TV method is better? |
| "Is accretion good?" | 7.2 · Does accretive mean it's a good deal? |
| "Why does leverage increase returns?" | 8.1 · Why does leverage boost returns? |
| "Can EV be negative?" | 2.4 |
| "Why isn't EV/EBITDA used for banks?" | 10.1 |
