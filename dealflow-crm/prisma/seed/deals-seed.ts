import { createHash } from "node:crypto";

function dk(title: string, date: string) {
  return createHash("sha256").update(`deal|${title}|${date}`).digest("hex");
}

export const SEED_DEALS = [
  {
    title: "Capital One to acquire Discover Financial in all-stock merger",
    acquirer: "Capital One",
    target: "Discover Financial",
    dealValue: "~$35B (equity value, indicative)",
    dealType: "M&A",
    sector: "Financial services",
    summary:
      "Strategic combination aimed at scale in cards and payments with significant synergy potential and regulatory scrutiny on competition in networks.",
    keyThesis:
      "Revenue and cost synergies from integrated card issuing and network assets; cross-sell and data advantages at scale.",
    risks: "DOJ/CCP review, integration execution, and core deposit/funding mix.",
    sourceUrl: "https://www.reuters.com/business/finance/",
    announcedAt: new Date("2024-02-20"),
    dedupeKey: dk("Capital One / Discover", "2024-02-20"),
  },
  {
    title: "Synopsys acquires Ansys in strategic EDA + simulation combination",
    acquirer: "Synopsys",
    target: "Ansys",
    dealValue: "~$35B enterprise value (indicative)",
    dealType: "M&A",
    sector: "Technology / software",
    summary:
      "Combines chip design software leader with physics-based simulation to offer end-to-end silicon-to-system workflows for customers.",
    keyThesis:
      "Complementary product roadmaps and cross-selling into semiconductor and aerospace/defense verticals.",
    risks: "Regulatory timelines, merger integration, and customer concentration in semis cycle.",
    sourceUrl: "https://www.reuters.com/technology/",
    announcedAt: new Date("2024-01-16"),
    dedupeKey: dk("Synopsys / Ansys", "2024-01-16"),
  },
  {
    title: "HPE acquires Juniper Networks to deepen networking + AI infrastructure",
    acquirer: "Hewlett Packard Enterprise",
    target: "Juniper Networks",
    dealValue: "~$14B (indicative)",
    dealType: "M&A",
    sector: "Technology / networking",
    summary:
      "Enterprise IT vendor bolsters networking and AI data center portfolio by acquiring a leader in routing, switching, and AI-native networking.",
    keyThesis:
      "Accelerates AI-era networking attach and recurring software subscription mix.",
    risks: "Integration of sales motions, margin profile, and competitive response from incumbents.",
    sourceUrl: "https://www.reuters.com/technology/",
    announcedAt: new Date("2024-01-09"),
    dedupeKey: dk("HPE / Juniper", "2024-01-09"),
  },
  {
    title: "Diamondback Energy and Endeavor Energy merge to form Permian powerhouse",
    acquirer: "Diamondback Energy",
    target: "Endeavor Energy Resources",
    dealValue: "~$26B including equity and assumed debt (indicative)",
    dealType: "M&A",
    sector: "Energy / E&P",
    summary:
      "Consolidation in the Permian Basin creating scale advantages in drilling, midstream relationships, and capital efficiency.",
    keyThesis:
      "Lower unit costs, longer inventory runway, and improved free cash flow profile through scale.",
    risks: "Commodity price volatility, regulatory/environmental scrutiny, and execution on synergies.",
    sourceUrl: "https://www.reuters.com/business/energy/",
    announcedAt: new Date("2024-02-12"),
    dedupeKey: dk("Diamondback Endeavor", "2024-02-12"),
  },
  {
    title: "Reddit IPO prices strong retail and advertising growth story",
    acquirer: "Public markets",
    target: "Reddit",
    dealValue: "~$6.5B+ market cap at pricing (indicative)",
    dealType: "IPO",
    sector: "Internet / social",
    summary:
      "Community platform lists highlighting ad monetization improvements, data licensing opportunities, and user growth narrative.",
    keyThesis:
      "Scale of logged-in engagement enables better ad targeting and new revenue lines with disciplined cost growth.",
    risks: "Moderation costs, regulatory risk on data, and volatility typical of high-growth listings.",
    sourceUrl: "https://www.reuters.com/markets/deals/",
    announcedAt: new Date("2024-03-21"),
    dedupeKey: dk("Reddit IPO", "2024-03-21"),
  },
];
