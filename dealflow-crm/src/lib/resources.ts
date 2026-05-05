export type ResourceItem = {
  slug: string;
  title: string;
  description: string;
  url: string;
  category: string;
  isPrimary: boolean;
};

export const resources: ResourceItem[] = [
  {
    slug: "biws-400-2025",
    title: "BIWS 400 Questions Guide",
    description:
      "The definitive free IB interview prep guide — 400 Q&As across technicals, behavioral, and industry-specific questions.",
    url: "https://breakingintowallstreet.com/free-400-questions/",
    category: "Technical Prep",
    isPrimary: true,
  },
  {
    slug: "wsp-knowledge",
    title: "Wall Street Prep Free Resources",
    description: "Free financial modeling tutorials, accounting primers, and valuation guides.",
    url: "https://www.wallstreetprep.com/knowledge/",
    category: "Technical Prep",
    isPrimary: false,
  },
  {
    slug: "mergers-inquisitions",
    title: "Mergers & Inquisitions",
    description: "Best free resource for IB recruiting strategy, fit questions, and breaking in from non-target schools.",
    url: "https://mergersandinquisitions.com/",
    category: "Technical Prep",
    isPrimary: true,
  },
  {
    slug: "streetofwalls-ib",
    title: "Street of Walls IB Training",
    description: "Free IB and PE technical training including LBO modeling guides.",
    url: "https://www.streetofwalls.com/finance-training-courses/investment-banking-training/",
    category: "Technical Prep",
    isPrimary: false,
  },
  {
    slug: "ibankingfaq",
    title: "IBankingFAQ",
    description: "Community Q&A and technical guides for IB/PE interviews.",
    url: "https://www.ibankingfaq.com/",
    category: "Technical Prep",
    isPrimary: false,
  },
  {
    slug: "biws-youtube",
    title: "BIWS YouTube Channel",
    description: "Free walkthrough videos on LBO modeling, DCF, accounting, and merger models.",
    url: "https://www.youtube.com/@breakingintowallstreet",
    category: "Technical Prep",
    isPrimary: false,
  },
  {
    slug: "rareliquid-youtube",
    title: "Rareliquid YouTube",
    description: "Finance career advice and recruiting insights from someone who's done it.",
    url: "https://www.youtube.com/@rareliquid",
    category: "Technical Prep",
    isPrimary: false,
  },
  {
    slug: "nvca-model-docs",
    title: "NVCA Model Legal Documents",
    description: "Standard VC term sheets, investor rights agreements, and voting agreements used in real deals.",
    url: "https://nvca.org/model-legal-documents/",
    category: "PE/VC",
    isPrimary: false,
  },
  {
    slug: "dealstreetasia",
    title: "DealStreetAsia",
    description: "APAC-focused PE/VC deal news — essential for emerging markets recruiting.",
    url: "https://www.dealstreetasia.com/",
    category: "PE/VC",
    isPrimary: true,
  },
  {
    slug: "pehub",
    title: "PE Hub",
    description: "Private equity deal news, fundraising announcements, and exits.",
    url: "https://www.pehub.com/",
    category: "PE/VC",
    isPrimary: false,
  },
  {
    slug: "wsj",
    title: "Wall Street Journal",
    description: "Primary source for M&A news, markets, and macro.",
    url: "https://www.wsj.com/",
    category: "News & Markets",
    isPrimary: true,
  },
  {
    slug: "ft",
    title: "Financial Times",
    description: "Best for APAC/European deal coverage and macro analysis.",
    url: "https://www.ft.com/",
    category: "News & Markets",
    isPrimary: true,
  },
  {
    slug: "nikkei-asia",
    title: "Nikkei Asia",
    description: "APAC business and markets — essential for APAC/emerging markets PE recruiting.",
    url: "https://asia.nikkei.com/",
    category: "News & Markets",
    isPrimary: false,
  },
  {
    slug: "bloomberg",
    title: "Bloomberg",
    description: "Real-time markets, M&A, and finance news.",
    url: "https://www.bloomberg.com/",
    category: "News & Markets",
    isPrimary: false,
  },
  {
    slug: "pe-broad-resources",
    title: "PE@Broad Club Resources",
    description: "Internal PE@Broad training materials, past deal cases, and recruiting guides. (MSU login required)",
    url: "#",
    category: "MSU / Broad",
    isPrimary: true,
  },
  {
    slug: "broad-career",
    title: "Broad Career Services",
    description: "MSU Broad career resources, recruiting events, and alumni network.",
    url: "https://broad.msu.edu/career-management/",
    category: "MSU / Broad",
    isPrimary: false,
  },
  {
    slug: "macabacus",
    title: "Macabacus",
    description: "Excel shortcuts, financial modeling best practices, and templates used at top banks.",
    url: "https://macabacus.com/",
    category: "Tools",
    isPrimary: false,
  },
  {
    slug: "pitchbook",
    title: "Pitchbook",
    description: "PE/VC deal database. Free access available through MSU library.",
    url: "https://pitchbook.com/",
    category: "Tools",
    isPrimary: true,
  },
];

const TAB_ORDER = [
  "All",
  "Technical Prep",
  "PE/VC",
  "News & Markets",
  "MSU / Broad",
  "Tools",
] as const;

export function resourceTabs(): string[] {
  return [...TAB_ORDER];
}

export function allResources(): ResourceItem[] {
  return resources;
}
