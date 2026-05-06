import { createHash } from "node:crypto";

export type SeedConsultingCase = {
  title: string;
  type: string;
  difficulty: string;
  prompt: string;
  framework: string | null;
  sampleAnswer: string | null;
  firmSource: string | null;
  isShared: boolean;
  careerTracks: string[];
};

function dk(title: string, type: string) {
  return createHash("sha256").update(`cc|${title}|${type}`).digest("hex");
}

export const SEED_CONSULTING_CASES: (SeedConsultingCase & { dedupeKey: string })[] = [
  {
    title: "Coffee Chain Declining Profits",
    type: "Profitability",
    difficulty: "Medium",
    prompt:
      "Your client is a national coffee chain with 500 locations. Profits have declined 15% over the past two years despite flat revenue. The CEO has hired your firm to diagnose the issue and recommend a solution. How do you approach this?",
    framework: "Profitability = Revenue - Costs",
    sampleAnswer:
      "Focus on cost side given flat revenue. Investigate: COGS (coffee bean prices up?), labor (minimum wage increases?), rent (lease renewals?), overhead. If variable costs: renegotiate supplier contracts, menu rationalization. If fixed: underperforming store closures.",
    firmSource: "Case in Point (8th Edition)",
    isShared: true,
    careerTracks: ["Consulting"],
    dedupeKey: dk("Coffee Chain Declining Profits", "Profitability"),
  },
  {
    title: "European Retail Expansion",
    type: "Market Entry",
    difficulty: "Medium",
    prompt:
      "A mid-size US apparel retailer with $2B in revenue wants to expand into Europe. They've asked your firm whether they should enter and if so, how. What framework do you use and what are the key questions you'd ask?",
    framework:
      "Market Attractiveness + Competitive Landscape + Company Fit + Financials",
    sampleAnswer:
      "Assess EU apparel market size/growth, identify most attractive entry market (UK easiest due to language), analyze local competitors (Zara, H&M), evaluate company's supply chain capability for international logistics, model unit economics per store, recommend phased entry starting with 3-5 UK flagship stores.",
    firmSource: "Case in Point (8th Edition)",
    isShared: true,
    careerTracks: ["Consulting"],
    dedupeKey: dk("European Retail Expansion", "Market Entry"),
  },
  {
    title: "Pharma Acquisition Decision",
    type: "M&A",
    difficulty: "Hard",
    prompt:
      "A large pharmaceutical company is considering acquiring a biotech startup that has one drug in Phase 3 trials. The asking price is $500M. Should they acquire? What would you need to know?",
    framework: "Strategic fit + Financial valuation + Risk assessment",
    sampleAnswer:
      "Key questions — what's the drug's TAM and probability of FDA approval? What's the expected revenue if approved? NPV of drug at various probability scenarios. Strategic fit — does it complement existing portfolio? Integration complexity. Walk through DCF with probability weighting on approval scenarios.",
    firmSource: "Case in Point (8th Edition)",
    isShared: true,
    careerTracks: ["Consulting"],
    dedupeKey: dk("Pharma Acquisition Decision", "M&A"),
  },
  {
    title: "NYC Taxi Market Size",
    type: "Market Sizing",
    difficulty: "Medium",
    prompt:
      "Estimate the total annual revenue of the taxi and rideshare market in New York City.",
    framework: "Population -> trips per day -> revenue per trip -> annual",
    sampleAnswer:
      "NYC population 8M, ~30% use taxi/rideshare regularly = 2.4M users. Average 2 trips/week = 4.8M trips/week. Average fare $15. Weekly revenue = $72M. Annual = ~$3.7B. Sanity check: Uber NYC revenue reported at ~$2B, our estimate reasonable including yellow cabs.",
    firmSource: "Case in Point (8th Edition)",
    isShared: true,
    careerTracks: ["Consulting"],
    dedupeKey: dk("NYC Taxi Market Size", "Market Sizing"),
  },
  {
    title: "Hospital Wait Times",
    type: "Operations",
    difficulty: "Medium",
    prompt:
      "A large urban hospital has seen emergency room wait times increase from 45 minutes to 3 hours over the past year. Hospital administration has asked your firm to fix this. How do you approach it?",
    framework: "Supply (capacity) vs Demand (patient volume)",
    sampleAnswer:
      "Diagnose supply vs demand. Demand side: patient volume up? Acuity higher? Seasonal patterns? Supply side: staffing levels down? Bed capacity reduced? Process bottlenecks (triage, labs, imaging)? Likely culprit: process inefficiency or staffing. Solutions: triage fast-track for minor cases, staffing model optimization, EHR process improvements.",
    firmSource: "Case in Point (8th Edition)",
    isShared: true,
    careerTracks: ["Consulting"],
    dedupeKey: dk("Hospital Wait Times", "Operations"),
  },
];
