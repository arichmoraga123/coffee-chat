import { createHash } from "node:crypto";

export type SeedMockQ = {
  question: string;
  category: string;
  bankSource: string;
  year: number | null;
  difficulty: string;
  modelAnswer: string | null;
  tips: string | null;
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
];

/** Banks shown in UI filter (counts include seeded + user submissions). */
export const MOCK_INTERVIEW_BANKS = [
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
] as const;

const extraBanks: SeedMockQ[] = (["PJT", "Carlyle", "Warburg Pincus", "Bain Capital", "TPG", "Ares", "Lazard", "Moelis"] as const).map(
  (bank) => ({
    bankSource: bank,
    category: "Behavioral",
    difficulty: "Medium",
    year: 2026,
    question: `Why ${bank} for your recruiting search?`,
    modelAnswer:
      "Tie firm strengths (franchise, culture, deal type) to your experience and long-term goals with specifics.",
    tips: "Prepare one deal headline or fund fact per firm.",
  }),
);

rows.push(...extraBanks);

export function mockInterviewSeedRows() {
  return rows.map((r) => ({
    ...r,
    dedupeKey: key(r.bankSource, r.question),
    status: "active",
    upvotes: 0,
  }));
}
