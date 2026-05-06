export type ResourceItem = {
  slug: string;
  title: string;
  description: string;
  url: string;
  category: string;
  isPrimary: boolean;
  /** Top-level track tab (All shows every item). */
  resourceTrack: string;
};

export const RESOURCE_TRACK_TABS: { id: string; label: string }[] = [
  { id: "All", label: "All" },
  { id: "IB_PE", label: "IB/PE" },
  { id: "Consulting", label: "Consulting" },
  { id: "AM", label: "Asset Management" },
  { id: "CM", label: "Capital Markets" },
  { id: "Accounting", label: "Accounting" },
  { id: "WM", label: "Wealth Management" },
  { id: "Tech", label: "Tech" },
];

export const resources: ResourceItem[] = [
  {
    slug: "biws-400-2025",
    title: "BIWS 400 Questions Guide",
    description:
      "The definitive free IB interview prep guide — 400 Q&As across technicals, behavioral, and industry-specific questions.",
    url: "https://drive.google.com/file/d/106-QK_HLQL7Zy4f1spHbp6PJlv-YGjS8/view?usp=sharing",
    category: "Technical Prep",
    isPrimary: true,
    resourceTrack: "IB_PE",
  },
  {
    slug: "wsp-knowledge",
    title: "Wall Street Prep Free Resources",
    description: "Free financial modeling tutorials, accounting primers, and valuation guides.",
    url: "https://www.wallstreetprep.com/knowledge/",
    category: "Technical Prep",
    isPrimary: false,
    resourceTrack: "IB_PE",
  },
  {
    slug: "mergers-inquisitions",
    title: "Mergers & Inquisitions",
    description: "Best free resource for IB recruiting strategy, fit questions, and breaking in from non-target schools.",
    url: "https://mergersandinquisitions.com/",
    category: "Technical Prep",
    isPrimary: true,
    resourceTrack: "IB_PE",
  },
  {
    slug: "streetofwalls-ib",
    title: "Street of Walls IB Training",
    description: "Free IB and PE technical training including LBO modeling guides.",
    url: "https://www.streetofwalls.com/",
    category: "Technical Prep",
    isPrimary: false,
    resourceTrack: "IB_PE",
  },
  {
    slug: "ibankingfaq",
    title: "IBankingFAQ",
    description: "Community Q&A and technical guides for IB/PE interviews.",
    url: "https://www.ibankingfaq.com/",
    category: "Technical Prep",
    isPrimary: false,
    resourceTrack: "IB_PE",
  },
  {
    slug: "biws-youtube",
    title: "BIWS YouTube Channel",
    description: "Free walkthrough videos on LBO modeling, DCF, accounting, and merger models.",
    url: "https://www.youtube.com/@breakingintowallstreet",
    category: "Technical Prep",
    isPrimary: false,
    resourceTrack: "IB_PE",
  },
  {
    slug: "rareliquid-youtube",
    title: "Rareliquid YouTube",
    description: "Finance career advice and recruiting insights from someone who's done it.",
    url: "https://www.youtube.com/@rareliquid",
    category: "Technical Prep",
    isPrimary: false,
    resourceTrack: "IB_PE",
  },
  {
    slug: "nvca-model-docs",
    title: "NVCA Model Legal Documents",
    description: "Standard VC term sheets, investor rights agreements, and voting agreements used in real deals.",
    url: "https://nvca.org/model-legal-documents/",
    category: "PE/VC",
    isPrimary: false,
    resourceTrack: "IB_PE",
  },
  {
    slug: "dealstreetasia",
    title: "DealStreetAsia",
    description: "APAC-focused PE/VC deal news — essential for emerging markets recruiting.",
    url: "https://www.dealstreetasia.com/",
    category: "PE/VC",
    isPrimary: true,
    resourceTrack: "IB_PE",
  },
  {
    slug: "pehub",
    title: "PE Hub",
    description: "Private equity deal news, fundraising announcements, and exits.",
    url: "https://www.pehub.com/",
    category: "PE/VC",
    isPrimary: false,
    resourceTrack: "IB_PE",
  },
  {
    slug: "wsj",
    title: "Wall Street Journal",
    description: "Primary source for M&A news, markets, and macro.",
    url: "https://www.wsj.com/",
    category: "News & Markets",
    isPrimary: true,
    resourceTrack: "IB_PE",
  },
  {
    slug: "ft",
    title: "Financial Times",
    description: "Best for APAC/European deal coverage and macro analysis.",
    url: "https://www.ft.com/",
    category: "News & Markets",
    isPrimary: true,
    resourceTrack: "IB_PE",
  },
  {
    slug: "nikkei-asia",
    title: "Nikkei Asia",
    description: "APAC business and markets — essential for APAC/emerging markets PE recruiting.",
    url: "https://asia.nikkei.com/",
    category: "News & Markets",
    isPrimary: false,
    resourceTrack: "IB_PE",
  },
  {
    slug: "bloomberg",
    title: "Bloomberg",
    description: "Real-time markets, M&A, and finance news.",
    url: "https://www.bloomberg.com/",
    category: "News & Markets",
    isPrimary: false,
    resourceTrack: "IB_PE",
  },
  {
    slug: "pe-broad-resources",
    title: "PE@Broad Club Resources",
    description: "PE@Broad training materials, past deal cases, and recruiting guides.",
    url: "https://privateequityatbroad.wixsite.com/home",
    category: "MSU / Broad",
    isPrimary: true,
    resourceTrack: "IB_PE",
  },
  {
    slug: "broad-career",
    title: "Broad Career Services",
    description: "MSU Broad career resources, recruiting events, and alumni network.",
    url: "https://broad.msu.edu/career-management/",
    category: "MSU / Broad",
    isPrimary: false,
    resourceTrack: "All",
  },
  {
    slug: "macabacus",
    title: "Macabacus",
    description: "Excel shortcuts, financial modeling best practices, and templates used at top banks.",
    url: "https://macabacus.com/",
    category: "Tools",
    isPrimary: false,
    resourceTrack: "IB_PE",
  },
  {
    slug: "pitchbook",
    title: "Pitchbook",
    description: "PE/VC deal database. Free access available through MSU library.",
    url: "https://pitchbook.com/",
    category: "Tools",
    isPrimary: true,
    resourceTrack: "IB_PE",
  },
  // Consulting
  {
    slug: "case-in-point",
    title: "Case in Point (book)",
    description: "Classic case interview preparation reference.",
    url: "https://www.amazon.com/Case-Point-Complete-Interview-Preparation/dp/0986370037",
    category: "Consulting",
    isPrimary: true,
    resourceTrack: "Consulting",
  },
  {
    slug: "management-consulted",
    title: "Management Consulted",
    description: "Consulting interview prep, cases, and firm guides.",
    url: "https://managementconsulted.com/",
    category: "Consulting",
    isPrimary: true,
    resourceTrack: "Consulting",
  },
  {
    slug: "preplounge",
    title: "PrepLounge",
    description: "Case interview community and peer practice.",
    url: "https://www.preplounge.com/",
    category: "Consulting",
    isPrimary: false,
    resourceTrack: "Consulting",
  },
  {
    slug: "mckinsey-insights",
    title: "McKinsey Insights",
    description: "Industry articles and frameworks from McKinsey.",
    url: "https://www.mckinsey.com/insights",
    category: "Consulting",
    isPrimary: false,
    resourceTrack: "Consulting",
  },
  // Asset Management
  {
    slug: "cfa-institute",
    title: "CFA Institute",
    description: "CFA program and investment foundations curriculum.",
    url: "https://www.cfainstitute.org/",
    category: "Asset Management",
    isPrimary: true,
    resourceTrack: "AM",
  },
  {
    slug: "investopedia",
    title: "Investopedia",
    description: "Investing education, definitions, and tutorials.",
    url: "https://www.investopedia.com/",
    category: "Asset Management",
    isPrimary: true,
    resourceTrack: "AM",
  },
  {
    slug: "morningstar",
    title: "Morningstar",
    description: "Funds, stocks, and investment research.",
    url: "https://www.morningstar.com/",
    category: "Asset Management",
    isPrimary: false,
    resourceTrack: "AM",
  },
  // Capital Markets
  {
    slug: "sifma",
    title: "SIFMA",
    description: "Securities industry association — markets and policy resources.",
    url: "https://www.sifma.org/",
    category: "Capital Markets",
    isPrimary: true,
    resourceTrack: "CM",
  },
  {
    slug: "investopedia-fixed-income",
    title: "Investopedia — Fixed Income Essentials",
    description: "Bond markets, yields, and credit fundamentals.",
    url: "https://www.investopedia.com/fixed-income-essentials-4689741",
    category: "Capital Markets",
    isPrimary: false,
    resourceTrack: "CM",
  },
  // Accounting
  {
    slug: "aicpa",
    title: "AICPA",
    description: "Accounting profession standards and CPA resources.",
    url: "https://www.aicpa.org/",
    category: "Accounting",
    isPrimary: true,
    resourceTrack: "Accounting",
  },
  {
    slug: "big4-transparency",
    title: "Big 4 Transparency Reports",
    description: "Independent reporting on the largest accounting networks.",
    url: "https://www.big4transparency.com/",
    category: "Accounting",
    isPrimary: false,
    resourceTrack: "Accounting",
  },
  // Wealth Management
  {
    slug: "cfp-board",
    title: "CFP Board (professional standards)",
    description: "Financial planning body of knowledge and ethics.",
    url: "https://www.cfp.net/",
    category: "Wealth Management",
    isPrimary: true,
    resourceTrack: "WM",
  },
  // Tech
  {
    slug: "ycombinator-library",
    title: "Y Combinator Startup Library",
    description: "Essays and playbooks for founders and startup operators.",
    url: "https://www.ycombinator.com/library",
    category: "Tech",
    isPrimary: true,
    resourceTrack: "Tech",
  },
];

export function resourceTabs(): string[] {
  return RESOURCE_TRACK_TABS.map((t) => t.label);
}

export function resourceTrackTabIds(): string[] {
  return RESOURCE_TRACK_TABS.map((t) => t.id);
}

export function allResources(): ResourceItem[] {
  return resources;
}
