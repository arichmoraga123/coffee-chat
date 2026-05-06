import { createHash } from "node:crypto";

function dk(title: string, date: string) {
  return createHash("sha256").update(`deal|${title}|${date}`).digest("hex");
}

export const SEED_DEALS = [
  {
    title: "Mars acquires Kellanova for $36B",
    status: "published" as const,
    vertical: "Investment Banking",
    acquirer: "Mars Inc.",
    target: "Kellanova",
    dealValue: "$36B",
    dealType: "M&A",
    sector: "Consumer/Food & Beverage",
    summary:
      "Mars, the privately held candy and pet food giant, acquired Kellanova — the snack spinoff of Kellogg's containing Pringles, Cheez-It, and Pop-Tarts — in one of the largest food M&A deals in history. The deal gives Mars significant scale in the savory snack category and diversifies beyond its core chocolate business.",
    keyThesis:
      "Mars gains immediate scale in high-growth savory snacks, cross-sells through existing global distribution, and acquires brands with strong international presence. Kellanova's asset-light model fits Mars's long-term ownership profile.",
    risks:
      "Integration complexity across very different corporate cultures (private vs. public). Premium valuation (~16x EBITDA) leaves little room for error. Snack category faces headwinds from GLP-1 weight loss drugs reducing consumer appetite.",
    sourceUrl: null,
    announcedAt: new Date("2024-08-14"),
    dedupeKey: dk("Mars / Kellanova", "2024-08-14"),
    careerTracks: ["Investment Banking", "Private Equity", "Corporate Finance"],
  },
  {
    title: "Synopsys acquires Ansys for $35B",
    status: "published" as const,
    vertical: "Investment Banking",
    acquirer: "Synopsys",
    target: "Ansys",
    dealValue: "$35B",
    dealType: "M&A",
    sector: "Technology/EDA Software",
    summary:
      "Synopsys, the leading electronic design automation software company, agreed to acquire Ansys, a simulation software leader, creating a combined entity covering the full chip and system design workflow. The deal faced lengthy regulatory scrutiny before receiving approval.",
    keyThesis:
      "Combines EDA (chip design) with simulation software to create an end-to-end platform for semiconductor and systems engineering. Strong cross-sell opportunity as both companies serve overlapping semiconductor and aerospace customers.",
    risks:
      "Significant regulatory overhang delayed close by over a year. High purchase price at ~47x earnings. Integration of two large software platforms is operationally complex. Customer concentration in semiconductor sector creates cyclical exposure.",
    sourceUrl: null,
    announcedAt: new Date("2024-01-16"),
    dedupeKey: dk("Synopsys / Ansys", "2024-01-16"),
    careerTracks: ["Investment Banking", "Tech/Startup", "Private Equity"],
  },
  {
    title: "Apollo acquires Intel Fab stake for $11B",
    status: "published" as const,
    vertical: "Private Equity",
    acquirer: "Apollo Global Management",
    target: "Intel Fab Business (minority stake)",
    dealValue: "$11B",
    dealType: "M&A",
    sector: "Semiconductors/PE",
    summary:
      "Apollo led a consortium to acquire a minority stake in Intel's semiconductor manufacturing business as Intel seeks to spin out its foundry operations and raise capital to fund its massive fab buildout. The deal represents one of the largest PE investments in the semiconductor space.",
    keyThesis:
      "Apollo gains exposure to the secular growth of domestic semiconductor manufacturing with government tailwinds from the CHIPS Act. Intel's fab business, once separated, could benefit from third-party customers like Amazon and Microsoft.",
    risks:
      "Intel's foundry business is not yet profitable and faces intense competition from TSMC and Samsung. Execution risk on Intel's turnaround is high. Capital intensity of semiconductor manufacturing is extreme.",
    sourceUrl: null,
    announcedAt: new Date("2024-09-16"),
    dedupeKey: dk("Apollo / Intel Fab", "2024-09-16"),
    careerTracks: ["Private Equity", "Private Credit", "Investment Banking"],
  },
  {
    title: "Blackstone acquires AIR Communities for $10B",
    status: "published" as const,
    vertical: "Real Estate PE",
    acquirer: "Blackstone Real Estate",
    target: "Apartment Income REIT (AIR Communities)",
    dealValue: "$10B",
    dealType: "LBO",
    sector: "Real Estate/Multifamily",
    summary:
      "Blackstone agreed to take AIR Communities private in a $10B take-private transaction, acquiring one of the largest apartment REITs in the US with properties concentrated in high-barrier coastal markets. The deal reflects Blackstone's continued conviction in multifamily housing despite elevated interest rates.",
    keyThesis:
      "Supply-constrained coastal markets (Miami, LA, Boston, DC) provide pricing power. Structural undersupply of housing supports long-term rent growth. Blackstone can add value through operational improvements and selective asset dispositions.",
    risks:
      "High interest rate environment increases cost of debt financing. Rent control legislation risk in key markets. Elevated entry price leaves limited margin of safety if cap rates expand further.",
    sourceUrl: null,
    announcedAt: new Date("2024-04-08"),
    dedupeKey: dk("Blackstone / AIR", "2024-04-08"),
    careerTracks: ["Private Equity", "Real Estate", "Asset Management"],
  },
  {
    title: "Juniper Networks acquired by HPE for $14B",
    status: "published" as const,
    vertical: "Investment Banking",
    acquirer: "Hewlett Packard Enterprise",
    target: "Juniper Networks",
    dealValue: "$14B",
    dealType: "M&A",
    sector: "Technology/Networking",
    summary:
      "HPE acquired Juniper Networks, a leading enterprise networking equipment and software company, to compete more directly with Cisco in the AI-driven networking market. The deal significantly expands HPE's networking portfolio and adds Juniper's AI-native Mist platform.",
    keyThesis:
      "AI infrastructure buildout is driving massive demand for high-performance networking. Juniper's Mist AI platform is differentiated in enterprise Wi-Fi and campus networking. Combined entity can compete with Cisco across the full enterprise networking stack.",
    risks:
      "Regulatory scrutiny delayed close significantly. Integration of large hardware businesses is complex. Cisco's market dominance makes displacement difficult. Networking hardware faces commoditization pressure long-term.",
    sourceUrl: null,
    announcedAt: new Date("2024-01-09"),
    dedupeKey: dk("HPE / Juniper", "2024-01-09"),
    careerTracks: ["Investment Banking", "Tech/Startup", "Equity Research"],
  },
];
