import type { SeedTrackQuestion } from "./track-questions";

/** Extra bank rows for historically thin categories (deduped by question text in seed.ts). */

export const SEED_THIN_CATEGORY_QUESTIONS: SeedTrackQuestion[] = [
  // --- Wealth Management (10) — source: General Wealth Management ---
  {
    question: "What is the difference between a fiduciary and a suitability standard?",
    answer:
      "A fiduciary must act in the client's best interest at all times — putting client needs above their own. A suitability standard only requires that a recommendation be suitable for the client given their situation, even if a better option exists. RIAs are held to fiduciary standard. Broker-dealers traditionally used suitability standard, though Reg BI has raised the bar. This distinction matters hugely in wealth management recruiting.",
    category: "Wealth Management",
    difficulty: "Medium",
    tags: ["wm", "fiduciary", "compliance"],
    careerTracks: ["Wealth Management"],
    keywords: ["fiduciary", "suitability", "best interest", "client", "RIA", "broker-dealer"],
    source: "General Wealth Management",
  },
  {
    question: "Walk me through how you would build a financial plan for a 35-year-old client with $500K to invest.",
    answer:
      "Start with discovery: risk tolerance, time horizon, goals (retirement, kids' education, home purchase), current income and expenses, existing assets and liabilities. Determine asset allocation based on risk profile — likely 70-80% equities, 20-30% fixed income at 35. Implement via diversified portfolio: US equity (large/small cap), international equity, bonds, alternatives. Address insurance needs (life, disability). Tax optimization: max 401K, IRA, HSA. Review annually and rebalance. Estate planning basics.",
    category: "Wealth Management",
    difficulty: "Hard",
    tags: ["wm", "planning", "allocation"],
    careerTracks: ["Wealth Management"],
    keywords: ["financial plan", "asset allocation", "risk tolerance", "diversification", "tax optimization", "retirement", "rebalance"],
    source: "General Wealth Management",
  },
  {
    question: "What is a 60/40 portfolio and what are its limitations today?",
    answer:
      "60/40 = 60% equities, 40% bonds. Historically provided growth from equities and stability/diversification from bonds (negative correlation in downturns). Limitations today: (1) In 2022, both stocks AND bonds fell simultaneously as rates rose — correlation broke down. (2) Low starting yields mean bonds provide less income and less buffer. (3) Inflation erodes fixed income returns. Alternatives: add real assets (commodities, real estate), alternatives (private equity, hedge funds), or shift to 70/30 or 80/20 for younger clients.",
    category: "Wealth Management",
    difficulty: "Medium",
    tags: ["wm", "portfolio", "bonds"],
    careerTracks: ["Wealth Management"],
    keywords: ["60/40", "equities", "bonds", "correlation", "inflation", "alternatives", "diversification"],
    source: "General Wealth Management",
  },
  {
    question: "How do you handle a client who wants to panic sell during a market downturn?",
    answer:
      "This is a behavioral finance and relationship management question. Steps: (1) Listen and acknowledge their fear — don't dismiss emotions. (2) Reframe with data: show them market recovery history, cost of missing best trading days. (3) Review their IPS (Investment Policy Statement) — remind them of their agreed long-term plan. (4) Assess if their situation has genuinely changed (job loss, new expense). (5) If truly necessary, make small tactical adjustment but avoid full liquidation. Document everything. Goal: be a behavioral coach, not just a portfolio manager.",
    category: "Wealth Management",
    difficulty: "Medium",
    tags: ["wm", "behavioral", "client"],
    careerTracks: ["Wealth Management"],
    keywords: ["behavioral finance", "panic sell", "client relationship", "market downturn", "investment policy", "long-term"],
    source: "General Wealth Management",
  },
  {
    question: "What is dollar-cost averaging and when would you recommend it?",
    answer:
      "Dollar-cost averaging (DCA) = investing a fixed dollar amount at regular intervals regardless of market conditions. Buys more shares when prices are low, fewer when high — reduces average cost per share over time. Recommend for: clients with regular income investing consistently (401K contributions), clients nervous about lump sum investing at market highs, behavioral benefit of removing timing decisions. Limitation: in consistently rising markets, lump sum investing historically outperforms DCA about 2/3 of the time.",
    category: "Wealth Management",
    difficulty: "Easy",
    tags: ["wm", "dca", "investing"],
    careerTracks: ["Wealth Management"],
    keywords: ["dollar cost averaging", "DCA", "regular intervals", "lump sum", "behavioral", "average cost"],
    source: "General Wealth Management",
  },
  {
    question: "Explain the difference between fee-only and commission-based compensation for advisors.",
    answer:
      "Fee-only advisors charge explicit fees (AUM %, flat retainer, hourly) and generally do not earn product commissions, aligning incentives with ongoing advice. Commission-based models pay when products trade or are sold, which can create conflicts if suitability is weaker than fiduciary care. Hybrid models exist; Reg BI requires best-interest documentation for broker-dealers. In interviews, articulate how you would disclose conflicts and document rationale for recommendations.",
    category: "Wealth Management",
    difficulty: "Medium",
    tags: ["wm", "fees", "compliance"],
    careerTracks: ["Wealth Management"],
    keywords: ["fee-only", "commission", "AUM", "conflicts", "Reg BI", "fiduciary"],
    source: "General Wealth Management",
  },
  {
    question: "What is a Monte Carlo simulation in retirement planning?",
    answer:
      "Monte Carlo runs thousands of randomized return paths to estimate the probability a portfolio sustains spending through retirement. Inputs include expected return, volatility, inflation, savings rate, withdrawal rate, and longevity assumptions. Output is a probability of success (e.g., 85%) rather than a single deterministic number. Limitations: garbage-in/garbage-out on assumptions, tail risks may be understated, and clients may misinterpret probability as certainty.",
    category: "Wealth Management",
    difficulty: "Medium",
    tags: ["wm", "retirement", "modeling"],
    careerTracks: ["Wealth Management"],
    keywords: ["Monte Carlo", "retirement", "probability", "withdrawal", "volatility", "simulation"],
    source: "General Wealth Management",
  },
  {
    question: "How do RIAs differ from broker-dealers in how clients experience onboarding?",
    answer:
      "RIAs typically lead with a planning agreement, IPS, and holistic data gathering (cash flow, tax, estate) before product selection. Broker-dealer onboarding may emphasize account opening, product disclosures, and suitability questionnaires. Both require KYC/AML; RIAs often emphasize ongoing fiduciary monitoring. Candidates should show they understand paperwork, risk profiling, and how to sequence goals-based advice.",
    category: "Wealth Management",
    difficulty: "Easy",
    tags: ["wm", "RIA", "onboarding"],
    careerTracks: ["Wealth Management"],
    keywords: ["RIA", "broker-dealer", "IPS", "onboarding", "KYC", "fiduciary"],
    source: "General Wealth Management",
  },
  {
    question: "What is a 529 plan and what are its main tradeoffs?",
    answer:
      "A 529 is a tax-advantaged account for qualified education expenses; contributions may be state-tax-deductible in some states, growth is tax-free if used for qualified withdrawals, and gift-tax rules allow superfunding. Tradeoffs: penalties and tax on earnings for non-qualified use, limited investment menus in some plans, and potential impact on financial aid (parent vs owned-by-student nuances). Wealth advisors should coordinate with FAFSA strategy.",
    category: "Wealth Management",
    difficulty: "Easy",
    tags: ["wm", "529", "education"],
    careerTracks: ["Wealth Management"],
    keywords: ["529", "education", "tax-advantaged", "qualified expenses", "FAFSA"],
    source: "General Wealth Management",
  },
  {
    question: "What is UHNW vs mass affluent segmentation and why does it matter?",
    answer:
      "Mass affluent typically refers to investable assets below roughly $1–5M with standardized service models; UHNW often implies tens of millions+ requiring bespoke solutions (family office coordination, private banking credit, concentrated stock, estate trusts, art/aviation). Segmentation drives service team structure, product access, pricing, and compliance intensity. Interviewers want evidence you can tailor communication and solutions to complexity and illiquidity.",
    category: "Wealth Management",
    difficulty: "Medium",
    tags: ["wm", "segmentation", "clients"],
    careerTracks: ["Wealth Management"],
    keywords: ["UHNW", "mass affluent", "segmentation", "family office", "private banking"],
    source: "General Wealth Management",
  },

  // --- Capital Markets (10) — source: General Capital Markets ---
  {
    question: "What is the difference between DCM and ECM?",
    answer:
      "DCM (Debt Capital Markets): helps companies raise capital by issuing debt instruments — investment grade bonds, high yield bonds, leveraged loans, convertible notes. Work involves structuring, pricing, and distributing debt offerings. ECM (Equity Capital Markets): helps companies raise equity capital through IPOs, follow-on offerings, convertible bonds, block trades. Both are part of the capital markets division, distinct from M&A advisory. DCM analysts focus on credit metrics, ECM analysts focus on equity valuation and market conditions.",
    category: "Capital Markets",
    difficulty: "Easy",
    tags: ["CM", "DCM", "ECM"],
    careerTracks: ["Capital Markets", "Investment Banking"],
    keywords: ["DCM", "ECM", "debt", "equity", "bonds", "IPO", "capital markets"],
    source: "General Capital Markets",
  },
  {
    question: "Walk me through the IPO process.",
    answer:
      "IPO process typically takes 6-12 months: (1) Select underwriters (bookrunners) — lead bank manages process. (2) Due diligence and preparation — audited financials, S-1 registration statement drafted for SEC. (3) SEC review — comment/response process, typically 2-3 rounds. (4) Roadshow — management presents to institutional investors across major cities (2 weeks). (5) Bookbuilding — banks gauge investor demand, build order book. (6) Pricing — final IPO price set night before listing based on demand. (7) First day trading — shares begin trading, bank stabilizes price if needed (greenshoe option).",
    category: "Capital Markets",
    difficulty: "Medium",
    tags: ["CM", "IPO", "ECM"],
    careerTracks: ["Capital Markets", "Investment Banking"],
    keywords: ["IPO", "S-1", "SEC", "roadshow", "bookbuilding", "underwriter", "pricing"],
    source: "General Capital Markets",
  },
  {
    question: "What is a greenshoe option and why is it used?",
    answer:
      "A greenshoe (over-allotment option) gives underwriters the right to sell up to 15% more shares than originally planned in an IPO. Purpose: price stabilization. If the stock trades above IPO price, underwriters exercise the option (buy from company at IPO price, sell at market). If stock falls below IPO price, underwriters buy shares in the open market to support the price (covered short position). Net effect: stabilizes the stock in the first 30 days of trading. Named after Green Shoe Manufacturing, first company to use it.",
    category: "Capital Markets",
    difficulty: "Hard",
    tags: ["CM", "IPO", "greenshoe"],
    careerTracks: ["Capital Markets", "Investment Banking"],
    keywords: ["greenshoe", "over-allotment", "price stabilization", "underwriter", "IPO", "short position"],
    source: "General Capital Markets",
  },
  {
    question: "What is the yield curve and what does an inverted yield curve signal?",
    answer:
      "Yield curve plots interest rates of bonds with equal credit quality but different maturities (typically 3mo to 30yr Treasuries). Normal curve: longer maturities = higher yields (compensates for time risk). Inverted curve: short-term rates HIGHER than long-term rates. Signals: market expects future rate cuts (economic slowdown), recession predictor — every US recession since 1960s was preceded by inversion. 2022-2023 saw significant inversion as Fed raised short-term rates aggressively. For DCM/ECM, inversion affects cost of debt issuance and investor appetite.",
    category: "Capital Markets",
    difficulty: "Medium",
    tags: ["CM", "rates", "macro"],
    careerTracks: ["Capital Markets", "Investment Banking"],
    keywords: ["yield curve", "inverted", "recession", "interest rates", "maturities", "Fed", "Treasuries"],
    source: "General Capital Markets",
  },
  {
    question: "What is a block trade and how does it differ from a regular secondary offering?",
    answer:
      "A block trade is a large sale of shares (typically 10,000+ shares or $200K+) executed quickly, usually overnight, to minimize market impact. Investment bank buys the block from the seller (usually a large shareholder or PE firm exiting) at a discount to market price, then resells to institutional investors. Speed is critical — completed in hours vs weeks for traditional secondary. Risk: bank takes balance sheet risk if they can't place shares. Used frequently by PE firms for portfolio company exits.",
    category: "Capital Markets",
    difficulty: "Medium",
    tags: ["CM", "block", "secondary"],
    careerTracks: ["Capital Markets", "Investment Banking"],
    keywords: ["block trade", "secondary", "institutional", "discount", "PE exit", "balance sheet risk"],
    source: "General Capital Markets",
  },
  {
    question: "What is a PIPE and when is it used?",
    answer:
      "A PIPE (Private Investment in Public Equity) is a private placement of newly issued shares (or convertible securities) to a small group of accredited investors, often hedge funds or PE, typically at a discount with registration rights. Used when public companies need fast capital, M&A currency, or bridge financing without a full marketed follow-on. ECM bankers coordinate documentation, investor targeting, and disclosure.",
    category: "Capital Markets",
    difficulty: "Medium",
    tags: ["CM", "PIPE", "ECM"],
    careerTracks: ["Capital Markets", "Investment Banking"],
    keywords: ["PIPE", "private placement", "public equity", "convertible", "discount"],
    source: "General Capital Markets",
  },
  {
    question: "How do league tables affect ECM and DCM competitiveness?",
    answer:
      "League tables rank banks by deal volume, fees, or number of transactions in a period. They influence issuer selection, internal staffing, and comp narratives. For ECM/DCM, tables capture bookrunner roles vs co-manager. Analysts should know tables are not perfect (self-reporting, league credit rules) but are a key marketing tool in pitches.",
    category: "Capital Markets",
    difficulty: "Easy",
    tags: ["CM", "league tables"],
    careerTracks: ["Capital Markets", "Investment Banking"],
    keywords: ["league tables", "bookrunner", "fees", "market share", "pitch"],
    source: "General Capital Markets",
  },
  {
    question: "What is a convertible bond and why might a company issue one?",
    answer:
      "A convertible bond is debt that can convert into equity at a preset ratio/conversion price, blending cheap(er) debt with equity optionality. Companies issue converts to lower cash coupon versus straight debt, delay dilution until the stock outperforms, or access pockets of convertible arbitrage demand. DCM/ECM teams jointly think about structure (coupon, conversion premium, covenants, call features).",
    category: "Capital Markets",
    difficulty: "Medium",
    tags: ["CM", "convertible", "hybrid"],
    careerTracks: ["Capital Markets", "Investment Banking"],
    keywords: ["convertible", "bond", "conversion", "coupon", "dilution", "arbitrage"],
    source: "General Capital Markets",
  },
  {
    question: "What is the role of the syndicate desk in a bond offering?",
    answer:
      "Syndicate coordinates pricing and allocation between the issuer and salesforce: reads the book during marketing, recommends spread/yield flex, balances investor quality vs distribution, and manages communication to avoid information leakage. They bridge origination (bankers/modeling) and sales/trading. For candidates, show you understand stabilization is more equity-IPO flavored but syndicate still interfaces on new issues.",
    category: "Capital Markets",
    difficulty: "Medium",
    tags: ["CM", "syndicate", "DCM"],
    careerTracks: ["Capital Markets", "Investment Banking"],
    keywords: ["syndicate", "allocation", "pricing", "book", "sales", "bond offering"],
    source: "General Capital Markets",
  },
  {
    question: "What drives new issue concession in investment grade bonds?",
    answer:
      "New issue concession is the extra spread vs secondary curves investors demand for underwriting risk and illiquidity of a fresh print. Drivers: issuer-specific credit momentum, size of deal, market volatility, competing supply in the same window, and quality of the order book. DCM bankers model clearing spread vs comparables and guide issuer on timing/size.",
    category: "Capital Markets",
    difficulty: "Hard",
    tags: ["CM", "IG", "spreads"],
    careerTracks: ["Capital Markets", "Investment Banking"],
    keywords: ["new issue concession", "spread", "investment grade", "comparables", "order book"],
    source: "General Capital Markets",
  },

  // --- Big 4 Accounting (8) — source: General Big 4 Accounting ---
  {
    question: "What is the difference between an audit, a review, and a compilation?",
    answer:
      "Three levels of assurance: Audit: highest level. CPA performs extensive testing, confirms financial statements are free of material misstatement. Issues opinion with reasonable assurance. Required for public companies (SEC). Review: moderate assurance. CPA performs analytical procedures and inquiries but no independent verification of balances. Issues limited assurance. Common for private companies seeking financing. Compilation: lowest level. CPA organizes client data into financial statement format. No assurance provided. Just presentation.",
    category: "Big 4 Accounting",
    difficulty: "Easy",
    tags: ["big4", "audit", "assurance"],
    careerTracks: ["Big 4 Accounting"],
    keywords: ["audit", "review", "compilation", "assurance", "CPA", "material misstatement", "financial statements"],
    source: "General Big 4 Accounting",
  },
  {
    question: "What is materiality in auditing?",
    answer:
      "Materiality is the threshold above which misstatements could influence decisions of financial statement users. Auditors set a materiality level (typically 0.5-1% of revenue or 3-5% of pre-tax income) and only investigate errors above that threshold. Two types: quantitative (dollar amount) and qualitative (nature of item — even small fraud is material). Performance materiality is set lower (usually 75% of overall materiality) to provide buffer. Key principle: auditors can't check every transaction — materiality makes the audit feasible.",
    category: "Big 4 Accounting",
    difficulty: "Medium",
    tags: ["big4", "materiality"],
    careerTracks: ["Big 4 Accounting"],
    keywords: ["materiality", "misstatement", "threshold", "quantitative", "qualitative", "audit", "performance materiality"],
    source: "General Big 4 Accounting",
  },
  {
    question: "Walk me through the audit process from start to finish.",
    answer:
      "Four phases: (1) Planning: understand client's business and industry, assess risk of material misstatement, set materiality, develop audit plan. (2) Internal Controls Testing: evaluate design and operating effectiveness of client's controls. Strong controls = less substantive testing needed. (3) Substantive Testing: verify account balances and transactions directly — confirmations, recalculations, vouching, analytical procedures. (4) Completion and Reporting: evaluate findings, assess going concern, issue audit opinion (unqualified, qualified, adverse, or disclaimer).",
    category: "Big 4 Accounting",
    difficulty: "Medium",
    tags: ["big4", "audit process"],
    careerTracks: ["Big 4 Accounting"],
    keywords: ["audit process", "planning", "internal controls", "substantive testing", "audit opinion", "materiality", "risk"],
    source: "General Big 4 Accounting",
  },
  {
    question: "What is revenue recognition under ASC 606?",
    answer:
      "ASC 606 five-step model: (1) Identify the contract with customer. (2) Identify performance obligations (distinct goods/services promised). (3) Determine transaction price (including variable consideration). (4) Allocate transaction price to performance obligations based on standalone selling prices. (5) Recognize revenue when (or as) performance obligation is satisfied — either at a point in time or over time. Replaced industry-specific guidance with one unified standard. Key question: when has control transferred to the customer?",
    category: "Big 4 Accounting",
    difficulty: "Medium",
    tags: ["big4", "revenue", "ASC 606"],
    careerTracks: ["Big 4 Accounting"],
    keywords: ["ASC 606", "revenue recognition", "performance obligation", "transaction price", "five step", "control", "customer"],
    source: "General Big 4 Accounting",
  },
  {
    question: "What is a going concern emphasis and when is it required?",
    answer:
      "If substantial doubt exists about an entity's ability to continue as a going concern within one year from the financial statement date, management must disclose uncertainties and mitigation plans; auditors evaluate that disclosure and may issue an emphasis-of-matter paragraph if disclosures are adequate, or modify the opinion if not. This is distinct from a liquidation basis of accounting.",
    category: "Big 4 Accounting",
    difficulty: "Medium",
    tags: ["big4", "going concern"],
    careerTracks: ["Big 4 Accounting"],
    keywords: ["going concern", "substantial doubt", "disclosure", "emphasis of matter", "audit opinion"],
    source: "General Big 4 Accounting",
  },
  {
    question: "Explain COSO and why it matters for internal controls.",
    answer:
      "COSO is the widely used internal control framework organized around control environment, risk assessment, control activities, information & communication, and monitoring. Public company SOX testing maps to COSO principles. Auditors use COSO language to assess design and operating effectiveness and to scale testing when controls are strong.",
    category: "Big 4 Accounting",
    difficulty: "Easy",
    tags: ["big4", "COSO", "controls"],
    careerTracks: ["Big 4 Accounting"],
    keywords: ["COSO", "internal controls", "SOX", "control environment", "risk assessment"],
    source: "General Big 4 Accounting",
  },
  {
    question: "What is the difference between vouching and tracing in substantive testing?",
    answer:
      "Vouching starts at supporting documents and follows forward to the financial statements (tests existence/overstatement). Tracing starts at source records (e.g., shipping log) forward through the journal (tests completeness/understatement). Auditors pick direction based on relevant assertion and fraud risk.",
    category: "Big 4 Accounting",
    difficulty: "Easy",
    tags: ["big4", "testing"],
    careerTracks: ["Big 4 Accounting"],
    keywords: ["vouching", "tracing", "substantive testing", "existence", "completeness"],
    source: "General Big 4 Accounting",
  },
  {
    question: "What is audit sampling and when do auditors use statistical vs non-statistical sampling?",
    answer:
      "Sampling lets auditors infer about a population by testing a subset. Statistical sampling quantifies sampling risk and projects misstatements with formal intervals; non-statistical relies on judgmental sample sizes and qualitative evaluation. Choice depends on population homogeneity, expected error rate, and need for defensible projection in large populations.",
    category: "Big 4 Accounting",
    difficulty: "Medium",
    tags: ["big4", "sampling"],
    careerTracks: ["Big 4 Accounting"],
    keywords: ["audit sampling", "statistical", "non-statistical", "sampling risk", "projection"],
    source: "General Big 4 Accounting",
  },

  // --- Asset Management (8) — source: General Asset Management ---
  {
    question: "Walk me through how you would pitch a stock.",
    answer:
      "Structure: (1) Recommendation: Buy/Sell/Hold with target price and upside. (2) Company overview: what they do, market position, business model in 2 sentences. (3) Investment thesis: 3 key reasons to buy — specific, differentiated from consensus. (4) Valuation: DCF and/or comps showing current undervaluation. (5) Catalysts: 2-3 near-term events that could unlock value (earnings, product launch, regulatory approval). (6) Risks: 2-3 bear case scenarios and why you're not worried. (7) Close with conviction: restate the opportunity.",
    category: "Asset Management",
    difficulty: "Medium",
    tags: ["AM", "pitch", "equity"],
    careerTracks: ["Asset Management", "Equity Research"],
    keywords: ["stock pitch", "thesis", "valuation", "catalysts", "risks", "recommendation", "target price"],
    source: "General Asset Management",
  },
  {
    question: "What is the difference between alpha and beta?",
    answer:
      "Beta measures systematic risk — sensitivity to market movements. Beta of 1 = moves with market. Beta > 1 = more volatile than market. Beta < 1 = less volatile. Can't be eliminated through diversification (it IS the market). Alpha measures excess return above the risk-adjusted benchmark. Alpha = actual return minus (risk-free rate + beta × market premium). Positive alpha = manager added value beyond market exposure. Most active managers fail to generate consistent positive alpha. In AM recruiting: interviewers want to know you understand you're being paid to generate alpha not just beta.",
    category: "Asset Management",
    difficulty: "Medium",
    tags: ["AM", "alpha", "beta"],
    careerTracks: ["Asset Management", "Equity Research"],
    keywords: ["alpha", "beta", "systematic risk", "excess return", "benchmark", "market", "active management"],
    source: "General Asset Management",
  },
  {
    question: "What is a DCF and when would you NOT use one for equity research?",
    answer:
      "DCF values a company based on present value of future free cash flows discounted at WACC. Strong when: stable cash flows, long operating history, capital-intensive businesses. Would NOT use when: (1) Early-stage/pre-revenue companies — no cash flows to project. (2) Financial institutions — different capital structure, use DDM or residual income instead. (3) Highly cyclical companies — terminal value distorted by cycle timing. (4) Companies in distress — going concern issues. (5) Real estate — use NAV or cap rate approach. For equity research, DCF is always accompanied by comps for sanity check.",
    category: "Asset Management",
    difficulty: "Medium",
    tags: ["AM", "DCF", "valuation"],
    careerTracks: ["Asset Management", "Equity Research"],
    keywords: ["DCF", "equity research", "free cash flows", "WACC", "limitations", "financial institutions", "early stage"],
    source: "General Asset Management",
  },
  {
    question: "What is the Sharpe ratio and how is it used?",
    answer:
      "Sharpe = (portfolio return − risk-free rate) / volatility. It measures return per unit of total risk. Higher Sharpe implies better risk-adjusted performance, but it assumes returns are roughly normal and can be misleading with options or fat tails. PMs use it alongside max drawdown, tracking error, and information ratio.",
    category: "Asset Management",
    difficulty: "Easy",
    tags: ["AM", "risk", "Sharpe"],
    careerTracks: ["Asset Management", "Equity Research"],
    keywords: ["Sharpe ratio", "risk-adjusted", "volatility", "risk-free", "performance"],
    source: "General Asset Management",
  },
  {
    question: "Explain factor investing and give two classic factors.",
    answer:
      "Factor investing targets systematic drivers of returns (e.g., value, size, momentum, quality, low volatility) rather than picking names purely idiosyncratically. Classic examples: value (cheap vs fundamentals) and momentum (winners continue winning short term). Interviewers want you to connect factors to economic intuition and crowding risks.",
    category: "Asset Management",
    difficulty: "Medium",
    tags: ["AM", "factors", "quant"],
    careerTracks: ["Asset Management", "Equity Research"],
    keywords: ["factor investing", "value", "momentum", "smart beta", "systematic"],
    source: "General Asset Management",
  },
  {
    question: "What is the difference between mutual funds and ETFs in portfolio implementation?",
    answer:
      "Mutual funds price once daily at NAV with cash subscriptions/redemptions; ETFs trade intraday on exchange with market makers and creation/redemption baskets keeping price near NAV. ETFs often have lower expense ratios for passive exposures and tax efficiency via in-kind redemptions. Mutual funds may offer share classes and active management distribution. Wealth and AM desks choose based on liquidity, tax, and fee budgets.",
    category: "Asset Management",
    difficulty: "Easy",
    tags: ["AM", "ETF", "mutual fund"],
    careerTracks: ["Asset Management", "Equity Research"],
    keywords: ["ETF", "mutual fund", "NAV", "liquidity", "expense ratio", "tax"],
    source: "General Asset Management",
  },
  {
    question: "What is tracking error and how does it relate to active risk?",
    answer:
      "Tracking error is the volatility of the difference between portfolio returns and benchmark returns — a standard deviation of excess returns. It measures how actively the portfolio deviates from the index. Higher tracking error implies more active bets and typically higher fee expectations; risk teams cap tracking error for mandates.",
    category: "Asset Management",
    difficulty: "Medium",
    tags: ["AM", "risk", "benchmark"],
    careerTracks: ["Asset Management", "Equity Research"],
    keywords: ["tracking error", "benchmark", "active risk", "excess return", "volatility"],
    source: "General Asset Management",
  },
  {
    question: "What is a 13F filing and who uses it?",
    answer:
      "13F is a quarterly SEC filing required for institutional investment managers overseeing $100M+ in US Section 13(f) securities. It discloses long positions (not shorts) at quarter end with delay. Equity research and AM analysts use 13Fs to track smart money positioning, detect accumulation, and generate ideas — while understanding look-ahead bias and incomplete picture.",
    category: "Asset Management",
    difficulty: "Easy",
    tags: ["AM", "13F", "SEC"],
    careerTracks: ["Asset Management", "Equity Research"],
    keywords: ["13F", "SEC", "institutional", "holdings", "quarterly", "disclosure"],
    source: "General Asset Management",
  },
];
