import "server-only";
import type { Walkthrough } from "@/lib/walkthroughs";
import w0 from "../../content/walkthroughs/PEB_00_TVM_IRR_MOIC.walkthrough.json";
import w1 from "../../content/walkthroughs/PEB_01_Accounting_3Statement_Linking.walkthrough.json";
import w2 from "../../content/walkthroughs/PEB_02_EV_Equity_Bridge.walkthrough.json";
import w3 from "../../content/walkthroughs/PEB_03_CAPM_Beta_WACC.walkthrough.json";
import w4 from "../../content/walkthroughs/PEB_04_DCF.walkthrough.json";
import w5 from "../../content/walkthroughs/PEB_05_Comps_Precedents_FootballField.walkthrough.json";
import w6 from "../../content/walkthroughs/PEB_06_Merger_Model.walkthrough.json";
import w7 from "../../content/walkthroughs/PEB_07_LBO.walkthrough.json";
import w8 from "../../content/walkthroughs/PEB_08_Working_Capital.walkthrough.json";
import w9 from "../../content/walkthroughs/PEB_09_Deferred_Taxes_NOLs.walkthrough.json";
import w10 from "../../content/walkthroughs/PEB_10_Sum_of_the_Parts.walkthrough.json";
import w11 from "../../content/walkthroughs/PEB_11_Credit_Analysis_Recovery.walkthrough.json";
import w12 from "../../content/walkthroughs/PEB_12_Bank_Valuation.walkthrough.json";
import w13 from "../../content/walkthroughs/PEB_13_REIT_Valuation.walkthrough.json";
import w14 from "../../content/walkthroughs/PEB_14_SaaS_Metrics.walkthrough.json";

/** Guided-mode walkthroughs, bundled at build time (content/walkthroughs). */
const ALL = [w0, w1, w2, w3, w4, w5, w6, w7, w8, w9, w10, w11, w12, w13, w14] as unknown as Walkthrough[];
export const WALKTHROUGHS: Record<string, Walkthrough> = Object.fromEntries(ALL.map((w) => [w.workbookKey, w]));
export const getWalkthrough = (key: string): Walkthrough | null => WALKTHROUGHS[key] ?? null;
