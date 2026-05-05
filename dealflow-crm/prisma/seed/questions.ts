/** BIWS-style seed questions for DealFlow question bank */

export type SeedQuestion = {
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  subcategory?: string;
  difficulty: string;
  tags: string[];
  source?: string;
};

function keywordize(question: string, answer: string, tags: string[]): string[] {
  const overrides: Record<string, string[]> = {
    "What is WACC?": ["weighted", "cost of equity", "cost of debt", "tax", "discount rate"],
    "Walk me through a DCF.": ["free cash flow", "discount", "terminal value", "wacc", "equity value"],
    "What is a leveraged buyout (LBO)?": ["leverage", "debt", "equity", "irr", "returns"],
  };
  if (overrides[question]) return overrides[question];

  const phrases = (answer.toLowerCase().match(/[a-z]{4,}(?:\s+[a-z]{4,})?/g) ?? []).filter(
    (x) => !["this", "that", "with", "from", "into", "also", "over", "year", "years"].includes(x),
  );
  const seeds = [...tags.map((t) => t.toLowerCase()), ...phrases];
  return Array.from(new Set(seeds)).slice(0, 5);
}

const BASE_SEED_QUESTIONS = [
  // Finance Concepts
  {
    question: "Explain the time value of money.",
    answer:
      "Money today is worth more than money in the future because of its potential to earn returns, inflation reducing purchasing power over time, and the uncertainty of future cash flows.",
    category: "Finance Concepts",
    difficulty: "Easy",
    tags: ["TVM", "basics"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "What does the Discount Rate mean?",
    answer:
      "The discount rate represents the minimum acceptable return on an investment, reflecting the riskiness of future cash flows. Higher risk = higher discount rate = lower present value.",
    category: "Finance Concepts",
    difficulty: "Medium",
    tags: ["discount rate", "valuation"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "What is WACC?",
    answer:
      "Weighted Average Cost of Capital — the blended cost of all capital sources (debt and equity), weighted by their proportion of total capital. Used as the discount rate in DCF analysis.",
    category: "Finance Concepts",
    difficulty: "Medium",
    tags: ["WACC", "capital structure"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question:
      "How much would you pay for a company that generates $100 of cash flow every year in perpetuity, with a 10% discount rate?",
    answer: "$100 / 10% = $1,000. This is a simple perpetuity: PV = Cash Flow / Discount Rate.",
    category: "Finance Concepts",
    subcategory: "Calculations",
    difficulty: "Easy",
    tags: ["perpetuity", "PV"],
    source: "BIWS 400 Questions Guide",
  },
  // Accounting
  {
    question: "What are the three financial statements and why do we need them?",
    answer:
      "Income Statement (revenue, expenses, net income over a period), Balance Sheet (assets, liabilities, equity at a point in time), Cash Flow Statement (actual cash generated). We need all three because net income ≠ cash flow — the CFS bridges that gap.",
    category: "Accounting",
    difficulty: "Easy",
    tags: ["financial statements", "IS", "BS", "CFS"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "How do the three financial statements link together?",
    answer:
      "Net Income from the IS flows to the top of the CFS. Adjustments for non-cash items and working capital changes get you to CFO. Cash at the bottom of the CFS flows to Cash on the Balance Sheet. Net Income also flows into Retained Earnings in Equity on the BS.",
    category: "Accounting",
    difficulty: "Medium",
    tags: ["linkage", "accounting"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "What is the most important financial statement?",
    answer:
      "The Cash Flow Statement, because almost all valuation is based on cash flow, and net income includes non-cash items that don't reflect real cash generation.",
    category: "Accounting",
    difficulty: "Medium",
    tags: ["CFS", "valuation"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "Why is Accounts Receivable an asset but Deferred Revenue a liability?",
    answer:
      "AR is an asset because it represents future cash to be received. Deferred Revenue is a liability because it represents future obligations — the company has the cash but hasn't delivered the product/service yet.",
    category: "Accounting",
    difficulty: "Medium",
    tags: ["AR", "deferred revenue", "working capital"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "Walk me through the impact on all three financial statements if depreciation increases by $10.",
    answer:
      "IS: Pre-tax income falls by $10, taxes fall by $4 (40% rate), net income falls by $6. CFS: Net income down $6, but add back $10 depreciation, so CFO increases by $4. BS: PP&E decreases by $10, cash increases by $4, so assets decrease by $6 net; retained earnings fall by $6, so L+E balances.",
    category: "Accounting",
    subcategory: "Calculations",
    difficulty: "Hard",
    tags: ["depreciation", "three statements"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question:
      "What happens to the three statements if you capitalize $100 of operating expenses instead of expensing them?",
    answer:
      "IS: Operating expenses fall by $100, operating income rises by $100, net income rises by $60 (after 40% tax). CFS: Net income up $60, but add CapEx of -$100 in CFI, net cash down $40. BS: New asset of $100 (less accumulated depreciation over time), retained earnings up $60.",
    category: "Accounting",
    difficulty: "Hard",
    tags: ["CapEx", "capitalization"],
    source: "BIWS 400 Questions Guide",
  },
  // Equity Value & Enterprise Value
  {
    question: "What is the difference between Equity Value and Enterprise Value?",
    answer:
      "Equity Value (market cap) = value belonging to equity holders only. Enterprise Value = value of the entire business (equity + debt - cash + preferred + minority interest). EV represents what you'd pay to acquire the whole company.",
    category: "Equity Value & Enterprise Value",
    difficulty: "Medium",
    tags: ["EV", "equity value"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "Why do we add debt and subtract cash when calculating Enterprise Value?",
    answer:
      "When you acquire a company, you take on its debt (costs you more), but you also get its cash (offsets the price). EV = Equity Value + Debt - Cash + Preferred + Minority Interest.",
    category: "Equity Value & Enterprise Value",
    difficulty: "Medium",
    tags: ["EV", "debt", "cash"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "When would Equity Value exceed Enterprise Value?",
    answer:
      "When a company has more cash than debt — meaning the cash/debt-equivalent items are negative on net, so EV < Equity Value. Common in cash-rich tech companies.",
    category: "Equity Value & Enterprise Value",
    difficulty: "Medium",
    tags: ["EV", "net cash"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: 'What are "diluted shares," and why do we use them?',
    answer:
      "Diluted shares include all shares that could exist if options, warrants, and convertibles were exercised. We use them because they represent the fully-diluted ownership and give a more conservative (higher) equity value.",
    category: "Equity Value & Enterprise Value",
    difficulty: "Medium",
    tags: ["dilution", "shares"],
    source: "BIWS 400 Questions Guide",
  },
  // Valuation
  {
    question: "What are the three main valuation methodologies?",
    answer:
      "(1) Comparable Company Analysis (trading comps) — public market multiples. (2) Precedent Transaction Analysis (deal comps) — M&A multiples paid for similar companies. (3) Discounted Cash Flow (DCF) — intrinsic value based on projected free cash flows.",
    category: "Valuation",
    difficulty: "Easy",
    tags: ["comps", "DCF", "precedents"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "Which valuation method tends to give the highest value?",
    answer:
      "Precedent transactions, because acquirers pay a control premium. DCF is most variable and can go either way. Trading comps are usually in the middle.",
    category: "Valuation",
    difficulty: "Medium",
    tags: ["precedents", "control premium"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "When would you not use a DCF?",
    answer:
      "When cash flows are unpredictable or negative (early-stage companies, distressed companies, cyclicals), when you lack reliable projections, or when the company doesn't have a stable enough model to project out 5–10 years.",
    category: "Valuation",
    difficulty: "Medium",
    tags: ["DCF", "limitations"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "What are the most common valuation multiples?",
    answer:
      "EV/EBITDA (most common), EV/Revenue (for high-growth or unprofitable companies), P/E (equity value), EV/EBIT, Price/Book (for financial institutions).",
    category: "Valuation",
    difficulty: "Easy",
    tags: ["multiples", "EV/EBITDA"],
    source: "BIWS 400 Questions Guide",
  },
  // DCF
  {
    question: "Walk me through a DCF.",
    answer:
      "Project the company's free cash flows for 5–10 years, calculate a terminal value (using exit multiple or Gordon Growth), discount all cash flows back to present using WACC, sum them up to get Enterprise Value, subtract net debt to get Equity Value, divide by diluted shares for price per share.",
    category: "DCF",
    difficulty: "Hard",
    tags: ["DCF", "terminal value", "WACC"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "What goes into WACC?",
    answer:
      "WACC = (E/V) × Cost of Equity + (D/V) × Cost of Debt × (1 - Tax Rate). Cost of Equity uses CAPM: Risk-free rate + Beta × Equity Risk Premium. Cost of Debt = pre-tax interest rate on the company's debt.",
    category: "DCF",
    difficulty: "Hard",
    tags: ["WACC", "CAPM"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "What is the terminal value and why does it matter?",
    answer:
      "Terminal value represents the value of all cash flows beyond the projection period, usually calculated via exit multiple (EV/EBITDA × final year EBITDA) or Gordon Growth Model (FCF × (1+g) / (WACC - g)). It often represents 60–80%+ of total DCF value.",
    category: "DCF",
    difficulty: "Medium",
    tags: ["terminal value", "Gordon growth"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "How does an increase in beta affect a DCF?",
    answer:
      "Higher beta → higher cost of equity → higher WACC → higher discount rate → lower present values of future cash flows → lower DCF valuation.",
    category: "DCF",
    difficulty: "Medium",
    tags: ["beta", "WACC", "sensitivity"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "What are the main sensitivities you'd run in a DCF?",
    answer:
      "WACC vs. terminal growth rate (or exit multiple) — this 2x2 table is the most common. Also revenue growth vs. EBITDA margin, and CapEx assumptions.",
    category: "DCF",
    difficulty: "Medium",
    tags: ["sensitivity", "tables"],
    source: "BIWS 400 Questions Guide",
  },
  // LBO Models
  {
    question: "What is a leveraged buyout (LBO)?",
    answer:
      "An acquisition financed primarily with debt, where the acquired company's own cash flows service the debt. A PE firm acquires a company, loads it with debt, improves operations over 3–7 years, and exits at a higher valuation, generating returns from leverage, multiple expansion, and operational improvement.",
    category: "LBO Models",
    difficulty: "Medium",
    tags: ["LBO", "PE"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "What are the three main drivers of LBO returns?",
    answer:
      "(1) Leverage — using debt amplifies equity returns. (2) Multiple expansion — buying at 7x and exiting at 9x. (3) Operational improvement — EBITDA growth through revenue growth, margin expansion, or cost cuts.",
    category: "LBO Models",
    difficulty: "Medium",
    tags: ["LBO", "returns"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "What makes a good LBO candidate?",
    answer:
      "Stable, predictable cash flows (to service debt), low existing debt, strong market position, asset-light business model, potential for operational improvement, a clear exit path, and ideally some hard assets as collateral.",
    category: "LBO Models",
    difficulty: "Medium",
    tags: ["LBO", "candidate"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "How do you calculate IRR in an LBO?",
    answer:
      "IRR is the discount rate that makes NPV of all cash flows = 0. In an LBO context: you invest equity at time 0, receive equity proceeds at exit. IRR solves for the annual return on that equity investment. Rule of thumb: 2x in 3 years ≈ 26% IRR, 2x in 5 years ≈ 15% IRR.",
    category: "LBO Models",
    subcategory: "Calculations",
    difficulty: "Hard",
    tags: ["IRR", "LBO"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "What is the difference between IRR and MOIC?",
    answer:
      "MOIC (Multiple of Invested Capital) = total cash returned / total cash invested. IRR accounts for the time value of money — same MOIC over a shorter period = higher IRR. IRR is better for comparing investments of different durations.",
    category: "LBO Models",
    difficulty: "Medium",
    tags: ["IRR", "MOIC"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "Walk me through a simple LBO model.",
    answer:
      "(1) Determine purchase price (EV = EBITDA × entry multiple). (2) Build the sources & uses (how much debt vs. equity). (3) Project EBITDA and FCF over the holding period, using FCF to pay down debt. (4) Calculate exit EV (EBITDA × exit multiple at year 5). (5) Subtract remaining debt to get exit equity value. (6) Calculate IRR and MOIC on the initial equity investment.",
    category: "LBO Models",
    difficulty: "Hard",
    tags: ["LBO", "modeling"],
    source: "BIWS 400 Questions Guide",
  },
  // Merger Models
  {
    question: "Is an acquisition accretive or dilutive — and what does that mean?",
    answer:
      "Accretive means the acquirer's EPS increases post-deal; dilutive means EPS decreases. This depends on the deal price relative to the target's earnings contribution and the cost of financing.",
    category: "Merger Models",
    difficulty: "Medium",
    tags: ["accretion", "dilution", "EPS"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "When is an all-stock deal dilutive?",
    answer:
      "When the acquirer's P/E ratio is lower than the deal's implied P/E (i.e., you're issuing expensive shares to buy cheaper earnings). If the acquirer has a high P/E and the target has a lower one, it tends to be accretive.",
    category: "Merger Models",
    difficulty: "Hard",
    tags: ["stock deal", "P/E"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "What is goodwill, and why is it created in M&A?",
    answer:
      "Goodwill = purchase price paid above the fair value of the target's net identifiable assets. It represents intangible value — brand, relationships, synergies. Goodwill sits on the acquirer's balance sheet and is tested for impairment annually.",
    category: "Merger Models",
    difficulty: "Medium",
    tags: ["goodwill", "M&A"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "What are synergies, and how do you account for them?",
    answer:
      "Revenue synergies (cross-selling, new markets) and cost synergies (headcount reduction, overlapping facilities). In a merger model, synergies increase pro forma EBITDA. They're typically given a haircut since they're uncertain, and they phase in over 1–3 years.",
    category: "Merger Models",
    difficulty: "Medium",
    tags: ["synergies", "merger model"],
    source: "BIWS 400 Questions Guide",
  },
  // Behavioral
  {
    question: "Walk me through your resume.",
    answer:
      "Structure: The Beginning (background), Finance Spark (what got you interested), Growing Interest (relevant experiences), Why You're Here Today (why this firm/role). Keep it to ~2 minutes, forward-looking, and specific.",
    category: "Behavioral",
    difficulty: "Easy",
    tags: ["story", "interview"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "Why investment banking?",
    answer:
      "The only acceptable answer: you want to work on deals from start to finish across many companies and industries. You've had exposure but want more deal reps and complexity. Avoid \"learning,\" \"culture,\" or \"exit opportunities.\"",
    category: "Behavioral",
    difficulty: "Medium",
    tags: ["why IB", "motivation"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "Why our bank/firm?",
    answer:
      "Demonstrate you've networked with people there and know specific recent deals. Name the people you've met, reference a recent transaction, and explain why this group's deal mix fits your interests.",
    category: "Behavioral",
    difficulty: "Medium",
    tags: ["why firm", "networking"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "What are your strengths and weaknesses?",
    answer:
      "2-3 strengths backed by a brief story (quantitative skills, work ethic, attention to detail). 2-3 real weaknesses that aren't dealbreakers (tendency to over-analyze, slow to delegate). Don't fake it — interviewers see through \"I work too hard.\"",
    category: "Behavioral",
    difficulty: "Medium",
    tags: ["SW", "behavioral"],
    source: "BIWS 400 Questions Guide",
  },
  {
    question: "Tell me about a deal in the news.",
    answer:
      "Pick a recent M&A deal. Cover: what the deal is, the strategic rationale, valuation/deal terms, key risks, and your view on whether you'd do the deal if you were the buyer.",
    category: "Behavioral",
    difficulty: "Medium",
    tags: ["markets", "deal"],
    source: "BIWS 400 Questions Guide",
  },
];

export const SEED_QUESTIONS: SeedQuestion[] = BASE_SEED_QUESTIONS.map((q) => ({
  ...q,
  keywords: keywordize(q.question, q.answer, q.tags),
}));
