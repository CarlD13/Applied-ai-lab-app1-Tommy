export interface SalesOrder {
  id: string;
  quarter: string; // e.g. "Q1", "Q2", "Q3", "Q4"
  region: string;  // e.g. "North America", "Europe"
  channel: string; // e.g. "Direct", "Partner", "Online"
  product: string; // e.g. "Cloud Suite", "Copilot"
  units: number;
  discount_pct: number; // e.g. 15 for 15%
  revenue: number;
}

export interface RegionQuarterMatrix {
  regions: string[];
  quarters: string[];
  // map: region -> { [quarter]: revenue }
  data: Record<string, Record<string, number>>;
  // totals
  regionTotals: Record<string, number>;
  quarterTotals: Record<string, number>;
  grandTotal: number;
}

export interface RegionQ2Q3Shift {
  region: string;
  q2Revenue: number;
  q3Revenue: number;
  dollarDelta: number; // q3 - q2
  absDollarDelta: number; // |q3 - q2|
  pctDelta: number; // ((q3 - q2) / q2) * 100
  q2Units: number;
  q3Units: number;
  unitsDelta: number;
  q2AvgDiscount: number;
  q3AvgDiscount: number;
  rankByAbsoluteChange: number;
  // Product driver calculations
  productDrivers: {
    product: string;
    q2Revenue: number;
    q3Revenue: number;
    delta: number;
    absDelta: number;
    q2Units: number;
    q3Units: number;
  }[];
  // Channel driver calculations
  channelDrivers: {
    channel: string;
    q2Revenue: number;
    q3Revenue: number;
    delta: number;
    absDelta: number;
  }[];
}

export interface ShiftAnalysisResult {
  hasQ2AndQ3: boolean;
  message?: string;
  topRegionByDollar: RegionQ2Q3Shift | null;
  topRegionByPct: RegionQ2Q3Shift | null;
  allRegionsRanked: RegionQ2Q3Shift[];
  overallQ2Revenue: number;
  overallQ3Revenue: number;
  overallDelta: number;
}

export interface AiSummaryResponse {
  summary: string;
  source: string;
  error?: string;
}
