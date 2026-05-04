export type ResourceItem = {
  slug: string;
  title: string;
  description: string;
  category: string;
  url: string;
};

export const RESOURCE_SECTIONS: { title: string; items: ResourceItem[] }[] = [
  {
    title: "Technical Prep",
    items: [
      {
        slug: "biws-400",
        title: "BIWS 400 Questions Guide",
        description: "Core technical bank — mirrored in the in-app Question Bank.",
        category: "Technical Prep",
        url: "https://breakingintowallstreet.com/",
      },
      {
        slug: "wsp-knowledge",
        title: "Wall Street Prep Free Resources",
        description: "Knowledge base and free modeling and interview content.",
        category: "Technical Prep",
        url: "https://www.wallstreetprep.com/knowledge/",
      },
      {
        slug: "cfi-free",
        title: "Corporate Finance Institute (CFI) Free Courses",
        description: "Free courses on accounting, valuation, and Excel.",
        category: "Technical Prep",
        url: "https://corporatefinanceinstitute.com/",
      },
      {
        slug: "macabacus",
        title: "Macabacus",
        description: "Excel shortcuts and financial modeling productivity.",
        category: "Technical Prep",
        url: "https://macabacus.com/",
      },
    ],
  },
  {
    title: "IB-Specific",
    items: [
      {
        slug: "mi",
        title: "Mergers & Inquisitions — How to break in",
        description: "Recruiting guides and technical prep for investment banking.",
        category: "IB-Specific",
        url: "https://mergersandinquisitions.com/",
      },
      {
        slug: "ibankingfaq",
        title: "IBankingFAQ",
        description: "FAQ-style recruiting and interview prep for banking.",
        category: "IB-Specific",
        url: "https://www.ibankingfaq.com/",
      },
      {
        slug: "streetofwalls-ib",
        title: "Street of Walls IB Guide",
        description: "Investment banking training and interview materials.",
        category: "IB-Specific",
        url: "https://www.streetofwalls.com/finance-training-courses/investment-banking-training/",
      },
    ],
  },
  {
    title: "PE / VC Specific",
    items: [
      {
        slug: "nvca-models",
        title: "NVCA Model Legal Documents (VC)",
        description: "Standard VC term sheet and legal document templates.",
        category: "PE / VC",
        url: "https://nvca.org/model-legal-documents/",
      },
      {
        slug: "preqin",
        title: "Preqin Insights",
        description: "Private markets data and research (PE/VC).",
        category: "PE / VC",
        url: "https://www.preqin.com/",
      },
      {
        slug: "pehub",
        title: "PE Hub",
        description: "Private equity deal news and industry coverage.",
        category: "PE / VC",
        url: "https://www.pehub.com/",
      },
    ],
  },
  {
    title: "MSU / Broad",
    items: [
      {
        slug: "pe-broad",
        title: "PE@Broad Club Resources",
        description: "Internal club resources (placeholder — add your SharePoint or GroupMe link).",
        category: "MSU / Broad",
        url: "#",
      },
      {
        slug: "broad-career",
        title: "Broad Career Services",
        description: "MSU Broad College career management and employer events.",
        category: "MSU / Broad",
        url: "https://broad.msu.edu/career-management/",
      },
      {
        slug: "msu-aig",
        title: "MSU AIG (Alternative Investments Group)",
        description: "Student org focused on alternatives — add your chapter link.",
        category: "MSU / Broad",
        url: "#",
      },
    ],
  },
  {
    title: "News & Markets",
    items: [
      {
        slug: "wsj",
        title: "Wall Street Journal",
        description: "Markets, deals, and business news.",
        category: "News",
        url: "https://www.wsj.com",
      },
      {
        slug: "ft",
        title: "Financial Times",
        description: "Global finance and economics coverage.",
        category: "News",
        url: "https://www.ft.com",
      },
      {
        slug: "bloomberg",
        title: "Bloomberg",
        description: "Terminal-grade news and data (web + terminal).",
        category: "News",
        url: "https://www.bloomberg.com",
      },
      {
        slug: "pitchbook",
        title: "PitchBook",
        description: "PE/VC deals, funds, and comps data.",
        category: "News",
        url: "https://pitchbook.com",
      },
      {
        slug: "thedeal",
        title: "The Daily Deal",
        description: "M&A and restructuring news.",
        category: "News",
        url: "https://www.thedeal.com/",
      },
    ],
  },
  {
    title: "Interview Prep Videos",
    items: [
      {
        slug: "biws-youtube",
        title: "Breaking Into Wall Street (YouTube)",
        description: "Modeling and interview walkthroughs from BIWS.",
        category: "Videos",
        url: "https://www.youtube.com/@breakingintowallstreet",
      },
      {
        slug: "rareliquid-youtube",
        title: "Rareliquid (YouTube)",
        description: "Recruiting and finance career content.",
        category: "Videos",
        url: "https://www.youtube.com/@rareliquid",
      },
    ],
  },
];

export function allResources(): ResourceItem[] {
  return RESOURCE_SECTIONS.flatMap((s) => s.items);
}
