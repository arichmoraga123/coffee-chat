export type SchoolSeedRow = {
  name: string;
  shortName: string;
  domain: string;
  location: string;
  country?: string;
  type: string;
  isVerified: boolean;
};

export const PROSPECT_SCHOOL_SEED: SchoolSeedRow[] = [
  { name: "Michigan State University", shortName: "MSU", domain: "msu.edu", location: "East Lansing, MI", type: "semi-target", isVerified: true },
  { name: "University of Michigan", shortName: "UMich", domain: "umich.edu", location: "Ann Arbor, MI", type: "target", isVerified: true },
  { name: "Indiana University", shortName: "IU", domain: "iu.edu", location: "Bloomington, IN", type: "semi-target", isVerified: true },
  { name: "University of Illinois", shortName: "UIUC", domain: "illinois.edu", location: "Champaign, IL", type: "semi-target", isVerified: true },
  { name: "Ohio State University", shortName: "OSU", domain: "osu.edu", location: "Columbus, OH", type: "semi-target", isVerified: true },
  { name: "University of Wisconsin", shortName: "UW", domain: "wisc.edu", location: "Madison, WI", type: "semi-target", isVerified: true },
  { name: "University of Pennsylvania", shortName: "Penn", domain: "upenn.edu", location: "Philadelphia, PA", type: "target", isVerified: true },
  { name: "New York University", shortName: "NYU", domain: "nyu.edu", location: "New York, NY", type: "target", isVerified: true },
  { name: "Georgetown University", shortName: "Georgetown", domain: "georgetown.edu", location: "Washington, DC", type: "target", isVerified: true },
  { name: "Cornell University", shortName: "Cornell", domain: "cornell.edu", location: "Ithaca, NY", type: "target", isVerified: true },
  { name: "University of Notre Dame", shortName: "Notre Dame", domain: "nd.edu", location: "Notre Dame, IN", type: "semi-target", isVerified: true },
  { name: "University of Chicago", shortName: "UChicago", domain: "uchicago.edu", location: "Chicago, IL", type: "target", isVerified: true },
  { name: "Columbia University", shortName: "Columbia", domain: "columbia.edu", location: "New York, NY", type: "target", isVerified: true },
  { name: "Duke University", shortName: "Duke", domain: "duke.edu", location: "Durham, NC", type: "target", isVerified: true },
  { name: "Vanderbilt University", shortName: "Vanderbilt", domain: "vanderbilt.edu", location: "Nashville, TN", type: "semi-target", isVerified: true },
  {
    name: "National University of Singapore",
    shortName: "NUS",
    domain: "nus.edu.sg",
    location: "Singapore",
    country: "SG",
    type: "target",
    isVerified: true,
  },
  {
    name: "London School of Economics",
    shortName: "LSE",
    domain: "lse.ac.uk",
    location: "London, UK",
    country: "UK",
    type: "target",
    isVerified: true,
  },
  {
    name: "HEC Paris",
    shortName: "HEC",
    domain: "hec.edu",
    location: "Paris, France",
    country: "FR",
    type: "target",
    isVerified: true,
  },
  { name: "University of Virginia", shortName: "UVA", domain: "virginia.edu", location: "Charlottesville, VA", type: "semi-target", isVerified: true },
  { name: "Emory University", shortName: "Emory", domain: "emory.edu", location: "Atlanta, GA", type: "semi-target", isVerified: true },
];
