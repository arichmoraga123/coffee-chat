import { createHash } from "node:crypto";

export type SeedMockQ = {
  question: string;
  category: string;
  bankSource: string;
  year: number | null;
  difficulty: string;
  modelAnswer: string | null;
  tips: string | null;
  careerTracks?: string[];
};

function key(bank: string, q: string) {
  return createHash("sha256").update(`${bank}|${q.trim()}`).digest("hex");
}

const rows: SeedMockQ[] = [
  // Goldman Sachs
  {
    bankSource: "Goldman Sachs",
    category: "Technical",
    difficulty: "Medium",
    year: 2026,
    question: "Walk me through a DCF.",
    modelAnswer:
      "Outline: forecast FCF, WACC, terminal value (Gordon growth or exit multiple), discount to PV, add non-operating assets, subtract net debt for equity value. Tie each step to drivers (revenue growth, margins, capex, NWC).",
    tips: "Speak in structured bullets; mention sensitivity to WACC and terminal growth.",
  },
  {
    bankSource: "Goldman Sachs",
    category: "Behavioral",
    difficulty: "Easy",
    year: 2026,
    question: "Why Goldman specifically?",
    modelAnswer:
      "Combine firm strengths (deal flow, culture, learning) with your personal story and how you will contribute.",
    tips: "Avoid generic superlatives; cite one team or product area if you can.",
  },
  {
    bankSource: "Goldman Sachs",
    category: "Deal Discussion",
    difficulty: "Hard",
    year: 2026,
    question: "Tell me about a recent M&A deal and whether you would have done it.",
    modelAnswer:
      "Pick a real deal: parties, rationale (synergies, multiple, financing), risks, and a balanced view on price/strategic fit.",
    tips: "Have 1–2 metrics (EV/EBITDA, premium) ready.",
  },
  {
    bankSource: "Goldman Sachs",
    category: "Technical",
    difficulty: "Medium",
    year: 2026,
    question: "What happens to EPS in an all-stock acquisition?",
    modelAnswer:
      "Depends on exchange ratio, accretion/dilution vs. standalone EPS, synergies, and cost of the acquirer’s stock; walk through pro forma share count and combined earnings.",
    tips: "Mention breakeven synergy math if time.",
  },
  {
    bankSource: "Goldman Sachs",
    category: "Technical",
    difficulty: "Hard",
    year: 2026,
    question: "How do you think about valuation for a pre-revenue company?",
    modelAnswer:
      "Scenario analysis, comps to listed peers, VC rounds, DCF with wide ranges, milestones, and qualitative moat.",
    tips: "Acknowledge uncertainty and use triangulation across methods.",
  },
  // Morgan Stanley
  {
    bankSource: "Morgan Stanley",
    category: "Technical",
    difficulty: "Medium",
    year: 2026,
    question: "Walk me through an LBO.",
    modelAnswer:
      "Sources & uses, IRR drivers (entry multiple, leverage, growth, margin, exit multiple, debt paydown), and sensitivity.",
    tips: "Keep to 60–90 seconds; end with what moves IRR most.",
  },
  {
    bankSource: "Morgan Stanley",
    category: "Behavioral",
    difficulty: "Easy",
    year: 2026,
    question: "Why investment banking over consulting?",
    modelAnswer:
      "Highlight deal exposure, pace, technical depth, and how that matches your skills and goals.",
    tips: "Respect consulting; contrast execution vs. advice mix.",
  },
  {
    bankSource: "Morgan Stanley",
    category: "Behavioral",
    difficulty: "Easy",
    year: 2026,
    question: "What's your greatest weakness and how are you addressing it?",
    modelAnswer:
      "Pick a real weakness with a concrete improvement plan and evidence of progress.",
    tips: "Avoid humble-brag clichés.",
  },
  {
    bankSource: "Morgan Stanley",
    category: "Technical",
    difficulty: "Medium",
    year: 2026,
    question: "If a company's revenue grows 10%, what happens to FCF?",
    modelAnswer:
      "Not determined without margins, capex, NWC, and interest; explain each lever.",
    tips: "Interviewers want the framework, not a single number.",
  },
  {
    bankSource: "Morgan Stanley",
    category: "Deal Discussion",
    difficulty: "Hard",
    year: 2026,
    question: "Pitch me a stock.",
    modelAnswer:
      "Business model, thesis, catalysts, risks, valuation vs. peers, and why mispricing exists.",
    tips: "Pick liquid name you follow; keep under 2 minutes.",
  },
  // JPMorgan
  {
    bankSource: "JPMorgan",
    category: "Behavioral",
    difficulty: "Easy",
    year: 2026,
    question: "Walk me through your resume.",
    modelAnswer:
      "Chronological hooks: why each step, skills gained, and how it leads to banking.",
    tips: "End with why this seat now.",
  },
  {
    bankSource: "JPMorgan",
    category: "Technical",
    difficulty: "Medium",
    year: 2026,
    question: "What is WACC and what goes into it?",
    modelAnswer:
      "Blended cost of equity (CAPM) and after-tax cost of debt, value-weighted by capital structure.",
    tips: "Mention when to use target vs. current capital structure.",
  },
  {
    bankSource: "JPMorgan",
    category: "Behavioral",
    difficulty: "Medium",
    year: 2026,
    question: "Tell me about a time you worked in a team under pressure.",
    modelAnswer: "STAR: situation, task, your actions, quantified outcome, reflection.",
    tips: "One crisp story beats three shallow ones.",
  },
  {
    bankSource: "JPMorgan",
    category: "Technical",
    difficulty: "Hard",
    year: 2026,
    question: "How do you value a bank differently from an industrial company?",
    modelAnswer:
      "Focus on tangible book, earnings quality, capital ratios, loan book, and regulatory constraints vs. traditional EBITDA multiples.",
    tips: "Name 1–2 bank-specific multiples (P/TBV, P/E).",
  },
  {
    bankSource: "JPMorgan",
    category: "Deal Discussion",
    difficulty: "Medium",
    year: 2026,
    question: "What's happening in the M&A market right now?",
    modelAnswer:
      "High-level: financing conditions, strategic vs. sponsor activity, cross-border/regulatory headwinds, and sector themes.",
    tips: "Read one recent headline before the interview.",
  },
  // KKR
  {
    bankSource: "KKR",
    category: "Technical",
    difficulty: "Medium",
    year: 2026,
    question: "What makes a good LBO candidate?",
    modelAnswer:
      "Stable cash flows, deleveraging capacity, low capex intensity, strong market position, and sensible entry price.",
    tips: "Give a quick example sector vs. anti-example.",
  },
  {
    bankSource: "KKR",
    category: "Technical",
    difficulty: "Hard",
    year: 2026,
    question: "Walk me through how you'd source a deal.",
    modelAnswer:
      "Thesis-led outreach, intermediaries, proprietary networks, portfolio synergies, and diligence triage.",
    tips: "Show you understand proprietary vs. auction dynamics.",
  },
  {
    bankSource: "KKR",
    category: "Technical",
    difficulty: "Easy",
    year: 2026,
    question: "What are the three drivers of PE returns?",
    modelAnswer: "EBITDA growth, multiple expansion/compression, and deleveraging.",
    tips: "Optionally add multiple arbitrage between entry/exit.",
  },
  {
    bankSource: "KKR",
    category: "Deal Discussion",
    difficulty: "Hard",
    year: 2026,
    question: "Tell me about a company you'd want to buy and why.",
    modelAnswer:
      "Industry tailwinds, moat, unit economics, consolidation angle, and realistic exit paths.",
    tips: "Avoid meme stocks; show PE lens.",
  },
  {
    bankSource: "KKR",
    category: "Technical",
    difficulty: "Hard",
    year: 2026,
    question: "How do you think about entry multiple vs. exit multiple risk?",
    modelAnswer:
      "Bridge IRR impact from paying up vs. underwriting conservative exit; stress cases.",
    tips: "Use a simple numeric example if prompted.",
  },
  // Blackstone
  {
    bankSource: "Blackstone",
    category: "Deal Discussion",
    difficulty: "Hard",
    year: 2026,
    question: "If you could buy any company right now, what would it be?",
    modelAnswer: "Same as LBO pitch: thesis, price discipline, value creation plan, risks.",
    tips: "Align with sectors BX emphasizes if you know them.",
  },
  {
    bankSource: "Blackstone",
    category: "Technical",
    difficulty: "Hard",
    year: 2026,
    question: "Walk me through a merger model.",
    modelAnswer:
      "Purchase price, sources/uses, pro forma balance sheet, synergies, accretion/dilution, and sensitivities.",
    tips: "Start high level before diving into line items.",
  },
  {
    bankSource: "Blackstone",
    category: "Behavioral",
    difficulty: "Medium",
    year: 2026,
    question: "What sector do you find most interesting and why?",
    modelAnswer:
      "Macro + micro drivers, deal activity, and how you stay current (reads, podcasts, data).",
    tips: "Tie to BX strategies if authentic.",
  },
  {
    bankSource: "Blackstone",
    category: "Technical",
    difficulty: "Medium",
    year: 2026,
    question: "How do rising interest rates affect LBO returns?",
    modelAnswer:
      "Higher debt cost, lower entry prices possible, slower deleveraging, and repricing of exit multiples.",
    tips: "Mention fixed vs. floating mix.",
  },
  {
    bankSource: "Blackstone",
    category: "Behavioral",
    difficulty: "Medium",
    year: 2026,
    question: "Tell me about a time you failed.",
    modelAnswer: "Honest failure, accountability, learning, and changed behavior.",
    tips: "Do not blame teammates.",
  },
  // Evercore
  {
    bankSource: "Evercore",
    category: "Behavioral",
    difficulty: "Medium",
    year: 2026,
    question: "Why restructuring/advisory over a bulge bracket?",
    modelAnswer:
      "Fit for lean deal teams, product focus, client exposure, and your long-term goals.",
    tips: "Show you understand advisory economics vs. balance sheet banks.",
  },
  {
    bankSource: "Evercore",
    category: "Technical",
    difficulty: "Hard",
    year: 2026,
    question: "Walk me through a DCF for a cyclical company.",
    modelAnswer:
      "Normalize through-cycle margins, mid-cycle FCF, explicit macro scenarios, and conservative terminal assumptions.",
    tips: "Call out commodity or cycle risk explicitly.",
  },
  {
    bankSource: "Evercore",
    category: "Technical",
    difficulty: "Easy",
    year: 2026,
    question: "What's the difference between a strategic and financial buyer?",
    modelAnswer:
      "Synergies, cost of capital, hold period, integration risk vs. financial returns and leverage.",
    tips: "Use a quick concrete example.",
  },
  {
    bankSource: "Evercore",
    category: "Deal Discussion",
    difficulty: "Medium",
    year: 2026,
    question: "Tell me about a deal Evercore has worked on recently.",
    modelAnswer:
      "Pick a public mandate; describe rationale, role of advisor, and lessons for the sector.",
    tips: "Verify facts from reputable news sources.",
  },
  {
    bankSource: "Evercore",
    category: "Technical",
    difficulty: "Medium",
    year: 2026,
    question: "How do you think about terminal value?",
    modelAnswer:
      "Gordon growth constraints vs. exit multiple method; cross-check implied growth and multiples.",
    tips: "Flag TV as % of enterprise value sensitivity.",
  },
  // Centerview
  {
    bankSource: "Centerview",
    category: "Behavioral",
    difficulty: "Easy",
    year: 2026,
    question: "Why M&A specifically?",
    modelAnswer:
      "Intellectual challenge, client impact, pace, and alignment with skills you’ve built.",
    tips: "Avoid sounding like you only want modeling.",
  },
  {
    bankSource: "Centerview",
    category: "Technical",
    difficulty: "Hard",
    year: 2026,
    question: "Walk me through how you'd run a sell-side process.",
    modelAnswer:
      "Prep materials, buyer universe, outreach, management meetings, IOI/LOI, confirmatory diligence, and signing.",
    tips: "Emphasize competitive tension and process integrity.",
  },
  {
    bankSource: "Centerview",
    category: "Technical",
    difficulty: "Medium",
    year: 2026,
    question: "What are the limitations of a DCF?",
    modelAnswer:
      "Terminal value dominance, WACC sensitivity, forecast error, and static capital structure assumptions.",
    tips: "Pair with comps triangulation.",
  },
  {
    bankSource: "Centerview",
    category: "Behavioral",
    difficulty: "Medium",
    year: 2026,
    question: "Tell me about a time you had to persuade someone.",
    modelAnswer: "Stakeholders, objection, data/story you used, outcome.",
    tips: "Quantify impact if possible.",
  },
  {
    bankSource: "Centerview",
    category: "Deal Discussion",
    difficulty: "Hard",
    year: 2026,
    question: "How do you decide between an IPO and a sale?",
    modelAnswer:
      "Valuation, market window, founder goals, governance, speed, certainty, and investor appetite.",
    tips: "Use a decision tree tone.",
  },
  // Apollo
  {
    bankSource: "Apollo",
    category: "Technical",
    difficulty: "Medium",
    year: 2026,
    question: "How does adding leverage affect IRR?",
    modelAnswer:
      "Amplifies equity returns if cash flows service debt; turns negative if too thin a cushion.",
    tips: "Mention downside cases.",
  },
  {
    bankSource: "Apollo",
    category: "Technical",
    difficulty: "Medium",
    year: 2026,
    question: "What's the difference between private equity and credit investing?",
    modelAnswer:
      "Seniority, cash yield vs. control upside, risk/return, and covenant structures.",
    tips: "Apollo spans both—show awareness.",
  },
  {
    bankSource: "Apollo",
    category: "Deal Discussion",
    difficulty: "Hard",
    year: 2026,
    question: "Tell me about a distressed company you find interesting.",
    modelAnswer:
      "Capital structure, triggers, recovery prospects, and what would need to change for value.",
    tips: "Stay factual; avoid trading advice.",
  },
  {
    bankSource: "Apollo",
    category: "Technical",
    difficulty: "Hard",
    year: 2026,
    question: "Walk me through a PIK loan and when you'd use it.",
    modelAnswer:
      "Payment-in-kind interest conserves cash; higher cost; used when liquidity constrained but recovery thesis intact.",
    tips: "Relate to lender protections.",
  },
  {
    bankSource: "Apollo",
    category: "Behavioral",
    difficulty: "Hard",
    year: 2026,
    question: "What makes Apollo's strategy different from other mega-funds?",
    modelAnswer:
      "Credit + hybrid + insurance-linked capital at scale; contrast with pure buyout peers at high level.",
    tips: "Read latest public filings/overview if possible.",
  },
  // Houlihan Lokey
  {
    bankSource: "Houlihan Lokey",
    category: "Behavioral",
    difficulty: "Easy",
    year: 2025,
    question: "Why IB, why Chicago, why HL, why Healthcare?",
    modelAnswer:
      "Structure your answer in four parts: Why IB — exposure to complex transactions across industries, steep learning curve, financial modeling and advisory skills. Why Chicago — strong Midwest deal flow, lower cost of living than NY, strong alumni network, preference for Midwest culture. Why HL — #1 M&A advisor for middle market, restructuring pedigree, collaborative culture, specific deal experience in [group]. Why Healthcare — defensible industry with secular growth drivers, complex regulatory environment creates advisory need, personal interest in healthcare innovation and the intersection of capital and medicine.",
    tips: "Research HL's recent healthcare deals before the interview. Know their league table rankings. Have a specific HL deal you find interesting ready to discuss.",
  },
  {
    bankSource: "Houlihan Lokey",
    category: "Technical",
    difficulty: "Medium",
    year: 2025,
    question: "Walk me through a sell-side process.",
    modelAnswer:
      "A sell-side M&A process typically runs 4-6 months in five phases. Phase 1 — Preparation (4-6 weeks): Banker is retained, management presentations prepared, CIM (Confidential Information Memorandum) drafted, data room set up, target buyer list identified. Phase 2 — First Round (3-4 weeks): Teaser sent to potential buyers under NDA, CIM distributed to interested parties, first round bids submitted (indicative, non-binding). Phase 3 — Management Presentations (2-3 weeks): Shortlist of buyers (typically 3-6) invited to meet management, Q&A on business model and financials. Phase 4 — Final Round (2-3 weeks): Final bids submitted with markup of purchase agreement, financing committed, final due diligence. Phase 5 — Signing and Close: Purchase agreement negotiated and signed, regulatory approvals obtained, deal closes and funds transfer.",
    tips: "Know the difference between a broad auction, targeted auction, and negotiated sale. Be ready to discuss why a seller might choose each process type.",
  },
  {
    bankSource: "Houlihan Lokey",
    category: "Behavioral",
    difficulty: "Easy",
    year: 2025,
    question: "What do analysts do in investment banking?",
    modelAnswer:
      "IB analysts are the execution engine of deals. Day-to-day work falls into three buckets: (1) Financial modeling — building and maintaining LBO models, DCF models, merger models, and trading/transaction comps. (2) Marketing materials — creating pitchbooks, CIMs, management presentations, and board materials. Often 50-100 page documents with heavy PowerPoint and Excel work. (3) Deal execution — coordinating due diligence, managing data rooms, tracking buyer/seller requests, and interfacing with lawyers and accountants. The learning curve is steep — analysts touch every part of a deal and build a broad foundation across industries and transaction types in 2 years.",
    tips: "Show genuine enthusiasm for the execution work, not just the exit opps. Interviewers want to see you understand what the day-to-day actually looks like.",
  },
  {
    bankSource: "Houlihan Lokey",
    category: "Accounting",
    difficulty: "Easy",
    year: 2025,
    question: "Walk me through the 3 financial statements and what line items are on them.",
    modelAnswer:
      "Income Statement: Revenue, COGS, Gross Profit, Operating Expenses (SG&A, R&D), EBITDA, D&A, EBIT, Interest Expense, EBT, Taxes, Net Income. Covers a period of time. Balance Sheet: Assets (Cash, Accounts Receivable, Inventory, PP&E, Goodwill, Intangibles), Liabilities (Accounts Payable, Accrued Expenses, Short-term Debt, Long-term Debt, Deferred Revenue), Equity (Common Stock, Retained Earnings, APIC). Point in time snapshot. Assets = Liabilities + Equity always. Cash Flow Statement: CFO (Net Income + D&A + working capital changes), CFI (CapEx, acquisitions, asset sales), CFF (debt issuance/repayment, equity issuance, dividends). Reconciles beginning and ending cash on the balance sheet.",
    tips: "Practice rattling through line items quickly — interviewers want to see you know them cold.",
  },
  {
    bankSource: "Houlihan Lokey",
    category: "Accounting",
    difficulty: "Medium",
    year: 2025,
    question: "How does an increase in $50 in stock-based compensation impact the 3 financial statements?",
    modelAnswer:
      "Income Statement: SBC is a non-cash operating expense. OpEx increases by $50, EBIT falls by $50, pre-tax income falls by $50, taxes fall by $20 (at 40% rate), Net Income falls by $30. Cash Flow Statement: Net Income down $30, but add back $50 SBC as non-cash charge in CFO. Net cash impact = +$20 (the tax shield). Balance Sheet: Cash increases by $20 (tax shield). On equity side: Retained Earnings fall by $30 (lower net income) but Additional Paid-In Capital increases by $50 (shares issued). Net equity impact = +$20. Assets up $20 = Liabilities + Equity up $20. Balance sheet balances.",
    tips: "This is a common twist on the standard depreciation question. The key difference is SBC increases equity (APIC) unlike depreciation which has no equity offset.",
  },
  {
    bankSource: "Houlihan Lokey",
    category: "Valuation",
    difficulty: "Easy",
    year: 2025,
    question: "Walk me through the 3 main valuation methods.",
    modelAnswer:
      "Three main methods: (1) Comparable Company Analysis (Trading Comps) — value a company based on how similar public companies trade. Calculate EV/EBITDA, EV/Revenue, P/E for peers and apply to subject company. Reflects current market sentiment. (2) Precedent Transaction Analysis (Deal Comps) — value based on what acquirers have paid for similar companies in M&A deals. Typically shows higher values than trading comps due to control premium (usually 20-30%). (3) Discounted Cash Flow (DCF) — intrinsic value based on projected free cash flows discounted at WACC plus a terminal value. Most theoretically rigorous but most sensitive to assumptions. Bankers present all three in a football field chart showing the valuation ranges.",
    tips: "Know which typically gives the highest value (precedent transactions) and why (control premium). Be ready to discuss when you'd weight each method more heavily.",
  },
  {
    bankSource: "Houlihan Lokey",
    category: "Valuation",
    difficulty: "Medium",
    year: 2025,
    question: "What can be a fourth valuation method?",
    modelAnswer:
      "Several options depending on context: (1) LBO Analysis — what price a financial buyer could pay and still hit their return hurdle (typically 20%+ IRR). Sets a valuation floor from a PE perspective. (2) Sum-of-the-Parts (SOTP) — value each business segment separately using appropriate multiples then add them up. Used for conglomerates or diversified companies. (3) 52-Week Trading Range — where the stock has traded, useful for public companies. (4) Analyst Price Targets — what sell-side analysts project. (5) Liquidation Analysis — for distressed companies, what assets would fetch in a wind-down. In restructuring contexts like HL, LBO analysis and liquidation analysis are particularly relevant.",
    tips: "For HL specifically, mentioning LBO analysis and liquidation value shows awareness of their restructuring expertise.",
  },
  {
    bankSource: "Houlihan Lokey",
    category: "LBO Models",
    difficulty: "Medium",
    year: 2025,
    question: "How can you boost returns in an LBO?",
    modelAnswer:
      "Three main levers: (1) Leverage — more debt means less equity invested for the same purchase price, amplifying returns on equity. (2) Multiple Expansion — buy at a lower EV/EBITDA multiple than you exit at. If you buy at 7x and sell at 9x, that spread directly boosts equity returns. (3) EBITDA Growth — grow earnings through revenue growth, margin expansion, or cost cuts. More EBITDA at exit means higher EV even at the same multiple. Additional levers: dividend recapitalization (return capital early, boosting IRR), add-on acquisitions at lower multiples (multiple arbitrage), working capital optimization to generate cash, and debt paydown reducing leverage at exit.",
    tips: "Structure your answer around the three main drivers first, then add the secondary levers. Shows you understand the core mechanics before the nuances.",
  },
  {
    bankSource: "Houlihan Lokey",
    category: "Valuation",
    difficulty: "Easy",
    year: 2025,
    question: "Rank the 3 valuation methods from lowest to highest value.",
    modelAnswer:
      "Generally: DCF (varies widely) < Trading Comps < Precedent Transactions. Precedent transactions are highest because acquirers pay a control premium — typically 20-30% above the unaffected share price — to gain control of a company. Trading comps reflect minority interest pricing with no control premium. DCF is the most variable — it can be highest or lowest depending on assumptions, but is often conservative because it relies on your own projections rather than what the market or acquirers are actually paying. In practice, bankers show all three in a football field chart and the ranges often overlap.",
    tips: "Note that DCF can go either way — the question is really about precedent transactions vs trading comps, where precedent transactions are almost always higher due to the control premium.",
  },
  {
    bankSource: "Houlihan Lokey",
    category: "Valuation",
    difficulty: "Hard",
    year: 2025,
    question:
      "Company A trades at 10x EBITDA and Company B trades at 20x EBITDA. They have the same financial profile. Why are investors valuing them differently?",
    modelAnswer:
      "If two companies have the same financial profile but different multiples, investors must be pricing in qualitative or forward-looking differences: (1) Growth expectations — Company B may have higher expected revenue or EBITDA growth, and investors are paying for future earnings not just current. (2) Margin profile/quality of earnings — Company B may have more recurring revenue, better unit economics, or more predictable cash flows. (3) Market position — Company B may have a stronger competitive moat, better brand, or network effects. (4) Industry/sector — Company B may operate in a higher-growth or higher-multiple sector. (5) Capital efficiency — Company B may have higher returns on invested capital. (6) Management quality or strategic optionality. The key insight: same EBITDA today doesn't mean same value — investors pay for the quality and growth of future cash flows, not just current earnings.",
    tips: "This is testing whether you understand that multiples reflect forward-looking expectations, not just current financials. Show you can think beyond the numbers.",
  },
  {
    bankSource: "Houlihan Lokey",
    category: "Valuation",
    difficulty: "Medium",
    year: 2025,
    question: "A company trades at 2x Revenue and 10x EBITDA. What is the implied EBITDA margin?",
    modelAnswer:
      "EBITDA Margin = EBITDA / Revenue. If EV/Revenue = 2x and EV/EBITDA = 10x, then: EV = 2 × Revenue and EV = 10 × EBITDA. Therefore: 2 × Revenue = 10 × EBITDA. EBITDA/Revenue = 2/10 = 20%. The implied EBITDA margin is 20%. Quick mental math: divide the revenue multiple by the EBITDA multiple to get the margin. 2/10 = 20%. This works because both multiples use the same EV numerator.",
    tips: "This is a quick math question — practice doing it in under 10 seconds. The formula is: EBITDA Margin = EV/Revenue multiple ÷ EV/EBITDA multiple.",
  },
  // Case in Point / General Consulting
  {
    bankSource: "Case in Point / General Consulting",
    category: "Consulting - Behavioral",
    difficulty: "Easy",
    year: 2026,
    question: "Why consulting?",
    modelAnswer:
      "Structure around three points: (1) Variety — consultants work across industries and problem types, building broad expertise faster than any other career. (2) Impact — direct access to C-suite decision makers, seeing your recommendations implemented. (3) Development — steep learning curve, best training ground for structured problem solving and communication. Always tie back to a specific experience that sparked the interest.",
    tips: null,
    careerTracks: ["Consulting"],
  },
  {
    bankSource: "Case in Point / General Consulting",
    category: "Consulting - Behavioral",
    difficulty: "Easy",
    year: 2026,
    question: "What do consultants do?",
    modelAnswer:
      "Consultants help organizations solve complex business problems they lack the internal expertise, bandwidth, or objectivity to solve themselves. Day-to-day work includes: structuring ambiguous problems into workable frameworks, gathering and analyzing data, building financial models, interviewing stakeholders, developing recommendations, and presenting findings to senior leadership. The core skill is taking a massive amount of information and synthesizing it into a clear, actionable recommendation.",
    tips: null,
    careerTracks: ["Consulting"],
  },
  {
    bankSource: "Case in Point / General Consulting",
    category: "Consulting - Behavioral",
    difficulty: "Medium",
    year: 2026,
    question: "Walk me through the profitability framework.",
    modelAnswer:
      "Profit = Revenue - Costs. Revenue = Price × Volume. Break Volume into: number of customers × purchase frequency × units per purchase. Break Price into: pricing strategy, discounts, mix. Costs = Fixed (rent, salaries, depreciation) + Variable (COGS, commissions). First identify whether it's a revenue or cost problem, then drill down into the specific driver. Always ask: is this a recent change or long-standing issue? Is it industry-wide or company-specific?",
    tips: null,
    careerTracks: ["Consulting"],
  },
  {
    bankSource: "Case in Point / General Consulting",
    category: "Consulting - Behavioral",
    difficulty: "Hard",
    year: 2026,
    question: "A client's profits have declined 20% YoY. How do you approach this?",
    modelAnswer:
      "Start by clarifying: is it revenue down, costs up, or both? What timeframe? Is it across all products/segments or specific ones? Then structure: Revenue side — has price changed? Volume? Mix? Are we losing customers or selling less per customer? Cost side — have fixed costs increased (new facilities, headcount)? Variable costs up (input prices, labor)? Next isolate the primary driver, then identify root cause. Close with: is this fixable and what's the recommended action?",
    tips: null,
    careerTracks: ["Consulting"],
  },
  {
    bankSource: "Case in Point / General Consulting",
    category: "Consulting - Behavioral",
    difficulty: "Medium",
    year: 2026,
    question: "Estimate the market size of the US coffee market.",
    modelAnswer:
      "Market sizing structure: US population ~330M. Adults who drink coffee (~65%) = ~215M coffee drinkers. Average cups per day = 2. Days per year = 365. Total cups = 215M × 2 × 365 = ~157B cups/year. Average price per cup: mix of home brew (~$0.50) and café (~$4.00). Assume 60% home, 40% café. Weighted average = ~$1.90/cup. Total market = 157B × $1.90 = ~$300B. Sanity check: Starbucks alone does ~$35B in US revenue which fits. Answer: ~$250-300B US coffee market.",
    tips: null,
    careerTracks: ["Consulting"],
  },
  {
    bankSource: "Case in Point / General Consulting",
    category: "Consulting - Behavioral",
    difficulty: "Medium",
    year: 2026,
    question: "Walk me through a market entry framework.",
    modelAnswer:
      "Four areas to assess: (1) Market Attractiveness — size, growth rate, profitability, cyclicality. (2) Competitive Landscape — number of players, concentration, barriers to entry, our potential differentiation. (3) Company Fit — do we have the capabilities, capital, and strategic rationale? Build, buy, or partner? (4) Financial Viability — what investment is required, what's the expected return, break-even timeline. Always end with a recommendation: enter or don't enter, and through which mode.",
    tips: null,
    careerTracks: ["Consulting"],
  },
  {
    bankSource: "Case in Point / General Consulting",
    category: "Consulting - Behavioral",
    difficulty: "Easy",
    year: 2026,
    question: "What is MECE and why does it matter?",
    modelAnswer:
      "MECE stands for Mutually Exclusive, Collectively Exhaustive. Mutually Exclusive means no overlap between categories — each issue fits in exactly one bucket. Collectively Exhaustive means together the categories cover every possible cause — nothing is left out. It matters because consultants need to structure problems in a way that ensures they're not double-counting issues (ME) and not missing anything (CE). A non-MECE framework leads to confused analysis and missed insights.",
    tips: null,
    careerTracks: ["Consulting"],
  },
  {
    bankSource: "Case in Point / General Consulting",
    category: "Consulting - Behavioral",
    difficulty: "Medium",
    year: 2026,
    question: "Walk me through Porter's Five Forces.",
    modelAnswer:
      "Five Forces analyzes industry attractiveness: (1) Threat of New Entrants — how easy is it for new competitors to enter? Barriers include capital requirements, economies of scale, brand loyalty, regulation. (2) Bargaining Power of Suppliers — can suppliers raise prices or reduce quality? High when few suppliers or high switching costs. (3) Bargaining Power of Buyers — can customers demand lower prices? High when buyers are concentrated or products are commoditized. (4) Threat of Substitutes — can customers switch to alternatives? (5) Competitive Rivalry — how intense is competition among existing players? Together these determine how much profit any firm in the industry can sustainably capture.",
    tips: null,
    careerTracks: ["Consulting"],
  },
  {
    bankSource: "Case in Point / General Consulting",
    category: "Consulting - Behavioral",
    difficulty: "Hard",
    year: 2026,
    question: "A retailer wants to know if they should launch a new product line. How do you advise them?",
    modelAnswer:
      "Structure the analysis in three parts: (1) Market Opportunity — is there customer demand? What's the market size and growth? Who are the target customers? (2) Competitive Dynamics — who else sells this? How are we differentiated? What's our competitive advantage? (3) Internal Fit — do we have the capabilities to produce and distribute this? What's the investment required and expected return? What's the cannibalization risk to existing products? End with a clear recommendation: launch, don't launch, or launch with modifications, and explain your reasoning.",
    tips: null,
    careerTracks: ["Consulting"],
  },
  {
    bankSource: "Case in Point / General Consulting",
    category: "Consulting - Behavioral",
    difficulty: "Medium",
    year: 2026,
    question: "What are the four key case scenarios according to the Ivy Case System?",
    modelAnswer:
      "The four key scenarios are: (1) Profitability — company profits are declining, need to diagnose revenue vs cost issues. (2) Entering a New Market — should a company expand into a new geography or product category. (3) Industry Analysis — assess the attractiveness and dynamics of an industry. (4) Mergers & Acquisitions — should a company acquire another, and at what price/terms. Each scenario has a standard framework structure but good consultants adapt the framework to the specific facts of the case.",
    tips: null,
    careerTracks: ["Consulting"],
  },
  {
    bankSource: "Case in Point / General Consulting",
    category: "Consulting - Behavioral",
    difficulty: "Easy",
    year: 2026,
    question: "How do you handle getting stuck in a case interview?",
    modelAnswer:
      "Stay calm — interviewers expect candidates to hit walls. Four tactics: (1) Buy time by summarizing what you know so far: 'Let me recap what we've established...' (2) Go back to your framework and identify which branch you haven't explored. (3) Ask a clarifying question: 'Can you tell me more about X?' (4) State your assumption out loud and move forward: 'I'm going to assume X because...' Never go silent. The interviewer is evaluating your composure and structured thinking under pressure as much as your answer.",
    tips: null,
    careerTracks: ["Consulting"],
  },
  {
    bankSource: "Case in Point / General Consulting",
    category: "Consulting - Case Math",
    difficulty: "Hard",
    year: 2026,
    question:
      "A company has revenue of $500M and EBITDA margin of 20%. Fixed costs are $60M. If variable costs increase by 10%, what happens to EBITDA?",
    modelAnswer:
      "Current EBITDA = $500M × 20% = $100M. Total costs = $500M - $100M = $400M. Fixed costs = $60M, so Variable costs = $340M. 10% increase in variable costs = $34M additional cost. New EBITDA = $100M - $34M = $66M. New EBITDA margin = $66M / $500M = 13.2%. EBITDA declined by $34M or 34%.",
    tips: null,
    careerTracks: ["Consulting"],
  },
  {
    bankSource: "Case in Point / General Consulting",
    category: "Consulting - Case Math",
    difficulty: "Medium",
    year: 2026,
    question: "Market sizing: How many gas stations are in the United States?",
    modelAnswer:
      "Structure: US has ~130M households. Assume 1.5 cars per household = ~195M cars. Cars need to fill up roughly once per week = 195M fill-ups/week. Each gas station can handle roughly 1,000 fill-ups per week (10 pumps, ~14 hours/day, ~7 cars/hour per pump). Gas stations needed = 195M / 1,000 = ~195,000. Real answer is ~150,000 — our estimate is reasonable. Always show your structure and sanity check.",
    tips: null,
    careerTracks: ["Consulting"],
  },
];

/** Banks shown in UI filter (counts include seeded + user submissions). */
export const MOCK_INTERVIEW_BANKS = [
  "Case in Point / General Consulting",
  "Goldman Sachs",
  "Morgan Stanley",
  "JPMorgan",
  "KKR",
  "Blackstone",
  "Apollo",
  "Evercore",
  "Centerview",
  "PJT",
  "Carlyle",
  "Warburg Pincus",
  "Bain Capital",
  "TPG",
  "Ares",
  "Lazard",
  "Moelis",
  "Houlihan Lokey",
  "Rothschild",
  "William Blair",
  "Baird",
  "Lincoln International",
  "Raymond James",
  "Piper Sandler",
] as const;

const GENERIC_BEHAVIORAL_BANKS = [
  "PJT",
  "Carlyle",
  "Warburg Pincus",
  "Bain Capital",
  "TPG",
  "Ares",
  "Lazard",
  "Moelis",
  "Rothschild",
  "William Blair",
  "Baird",
  "Lincoln International",
  "Raymond James",
  "Piper Sandler",
] as const;

const extraBanks: SeedMockQ[] = GENERIC_BEHAVIORAL_BANKS.map((bank) => ({
  bankSource: bank,
  category: "Behavioral",
  difficulty: "Medium",
  year: 2026,
  question: `Why ${bank} for your recruiting search?`,
  modelAnswer:
    "Tie firm strengths (franchise, culture, deal type) to your experience and long-term goals with specifics.",
  tips: "Prepare one deal headline or fund fact per firm.",
  careerTracks: ["Investment Banking"],
}));

rows.push(...extraBanks);

export function mockInterviewSeedRows() {
  return rows.map((r) => ({
    ...r,
    dedupeKey: key(r.bankSource, r.question),
    status: "active",
    upvotes: 0,
    careerTracks: r.careerTracks?.length ? r.careerTracks : ["Investment Banking"],
  }));
}
