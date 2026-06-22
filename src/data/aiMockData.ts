export interface AIScenarioKPIs {
  cost: string;
  cpu: string;
  days: string;
  sla: string;
  util: string;
}

export interface AIScenario {
  name: string;
  sub: string;
  kpis: AIScenarioKPIs;
  slaColor: string;
  utilColor: string;
  daysColor: string;
  totalCost: number;
  baselineCost: number;
  suppressedDC: string | null;
  activeDCs: string[];
  lanesDisplaced: number;
  costPenalty: number;
  rvaUtil?: number;
  elwoodUtil?: number;
  laxUtil?: number;
  rvaFlag?: boolean;
  avgDaysIncrease?: number;
  topLTL?: {
    dc: string;
    spend: number;
    vs: string;
    vsDelta: number;
  };
}

export interface SuppressionItem {
  dc: string;
  lanes: number;
  penalty: number;
  absorb: string;
  backup: string;
  utilImpact: string;
  flag: boolean;
  color: string;
}

export interface ZipFootprintItem {
  zip: string;
  ch: string;
  rva: number;
  dal: number;
  save: number;
}

export interface ExposedLaneItem {
  zip: string;
  ch: string;
  inbound: number;
  total: number;
  pct: number;
}

export const SCENARIOS: Record<string, AIScenario> = {
  tactical_dallas: {
    name: "Tactical Pro Forma",
    sub: "US · Core · Prepaid · Fixed Footprint · 80% Util Cap · All DCs active",
    kpis: { cost: "$36.1M", cpu: "$6.85", days: "1.69d", sla: "0.0%", util: "66.8%" },
    slaColor: "green", utilColor: "green", daysColor: "green",
    totalCost: 36100000,
    baselineCost: 97500000,
    suppressedDC: null,
    activeDCs: ["Dallas", "Elwood", "Los Angeles", "R Virginia", "Pharr TX", "Stratford CT"],
    lanesDisplaced: 0,
    costPenalty: 0,
    rvaUtil: 66.8,
    elwoodUtil: 62.1,
    laxUtil: 58.4,
    rvaFlag: false,
    avgDaysIncrease: 0,
    topLTL: { dc: "Elwood", spend: 9600000, vs: "Dallas", vsDelta: 6500000 },
  },
  baseline: {
    name: "US Baseline",
    sub: "US · Core · All Terms · All DCs Active · Reference Scenario",
    kpis: { cost: "$97.5M", cpu: "$4,912", days: "1.69d", sla: "0.0%", util: "66.8%" },
    slaColor: "green", utilColor: "green", daysColor: "green",
    totalCost: 97500000,
    baselineCost: 97500000,
    suppressedDC: null,
    activeDCs: ["Dallas", "Elwood", "Los Angeles", "R Virginia"],
    lanesDisplaced: 0,
    costPenalty: 0,
    rvaUtil: 66.8,
    elwoodUtil: 62.1,
    laxUtil: 58.4,
    rvaFlag: false,
  },
  strategic: {
    name: "Strategic Pro Forma",
    sub: "US · Core · Prepaid · Unconstrained Footprint · All 4 DCs Active",
    kpis: { cost: "$51.5M", cpu: "$8.39", days: "5.29d", sla: "46.0%", util: "46564%" },
    slaColor: "red", utilColor: "red", daysColor: "amber",
    totalCost: 51500000,
    baselineCost: 97500000,
    suppressedDC: null,
    activeDCs: ["Dallas", "Elwood", "Los Angeles", "R Virginia"],
    lanesDisplaced: 0,
    costPenalty: 0,
  },
  consolidation: {
    name: "Consolidation Tactical",
    sub: "US · Core+BCV · Prepaid · Fixed Footprint · 6 DCs (Pharr TX + Stratford CT active)",
    kpis: { cost: "$8.8M", cpu: "$11.39", days: "3.15d", sla: "5.24%", util: "277%" },
    slaColor: "amber", utilColor: "red", daysColor: "amber",
    totalCost: 8800000,
    baselineCost: 97500000,
    suppressedDC: "Pharr TX",
    activeDCs: ["Dallas", "Elwood", "Los Angeles", "R Virginia", "Stratford CT"],
    lanesDisplaced: 0,
    costPenalty: 0,
  },
};

export const SUPPRESSION_DATA: SuppressionItem[] = [
  { dc: "Dallas",      lanes: 1492, penalty: 5100000, absorb: "R Virginia (most)", backup: "Elwood",      utilImpact: "+25.6%", flag: true,  color: "#EF4444" },
  { dc: "Elwood",      lanes: 84,   penalty: 400000,  absorb: "Dallas (most)",     backup: "R Virginia",  utilImpact: "+3.2%",  flag: false, color: "#F59E0B" },
  { dc: "R Virginia",  lanes: 135,  penalty: 600000,  absorb: "Dallas (most)",     backup: "Elwood",      utilImpact: "+4.8%",  flag: false, color: "#F59E0B" },
  { dc: "Los Angeles", lanes: 83,   penalty: 300000,  absorb: "Dallas (most)",     backup: "R Virginia",  utilImpact: "+2.9%",  flag: false, color: "#10B981" },
];

export const ZIP_DATA: ZipFootprintItem[] = [
  { zip: "945", ch: "D2C", rva: 3682, dal: 1990, save: 1692 },
  { zip: "606", ch: "D2C", rva: 2385, dal: 1626, save: 759 },
  { zip: "481", ch: "D2C", rva: 2351, dal: 1602, save: 749 },
  { zip: "112", ch: "D2C", rva: 2222, dal: 1514, save: 708 },
  { zip: "900", ch: "D2C", rva: 2182, dal: 2021, save: 161 },
  { zip: "117", ch: "D2C", rva: 2080, dal: 1926, save: 154 },
  { zip: "921", ch: "D2C", rva: 2054, dal: 1902, save: 152 },
  { zip: "600", ch: "D2C", rva: 2005, dal: 1857, save: 148 },
  { zip: "920", ch: "D2C", rva: 1971, dal: 1825, save: 146 },
  { zip: "770", ch: "D2C", rva: 1929, dal: 1787, save: 142 },
];

export const EXPOSED_LANES: ExposedLaneItem[] = [
  { zip: "171", ch: "B2B", inbound: 748320, total: 801430, pct: 93 },
  { zip: "195", ch: "B2B", inbound: 634810, total: 685200, pct: 93 },
  { zip: "112", ch: "B2B", inbound: 589440, total: 641020, pct: 92 },
  { zip: "070", ch: "B2B", inbound: 512890, total: 563100, pct: 91 },
  { zip: "060", ch: "B2B", inbound: 476220, total: 528800, pct: 90 },
  { zip: "085", ch: "B2B", inbound: 423560, total: 482400, pct: 88 },
  { zip: "100", ch: "B2B", inbound: 398140, total: 459300, pct: 87 },
];
