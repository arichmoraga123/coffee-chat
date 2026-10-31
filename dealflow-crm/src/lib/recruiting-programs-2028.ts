/**
 * Summer 2028 internship programs (recruiting cycle running fall 2026 → 2027).
 * Source: public program tracker snapshot taken 31 Oct 2026. Dates move every year —
 * always confirm on the firm's careers page before relying on them.
 */

export type ProgramBucket = "Bulge Bracket" | "Elite Boutique" | "Middle Market" | "Buy-Side";

export type Program = {
  id: string;
  bucket: ProgramBucket;
  company: string;
  program: string;
  /** ISO date the application opened this cycle (if it has). */
  opens: string | null;
  /** ISO application deadline, if published. */
  closes: string | null;
  locations: string | null;
  /** ISO date the application opened in the previous cycle — the best predictor for when it opens next. */
  lastYearOpen: string | null;
  /** Online test / prep provider used in the process. */
  prep: string | null;
  /** CV = resume, CL = cover letter, WA = written answers. */
  materials: string[];
  notes: string | null;
};

export const PROGRAM_SNAPSHOT_DATE = "2026-10-31";
export const PROGRAM_CYCLE_LABEL = "Summer 2028";

// [company, program, opens, closes, locations, lastYearOpen, prep, materials, notes]
type Row = [string, string, string?, string?, string?, string?, string?, string?, string?];

function d(s: string | undefined): string | null {
  if (!s) return null;
  // "29 Oct 26" → "2026-10-29"
  const m = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{2})$/.exec(s.trim());
  if (!m) return null;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  return `20${m[3]}-${months[m[2]]}-${m[1].padStart(2, "0")}`;
}

function rows(bucket: ProgramBucket, list: Row[]): Program[] {
  return list.map(([company, program, opens, closes, locations, lastYear, prep, materials, notes], i) => ({
    id: `${bucket}-${company}-${i}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    bucket,
    company,
    program,
    opens: d(opens),
    closes: d(closes),
    locations: locations || null,
    lastYearOpen: d(lastYear),
    prep: prep || null,
    materials: materials ? materials.split(" ").filter(Boolean) : [],
    notes: notes || null,
  }));
}

const BULGE: Row[] = [
  ["Barclays", "Summer Internship Program 2028", "", "", "", "01 Dec 25", "SHL", "CV"],
  ["Deutsche Bank", "Internship Programme: Investment Bank 2028", "", "", "", "01 Dec 25", "SHL", "CV CL"],
  ["Citi", "Summer Analyst, 2028", "", "", "", "16 Dec 25", "", "CV"],
  ["J.P. Morgan", "2028 Summer Analyst Program", "", "", "", "29 Dec 25", "J.P. Morgan Prep", "CV CL", "Junior networking matters less; HireVue is the first round"],
  ["Goldman Sachs", "2028 Summer Analyst Program", "", "", "", "01 Jan 26", "HireVue Prep", "CV CL", "Can apply to 3 positions/locations"],
  ["Morgan Stanley", "2028 Summer Analyst Program", "", "", "", "01 Jan 26", "Cut-e", "CV CL", "Networking highly important"],
  ["UBS", "2028 Summer Internship", "", "", "", "01 Jan 26", "", "CV", "First stage includes behavioural HireVue"],
  ["Bank of America", "Summer Analyst Program - 2028", "", "", "", "15 Jan 26", "", "CV", "Includes technical HireVue"],
];

const ELITE: Row[] = [
  ["Greenhill", "2028 Investment Banking Summer Analyst (3 programs)", "29 Oct 26", "06 Nov 26", "3 locations", "09 Jan 26", "", "CV"],
  ["Lazard", "2028 Summer Analyst Program", "23 Oct 26", "15 Jan 27", "7 locations", "15 Dec 25", "", "CV CL WA"],
  ["LionTree", "2028 Summer Analyst", "10 Oct 26", "", "2 locations", "14 Nov 25", "", "CV"],
  ["Perella Weinberg Partners", "2028 Advisory Summer Analyst (3 programs)", "10 Oct 26", "05 Jan 27", "6 locations", "15 Nov 25", "", "CV WA"],
  ["Raine Group", "2028 Summer Analyst", "07 Oct 26", "", "New York", "30 Sep 25", "", "CV WA"],
  ["Moelis & Co", "2028 Summer Analyst, Investment Banking", "05 Oct 26", "", "Houston", "25 Nov 25", "", "CV"],
  ["Ardea Partners", "2028 NY Summer Internship", "02 Oct 26", "01 Dec 26", "New York", "10 Dec 25", "", "CV", "Video response as part of application"],
  ["Rothschild & Co.", "2028 Global Advisory Summer Analyst", "01 Oct 26", "", "3 locations", "01 Dec 25", "", "CV CL"],
  ["Evercore", "2028 Summer Analyst Program", "09 Sep 26", "15 Nov 26", "6 locations", "01 Jan 26", "", "CV CL", "1-3 first round screens, mostly technical"],
  ["Qatalyst Partners", "2028 Summer Analyst", "", "", "San Francisco", "15 Dec 25", "", "CV WA", "Only available on Handshake; first round highly technical"],
  ["FT Partners", "2028 Summer Analyst, Investment Banking", "", "", "", "18 Dec 25", "", "CV CL"],
  ["PJT Partners", "2028 Summer Analyst", "", "", "", "02 Jan 26", "Suited", "CV WA"],
  ["Centerview Partners", "2028 Summer Analyst", "", "", "New York", "08 Jan 26", "", "CV", "Only available on Handshake"],
  ["M. Klein & Company", "2028 Summer Analyst Internship", "", "", "New York", "", "", "CV"],
];

const MIDDLE: Row[] = [
  ["Wells Fargo", "2028 Investment Banking Summer Internship (Houston)", "29 Oct 26", "14 Dec 26", "Houston", "01 Jan 26", "", "CV WA"],
  ["Ducera Partners", "2028 Investment Banking Summer Analyst", "29 Oct 26", "", "3 locations", "02 Jan 26", "", "CV CL"],
  ["Truist", "2028 Summer Analyst Program", "29 Oct 26", "", "Houston", "14 Jan 26", "", "CV CL WA"],
  ["Houlihan Lokey", "2028 Summer Financial Analyst", "26 Oct 26", "18 Dec 26", "5 locations", "21 Nov 25", "Suited", "CV CL"],
  ["Stout", "Summer Analyst, Investment Banking (2028)", "19 Oct 26", "", "Chicago", "24 Nov 25", "", "CV CL"],
  ["Piper Sandler", "2028 IB Summer Analyst – Energy, Power & Infrastructure", "15 Oct 26", "06 Nov 26", "Houston", "01 Jan 26", "", "CV CL"],
  ["Ensis Partners", "2028 Summer Analyst - Restructuring", "15 Oct 26", "", "New York", "", "", "CV"],
  ["PMCF Investment Banking", "2028 PMCF Investment Summer Analyst", "01 Oct 26", "", "4 locations", "07 Oct 25", "", "CV"],
  ["Leerink Partners", "2028 Investment Banking Summer Analyst Program", "18 Sep 26", "", "4 locations", "", "", "CV"],
  ["BDO Global", "Summer Analyst, Investment Banking - Summer 2028", "17 Sep 26", "17 Sep 27", "Richmond", "", "", "CV CL"],
  ["SOLIC Capital Advisors", "2028 Summer Internship", "29 Sep 26", "20 Oct 26", "Chicago", "", "", "CV"],
  ["MTS Partners", "2028 Summer Analyst, Investment Banking", "24 Sep 26", "27 Oct 26", "New York", "25 Jan 26", "", "CV"],
  ["Scotiabank", "Insights Day & 2028 Investment Banking Internship Program", "21 Sep 26", "28 Oct 26", "Houston", "", "", "CV CL"],
  ["RBC Capital Markets", "2028 Summer Analyst", "", "", "", "05 Nov 25", "smartPredict", "CV"],
  ["BMO Capital Markets", "Summer 2028 Internship", "", "", "", "08 Nov 25", "", "CV CL"],
  ["Stifel", "2028 Summer Analyst", "", "", "", "17 Nov 25", "", "CV"],
  ["Lincoln International", "2028 Summer Analyst Intern", "", "", "", "24 Nov 25", "", "CV"],
  ["Santander", "2028 Summer Analyst", "", "", "", "01 Dec 25"],
  ["Solomon Partners", "2028 Investment Banking Summer Analyst", "", "", "", "01 Dec 25", "", "CV WA"],
  ["William Blair", "2028 Investment Banking Summer Analyst", "", "", "", "01 Dec 25", "", "CV"],
  ["Union Square Advisors", "Investment Banking 2028 Summer Analyst", "", "", "San Francisco", "05 Dec 25", "", "CV"],
  ["Jefferies", "2028 Summer Analyst Program", "", "", "", "15 Dec 25", "", "CV"],
  ["BNP Paribas", "2028 Summer Analyst Internship", "", "", "", "16 Dec 25", "", "CV"],
  ["Texas Capital Bank", "2028 Investment Banking Summer Analyst", "", "", "Dallas", "16 Dec 25", "", "CV"],
  ["Baird", "Internship - Summer 2028", "", "", "", "22 Dec 25", "", "CV"],
  ["Raymond James", "2028 Investment Banking Summer Analyst", "", "", "", "22 Dec 25", "", "CV"],
  ["MUFG", "2028 Investment Banking Summer Analyst", "", "", "", "23 Dec 25", "", "CV"],
  ["Société Générale", "2028 Summer Analyst Program", "", "", "New York", "29 Dec 25", "", "CV"],
  ["CIBC", "2028 Summer Analyst", "", "", "New York", "01 Jan 26", "", "CV CL"],
  ["JLL", "Investment Banking Summer 2028 Analyst", "", "", "New York", "01 Jan 26"],
  ["Nomura", "2028 Summer Analyst Program", "", "", "", "01 Jan 26", "", "CV"],
  ["Brown Gibbons Lang & Company", "2028 Summer Analyst", "", "", "", "02 Jan 26", "", "CV"],
  ["SMBC", "2028 Summer Intern Program", "", "", "", "02 Jan 26", "", "CV"],
  ["Aeris Partners", "Investment Banking Summer Analyst 2028", "", "", "", "05 Jan 26", "", "CV"],
  ["Capital One", "Investment Banking Summer Analyst 2028", "", "", "", "05 Jan 26", "SHL", "CV"],
  ["Guggenheim Partners", "2028 Investment Banking Summer Analyst", "", "", "", "05 Jan 26", "", "CV CL"],
  ["Scotiabank", "2028 Investment Banking Summer Analyst", "", "", "", "05 Jan 26", "", "CV"],
  ["TD Securities", "2028 Summer Analyst", "", "", "", "05 Jan 26", "", "CV"],
  ["Tidal Partners", "2028 Summer Analyst", "", "", "Palo Alto", "05 Jan 26", "", "CV CL"],
  ["Macquarie Group", "2028 Summer Internship Program", "", "", "", "06 Jan 26", "", "CV CL"],
  ["Cantor Fitzgerald", "Summer 2028 Investment Banking Internship", "", "", "New York", "07 Jan 26", "", "CV"],
  ["Mizuho", "2028 Summer Internship Program", "", "", "New York", "12 Jan 26", "", "CV"],
  ["Stephens", "Investment Banking Summer Analyst 2028", "", "", "", "12 Jan 26", "", "CV"],
  ["DC Advisory", "Summer Analyst 2028", "", "", "", "17 Jan 26", "", "CV"],
  ["Northborne Partners", "2028 Investment Banking Summer Analyst", "", "", "Minneapolis", "17 Jan 26", "", "CV"],
  ["Howden", "2028 Investment Banking Summer Analyst", "", "", "New York", "20 Jan 26", "", "CV CL"],
  ["AQ Technology Partners", "Investment Banking Summer Analyst - 2028", "", "", "Redwood City", "23 Jan 26", "", "CV CL"],
  ["Rockefeller Capital Management", "2028 Summer Analyst - Investment Banking", "", "", "New York", "23 Jan 26", "", "CV CL"],
  ["Harris Williams", "2028 M&A Summer Analyst", "", "", "Boston", "28 Jan 26", "Suited", "CV"],
  ["HSBC", "Summer Internship 2027-2028", "", "", "", "30 Jan 26", "", "CV"],
  ["Hennepin Partners", "2028 Investment Banking Summer Analyst", "", "", "Minneapolis", "30 Jan 26", "", "CV"],
  ["KeyBank", "2028 Summer Analyst", "", "", "", "10 Feb 26", "", "CV CL"],
  ["Regions Bank", "2028 ETP Intern", "", "", "Charlotte", "13 Feb 26", "", "CV"],
  ["Zachary Scott", "2028 Summer Investment Banking Intern", "", "", "Seattle", "17 Feb 26", "", "CV WA"],
  ["Huntington National Bank", "2028 Corporate and Investment Banking Intern", "", "", "", "19 Feb 26", "", "CV CL"],
  ["Lloyds Banking Group", "2028 Summer Analyst Program", "", "", "New York", "19 Feb 26", "", "CV CL"],
  ["Rabobank", "Corporate Finance Summer 2028 Analyst", "", "", "New York", "23 Feb 26", "", "CV"],
  ["Oppenheimer & Co", "2028 Investment Banking Summer Internship", "", "", "New York", "26 Feb 26", "", "CV"],
  ["Capstone Partners", "Summer 2028 Internship", "", "", "New York", "02 Mar 26", "", "CV CL"],
  ["Fifth Third Bank", "Summer 2028 Analyst", "", "", "", "06 Mar 26", "", "CV"],
  ["Cascadia Capital", "2028 Summer Investment Banking Internship", "", "", "", "11 Mar 26", "", "CV"],
  ["Chinook Capital Advisors", "Summer 2028 Internship", "", "", "Washington", "17 Mar 26", "", "CV"],
  ["Citizens Financial Group", "2028 Investment Banking Summer Analyst", "", "", "", "24 Mar 26", "", "CV"],
  ["Mesirow", "Investment Banking Summer Analyst 2028", "", "", "Chicago", "01 Apr 26", "", "CV"],
  ["Equiteq", "Investment Banking Summer Intern 2028", "", "", "", "05 Apr 26", "", "CV"],
  ["BrightTower", "Investment Banking Summer Analyst 2028", "", "", "New York", "08 Apr 26", "", "CV CL"],
  ["PNC", "Corporate & Institutional Banking Summer 2028 Intern", "", "", "", "14 Apr 26", "", "CV CL"],
  ["Ziegler", "2028 Investment Banking Summer Analyst", "", "", "", "01 May 26", "", "CV"],
  ["Bridgepoint Investment Banking", "2028 Investment Banking Summer Analyst Intern", "", "", "Omaha", "07 May 26", "", "CV"],
  ["Agentis Capital", "Investment Banking Summer Analyst 2028", "", "", "", "09 May 26", "", "CV"],
  ["Provident Healthcare Partners", "2028 Summer Investment Banking Internship", "", "", "", "11 May 26", "", "CV"],
  ["Novelty Hill Capital", "Investment Banking Analyst Intern (Summer 2028)", "", "", "Bellevue", "12 May 26", "", "CV"],
  ["U.S. Bank", "2028 Global Capital Markets Summer Intern", "", "", "", "18 May 26", "", "CV CL"],
  ["ING", "Summer 2028 Internship", "", "", "New York", "26 May 26", "", "CV CL"],
  ["ArkMalibu", "Summer 2028 Internship", "", "", "Cincinnati", "09 Jun 26", "", "CV", "Apply via email (see firm website)"],
  ["MarshBerry", "Investment Banking Intern - Summer 2028", "", "", "", "15 Jun 26", "", "CV CL"],
  ["Standard Chartered", "Internship Programme 2028", "", "", "New York", "06 Jul 26", "", "CV"],
  ["FMI Capital Advisors", "Investment Banking Analyst Internship | Summer 2028", "", "", "", "10 Jul 26", "", "CV"],
  ["M&T Bank", "2028 Corporate Summer Internship Program", "", "", "", "13 Jul 26", "", "CV"],
  ["Prairie Capital Advisors", "Intern - Summer 2028", "", "", "", "14 Jul 26", "", "CV CL"],
  ["CliftonLarsonAllen", "Investment Banking Intern - Summer 2028", "", "", "Seattle", "28 Jul 26"],
  ["BTG Pactual", "Summer Undergrad 2028", "", "", "New York", "03 Aug 26", "", "CV CL WA"],
  ["The McLean Group", "Summer Analyst - Mergers & Acquisitions (2028)", "", "", "McLean", "15 Aug 26", "", "CV"],
  ["Class VI Partners", "2028 Investment Banking Summer Analyst", "", "", "Denver", "17 Aug 26", "", "CV"],
  ["Chartwell Financial Advisory", "2028 Intern Analyst", "", "", "", "20 Aug 26", "", "CV CL"],
  ["Loop Capital", "2028 Summer Intern", "", "", "", "21 Aug 26", "", "CV"],
  ["D.A. Davidson", "Class of 2029 Equity Capital Markets Research Intern", "", "", "New York", "28 Aug 26", "", "CV CL"],
  ["G2 Capital Advisors", "Summer Analyst 2028", "", "", "Boston", "31 Aug 26", "", "CV"],
  ["Eastdil Secured", "2028 Summer Internship", "", "", "", "01 Sep 26", "", "CV CL"],
  ["Paralign Capital Partners", "2028 Investment Banking Summer Analyst", "", "", "Minneapolis", "03 Sep 26", "", "CV CL"],
  ["Jegi Leonis", "2028 Summer Analyst", "", "", "New York", "15 Sep 26", "", "CV CL"],
  ["BTIG", "2028 Summer Internship Program", "", "", "", "", "", "CV CL"],
  ["CMD Global Partners", "Investment Banking Summer Analyst Program 2028", "", "", "", "", "", "CV", "Only available on Handshake"],
  ["Campbell Lutyens", "2028 Summer Analyst", "", "", "New York", "", "", "CV CL"],
  ["GLC Advisors & Co", "Investment Banking Summer Intern", "", "", "Denver", "", "", "CV"],
  ["Jefferies", "Class of 2028: Investment Banking Symposium", "", "", "New York", "", "", "CV", "Early-insight event — strong pipeline into the summer program"],
  ["Marathon Capital", "2028 Investment Banking Summer Analyst Internship", "", "", "", "", "", "CV CL WA"],
  ["Q Advisors", "TMT Investment Banking Summer Analyst 2028", "", "", "Denver", "", "", "CV WA", "Apply via email"],
  ["Shea & Company", "2028 Summer Analyst", "", "", "Boston"],
  ["VantEdge Partners", "2028 Summer Analyst", "", "", "", "", "", "CV CL"],
  ["Wedbush Securities", "Investment Banking Summer Analyst 2028", "", "", "", "", "", "CV WA"],
];

const BUYSIDE: Row[] = [
  ["Point72", "2028 Academy Investment Analyst Summer Internship", "19 Oct 26", "", "4 locations", "20 Nov 25", "", "CV WA"],
  ["Koch", "Summer 2028 Analyst Internship (2 programs)", "16 Oct 26", "", "3 locations", "16 Mar 26", "", "CV"],
  ["Ardian", "Secondaries & Primaries Intern - Summer 2028", "13 Oct 26", "", "2 locations", "06 Feb 26", "", "CV"],
  ["The Riverside Company", "2028 Micro Cap Summer Analyst", "07 Oct 26", "", "3 locations", "01 Sep 25", "", "CV CL"],
  ["Bridgewater Associates", "2028 Investment Associate Intern", "07 Oct 26", "", "New York", "13 Jan 26", "", "CV CL"],
  ["Yale Investments", "2028 Summer Analyst", "07 Oct 26", "30 Nov 26", "New Haven", "", "", "CV WA"],
  ["Citadel", "Summer Internship 2028", "05 Oct 26", "", "New York", "01 Dec 25", "", "CV"],
  ["Ccaventus", "Summer Investment Analyst 2028", "02 Sep 26", "", "2 locations", "", "", "CV CL"],
  ["Morgan Properties", "Acquisitions & Investment Mgmt - 2028 Summer Analyst", "20 Aug 26", "", "Conshohocken", "", "", "CV CL"],
  ["Readystate", "Investment Intern (Summer 2028)", "17 Jul 26", "", "Chicago", "", "", "CV CL"],
  ["Graham Partners", "2027 & 2028 Summer Analyst", "", "", "Newtown Square", "25 Aug 25", "", "CV"],
  ["Harris Associates", "Summer 2028 Equity Research Internship", "", "", "Chicago", "21 Sep 25", "", "CV CL"],
  ["Insight Partners", "2028 Summer Investment Analyst", "", "", "New York", "08 Oct 25", "", "CV"],
  ["Stone Point Capital", "PE Summer Analyst 2028", "", "", "", "15 Nov 25", "", "CV CL"],
  ["Bessemer Venture Partners", "Summer Analyst 2028", "", "", "New York", "01 Dec 25", "", "CV CL"],
  ["Sculptor Capital Management", "Real Estate Intern - Summer 2028", "", "", "New York", "01 Dec 25", "", "CV"],
  ["ATLAS SP Partners", "Summer 2028 ASPire Internship", "", "", "New York", "08 Dec 25", "", "CV CL"],
  ["Roark Capital Group", "2028 Private Equity Summer Analyst", "", "", "Atlanta", "19 Dec 25", "", "CV CL"],
  ["Audax Group", "Summer Analyst, Private Debt Origination (2028)", "", "", "New York", "25 Dec 25", "", "CV"],
  ["Silversmith Capital Partners", "Summer Analyst 2028", "", "", "Boston", "25 Dec 25", "", "CV WA"],
  ["Vista Equity Partners", "2028 Private Equity Summer Analyst", "", "", "Chicago", "25 Dec 25", "", "CV CL"],
  ["Ares Management", "2028 Summer Intern", "", "", "", "02 Jan 26", "", "CV"],
  ["Bain Capital", "2028 Summer Analyst", "", "", "Boston", "02 Jan 26", "", "CV CL"],
  ["Blackstone", "2028 Summer Analyst", "", "", "", "02 Jan 26", "Pymetrics", "CV"],
  ["KKR", "2028 Summer Analyst Program", "", "", "", "02 Jan 26", "", "CV CL"],
  ["LLR Partners", "Summer 2028 Investment Team Analyst", "", "", "Philadelphia", "02 Jan 26", "", "CV"],
  ["Balyasny Asset Management", "Catalyst Equities Associate (Summer 2028 Internship)", "", "", "New York", "05 Jan 26", "", "CV CL"],
  ["PSP Investments", "Intern, Credit Investments", "", "", "New York", "05 Jan 26", "", "CV WA"],
  ["Evergreen Services Group", "2028 Summer Investment Analyst", "", "", "San Francisco", "06 Jan 26", "", "CV CL"],
  ["General Atlantic", "2028 Summer Analyst", "", "", "New York", "06 Jan 26", "", "CV CL"],
  ["Oak Hill Advisors", "2028 Summer Intern", "", "", "New York", "06 Jan 26", "", "CV WA"],
  ["Access Holdings", "Summer 2028 Private Equity Investment Internship", "", "", "Baltimore", "09 Jan 26", "", "CV CL WA"],
  ["D.E. Shaw", "Fundamental Research Analyst Intern - Summer 2028", "", "", "New York", "09 Jan 26", "", "CV"],
  ["Weiss Asset Management", "Fundamental Analyst Internship Summer 2028", "", "", "Boston", "09 Jan 26", "", "CV CL WA"],
  ["Audax Group", "2028 Private Equity Summer Analyst", "", "", "", "14 Jan 26", "", "CV CL"],
  ["Alpine Investors", "Elevation | 2028 Sourcing Summer Analyst", "", "", "Austin", "16 Jan 26", "", "CV CL"],
  ["Battery", "2028 Summer Investment Internship", "", "", "", "20 Jan 26", "", "CV"],
  ["Bracebridge Capital", "2028 Summer Investment Analyst", "", "", "Boston", "23 Jan 26", "", "CV"],
  ["GCM Grosvenor", "2028 PE Investments Summer Intern", "", "", "New York", "05 Feb 26", "", "CV"],
  ["GID", "Summer 2028 Internship and Propeller Program", "", "", "Boston", "05 Feb 26", "", "CV"],
  ["Orion Group", "Private Equity Summer Analyst (2028)", "", "", "New York", "06 Feb 26", "", "CV"],
  ["Capital Southwest", "Summer Analyst (2028) - Investment Team", "", "", "Dallas", "11 Feb 26", "", "CV"],
  ["Apogem Capital", "2028 Private Equity Summer Internship Program", "", "", "Richmond", "13 Feb 26", "", "CV CL"],
  ["Starwood Capital Group", "2028 Summer Analyst", "", "", "", "13 Feb 26", "", "CV CL"],
  ["HarbourVest", "2028 Summer Analyst, Secondary", "", "", "Boston", "18 Feb 26", "", "CV"],
  ["CIFC Asset Management", "Summer Intern 2028", "", "", "Radnor", "24 Feb 26", "", "CV CL"],
  ["Millennium Management", "Millennium Investment Internship 2028", "", "", "New York", "26 Feb 26", "", "CV"],
  ["PSG Equity", "2028 Summer Analyst", "", "", "Boston", "16 Mar 26", "", "CV"],
  ["Lead Edge Capital", "2028 Summer Analyst", "", "", "New York", "30 Mar 26", "", "CV WA", "Only available on Handshake"],
  ["Kline Hill Partners", "Summer 2028 Investment Team Intern", "", "", "Greenwich", "09 Apr 26", "", "CV CL"],
  ["Apollo Global Management", "2028 Summer Analyst, Credit Trading", "", "", "New York", "24 Apr 26", "", "CV WA"],
  ["Brio Real Estate", "Real Estate Credit Intern – Summer 2028", "", "", "", "24 Apr 26", "", "CV"],
  ["General Atlantic", "Summer Analyst, Class of 2029, Financial Services", "", "", "New York", "24 Apr 26", "", "CV CL WA"],
  ["D.E. Shaw", "Cove Private Equity Intern – Summer 2028", "", "", "New York", "26 Apr 26", "", "CV"],
  ["Capula Investment Management", "Trading and Research Summer Internship 2028", "", "", "New York", "30 Apr 26", "", "CV"],
  ["StepStone Group", "2028 Private Equity Summer Analyst", "", "", "New York", "01 May 26", "", "CV"],
  ["University Partners", "Analyst, Investments & Asset Management Intern - Summer 2028", "", "", "Dallas", "01 May 26", "", "CV"],
  ["AQR Capital Management", "2028 Summer Analyst", "", "", "Greenwich", "15 May 26", "", "CV CL WA"],
  ["Waterfall Asset Management", "2028 Summer Analyst", "", "", "New York", "18 May 26", "", "CV"],
  ["Walleye Capital", "2028 Summer Intern", "", "", "", "01 Jun 26", "", "CV"],
  ["GIC", "GIC Internship Programme 2028", "", "", "New York", "11 Jun 26", "", "CV"],
  ["Long Ridge", "Growth Equity Summer Analyst (2028)", "", "", "New York", "11 Jun 26"],
  ["Level Equity", "2028 Private Equity Summer Analyst", "", "", "New York", "25 Jun 26", "", "WA"],
  ["CF Private Equity", "Summer Intern 2028 - Buyouts & Growth Equity Team", "", "", "", "10 Jul 26", "", "CV"],
  ["DRW", "Venture Capital Analyst Intern", "", "", "Chicago", "13 Jul 26", "", "CV"],
  ["Northwestern Mutual", "Investment Analyst Intern - Private Debt & Equity, Summer 2028", "", "", "Milwaukee", "24 Jul 26", "", "CV"],
  ["Oxford Properties Group", "Intern, Real Estate Investments (Summer 2028)", "", "", "", "26 Jul 26", "", "CV"],
  ["Millennium Management", "2028 Non-Investment Summer Intern", "", "", "New York", "01 Aug 26", "", "CV"],
  ["RDV Corporation", "Investment Analyst Intern, Private Equity - Summer 2028", "", "", "Grand Rapids", "17 Aug 26", "", "CV"],
  ["Verition Fund Management", "2028 Investment Internship", "", "", "", "19 Aug 26", "", "CV CL"],
  ["OTPP", "Intern - Investments (May 2028 - 4 months)", "", "", "Toronto", "21 Aug 26", "", "CV"],
  ["Advantage Capital", "2028 Private Equity Intern", "", "", "Portsmouth", "25 Aug 26"],
  ["Greystar", "2028 Summer Investment Analyst", "", "", "", "25 Aug 26", "", "CV"],
  ["Heritage Holding", "2028 Summer Private Equity Junior Analyst", "", "", "Boston", "25 Aug 26", "", "CV CL"],
  ["OMERS", "Student, Private Equity Analyst (Summer 2028, 4 Months)", "", "", "Toronto", "31 Aug 26", "", "CV"],
  ["Phillips Edison & Company", "Investment Intern (Summer 2028)", "", "", "Cincinnati", "31 Aug 26", "", "CV CL"],
  ["RWE", "Intern, Investment & Valuation, Summer 2028", "", "", "", "31 Aug 26", "", "CV"],
  ["Brevan Howard", "2028 Summer Internship Program", "", "", "New York", "07 Sep 26", "", "CV"],
  ["LV Collective", "Summer 2028 Real Estate Investments Internship", "", "", "Austin", "10 Sep 26", "", "CV"],
  ["Oaktree Capital Management", "2028 Summer Internships: Investment", "", "", "", "10 Sep 26", "", "CV CL"],
  ["Graham Capital Management", "2028 Summer Internship", "", "", "", "15 Sep 26", "", "CV"],
  ["Greystone", "Multifamily Loan Origination Intern - Summer 2028", "", "", "New York", "15 Sep 26", "", "CV"],
  ["Sower Investment Partners", "Investor Relations Intern (Summer 2028)", "", "", "Omaha", "15 Sep 26", "", "CV"],
  ["Freestone Capital Management", "Intern - Summer 2028", "", "", "", "03 Oct 26", "", "CV CL WA"],
  ["424 Capital", "Private Equity Summer Analyst - Deal Team", "", "", "", "21 Oct 26", "", "CV"],
  ["AEW Capital Management", "2028 Summer Internship", "", "", "", "", "", "CV"],
  ["Adams Street Partners", "Intern (Summer 2028)", "", "", "", "", "", "CV"],
  ["AgWest Farm Credit", "2028 Summer Internship Program", "", "", "Spokane", "", "", "CV CL"],
  ["Blue Owl Capital", "2028 Summer Analyst", "", "", "", "", "", "CV CL"],
  ["Brinley Partners", "2028 Summer Analyst, Investment Team", "", "", "New York", "", "", "CV CL WA", "Apply via email"],
  ["Capstone", "Summer 2028 Internship", "", "", "", "", "", "CV"],
  ["Ethical Capital Partners", "Investment Intern", "", "", "", "", "", "CV CL", "Apply by emailing a CV and cover letter (see firm website)"],
  ["GTCR", "2028 Private Equity Summer Analyst", "", "", "Chicago", "", "", "CV CL"],
  ["JMI Equity", "2028 Summer Analyst", "", "", "", "", "", "CV CL"],
  ["K1 Investment Management", "Intern (Summer 2028)", "", "", "Manhattan Beach", "", "", "CV CL"],
  ["M31 Capital", "M31 Academy 2028 Summer Internship"],
  ["Neuberger Berman", "Summer Research Analyst Intern (Summer 2028)", "", "", "Chicago", "", "", "CV WA"],
  ["Nonantum Capital Partners", "Private Equity Intern - Summer 2028", "", "", "Boston", "", "", "CV CL WA"],
  ["Sands Capital", "Equity Research Intern (Summer 2028)", "", "", "Arlington", "", "", "CV"],
  ["Stellex", "2028 Summer Analyst Internship", "", "", "", "", "", "CV"],
  ["Summit Partners", "Summer Internship (2028): Investment Team", "", "", "", "", "", "CV CL"],
  ["Susquehanna Growth Equity", "Growth Equity Investment Analyst Internship: Summer 2028", "", "", "Philadelphia", "", "", "CV"],
  ["Temasek", "2028 Associate Internship Programme", "", "", "", "", "", "CV CL"],
  ["The Carlyle Group", "2028 Global Investor Relations Sales Intern", "", "", "", "", "", "CV CL"],
];

export const PROGRAMS_2028: Program[] = [
  ...rows("Bulge Bracket", BULGE),
  ...rows("Elite Boutique", ELITE),
  ...rows("Middle Market", MIDDLE),
  ...rows("Buy-Side", BUYSIDE),
];

export type ProgramWindow = "open" | "closed" | "expected-soon" | "not-yet-open";

/** Where a program stands relative to `today` (ISO yyyy-mm-dd). */
export function programWindow(p: Program, today: string): ProgramWindow {
  if (p.closes && p.closes < today) return "closed";
  if (p.opens && p.opens <= today) return "open";
  if (p.lastYearOpen) {
    // Same month/day one year later = expected opening this cycle.
    const expected = expectedOpen(p);
    if (expected) {
      const days = (Date.parse(expected) - Date.parse(today)) / 86_400_000;
      if (days <= 30) return "expected-soon";
    }
  }
  return "not-yet-open";
}

/** Last year's opening date rolled forward one year (the best guess for this cycle). */
export function expectedOpen(p: Program): string | null {
  if (p.opens || !p.lastYearOpen) return null;
  const [y, m, day] = p.lastYearOpen.split("-");
  return `${Number(y) + 1}-${m}-${day}`;
}
