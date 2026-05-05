import type { SeedQuestion } from "./questions";

/** Additional questions (Deutsche Bank LBO Manual, Citi Credit Primer). */
function keywordizeExtended(answer: string, tags: string[]): string[] {
  const phrases = (answer.toLowerCase().match(/[a-z]{4,}(?:\s+[a-z]{4,})?/g) ?? []).filter(
    (x) => !["this", "that", "with", "from", "into", "also", "over", "year", "years"].includes(x),
  );
  const seeds = [...tags.map((t) => t.toLowerCase()), ...phrases];
  return Array.from(new Set(seeds)).slice(0, 6);
}

const BASE_SEED_QUESTIONS_EXTENDED = [
  {
    question: "What are the key characteristics of a suitable LBO candidate?",
    answer:
      "Strong and stable free cash flows to service debt. Leading market position or clearly defined niche. Low capital expenditure requirements. Strong asset base for collateral. Experienced management team. Identifiable operational improvements. Clear exit path. Low existing debt levels.",
    category: "LBO Models",
    subcategory: "Concepts",
    difficulty: "Medium",
    tags: ["LBO", "candidates", "deal screening"],
    source: "Deutsche Bank LBO Training Manual",
  },
  {
    question: "What is the 'hockey stick' effect in financial modeling and why is it a red flag?",
    answer:
      "The hockey stick effect occurs when projections show dramatic improvement in financial performance (e.g., EBIT margins jumping from 5% to 10% in year 1) with no clear justification. It undermines model credibility because past performance is usually the best indicator of future performance. Analysts should be skeptical of any dramatic unexplained shifts.",
    category: "LBO Models",
    subcategory: "Concepts",
    difficulty: "Medium",
    tags: ["modeling", "projections", "red flags"],
    source: "Deutsche Bank LBO Training Manual",
  },
  {
    question:
      "Why does interest expense create a circularity problem in financial models, and what are the two solutions?",
    answer:
      "Interest expense depends on average debt balance, but debt balance depends on net income (which is affected by interest expense), creating a circular reference. Two solutions: (1) Use prior year's debt balance to calculate interest — eliminates circularity but may be inaccurate if balances fluctuate widely. (2) Use average debt balance and iterate 7+ times to let the model converge on the correct value.",
    category: "LBO Models",
    subcategory: "Calculations",
    difficulty: "Hard",
    tags: ["modeling", "circularity", "interest expense", "technical"],
    source: "Deutsche Bank LBO Training Manual",
  },
  {
    question: "What is a management ratchet in an LBO, and why do PE sponsors include it?",
    answer:
      "A ratchet is a mechanism that gives management an increased share of equity if returns exceed a predetermined threshold. For example, management might own 5% of equity normally but earn up to 15% if the sponsor achieves a 25%+ IRR. Sponsors include it because the incremental value created by motivated management outweighs the equity dilution — it aligns incentives without requiring large upfront management investment.",
    category: "LBO Models",
    subcategory: "Concepts",
    difficulty: "Hard",
    tags: ["LBO", "management", "incentives", "ratchet", "PE"],
    source: "Deutsche Bank LBO Training Manual",
  },
  {
    question: "What is the difference between enterprise value and equity value in an LBO exit?",
    answer:
      "Exit Enterprise Value = Exit EBITDA × Exit Multiple. Exit Equity Value = Exit EV - Remaining Debt + Remaining Cash. The PE sponsor's return is calculated on equity value only — they invested equity and receive equity proceeds. The debt is repaid to lenders, not the sponsor. This is why leverage amplifies returns: the same EV growth translates to much larger equity value growth.",
    category: "LBO Models",
    subcategory: "Calculations",
    difficulty: "Medium",
    tags: ["LBO", "exit", "equity value", "enterprise value"],
    source: "Deutsche Bank LBO Training Manual",
  },
  {
    question: "Walk me through how the three financial statements are built in a financial model.",
    answer:
      "Start with the Income Statement: project revenue, COGS, operating expenses, D&A, interest expense, taxes → get Net Income. Then build the Cash Flow Statement: start with Net Income, add back D&A and other non-cash items, adjust for working capital changes → get CFO. Add CapEx (CFI) and debt/equity transactions (CFF) → get net change in cash. Finally build the Balance Sheet: prior year + CFS changes for each line item. Cash = ending cash from CFS. PP&E = prior PP&E + CapEx - D&A. Debt = prior debt - repayments. Equity = prior equity + net income - dividends. Check: Assets = Liabilities + Equity.",
    category: "Accounting",
    subcategory: "Calculations",
    difficulty: "Hard",
    tags: ["modeling", "three statements", "balance sheet", "technical"],
    source: "Deutsche Bank LBO Training Manual",
  },
  {
    question: "What drives each line item on the Balance Sheet in a financial model?",
    answer:
      "Cash: net change in cash from CFS. Net PP&E: prior PP&E + CapEx - D&A - asset sales. Long-term debt: repayment schedule from CFS. Accounts Receivable: revenue × (DSO/365). Inventory: COGS × (DIO/365). Accounts Payable: COGS × (DPO/365). Retained Earnings: prior retained earnings + net income - dividends. Each BS line ties back to a CFS entry — that's how the model balances.",
    category: "Accounting",
    subcategory: "Calculations",
    difficulty: "Hard",
    tags: ["modeling", "balance sheet", "drivers", "technical"],
    source: "Deutsche Bank LBO Training Manual",
  },
  {
    question: "What is free cash flow and why do credit analysts prefer it over net income?",
    answer:
      "Free Cash Flow = Cash Flow from Operations - CapEx. Credit analysts prefer FCF because it represents actual cash available to service debt after maintaining the business. Net income includes non-cash items (D&A, stock comp) and excludes CapEx, so it overstates or understates real cash generation. A company can be profitable but cash flow negative if it requires heavy reinvestment.",
    category: "Finance Concepts",
    subcategory: "Concepts",
    difficulty: "Medium",
    tags: ["FCF", "credit analysis", "cash flow", "net income"],
    source: "Citi Credit Primer 2005",
  },
  {
    question: "What are 'credit landmines' and what are common examples?",
    answer:
      "Credit landmines are hidden vulnerabilities that can impair a company's creditworthiness. Common examples: off-balance sheet liabilities (operating leases, pension obligations), aggressive revenue recognition, channel stuffing, rising DSOs indicating collection problems, deteriorating working capital trends, underfunded pension plans, covenant violations, and related-party transactions. Credit analysts specifically look for these because they don't show up in headline earnings.",
    category: "Finance Concepts",
    subcategory: "Concepts",
    difficulty: "Hard",
    tags: ["credit analysis", "due diligence", "accounting quality", "red flags"],
    source: "Citi Credit Primer 2005",
  },
  {
    question: "What are the key credit ratios and what do they measure?",
    answer:
      "Leverage: Net Debt/EBITDA (how many years of earnings to repay debt — typically <4x for investment grade). Coverage: EBITDA/Interest Expense (can the company service its debt — typically >3x). Debt/Capital (% of capital structure that is debt). FCF/Debt (how quickly FCF pays down debt). Current Ratio = Current Assets/Current Liabilities (short-term liquidity). These ratios are the backbone of credit analysis and LBO underwriting.",
    category: "Finance Concepts",
    subcategory: "Concepts",
    difficulty: "Medium",
    tags: ["credit", "leverage", "ratios", "LBO", "underwriting"],
    source: "Citi Credit Primer 2005",
  },
  {
    question: "What is revenue recognition and why does it matter for credit analysis?",
    answer:
      "Revenue recognition determines when a company records revenue — upon delivery of goods/services, not when cash is received. It matters for credit analysis because aggressive recognition (booking revenue before delivery, channel stuffing, percentage-of-completion manipulation) inflates reported earnings without improving cash flow. Rising accounts receivable relative to revenue is a key warning sign. Credit analysts always check whether revenue growth is accompanied by cash flow growth.",
    category: "Accounting",
    subcategory: "Concepts",
    difficulty: "Medium",
    tags: ["revenue recognition", "accounting quality", "credit analysis", "red flags"],
    source: "Citi Credit Primer 2005",
  },
  {
    question: "How do you analyze a company's working capital and what does deterioration signal?",
    answer:
      "Working Capital = Current Assets - Current Liabilities. Analyze via: DSO (Days Sales Outstanding = AR/Revenue × 365) — rising DSO means customers paying slower. DIO (Days Inventory Outstanding = Inventory/COGS × 365) — rising DIO means inventory building up. DPO (Days Payable Outstanding = AP/COGS × 365) — falling DPO means paying suppliers faster. Deteriorating DSO + DIO with falling DPO = working capital drain = cash flow problem even if earnings look fine.",
    category: "Accounting",
    subcategory: "Calculations",
    difficulty: "Hard",
    tags: ["working capital", "DSO", "DIO", "DPO", "credit analysis"],
    source: "Citi Credit Primer 2005",
  },
  {
    question: "What is the difference between investment grade and high yield (leveraged) credit?",
    answer:
      "Investment grade: rated BBB-/Baa3 or higher by S&P/Moody's. Lower leverage (typically <3x Net Debt/EBITDA), investment-grade covenants (maintenance), lower interest rates. High yield (junk): rated BB+/Ba1 or lower. Higher leverage (typically 4-7x+ in LBOs), incurrence-based covenants (only triggered by actions, not maintenance), higher interest rates reflecting higher default risk. LBO financing is almost always high yield / leveraged loans.",
    category: "Finance Concepts",
    subcategory: "Concepts",
    difficulty: "Medium",
    tags: ["credit", "high yield", "leveraged finance", "LBO", "ratings"],
    source: "Citi Credit Primer 2005",
  },
  {
    question: "What are the steps to build a comparable company analysis?",
    answer:
      "(1) Select comparable companies based on industry, size, geography, business model. (2) Gather financial data: revenue, EBITDA, EBIT, net income, market cap, debt, cash. (3) Calculate EV = market cap + debt - cash + preferred + minority interest. (4) Calculate multiples: EV/Revenue, EV/EBITDA, EV/EBIT, P/E. (5) Apply median or selected range of multiples to the subject company's metrics. (6) Adjust for differences: growth, margins, leverage, size.",
    category: "Valuation",
    subcategory: "Concepts",
    difficulty: "Medium",
    tags: ["comps", "comparable companies", "valuation", "multiples"],
    source: "Deutsche Bank LBO Training Manual",
  },
  {
    question: "What is the difference between maintenance covenants and incurrence covenants?",
    answer:
      "Maintenance covenants (investment grade): must be met continuously — e.g., Net Debt/EBITDA must stay below 3x at all times. Tested quarterly. Breach triggers technical default. Incurrence covenants (high yield/leveraged loans): only triggered when the borrower takes a specific action — e.g., can only incur additional debt if pro forma leverage stays below 4.5x. No breach if company deteriorates passively. HY bond issuers prefer incurrence covenants because they can't default passively.",
    category: "Finance Concepts",
    subcategory: "Concepts",
    difficulty: "Hard",
    tags: ["covenants", "leveraged finance", "high yield", "credit", "LBO"],
    source: "Citi Credit Primer 2005",
  },
];

export const SEED_QUESTIONS_EXTENDED: SeedQuestion[] = BASE_SEED_QUESTIONS_EXTENDED.map((q) => ({
  ...q,
  keywords: keywordizeExtended(q.answer, q.tags),
}));
