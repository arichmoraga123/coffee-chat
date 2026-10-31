import { createHash } from "node:crypto";

function dk(title: string, date: string) {
  return createHash("sha256").update(`deal|${title}|${date}`).digest("hex");
}

type SeedDeal = {
  title: string;
  acquirer: string;
  target: string;
  dealValue: string;
  dealType: string;
  vertical: string;
  sector: string;
  summary: string;
  keyThesis: string;
  risks: string;
  sourceUrl: string | null;
  announcedAt: Date;
  careerTracks: string[];
};

/**
 * Real, announced transactions with disclosed dollar values.
 * Recent (Aug–Oct 2026) deals were verified against SEC filings / multiple outlets on 31 Oct 2026.
 */
const DEALS: SeedDeal[] = [
  // ── Recent (shows in "Current") ───────────────────────────
  {
    title: "DoorDash agrees to acquire Instacart for ~$17B",
    acquirer: "DoorDash",
    target: "Instacart (Maplebear)",
    dealValue: "$17B",
    dealType: "M&A",
    vertical: "Investment Banking",
    sector: "Consumer Internet / Delivery",
    summary:
      "DoorDash agreed on Oct 29, 2026 to acquire Instacart for $65.00 per share — about $17B of equity value and a 26% premium to Instacart's Oct 22 close. Consideration is mostly cash; holders can elect DoorDash stock, capped at 25% of the total. Instacart's board approved it unanimously after reported talks with Uber went quiet.",
    keyThesis:
      "Combines DoorDash's delivery network and logistics density with Instacart's grocery catalog, retailer relationships and fulfillment software — making DoorDash the default partner for grocers and widening the gap vs. Uber.",
    risks:
      "Antitrust is the key risk: a 2021 DoorDash–Instacart deal fell apart over antitrust concerns, and the combined company would hold a large share of US grocery delivery. DoorDash shares fell ~6% when talks leaked; integration of two marketplaces and retailer pushback are execution risks.",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/0001792789/000114036126041111/ef20084547_ex99-1.htm",
    announcedAt: new Date("2026-10-29"),
    careerTracks: ["Investment Banking", "Tech/Startup", "Equity Research"],
  },
  {
    title: "Thrive Holdings to take ADT private in $15.3B deal",
    acquirer: "Thrive Holdings",
    target: "ADT",
    dealValue: "$15.3B EV ($7.6B equity)",
    dealType: "Take-Private",
    vertical: "Private Equity",
    sector: "Security / Smart Home Services",
    summary:
      "Thrive Holdings, a permanent-capital holding company, agreed on Oct 29, 2026 to acquire ADT for $10.00 per share in cash — ~$7.6B of equity value and ~$15.3B of enterprise value, a 45.6% premium to ADT's unaffected $6.87 close. Expected to close in Q1 2027 pending stockholder and antitrust approval.",
    keyThesis:
      "Recurring monitoring revenue with high switching costs suits a long-hold, permanent-capital owner. Note the capital structure: ~$7.7B of the $15.3B EV is net debt, so equity is only ~half of the value — a good example of why EV ≠ equity value.",
    risks:
      "Heavy existing leverage, customer churn and competition from DIY/smart-home players. Apollo already owned ADT once (2016 LBO at ~$7B equity) and exited — the bull case needs a better plan than financial engineering.",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/0001703056/000119312526437123/d572133dex991.htm",
    announcedAt: new Date("2026-10-29"),
    careerTracks: ["Private Equity", "Investment Banking", "Private Credit"],
  },
  {
    title: "LSEG agrees to buy Octus from Permira for $3.5B",
    acquirer: "London Stock Exchange Group (LSEG)",
    target: "Octus",
    dealValue: "$3.5B",
    dealType: "M&A",
    vertical: "Investment Banking",
    sector: "Financial Data / Credit Intelligence",
    summary:
      "LSEG agreed on Oct 22, 2026 to buy credit-intelligence platform Octus from Permira for $3.535B in cash, financed with external debt — its largest deal since Refinitiv. Octus is expected to generate $300M+ of 2026 revenue at a ~40% adjusted EBITDA margin. Expected to close in H1 2027.",
    keyThesis:
      "Adds proprietary credit and restructuring intelligence to LSEG's Data & Analytics division, cross-selling into its existing terminal/workflow customers. Implied ~12x revenue / ~29x EBITDA reflects a high-growth, high-margin data asset.",
    risks:
      "Rich multiple and debt financing; LSEG expects the deal to be only earnings-neutral in year one. Integration and retention of Octus's journalists/analysts is key. LSEG shares fell when talks were confirmed.",
    sourceUrl: "https://www.fintechfutures.com/m-a/lseg-to-acquire-octus",
    announcedAt: new Date("2026-10-22"),
    careerTracks: ["Investment Banking", "Private Equity", "Equity Research"],
  },
  {
    title: "Proofpoint (Thoma Bravo) to acquire Varonis for $6.3B",
    acquirer: "Proofpoint (Thoma Bravo-backed)",
    target: "Varonis Systems",
    dealValue: "$6.3B",
    dealType: "Take-Private",
    vertical: "Private Equity",
    sector: "Cybersecurity Software",
    summary:
      "Proofpoint agreed on Oct 15, 2026 to acquire Varonis for $49.75 per share in cash (~$6.3B), a 52% premium to Varonis's pre-rumor price. Thoma Bravo is providing equity and arranged debt financing, with Ontario Teachers' also investing. Goldman Sachs advised Varonis. Expected to close in H1 2027.",
    keyThesis:
      "A sponsor-backed platform add-on: Proofpoint (email/people-centric security) adds Varonis's data security, building a broader suite. At ~8.4x LTM revenue, it's a classic software take-private priced on revenue rather than earnings.",
    risks:
      "~53x LTM free cash flow is expensive and leaves little room for error; leverage on a growth software asset; integration of overlapping go-to-market teams and customer retention through the transition.",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/0001361113/000121390026109901/ea030861001ex99-1.htm",
    announcedAt: new Date("2026-10-15"),
    careerTracks: ["Private Equity", "Investment Banking", "Tech/Startup"],
  },
  {
    title: "Schneider Electric to acquire PTC for $22.6B",
    acquirer: "Schneider Electric",
    target: "PTC",
    dealValue: "$22.6B equity ($23.7B EV)",
    dealType: "M&A",
    vertical: "Investment Banking",
    sector: "Industrial Software",
    summary:
      "Schneider Electric agreed on Oct 5, 2026 to buy Boston-based PTC for $205 per share in cash — ~$22.6B of equity value and ~$23.7B of enterprise value, a ~42% premium. It's Schneider's largest acquisition ever, funded with roughly €5–6B of new equity and €16–17B of new debt. Expected to close by Q3 2027.",
    keyThesis:
      "Pairs PTC's design and product-lifecycle software (Creo, Windchill, ThingWorx) with Schneider's AVEVA industrial software to build an end-to-end industrial software and AI stack.",
    risks:
      "Schneider shares fell ~10% on the news: a big premium, equity dilution and heavy new debt. Regulatory review in multiple jurisdictions and integrating a US software company into a French industrial group.",
    sourceUrl: "https://www.bostonglobe.com/2026/10/05/business/schneider-electric-ptc/",
    announcedAt: new Date("2026-10-05"),
    careerTracks: ["Investment Banking", "Tech/Startup", "Corporate Finance"],
  },
  {
    title: "Baldwin Group to go private in $7.7B deal",
    acquirer: "Sequence Holdings & DFO Management (Dell family office)",
    target: "The Baldwin Group",
    dealValue: "$7.7B EV ($4.6B equity)",
    dealType: "Take-Private",
    vertical: "Private Equity",
    sector: "Insurance Brokerage",
    summary:
      "On Sept 14, 2026, insurance broker The Baldwin Group agreed to be taken private by an entity formed by Sequence Holdings and DFO Management for $32.50 per share in cash — ~$4.6B equity plus ~$3.1B net debt for ~$7.7B EV (~20x TTM adj. EBITDA of ~$396M). Piper Sandler advised the buyers; Perella Weinberg advised Baldwin's special committee. Expected close Q1 2027.",
    keyThesis:
      "Insurance brokerage is a favorite sponsor sector: recurring commission revenue, no balance-sheet underwriting risk and a fragmented market ripe for roll-up M&A. Employees can roll equity into the private company.",
    risks:
      "~20x EBITDA is a full price; leverage on top of existing debt; organic growth depends on insurance pricing cycles; integration of acquired agencies.",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/0001781755/000095010326013874/dp253297_ex9901.htm",
    announcedAt: new Date("2026-09-14"),
    careerTracks: ["Private Equity", "Investment Banking"],
  },
  {
    title: "Aon to acquire USI Insurance Services from KKR for $17B",
    acquirer: "Aon",
    target: "USI Insurance Services (KKR portfolio company)",
    dealValue: "$17B",
    dealType: "M&A",
    vertical: "Investment Banking",
    sector: "Insurance Brokerage",
    summary:
      "Aon agreed on Aug 31, 2026 to acquire USI Insurance Services, a KKR portfolio company, for about $17B — a large sponsor-to-strategic exit in insurance brokerage.",
    keyThesis:
      "Adds a large US middle-market brokerage footprint to Aon's global platform. For KKR it's a classic PE exit: sell a scaled roll-up to a strategic buyer that can pay for synergies.",
    risks:
      "Integration of a large, acquisition-built broker, producer retention, and antitrust review in overlapping local markets.",
    sourceUrl: "https://insight.factset.com/u.s.-mergers-acquisitions-monthly-review-august-2026",
    announcedAt: new Date("2026-08-31"),
    careerTracks: ["Investment Banking", "Private Equity"],
  },

  // ── 2025 landmark deals (Archive — still great "tell me about a deal" material) ──
  {
    title: "Kimberly-Clark to acquire Kenvue for $48.7B",
    acquirer: "Kimberly-Clark",
    target: "Kenvue",
    dealValue: "$48.7B",
    dealType: "M&A",
    vertical: "Investment Banking",
    sector: "Consumer Health / Staples",
    summary:
      "Kimberly-Clark agreed in Nov 2025 to acquire Kenvue (Tylenol, Listerine, Neutrogena — the J&J consumer health spin-off) in a cash-and-stock deal valued at about $48.7B, creating one of the largest consumer health and personal care companies.",
    keyThesis:
      "Scale in consumer staples, portfolio of iconic brands, and cost synergies from combined procurement, manufacturing and distribution.",
    risks:
      "Kenvue's Tylenol litigation overhang, large stock component diluting Kimberly-Clark holders, and integration of two big organizations; EU regulatory review.",
    sourceUrl: null,
    announcedAt: new Date("2025-11-03"),
    careerTracks: ["Investment Banking", "Corporate Finance"],
  },
  {
    title: "Electronic Arts taken private for $55B by PIF, Silver Lake and Affinity",
    acquirer: "PIF, Silver Lake & Affinity Partners",
    target: "Electronic Arts",
    dealValue: "$55B",
    dealType: "Take-Private",
    vertical: "Private Equity",
    sector: "Video Games",
    summary:
      "A consortium of Saudi Arabia's PIF, Silver Lake and Affinity Partners agreed in Sept 2025 to take EA private at $210 per share (~$55B), the largest leveraged buyout ever, including ~$20B of debt. The deal closed in Aug 2026.",
    keyThesis:
      "Durable franchise cash flows (EA Sports FC, Madden, Apex) can support significant leverage; private ownership allows long-term investment and cost restructuring away from quarterly scrutiny.",
    risks:
      "Record debt load on a hits-driven business, AI-driven cost-cutting expectations, and dependence on a few franchises.",
    sourceUrl: null,
    announcedAt: new Date("2025-09-29"),
    careerTracks: ["Private Equity", "Investment Banking", "Private Credit"],
  },
  {
    title: "Union Pacific to acquire Norfolk Southern for $85B",
    acquirer: "Union Pacific",
    target: "Norfolk Southern",
    dealValue: "$85B",
    dealType: "M&A",
    vertical: "Investment Banking",
    sector: "Railroads / Transportation",
    summary:
      "Union Pacific agreed in July 2025 to acquire Norfolk Southern in a cash-and-stock deal valuing NSC at about $85B, aiming to create the first US transcontinental railroad.",
    keyThesis:
      "Single-line coast-to-coast service eliminates interchanges, shifts freight from trucks to rail, and drives cost and revenue synergies.",
    risks:
      "Lengthy Surface Transportation Board review under strict merger rules, union and shipper opposition, and integration of two huge networks.",
    sourceUrl: null,
    announcedAt: new Date("2025-07-29"),
    careerTracks: ["Investment Banking", "Corporate Finance"],
  },
  {
    title: "Google to acquire Wiz for $32B",
    acquirer: "Alphabet (Google)",
    target: "Wiz",
    dealValue: "$32B",
    dealType: "M&A",
    vertical: "Investment Banking",
    sector: "Cybersecurity / Cloud",
    summary:
      "Alphabet agreed in March 2025 to buy cloud security startup Wiz for $32B in cash — Google's largest acquisition ever, after Wiz had rejected a $23B offer in 2024.",
    keyThesis:
      "Strengthens Google Cloud's security offering across multi-cloud environments, helping it compete with AWS and Microsoft Azure.",
    risks:
      "Antitrust scrutiny, a very high revenue multiple for a young company, and keeping Wiz multi-cloud neutral to retain customers on rival clouds.",
    sourceUrl: null,
    announcedAt: new Date("2025-03-18"),
    careerTracks: ["Investment Banking", "Tech/Startup", "Venture Capital"],
  },
  {
    title: "Palo Alto Networks to acquire CyberArk for ~$25B",
    acquirer: "Palo Alto Networks",
    target: "CyberArk",
    dealValue: "$25B",
    dealType: "M&A",
    vertical: "Investment Banking",
    sector: "Cybersecurity Software",
    summary:
      "Palo Alto Networks agreed in July 2025 to acquire identity security leader CyberArk in a cash-and-stock deal worth about $25B, its largest acquisition.",
    keyThesis:
      "Adds identity and privileged-access security to Palo Alto's platform, supporting its 'platformization' strategy of selling a consolidated security suite.",
    risks:
      "High valuation, stock-funded dilution, and integrating an Israel-based company with a different go-to-market motion.",
    sourceUrl: null,
    announcedAt: new Date("2025-07-30"),
    careerTracks: ["Investment Banking", "Tech/Startup"],
  },
  {
    title: "Charter to combine with Cox Communications in $34.5B deal",
    acquirer: "Charter Communications",
    target: "Cox Communications",
    dealValue: "$34.5B",
    dealType: "M&A",
    vertical: "Investment Banking",
    sector: "Cable / Telecom",
    summary:
      "Charter agreed in May 2025 to combine with family-owned Cox Communications in a cash-and-shares deal valuing Cox at about $34.5B; the deal completed in 2026.",
    keyThesis:
      "Scale against cord-cutting and fixed-wireless competition, plus cost synergies across overlapping operations.",
    risks:
      "Secular broadband subscriber pressure, significant leverage, and integration of two large cable operators.",
    sourceUrl: null,
    announcedAt: new Date("2025-05-16"),
    careerTracks: ["Investment Banking", "Private Credit"],
  },
  {
    title: "Thoma Bravo to take Dayforce private for $12.3B",
    acquirer: "Thoma Bravo",
    target: "Dayforce",
    dealValue: "$12.3B",
    dealType: "Take-Private",
    vertical: "Private Equity",
    sector: "HR / Payroll Software",
    summary:
      "Thoma Bravo agreed in Aug 2025 to take HR and payroll software provider Dayforce private for about $12.3B ($70 per share in cash).",
    keyThesis:
      "Sticky, recurring payroll/HCM revenue with margin expansion potential under private ownership — a classic software LBO profile.",
    risks:
      "Competition from Workday, ADP and others; leverage on a software asset; growth deceleration.",
    sourceUrl: null,
    announcedAt: new Date("2025-08-21"),
    careerTracks: ["Private Equity", "Investment Banking", "Private Credit"],
  },
  {
    title: "Constellation Energy to acquire Calpine for $26.6B",
    acquirer: "Constellation Energy",
    target: "Calpine (owned by ECP and partners)",
    dealValue: "$26.6B EV ($16.4B equity)",
    dealType: "M&A",
    vertical: "Investment Banking",
    sector: "Power Generation",
    summary:
      "Constellation agreed in Jan 2025 to buy Calpine from Energy Capital Partners and co-investors for $16.4B of cash and stock plus ~$12.7B of assumed debt (net of cash and expected tax benefits, ~$26.6B EV).",
    keyThesis:
      "Adds natural gas and geothermal generation to Constellation's nuclear fleet to serve surging data-center power demand with around-the-clock supply.",
    risks:
      "Regulatory market-power concerns (required divestitures), commodity exposure, and integration of a large gas fleet.",
    sourceUrl: null,
    announcedAt: new Date("2025-01-10"),
    careerTracks: ["Investment Banking", "Private Equity"],
  },
  {
    title: "Fifth Third to acquire Comerica for $10.9B",
    acquirer: "Fifth Third Bancorp",
    target: "Comerica",
    dealValue: "$10.9B",
    dealType: "M&A",
    vertical: "Investment Banking",
    sector: "Regional Banks (FIG)",
    summary:
      "Fifth Third agreed in Oct 2025 to acquire Comerica in an all-stock deal valued at about $10.9B, creating one of the largest US regional banks.",
    keyThesis:
      "Scale in commercial banking and expansion into Texas and California; cost synergies from overlapping operations — banks are valued on P/TBV and EPS accretion, not EV/EBITDA.",
    risks:
      "Tangible book value dilution and earn-back period, deposit retention, and integration risk.",
    sourceUrl: null,
    announcedAt: new Date("2025-10-06"),
    careerTracks: ["Investment Banking"],
  },
  {
    title: "Global Payments to acquire Worldpay for $24.25B",
    acquirer: "Global Payments",
    target: "Worldpay (GTCR / FIS)",
    dealValue: "$24.25B",
    dealType: "M&A",
    vertical: "Investment Banking",
    sector: "Payments / Fintech",
    summary:
      "Global Payments agreed in April 2025 to buy Worldpay from GTCR and FIS for $24.25B, while selling its Issuer Solutions business to FIS for $13.5B — a three-way swap.",
    keyThesis:
      "Refocuses Global Payments on merchant acquiring with greater scale, while FIS deepens its issuer processing — each side sharpens its portfolio.",
    risks:
      "Complex multi-party structure, integration of large processing platforms, and fintech competition (Stripe, Adyen).",
    sourceUrl: null,
    announcedAt: new Date("2025-04-17"),
    careerTracks: ["Investment Banking", "Private Equity"],
  },
];

export const SEED_RECENT_DEALS = DEALS.map((d) => ({
  ...d,
  status: "published" as const,
  dedupeKey: dk(d.title, d.announcedAt.toISOString().slice(0, 10)),
}));
