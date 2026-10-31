import type { DrillMcqMap } from "./types";

/** Drill choices for the core IB / PE technical seed questions (keyed by exact question text). */
export const CORE_TECHNICAL_MCQ: DrillMcqMap = {
  "Explain the time value of money.": {
    c: "A dollar today is worth more than a dollar later because it can be invested to earn a return, and future cash is exposed to inflation and risk.",
    w: [
      "A dollar later is worth more than a dollar today because it accumulates interest, so future cash flows are valued above present ones.",
      "A dollar today is worth more than a dollar later only because of inflation; with zero inflation, timing would not affect value.",
      "A dollar today and a dollar later are worth the same in nominal terms; only risk differences create a gap in present value.",
    ],
    why: "Opportunity cost (ability to earn a return) is the core reason — inflation and risk add to it, but TVM exists even with zero inflation.",
  },
  "What does the Discount Rate mean?": {
    c: "The minimum return investors require for the risk of the cash flows — higher risk means a higher rate and a lower present value.",
    w: [
      "The minimum return investors require for the risk of the cash flows — higher risk means a higher rate and a higher present value.",
      "The rate at which a company's cash flows are expected to grow each year — a higher rate means a higher present value.",
      "The interest rate the central bank charges banks, which is applied uniformly to value every company's cash flows.",
    ],
    why: "Discount rate and present value move inversely: riskier cash flows are discounted more heavily.",
  },
  "What is WACC?": {
    c: "The blended required return on all capital (equity and after-tax debt), weighted by each source's share of total capital — used to discount unlevered FCF.",
    w: [
      "The blended required return on all capital (equity and pre-tax debt), weighted by book values — used to discount levered FCF.",
      "The cost of equity only, adjusted for leverage — used to discount unlevered FCF to get Enterprise Value.",
      "The blended required return on all capital, weighted equally between debt and equity — used to discount levered FCF.",
    ],
    why: "WACC uses after-tax cost of debt and (ideally) market-value weights, and pairs with UNLEVERED FCF. Levered FCF pairs with cost of equity.",
  },
  "How much would you pay for a company that generates $100 of cash flow every year in perpetuity, with a 10% discount rate?": {
    c: "$1,000 — perpetuity value = $100 / 10%.",
    w: ["$1,100 — perpetuity value = $100 × (1 + 10%) / 10%.", "$909 — perpetuity value = $100 / (1 + 10%) × 10.", "$10,000 — perpetuity value = $100 / 1%."],
    why: "With no growth, PV = CF / r. The (1+g) term only appears in the growing perpetuity formula.",
  },
  "What are the three financial statements and why do we need them?": {
    c: "Income Statement (profitability over a period), Balance Sheet (resources and funding at a point in time), Cash Flow Statement (actual cash in/out) — needed because net income ≠ cash.",
    w: [
      "Income Statement (profitability at a point in time), Balance Sheet (resources and funding over a period), Cash Flow Statement (actual cash in/out) — needed because net income ≠ cash.",
      "Income Statement, Balance Sheet, and Statement of Shareholders' Equity — the CFS is optional because cash can be derived from net income.",
      "Income Statement (profitability over a period), Balance Sheet (resources at a point in time), Cash Flow Statement — needed because revenue ≠ net income.",
    ],
    why: "IS and CFS cover a period; the BS is a snapshot. The CFS exists because accrual net income differs from cash.",
  },
  "How do the three financial statements link together?": {
    c: "Net income starts the CFS and flows into retained earnings; CFS adjustments produce the change in cash, which becomes BS cash.",
    w: [
      "Net income starts the CFS and flows into retained earnings; CFS adjustments produce the change in cash, which becomes BS retained earnings.",
      "Revenue starts the CFS and flows into retained earnings; CFS adjustments produce the change in cash, which becomes BS cash.",
      "Net income starts the CFS and flows into common stock; CFS adjustments produce the change in cash, which becomes BS cash.",
    ],
    why: "Two key links: NI → top of CFS and → retained earnings; ending CFS cash → BS cash.",
  },
  "What is the most important financial statement?": {
    c: "The Cash Flow Statement — valuation is driven by cash flow, and it shows how much cash the business actually generates.",
    w: [
      "The Income Statement — valuation is driven by net income, and it shows how much cash the business actually generates.",
      "The Balance Sheet — valuation is driven by book value, and it shows how much cash the business actually generates.",
      "The Cash Flow Statement — because it is the only statement prepared under GAAP accrual rules.",
    ],
    why: "Standard answer: the CFS. (If you only get two, take the IS and BS, since you can rebuild the CFS from them.)",
  },
  "Why is Accounts Receivable an asset but Deferred Revenue a liability?": {
    c: "AR is cash owed to the company for goods already delivered; Deferred Revenue is cash already received for goods not yet delivered.",
    w: [
      "AR is cash already received for goods not yet delivered; Deferred Revenue is cash owed to the company for goods already delivered.",
      "AR is cash owed to the company for goods not yet delivered; Deferred Revenue is cash already received for goods already delivered.",
      "AR is cash the company owes suppliers for goods received; Deferred Revenue is cash owed to the company by customers.",
    ],
    why: "AR = delivered, not yet paid (future cash benefit). Deferred revenue = paid, not yet delivered (future obligation).",
  },
  "Walk me through the impact on all three financial statements if depreciation increases by $10.": {
    stem: "Depreciation increases by $10 (40% tax rate). What happens across the three statements?",
    c: "NI ↓ $6; CFS: add back $10 so cash ↑ $4; BS: PP&E ↓ $10, cash ↑ $4 (assets ↓ $6), retained earnings ↓ $6.",
    w: [
      "NI ↓ $6; CFS: add back $10 so cash ↑ $4; BS: PP&E ↓ $10, cash ↑ $4 (assets ↓ $6), retained earnings ↓ $10.",
      "NI ↓ $10; CFS: add back $10 so cash is unchanged; BS: PP&E ↓ $10, retained earnings ↓ $10.",
      "NI ↓ $6; CFS: add back $10 so cash ↓ $4; BS: PP&E ↓ $10, cash ↓ $4 (assets ↓ $14), retained earnings ↓ $6.",
    ],
    why: "Depreciation is non-cash but tax-deductible: the only cash effect is the $4 tax shield, so cash goes UP.",
  },
  "What happens to the three statements if you capitalize $100 of operating expenses instead of expensing them?": {
    stem: "A company capitalizes $100 of operating expenses instead of expensing them (40% tax, ignore first-year depreciation). What changes?",
    c: "NI ↑ $60; CFO ↑ $60 but CFI ↓ $100 (CapEx), so cash ↓ $40; BS: +$100 asset, cash ↓ $40, RE ↑ $60.",
    w: [
      "NI ↑ $100; CFO ↑ $100 and CFI ↓ $100, so cash is unchanged; BS: +$100 asset, RE ↑ $100.",
      "NI ↑ $60; CFO ↑ $60 and CFI unchanged, so cash ↑ $60; BS: no new asset, RE ↑ $60.",
      "NI ↓ $60; CFO ↓ $60 and CFI ↑ $100, so cash ↑ $40; BS: +$100 asset, RE ↓ $60.",
    ],
    why: "Capitalizing moves the $100 out of OpEx (NI ↑ $60 after tax) and into CapEx (CFI). Net cash falls $40 — the extra tax paid — because the $100 is spent either way.",
  },
  "What is the difference between Equity Value and Enterprise Value?": {
    c: "Equity Value is the value to common shareholders only; Enterprise Value is the value of core operations to all capital providers (equity + debt − cash + preferred + NCI).",
    w: [
      "Equity Value is the value of core operations to all capital providers; Enterprise Value is the value to common shareholders only.",
      "Equity Value is the value to common shareholders only; Enterprise Value is equity + debt + cash + preferred + NCI.",
      "Equity Value is the book value of shareholders' equity; Enterprise Value is the market capitalization of common shares.",
    ],
    why: "Cash is SUBTRACTED (it's a non-operating asset), and EV is capital-structure neutral.",
  },
  "Why do we add debt and subtract cash when calculating Enterprise Value?": {
    c: "Debt is a claim of other investors on the operating business, so it is added; cash is a non-operating asset that doesn't belong to core operations, so it is subtracted.",
    w: [
      "Debt is a non-operating asset, so it is added; cash is a claim of other investors on the business, so it is subtracted.",
      "Debt reduces the price a buyer pays, so it is added; cash increases the price a buyer pays, so it is subtracted.",
      "Debt is added because interest is tax-deductible; cash is subtracted because it earns a lower return than the business.",
    ],
    why: "The cleaner modern framing: EV = value of core operations to ALL investors. Debt holders are investors; cash isn't part of operations.",
  },
  "When would Equity Value exceed Enterprise Value?": {
    c: "When cash (and other non-operating assets) exceed debt and other debt-like claims — i.e., the company has net cash.",
    w: [
      "When debt and other debt-like claims exceed cash — i.e., the company has net debt.",
      "When the company has a negative P/E ratio — i.e., it is currently unprofitable.",
      "When the company issues new shares — because share issuance raises Equity Value but not Enterprise Value.",
    ],
    why: "EV = Equity Value + net debt. Net debt is negative when cash > debt, so EV < Equity Value.",
  },
  'What are "diluted shares," and why do we use them?': {
    c: "Basic shares plus the dilutive effect of in-the-money options, warrants, RSUs and convertibles — used because those holders also have a claim on equity value.",
    w: [
      "Basic shares plus the dilutive effect of ALL options and warrants, including out-of-the-money ones — used to be as conservative as possible.",
      "Basic shares minus treasury stock repurchased during the year — used because repurchased shares no longer have a claim on equity value.",
      "Basic shares plus in-the-money options only, with no treasury stock method — used because option proceeds are ignored in valuation.",
    ],
    why: "Only in-the-money securities count, and the treasury stock method assumes option proceeds are used to buy back shares.",
  },
  "What are the three main valuation methodologies?": {
    c: "Comparable companies (trading multiples), precedent transactions (M&A multiples), and DCF (intrinsic value).",
    w: [
      "Comparable companies (trading multiples), precedent transactions (M&A multiples), and LBO analysis (intrinsic value).",
      "Comparable companies (M&A multiples), precedent transactions (trading multiples), and DCF (intrinsic value).",
      "Comparable companies (trading multiples), sum-of-the-parts (segment multiples), and DCF (relative value).",
    ],
    why: "LBO and SOTP are valid but secondary methods; DCF is intrinsic, comps are relative.",
  },
  "Which valuation method tends to give the highest value?": {
    c: "Precedent transactions — buyers pay a control premium; DCF is the most variable and can come out highest or lowest.",
    w: [
      "Trading comps — public markets price in growth expectations; precedents are lower because they exclude synergies.",
      "DCF — it always assumes perpetual growth, so it consistently exceeds both comps and precedents.",
      "Precedent transactions — because they use LTM revenue multiples, which are always higher than EBITDA multiples.",
    ],
    why: "Control premium is the reason. DCF output depends entirely on assumptions — it's not reliably highest.",
  },
  "When would you not use a DCF?": {
    c: "When cash flows are negative or unpredictable (early-stage, distressed) or for banks/insurers, where debt is operational and FCF is not meaningful.",
    w: [
      "When the company has high leverage, because a DCF cannot handle companies with more debt than equity.",
      "When the company is large and stable, because comparable companies are always more accurate for mature businesses.",
      "When the company pays a dividend, because dividends are already captured in the P/E multiple.",
    ],
    why: "Banks get a DDM / residual income approach; high leverage alone doesn't rule out a DCF.",
  },
  "What are the most common valuation multiples?": {
    c: "EV/EBITDA, EV/Revenue (unprofitable or high-growth), EV/EBIT, P/E, and P/BV or P/TBV for financial institutions.",
    w: [
      "EV/EBITDA, EV/Net Income, Equity Value/Revenue, and P/BV for technology companies.",
      "P/EBITDA, EV/Revenue, EV/EPS, and P/E for financial institutions.",
      "EV/EBITDA, EV/Revenue, P/E, and EV/Book Value for financial institutions.",
    ],
    why: "Numerator and denominator must match: EV metrics (EBITDA, revenue, EBIT) with EV; equity metrics (net income, book value) with equity value.",
  },
  "Walk me through a DCF.": {
    c: "Project unlevered FCF 5–10 years, compute terminal value, discount both at WACC to get EV, subtract net debt for equity value, divide by diluted shares.",
    w: [
      "Project levered FCF 5–10 years, compute terminal value, discount both at WACC to get EV, subtract net debt for equity value, divide by diluted shares.",
      "Project unlevered FCF 5–10 years, compute terminal value, discount both at cost of equity to get EV, add net debt for equity value, divide by basic shares.",
      "Project unlevered FCF 5–10 years, compute terminal value, discount only the projection-period cash flows at WACC, then add the undiscounted terminal value.",
    ],
    why: "Unlevered FCF ↔ WACC ↔ EV. The terminal value must also be discounted back.",
  },
  "What goes into WACC?": {
    c: "WACC = %E × Cost of Equity + %D × Cost of Debt × (1 − t) + %Pref × Cost of Pref; Cost of Equity = Rf + β × ERP.",
    w: [
      "WACC = %E × Cost of Equity + %D × Cost of Debt + %Pref × Cost of Pref; Cost of Equity = Rf + β × ERP.",
      "WACC = %E × Cost of Equity + %D × Cost of Debt × (1 − t); Cost of Equity = β × (Rf + ERP).",
      "WACC = %E × Cost of Equity × (1 − t) + %D × Cost of Debt; Cost of Equity = Rf + β × ERP.",
    ],
    why: "Only debt gets the (1 − t) tax shield, because interest is tax-deductible. CAPM: Rf + β × ERP.",
  },
  "What is the terminal value and why does it matter?": {
    c: "The value of all cash flows after the projection period (exit multiple or Gordon Growth) — often 60–80%+ of total DCF value.",
    w: [
      "The value of all cash flows after the projection period (exit multiple or Gordon Growth) — usually 10–20% of total DCF value.",
      "The value of the company's assets if liquidated at the end of the projection period — often 60–80%+ of total DCF value.",
      "The final-year free cash flow, undiscounted — it matters because it sets the growth rate for the projection period.",
    ],
    why: "Because TV dominates the valuation, small changes in g or the exit multiple swing the answer massively.",
  },
  "How does an increase in beta affect a DCF?": {
    c: "Higher beta → higher cost of equity → higher WACC → lower present value → lower valuation.",
    w: [
      "Higher beta → higher cost of equity → lower WACC → higher present value → higher valuation.",
      "Higher beta → lower cost of equity → lower WACC → higher present value → higher valuation.",
      "Higher beta → higher cost of debt only → WACC unchanged → no change in valuation.",
    ],
  },
  "What are the main sensitivities you'd run in a DCF?": {
    c: "Discount rate (WACC) vs. terminal growth rate or exit multiple; also revenue growth vs. margins.",
    w: [
      "Tax rate vs. share count; also dividend payout ratio vs. interest rate.",
      "Beta vs. risk-free rate only, because operating assumptions are fixed in a DCF.",
      "Discount rate vs. diluted share count; also cash balance vs. debt balance.",
    ],
  },
  "What is a leveraged buyout (LBO)?": {
    c: "A sponsor buys a company using mostly debt, uses the company's cash flows to pay down that debt, and exits in ~3–7 years to earn a return on its equity.",
    w: [
      "A sponsor buys a company using mostly equity, uses the company's cash flows to pay dividends, and exits in ~3–7 years to earn a return on its debt.",
      "A sponsor buys a company using mostly debt, uses its own fund's cash to pay down that debt, and exits in ~3–7 years to earn a return on its equity.",
      "A company buys back its own shares using mostly debt, uses cash flows to pay down that debt, and never exits.",
    ],
    why: "The target's own cash flows service the debt — that's what amplifies the sponsor's equity return.",
  },
  "What are the three main drivers of LBO returns?": {
    c: "Debt paydown (deleveraging), EBITDA growth, and multiple expansion.",
    w: [
      "Debt paydown, EBITDA growth, and a lower purchase multiple than exit multiple from synergies with other funds.",
      "Debt issuance, revenue growth, and multiple compression.",
      "Dividend recaps, interest tax shields, and share buybacks.",
    ],
    why: "Multiple EXPANSION (buy low, sell high) helps; compression hurts. Recaps can boost IRR but aren't one of the core three.",
  },
  "What makes a good LBO candidate?": {
    c: "Stable, predictable cash flows, low CapEx needs, low existing debt, a strong market position, room for operational improvement, and a clear exit.",
    w: [
      "High revenue growth, heavy ongoing CapEx, high existing debt, a strong market position, and a clear exit.",
      "Volatile but high-margin cash flows, low CapEx needs, no hard assets, and an unclear exit to maximize upside.",
      "Stable cash flows, high CapEx needs to justify more debt, a fragmented market position, and a clear exit.",
    ],
    why: "Lenders care about predictable cash to service debt; heavy CapEx and existing debt reduce debt capacity.",
  },
  "How do you calculate IRR in an LBO?": {
    c: "The discount rate that sets NPV of equity cash flows to zero; 2x in 3 years ≈ 26%, 2x in 5 years ≈ 15%.",
    w: [
      "The discount rate that sets NPV of equity cash flows to zero; 2x in 3 years ≈ 33%, 2x in 5 years ≈ 20%.",
      "The discount rate that sets NPV of equity cash flows to zero; 2x in 3 years ≈ 15%, 2x in 5 years ≈ 26%.",
      "MOIC divided by the number of years held; 2x in 3 years ≈ 67%, 2x in 5 years ≈ 40%.",
    ],
    why: "2^(1/3) ≈ 1.26 and 2^(1/5) ≈ 1.15. Dividing MOIC by years ignores compounding.",
  },
  "What is the difference between IRR and MOIC?": {
    c: "MOIC = cash returned ÷ cash invested and ignores timing; IRR is the annualized return and falls as the hold period lengthens for the same MOIC.",
    w: [
      "MOIC = cash returned ÷ cash invested and accounts for timing; IRR ignores timing and only measures total return.",
      "MOIC = cash returned ÷ cash invested and ignores timing; IRR rises as the hold period lengthens for the same MOIC.",
      "MOIC = annualized return on equity; IRR = cash returned ÷ cash invested.",
    ],
  },
  "Walk me through a simple LBO model.": {
    c: "Set purchase price → sources & uses (debt + sponsor equity) → project FCF and pay down debt → exit EV → less net debt = exit equity → IRR/MOIC on sponsor equity.",
    w: [
      "Set purchase price → sources & uses (debt + sponsor equity) → project FCF and pay dividends → exit EV → plus net debt = exit equity → IRR/MOIC on total EV.",
      "Set purchase price → project FCF → discount FCF at WACC → subtract net debt → IRR/MOIC on sponsor equity.",
      "Set purchase price → sources & uses (debt only) → project FCF and pay down debt → exit EV → IRR/MOIC on the debt.",
    ],
    why: "Returns are on the sponsor's EQUITY: exit EV minus remaining net debt vs. the equity check.",
  },
  "Is an acquisition accretive or dilutive — and what does that mean?": {
    c: "Accretive if the buyer's pro-forma EPS rises after the deal; dilutive if it falls. It depends on the target's earnings vs. the after-tax cost of the financing used.",
    w: [
      "Accretive if the buyer's pro-forma revenue rises after the deal; dilutive if it falls. It depends on the target's revenue vs. the buyer's.",
      "Accretive if the buyer's share price rises after the deal; dilutive if it falls. It depends on market reaction on announcement.",
      "Accretive if the buyer's pro-forma EPS rises after the deal; dilutive if it falls. It depends on the target's EV vs. the buyer's EV.",
    ],
  },
  "When is an all-stock deal dilutive?": {
    c: "When the buyer's P/E is lower than the P/E it pays for the target — its cost of stock (1 ÷ P/E) exceeds the target's earnings yield.",
    w: [
      "When the buyer's P/E is higher than the P/E it pays for the target — its cost of stock (1 ÷ P/E) is below the target's earnings yield.",
      "When the buyer's EV/EBITDA is higher than the target's — regardless of the price paid.",
      "When the target has more shares outstanding than the buyer — because share count always rises more than earnings.",
    ],
    why: "Compare earnings yields: buyer's cost of stock = 1 / buyer P/E. If that cost exceeds the target's yield (1 / purchase P/E), the deal is dilutive.",
  },
  "What is goodwill, and why is it created in M&A?": {
    c: "The purchase price above the fair value of the target's net identifiable assets; it is not amortized for public companies but is tested for impairment.",
    w: [
      "The purchase price above the book value of the target's total assets; it is amortized over 15 years for public companies.",
      "The purchase price above the fair value of the target's net identifiable assets; it is amortized straight-line over 10 years.",
      "The discount to market value paid when buying a distressed target; it is recorded as a gain on the income statement.",
    ],
    why: "Under US GAAP, public-company goodwill is impairment-tested, not amortized. A bargain purchase (not goodwill) creates a gain.",
  },
  "What are synergies, and how do you account for them?": {
    c: "Cost synergies (overlap cuts) and revenue synergies (cross-sell) added to pro-forma earnings — cost synergies are more credible and revenue synergies are haircut more.",
    w: [
      "Cost synergies (overlap cuts) and revenue synergies (cross-sell) added to pro-forma earnings — revenue synergies are more credible and cost synergies are haircut more.",
      "Cost and revenue synergies are recorded as goodwill on the balance sheet rather than flowing through pro-forma earnings.",
      "Only revenue synergies count in a merger model; cost synergies are excluded because they require integration costs.",
    ],
    why: "Buyers can control cost cuts; revenue synergies depend on customers, so they're riskier.",
  },
  "Walk me through your resume.": {
    c: "A ~2-minute story: background → what sparked your interest in finance → experiences that built skills → why this role and firm now.",
    w: [
      "A ~10-minute chronological list of every role and responsibility, ending with your GPA and coursework.",
      "A ~2-minute summary focused mainly on long-term exit opportunities after banking and why the hours fit you.",
      "A ~2-minute story starting with your current role, then high school activities, ending with hobbies.",
    ],
  },
  "Why investment banking?": {
    c: "You want more deal reps — working on transactions end-to-end across companies — tied to specific experiences that confirmed the interest.",
    w: [
      "You want to learn as much as possible and the culture is great — banking is a two-year training program before PE.",
      "The compensation and exit opportunities are the best available to undergraduates.",
      "You love Excel and want to build financial models, regardless of the type of deal or client.",
    ],
    why: "'Learning', 'culture' and 'exit opps' are classic weak answers — anchor in deals and your own story.",
  },
  "Why our bank/firm?": {
    c: "Cite people you've spoken with there, a specific recent deal or group strength, and how it connects to your interests.",
    w: [
      "Cite the firm's league table rank and brand name, and note that it pays above market.",
      "Cite the firm's mission statement from the careers page and its founding year.",
      "Explain that it's your top choice because it has the most offices and analyst class size.",
    ],
  },
  "What are your strengths and weaknesses?": {
    c: "Strengths backed by brief stories; a real but non-fatal weakness with the concrete steps you're taking to fix it.",
    w: [
      "Strengths backed by brief stories; a disguised strength as a weakness, such as working too hard.",
      "A list of strengths only — never volunteer a weakness in a banking interview.",
      "Strengths backed by brief stories; a weakness that's core to the job, like disliking attention to detail.",
    ],
  },
  "Tell me about a deal in the news.": {
    c: "Name the deal and price, explain the strategic rationale, the valuation/multiple, key risks, and whether you'd do it as the buyer.",
    w: [
      "Name the deal, read the press release headline, and say whether the stock went up or down.",
      "Pick a deal from 5+ years ago because it's well-documented, and focus mainly on the advisors' fees.",
      "Name the deal and price, then give a detailed history of each company's founding.",
    ],
  },
  "What are the key characteristics of a suitable LBO candidate?": {
    c: "Strong, stable FCF; leading or niche market position; low CapEx; collateral; strong management; identifiable improvements; low existing debt; clear exit.",
    w: [
      "High-growth but negative FCF; leading market position; high CapEx; no collateral; low existing debt; clear exit.",
      "Strong, stable FCF; fragmented market position; high CapEx; collateral; high existing debt to refinance; clear exit.",
      "Strong, stable FCF; leading position; low CapEx; collateral; strong management; no clear exit so the sponsor can hold forever.",
    ],
  },
  "What is the 'hockey stick' effect in financial modeling and why is it a red flag?": {
    c: "Projections that jump sharply (e.g., margins doubling in year 1) without justification — a red flag because history is the best anchor for forecasts.",
    w: [
      "Projections that decline sharply then recover — a red flag because it implies the company will go bankrupt.",
      "Projections that jump sharply in the final year due to terminal value — expected and not a red flag.",
      "Projections that grow steadily in line with history — a red flag because they ignore upside.",
    ],
  },
  "Why does interest expense create a circularity problem in financial models, and what are the two solutions?": {
    c: "Interest depends on average debt, which depends on cash available for paydown, which depends on net income after interest. Fix: use beginning balance, or enable iterative calculation.",
    w: [
      "Interest depends on EBITDA, which depends on revenue, which depends on interest. Fix: hard-code revenue, or remove taxes.",
      "Interest depends on average debt, which depends on the share price. Fix: use ending balance, or switch to equity financing.",
      "Interest depends on the tax rate, which depends on interest. Fix: set taxes to zero, or use EBIT instead of net income.",
    ],
  },
  "What is a management ratchet in an LBO, and why do PE sponsors include it?": {
    c: "A provision that increases management's equity share if returns exceed a threshold (e.g., 25% IRR) — aligning incentives without a big upfront investment.",
    w: [
      "A provision that decreases management's equity share if returns exceed a threshold — protecting the sponsor's upside.",
      "A provision that raises the interest rate on the debt if EBITDA misses budget — protecting lenders.",
      "A provision that requires management to invest more cash each year the deal is held — aligning incentives.",
    ],
  },
  "What is the difference between enterprise value and equity value in an LBO exit?": {
    c: "Exit EV = exit EBITDA × multiple; exit equity = exit EV − remaining debt + cash. Sponsor returns are measured on equity, which is why deleveraging boosts returns.",
    w: [
      "Exit EV = exit EBITDA × multiple; exit equity = exit EV + remaining debt − cash. Sponsor returns are measured on EV.",
      "Exit EV = exit net income × P/E; exit equity = exit EV. Debt doesn't affect sponsor returns.",
      "Exit EV = exit EBITDA × multiple; exit equity = exit EV − original debt. Paydown during the hold doesn't affect returns.",
    ],
  },
  "Walk me through how the three financial statements are built in a financial model.": {
    c: "Build the IS to net income → CFS starting from NI with non-cash and working capital adjustments, CapEx, financing → BS rolled forward from CFS, with cash from the CFS.",
    w: [
      "Build the BS first → derive net income from the change in retained earnings → back-solve the IS → CFS is optional since cash is a plug.",
      "Build the CFS first from cash receipts and payments → derive the IS from the CFS → roll the BS forward with cash set equal to net income.",
      "Build the IS to net income → roll the BS forward with cash as the balancing plug → derive the CFS afterward from BS changes.",
    ],
  },
  "What drives each line item on the Balance Sheet in a financial model?": {
    c: "AR from DSO × revenue, inventory and AP from DIO/DPO × COGS, PP&E = prior + CapEx − D&A, RE = prior + NI − dividends, cash from the CFS.",
    w: [
      "AR from DPO × COGS, inventory and AP from DSO × revenue, PP&E = prior + D&A − CapEx, RE = prior + NI + dividends, cash plug.",
      "AR from DSO × COGS, inventory and AP from DSO × revenue, PP&E = prior + CapEx + D&A, RE = prior − NI, cash from the IS.",
      "All BS items grow at the revenue growth rate; cash is the plug that makes the balance sheet balance.",
    ],
    why: "Using cash as a 'plug' hides model errors — cash should come from the CFS.",
  },
  "What is free cash flow and why do credit analysts prefer it over net income?": {
    c: "CFO − CapEx: the cash left to service debt after maintaining the business. Net income includes non-cash items and ignores CapEx and working capital.",
    w: [
      "CFO + CapEx: the cash generated before reinvestment. Net income already deducts CapEx, so it understates cash.",
      "EBITDA − interest: the cash left for equity holders. Net income includes CapEx, so it understates cash.",
      "Net income + D&A: the cash left to service debt. It is identical to CFO for credit purposes.",
    ],
  },
  "What are 'credit landmines' and what are common examples?": {
    c: "Hidden risks to creditworthiness not obvious in earnings: off-BS liabilities, underfunded pensions, aggressive revenue recognition, rising DSO, covenant pressure.",
    w: [
      "Hidden upside to creditworthiness not obvious in earnings: overfunded pensions, conservative revenue recognition, unused revolver capacity.",
      "Non-recurring items analysts always add back to EBITDA: restructuring charges, M&A fees, stock-based comp, and litigation costs.",
      "Rating agency downgrades that have already been announced, priced into bond spreads, and disclosed in the 10-K.",
    ],
  },
  "What are the key credit ratios and what do they measure?": {
    c: "Leverage (Debt/EBITDA — lower is safer), coverage (EBITDA/Interest — higher is safer), Debt/Capital, FCF/Debt, and liquidity ratios.",
    w: [
      "Leverage (Debt/EBITDA — higher is safer), coverage (EBITDA/Interest — lower is safer), Debt/Capital, FCF/Debt.",
      "Leverage (EBITDA/Debt — lower is safer), coverage (Interest/EBITDA — higher is safer), P/E, and dividend yield.",
      "Leverage (Debt/Equity only), coverage (Revenue/Interest), ROE, and EPS growth.",
    ],
  },
  "What is revenue recognition and why does it matter for credit analysis?": {
    c: "Revenue is recorded when earned (delivered), not when cash is received; aggressive recognition inflates earnings without cash — watch AR growing faster than revenue.",
    w: [
      "Revenue is recorded when cash is received, not when earned; conservative recognition inflates earnings — watch AR shrinking faster than revenue.",
      "Revenue is recorded when the contract is signed; credit analysts ignore it because they only look at EBITDA.",
      "Revenue is recorded when earned; it matters because it determines the tax rate on interest expense.",
    ],
  },
  "How do you analyze a company's working capital and what does deterioration signal?": {
    c: "Track DSO, DIO and DPO: rising DSO/DIO with falling DPO ties up cash — a cash flow problem even if earnings look fine.",
    w: [
      "Track DSO, DIO and DPO: falling DSO/DIO with rising DPO ties up cash — a cash flow problem even if earnings look fine.",
      "Track DSO, DIO and DPO: rising DSO/DIO with rising DPO always frees up cash — a sign of strength.",
      "Working capital only matters for retailers; for other companies it has no impact on cash flow.",
    ],
    why: "Collecting slower (DSO ↑), holding more inventory (DIO ↑) and paying suppliers faster (DPO ↓) all consume cash.",
  },
  "What is the difference between investment grade and high yield (leveraged) credit?": {
    c: "IG is BBB-/Baa3 or above with lower leverage and spreads; HY is BB+/Ba1 or below, typical of LBOs, with higher leverage (often 4–7x) and spreads.",
    w: [
      "IG is BB+/Ba1 or above with lower leverage; HY is BBB-/Baa3 or below, with higher leverage and spreads.",
      "IG is BBB-/Baa3 or above with higher leverage (4–7x) and spreads; HY is BB+/Ba1 or below with lower leverage.",
      "IG is A-/A3 or above only; everything from BBB+ down is high yield.",
    ],
    why: "The IG/HY line sits between BBB- (IG) and BB+ (HY) at S&P/Fitch; Baa3 / Ba1 at Moody's.",
  },
  "What are the steps to build a comparable company analysis?": {
    c: "Pick peers (industry, size, growth) → gather financials and market data → compute EV and multiples → apply the median/range to the target → adjust for differences.",
    w: [
      "Pick peers → gather financials → compute multiples using equity value for EBITDA → apply the maximum multiple to the target.",
      "Pick recent M&A deals → gather deal values → compute transaction multiples → apply to the target.",
      "Pick peers → project their FCF → discount at WACC → average the resulting share prices.",
    ],
  },
  "What is the difference between maintenance covenants and incurrence covenants?": {
    c: "Maintenance covenants are tested every quarter (common in bank loans and private credit); incurrence covenants only apply when the borrower takes an action, like adding debt (common in HY bonds).",
    w: [
      "Maintenance covenants only apply when the borrower takes an action (common in HY bonds); incurrence covenants are tested every quarter (common in bank loans).",
      "Maintenance covenants are tested every quarter (common in HY bonds); incurrence covenants are tested annually (common in IG bonds).",
      "Maintenance and incurrence covenants are identical; the terms just differ between US and European documents.",
    ],
    why: "Bank lenders want an early warning (maintenance); bond investors accept incurrence tests. Many leveraged loans today are 'cov-lite' (incurrence only).",
  },
};
