/** Canonical career track labels (match `User.careerTracks` in Prisma). */
export const CAREER_TRACK_OPTIONS = [
  "Investment Banking",
  "Private Equity",
  "Venture Capital",
  "Hedge Fund",
  "Sales & Trading",
  "Asset Management",
  "Equity Research",
  "Private Credit",
  "Real Estate",
  "Consulting",
  "Big 4 Accounting",
  "Wealth Management",
  "Corporate Finance",
  "Capital Markets",
  "Tech/Startup",
  "Actuarial",
] as const;

export type CareerTrackId = (typeof CAREER_TRACK_OPTIONS)[number];

/** Resources page bucket tabs → underlying career track names. */
/** Resource page tab ids → underlying career track names (see `src/lib/resources.ts`). */
export const RESOURCE_TRACK_BUCKETS: { id: string; label: string; tracks: string[] }[] = [
  { id: "All", label: "All", tracks: [] },
  {
    id: "IB_PE",
    label: "IB/PE",
    tracks: [
      "Investment Banking",
      "Private Equity",
      "Venture Capital",
      "Hedge Fund",
      "Sales & Trading",
      "Private Credit",
      "Corporate Finance",
    ],
  },
  { id: "Consulting", label: "Consulting", tracks: ["Consulting"] },
  {
    id: "AM",
    label: "Asset Management",
    tracks: ["Asset Management", "Equity Research"],
  },
  {
    id: "CM",
    label: "Capital Markets",
    tracks: ["Capital Markets"],
  },
  { id: "Accounting", label: "Accounting", tracks: ["Big 4 Accounting"] },
  { id: "WM", label: "Wealth Management", tracks: ["Wealth Management"] },
  { id: "Tech", label: "Tech", tracks: ["Tech/Startup"] },
];

export function matchesCareerTracks(
  itemTracks: string[] | null | undefined,
  userPreferred: string[],
  narrowTrack: string | null,
): boolean {
  const item = itemTracks ?? [];
  if (userPreferred.length === 0) return true;
  if (item.length === 0) return true;
  const scope = narrowTrack && userPreferred.includes(narrowTrack) ? [narrowTrack] : userPreferred;
  return item.some((t) => scope.includes(t));
}
