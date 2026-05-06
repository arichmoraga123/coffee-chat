export function getPrimaryTrack(careerTracks: string[]): string {
  return careerTracks[0] ?? "General";
}

const TRACK_CATEGORY_MAP: Record<string, string[]> = {
  "Investment Banking": ["Accounting", "DCF", "LBO Models", "Valuation", "Merger Models", "Equity Value & Enterprise Value"],
  "Private Equity": ["LBO Models", "Valuation", "DCF", "Merger Models", "Finance Concepts"],
  "Venture Capital": ["Valuation", "Finance Concepts", "Behavioral"],
  Consulting: ["Consulting - Behavioral", "Consulting - Case Math", "Finance Concepts"],
  "Sales & Trading": ["Finance Concepts", "Capital Markets"],
  "Asset Management": ["Asset Management", "Valuation", "Finance Concepts"],
  "Equity Research": ["Asset Management", "Valuation", "Finance Concepts"],
  "Big 4 Accounting": ["Accounting", "Finance Concepts"],
  "Wealth Management": ["Wealth Management", "Finance Concepts", "Asset Management"],
  "Corporate Finance": ["Finance Concepts", "Accounting", "Valuation"],
  "Capital Markets": ["Capital Markets", "Finance Concepts"],
  "Tech/Startup": ["Behavioral", "Finance Concepts"],
};

const TRACK_BANK_MAP: Record<string, string[]> = {
  "Investment Banking": ["Goldman Sachs", "Morgan Stanley", "JPMorgan", "Evercore", "Centerview"],
  "Private Equity": ["KKR", "Blackstone", "Apollo", "Carlyle", "Warburg Pincus"],
  "Venture Capital": ["General Consulting"],
  Consulting: ["Case in Point / General Consulting"],
  "Sales & Trading": ["Goldman Sachs", "Morgan Stanley", "JPMorgan"],
  "Asset Management": ["Blackstone", "Goldman Sachs", "JPMorgan"],
  "Equity Research": ["Goldman Sachs", "Morgan Stanley", "JPMorgan"],
  "Big 4 Accounting": ["Houlihan Lokey"],
  "Wealth Management": ["Morgan Stanley", "JPMorgan", "Goldman Sachs"],
  "Corporate Finance": ["JPMorgan", "Goldman Sachs"],
  "Capital Markets": ["JPMorgan", "Goldman Sachs", "Morgan Stanley"],
  "Tech/Startup": ["Case in Point / General Consulting"],
};

const TRACK_LEARNING_PATH_MAP: Record<string, string[]> = {
  "Investment Banking": ["Accounting", "Equity Value & Enterprise Value", "Valuation", "DCF", "Merger Models", "LBO Models"],
  Consulting: ["Consulting - Behavioral", "Consulting - Case Math", "Finance Concepts"],
  "Private Equity": ["Valuation", "DCF", "LBO Models", "Merger Models"],
  "Sales & Trading": ["Finance Concepts", "Capital Markets"],
  "Big 4 Accounting": ["Accounting", "Finance Concepts"],
};

const TRACK_RESOURCE_MAP: Record<string, string[]> = {
  "Investment Banking": ["IB_PE"],
  "Private Equity": ["IB_PE"],
  Consulting: ["Consulting"],
  "Asset Management": ["AM"],
  "Equity Research": ["AM"],
  "Capital Markets": ["CM"],
  "Big 4 Accounting": ["Accounting"],
  "Wealth Management": ["WM"],
  "Tech/Startup": ["Tech"],
};

function combineMapped(tracks: string[], map: Record<string, string[]>) {
  const out: string[] = [];
  for (const t of tracks) {
    for (const value of map[t] ?? []) {
      if (!out.includes(value)) out.push(value);
    }
  }
  return out;
}

export function getRelevantCategories(tracks: string[]): string[] {
  return combineMapped(tracks, TRACK_CATEGORY_MAP);
}

export function getRelevantBanks(tracks: string[]): string[] {
  return combineMapped(tracks, TRACK_BANK_MAP);
}

export function getTrackLearningPath(tracks: string[]): string[] {
  const primary = getPrimaryTrack(tracks);
  return TRACK_LEARNING_PATH_MAP[primary] ?? getRelevantCategories(tracks).slice(0, 6);
}

export function getRelevantResources(tracks: string[]): string[] {
  return combineMapped(tracks, TRACK_RESOURCE_MAP);
}

export function getResumeTrackSectionLabel(track: string): string {
  if (track === "Consulting") return "Leadership & Problem Solving";
  if (track === "Sales & Trading") return "Quantitative Skills";
  if (track === "Big 4 Accounting") return "Accounting & Technical Skills";
  if (track === "Tech/Startup") return "Technical & Product Skills";
  if (["Investment Banking", "Private Equity", "Venture Capital"].includes(track)) return "Finance & Deal Experience";
  return "Track-Specific Strength";
}
