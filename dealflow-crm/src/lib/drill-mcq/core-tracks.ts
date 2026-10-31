import type { DrillMcqMap } from "./types";

/** Drill choices for consulting, capital markets, AM, WM and Big 4 seed questions. */
export const CORE_TRACK_MCQ: DrillMcqMap = {
  // ── Consulting ─────────────────────────────────────────────
  "Walk me through a profitability framework.": {
    c: "Profit = Revenue − Costs; Revenue = Price × Volume, Costs = Fixed + Variable — find which branch moved, then hypothesize and size drivers.",
    w: [
      "Profit = Revenue − Costs; Revenue = Price + Volume, Costs = Fixed × Variable — find which branch moved, then hypothesize drivers.",
      "Profit = Revenue × Margin; Costs = Fixed + Variable — skip revenue and size cost-cutting levers first since costs are controllable.",
      "Profit = Price × Volume; Costs are excluded because they belong in an operations case — find which price lever moved.",
    ],
  },
  "A client's profits have declined 20% YoY. How do you approach this?": {
    c: "Clarify the profit metric and timeframe, split into revenue vs. cost, segment the driver (price/volume/mix or fixed/variable), benchmark peers, quantify the top drivers.",
    w: [
      "Clarify the timeframe, assume the decline is industry-wide, skip segmentation, and recommend waiting for the cycle to turn before acting.",
      "Clarify the profit metric, split into revenue vs. cost, then recommend a price increase since price is always the fastest profit lever.",
      "Clarify the profit metric and timeframe, then recommend an immediate 20% cost reduction and investigate revenue only if that fails.",
    ],
  },
  "Estimate the market size of the US coffee market.": {
    c: "Population × % coffee drinkers × cups per day × 365 × blended price per cup (home vs. café), then sanity-check against a known data point.",
    w: [
      "Population × cups per day × 365 × café price per cup — assume everyone drinks café coffee to simplify, then skip the sanity check.",
      "Number of Starbucks stores × average store revenue — the market leader's revenue is a good proxy for the total market.",
      "Population × % coffee drinkers × cups per year × cost to produce a cup — production cost is the right price input.",
    ],
    why: "Segment the price (home vs. away-from-home) and sanity-check — interviewers grade structure and assumptions.",
  },
  "Walk me through a market entry framework.": {
    c: "Market attractiveness, competitive landscape, company capabilities/fit, and economics — then choose an entry mode (build, buy, partner) and give a clear recommendation.",
    w: [
      "Market attractiveness and company capabilities only — entry mode is an implementation detail, so end without a recommendation.",
      "Competitive landscape, regulation, and brand awareness — then always recommend an acquisition since buying is the fastest entry mode.",
      "Customer needs, pricing, and market growth — then recommend entering, since high-growth markets are always attractive regardless of fit.",
    ],
  },
  "Our client is considering acquiring a competitor. How do you advise them?": {
    c: "Strategic fit, standalone value plus realistic synergies vs. price paid, integration and regulatory risk — recommend only if value created exceeds the premium.",
    w: [
      "Strategic fit and synergies vs. price paid — recommend the deal whenever synergies are positive, regardless of the premium.",
      "Standalone value vs. price paid only — ignore synergies because they belong to the seller and integration risk is unknowable.",
      "Cultural fit and brand perception — financials matter less, since acquisitions are long-term strategic bets, not valuation exercises.",
    ],
  },
  "What is MECE and why does it matter in consulting?": {
    c: "Mutually Exclusive, Collectively Exhaustive — buckets don't overlap and together cover the whole problem, preventing double-counting and gaps.",
    w: [
      "Mutually Exhaustive, Collectively Exclusive — buckets cover the whole problem and may overlap to catch edge cases.",
      "Mutually Exclusive, Collectively Exhaustive — buckets may overlap as long as they cover the whole problem.",
      "Measurable, Efficient, Comparable, Explainable — criteria for picking which metrics to show executives.",
    ],
  },
  "Walk me through an issue tree for declining revenues.": {
    c: "Revenue = customers × spend per customer; split customers into acquisition vs. churn and spend into price, frequency, and mix — then test the largest gaps first.",
    w: [
      "Revenue = customers × spend per customer; split customers by geography only, since location explains most revenue changes — then test the largest region.",
      "Revenue = price − cost; split into price increases and cost decreases, then test whichever branch has the most available data first.",
      "Revenue = market share × market size; if share is stable, revenue can't decline, so focus only on market size and test it first.",
    ],
  },
  "Why consulting?": {
    c: "Variety of problems, direct impact with senior clients, and a steep structured-problem-solving learning curve — tied to a specific experience.",
    w: [
      "Travel, prestige, and exit opportunities into industry — a personal story isn't needed because the benefits speak for themselves.",
      "It's a stepping stone to business school, pays well for undergrads, and keeps options open — tied to a specific ranking.",
      "Working alone on deep technical problems with minimal client interaction — tied to a specific research project.",
    ],
  },
  "What do consultants do?": {
    c: "Help organizations solve problems they lack the expertise, bandwidth, or objectivity to solve — structuring, analyzing data, and presenting actionable recommendations.",
    w: [
      "Run organizations' day-to-day operations long-term, replacing internal managers — executing processes rather than recommending changes to them.",
      "Sell and implement software for organizations' IT departments — configuring systems rather than structuring business problems for executives.",
      "Audit organizations' financial statements and issue an opinion on their accuracy — testing controls rather than developing strategy.",
    ],
  },
  "Walk me through the profitability framework.": {
    c: "Profit = Revenue − Costs; Revenue = Price × Volume (customers × frequency × units), Costs = Fixed + Variable — isolate the problem, then the root cause.",
    w: [
      "Profit = Revenue − Costs; Revenue = Price × Volume, Costs = Fixed + Variable — always start by cutting fixed costs before diagnosing.",
      "Profit = Revenue + Costs; Revenue = Price × Volume, Costs = Fixed × Variable — isolate the problem, then the root cause.",
      "Profit = Revenue − Variable costs; fixed costs are ignored because they don't affect profitability in the short run.",
    ],
  },
  "Walk me through Porter's Five Forces.": {
    c: "Threat of new entrants, supplier power, buyer power, threat of substitutes, and competitive rivalry.",
    w: [
      "Threat of new entrants, supplier power, buyer power, threat of regulation, and competitive rivalry.",
      "Threat of new entrants, supplier power, employee power, threat of substitutes, and competitive rivalry.",
      "Threat of new entrants, supplier power, buyer power, threat of substitutes, and macroeconomic cycles.",
    ],
    why: "Regulation, employees and macro matter, but they aren't one of Porter's five.",
  },
  "A retailer wants to know if they should launch a new product line. How do you advise them?": {
    c: "Market opportunity, competitive dynamics, internal fit and economics (including cannibalization) — then launch / don't / launch modified.",
    w: [
      "Market opportunity and competitive dynamics — ignore cannibalization since all new-line sales are incremental — then launch / don't.",
      "Internal fit and production capability only — if the retailer can make and distribute it profitably, it should launch.",
      "Customer surveys and focus groups — launch if more than half of surveyed customers say they'd buy the new line.",
    ],
  },
  "What are the four key case scenarios according to the Ivy Case System?": {
    c: "Profitability, entering a new market, industry analysis, and mergers & acquisitions.",
    w: [
      "Profitability, pricing, market sizing, and operations.",
      "Profitability, entering a new market, cost reduction, and growth strategy.",
      "Market sizing, industry analysis, private equity due diligence, and turnaround.",
    ],
  },
  "How do you handle getting stuck in a case interview?": {
    c: "Recap what you know, return to your framework, ask a targeted clarifying question, or state an assumption and keep moving — never go silent.",
    w: [
      "Recap what you know, then ask the interviewer directly for the answer so you can move to the next section without wasting time.",
      "Stay silent and think until you're certain of the answer — saying something wrong is worse than a long pause.",
      "Abandon your framework, apologize, and restart the case with a new structure from scratch to show flexibility.",
    ],
  },
  "What is MECE and why does it matter?": {
    c: "Mutually Exclusive (no overlap) and Collectively Exhaustive (nothing missing) — avoids double-counting and missed causes.",
    w: [
      "Mutually Exclusive (nothing missing) and Collectively Exhaustive (no overlap) — avoids double-counting and missed causes.",
      "Mutually Exclusive (no overlap) and Collectively Exhaustive (nothing missing) — mainly used to format slides consistently.",
      "Mutually Exclusive (no overlap) only — exhaustiveness is impossible in real cases, so it's usually dropped.",
    ],
  },
  "A company has revenue of $500M and EBITDA margin of 20%. Fixed costs are $60M. If variable costs increase by 10%, what happens to EBITDA?": {
    c: "EBITDA falls from $100M to $66M (−34%); margin goes from 20% to 13.2%.",
    w: [
      "EBITDA falls from $100M to $60M (−40%); margin goes from 20% to 12.0%.",
      "EBITDA falls from $100M to $90M (−10%); margin goes from 20% to 18.0%.",
      "EBITDA falls from $100M to $74M (−26%); margin goes from 20% to 14.8%.",
    ],
    why: "Total costs $400M − fixed $60M = variable $340M; +10% = $34M more cost.",
  },
  "Market sizing: How many gas stations are in the United States?": {
    c: "~150–200K: ~195M cars filling ~weekly ÷ ~1,000 fill-ups per station per week; real figure is ~150K.",
    w: [
      "~1.5–2M: ~195M cars filling ~weekly ÷ ~100 fill-ups per station per week; real figure is ~1.5M.",
      "~15–20K: ~195M cars filling ~weekly ÷ ~10,000 fill-ups per station per week; real figure is ~15K.",
      "~150–200K: 330M people ÷ ~2,000 residents per station; no capacity check is needed.",
    ],
  },

  // ── Capital Markets ────────────────────────────────────────
  "Walk me through how a bond is priced.": {
    c: "Price = PV of coupons and principal discounted at benchmark yield + credit spread; new issues are priced off comparable curves and the order book.",
    w: [
      "Price = PV of coupons only, discounted at the coupon rate; principal is excluded because it's always repaid at par at maturity.",
      "Price = PV of coupons and principal discounted at benchmark yield − credit spread; riskier issuers price tighter to the curve.",
      "Price = par value always; only the coupon resets with market conditions after issuance, set by the order book.",
    ],
    why: "Higher spread → higher yield → LOWER price. Riskier credits price wider, not tighter.",
  },
  "What is the yield curve and what does an inverted yield curve signal?": {
    c: "Yields across maturities for the same credit; inversion (short > long) reflects tight policy and expected rate cuts — historically a recession signal, not a timing tool.",
    w: [
      "Yields across maturities for the same credit; inversion (long > short) reflects loose policy and expected rate hikes — historically a sign of overheating.",
      "Yields across credit ratings for the same maturity; inversion means high-yield bonds yield less than Treasuries — historically a bubble signal.",
      "Yields across maturities for the same credit; inversion (short > long) reliably predicts a recession starting within about three months.",
    ],
  },
  "What is the difference between investment grade and high yield debt?": {
    c: "IG is BBB-/Baa3 and above with lower default risk and tighter spreads; HY is below that, with higher spreads and more covenants/security.",
    w: [
      "IG is BB+/Ba1 and above with lower default risk and tighter spreads; HY is below that, with higher spreads and more covenants.",
      "IG is BBB-/Baa3 and above with higher default risk and wider spreads; HY is below that, with tighter spreads and fewer covenants.",
      "IG is debt under 10 years with tighter spreads; HY is debt over 10 years with higher spreads, regardless of rating.",
    ],
  },
  "Walk me through an IPO process.": {
    c: "Hire underwriters → diligence and S-1 draft → SEC review → roadshow and bookbuild → pricing → trading and stabilization → lock-up expiry.",
    w: [
      "Hire underwriters → roadshow and bookbuild → S-1 draft → SEC review → pricing → trading; lock-ups apply only to the banks.",
      "S-1 draft → pricing → roadshow and bookbuild → SEC review → trading and stabilization → lock-up expiry.",
      "Hire underwriters → diligence → list directly on the exchange → SEC review after trading → lock-up expiry.",
    ],
  },
  "What are the key differences between DCM and ECM roles?": {
    c: "DCM structures and prices debt (bonds, loans, ratings strategy); ECM handles equity and equity-linked deals (IPOs, follow-ons, converts, blocks).",
    w: [
      "DCM handles equity and equity-linked deals (IPOs, follow-ons, converts); ECM structures and prices debt (bonds, loans, ratings strategy).",
      "DCM advises on M&A and fairness opinions; ECM handles every capital raise, whether debt, equity, or equity-linked.",
      "DCM structures and prices debt (bonds, loans); ECM handles IPOs only — converts and block trades sit with sales & trading.",
    ],
  },
  "How does a leveraged loan differ from a high yield bond?": {
    c: "Leveraged loans: senior secured, floating rate (SOFR), prepayable, often cov-lite, bought by CLOs. HY bonds: typically fixed rate, unsecured or junior, call protection, incurrence covenants.",
    w: [
      "Leveraged loans: unsecured, fixed rate, non-callable, bought by retail funds. HY bonds: senior secured, floating rate (SOFR), freely prepayable, bought by CLOs.",
      "Leveraged loans: senior secured, fixed rate, non-prepayable, bought by retail investors. HY bonds: floating rate (SOFR), secured, bought mainly by CLOs.",
      "Leveraged loans: senior secured, floating rate (SOFR), prepayable, bought by CLOs. HY bonds: also floating rate and senior secured — they differ only by market.",
    ],
  },
  "What is a roadshow and who attends?": {
    c: "A marketing period where management and bankers pitch institutional investors (mutual funds, pensions, hedge funds, insurers) before pricing.",
    w: [
      "A marketing period where management and bankers pitch retail investors through TV and social media appearances before pricing.",
      "A post-pricing tour where bankers and lawyers walk regulators through the final prospectus and allocation decisions.",
      "An internal bank process where the syndicate desk and research analysts set the price range before the S-1 is filed.",
    ],
  },
  "What is the difference between DCM and ECM?": {
    c: "DCM raises debt (IG/HY bonds, loans, converts on the debt side); ECM raises equity (IPOs, follow-ons, converts, blocks). Both are separate from M&A.",
    w: [
      "DCM raises equity (IPOs, follow-ons, block trades); ECM raises debt (IG/HY bonds, leveraged loans). Both sit inside M&A advisory.",
      "DCM and ECM both raise debt — DCM for corporates and ECM for governments — while M&A handles all equity issuance.",
      "DCM raises debt (IG/HY bonds, loans); ECM raises equity — but both are sub-teams of M&A that only work on acquisition financing.",
    ],
  },
  "Walk me through the IPO process.": {
    c: "Select bookrunners → diligence and S-1 → SEC comments → roadshow → bookbuilding → pricing the night before → trading with greenshoe stabilization.",
    w: [
      "Select bookrunners → roadshow → S-1 → pricing the morning of listing → SEC comments after trading begins → greenshoe stabilization.",
      "Select bookrunners → diligence and S-1 → pricing set at filing → roadshow → bookbuilding → trading with greenshoe stabilization.",
      "Select bookrunners → bookbuilding → trading → S-1 filed after listing → greenshoe exercised before the roadshow.",
    ],
  },
  "What is a greenshoe option and why is it used?": {
    c: "Underwriters can sell up to 15% more shares (over-allotment); if the stock falls they buy back in the market to support it, if it rises they exercise the option.",
    w: [
      "Underwriters can sell up to 50% more shares (over-allotment); if the stock falls they exercise the option, if it rises they buy back in the market.",
      "Underwriters can sell up to 15% more shares (over-allotment) purely to raise extra capital for the issuer — it has nothing to do with stabilization.",
      "The issuer can buy back up to 15% of the IPO shares at the offer price if the stock falls below it during the first year.",
    ],
    why: "The short position from over-allotment is covered either by market purchases (price falling) or by exercising the option (price rising).",
  },
  "What is a block trade and how does it differ from a regular secondary offering?": {
    c: "A large share sale executed overnight — a bank often buys at a discount and resells to institutions, taking balance-sheet risk; a marketed follow-on takes days.",
    w: [
      "A large share sale marketed over ~2 weeks with a full roadshow — the bank acts only as agent and never takes balance-sheet risk.",
      "A large share sale executed overnight at a premium to market — buyers pay up for size, so the bank takes no balance-sheet risk.",
      "A new-share issuance by the company to fund growth — always primary, never a secondary sale by an existing holder.",
    ],
  },
  "What is a PIPE and when is it used?": {
    c: "Private Investment in Public Equity — shares or converts sold privately to a few investors, typically at a discount, when a public company needs capital quickly.",
    w: [
      "Public Investment in Private Equity — a marketed public offering of a private company's shares, typically priced at a premium.",
      "Private Investment in Public Equity — shares sold privately to a few investors at a premium to market, used mainly to fund buybacks.",
      "Private Investment in Public Equity — a bank loan with maintenance covenants, used when a public company can't access bond markets.",
    ],
  },
  "How do league tables affect ECM and DCM competitiveness?": {
    c: "They rank banks by volume, fees, or deal count; issuers use them to pick bookrunners, so banks cite them in pitches despite imperfect crediting rules.",
    w: [
      "They rank banks by profitability and capital ratios; regulators use them to set capital requirements, so banks rarely cite them in pitches.",
      "They rank issuers by credit rating and size; banks use them internally to decide which clients to cover, not in pitches.",
      "They rank banks by volume, fees, or deal count, but they're only used for internal bonuses and never appear in client pitches.",
    ],
  },
  "What is a convertible bond and why might a company issue one?": {
    c: "Debt convertible into equity at a set price — lower coupon than straight debt, with dilution only if the stock rises above the conversion price.",
    w: [
      "Debt convertible into equity at a set price — higher coupon than straight debt, with full dilution occurring immediately at issuance.",
      "Equity convertible into debt at the investor's option — issued to reduce leverage when the stock falls below a set price.",
      "Debt convertible into a different currency at a set rate — issued to hedge FX exposure on foreign revenue.",
    ],
  },
  "What is the role of the syndicate desk in a bond offering?": {
    c: "Reads the order book, recommends pricing and spread tightening, allocates to investors, and bridges bankers/issuers with sales.",
    w: [
      "Builds the issuer's financial model, drafts the offering memorandum, and negotiates covenants with the issuer's lawyers.",
      "Trades the new bonds in the secondary market for the bank's own account and sets the bank's inventory limits.",
      "Approves the bank's credit exposure to the issuer under risk limits and signs off on the underwriting commitment.",
    ],
  },
  "What drives new issue concession in investment grade bonds?": {
    c: "Extra spread vs. the issuer's secondary curve to compensate for new supply — larger in volatile markets, big deals, heavy supply weeks, or weak books.",
    w: [
      "Extra spread vs. the issuer's secondary curve to compensate for new supply — larger in calm markets, small deals, and oversubscribed books.",
      "A fixed underwriting fee paid by the issuer to the syndicate desk, set by contract and unrelated to market conditions.",
      "The regulatory discount to par that every IG bond must be issued at — larger for longer maturities, regardless of the book.",
    ],
  },

  // ── Asset Management ───────────────────────────────────────
  "Walk me through how you'd pitch a stock.": {
    c: "Recommendation and price target → business overview → 2–3 differentiated thesis points → valuation → catalysts → risks and what would prove you wrong.",
    w: [
      "Business overview → company history → management bios → valuation → recommendation at the end, without a price target.",
      "Recommendation and price target → business overview → consensus view → agree with consensus → risks, to keep the pitch safe.",
      "Recommendation and price target → business overview → valuation → risks — thesis and catalysts are optional for long ideas.",
    ],
    why: "Variant perception (why the market is wrong) and catalysts are what PMs probe hardest.",
  },
  "What makes a good long vs short thesis?": {
    c: "Both need a variant view vs. consensus and a catalyst; shorts also need borrow availability, crowding awareness, and tighter risk limits (unlimited loss).",
    w: [
      "Longs need a variant view and a catalyst; shorts don't need a catalyst because overvalued stocks always revert to fair value eventually.",
      "Both need only a clearly low or high P/E vs. peers; catalysts and consensus views don't matter if the valuation gap is wide enough.",
      "Shorts need a variant view and a catalyst; longs only need the stock to be in a growing industry with rising revenue.",
    ],
  },
  "How do you think about portfolio construction?": {
    c: "Start with objectives and constraints, set a risk budget, diversify idiosyncratic risk, size by conviction and risk contribution, and rebalance with rules.",
    w: [
      "Start with objectives, then equal-weight every idea regardless of conviction, volatility, or correlation, and rebalance annually.",
      "Start with your highest-conviction idea and concentrate the whole portfolio in it, adding names only when it hits its target.",
      "Start with the benchmark, then size every position by market cap, ignoring objectives, constraints, and risk contribution.",
    ],
  },
  "Walk me through a DCF for a growth company.": {
    c: "Explicit TAM/penetration and margin-ramp assumptions, a longer projection period, conservative terminal value, and heavy sensitivity/scenario analysis.",
    w: [
      "Short 3-year projection period, a high terminal growth rate (10%+) to capture growth, and a single base case with no sensitivities.",
      "Current negative margins held flat in perpetuity, offset by a below-market discount rate, and a single base case scenario.",
      "Skip the explicit projections and apply today's revenue growth rate as the perpetual terminal growth rate in a Gordon Growth model.",
    ],
  },
  "What is factor investing?": {
    c: "Tilting portfolios toward systematic return drivers — value, momentum, quality, size, low volatility — usually through rules-based models.",
    w: [
      "Tilting portfolios toward individual company catalysts — earnings beats, CEO changes, product launches — found through channel checks.",
      "Tilting portfolios toward stocks with the most media coverage and retail interest, usually through sentiment models.",
      "Holding only market-cap-weighted index funds that track the S&P 500, with no tilts toward any characteristic.",
    ],
  },
  "Walk me through how you would pitch a stock.": {
    c: "Rec + target and upside → company in 2 sentences → 3 differentiated thesis points → valuation → 2–3 catalysts → risks and mitigants.",
    w: [
      "Rec + target → company history in detail → 10 thesis points → skip valuation if the story is strong → risks.",
      "Company in 2 sentences → consensus view → rec matching consensus → valuation → risks only, no catalysts.",
      "Rec + target and upside → valuation → catalysts — thesis and risks are left for Q&A to save time.",
    ],
  },
  "What is the difference between alpha and beta?": {
    c: "Beta = sensitivity to market moves (systematic risk); alpha = return above what that beta exposure would predict.",
    w: [
      "Alpha = sensitivity to market moves (systematic risk); beta = return above what that exposure would predict.",
      "Beta = total volatility of a stock (systematic + idiosyncratic); alpha = return above the risk-free rate.",
      "Beta = return above the benchmark; alpha = correlation of returns with the benchmark.",
    ],
  },
  "What is a DCF and when would you NOT use one for equity research?": {
    c: "PV of future FCF at WACC; avoid for pre-revenue firms, banks/insurers (use DDM), deep cyclicals at peak/trough, distress, and REITs (use NAV).",
    w: [
      "PV of future FCF at WACC; avoid for any company with meaningful debt, since leverage distorts free cash flow and WACC.",
      "PV of future dividends at the risk-free rate; avoid for companies that pay dividends, since they're captured in P/E.",
      "PV of future revenue at WACC; avoid for mature, stable companies, since comps are always more accurate for them.",
    ],
  },
  "What is the Sharpe ratio and how is it used?": {
    c: "(Return − risk-free rate) ÷ volatility — return per unit of total risk; can mislead with fat tails or options.",
    w: [
      "(Return − risk-free rate) ÷ beta — return per unit of market risk; can mislead with fat tails.",
      "(Return − benchmark return) ÷ tracking error — return per unit of active risk.",
      "Return ÷ max drawdown — return per unit of peak-to-trough loss.",
    ],
    why: "÷ beta is the Treynor ratio; ÷ tracking error is the Information ratio.",
  },
  "Explain factor investing and give two classic factors.": {
    c: "Targeting systematic return drivers — e.g., value (cheap vs. fundamentals) and momentum (recent winners keep winning short term).",
    w: [
      "Targeting systematic return drivers — e.g., value (recent winners keep winning) and momentum (cheap vs. fundamentals).",
      "Targeting company-specific catalysts — e.g., earnings beats (surprise) and CEO changes (governance).",
      "Targeting macro events — e.g., Fed meetings (rates) and CPI prints (inflation surprises).",
    ],
  },
  "What is the difference between mutual funds and ETFs in portfolio implementation?": {
    c: "Mutual funds price once daily at NAV; ETFs trade intraday with creation/redemption keeping price near NAV, usually with lower fees and better tax efficiency.",
    w: [
      "ETFs price once daily at NAV; mutual funds trade intraday on exchanges with market makers keeping price near NAV, usually with lower fees.",
      "Mutual funds trade intraday and are usually more tax efficient than ETFs, because cash redemptions avoid capital gains distributions.",
      "Mutual funds and ETFs both price once daily at NAV; ETFs are simply mutual funds listed outside the US with higher fees.",
    ],
  },
  "What is tracking error and how does it relate to active risk?": {
    c: "The standard deviation of portfolio-minus-benchmark returns — higher tracking error means more active bets.",
    w: [
      "The average of portfolio-minus-benchmark returns — higher tracking error means more alpha generated.",
      "The standard deviation of the portfolio's absolute returns — higher tracking error means more market risk.",
      "The correlation of portfolio returns with the benchmark — higher tracking error means more active bets.",
    ],
  },
  "What is a 13F filing and who uses it?": {
    c: "A quarterly SEC filing by managers with $100M+ in 13(f) securities, disclosing long positions with a 45-day lag — used to track positioning.",
    w: [
      "A quarterly SEC filing by managers with $100M+ in 13(f) securities, disclosing long and short positions in real time.",
      "An annual SEC filing by every public company disclosing executive compensation and insider share ownership.",
      "A one-time SEC filing required whenever an investor crosses 5% ownership of a public company's shares.",
    ],
    why: "13Fs exclude shorts and are delayed; crossing 5% triggers a 13D/13G.",
  },

  // ── Big 4 / Accounting careers ─────────────────────────────
  "Walk me through the audit process.": {
    c: "Planning and risk assessment (materiality, controls) → controls testing and substantive procedures → evaluate misstatements and going concern → issue opinion.",
    w: [
      "Issue a draft opinion → substantive procedures → planning and risk assessment, since the opinion sets the audit scope.",
      "Planning and risk assessment → substantive testing of every single transaction → issue opinion; controls are never tested.",
      "Planning and risk assessment → management drafts the opinion → auditor signs it after a high-level review.",
    ],
  },
  "What is the difference between GAAP and IFRS?": {
    c: "US GAAP is more rules-based; IFRS is more principles-based — e.g., IFRS prohibits LIFO and allows some development-cost capitalization.",
    w: [
      "US GAAP is more principles-based; IFRS is more rules-based — e.g., US GAAP prohibits LIFO and capitalizes development costs.",
      "US GAAP and IFRS are now identical — full convergence was completed, so LIFO and development costs are treated the same.",
      "IFRS is used only by private companies and US GAAP only by public companies, regardless of country.",
    ],
  },
  "What is materiality in auditing?": {
    c: "The threshold above which a misstatement could influence users' decisions — set from benchmarks (e.g., % of pre-tax income) with lower performance materiality.",
    w: [
      "The threshold below which every misstatement must be corrected — set as a fixed dollar amount that's the same for every client.",
      "The threshold above which a misstatement could influence users' decisions — with performance materiality set higher than overall.",
      "The total dollar value of the client's assets that the auditor is required to test each year, set by the PCAOB.",
    ],
  },
  "Walk me through revenue recognition under ASC 606.": {
    c: "Identify contract → identify performance obligations → determine price → allocate price by standalone selling price → recognize as each obligation is satisfied.",
    w: [
      "Identify contract → determine price → recognize all revenue at signing → identify performance obligations → allocate afterward.",
      "Identify performance obligations → recognize revenue when cash is received → identify contract → determine and allocate price.",
      "Identify contract → identify obligations → determine price → allocate price equally across obligations → recognize at year-end.",
    ],
  },
  "What is a going concern opinion?": {
    c: "When there's substantial doubt the entity can continue for one year from the statement date, management discloses plans and the auditor may add a going concern paragraph.",
    w: [
      "When there's substantial doubt the entity can continue for five years from the statement date, the auditor must issue an adverse opinion.",
      "When the entity is consistently profitable, the auditor confirms it as a going concern in a separate report to shareholders.",
      "When the entity is being liquidated, it must keep using going concern accounting until the liquidation is complete.",
    ],
  },
  "Difference between an audit, review, and compilation?": {
    c: "Audit = reasonable assurance with an opinion; review = limited assurance via inquiry and analytics; compilation = no assurance.",
    w: [
      "Audit = limited assurance; review = reasonable assurance with an opinion; compilation = no assurance.",
      "Audit = reasonable assurance; review = no assurance; compilation = limited assurance via analytics.",
      "All three provide reasonable assurance with an opinion; they differ only in cost and timing.",
    ],
  },
  "What is the difference between an audit, a review, and a compilation?": {
    c: "Audit: highest (reasonable) assurance and opinion; review: moderate/limited assurance; compilation: none — just formatting management's data.",
    w: [
      "Audit: limited assurance; review: highest (reasonable) assurance and opinion; compilation: moderate assurance via analytics.",
      "Audit: highest assurance and opinion; review: no assurance; compilation: moderate assurance via inquiry and analytics.",
      "Audit: reasonable assurance, required only for private companies; review: required for SEC filers; compilation: none.",
    ],
  },
  "Walk me through the audit process from start to finish.": {
    c: "Planning (risk, materiality) → internal controls testing → substantive testing → completion and reporting (going concern, opinion).",
    w: [
      "Planning (risk, materiality) → substantive testing → internal controls testing → issue the engagement letter.",
      "Internal controls testing → issue opinion → substantive testing → planning for next year's engagement.",
      "Planning (risk, materiality) → completion and reporting → substantive testing after the opinion is issued.",
    ],
  },
  "What is revenue recognition under ASC 606?": {
    c: "Five steps: contract → performance obligations → transaction price → allocate → recognize when (or as) control transfers.",
    w: [
      "Five steps: contract → transaction price → recognize when cash is collected → allocate → disclose.",
      "Five steps: contract → performance obligations → transaction price → allocate → recognize when risks and rewards transfer.",
      "Five steps: contract → performance obligations → allocate → transaction price → recognize when the invoice is issued.",
    ],
    why: "ASC 606 is a CONTROL-transfer model, replacing the old risks-and-rewards approach.",
  },
  "What is a going concern emphasis and when is it required?": {
    c: "Used when substantial doubt exists about continuing for one year from the statement date and disclosures are adequate; inadequate disclosure modifies the opinion.",
    w: [
      "Used when substantial doubt exists about continuing for five years and disclosures are adequate; it replaces the audit opinion entirely.",
      "Used when substantial doubt exists about continuing for 30 days; it always results in an adverse opinion, regardless of disclosure.",
      "Used when the company switches to liquidation-basis accounting; it requires no management disclosure of plans or uncertainties.",
    ],
  },
  "Explain COSO and why it matters for internal controls.": {
    c: "An internal control framework: control environment, risk assessment, control activities, information & communication, and monitoring — the basis for SOX testing.",
    w: [
      "An internal control framework: control environment, risk assessment, control activities, tax planning, and monitoring — the basis for IRS audits.",
      "An SEC rule requiring quarterly audits of public companies: planning, fieldwork, review, opinion, and filing — the basis for 10-Q reviews.",
      "An accounting standard for revenue recognition that replaced ASC 605 — the basis for identifying performance obligations.",
    ],
  },
  "What is the difference between vouching and tracing in substantive testing?": {
    c: "Vouching goes from the recorded entry back to support (tests existence); tracing goes from source documents forward to the records (tests completeness).",
    w: [
      "Vouching goes from source documents forward to the records (tests completeness); tracing goes from the entry back to support (tests existence).",
      "Vouching goes from the recorded entry back to support (tests completeness); tracing goes from source documents forward (tests existence).",
      "Vouching and tracing both go from the records back to support (test existence); they differ only in sample size.",
    ],
    why: "Memory aid: Vouching = 'Verify it exists' (record → document). Tracing = 'Track it in' (document → record).",
  },
  "What is audit sampling and when do auditors use statistical vs non-statistical sampling?": {
    c: "Testing a subset to conclude on a population — statistical quantifies sampling risk and projects errors formally; non-statistical relies on judgment.",
    w: [
      "Testing every item in a population — statistical uses audit software, non-statistical uses manual review of each item.",
      "Testing a subset to conclude on a population — non-statistical quantifies sampling risk formally; statistical relies on judgment.",
      "Testing a subset only for small clients — large clients require 100% testing of every account under PCAOB rules.",
    ],
  },

  // ── Wealth Management ──────────────────────────────────────
  "How do you build a client portfolio from scratch?": {
    c: "Discovery (goals, horizon, liquidity, taxes, risk tolerance) → strategic allocation → diversified low-cost implementation → monitoring and rebalancing rules.",
    w: [
      "Pick last year's top-performing funds → allocate equally across them → review the portfolio only if the client complains.",
      "Strategic allocation → implementation → discovery of goals and risk tolerance later, once the client has seen returns.",
      "Discovery (goals, horizon, taxes) → 100% equities for maximum growth → rebalance only after markets fall.",
    ],
  },
  "What is a fiduciary and why does it matter?": {
    c: "Must act in the client's best interest with loyalty, care, and disclosure of conflicts — a higher bar than suitability; RIAs owe it under the Advisers Act.",
    w: [
      "Must recommend suitable products even if better options exist — a lower bar than best interest; RIAs owe it under the Advisers Act.",
      "Must act in the firm's best interest first and the client's second, with disclosure of conflicts — required by FINRA for brokers.",
      "Must guarantee clients won't lose principal, with full disclosure of conflicts — required for every registered advisor.",
    ],
  },
  "Walk me through the difference between Series 7 and Series 66.": {
    c: "Series 7 = general securities representative (brokerage); Series 66 = combined state law + adviser exam, paired with the 7 to act as an investment adviser rep.",
    w: [
      "Series 7 = combined state law + adviser exam (investment adviser rep); Series 66 = general securities representative for brokerage.",
      "Series 7 = state securities law only; Series 66 = options and municipal securities, paired with the 7 for brokerage roles.",
      "Series 7 and Series 66 are interchangeable — passing either one lets you act as both a broker and an investment adviser rep.",
    ],
  },
  "How do you handle a client who wants to panic sell?": {
    c: "Acknowledge emotions, revisit the plan and risk tolerance, quantify consequences, offer smaller steps, and document — execute if they insist.",
    w: [
      "Acknowledge emotions, then refuse to execute the trade until markets recover, since selling is clearly against their interest.",
      "Execute the full sale immediately without discussion — the client is always right and advice could create liability.",
      "Reassure them by predicting a short-term rebound, then delay the trade a few days until markets stabilize.",
    ],
  },
  "What is a 60/40 portfolio and what are its limitations?": {
    c: "60% equities / 40% bonds; it struggles when stock-bond correlations turn positive (inflation shocks), as in 2022.",
    w: [
      "60% bonds / 40% equities; it struggles when stock-bond correlations turn negative (deflation shocks), as in 2008.",
      "60% equities / 40% cash; it struggles when interest rates fall and cash yields drop toward zero.",
      "60% equities / 40% bonds; it has no meaningful limitation, because bonds always rise when stocks fall.",
    ],
  },
  "Walk me through asset allocation for a 30-year-old vs a 60-year-old.": {
    c: "30-year-old: ~80–90% equities for growth; 60-year-old: ~40–55% equities with more high-quality bonds and cash, still enough equity for longevity risk.",
    w: [
      "30-year-old: ~40–55% equities to learn safely; 60-year-old: ~80–90% equities to catch up on savings before retirement.",
      "Both: 60/40, because age doesn't affect risk capacity — only risk tolerance questionnaires matter for allocation.",
      "30-year-old: ~80–90% equities; 60-year-old: 100% bonds and cash, because equities are inappropriate near retirement.",
    ],
  },
  "What is the difference between a fiduciary and a suitability standard?": {
    c: "Fiduciary = client's best interest at all times; suitability = recommendation must merely fit the client. RIAs are fiduciaries; broker-dealers now follow Reg BI.",
    w: [
      "Suitability = client's best interest at all times; fiduciary = recommendation must merely fit the client. Broker-dealers are fiduciaries.",
      "Fiduciary = recommendation must merely fit the client; suitability = best interest. RIAs follow suitability; broker-dealers are fiduciaries.",
      "Fiduciary = client's best interest at all times; suitability = the same standard since Reg BI, so RIAs and brokers are identical.",
    ],
  },
  "Walk me through how you would build a financial plan for a 35-year-old client with $500K to invest.": {
    c: "Discovery → ~70–80% equities / 20–30% bonds diversified → insurance needs → tax optimization (401k, IRA, HSA) → estate basics → annual review.",
    w: [
      "Discovery → ~20–30% equities / 70–80% bonds → skip insurance at this age → tax optimization → annual review.",
      "Discovery → ~70–80% equities in a single high-growth stock → insurance → skip tax-advantaged accounts → review in 10 years.",
      "Discovery → ~70–80% equities / 20–30% bonds → insurance → avoid 401k/IRA/HSA since they limit liquidity → annual review.",
    ],
  },
  "What is a 60/40 portfolio and what are its limitations today?": {
    c: "60% stocks / 40% bonds; in 2022 both fell as rates rose, breaking the diversification assumption; inflation also erodes bond returns.",
    w: [
      "60% stocks / 40% bonds; in 2022 bonds rallied as stocks fell, confirming the diversification assumption still holds.",
      "60% bonds / 40% stocks; its main limitation today is too much equity risk for most investors as rates rise.",
      "60% stocks / 40% bonds; its main limitation today is that bonds now yield more than stocks are expected to return.",
    ],
  },
  "How do you handle a client who wants to panic sell during a market downturn?": {
    c: "Listen and acknowledge, reframe with data and the IPS, check whether their situation truly changed, consider small adjustments, and document everything.",
    w: [
      "Listen briefly, then tell them markets always recover within a month, so no changes or documentation are needed.",
      "Liquidate the full portfolio immediately to avoid a complaint, then document the client's instruction.",
      "Avoid the client until the market stabilizes, then revisit the IPS once prices have recovered.",
    ],
  },
  "What is dollar-cost averaging and when would you recommend it?": {
    c: "Investing a fixed amount at regular intervals — good for regular savers and nervous clients, though lump-sum investing wins about two-thirds of the time.",
    w: [
      "Investing a fixed amount at regular intervals — it outperforms lump-sum investing about two-thirds of the time, so recommend it to everyone.",
      "Investing a fixed number of shares at regular intervals — it buys more shares when prices are high, so recommend it in rising markets.",
      "Investing everything at once whenever the market dips 10% — a timing strategy recommended for clients with large cash balances.",
    ],
    why: "Markets rise more often than not, so lump sum usually wins — DCA's value is behavioral.",
  },
  "Explain the difference between fee-only and commission-based compensation for advisors.": {
    c: "Fee-only = explicit fees (AUM %, flat, hourly) with no product commissions; commission-based = paid per product sale, which can create conflicts.",
    w: [
      "Fee-only = paid per product sale with no explicit fees; commission-based = explicit AUM, flat, or hourly fees with no conflicts.",
      "Fee-only = commissions plus AUM fees on every account; commission-based = a fixed salary paid by the firm, with no conflicts.",
      "Fee-only and commission-based are both paid per product sale; fee-only simply caps the commission at 1% of assets.",
    ],
  },
  "What is a Monte Carlo simulation in retirement planning?": {
    c: "Runs thousands of randomized return paths to estimate the probability a plan sustains spending — output is a success probability, not a certainty.",
    w: [
      "Runs one deterministic projection at the average expected return — output is a guaranteed ending portfolio balance.",
      "Runs thousands of historical backtests of a single fund — output is that fund's average annual return.",
      "Runs thousands of randomized return paths — output is the exact year the client will run out of money.",
    ],
  },
  "How do RIAs differ from broker-dealers in how clients experience onboarding?": {
    c: "RIAs lead with planning, an IPS, and holistic data gathering; broker-dealers emphasize account opening, product disclosures, and suitability/Reg BI forms.",
    w: [
      "Broker-dealers lead with planning, an IPS, and holistic data gathering; RIAs emphasize account opening and product disclosures only.",
      "RIAs lead with planning and an IPS but skip KYC/AML checks, since fiduciaries are exempt from anti-money-laundering rules.",
      "RIAs and broker-dealers use identical onboarding mandated by FINRA — account forms, disclosures, and suitability questionnaires.",
    ],
  },
  "What is a 529 plan and what are its main tradeoffs?": {
    c: "Tax-advantaged education savings — tax-free growth for qualified expenses, but tax + 10% penalty on earnings for non-qualified withdrawals and limited menus.",
    w: [
      "Tax-advantaged retirement savings — tax-free growth for any expense, with no penalties on non-qualified withdrawals at any age.",
      "Tax-advantaged education savings — contributions are federally deductible, but all withdrawals are taxed as ordinary income.",
      "Tax-advantaged health savings — paired with high-deductible health plans, with tax-free withdrawals for medical expenses.",
    ],
  },
  "What is UHNW vs mass affluent segmentation and why does it matter?": {
    c: "Mass affluent ≈ under ~$1–5M with standardized service; UHNW ≈ tens of millions+ needing bespoke solutions (family office, lending, trusts).",
    w: [
      "Mass affluent ≈ $30M+ needing bespoke solutions (family office, trusts); UHNW ≈ under ~$1M with standardized digital service.",
      "Mass affluent and UHNW are marketing labels only — both get the same products, pricing, and service team structure.",
      "Mass affluent ≈ under ~$1–5M with bespoke service; UHNW ≈ tens of millions+ served by robo-advisors to keep fees low.",
    ],
  },
};
