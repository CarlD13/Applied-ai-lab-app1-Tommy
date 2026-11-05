import { SalesOrder, RegionQuarterMatrix, ShiftAnalysisResult, RegionQ2Q3Shift } from '../types';

export function formatCurrency(val: number, compact = false): string {
  if (compact) {
    if (Math.abs(val) >= 1_000_000_000) {
      return `$${(val / 1_000_000_000).toFixed(2)}B`;
    }
    if (Math.abs(val) >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(val) >= 1_000) {
      return `$${(val / 1_000).toFixed(1)}K`;
    }
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatPercent(val: number): string {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
}

// Compute Region x Quarter matrix
export function calculateRegionQuarterMatrix(orders: SalesOrder[]): RegionQuarterMatrix {
  const regionSet = new Set<string>();
  const quarterSet = new Set<string>();

  orders.forEach((o) => {
    if (o.region) regionSet.add(o.region);
    if (o.quarter) quarterSet.add(o.quarter);
  });

  // Sort quarters in natural order (Q1, Q2, Q3, Q4...)
  const quarterOrder: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
  const sortedQuarters = Array.from(quarterSet).sort((a, b) => {
    const qa = quarterOrder[a.toUpperCase()] || 99;
    const qb = quarterOrder[b.toUpperCase()] || 99;
    if (qa !== qb) return qa - qb;
    return a.localeCompare(b);
  });

  const sortedRegions = Array.from(regionSet).sort((a, b) => a.localeCompare(b));

  const data: Record<string, Record<string, number>> = {};
  const regionTotals: Record<string, number> = {};
  const quarterTotals: Record<string, number> = {};
  let grandTotal = 0;

  sortedRegions.forEach((reg) => {
    data[reg] = {};
    regionTotals[reg] = 0;
    sortedQuarters.forEach((q) => {
      data[reg][q] = 0;
    });
  });

  sortedQuarters.forEach((q) => {
    quarterTotals[q] = 0;
  });

  orders.forEach((o) => {
    if (data[o.region] && data[o.region][o.quarter] !== undefined) {
      data[o.region][o.quarter] += o.revenue;
      regionTotals[o.region] += o.revenue;
      quarterTotals[o.quarter] += o.revenue;
      grandTotal += o.revenue;
    }
  });

  return {
    regions: sortedRegions,
    quarters: sortedQuarters,
    data,
    regionTotals,
    quarterTotals,
    grandTotal,
  };
}

// Analyze Q2 to Q3 changes in depth
export function analyzeQ2ToQ3Shift(orders: SalesOrder[]): ShiftAnalysisResult {
  const quartersInOrders = new Set(orders.map((o) => o.quarter.toUpperCase()));
  const hasQ2 = quartersInOrders.has('Q2');
  const hasQ3 = quartersInOrders.has('Q3');

  if (!hasQ2 || !hasQ3) {
    return {
      hasQ2AndQ3: false,
      message: `Data must contain both Q2 and Q3 quarters to analyze the Q2 to Q3 shift. (Detected: ${Array.from(quartersInOrders).join(', ') || 'None'})`,
      topRegionByDollar: null,
      topRegionByPct: null,
      allRegionsRanked: [],
      overallQ2Revenue: 0,
      overallQ3Revenue: 0,
      overallDelta: 0,
    };
  }

  // Group by region
  const regionMap = new Map<string, SalesOrder[]>();
  orders.forEach((o) => {
    if (!regionMap.has(o.region)) {
      regionMap.set(o.region, []);
    }
    regionMap.get(o.region)!.push(o);
  });

  let overallQ2Revenue = 0;
  let overallQ3Revenue = 0;

  const shifts: RegionQ2Q3Shift[] = [];

  regionMap.forEach((regOrders, region) => {
    const q2Orders = regOrders.filter((o) => o.quarter.toUpperCase() === 'Q2');
    const q3Orders = regOrders.filter((o) => o.quarter.toUpperCase() === 'Q3');

    const q2Revenue = q2Orders.reduce((sum, o) => sum + o.revenue, 0);
    const q3Revenue = q3Orders.reduce((sum, o) => sum + o.revenue, 0);
    const dollarDelta = q3Revenue - q2Revenue;
    const absDollarDelta = Math.abs(dollarDelta);
    const pctDelta = q2Revenue > 0 ? ((q3Revenue - q2Revenue) / q2Revenue) * 100 : 0;

    overallQ2Revenue += q2Revenue;
    overallQ3Revenue += q3Revenue;

    const q2Units = q2Orders.reduce((sum, o) => sum + o.units, 0);
    const q3Units = q3Orders.reduce((sum, o) => sum + o.units, 0);
    const unitsDelta = q3Units - q2Units;

    // Average discount % (weighted by units if units > 0, else simple average)
    const q2DiscountWeight = q2Orders.reduce((sum, o) => sum + o.discount_pct * o.units, 0);
    const q2AvgDiscount = q2Units > 0 ? q2DiscountWeight / q2Units : 0;

    const q3DiscountWeight = q3Orders.reduce((sum, o) => sum + o.discount_pct * o.units, 0);
    const q3AvgDiscount = q3Units > 0 ? q3DiscountWeight / q3Units : 0;

    // Product breakdown
    const productMap = new Map<string, { q2Rev: number; q3Rev: number; q2Units: number; q3Units: number }>();
    q2Orders.forEach((o) => {
      const p = productMap.get(o.product) || { q2Rev: 0, q3Rev: 0, q2Units: 0, q3Units: 0 };
      p.q2Rev += o.revenue;
      p.q2Units += o.units;
      productMap.set(o.product, p);
    });
    q3Orders.forEach((o) => {
      const p = productMap.get(o.product) || { q2Rev: 0, q3Rev: 0, q2Units: 0, q3Units: 0 };
      p.q3Rev += o.revenue;
      p.q3Units += o.units;
      productMap.set(o.product, p);
    });

    const productDrivers = Array.from(productMap.entries())
      .map(([product, d]) => ({
        product,
        q2Revenue: d.q2Rev,
        q3Revenue: d.q3Rev,
        delta: d.q3Rev - d.q2Rev,
        absDelta: Math.abs(d.q3Rev - d.q2Rev),
        q2Units: d.q2Units,
        q3Units: d.q3Units,
      }))
      .sort((a, b) => b.absDelta - a.absDelta);

    // Channel breakdown
    const channelMap = new Map<string, { q2Rev: number; q3Rev: number }>();
    q2Orders.forEach((o) => {
      const c = channelMap.get(o.channel) || { q2Rev: 0, q3Rev: 0 };
      c.q2Rev += o.revenue;
      channelMap.set(o.channel, c);
    });
    q3Orders.forEach((o) => {
      const c = channelMap.get(o.channel) || { q2Rev: 0, q3Rev: 0 };
      c.q3Rev += o.revenue;
      channelMap.set(o.channel, c);
    });

    const channelDrivers = Array.from(channelMap.entries())
      .map(([channel, d]) => ({
        channel,
        q2Revenue: d.q2Rev,
        q3Revenue: d.q3Rev,
        delta: d.q3Rev - d.q2Rev,
        absDelta: Math.abs(d.q3Rev - d.q2Rev),
      }))
      .sort((a, b) => b.absDelta - a.absDelta);

    shifts.push({
      region,
      q2Revenue,
      q3Revenue,
      dollarDelta,
      absDollarDelta,
      pctDelta,
      q2Units,
      q3Units,
      unitsDelta,
      q2AvgDiscount,
      q3AvgDiscount,
      rankByAbsoluteChange: 0,
      productDrivers,
      channelDrivers,
    });
  });

  // Rank by absolute dollar change
  shifts.sort((a, b) => b.absDollarDelta - a.absDollarDelta);
  shifts.forEach((s, idx) => {
    s.rankByAbsoluteChange = idx + 1;
  });

  const topRegionByDollar = shifts.length > 0 ? shifts[0] : null;

  // Rank by absolute percentage change
  const shiftsByPct = [...shifts].sort((a, b) => Math.abs(b.pctDelta) - Math.abs(a.pctDelta));
  const topRegionByPct = shiftsByPct.length > 0 ? shiftsByPct[0] : null;

  return {
    hasQ2AndQ3: true,
    topRegionByDollar,
    topRegionByPct,
    allRegionsRanked: shifts,
    overallQ2Revenue,
    overallQ3Revenue,
    overallDelta: overallQ3Revenue - overallQ2Revenue,
  };
}
