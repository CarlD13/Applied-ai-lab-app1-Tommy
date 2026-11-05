import Papa from 'papaparse';
import { SalesOrder } from '../types';

export interface ParseResult {
  orders: SalesOrder[];
  errors: string[];
  matchedColumns: {
    quarter: string;
    region: string;
    channel: string;
    product: string;
    units: string;
    discount_pct: string;
    revenue: string;
  } | null;
  totalParsedRows: number;
}

// Flexible column name matching
function findMatchingColumn(headers: string[], candidates: string[]): string | null {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim().replace(/[\s_-]+/g, ''));
  for (const candidate of candidates) {
    const normCand = candidate.toLowerCase().trim().replace(/[\s_-]+/g, '');
    const idx = normalizedHeaders.findIndex((h) => h === normCand || h.includes(normCand));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

// Standardize Quarter label (e.g., "q2", "Q2 2024", "2024-Q2", "quarter 2")
export function normalizeQuarter(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/(?:Q|Quarter\s*|QTR\s*)([1-4])/i);
  if (match) {
    return `Q${match[1]}`;
  }
  const simpleMatch = trimmed.match(/^[1-4]$/);
  if (simpleMatch) {
    return `Q${simpleMatch[0]}`;
  }
  return trimmed.toUpperCase();
}

// Clean number strings (stripping $, commas, spaces)
function cleanNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).replace(/[$€£,\s]/g, '').replace(/%/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseCsvString(csvText: string): ParseResult {
  const result: ParseResult = {
    orders: [],
    errors: [],
    matchedColumns: null,
    totalParsedRows: 0,
  };

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors && parsed.errors.length > 0) {
    const errorMsgs = parsed.errors.slice(0, 5).map((e) => `Row ${e.row || '?'}: ${e.message}`);
    result.errors.push(...errorMsgs);
  }

  const headers = parsed.meta.fields || [];
  if (headers.length === 0) {
    result.errors.push('No header row detected in CSV file.');
    return result;
  }

  // Find column candidates
  const quarterCol = findMatchingColumn(headers, ['quarter', 'qtr', 'period']);
  const regionCol = findMatchingColumn(headers, ['region', 'territory', 'geo', 'area']);
  const channelCol = findMatchingColumn(headers, ['channel', 'sales_channel', 'route', 'segment']);
  const productCol = findMatchingColumn(headers, ['product', 'item', 'offering', 'sku', 'product_name']);
  const unitsCol = findMatchingColumn(headers, ['units', 'quantity', 'qty', 'volume', 'units_sold']);
  const discountCol = findMatchingColumn(headers, ['discount_pct', 'discount', 'discount_rate', 'discount_percentage', 'discount%']);
  const revenueCol = findMatchingColumn(headers, ['revenue', 'sales', 'amount', 'total_revenue', 'net_sales']);

  const missingColumns: string[] = [];
  if (!quarterCol) missingColumns.push('quarter');
  if (!regionCol) missingColumns.push('region');
  if (!channelCol) missingColumns.push('channel');
  if (!productCol) missingColumns.push('product');
  if (!unitsCol) missingColumns.push('units');
  if (!discountCol) missingColumns.push('discount_pct');
  if (!revenueCol) missingColumns.push('revenue');

  if (missingColumns.length > 0) {
    result.errors.push(
      `Missing required column(s): ${missingColumns.join(', ')}. The required columns are: quarter, region, channel, product, units, discount_pct, revenue.`
    );
    return result;
  }

  result.matchedColumns = {
    quarter: quarterCol!,
    region: regionCol!,
    channel: channelCol!,
    product: productCol!,
    units: unitsCol!,
    discount_pct: discountCol!,
    revenue: revenueCol!,
  };

  // Check if discount_pct values are in 0-1 range (e.g. 0.15 = 15%)
  let allDiscountsUnderOne = true;
  const rawRows = parsed.data as Record<string, any>[];

  for (const row of rawRows) {
    const rawDisc = cleanNumber(row[discountCol!]);
    if (rawDisc > 1) {
      allDiscountsUnderOne = false;
      break;
    }
  }

  let orderCount = 0;
  rawRows.forEach((row, index) => {
    const rawQuarter = String(row[quarterCol!] || '').trim();
    const region = String(row[regionCol!] || '').trim();
    const channel = String(row[channelCol!] || '').trim();
    const product = String(row[productCol!] || '').trim();
    const units = cleanNumber(row[unitsCol!]);
    let discountPct = cleanNumber(row[discountCol!]);
    if (allDiscountsUnderOne && discountPct > 0) {
      discountPct = Math.round(discountPct * 1000) / 10;
    }
    const revenue = cleanNumber(row[revenueCol!]);

    if (!rawQuarter && !region && revenue === 0) {
      // blank line
      return;
    }

    const quarter = normalizeQuarter(rawQuarter);

    result.orders.push({
      id: `ord_${index + 1}`,
      quarter: quarter || 'Unknown',
      region: region || 'Unknown',
      channel: channel || 'Direct',
      product: product || 'General',
      units: Math.max(0, Math.round(units)),
      discount_pct: discountPct,
      revenue: Math.max(0, revenue),
    });
    orderCount++;
  });

  result.totalParsedRows = orderCount;

  if (orderCount === 0) {
    result.errors.push('No valid order records found in CSV file.');
  }

  return result;
}

// Generate rich sample data spanning Q1, Q2, Q3, Q4 with an authentic Q2 -> Q3 inflection
export function generateSampleSalesData(): SalesOrder[] {
  const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America'];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const channels = ['Direct Enterprise', 'Partner Reseller', 'Online Self-Serve', 'Channel Retail'];
  const products = ['Cloud Enterprise Platform', 'AI Copilot Suite', 'Data Analytics Cloud', 'Security Edge Pro'];

  // Base configurations and trends per region
  // In our scenario, "North America" has a huge Q2->Q3 expansion (+42% / +$1.85M) due to AI Copilot Suite rollout and Direct Enterprise acceleration.
  // Europe grows moderately (+8%), Asia Pacific shifts (+15%), Latin America contracts slightly (-4%).
  const orders: SalesOrder[] = [];
  let idCounter = 1;

  quarters.forEach((q) => {
    regions.forEach((reg) => {
      products.forEach((prod) => {
        channels.forEach((chan) => {
          // Calculate baseline volume and price
          let baseUnits = 120;
          let unitPrice = 1200;
          let discount = 12.0;

          if (prod === 'Cloud Enterprise Platform') unitPrice = 2400;
          if (prod === 'AI Copilot Suite') unitPrice = 1800;
          if (prod === 'Data Analytics Cloud') unitPrice = 1500;
          if (prod === 'Security Edge Pro') unitPrice = 900;

          // Regional weights
          if (reg === 'North America') {
            baseUnits = Math.round(baseUnits * 2.2);
          } else if (reg === 'Europe') {
            baseUnits = Math.round(baseUnits * 1.6);
          } else if (reg === 'Asia Pacific') {
            baseUnits = Math.round(baseUnits * 1.4);
          } else {
            baseUnits = Math.round(baseUnits * 0.8);
          }

          // Channel weights
          if (chan === 'Direct Enterprise') baseUnits = Math.round(baseUnits * 1.5);
          if (chan === 'Partner Reseller') baseUnits = Math.round(baseUnits * 1.2);

          // Quarter specific dynamics - key inflection in Q3 for North America!
          if (q === 'Q1') {
            baseUnits = Math.round(baseUnits * 0.9);
            discount = 14.5;
          } else if (q === 'Q2') {
            baseUnits = Math.round(baseUnits * 1.0);
            discount = 13.8;
          } else if (q === 'Q3') {
            if (reg === 'North America') {
              // Massive surge in AI Copilot Suite & Direct Enterprise!
              if (prod === 'AI Copilot Suite') {
                baseUnits = Math.round(baseUnits * 2.4);
              } else {
                baseUnits = Math.round(baseUnits * 1.35);
              }
              discount = 8.5; // lower discount due to high demand
            } else if (reg === 'Europe') {
              baseUnits = Math.round(baseUnits * 1.08);
              discount = 12.5;
            } else if (reg === 'Asia Pacific') {
              baseUnits = Math.round(baseUnits * 1.15);
              discount = 11.0;
            } else {
              baseUnits = Math.round(baseUnits * 0.95);
              discount = 16.0;
            }
          } else if (q === 'Q4') {
            baseUnits = Math.round(baseUnits * 1.25);
            discount = 10.5;
          }

          // Small deterministic variation per combination
          const seed = (idCounter * 17) % 23;
          const adjustedUnits = Math.max(10, baseUnits + seed - 11);
          const finalDiscount = Math.max(2, Math.min(30, discount + ((idCounter % 5) - 2)));
          const grossRevenue = adjustedUnits * unitPrice;
          const netRevenue = Math.round(grossRevenue * (1 - finalDiscount / 100));

          orders.push({
            id: `ord_${idCounter++}`,
            quarter: q,
            region: reg,
            channel: chan,
            product: prod,
            units: adjustedUnits,
            discount_pct: finalDiscount,
            revenue: netRevenue,
          });
        });
      });
    });
  });

  return orders;
}

export function exportOrdersToCsv(orders: SalesOrder[]): string {
  return Papa.unparse(
    orders.map((o) => ({
      quarter: o.quarter,
      region: o.region,
      channel: o.channel,
      product: o.product,
      units: o.units,
      discount_pct: o.discount_pct,
      revenue: o.revenue,
    }))
  );
}
