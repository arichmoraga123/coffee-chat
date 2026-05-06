/** Additional question-bank rows tagged by career track (BIWS-style). */

function kw(tags: string[], extra: string[] = []) {
  return Array.from(new Set([...tags.map((t) => t.toLowerCase()), ...extra])).slice(0, 8);
}

export type SeedTrackQuestion = {
  question: string;
  answer: string;
  category: string;
  difficulty: string;
  tags: string[];
  careerTracks: string[];
  keywords: string[];
  source?: string;
};

const SRC = "DealFlow track prep";

const BASE: Array<Omit<SeedTrackQuestion, "keywords">> = [
  // Consulting
  {
    question: "Walk me through a profitability framework.",
    answer:
      "Decompose profit into Revenue minus Costs. Revenue = Price × Volume, then break volume into traffic, conversion, retention, and mix; break price into list price, discounts, and promotions. Costs = Fixed plus Variable: map rent, labor, marketing, COGS, and overhead. Identify which branch moved versus plan or prior year, then hypothesize drivers (e.g., input cost inflation vs volume softness) and size each lever before recommending actions.",
    category: "Consulting",
    difficulty: "Medium",
    tags: ["consulting", "profitability", "framework"],
    careerTracks: ["Consulting"],
  },
  {
    question: "A client's profits have declined 20% YoY. How do you approach this?",
    answer:
      "Clarify the profit definition (EBITDA vs net income) and timeframe. Build a variance bridge: revenue vs costs YoY. If revenue-led, segment by geography, product, and channel; check price vs volume. If cost-led, split fixed vs variable and benchmark to peers. Quantify the top 2–3 drivers, sanity-check with operational KPIs (units, headcount, commodity indices), then prioritize hypotheses for quick data pulls before recommending initiatives.",
    category: "Consulting",
    difficulty: "Medium",
    tags: ["consulting", "profit"],
    careerTracks: ["Consulting"],
  },
  {
    question: "Estimate the market size of the US coffee market.",
    answer:
      "Use a demand-side approach: US population × share that drinks coffee regularly × cups per week × retail price per cup for away-from-home, plus separate estimate for at-home (households × bags per year × price). State assumptions explicitly (penetration, frequency, split drip vs specialty). Cross-check with top-down spend as % of food away-from-home. Give a range and discuss sensitivity to frequency and premiumization.",
    category: "Consulting",
    difficulty: "Hard",
    tags: ["sizing", "market"],
    careerTracks: ["Consulting"],
  },
  {
    question: "Walk me through a market entry framework.",
    answer:
      "Assess market attractiveness (size, growth, profitability, regulation), competitive intensity, and customer needs. Evaluate company capabilities vs required capabilities (brand, distribution, product localization). Compare entry modes: greenfield, partnership, acquisition, licensing—trade off speed, control, capital, and risk. Recommend a phased plan with milestones, investment envelope, and kill criteria.",
    category: "Consulting",
    difficulty: "Medium",
    tags: ["market entry"],
    careerTracks: ["Consulting"],
  },
  {
    question: "Our client is considering acquiring a competitor. How do you advise them?",
    answer:
      "Start with strategic fit: does the target strengthen geography, customers, technology, or scale? Build a synergy case (revenue cross-sell, procurement, overhead) grounded in operational reality. Value the target with comps, DCF, and accretion/dilution if public. Flag integration risks (systems, culture, regulatory). Recommend only if returns exceed hurdle after premium; outline diligence workstreams and negotiation priorities (reps, financing, carve-outs).",
    category: "Consulting",
    difficulty: "Hard",
    tags: ["M&A", "strategy"],
    careerTracks: ["Consulting"],
  },
  {
    question: "What is MECE and why does it matter in consulting?",
    answer:
      "MECE means Mutually Exclusive, Collectively Exhaustive: buckets should not overlap and together should cover the full problem space. It reduces double-counting, makes communication crisp for executives, and ensures teams do not miss a major branch of analysis. In practice, use issue trees and hypothesis-driven workplans while avoiding false precision—refine buckets as you learn.",
    category: "Consulting",
    difficulty: "Easy",
    tags: ["MECE"],
    careerTracks: ["Consulting"],
  },
  {
    question: "Walk me through an issue tree for declining revenues.",
    answer:
      "Root cause is either fewer customers, lower spend per customer, or lower realized price. Split volume: new customer acquisition vs retention/churn vs frequency. Split price/mix: base price, discounting, product mix shift to lower-priced SKUs, or channel mix. Layer geography and segment cuts. For each branch, list data needed (CRM, POS, pipeline) and test the largest gaps first.",
    category: "Consulting",
    difficulty: "Medium",
    tags: ["issue tree", "revenue"],
    careerTracks: ["Consulting"],
  },
  {
    question: "Why consulting?",
    answer:
      "Structure around three points: (1) Variety — consultants work across industries and problem types, building broad expertise faster than any other career. (2) Impact — direct access to C-suite decision makers, seeing your recommendations implemented. (3) Development — steep learning curve, best training ground for structured problem solving and communication. Always tie back to a specific experience that sparked the interest.",
    category: "Consulting - Behavioral",
    difficulty: "Easy",
    tags: ["variety", "impact", "problem solving", "structured", "development"],
    careerTracks: ["Consulting"],
  },
  {
    question: "What do consultants do?",
    answer:
      "Consultants help organizations solve complex business problems they lack the internal expertise, bandwidth, or objectivity to solve themselves. Day-to-day work includes: structuring ambiguous problems into workable frameworks, gathering and analyzing data, building financial models, interviewing stakeholders, developing recommendations, and presenting findings to senior leadership. The core skill is taking a massive amount of information and synthesizing it into a clear, actionable recommendation.",
    category: "Consulting - Behavioral",
    difficulty: "Easy",
    tags: ["problem solving", "frameworks", "analysis", "recommendations", "structured"],
    careerTracks: ["Consulting"],
  },
  {
    question: "Walk me through the profitability framework.",
    answer:
      "Profit = Revenue - Costs. Revenue = Price × Volume. Break Volume into: number of customers × purchase frequency × units per purchase. Break Price into: pricing strategy, discounts, mix. Costs = Fixed (rent, salaries, depreciation) + Variable (COGS, commissions). First identify whether it's a revenue or cost problem, then drill down into the specific driver. Always ask: is this a recent change or long-standing issue? Is it industry-wide or company-specific?",
    category: "Consulting - Behavioral",
    difficulty: "Medium",
    tags: ["profit", "revenue", "costs", "fixed", "variable", "price", "volume"],
    careerTracks: ["Consulting"],
  },
  {
    question: "A client's profits have declined 20% YoY. How do you approach this?",
    answer:
      "Start by clarifying: is it revenue down, costs up, or both? What timeframe? Is it across all products/segments or specific ones? Then structure: Revenue side — has price changed? Volume? Mix? Are we losing customers or selling less per customer? Cost side — have fixed costs increased (new facilities, headcount)? Variable costs up (input prices, labor)? Next isolate the primary driver, then identify root cause. Close with: is this fixable and what's the recommended action?",
    category: "Consulting - Behavioral",
    difficulty: "Hard",
    tags: ["profitability", "revenue", "costs", "clarify", "structure", "root cause"],
    careerTracks: ["Consulting"],
  },
  {
    question: "Estimate the market size of the US coffee market.",
    answer:
      "Market sizing structure: US population ~330M. Adults who drink coffee (~65%) = ~215M coffee drinkers. Average cups per day = 2. Days per year = 365. Total cups = 215M × 2 × 365 = ~157B cups/year. Average price per cup: mix of home brew (~$0.50) and cafe (~$4.00). Assume 60% home, 40% cafe. Weighted average = ~$1.90/cup. Total market = 157B × $1.90 = ~$300B. Sanity check: Starbucks alone does ~$35B in US revenue which fits. Answer: ~$250-300B US coffee market.",
    category: "Consulting - Behavioral",
    difficulty: "Medium",
    tags: ["market sizing", "population", "segmentation", "assumptions", "sanity check"],
    careerTracks: ["Consulting"],
  },
  {
    question: "Walk me through a market entry framework.",
    answer:
      "Four areas to assess: (1) Market Attractiveness — size, growth rate, profitability, cyclicality. (2) Competitive Landscape — number of players, concentration, barriers to entry, our potential differentiation. (3) Company Fit — do we have the capabilities, capital, and strategic rationale? Build, buy, or partner? (4) Financial Viability — what investment is required, what's the expected return, break-even timeline. Always end with a recommendation: enter or don't enter, and through which mode.",
    category: "Consulting - Behavioral",
    difficulty: "Medium",
    tags: ["market entry", "attractiveness", "competition", "capabilities", "financials", "recommendation"],
    careerTracks: ["Consulting"],
  },
  {
    question: "What is MECE and why does it matter?",
    answer:
      "MECE stands for Mutually Exclusive, Collectively Exhaustive. Mutually Exclusive means no overlap between categories — each issue fits in exactly one bucket. Collectively Exhaustive means together the categories cover every possible cause — nothing is left out. It matters because consultants need to structure problems in a way that ensures they're not double-counting issues (ME) and not missing anything (CE). A non-MECE framework leads to confused analysis and missed insights.",
    category: "Consulting - Behavioral",
    difficulty: "Easy",
    tags: ["MECE", "mutually exclusive", "collectively exhaustive", "structure", "framework"],
    careerTracks: ["Consulting"],
  },
  {
    question: "Walk me through Porter's Five Forces.",
    answer:
      "Five Forces analyzes industry attractiveness: (1) Threat of New Entrants — how easy is it for new competitors to enter? Barriers include capital requirements, economies of scale, brand loyalty, regulation. (2) Bargaining Power of Suppliers — can suppliers raise prices or reduce quality? High when few suppliers or high switching costs. (3) Bargaining Power of Buyers — can customers demand lower prices? High when buyers are concentrated or products are commoditized. (4) Threat of Substitutes — can customers switch to alternatives? (5) Competitive Rivalry — how intense is competition among existing players? Together these determine how much profit any firm in the industry can sustainably capture.",
    category: "Consulting - Behavioral",
    difficulty: "Medium",
    tags: ["Porter", "five forces", "competition", "suppliers", "buyers", "substitutes", "rivalry"],
    careerTracks: ["Consulting"],
  },
  {
    question: "A retailer wants to know if they should launch a new product line. How do you advise them?",
    answer:
      "Structure the analysis in three parts: (1) Market Opportunity — is there customer demand? What's the market size and growth? Who are the target customers? (2) Competitive Dynamics — who else sells this? How are we differentiated? What's our competitive advantage? (3) Internal Fit — do we have the capabilities to produce and distribute this? What's the investment required and expected return? What's the cannibalization risk to existing products? End with a clear recommendation: launch, don't launch, or launch with modifications, and explain your reasoning.",
    category: "Consulting - Behavioral",
    difficulty: "Hard",
    tags: ["market opportunity", "competitive advantage", "capabilities", "investment", "recommendation", "cannibalization"],
    careerTracks: ["Consulting"],
  },
  {
    question: "What are the four key case scenarios according to the Ivy Case System?",
    answer:
      "The four key scenarios are: (1) Profitability — company profits are declining, need to diagnose revenue vs cost issues. (2) Entering a New Market — should a company expand into a new geography or product category. (3) Industry Analysis — assess the attractiveness and dynamics of an industry. (4) Mergers & Acquisitions — should a company acquire another, and at what price/terms. Each scenario has a standard framework structure but good consultants adapt the framework to the specific facts of the case.",
    category: "Consulting - Behavioral",
    difficulty: "Medium",
    tags: ["Ivy Case System", "profitability", "market entry", "industry analysis", "M&A", "framework"],
    careerTracks: ["Consulting"],
  },
  {
    question: "How do you handle getting stuck in a case interview?",
    answer:
      "Stay calm — interviewers expect candidates to hit walls. Four tactics: (1) Buy time by summarizing what you know so far: 'Let me recap what we've established...' (2) Go back to your framework and identify which branch you haven't explored. (3) Ask a clarifying question: 'Can you tell me more about X?' (4) State your assumption out loud and move forward: 'I'm going to assume X because...' Never go silent. The interviewer is evaluating your composure and structured thinking under pressure as much as your answer.",
    category: "Consulting - Behavioral",
    difficulty: "Easy",
    tags: ["stuck", "composure", "framework", "clarify", "assumptions", "structured thinking"],
    careerTracks: ["Consulting"],
  },
  {
    question:
      "A company has revenue of $500M and EBITDA margin of 20%. Fixed costs are $60M. If variable costs increase by 10%, what happens to EBITDA?",
    answer:
      "Current EBITDA = $500M × 20% = $100M. Total costs = $500M - $100M = $400M. Fixed costs = $60M, so Variable costs = $340M. 10% increase in variable costs = $34M additional cost. New EBITDA = $100M - $34M = $66M. New EBITDA margin = $66M / $500M = 13.2%. EBITDA declined by $34M or 34%.",
    category: "Consulting - Case Math",
    difficulty: "Hard",
    tags: ["EBITDA", "fixed costs", "variable costs", "margin", "calculation"],
    careerTracks: ["Consulting"],
  },
  {
    question: "Market sizing: How many gas stations are in the United States?",
    answer:
      "Structure: US has ~130M households. Assume 1.5 cars per household = ~195M cars. Cars need to fill up roughly once per week = 195M fill-ups/week. Each gas station can handle roughly 1,000 fill-ups per week (10 pumps, ~14 hours/day, ~7 cars/hour per pump). Gas stations needed = 195M / 1,000 = ~195,000. Real answer is ~150,000 — our estimate is reasonable. Always show your structure and sanity check.",
    category: "Consulting - Case Math",
    difficulty: "Medium",
    tags: ["market sizing", "gas stations", "estimation", "structure", "sanity check"],
    careerTracks: ["Consulting"],
  },
  // Capital Markets
  {
    question: "Walk me through how a bond is priced.",
    answer:
      "Bond price is the present value of future cash flows—coupon payments and principal—discounted at yields that reflect credit spread, liquidity, and benchmark curve. New issues are priced by anchoring to comparable maturity/rating curves, adjusting for issuer-specific risk, covenants, call features, and size/liquidity premium. The syndicate tests demand in the order book and sets final spread to clear the market at the target size.",
    category: "Capital Markets",
    difficulty: "Medium",
    tags: ["DCM", "bonds"],
    careerTracks: ["Capital Markets"],
  },
  {
    question: "What is the yield curve and what does an inverted yield curve signal?",
    answer:
      "The yield curve plots yields of same-credit government bonds across maturities. Normally upward-sloping because term premium compensates for duration risk. Inversion (short rates above long) often reflects tight monetary policy and expectations of slower growth or disinflation; historically associated with higher recession probability, though it is not a timing tool by itself.",
    category: "Capital Markets",
    difficulty: "Easy",
    tags: ["rates", "macro"],
    careerTracks: ["Capital Markets"],
  },
  {
    question: "What is the difference between investment grade and high yield debt?",
    answer:
      "Investment grade (typically BBB-/Baa3 and above) carries lower default risk and trades at tighter spreads; institutions with rating mandates can hold it. High yield (below IG) compensates investors for higher credit and liquidity risk, often has stronger covenants or security but more volatile trading. HY issuers may be smaller, more leveraged, or private-equity owned with different refinancing needs.",
    category: "Capital Markets",
    difficulty: "Easy",
    tags: ["credit", "HY"],
    careerTracks: ["Capital Markets"],
  },
  {
    question: "Walk me through an IPO process.",
    answer:
      "Select underwriters, kick off diligence, and draft the registration statement (S-1). SEC review and amendments. Build the equity story, preliminary prospectus (red herring), and syndicate size/price range. Conduct management due diligence and vendor reports. Investor education (testing-the-waters if allowed), roadshow, bookbuild, pricing, allocation, trading debut, and stabilization window. Post-IPO reporting and lock-ups matter for float and volatility.",
    category: "Capital Markets",
    difficulty: "Medium",
    tags: ["IPO", "ECM"],
    careerTracks: ["Capital Markets"],
  },
  {
    question: "What are the key differences between DCM and ECM roles?",
    answer:
      "DCM focuses on debt issuance—corporate bonds, IG/HY, loans, sovereigns—structuring coupons, covenants, maturity stacks, and ratings strategy. ECM focuses on equities—IPOs, follow-ons, converts, blocks—valuation narrative, syndicate dynamics, and marketing to long-only and hedge funds. Both require markets judgment and client management, but risk factors differ (rates/credit vs equity volatility).",
    category: "Capital Markets",
    difficulty: "Easy",
    tags: ["DCM", "ECM"],
    careerTracks: ["Capital Markets"],
  },
  {
    question: "How does a leveraged loan differ from a high yield bond?",
    answer:
      "Leveraged loans are typically senior secured floating-rate bank or institutional term loans with maintenance covenants and amortization, often syndicated to CLOs and banks. High yield bonds are longer public securities, often fixed-rate or fixed-to-float, with incurrence covenants and bullet maturities. Loans rank ahead in capital structure and reset with SOFR; bonds trade with more duration and disclosure under SEC rules.",
    category: "Capital Markets",
    difficulty: "Medium",
    tags: ["levfin", "loans"],
    careerTracks: ["Capital Markets", "Private Credit"],
  },
  {
    question: "What is a roadshow and who attends?",
    answer:
      "A roadshow is a structured marketing period where management and underwriters present the investment thesis to institutional investors ahead of pricing (common for IPOs and large debt deals). Attendees include portfolio managers and analysts from mutual funds, pensions, hedge funds, and insurance companies; banks coordinate logistics, manage the order book, and gather indications of interest to set the final price.",
    category: "Capital Markets",
    difficulty: "Easy",
    tags: ["IPO", "marketing"],
    careerTracks: ["Capital Markets"],
  },
  // Asset Management / ER
  {
    question: "Walk me through how you'd pitch a stock.",
    answer:
      "Company overview and business model, why the market is mispricing it (thesis with 2–3 crisp bullets), key drivers and KPIs, valuation (comps + DCF or sum-of-parts), catalysts and risks, and a clear recommendation with price target and timeframe. End with what would prove you wrong.",
    category: "Asset Management",
    difficulty: "Medium",
    tags: ["stock pitch", "ER"],
    careerTracks: ["Asset Management", "Equity Research"],
  },
  {
    question: "What makes a good long vs short thesis?",
    answer:
      "A good long thesis pairs undervaluation with identifiable catalysts and improving fundamentals (margin, unit growth, capital returns). A short thesis needs overvaluation or deteriorating quality plus a catalyst path (earnings miss, balance sheet stress, regulatory, competitive share loss) and a view on crowdedness/borrow. Both should specify variant perception vs consensus and key data that would confirm or falsify the view.",
    category: "Asset Management",
    difficulty: "Hard",
    tags: ["long short"],
    careerTracks: ["Asset Management", "Hedge Fund"],
  },
  {
    question: "How do you think about portfolio construction?",
    answer:
      "Start with objectives (return, volatility, liquidity horizon) and constraints. Choose risk budget across asset classes and factors, diversify idiosyncratic risk, and size positions by conviction and risk contribution (vol or beta-adjusted). Incorporate correlation regimes, transaction costs, and tax. Rebalance with rules to avoid behavioral drift; overlay risk management for tail scenarios.",
    category: "Asset Management",
    difficulty: "Medium",
    tags: ["portfolio"],
    careerTracks: ["Asset Management", "Wealth Management"],
  },
  {
    question: "Walk me through a DCF for a growth company.",
    answer:
      "Forecast revenue with explicit assumptions on TAM penetration and pricing; model margin expansion path tied to operating leverage. Use higher discount rate or wider fades to reflect uncertainty. Terminal value should be conservative—often cap implied growth near GDP and cross-check exit multiples vs mature peers. Stress-test key inputs (growth, WACC, margin) and show value sensitivity; consider scenario-weighted value.",
    category: "Asset Management",
    difficulty: "Hard",
    tags: ["DCF", "growth"],
    careerTracks: ["Asset Management", "Equity Research", "Investment Banking"],
  },
  {
    question: "What is factor investing?",
    answer:
      "Factor investing targets systematic drivers of returns such as value, momentum, quality, size, and low volatility. Portfolios tilt toward stocks loading positively on chosen factors, often implemented via rules-based indices or quantitative models. It differs from pure stock picking by emphasizing diversified exposure to compensated risk premia while controlling turnover and implementation costs.",
    category: "Asset Management",
    difficulty: "Easy",
    tags: ["quant", "factors"],
    careerTracks: ["Asset Management", "Hedge Fund"],
  },
  // Big 4
  {
    question: "Walk me through the audit process.",
    answer:
      "Planning: understand entity and risks, materiality, internal controls. Risk assessment and substantive vs controls reliance. Fieldwork: tests of details on transactions and balances, analytical procedures, confirmations, sampling, and walkthroughs. Evaluation of misstatements, going concern, subsequent events, and representation letter. Form an opinion (unqualified, qualified, adverse, disclaimer) and issue the auditor's report.",
    category: "Big 4 Accounting",
    difficulty: "Medium",
    tags: ["audit"],
    careerTracks: ["Big 4 Accounting"],
  },
  {
    question: "What is the difference between GAAP and IFRS?",
    answer:
      "Both are accounting standards; US GAAP is rules-based with industry-specific guidance, while IFRS is more principles-based with fewer bright lines. Common differences include revenue recognition timing, lease capitalization, inventory costing (LIFO prohibited under IFRS), and development cost capitalization. Multinationals may reconcile or maintain dual reporting during cross-listings.",
    category: "Big 4 Accounting",
    difficulty: "Easy",
    tags: ["GAAP", "IFRS"],
    careerTracks: ["Big 4 Accounting"],
  },
  {
    question: "What is materiality in auditing?",
    answer:
      "Materiality is the threshold above which misstatements could reasonably influence economic decisions of users. Auditors set planning materiality based on benchmarks (e.g., % of revenue, EBITDA, or total assets) and performance materiality lower than overall materiality to reduce undetected risk. Misstatements below materiality may still be corrected if they affect trends or covenants.",
    category: "Big 4 Accounting",
    difficulty: "Easy",
    tags: ["materiality"],
    careerTracks: ["Big 4 Accounting"],
  },
  {
    question: "Walk me through revenue recognition under ASC 606.",
    answer:
      "Identify the contract with a customer, identify performance obligations, determine transaction price (including variable consideration and constraints), allocate price to each obligation based on standalone selling prices, and recognize revenue when (or as) control transfers (point in time vs over time using input/output methods). Disclosures cover disaggregation and contract balances.",
    category: "Big 4 Accounting",
    difficulty: "Hard",
    tags: ["ASC 606", "revenue"],
    careerTracks: ["Big 4 Accounting"],
  },
  {
    question: "What is a going concern opinion?",
    answer:
      "If substantial doubt exists about an entity's ability to continue as a going concern for one year from the financial statement date, management must disclose mitigation plans. The auditor evaluates those plans and may add emphasis-of-matter or a going concern paragraph describing uncertainty; in extreme cases a modified opinion may be considered if disclosures are inadequate.",
    category: "Big 4 Accounting",
    difficulty: "Medium",
    tags: ["going concern"],
    careerTracks: ["Big 4 Accounting"],
  },
  {
    question: "Difference between an audit, review, and compilation?",
    answer:
      "An audit provides reasonable assurance via evidence gathering, testing, and opinion on whether statements are free from material misstatement. A review provides limited assurance through inquiries and analytics, no opinion. A compilation is assembling management's information into statements without assurance. Higher service level means more procedures, liability, and cost.",
    category: "Big 4 Accounting",
    difficulty: "Easy",
    tags: ["audit", "review"],
    careerTracks: ["Big 4 Accounting"],
  },
  // Wealth Management
  {
    question: "How do you build a client portfolio from scratch?",
    answer:
      "Document goals, horizon, liquidity needs, tax situation, and risk tolerance. Set a strategic asset allocation across equities, fixed income, and alternatives aligned to the policy statement. Diversify within sleeves, prefer low-cost vehicles, and implement in tranches to manage timing risk. Establish monitoring, rebalancing rules, and a communication cadence for life changes.",
    category: "Wealth Management",
    difficulty: "Medium",
    tags: ["portfolio", "RIA"],
    careerTracks: ["Wealth Management"],
  },
  {
    question: "What is a fiduciary and why does it matter?",
    answer:
      "A fiduciary must act in the client's best interest, with care, loyalty, and full disclosure of conflicts—stricter than suitability. It matters because it governs advice on fees, product selection, and disclosures; violations carry regulatory and legal risk. RIAs typically owe fiduciary duty under the Advisers Act; broker-dealer rules vary by regulation (e.g., Reg BI standard of conduct).",
    category: "Wealth Management",
    difficulty: "Easy",
    tags: ["fiduciary"],
    careerTracks: ["Wealth Management"],
  },
  {
    question: "Walk me through the difference between Series 7 and Series 66.",
    answer:
      "Series 7 is the general securities representative qualification covering stocks, bonds, options, and packaged products—required for many brokerage roles. Series 66 combines state law (NASAA) with investment adviser content and is taken with Series 7 to register as an investment adviser representative in many states. Exact pairing depends on firm model (broker-dealer vs hybrid RIA).",
    category: "Wealth Management",
    difficulty: "Medium",
    tags: ["licenses"],
    careerTracks: ["Wealth Management"],
  },
  {
    question: "How do you handle a client who wants to panic sell?",
    answer:
      "Stay calm, acknowledge emotions, and revisit the plan and risk tolerance. Explain market context without predicting short-term moves. Quantify the impact of selling now vs staying the course on their goals. Offer smaller actions (rebalance, raise cash to next year's needs) rather than all-or-nothing. Document the conversation; if they insist, execute per instruction while noting consequences.",
    category: "Wealth Management",
    difficulty: "Medium",
    tags: ["behavioral"],
    careerTracks: ["Wealth Management"],
  },
  {
    question: "What is a 60/40 portfolio and what are its limitations?",
    answer:
      "60/40 allocates 60% equities and 40% bonds for growth with ballast from fixed income. Limitations include simultaneous drawdowns when correlations spike (inflation shocks), reinvestment risk if yields are low, and insufficient growth for young investors or endowments with long horizons. It may need alternatives, TIPS, or dynamic risk management in certain regimes.",
    category: "Wealth Management",
    difficulty: "Easy",
    tags: ["allocation"],
    careerTracks: ["Wealth Management", "Asset Management"],
  },
  {
    question: "Walk me through asset allocation for a 30-year-old vs a 60-year-old.",
    answer:
      "A 30-year-old with decades to retirement can accept higher equity risk (e.g., 80–90% equities) to maximize growth, using bonds for liquidity and volatility dampening. A 60-year-old nearing retirement typically reduces equity risk (e.g., 40–55%) and increases high-quality bonds and cash to fund withdrawals, sequence-of-returns risk, and healthcare costs—still keeping enough equities to mitigate longevity risk.",
    category: "Wealth Management",
    difficulty: "Medium",
    tags: ["lifecycle"],
    careerTracks: ["Wealth Management"],
  },
];

export const SEED_TRACK_QUESTIONS: SeedTrackQuestion[] = BASE.map((q) => ({
  ...q,
  keywords: kw(q.tags, [q.category.toLowerCase()]),
  source: SRC,
}));
