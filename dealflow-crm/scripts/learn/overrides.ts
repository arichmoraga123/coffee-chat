/**
 * Hand-authored additions the converter layers on top of content/LESSON_CONTENT.md:
 *  - FORMULAS: KaTeX versions of equations that appear in the walkthroughs (spec: "use formula blocks for any equation")
 *  - MCQS: one multiple-choice per lesson, built from the lesson's most important deep dive (spec rule 4)
 *  - TAGS: relatedQuestionTags so "Drill related questions" finds matching question-bank items (spec rule 6)
 * Lesson substance itself always comes from LESSON_CONTENT.md.
 */

export type FormulaOverride = { latex: string; caption?: string; legend: { symbol: string; meaning: string }[] };
export type McqOverride = {
  /** Insert right after the deep dive whose title contains this text. */
  after: string;
  prompt: string;
  options: [string, string, string, string];
  /** index into options */
  correct: 0 | 1 | 2 | 3;
  explanation: string;
};

export const FORMULAS: Record<string, FormulaOverride[]> = {
  "0-1": [
    {
      latex: "FV = PV \\times (1 + r)^n \\qquad PV = \\frac{FV}{(1 + r)^n}",
      caption: "Future value and present value",
      legend: [
        { symbol: "PV", meaning: "Present value — what the cash is worth today" },
        { symbol: "FV", meaning: "Future value — what it grows to" },
        { symbol: "r", meaning: "Discount rate (opportunity cost) per period" },
        { symbol: "n", meaning: "Number of periods" },
      ],
    },
  ],
  "0-2": [
    {
      latex: "NPV = \\sum_{t=1}^{n} \\frac{CF_t}{(1 + r)^t} - \\text{Initial cost}",
      caption: "Net present value",
      legend: [
        { symbol: "CF_t", meaning: "Cash flow in year t" },
        { symbol: "r", meaning: "Required return (hurdle rate)" },
        { symbol: "IRR", meaning: "The r that makes NPV = 0" },
      ],
    },
    {
      latex: "MOIC = \\frac{\\text{Total cash returned}}{\\text{Cash invested}}",
      caption: "Multiple on invested capital",
      legend: [{ symbol: "MOIC", meaning: "Cash-on-cash multiple — ignores time" }],
    },
  ],
  "0-3": [
    {
      latex: "PV_{\\text{perpetuity}} = \\frac{CF}{r} \\qquad PV_{\\text{growing}} = \\frac{CF_1}{r - g}",
      caption: "Perpetuity and growing perpetuity",
      legend: [
        { symbol: "CF_1", meaning: "Next year's cash flow" },
        { symbol: "r", meaning: "Discount rate" },
        { symbol: "g", meaning: "Constant growth rate (must be below r)" },
      ],
    },
  ],
  "1-1": [
    {
      latex: "\\text{Assets} = \\text{Liabilities} + \\text{Equity}",
      caption: "The balance sheet identity",
      legend: [
        { symbol: "\\text{Assets}", meaning: "What the company owns" },
        { symbol: "\\text{Liabilities}", meaning: "What it owes" },
        { symbol: "\\text{Equity}", meaning: "What's left for owners" },
      ],
    },
  ],
  "1-2": [
    {
      latex: "RE_{\\text{end}} = RE_{\\text{begin}} + \\text{Net income} - \\text{Dividends}",
      caption: "Retained earnings roll-forward",
      legend: [{ symbol: "RE", meaning: "Retained earnings (equity on the balance sheet)" }],
    },
  ],
  "1-4": [
    {
      latex: "CCC = DSO + DIO - DPO",
      caption: "Cash conversion cycle",
      legend: [
        { symbol: "DSO", meaning: "Days sales outstanding = AR ÷ revenue × 365" },
        { symbol: "DIO", meaning: "Days inventory outstanding = inventory ÷ COGS × 365" },
        { symbol: "DPO", meaning: "Days payable outstanding = AP ÷ COGS × 365" },
      ],
    },
  ],
  "1-6": [
    {
      latex: "\\text{Goodwill} = \\text{Purchase price} - \\text{FV of net identifiable assets}",
      caption: "Goodwill",
      legend: [{ symbol: "\\text{FV}", meaning: "Fair value" }],
    },
  ],
  "2-2": [
    {
      latex: "EV = \\text{Equity value} + \\text{Debt} + \\text{Preferred} + NCI - \\text{Cash} - \\text{Equity investments}",
      caption: "The EV bridge",
      legend: [
        { symbol: "NCI", meaning: "Noncontrolling interest (minority interest)" },
        { symbol: "\\text{Equity investments}", meaning: "Stakes in associates — non-operating assets" },
      ],
    },
  ],
  "2-3": [
    {
      latex: "\\text{Net new shares} = N - \\frac{N \\times K}{P}",
      caption: "Treasury stock method",
      legend: [
        { symbol: "N", meaning: "Number of in-the-money options" },
        { symbol: "K", meaning: "Strike (exercise) price" },
        { symbol: "P", meaning: "Current share price" },
      ],
    },
  ],
  "4-2": [
    {
      latex: "LTM = FY + YTD_{\\text{current}} - YTD_{\\text{prior}}",
      caption: "Last twelve months",
      legend: [
        { symbol: "FY", meaning: "Most recent full fiscal year" },
        { symbol: "YTD", meaning: "Year-to-date period" },
      ],
    },
  ],
  "5-1": [
    {
      latex: "WACC = \\frac{E}{V} R_e + \\frac{D}{V} R_d (1 - t) + \\frac{P}{V} R_p",
      caption: "Weighted average cost of capital",
      legend: [
        { symbol: "E, D, P", meaning: "Market values of equity, debt and preferred" },
        { symbol: "V", meaning: "E + D + P" },
        { symbol: "R_e", meaning: "Cost of equity" },
        { symbol: "R_d", meaning: "Pre-tax cost of debt" },
        { symbol: "t", meaning: "Tax rate" },
        { symbol: "R_p", meaning: "Cost of preferred" },
      ],
    },
  ],
  "5-3": [
    {
      latex: "\\beta_L = \\beta_U \\times \\left[1 + (1 - t) \\times \\frac{D}{E}\\right]",
      caption: "Hamada: relever (divide to unlever)",
      legend: [
        { symbol: "\\beta_L", meaning: "Levered (observed) beta" },
        { symbol: "\\beta_U", meaning: "Unlevered (asset) beta — pure business risk" },
        { symbol: "t", meaning: "Tax rate" },
        { symbol: "D/E", meaning: "Debt-to-equity ratio" },
      ],
    },
  ],
  "5-4": [
    {
      latex: "R_{d,\\text{after-tax}} = R_d \\times (1 - t)",
      caption: "After-tax cost of debt",
      legend: [
        { symbol: "R_d", meaning: "Pre-tax cost of debt (yield to maturity)" },
        { symbol: "t", meaning: "Tax rate" },
      ],
    },
  ],
  "5-5": [
    {
      latex: "R_e = R_f + \\beta \\times ERP + CRP",
      caption: "CAPM with a country risk premium",
      legend: [
        { symbol: "CRP", meaning: "Country risk premium" },
        { symbol: "ERP", meaning: "Equity risk premium" },
      ],
    },
  ],
  "6-2": [
    {
      latex: "UFCF = EBIT \\times (1 - t) + D\\&A - CapEx - \\Delta NWC",
      caption: "Unlevered free cash flow",
      legend: [
        { symbol: "EBIT \\times (1 - t)", meaning: "NOPAT — operating profit after tax" },
        { symbol: "D\\&A", meaning: "Depreciation & amortization (non-cash, added back)" },
        { symbol: "\\Delta NWC", meaning: "Increase in net working capital (uses cash)" },
      ],
    },
  ],
  "6-3": [
    {
      latex: "\\text{Discount factor} = \\frac{1}{(1 + WACC)^t}",
      caption: "Mid-year convention: t = 0.5, 1.5, 2.5, …",
      legend: [{ symbol: "t", meaning: "Discount period in years" }],
    },
  ],
  "6-4": [
    {
      latex: "TV_{\\text{GGM}} = \\frac{UFCF_n \\times (1 + g)}{WACC - g} \\qquad TV_{\\text{exit}} = EBITDA_n \\times \\text{Multiple}",
      caption: "Perpetuity growth vs. exit multiple",
      legend: [
        { symbol: "UFCF_n", meaning: "Final projection-year unlevered FCF" },
        { symbol: "g", meaning: "Terminal growth rate (below long-run nominal GDP growth)" },
        { symbol: "EBITDA_n", meaning: "Final projection-year EBITDA" },
      ],
    },
  ],
  "6-6": [
    {
      latex: "LFCF = NI + D\\&A - CapEx - \\Delta NWC - \\text{Mandatory repayment} + \\text{New borrowing}",
      caption: "Levered free cash flow",
      legend: [{ symbol: "NI", meaning: "Net income (already after interest)" }],
    },
  ],
  "7-2": [
    {
      latex: "\\text{Pro forma EPS} = \\frac{NI_A + NI_T - \\text{after-tax financing costs} + \\text{after-tax synergies}}{\\text{Acquirer shares} + \\text{New shares}}",
      caption: "Accretion / dilution",
      legend: [
        { symbol: "NI_A", meaning: "Acquirer net income" },
        { symbol: "NI_T", meaning: "Target net income" },
      ],
    },
  ],
  "7-3": [
    {
      latex: "\\text{Goodwill} = \\text{Price} - \\text{Book value} - \\text{Write-ups} + \\text{New DTL}",
      caption: "Goodwill is the plug",
      legend: [{ symbol: "DTL", meaning: "Deferred tax liability = write-up × tax rate (stock deal)" }],
    },
  ],
  "8-1": [
    {
      latex: "\\text{Exit equity} = \\text{Exit EV} - \\text{Net debt}",
      caption: "What the sponsor gets back",
      legend: [{ symbol: "\\text{Exit EV}", meaning: "Exit EBITDA × exit multiple" }],
    },
  ],
  "9-1": [
    {
      latex: "\\text{Leverage} = \\frac{\\text{Debt}}{EBITDA} \\qquad \\text{Coverage} = \\frac{EBITDA}{\\text{Interest}}",
      caption: "Core credit ratios",
      legend: [
        { symbol: "\\text{Leverage}", meaning: "Years of EBITDA to repay debt — lower is safer" },
        { symbol: "\\text{Coverage}", meaning: "How many times EBITDA covers interest — higher is safer" },
      ],
    },
  ],
  "10-2": [
    {
      latex: "\\text{Cap rate} = \\frac{NOI}{\\text{Property value}} \\qquad FFO = NI + \\text{RE D\\&A} - \\text{Gains on sales}",
      caption: "REIT metrics",
      legend: [
        { symbol: "NOI", meaning: "Net operating income" },
        { symbol: "FFO", meaning: "Funds from operations" },
      ],
    },
  ],
  "10-4": [
    {
      latex: "\\text{Revenue growth \\%} + \\text{Profit margin \\%} \\geq 40\\%",
      caption: "Rule of 40",
      legend: [{ symbol: "\\text{Profit margin}", meaning: "Usually EBITDA or FCF margin" }],
    },
  ],
  "10-5": [
    {
      latex: "\\text{Combined ratio} = \\frac{\\text{Claims} + \\text{Expenses}}{\\text{Premiums earned}}",
      caption: "Below 100% = underwriting profit",
      legend: [{ symbol: "\\text{Premiums earned}", meaning: "Premium revenue recognized in the period" }],
    },
  ],
  "11-1": [
    {
      latex: "\\text{Years to double} \\approx \\frac{72}{\\text{Annual return (\\%)}}",
      caption: "Rule of 72",
      legend: [{ symbol: "72", meaning: "Works best for returns between about 6% and 12%" }],
    },
  ],
};

export const MCQS: Record<string, McqOverride> = {
  "0-1": {
    after: "long-dated cash flows",
    prompt: "Rates rise from 8% to 10%. Which cash flow's present value falls the most in percentage terms?",
    options: ["$100 received next year", "$100 received in 5 years", "$100 received in 20 years", "They all fall by the same percentage"],
    correct: 2,
    explanation: "Discounting compounds, so distant cash flows are hit hardest: the 20-year factor drops from 0.215 to 0.149 (about a third), while next year's barely moves (0.926 → 0.909).",
  },
  "0-2": {
    after: "dividend recap",
    prompt: "A sponsor does a dividend recap in year 2. What typically happens to IRR and MOIC?",
    options: ["IRR up, MOIC roughly flat or slightly down", "IRR down, MOIC up", "Both up significantly", "Both unchanged"],
    correct: 0,
    explanation: "Getting cash back earlier boosts IRR. MOIC barely moves or dips, because the new debt and interest reduce equity value at exit.",
  },
  "0-3": {
    after: "next year's",
    prompt: "This year's cash flow is $100, g = 2%, r = 10%. What's the growing perpetuity value?",
    options: ["$1,250", "$1,275", "$1,000", "$1,020"],
    correct: 1,
    explanation: "The formula needs next year's cash flow: $100 × 1.02 = $102; $102 ÷ (10% − 2%) = $1,275. $1,250 forgets to grow the cash flow first.",
  },
  "1-1": {
    after: "net income the same as cash flow",
    prompt: "Which of these is NOT a reason net income differs from cash flow?",
    options: [
      "Non-cash expenses like D&A and SBC",
      "Working capital timing, like sales made on credit",
      "Cash uses that skip the IS, like CapEx and debt principal",
      "Revenue is recorded when cash is received",
    ],
    correct: 3,
    explanation: "Under accrual accounting, revenue is recorded when earned, not when cash arrives — that mismatch is exactly why the CFS exists.",
  },
  "1-2": {
    after: "accounts receivable reduce cash",
    prompt: "Accounts receivable increases by $10. What's the effect on the cash flow statement?",
    options: ["Add $10 in CFO", "Subtract $10 in CFO", "Subtract $10 in CFI", "No effect — AR is on the balance sheet only"],
    correct: 1,
    explanation: "Net income already includes the revenue, but the cash hasn't been collected, so the increase in AR is subtracted in cash from operations.",
  },
  "1-3": {
    after: "Why does depreciation *increase* cash",
    prompt: "Depreciation increases by $10 with a 40% tax rate. What happens to cash?",
    options: ["Down $10", "Down $6", "Up $4", "Unchanged — depreciation is non-cash"],
    correct: 2,
    explanation: "Net income falls $6, but the $10 non-cash charge is added back, so cash rises by the $4 tax shield ($10 × 40%).",
  },
  "1-4": {
    after: "Can working capital be negative",
    prompt: "A subscription software company has negative net working capital. What does that most likely mean?",
    options: [
      "It's running out of cash and can't pay suppliers",
      "Customers pay before the company delivers or pays suppliers",
      "Its accounts receivable are larger than its payables",
      "It has more debt than cash",
    ],
    correct: 1,
    explanation: "Negative NWC usually means cash comes in before it goes out (deferred revenue from upfront billing) — often a strength, unless it comes from stretching payables.",
  },
  "1-5": {
    after: "SBC is added back",
    prompt: "SBC is added back on the cash flow statement. What's the right way to think about it in valuation?",
    options: [
      "It's free, because it doesn't use cash",
      "It's a real cost through dilution, so adding it back without counting dilution overstates value",
      "It should be added back and the share count should be reduced",
      "It only matters for companies with negative net income",
    ],
    correct: 1,
    explanation: "SBC doesn't use cash, but it dilutes shareholders (and companies often buy back shares to offset it). Ignoring that overstates value.",
  },
  "1-6": {
    after: "Is goodwill tax-deductible",
    prompt: "When can a buyer amortize goodwill for tax purposes?",
    options: [
      "Never — goodwill is never tax-deductible",
      "In any stock purchase",
      "In an asset purchase or a 338(h)(10) election, over 15 years",
      "Only when the goodwill is impaired",
    ],
    correct: 2,
    explanation: "A stock purchase keeps the old tax basis, so no deduction. An asset purchase (or 338(h)(10)) steps up the basis and lets the buyer amortize goodwill for tax over 15 years.",
  },
  "1-7": {
    after: "Why do leases matter for EV/EBITDA",
    prompt: "A European retailer reports under IFRS 16. To keep EV/EBITDA consistent, what should you do with its lease liabilities?",
    options: [
      "Leave them out of EV, since leases are operating items",
      "Add them to EV, since IFRS EBITDA excludes lease costs",
      "Subtract them from EV",
      "Add them to EBITDA",
    ],
    correct: 1,
    explanation: "Under IFRS 16, lease costs sit below EBITDA (depreciation + interest), so the lease liability belongs in EV to match.",
  },
  "2-1": {
    after: "Why do we need both",
    prompt: "Why would you compare companies using enterprise value rather than equity value?",
    options: [
      "EV is always larger, so multiples are easier to read",
      "EV is independent of how the business is financed",
      "EV is what the share price reflects",
      "EV excludes debt, which is volatile",
    ],
    correct: 1,
    explanation: "EV captures the business itself regardless of capital structure, so companies with different debt levels are comparable.",
  },
  "2-2": {
    after: "Why add noncontrolling interest",
    prompt: "A parent owns 70% of a subsidiary and consolidates it. Why is NCI added in the EV bridge?",
    options: [
      "Because NCI is a form of debt",
      "Because EBITDA includes 100% of the sub, but equity value only reflects 70%",
      "Because the parent will have to buy out the minority holders",
      "Because NCI earns interest",
    ],
    correct: 1,
    explanation: "The parent consolidates 100% of the sub's EBITDA but only owns 70% — adding the 30% NCI makes EV match the EBITDA it's paired with.",
  },
  "2-3": {
    after: "convertible bonds work in the share count",
    prompt: "A convertible bond is in the money. How do you treat it?",
    options: [
      "Count it as debt and add the conversion shares",
      "Count the conversion shares and remove the bond from debt",
      "Keep it as debt and ignore the shares",
      "Count half as debt and half as shares",
    ],
    correct: 1,
    explanation: "If it's in the money, holders would convert: add the new shares and remove the bond from debt. Counting both double-counts.",
  },
  "2-4": {
    after: "What does a negative EV signal",
    prompt: "A biotech has market cap $150, debt $20 and cash $260. What's its EV, and what does it signal?",
    options: [
      "+$90; the business is undervalued",
      "−$90; the market expects the company to burn its cash",
      "+$430; cash is added in the bridge",
      "EV can't be negative, so it's $0",
    ],
    correct: 1,
    explanation: "EV = 150 + 20 − 260 = −$90. A negative EV means the market values the operations below zero — it expects the cash to be burned.",
  },
  "2-5": {
    after: "Use $100 of cash to buy another company",
    prompt: "A company uses $100 of cash to buy another company. What happens?",
    options: [
      "Equity value down $100, EV unchanged",
      "Equity value unchanged, EV up $100",
      "Both up $100",
      "Equity value unchanged, EV down $100",
    ],
    correct: 1,
    explanation: "Equity value doesn't change (one asset swapped for another). EV rises $100: less cash, more operating business.",
  },
  "3-1": {
    after: "Which method gives the highest value",
    prompt: "Which method usually produces the LOWEST value in a football field?",
    options: ["Precedent transactions", "Trading comps", "LBO analysis", "DCF — always"],
    correct: 2,
    explanation: "The LBO is usually the floor: sponsors are constrained by target returns and debt capacity. The DCF can land anywhere depending on assumptions.",
  },
  "3-2": {
    after: "Why can't you use EV / Net income",
    prompt: "Which multiple pairing is INCONSISTENT?",
    options: ["EV / EBITDA", "EV / Revenue", "Equity value / Net income", "EV / Net income"],
    correct: 3,
    explanation: "EV belongs to all investors; net income is after interest, so it belongs only to shareholders. The numerator and denominator don't match.",
  },
  "3-3": {
    after: "52-week trading range",
    prompt: "Why include the 52-week trading range on a football field?",
    options: [
      "It's the most reliable valuation method",
      "It shows where the market has actually valued the stock — a reference point",
      "It replaces the DCF for public companies",
      "Regulators require it in every pitch",
    ],
    correct: 1,
    explanation: "It's a reference point, not a valuation method — an offer below the 52-week low would struggle to win shareholder approval.",
  },
  "4-1": {
    after: "Why isn't \"same industry\" enough",
    prompt: "Two software companies: one growing 30%, one growing 3%. Should they trade at the same multiple?",
    options: [
      "Yes — same industry means same multiple",
      "No — business model, growth and margins matter more than the industry label",
      "Yes, as long as they're the same size",
      "No — the slower grower should trade higher because it's safer",
    ],
    correct: 1,
    explanation: "Comps need similar growth, margins and business model, not just the same label.",
  },
  "4-2": {
    after: "Why the median over the mean",
    prompt: "Why do bankers usually use the median multiple rather than the mean?",
    options: [
      "The median is always higher",
      "The median reduces distortion from outliers",
      "The mean can't be calculated for multiples",
      "Regulators require the median",
    ],
    correct: 1,
    explanation: "One outlier (say, 40x on a takeover rumor) can drag the mean; the median ignores the extremes.",
  },
  "4-3": {
    after: "Why do precedents usually show higher multiples",
    prompt: "Why do precedent transaction multiples usually exceed trading multiples?",
    options: [
      "Precedents use forward metrics",
      "Buyers pay a control premium, and strategics may pay for synergies",
      "Private companies always trade at a premium",
      "Precedents exclude debt",
    ],
    correct: 1,
    explanation: "Acquirers pay for control (typically a 20–40% premium) and sometimes synergies, which pushes deal multiples above trading multiples.",
  },
  "4-4": {
    after: "negative EBITDA",
    prompt: "One comp has negative EBITDA. What do you do with its EV/EBITDA?",
    options: [
      "Use it — negative multiples mean the stock is cheap",
      "Mark it NM and exclude it, or use EV/revenue",
      "Take the absolute value",
      "Replace it with the industry average",
    ],
    correct: 1,
    explanation: "A negative EV/EBITDA is meaningless. Mark it \"NM\" and exclude it from that column (or use EV/revenue).",
  },
  "5-1": {
    after: "Why is cost of debt after-tax",
    prompt: "Why is the cost of debt tax-effected in WACC but the cost of equity isn't?",
    options: [
      "Debt is riskier than equity",
      "Interest is tax-deductible; dividends aren't",
      "Equity holders pay taxes on dividends",
      "Debt is valued at book, equity at market",
    ],
    correct: 1,
    explanation: "Interest lowers taxable income, so the government effectively subsidizes part of it. Dividends get no such deduction.",
  },
  "5-3": {
    after: "Why unlever and relever",
    prompt: "Why unlever comparable companies' betas before using them?",
    options: [
      "Unlevered betas are always closer to 1.0",
      "Each comp's beta reflects its own leverage; unlevering isolates business risk",
      "Levered betas can't be calculated for public companies",
      "To remove the tax rate from CAPM",
    ],
    correct: 1,
    explanation: "Strip out each comp's leverage to get pure business risk, take the median, then relever at the target's capital structure.",
  },
  "5-4": {
    after: "use as much as possible",
    prompt: "Debt is cheaper than equity. Does adding more debt always lower WACC?",
    options: [
      "Yes — cheaper capital always lowers the average",
      "No — past a point, distress risk raises both the cost of debt and equity, so WACC rises",
      "No — debt never lowers WACC",
      "Yes, as long as interest is tax-deductible",
    ],
    correct: 1,
    explanation: "WACC is U-shaped: some debt lowers it, but too much raises bankruptcy risk and pushes up the cost of both debt and equity.",
  },
  "5-5": {
    after: "currency matching matter",
    prompt: "You're valuing an Indonesian company's rupiah cash flows. Which discount rate is consistent?",
    options: [
      "A USD WACC built on US Treasuries",
      "A rupiah-based discount rate (or convert the cash flows to USD at forward rates)",
      "Any rate, as long as you add a country risk premium",
      "The US WACC minus expected inflation",
    ],
    correct: 1,
    explanation: "Local-currency cash flows embed local inflation, so the discount rate must too — or convert the cash flows to USD and use a USD rate.",
  },
  "6-1": {
    after: "When is a DCF most and least useful",
    prompt: "For which company is a standard DCF LEAST useful?",
    options: ["A mature consumer staples company", "A stable industrial", "A bank", "A utility with regulated returns"],
    correct: 2,
    explanation: "For banks, debt is their raw material and interest is operating, so unlevered FCF isn't meaningful — use a DDM or P/BV.",
  },
  "6-2": {
    after: "Why tax EBIT rather than use actual taxes",
    prompt: "In UFCF, why apply the tax rate to EBIT instead of using the company's actual taxes?",
    options: [
      "Actual taxes are hard to find",
      "Actual taxes include the interest tax shield, which WACC already captures",
      "EBIT is always higher than pre-tax income",
      "Tax rules require it",
    ],
    correct: 1,
    explanation: "Using actual taxes would count the interest tax shield twice — once in the cash flows and once in the after-tax cost of debt in WACC.",
  },
  "6-3": {
    after: "affect terminal value",
    prompt: "5-year DCF with the mid-year convention. Which discount period is used for an exit-multiple terminal value?",
    options: ["4.5", "5.0", "5.5", "2.5"],
    correct: 1,
    explanation: "An exit multiple assumes a sale at year-end, so discount the full 5 years. A perpetuity-growth TV uses the mid-year period (4.5).",
  },
  "6-4": {
    after: "Which TV method is better",
    prompt: "Final-year UFCF $100, WACC 10%, g 2%. What's the Gordon Growth terminal value?",
    options: ["$1,250", "$1,275", "$1,020", "$1,000"],
    correct: 1,
    explanation: "$100 × 1.02 ÷ (10% − 2%) = $102 ÷ 0.08 = $1,275. $1,250 forgets the (1 + g).",
  },
  "6-5": {
    after: "+1% WACC or +1% terminal growth",
    prompt: "Which usually moves a DCF more: +1% WACC or +1% terminal growth?",
    options: [
      "+1% terminal growth, because TV is most of the value",
      "+1% WACC, because it hits every discount factor and the TV denominator",
      "They're always exactly equal",
      "Neither — sensitivities only matter for the exit multiple",
    ],
    correct: 1,
    explanation: "WACC affects every projected year's discount factor as well as the TV denominator; growth only affects TV.",
  },
  "6-6": {
    after: "When would you use one",
    prompt: "When is a levered DCF most appropriate?",
    options: [
      "For a high-growth tech company",
      "For financial institutions, or when the capital structure is fixed and known",
      "Whenever the company has debt",
      "Never — it's always wrong",
    ],
    correct: 1,
    explanation: "Levered DCFs fit banks (where EV doesn't apply) and cases like an LBO where the debt schedule is fixed and known.",
  },
  "6-7": {
    after: "3x the current price",
    prompt: "Your DCF says the stock is worth 3x its current price. What do you check first?",
    options: [
      "Terminal value assumptions",
      "The company's dividend policy",
      "The 52-week low",
      "Whether the company has an IFRS auditor",
    ],
    correct: 0,
    explanation: "TV usually dominates the value, so check terminal growth or the exit multiple first, then projections vs. history, then WACC, then mechanical errors.",
  },
  "7-1": {
    after: "cost synergies valued more",
    prompt: "Why do bankers trust cost synergies more than revenue synergies?",
    options: [
      "Cost synergies are larger",
      "Cost synergies are within management's control; revenue synergies depend on customers",
      "Revenue synergies are taxed",
      "Cost synergies happen immediately with no integration costs",
    ],
    correct: 1,
    explanation: "Closing a duplicate office is in management's control; getting customers to buy more is not — revenue synergies often fail to materialize.",
  },
  "7-2": {
    after: "all-stock deal, when is it accretive",
    prompt: "In an all-stock deal, when is the deal accretive?",
    options: [
      "When the acquirer's P/E is higher than the P/E paid for the target",
      "When the acquirer's P/E is lower than the P/E paid for the target",
      "When the target has more shares than the acquirer",
      "Always, because no debt is used",
    ],
    correct: 0,
    explanation: "A high-P/E acquirer's stock is \"expensive currency\": its cost (earnings yield) is below the earnings yield of what it's buying.",
  },
  "7-3": {
    after: "asset write-up create a DTL",
    prompt: "In a stock deal, PP&E is written up by $100 at a 25% tax rate. What new DTL is created?",
    options: ["$0", "$25", "$75", "$100"],
    correct: 1,
    explanation: "Book basis steps up but tax basis doesn't, so DTL = write-up × tax rate = $100 × 25% = $25.",
  },
  "7-4": {
    after: "If breakeven synergies are small",
    prompt: "A deal needs only small breakeven synergies to avoid dilution. Does that prove it creates value?",
    options: [
      "Yes — EPS neutrality means it's a good deal",
      "No — the capitalized value of synergies should exceed the premium paid",
      "Yes, as long as the synergies are cost synergies",
      "No — breakeven synergies are irrelevant to M&A",
    ],
    correct: 1,
    explanation: "Breakeven synergies only test EPS. Value creation requires the capitalized synergies to exceed the premium paid.",
  },
  "7-5": {
    after: "Fixed vs. floating exchange ratio",
    prompt: "Under a fixed exchange ratio, what moves when the acquirer's stock price changes?",
    options: [
      "The number of shares issued",
      "The deal value received by target shareholders",
      "Nothing — both are locked",
      "The target's share count",
    ],
    correct: 1,
    explanation: "A fixed ratio locks the share count, so the value target holders receive moves with the acquirer's stock. A floating ratio locks the value instead.",
  },
  "8-1": {
    after: "Why does leverage boost returns",
    prompt: "Buy for $100 with $60 debt and $40 equity; sell for $150 with debt unchanged. What's the MOIC?",
    options: ["1.5x", "2.25x", "3.75x", "2.5x"],
    correct: 1,
    explanation: "Exit equity = $150 − $60 = $90; $90 ÷ $40 = 2.25x. With all equity it would only be 1.5x — the debt doesn't share in the upside.",
  },
  "8-2": {
    after: "cash-free, debt-free",
    prompt: "A deal is done \"cash-free, debt-free.\" What does that mean?",
    options: [
      "The buyer assumes all debt and keeps the cash",
      "The buyer pays for the business on an EV basis; the seller keeps the cash and repays the debt",
      "The deal is financed with no debt",
      "The target must have zero debt to be sold",
    ],
    correct: 1,
    explanation: "It simplifies the negotiation to one number — enterprise value. The seller keeps cash and repays debt out of the proceeds.",
  },
  "8-3": {
    after: "Maintenance vs. incurrence covenants",
    prompt: "Which covenant is tested every quarter regardless of what the company does?",
    options: ["Incurrence covenant", "Maintenance covenant", "Call protection", "PIK toggle"],
    correct: 1,
    explanation: "Maintenance covenants (e.g., debt/EBITDA below 5.0x) are tested each quarter — typical for bank loans. Incurrence covenants only apply when the company takes an action.",
  },
  "8-4": {
    after: "Why do sponsors assume exit multiple",
    prompt: "Why do sponsors usually underwrite exit multiple = entry multiple?",
    options: [
      "Multiples never change",
      "Multiple expansion depends on markets they don't control — the deal should work without it",
      "Lenders require it by law",
      "It maximizes the modeled IRR",
    ],
    correct: 1,
    explanation: "Assuming flat multiples tests whether the deal works on operational improvement and deleveraging alone. Underwriting expansion is considered aggressive.",
  },
  "8-5": {
    after: "estimate IRR without a calculator",
    prompt: "A sponsor triples its money over 5 years. Roughly what IRR is that?",
    options: ["~15%", "~20%", "~25%", "~44%"],
    correct: 2,
    explanation: "Anchor: 3x in 5 years ≈ 25%. (3x in 3 years ≈ 44%; 2x in 5 years ≈ 15%.)",
  },
  "8-6": {
    after: "bad LBO candidate",
    prompt: "Which company is the WORST LBO candidate?",
    options: [
      "A subscription software company with 95% retention",
      "A highly cyclical manufacturer with heavy CapEx",
      "A market-leading distributor with stable margins",
      "A services business with low CapEx and recurring contracts",
    ],
    correct: 1,
    explanation: "Volatile, cyclical cash flow and heavy CapEx make it hard to reliably service fixed debt.",
  },
  "8-7": {
    after: "LBO vs. DCF",
    prompt: "Why can an LBO analysis and a DCF give different values for the same company?",
    options: [
      "One of them must contain an error",
      "A DCF estimates intrinsic value; an LBO gives the max price a sponsor can pay and still hit its return",
      "The LBO ignores debt",
      "The DCF ignores taxes",
    ],
    correct: 1,
    explanation: "The LBO is a price constraint driven by return targets and debt capacity, not an estimate of intrinsic value.",
  },
  "9-1": {
    after: "(EBITDA − CapEx) ÷ interest more conservative",
    prompt: "EBITDA $100, CapEx $40, interest $25. What's (EBITDA − CapEx) ÷ interest?",
    options: ["4.0x", "2.4x", "1.6x", "6.0x"],
    correct: 1,
    explanation: "($100 − $40) ÷ $25 = 2.4x. On EBITDA alone it would look like 4.0x — CapEx is a real cash need, so this ratio is more conservative.",
  },
  "9-2": {
    after: "structural subordination",
    prompt: "Senior notes are issued at the holding company; term loans sit at the operating subsidiary. Who is effectively senior?",
    options: [
      "The holdco senior notes, because they're labeled senior",
      "The opco term loans, because they're paid from the subsidiary's assets first",
      "They rank equally",
      "Whichever was issued first",
    ],
    correct: 1,
    explanation: "Structural subordination: holdco creditors only get what flows up after opco creditors are paid, even if labeled \"senior.\"",
  },
  "9-3": {
    after: "bond prices fall when interest rates rise",
    prompt: "Market interest rates rise. What happens to an existing fixed-rate bond?",
    options: [
      "Its coupon rises to match",
      "Its price falls until its yield matches the market",
      "Its price rises because it's safer",
      "Nothing — the price is fixed at par",
    ],
    correct: 1,
    explanation: "The coupon is fixed, so when new bonds pay more, the old bond's price has to fall to offer a competitive yield.",
  },
  "10-1": {
    after: "What drives a bank's P/BV",
    prompt: "A bank earns a 15% ROE with a 10% cost of equity. Where should it trade relative to book value?",
    options: ["Below 1.0x book", "At exactly 1.0x book", "Above 1.0x book", "Book value is irrelevant for banks"],
    correct: 2,
    explanation: "ROE above the cost of equity means each dollar of book equity creates value, so the bank should trade above book.",
  },
  "10-2": {
    after: "What's a cap rate",
    prompt: "A property has NOI of $5M and is valued at $100M. What's the cap rate, and what happens to value if cap rates rise?",
    options: ["5%; value rises", "5%; value falls", "20%; value falls", "20%; value rises"],
    correct: 1,
    explanation: "$5M ÷ $100M = 5%. A higher cap rate means a lower value for the same NOI (like a higher earnings yield).",
  },
  "10-3": {
    after: "Why EBITDAX instead of EBITDA",
    prompt: "Why do analysts use EBITDAX for E&P companies?",
    options: [
      "To remove commodity price swings",
      "Exploration accounting differs (successful efforts vs. full cost), so adding it back makes companies comparable",
      "To include hedging gains",
      "Because E&P companies have no depreciation",
    ],
    correct: 1,
    explanation: "Successful-efforts companies expense dry holes; full-cost companies capitalize them. Adding back exploration expense levels the playing field.",
  },
  "10-4": {
    after: "net revenue retention",
    prompt: "A SaaS company's net revenue retention is 120%. What does that mean?",
    options: [
      "It added 20% more customers this year",
      "Last year's customers generate 20% more revenue this year, even after churn",
      "Gross margin is 120%",
      "It lost 20% of customers but raised prices",
    ],
    correct: 1,
    explanation: "NRR = this year's revenue from last year's customers ÷ their revenue last year. 120% means the existing base grew 20% on its own.",
  },
  "10-5": {
    after: "combined ratio",
    prompt: "An insurer's combined ratio is 103%. What does that tell you?",
    options: [
      "It made a 3% underwriting profit",
      "It lost money on underwriting and relies on investment income from the float",
      "Its reserves are 3% too high",
      "It grew premiums 3%",
    ],
    correct: 1,
    explanation: "Above 100% means claims plus expenses exceed premiums — underwriting loses money, so profit depends on investing the float.",
  },
  "11-1": {
    after: "unusual IRR",
    prompt: "Roughly what IRR is 2.2x in 4 years?",
    options: ["~15%", "~19%", "~22%", "~30%"],
    correct: 2,
    explanation: "2x in 4 years ≈ 19%; 2.2x is a bit higher, so ≈ 22% (exact: 2.2^(1/4) − 1 ≈ 21.8%).",
  },
  "11-2": {
    after: "angle between the clock hands",
    prompt: "What's the angle between the clock hands at 3:15?",
    options: ["0°", "7.5°", "15°", "90°"],
    correct: 1,
    explanation: "The hour hand moves 0.5° per minute, so at 3:15 it's 7.5° past the 3, while the minute hand is on the 3.",
  },
};

/** relatedQuestionTags — matched (case-insensitive substring) against question tags, keywords and text. */
export const TAGS: Record<string, string[]> = {
  "0-1": ["tvm", "discount rate", "present value"],
  "0-2": ["irr", "moic"],
  "0-3": ["perpetuity", "terminal value"],
  "1-1": ["three statements", "cash flow", "income statement"],
  "1-2": ["three statements", "link"],
  "1-3": ["depreciation", "three statements"],
  "1-4": ["working capital"],
  "1-5": ["deferred tax", "nol", "stock-based"],
  "1-6": ["goodwill", "impairment"],
  "1-7": ["ifrs", "lease", "lifo"],
  "2-1": ["enterprise value", "equity value"],
  "2-2": ["enterprise value", "ev"],
  "2-3": ["diluted", "treasury stock"],
  "2-4": ["enterprise value", "negative"],
  "2-5": ["enterprise value", "equity value"],
  "3-1": ["valuation", "precedents", "comps"],
  "3-2": ["multiples", "ebitda"],
  "3-3": ["football field", "valuation"],
  "4-1": ["comps", "comparable"],
  "4-2": ["comps", "multiples", "ltm"],
  "4-3": ["precedents", "control premium"],
  "4-4": ["comps", "multiples"],
  "5-1": ["wacc"],
  "5-2": ["capm", "beta", "wacc", "cost of equity"],
  "5-3": ["beta", "unlever"],
  "5-4": ["cost of debt", "wacc"],
  "5-5": ["country risk", "wacc"],
  "6-1": ["dcf"],
  "6-2": ["free cash flow", "dcf"],
  "6-3": ["mid-year", "dcf"],
  "6-4": ["terminal value"],
  "6-5": ["sensitivity", "dcf"],
  "6-6": ["levered", "dcf"],
  "6-7": ["dcf"],
  "7-1": ["synergies", "m&a"],
  "7-2": ["accretive", "dilutive", "accretion"],
  "7-3": ["goodwill", "purchase price"],
  "7-4": ["synergies", "breakeven"],
  "7-5": ["m&a", "exchange ratio"],
  "8-1": ["lbo"],
  "8-2": ["lbo", "sources"],
  "8-3": ["covenant", "leveraged", "debt"],
  "8-4": ["irr", "moic", "lbo"],
  "8-5": ["paper lbo", "irr"],
  "8-6": ["lbo candidate", "lbo"],
  "8-7": ["lbo", "circularity"],
  "9-1": ["credit", "leverage", "coverage"],
  "9-2": ["seniority", "bankruptcy", "restructuring"],
  "9-3": ["bond", "credit", "high yield"],
  "10-1": ["bank", "p/bv", "fig"],
  "10-2": ["reit", "cap rate"],
  "10-3": ["e&p", "energy"],
  "10-4": ["saas", "rule of 40", "software"],
  "10-5": ["insurance", "combined ratio"],
  "11-1": ["irr", "rule of 72"],
  "11-2": ["market sizing", "math"],
};
