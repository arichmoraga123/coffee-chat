import type { DrillMcq } from "./types";

/**
 * Firm-tagged drill questions. Each is modeled on question TYPES candidates commonly
 * report for that firm (Glassdoor / WSO / prep-guide interview reports) — not verbatim
 * leaks. Every question ships with near-miss multiple choice options.
 */
export type FirmDrillQuestion = {
  question: string;
  answer: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  firms: string[];
  topics: string[];
  careerTracks: string[];
  mcq: DrillMcq;
};

const IB = ["Investment Banking"];
const IB_PE = ["Investment Banking", "Private Equity"];
const RX = ["Investment Banking", "Private Credit"];

export const FIRM_DRILL_QUESTIONS: FirmDrillQuestion[] = [
  // ── Goldman Sachs ──────────────────────────────────────────
  {
    question: "If you could only use two of the three financial statements to value a company, which two would you pick and why?",
    answer:
      "The Income Statement and Balance Sheet. You can reconstruct the Cash Flow Statement from them: start with net income, add back non-cash items from the IS, and use year-over-year Balance Sheet changes for working capital, CapEx, and financing. You can't rebuild the IS or BS from the CFS alone.",
    category: "Accounting",
    difficulty: "Medium",
    firms: ["Goldman Sachs", "Citi"],
    topics: ["three statements"],
    careerTracks: IB,
    mcq: {
      c: "Income Statement and Balance Sheet — you can rebuild the CFS from net income plus changes in Balance Sheet items.",
      w: [
        "Cash Flow Statement and Balance Sheet — you can rebuild the IS from cash flows plus changes in Balance Sheet items.",
        "Income Statement and Cash Flow Statement — the Balance Sheet is only a snapshot and isn't needed for valuation.",
        "Cash Flow Statement and Income Statement — you can rebuild the Balance Sheet from cumulative net income.",
      ],
      why: "With beginning and ending Balance Sheets plus the IS, every CFS line can be derived.",
    },
  },
  {
    question: "Tell me about a time you failed. (HireVue-style behavioral)",
    answer:
      "Use STAR in ~90 seconds: a real, specific failure where you owned the mistake, the concrete action you took to fix it, and a measurable lesson you've applied since. Avoid fake failures or blaming teammates. HireVue graders score structure, ownership, and reflection.",
    category: "Behavioral",
    difficulty: "Easy",
    firms: ["Goldman Sachs", "J.P. Morgan", "Bank of America"],
    topics: ["hirevue", "behavioral"],
    careerTracks: [],
    mcq: {
      c: "A real failure you owned, the specific action you took to recover, and a lesson you've applied since — in ~90 seconds.",
      w: [
        "A real failure caused mainly by a teammate, how you escalated it, and why the outcome wasn't your fault.",
        "A 'failure' that's really a strength, like caring too much about quality, to avoid looking weak.",
        "A real failure you owned, described in detail over ~5 minutes, with no lesson so it stays authentic.",
      ],
    },
  },
  // ── J.P. Morgan ────────────────────────────────────────────
  {
    question: "Walk me through the three statements if stock-based compensation increases by $100 (25% tax rate, assume it's tax-deductible).",
    answer:
      "IS: pre-tax income falls $100, net income falls $75. CFS: net income −$75, add back $100 of non-cash SBC, so cash is up $25. BS: cash +$25 on the asset side; on the equity side, retained earnings −$75 and common stock/APIC +$100 for net +$25. Balances.",
    category: "Accounting",
    difficulty: "Hard",
    firms: ["J.P. Morgan", "Evercore"],
    topics: ["three statements", "stock-based comp"],
    careerTracks: IB,
    mcq: {
      c: "NI ↓ $75; add back $100 SBC so cash ↑ $25; BS: cash ↑ $25, equity ↑ $25 (RE ↓ $75, APIC ↑ $100).",
      w: [
        "NI ↓ $75; add back $100 SBC so cash ↑ $25; BS: cash ↑ $25, equity ↓ $75 (RE ↓ $75).",
        "NI ↓ $75; SBC is not added back so cash ↓ $75; BS: cash ↓ $75, equity ↓ $75.",
        "NI ↓ $100; add back $100 SBC so cash unchanged; BS: no change in cash or equity.",
      ],
      why: "The shares issued to employees increase APIC — that's the piece people forget, and without it the BS won't balance.",
    },
  },
  {
    question: "What is the formula for unlevered free cash flow?",
    answer:
      "UFCF = EBIT × (1 − tax rate) + D&A (and other non-cash charges) − CapEx − increase in net working capital. It excludes interest, so it represents cash available to all capital providers and is discounted at WACC.",
    category: "DCF",
    difficulty: "Medium",
    firms: ["Barclays", "J.P. Morgan", "Wells Fargo"],
    topics: ["dcf", "free cash flow"],
    careerTracks: IB_PE,
    mcq: {
      c: "EBIT × (1 − t) + D&A − CapEx − increase in NWC",
      w: ["EBIT × (1 − t) + D&A − CapEx + increase in NWC", "EBITDA × (1 − t) − CapEx − increase in NWC", "Net income + D&A − CapEx − increase in NWC"],
      why: "An increase in NWC uses cash (subtract). EBITDA × (1−t) wrongly taxes D&A; net income + D&A − CapEx − ΔNWC is LEVERED FCF (before debt repayment).",
    },
  },
  // ── Morgan Stanley ─────────────────────────────────────────
  {
    question: "Company A trades at 20x P/E and acquires Company B for a purchase P/E of 10x in an all-stock deal. Is it accretive or dilutive?",
    answer:
      "Accretive. A's cost of stock is its earnings yield, 1/20 = 5%. B's earnings yield at the purchase price is 1/10 = 10%. A is giving up 5% to acquire 10% of earnings, so pro-forma EPS rises (ignoring synergies and transaction costs).",
    category: "Merger Models",
    difficulty: "Medium",
    firms: ["Morgan Stanley", "Moelis & Co", "Lazard"],
    topics: ["accretion dilution"],
    careerTracks: IB,
    mcq: {
      c: "Accretive — A's cost of stock (1/20 = 5%) is below B's earnings yield (1/10 = 10%).",
      w: [
        "Dilutive — A's cost of stock (1/10 = 10%) is above B's earnings yield (1/20 = 5%).",
        "Dilutive — A must issue new shares, and issuing shares always lowers EPS.",
        "Neutral — all-stock deals never change EPS because both companies' earnings are combined.",
      ],
    },
  },
  {
    question: "A buyer uses cash earning 4% pre-tax (25% tax rate) to acquire a target at 25x P/E. Accretive or dilutive?",
    answer:
      "Accretive, barely. After-tax cost of cash = 4% × (1 − 25%) = 3%. Target earnings yield = 1/25 = 4%. Since 4% > 3%, pro-forma EPS increases. Comparing the pre-tax 4% to the 4% yield would wrongly suggest it's neutral.",
    category: "Merger Models",
    difficulty: "Hard",
    firms: ["Morgan Stanley", "Centerview Partners"],
    topics: ["accretion dilution", "cost of cash"],
    careerTracks: IB,
    mcq: {
      c: "Accretive — after-tax cost of cash is 3%, below the target's 4% earnings yield.",
      w: [
        "Neutral — the 4% cost of cash equals the target's 4% earnings yield.",
        "Dilutive — after-tax cost of cash is 5%, above the target's 4% earnings yield.",
        "Dilutive — paying 25x earnings is above the market average, so any cash deal is dilutive.",
      ],
      why: "Foregone interest on cash is taxable, so its cost is after-tax: 4% × 0.75 = 3%.",
    },
  },
  // ── Bank of America / Citi / Wells / Barclays / UBS / DB / RBC ─
  {
    question: "How would you value a commercial bank, and why not use EV/EBITDA?",
    answer:
      "Use P/TBV (or P/BV), P/E, and a dividend discount model or residual income model. For banks, debt and interest are part of operations (deposits are raw material), so EV and EBITDA aren't meaningful — you value banks on an equity basis. Regulatory capital (CET1) constrains how much can be paid out.",
    category: "Valuation",
    difficulty: "Medium",
    firms: ["Bank of America", "Wells Fargo", "Keefe Bruyette & Woods"],
    topics: ["fig", "bank valuation"],
    careerTracks: IB,
    mcq: {
      c: "P/TBV, P/E and a DDM — interest is an operating item for banks, so EV-based metrics aren't meaningful.",
      w: [
        "EV/EBITDA and DCF of unlevered FCF — banks are valued like any other company.",
        "EV/Revenue and DCF — banks have no meaningful earnings, so revenue is the best proxy.",
        "P/TBV, P/E and a DDM — EV/EBITDA is avoided only because banks don't report depreciation.",
      ],
    },
  },
  {
    question: "A company raises $100 of debt and uses it to pay a $100 dividend. What happens to Enterprise Value and Equity Value?",
    answer:
      "EV is unchanged; Equity Value falls by $100. Raising debt adds $100 of debt and $100 of cash (net debt unchanged). Paying the dividend removes $100 of cash, so net debt rises $100 and Equity Value falls $100, leaving EV the same (ignoring tax shields and distress costs).",
    category: "Equity Value & Enterprise Value",
    difficulty: "Hard",
    firms: ["Citi", "Centerview Partners", "Evercore"],
    topics: ["enterprise value", "dividend recap"],
    careerTracks: IB_PE,
    mcq: {
      c: "EV unchanged; Equity Value ↓ $100 (net debt ↑ $100).",
      w: ["EV ↑ $100; Equity Value unchanged (debt ↑ $100).", "EV ↓ $100; Equity Value ↓ $100 (cash ↓ $100).", "EV unchanged; Equity Value unchanged (the two steps offset)."],
      why: "Capital-structure changes don't change the value of operations (EV) in a frictionless world — they just shift value between equity and debt holders.",
    },
  },
  {
    question: "Why might two companies with identical EBITDA trade at very different EV/EBITDA multiples?",
    answer:
      "Multiples reflect expected growth, margins and returns on capital, capital intensity (CapEx and working capital needs), risk (cyclicality, customer concentration, leverage), and market position. Higher growth and lower risk deserve higher multiples for the same EBITDA.",
    category: "Valuation",
    difficulty: "Medium",
    firms: ["UBS", "Deutsche Bank", "Jefferies"],
    topics: ["multiples"],
    careerTracks: IB_PE,
    mcq: {
      c: "Differences in expected growth, capital intensity, risk and returns on capital — the market pays more for faster, safer, less capital-hungry EBITDA.",
      w: [
        "Differences in share count and share price — companies with more shares outstanding always trade at higher EV/EBITDA multiples.",
        "Differences in tax rate only — EBITDA excludes taxes, so the tax rate is the sole driver of any gap in EV/EBITDA multiples.",
        "They can't — identical EBITDA mathematically implies identical EV, so the multiples must be the same in an efficient market.",
      ],
    },
  },
  {
    question: "Walk me through the three statements for a $50 goodwill impairment (25% tax rate, assume it is tax-deductible).",
    answer:
      "IS: pre-tax income −$50, net income −$37.50. CFS: NI −$37.50, add back the $50 non-cash impairment, cash +$12.50. BS: goodwill −$50, cash +$12.50 (assets −$37.50); retained earnings −$37.50. Note: book impairments are often NOT tax-deductible in practice, in which case NI falls the full $50 and cash is unchanged — state your assumption.",
    category: "Accounting",
    difficulty: "Hard",
    firms: ["Deutsche Bank", "Barclays"],
    topics: ["three statements", "goodwill"],
    careerTracks: IB,
    mcq: {
      c: "NI ↓ $37.50; add back $50 so cash ↑ $12.50; goodwill ↓ $50, assets ↓ $37.50, RE ↓ $37.50.",
      w: [
        "NI ↓ $37.50; no add-back so cash ↓ $37.50; goodwill ↓ $50, assets ↓ $87.50, RE ↓ $37.50.",
        "NI ↓ $50; add back $50 so cash unchanged; goodwill ↓ $50, RE ↓ $37.50.",
        "NI ↓ $37.50; add back $50 so cash ↑ $12.50; goodwill ↓ $50, assets ↓ $37.50, RE ↓ $50.",
      ],
    },
  },
  {
    question: "Why can EV/EBITDA be misleading for capital-intensive businesses, and what would you use instead?",
    answer:
      "EBITDA ignores CapEx, so two companies with the same EBITDA can generate very different cash if one must reinvest heavily (telecom, industrials, airlines). Use EV/(EBITDA − CapEx), EV/EBIT, or FCF yield alongside EV/EBITDA.",
    category: "Valuation",
    difficulty: "Medium",
    firms: ["RBC Capital Markets", "Wells Fargo"],
    topics: ["multiples", "capex"],
    careerTracks: IB_PE,
    mcq: {
      c: "EBITDA ignores CapEx; use EV/(EBITDA − CapEx), EV/EBIT, or FCF yield.",
      w: [
        "EBITDA ignores interest; use P/E or EV/(EBITDA − interest).",
        "EBITDA ignores revenue growth; use EV/Revenue only.",
        "EBITDA double-counts depreciation; use EV/(EBITDA + D&A).",
      ],
    },
  },
  {
    question: "Rank a typical LBO capital structure from most senior to most junior.",
    answer:
      "Revolver and senior secured term loans (first lien) → second-lien loans → senior unsecured notes (high yield) → subordinated / mezzanine notes → preferred equity → common equity. Seniority drives recovery in default, so junior tranches demand higher yields.",
    category: "LBO Models",
    difficulty: "Medium",
    firms: ["Wells Fargo", "Jefferies", "Apollo Global Management"],
    topics: ["leveraged finance", "capital structure"],
    careerTracks: ["Investment Banking", "Private Equity", "Private Credit"],
    mcq: {
      c: "Revolver/1L term loans → 2L loans → senior unsecured notes → subordinated/mezz → preferred → common.",
      w: [
        "Senior unsecured notes → revolver/1L term loans → 2L loans → mezz → preferred → common.",
        "Revolver/1L term loans → senior unsecured notes → 2L loans → preferred → mezz → common.",
        "Revolver/1L term loans → 2L loans → mezz → senior unsecured notes → common → preferred.",
      ],
      why: "Secured debt sits above unsecured; preferred sits above common.",
    },
  },
  // ── Evercore ───────────────────────────────────────────────
  {
    question: "How do taxes flow through a DCF?",
    answer:
      "Unlevered FCF is taxed on EBIT (NOPAT = EBIT × (1 − t)), ignoring interest. The tax benefit of debt is captured in the discount rate through the after-tax cost of debt in WACC — not in the cash flows — so you don't double-count it. Cash taxes may differ from book taxes (deferred taxes, NOLs), which you can adjust for in UFCF.",
    category: "DCF",
    difficulty: "Hard",
    firms: ["Evercore", "PJT Partners"],
    topics: ["dcf", "taxes"],
    careerTracks: IB,
    mcq: {
      c: "UFCF is taxed on EBIT; the interest tax shield is captured in WACC via the after-tax cost of debt.",
      w: [
        "UFCF is taxed on EBT (after interest); WACC also uses the after-tax cost of debt to capture the shield.",
        "UFCF is taxed on EBIT; the interest tax shield is added back to UFCF each year and WACC uses pre-tax cost of debt.",
        "UFCF is untaxed; taxes are subtracted once from Enterprise Value at the end of the DCF.",
      ],
      why: "Option one double-counts the shield (in both the cash flows and WACC).",
    },
  },
  {
    question: "A company has $100 of pre-tax income, a $40 NOL balance, and a 25% tax rate. What are its cash taxes this year?",
    answer:
      "$15. The NOL offsets taxable income: ($100 − $40) × 25% = $15. Without the NOL, taxes would be $25, so the NOL saved $10 of cash. (US federal NOLs generated after 2017 can only offset up to 80% of taxable income — here $40 is under the $80 cap.)",
    category: "Accounting",
    difficulty: "Medium",
    firms: ["Evercore", "Houlihan Lokey"],
    topics: ["nol", "taxes"],
    careerTracks: IB,
    mcq: {
      c: "$15",
      w: ["$25", "$10", "$0"],
      why: "NOLs reduce taxable income, not taxes dollar-for-dollar: (100 − 40) × 25% = $15. The $10 is the tax SAVED.",
    },
  },
  {
    question: "What is Section 382 and how does it affect an acquirer's use of a target's NOLs?",
    answer:
      "After an ownership change (>50% shift), Section 382 caps the annual NOL usage at the target's equity purchase price × the IRS long-term tax-exempt rate. This limits how quickly the acquirer can capture the NOL's value, so you value the NOL as the PV of the capped annual tax savings.",
    category: "Merger Models",
    difficulty: "Hard",
    firms: ["Evercore", "PJT Partners", "Lazard"],
    topics: ["nol", "m&a tax"],
    careerTracks: IB,
    mcq: {
      c: "It caps annual NOL usage at equity purchase price × the long-term tax-exempt rate after a >50% ownership change.",
      w: [
        "It eliminates all target NOLs after any acquisition, regardless of ownership change.",
        "It caps annual NOL usage at the target's EBITDA × the corporate tax rate after a >20% ownership change.",
        "It lets the acquirer use 100% of the target's NOLs immediately in the year of the deal.",
      ],
    },
  },
  {
    question: "Tell me about a time your initial read on something was wrong and how you corrected it.",
    answer:
      "Pick a real example where you formed a view quickly (on data, a person, or a project), noticed disconfirming evidence, changed course, and improved the outcome. Interviewers are testing intellectual honesty and attention to detail — exactly what's needed when a model or deal assumption is wrong.",
    category: "Behavioral",
    difficulty: "Medium",
    firms: ["Evercore"],
    topics: ["behavioral"],
    careerTracks: [],
    mcq: {
      c: "A real example: your first view, the evidence that changed it, how you corrected course, and the improved result.",
      w: [
        "An example where you were initially right and others were wrong, to show strong judgment.",
        "A hypothetical about how you would handle being wrong, since real examples can look bad.",
        "A real example where you stuck with your first read despite contrary evidence, to show conviction.",
      ],
    },
  },
  {
    question: "Why Evercore — and why M&A advisory specifically?",
    answer:
      "Tie three things together: an independent, advisory-focused model (no lending conflicts, senior banker involvement), specific recent deals or a group you've researched, and people you've spoken with. Then connect M&A to your own experiences — strategic decisions, valuation work, and wanting deal reps.",
    category: "Behavioral",
    difficulty: "Easy",
    firms: ["Evercore", "Lazard", "Centerview Partners", "Perella Weinberg Partners", "Moelis & Co"],
    topics: ["why firm", "elite boutique"],
    careerTracks: IB,
    mcq: {
      c: "Independent advisory model with senior attention, specific deals or people you've connected with, and your own reason for M&A.",
      w: [
        "It ranks highly on prestige surveys, pays more than bulge brackets, and offers the strongest exit opportunities to PE.",
        "Boutiques have better hours and less work than bulge brackets, so you'll have more time to recruit for the buy-side.",
        "You want to do leveraged lending and capital markets, which elite boutiques specialize in alongside M&A advisory.",
      ],
      why: "Elite boutiques are advisory-focused; they don't have balance-sheet lending businesses.",
    },
  },
  // ── Centerview ─────────────────────────────────────────────
  {
    question: "A company trading at 10x EBITDA issues $100 of debt to buy back $100 of stock. What happens to EV, Equity Value, and EV/EBITDA?",
    answer:
      "EV unchanged, Equity Value down $100, EV/EBITDA unchanged (EBITDA is unaffected by financing). P/E may rise or fall depending on the after-tax cost of debt vs. the earnings yield. In practice, more leverage increases risk and can change the multiple.",
    category: "Equity Value & Enterprise Value",
    difficulty: "Hard",
    firms: ["Centerview Partners", "Goldman Sachs"],
    topics: ["enterprise value", "buyback"],
    careerTracks: IB,
    mcq: {
      c: "EV unchanged; Equity Value ↓ $100; EV/EBITDA unchanged.",
      w: ["EV ↑ $100; Equity Value unchanged; EV/EBITDA rises.", "EV unchanged; Equity Value ↓ $100; EV/EBITDA falls.", "EV ↓ $100; Equity Value ↓ $100; EV/EBITDA falls."],
    },
  },
  {
    question: "Can Equity Value be negative? Can Enterprise Value?",
    answer:
      "Market Equity Value can't be negative (shares can't trade below zero thanks to limited liability), though BOOK equity can be negative. Enterprise Value CAN be negative when cash exceeds market cap plus debt — e.g., a company whose market thinks it will burn its cash.",
    category: "Equity Value & Enterprise Value",
    difficulty: "Hard",
    firms: ["Centerview Partners", "Qatalyst Partners"],
    topics: ["enterprise value"],
    careerTracks: IB,
    mcq: {
      c: "Market Equity Value can't be negative (book equity can); Enterprise Value can be negative if cash exceeds equity value plus debt.",
      w: [
        "Market Equity Value can be negative if liabilities exceed assets; Enterprise Value can never be negative because debt is always added.",
        "Neither can be negative — both are bounded at zero by limited liability, so a net-cash company just has EV of zero.",
        "Both can be negative whenever the company reports a net loss, since negative earnings imply negative value.",
      ],
    },
  },
  // ── PJT / Houlihan / Perella / Guggenheim / Lazard (RX) ────
  {
    question: "What is the difference between Chapter 7 and Chapter 11 bankruptcy?",
    answer:
      "Chapter 7 is liquidation: a trustee sells assets and distributes proceeds by priority. Chapter 11 is reorganization: the company usually continues operating as debtor-in-possession, renegotiates claims under a plan of reorganization, and emerges with a new capital structure.",
    category: "Restructuring",
    difficulty: "Easy",
    firms: ["PJT Partners", "Houlihan Lokey", "Perella Weinberg Partners", "Lazard"],
    topics: ["restructuring", "bankruptcy"],
    careerTracks: RX,
    mcq: {
      c: "Ch. 7 = liquidation run by a trustee; Ch. 11 = reorganization, usually with management as debtor-in-possession.",
      w: [
        "Ch. 7 = reorganization run by a trustee; Ch. 11 = liquidation with management as debtor-in-possession.",
        "Ch. 7 = reorganization for individuals only; Ch. 11 = liquidation for corporations only.",
        "Ch. 7 = out-of-court exchange offer; Ch. 11 = liquidation run by creditors.",
      ],
    },
  },
  {
    question: "What is DIP financing and why are lenders willing to provide it?",
    answer:
      "Debtor-in-possession financing funds a company during Chapter 11. Lenders get court-approved super-priority status (and often priming liens) ahead of pre-petition claims, plus high fees/spreads, which makes lending to a bankrupt company relatively safe. It's frequently provided by existing lenders to protect their position.",
    category: "Restructuring",
    difficulty: "Medium",
    firms: ["PJT Partners", "Houlihan Lokey", "Guggenheim Partners"],
    topics: ["restructuring", "dip"],
    careerTracks: RX,
    mcq: {
      c: "Financing during Ch. 11 that gets court-approved super-priority (often priming liens) over pre-petition claims.",
      w: [
        "Financing during Ch. 11 that ranks pari passu with existing unsecured bonds.",
        "Financing provided after emergence from Ch. 11 to fund the new equity.",
        "Financing during Ch. 7 that ranks behind all existing creditors in exchange for equity.",
      ],
    },
  },
  {
    question: "What is the absolute priority rule?",
    answer:
      "In bankruptcy, a senior class must be paid in full before any junior class receives value (secured → unsecured → subordinated → preferred → common). In practice, negotiated plans sometimes give 'gifts' or 'tips' to junior classes to gain consent and avoid litigation.",
    category: "Restructuring",
    difficulty: "Easy",
    firms: ["Lazard", "PJT Partners", "Houlihan Lokey"],
    topics: ["restructuring"],
    careerTracks: RX,
    mcq: {
      c: "A senior class must be paid in full before any junior class receives value; deviations happen through negotiated consent.",
      w: [
        "All classes are paid pro rata based on the face value of their claims, regardless of seniority.",
        "Equity holders keep their shares as long as the company continues operating.",
        "A junior class must be paid in full before senior secured lenders can enforce their liens.",
      ],
    },
  },
  {
    question: "What is the fulcrum security in a restructuring?",
    answer:
      "The most senior class of claims that is NOT fully covered by the company's enterprise value — it's where value 'runs out.' Holders of the fulcrum typically receive most of the reorganized equity, so distressed investors try to buy it.",
    category: "Restructuring",
    difficulty: "Hard",
    firms: ["Houlihan Lokey", "PJT Partners", "Apollo Global Management"],
    topics: ["restructuring", "distressed"],
    careerTracks: RX,
    mcq: {
      c: "The most senior class not fully covered by enterprise value — it usually receives the reorganized equity.",
      w: [
        "The most junior class that is fully covered by enterprise value — it usually receives cash in full.",
        "The most senior secured class — it's always repaid in cash at par.",
        "The DIP facility — it converts into the new equity on emergence.",
      ],
    },
  },
  {
    question: "What is a 363 sale and what is a stalking horse bid?",
    answer:
      "A Section 363 sale lets a debtor sell assets during bankruptcy, with court approval, 'free and clear' of liens. A stalking horse is the initial bidder whose offer sets the floor for the auction; in exchange it usually receives a break-up fee and expense reimbursement if outbid.",
    category: "Restructuring",
    difficulty: "Medium",
    firms: ["Perella Weinberg Partners", "Guggenheim Partners", "Houlihan Lokey"],
    topics: ["restructuring", "distressed m&a"],
    careerTracks: RX,
    mcq: {
      c: "A court-approved asset sale free and clear of liens; the stalking horse sets the floor bid and gets a break-up fee if topped.",
      w: [
        "A court-approved asset sale that keeps existing liens attached; the stalking horse is the final winning bidder.",
        "An out-of-court asset sale; the stalking horse is the creditor committee's advisor.",
        "A court-approved asset sale free and clear of liens; the stalking horse bids last and pays a break-up fee if it loses.",
      ],
    },
  },
  {
    question: "What is a fairness opinion and what does it NOT say?",
    answer:
      "An opinion from a financial advisor to a board that the consideration in a transaction is fair, from a financial point of view, to shareholders (based on valuation analyses). It does NOT say the price is the best achievable or recommend how shareholders should vote.",
    category: "Valuation",
    difficulty: "Medium",
    firms: ["Houlihan Lokey", "Duff & Phelps (Kroll)"],
    topics: ["fairness opinion"],
    careerTracks: IB,
    mcq: {
      c: "That the consideration is fair from a financial point of view — not that it's the best possible price or how to vote.",
      w: [
        "That the price is the highest achievable — and it recommends how shareholders should vote.",
        "That the transaction complies with securities law — issued by outside counsel.",
        "That the target's financial statements are free of material misstatement — issued by auditors.",
      ],
    },
  },
  // ── Moelis ─────────────────────────────────────────────────
  {
    question: "Buyer: $100 net income, 100 shares. It buys a target with $20 of net income for $300, funded with debt at 5% pre-tax, 25% tax. What is pro-forma EPS?",
    answer:
      "$1.0875 (8.75% accretive). After-tax interest = $300 × 5% × (1 − 25%) = $11.25. Pro-forma NI = $100 + $20 − $11.25 = $108.75 on 100 shares (no new shares in a debt deal).",
    category: "Merger Models",
    difficulty: "Hard",
    firms: ["Moelis & Co", "Evercore", "Jefferies"],
    topics: ["accretion dilution", "merger math"],
    careerTracks: IB,
    mcq: {
      c: "$1.0875 — 8.75% accretive",
      w: ["$1.05 — 5.0% accretive", "$1.20 — 20.0% accretive", "$0.9625 — 3.75% dilutive"],
      why: "$1.05 forgets the interest tax shield; $1.20 forgets interest entirely.",
    },
  },
  // ── Jefferies / Guggenheim / Qatalyst ──────────────────────
  {
    question: "How would you value a company with negative EBITDA?",
    answer:
      "Use EV/Revenue or EV/Gross Profit vs. comparable growth peers, a DCF with a long projection period until margins normalize, and operating metrics (users, ARR, unit economics). Cross-check with precedent transactions or a future-multiple approach discounted back.",
    category: "Valuation",
    difficulty: "Medium",
    firms: ["Jefferies", "Qatalyst Partners", "Guggenheim Partners"],
    topics: ["valuation", "growth"],
    careerTracks: IB,
    mcq: {
      c: "EV/Revenue or EV/Gross Profit, a longer-horizon DCF, and operating metrics like ARR or unit economics.",
      w: [
        "EV/EBITDA using the negative multiple — a more negative multiple means a cheaper stock.",
        "P/E using trailing losses — negative P/E ratios indicate undervaluation.",
        "Liquidation value only — companies with negative EBITDA have no going-concern value.",
      ],
    },
  },
  {
    question: "What is the Rule of 40 in software?",
    answer:
      "Revenue growth % plus profit margin % (EBITDA or FCF margin) should be ≥ 40%. It balances growth and profitability: a company growing 50% can run −10% margins; one growing 10% should earn 30% margins. Companies above 40 tend to command premium EV/Revenue multiples.",
    category: "Valuation",
    difficulty: "Easy",
    firms: ["Qatalyst Partners", "Morgan Stanley", "Goldman Sachs"],
    topics: ["tmt", "software"],
    careerTracks: ["Investment Banking", "Venture Capital", "Tech/Startup"],
    mcq: {
      c: "Revenue growth % + profit (EBITDA/FCF) margin % ≥ 40%.",
      w: ["Revenue growth % − profit margin % ≥ 40%.", "Gross margin % + net retention % ≥ 40%.", "Revenue growth % ≥ 40% regardless of margin."],
    },
  },
  // ── Middle market / Harris Williams / William Blair / Baird ─
  {
    question: "Walk me through a typical sell-side M&A process.",
    answer:
      "Prep (valuation, teaser, CIM, buyer list) → outreach and NDAs → CIM distribution → first-round non-binding IOIs → management presentations and data room diligence → final LOIs / bids with markups of the purchase agreement → negotiate and sign → regulatory approvals and close. Typically 4–6+ months.",
    category: "M&A Process",
    difficulty: "Medium",
    firms: ["Harris Williams", "William Blair", "Baird", "Houlihan Lokey"],
    topics: ["sell-side", "m&a process"],
    careerTracks: IB_PE,
    mcq: {
      c: "Teaser/NDA → CIM → first-round IOIs → management presentations & data room → final bids/LOIs → sign → close.",
      w: [
        "CIM → LOIs → teaser/NDA → management presentations → IOIs → sign → close.",
        "Teaser/NDA → final bids/LOIs → CIM → first-round IOIs → data room → sign → close.",
        "Teaser/NDA → CIM → sign → management presentations → IOIs → close.",
      ],
      why: "Non-binding IOIs come before management meetings; binding-ish LOIs/final bids come after diligence.",
    },
  },
  {
    question: "Why middle-market investment banking instead of a bulge bracket?",
    answer:
      "Lean deal teams mean more responsibility and client exposure earlier, many sell-side processes for founder/PE-owned companies, and sector specialization. Back it with a specific firm's deal mix (e.g., sponsor sell-sides in your sector of interest) and people you've spoken with.",
    category: "Behavioral",
    difficulty: "Easy",
    firms: ["Harris Williams", "William Blair", "Baird", "Lincoln International", "Houlihan Lokey"],
    topics: ["why firm", "middle market"],
    careerTracks: IB,
    mcq: {
      c: "Leaner teams with more responsibility, frequent sell-side processes for founder/PE-owned companies, and a specific deal mix you've researched.",
      w: [
        "It's less competitive to get into, so it's a safer backup — and analysts can lateral to a bulge bracket after a year.",
        "Middle-market banks focus mainly on mega-cap public M&A and large IPOs, giving more exposure to Fortune 500 clients.",
        "The hours are shorter and analysts mostly build pitch books rather than being staffed on live sell-side processes.",
      ],
    },
  },
  {
    question: "What's the difference between a spin-off, a carve-out IPO, and a split-off?",
    answer:
      "Spin-off: parent distributes subsidiary shares pro rata to its shareholders; no cash raised; can be tax-free under Section 355. Carve-out: parent sells a minority stake in the subsidiary via IPO, raising cash. Split-off: shareholders exchange parent shares for subsidiary shares (an exchange offer), shrinking the parent's share count.",
    category: "M&A Process",
    difficulty: "Hard",
    firms: ["Rothschild & Co", "Lazard", "Goldman Sachs"],
    topics: ["spin-off", "corporate finance"],
    careerTracks: IB,
    mcq: {
      c: "Spin-off: pro-rata share distribution, no cash; carve-out: IPO of a stake for cash; split-off: shareholders exchange parent shares for sub shares.",
      w: [
        "Spin-off: IPO of a stake for cash; carve-out: pro-rata share distribution, no cash; split-off: sale to a strategic buyer.",
        "Spin-off: pro-rata share distribution for cash; carve-out: exchange offer; split-off: IPO of a stake.",
        "All three raise cash for the parent; they differ only in the tax treatment.",
      ],
    },
  },
  // ── Buy-side: Blackstone / KKR / Apollo / hedge funds ──────
  {
    question: "Paper LBO: buy a company with $100M EBITDA at 10x using 60% debt. In 5 years EBITDA is $150M, exit at 10x, and $300M of debt remains. What are the MOIC and approximate IRR?",
    answer:
      "Entry EV = $1,000M; debt $600M; equity $400M. Exit EV = $1,500M; less $300M debt = $1,200M equity. MOIC = 3.0x. IRR ≈ 25% (3x over 5 years: 3^(1/5) ≈ 1.246).",
    category: "LBO Models",
    difficulty: "Hard",
    firms: ["Blackstone", "KKR", "Bain Capital", "Apollo Global Management"],
    topics: ["paper lbo", "irr"],
    careerTracks: ["Private Equity", "Investment Banking"],
    mcq: {
      c: "3.0x MOIC, ~25% IRR",
      w: ["2.25x MOIC, ~18% IRR", "3.75x MOIC, ~30% IRR", "1.5x MOIC, ~8% IRR"],
      why: "2.25x ignores debt paydown (subtracts the original $600M); 3.75x forgets to subtract debt; 1.5x compares EV to EV.",
    },
  },
  {
    question: "What does a dividend recap in year 2 do to a sponsor's IRR and MOIC?",
    answer:
      "It usually increases IRR because cash is returned earlier (time value). MOIC is roughly unchanged or slightly lower, since the added debt and interest reduce exit equity by about as much (or more) than the dividend paid.",
    category: "LBO Models",
    difficulty: "Medium",
    firms: ["KKR", "Blackstone", "Carlyle"],
    topics: ["dividend recap", "irr"],
    careerTracks: ["Private Equity"],
    mcq: {
      c: "IRR usually ↑ (earlier cash back); MOIC roughly flat or slightly ↓ (more debt and interest at exit).",
      w: [
        "IRR usually ↓ (more leverage and interest); MOIC ↑ (the extra dividend is added on top of exit equity).",
        "Both IRR and MOIC rise significantly, since the dividend is pure upside and exit equity is unaffected.",
        "Neither changes — a recap only shifts value between lenders and the company, not the sponsor.",
      ],
    },
  },
  {
    question: "Why do sponsors and borrowers prefer covenant-lite term loans, and what's the risk for lenders?",
    answer:
      "Cov-lite loans drop financial maintenance covenants (only incurrence tests remain), so a borrower can't trip a default just because EBITDA declines — giving sponsors flexibility through downturns. Lenders lose early-warning triggers and negotiating leverage, which can mean lower recoveries when they finally get a seat at the table.",
    category: "Credit",
    difficulty: "Medium",
    firms: ["Apollo Global Management", "Blackstone", "Ares Management"],
    topics: ["private credit", "covenants"],
    careerTracks: ["Private Credit", "Private Equity", "Investment Banking"],
    mcq: {
      c: "No maintenance tests means no default from EBITDA declines alone; lenders lose early warning and leverage, risking lower recoveries.",
      w: [
        "No incurrence tests means the borrower can never add debt; lenders gain more control.",
        "Cov-lite loans carry fixed rates, so borrowers avoid floating-rate risk; lenders bear rate risk.",
        "No maintenance tests means lenders get quarterly cash sweeps instead; borrowers lose flexibility.",
      ],
    },
  },
  {
    question: "A stock has 20M shares sold short and average daily volume of 4M shares. What is days to cover, and why does it matter?",
    answer:
      "Days to cover = short interest ÷ average daily volume = 20M ÷ 4M = 5 days. Higher days to cover means it would take longer for shorts to exit, raising short-squeeze risk on positive news.",
    category: "Hedge Funds",
    difficulty: "Easy",
    firms: ["Citadel", "Point72", "Millennium Management"],
    topics: ["short selling"],
    careerTracks: ["Hedge Fund", "Sales & Trading", "Asset Management"],
    mcq: {
      c: "5 days — higher means more short-squeeze risk.",
      w: ["0.2 days — higher means less short-squeeze risk.", "5 days — higher means less short-squeeze risk.", "80 days — higher means more short-squeeze risk."],
    },
  },
  {
    question: "A bond has a modified duration of 7. If yields rise by 100 basis points, approximately how does its price change?",
    answer:
      "About −7%. %ΔPrice ≈ −Modified Duration × ΔYield = −7 × 1% = −7%. Convexity makes the actual loss slightly smaller for a rate increase.",
    category: "Capital Markets",
    difficulty: "Medium",
    firms: ["Bridgewater Associates", "PIMCO", "Goldman Sachs"],
    topics: ["fixed income", "duration"],
    careerTracks: ["Sales & Trading", "Asset Management", "Hedge Fund"],
    mcq: {
      c: "≈ −7%",
      w: ["≈ +7%", "≈ −0.7%", "≈ −14%"],
      why: "Prices and yields move inversely; 100bp = 1%, so −7 × 1%.",
    },
  },

  // ── Hard general drills (common across banks) ─────────────
  {
    question: "Year-5 free cash flow is $100, the long-term growth rate is 3%, and WACC is 10%. What is the Gordon Growth terminal value?",
    answer:
      "TV = FCF × (1 + g) / (WACC − g) = $100 × 1.03 / 7% ≈ $1,471. Remember this is the value at the end of year 5, so it must still be discounted back five years.",
    category: "DCF",
    difficulty: "Medium",
    firms: ["Goldman Sachs", "Morgan Stanley", "Evercore"],
    topics: ["dcf", "terminal value"],
    careerTracks: IB_PE,
    mcq: {
      c: "≈ $1,471",
      w: ["≈ $1,429", "≈ $1,030", "≈ $1,000"],
      why: "$1,429 forgets to grow FCF by (1 + g); $1,030 and $1,000 divide by WACC instead of (WACC − g).",
    },
  },
  {
    question: "A peer's unlevered beta is 0.8. Your company has a 50% debt-to-equity ratio and a 25% tax rate. What is its levered beta?",
    answer:
      "Levered β = Unlevered β × [1 + (1 − t) × D/E] = 0.8 × [1 + 0.75 × 0.5] = 0.8 × 1.375 = 1.10.",
    category: "DCF",
    difficulty: "Hard",
    firms: ["J.P. Morgan", "Lazard", "Centerview Partners"],
    topics: ["wacc", "beta"],
    careerTracks: IB_PE,
    mcq: {
      c: "1.10",
      w: ["1.20", "0.90", "0.58"],
      why: "1.20 ignores taxes; 0.90 multiplies by t instead of (1 − t); 0.58 unlevers instead of relevering.",
    },
  },
  {
    question: "Why does using the mid-year convention increase a DCF valuation?",
    answer:
      "It assumes cash flows arrive mid-year on average rather than at year-end, so each cash flow is discounted by half a period less (e.g., 0.5, 1.5, 2.5 years). Smaller discount factors → higher present value.",
    category: "DCF",
    difficulty: "Medium",
    firms: ["Citi", "UBS", "Rothschild & Co"],
    topics: ["dcf"],
    careerTracks: IB,
    mcq: {
      c: "Each cash flow is discounted half a period less, so present values are higher.",
      w: [
        "Each cash flow is discounted half a period more, but terminal value grows faster.",
        "It raises the WACC by half, which increases the terminal growth rate.",
        "It adds a sixth year of projections, increasing total cash flows.",
      ],
    },
  },
  {
    question: "Inventory of $100 is written down (25% tax rate). Walk through the three statements.",
    answer:
      "IS: pre-tax income −$100, net income −$75. CFS: NI −$75, add back the $100 non-cash write-down, cash +$25. BS: inventory −$100, cash +$25 (assets −$75); retained earnings −$75. Balances.",
    category: "Accounting",
    difficulty: "Medium",
    firms: ["Bank of America", "UBS", "Wells Fargo"],
    topics: ["three statements"],
    careerTracks: IB,
    mcq: {
      c: "NI ↓ $75; add back $100 so cash ↑ $25; inventory ↓ $100, assets ↓ $75, RE ↓ $75.",
      w: [
        "NI ↓ $75; no add-back so cash ↓ $75; inventory ↓ $100, assets ↓ $175, RE ↓ $75.",
        "NI ↓ $100; add back $100 so cash unchanged; inventory ↓ $100, RE ↓ $100.",
        "NI ↓ $75; add back $100 so cash ↑ $25; inventory ↓ $100, assets ↓ $75, RE ↓ $100.",
      ],
    },
  },
  {
    question: "A company repays $100 of debt principal. What happens on the three statements?",
    answer:
      "No Income Statement effect from the principal itself (only future interest falls). CFS: −$100 in cash flow from financing. BS: cash −$100 and debt −$100, so both sides fall by $100 and it balances.",
    category: "Accounting",
    difficulty: "Easy",
    firms: ["Barclays", "Citi"],
    topics: ["three statements", "debt"],
    careerTracks: IB,
    mcq: {
      c: "No IS effect; CFF −$100; cash −$100 and debt −$100.",
      w: [
        "NI ↓ $75; CFO −$75; cash −$75 and debt −$100.",
        "No IS effect; CFI −$100; cash −$100 and equity −$100.",
        "NI ↓ $100; CFF −$100; cash −$100 and debt −$100.",
      ],
      why: "Principal repayment isn't an expense; only interest hits the IS.",
    },
  },
  {
    question: "Two otherwise identical companies: one has net cash, the other has net debt. Which has the higher P/E, all else equal?",
    answer:
      "Typically the net-cash company. Cash counts at full value in equity value but only earns after-tax interest (cash yielding 3% after tax is effectively valued at ~33x its earnings), which pulls the blended P/E up. Cheap debt does the opposite. This is why P/E is distorted by capital structure and EV/EBITDA is preferred when comparing companies.",
    category: "Valuation",
    difficulty: "Hard",
    firms: ["Goldman Sachs", "Centerview Partners"],
    topics: ["multiples", "capital structure"],
    careerTracks: IB,
    mcq: {
      c: "Usually the net-cash company — cash adds fully to equity value but earns little, inflating P/E; that's why EV multiples are preferred.",
      w: [
        "Usually the net-debt company — interest expense is tax-deductible, which raises net income and inflates P/E vs. peers.",
        "They must have the same P/E — identical operations imply identical EBITDA, net income, and equity value.",
        "Usually the net-debt company — debt is added to equity value in the P/E numerator, which inflates the multiple.",
      ],
    },
  },
];
