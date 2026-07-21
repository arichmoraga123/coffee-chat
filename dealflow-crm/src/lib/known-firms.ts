import type { FirmType } from "@prisma/client";

/** Well-known firm name → type for auto-fill during contact creation. */
const KNOWN_FIRMS: Record<string, FirmType> = {
  "goldman sachs": "IB",
  "goldman": "IB",
  "morgan stanley": "IB",
  "jpmorgan": "IB",
  "jp morgan": "IB",
  "j.p. morgan": "IB",
  "bank of america": "IB",
  "bofa": "IB",
  "citi": "IB",
  "citigroup": "IB",
  "barclays": "IB",
  "deutsche bank": "IB",
  "ubs": "IB",
  "credit suisse": "IB",
  "lazard": "IB",
  "evercore": "IB",
  "moelis": "IB",
  "centerview": "IB",
  "pjt partners": "IB",
  "rothschild": "IB",
  "jefferies": "IB",
  "rbc capital": "IB",
  "baird": "IB",
  "kkr": "PE",
  "blackstone": "PE",
  "apollo": "PE",
  "carlyle": "PE",
  "tpg": "PE",
  "warburg pincus": "PE",
  "bain capital": "PE",
  "thoma bravo": "PE",
  "vista equity": "PE",
  "silver lake": "PE",
  "general atlantic": "GE",
  "insight partners": "GE",
  "tiger global": "GE",
  "andreessen horowitz": "VC",
  "a16z": "VC",
  "sequoia": "VC",
  "accel": "VC",
  "benchmark": "VC",
  "citadel": "HF",
  "bridgewater": "HF",
  "two sigma": "HF",
  "point72": "HF",
  "millennium": "HF",
  "mckinsey": "CONSULTING",
  "bain": "CONSULTING",
  "bcg": "CONSULTING",
  "boston consulting group": "CONSULTING",
  "deloitte": "CONSULTING",
};

export function lookupKnownFirmType(firmName: string): FirmType | null {
  const key = firmName.trim().toLowerCase();
  if (!key) return null;
  if (KNOWN_FIRMS[key]) return KNOWN_FIRMS[key];
  for (const [name, type] of Object.entries(KNOWN_FIRMS)) {
    if (key.includes(name) || name.includes(key)) return type;
  }
  return null;
}
