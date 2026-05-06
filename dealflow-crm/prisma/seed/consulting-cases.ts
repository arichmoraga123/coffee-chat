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
    title: "MetroBrew Coffee Chain Profitability",
    type: "Profitability",
    difficulty: "Medium",
    prompt:
      "MetroBrew is a 120-store regional coffee chain. Same-store sales are flat, but EBITDA has fallen 18% over the last 12 months. The CEO wants to understand what is driving the profit decline and what to do next. How would you structure your analysis?",
    framework:
      "Profit tree: Revenue = Price × Volume (transactions × basket); Costs = Fixed + Variable. Segment by store format (urban vs suburban), daypart, and product mix. Compare YoY unit economics and benchmark vs peers.",
    sampleAnswer:
      "Start by confirming whether the issue is top-line, margin, or both. Decompose revenue into traffic, ticket, and mix; decompose margin into COGS (beans, dairy), labor, rent, and marketing. If revenue is flat but profit fell, focus on cost inflation (wages, inputs) or shrink/waste. Size each driver, then prioritize quick wins (pricing tests, labor scheduling) vs structural fixes (lease renegotiation, menu rationalization).",
    firmSource: "Style: McKinsey-style profitability",
    isShared: true,
    careerTracks: ["Consulting"],
    dedupeKey: dk("MetroBrew", "Profitability"),
  },
  {
    title: "SunPack Entering the US Snack Bar Market",
    type: "Market Entry",
    difficulty: "Hard",
    prompt:
      "SunPack, a European brand of healthy snack bars, is considering entering the United States. The board wants a recommendation on whether to enter, and if so, which channel and positioning to lead with.",
    framework:
      "Market entry: market attractiveness (size, growth, margins), competitive landscape, barriers (regulation, distribution), capabilities fit, and entry mode (organic build, JV, acquisition). End with a phased go-to-market.",
    sampleAnswer:
      "Size the US snack bar TAM/SAM, growth, and profitability. Map competitors (Clif, KIND, RXBAR) and whitespace (e.g., low-sugar, functional ingredients). Assess SunPack’s supply chain cost to serve US vs EU. Recommend entry only if SAM supports a path to scale; often start in natural/specialty retail and e-commerce, then expand to conventional grocery once velocity is proven.",
    firmSource: "Style: BCG-style market entry",
    isShared: true,
    careerTracks: ["Consulting"],
    dedupeKey: dk("SunPack", "Market Entry"),
  },
  {
    title: "Horizon Pharma Acquires Rival FormularyCo",
    type: "M&A",
    difficulty: "Hard",
    prompt:
      "Horizon Pharma is evaluating the acquisition of FormularyCo, a smaller competitor with overlapping therapeutic areas but stronger payer relationships. The CEO asks how you would advise them on the decision and key diligence workstreams.",
    framework:
      "Strategic rationale (revenue synergies, portfolio depth, payer access), financial (accretion, ROIC, integration costs), risks (regulatory, integration, culture), and process (valuation range, negotiation levers, alternative structures).",
    sampleAnswer:
      "Clarify thesis: is this about scale, pipeline, or commercial reach? Build a synergy case (cross-sell, combined contracting) vs standalone sum-of-parts. Stress-test concentration risk and pipeline overlap. Recommend proceeding only if synergies exceed control premium and integration risk is manageable; define a diligence plan covering legal, commercial, and manufacturing continuity.",
    firmSource: "Style: Bain-style M&A strategy",
    isShared: true,
    careerTracks: ["Consulting"],
    dedupeKey: dk("Horizon FormularyCo", "M&A"),
  },
  {
    title: "CloudSync SaaS Pricing Reset",
    type: "Pricing",
    difficulty: "Medium",
    prompt:
      "CloudSync sells B2B workflow software with flat per-seat pricing. Churn has risen and new logo growth slowed. The CRO believes pricing is leaving money on the table but fears backlash from existing customers. How would you approach pricing?",
    framework:
      "Pricing framework: value to customer (ROI), willingness-to-pay research, competitive price bands, cost-to-serve, and packaging (good/better/best). Consider grandfathering vs migration paths.",
    sampleAnswer:
      "Segment customers by usage intensity and retention cohorts. Estimate elasticity with conjoint or historical experiments. Compare to value-based metrics (time saved per seat). Propose tiered bundles aligning price to value, with migration credits for strategic accounts. Pilot with new logos first, then offer voluntary migration with incentives before any broad reset.",
    firmSource: "Style: McKinsey-style pricing",
    isShared: true,
    careerTracks: ["Consulting"],
    dedupeKey: dk("CloudSync", "Pricing"),
  },
  {
    title: "FreshFold Regional Laundry Network — Throughput Crisis",
    type: "Operations",
    difficulty: "Medium",
    prompt:
      "FreshFold operates industrial laundry plants serving hotels and hospitals. On-time delivery has slipped from 97% to 88% in six months, and overtime hours are up 35%. The COO wants a root-cause assessment and improvement plan.",
    framework:
      "Operations diagnostic: demand/capacity balance, bottleneck process mapping (wash, dry, fold, dispatch), labor scheduling, maintenance/MTBF, supplier inputs, and quality/rework rates.",
    sampleAnswer:
      "Map the value stream and measure cycle time by step. Check if demand spikes or lost capacity (equipment downtime) shifted the bottleneck. Review scheduling vs peaks, staffing model, and maintenance backlog. Quick wins may include staggered shifts and preventive maintenance; structural fixes could be modest capex on dryers or route density optimization.",
    firmSource: "Style: Operations case",
    isShared: true,
    careerTracks: ["Consulting"],
    dedupeKey: dk("FreshFold", "Operations"),
  },
];
