import { SalesOrder } from '../types';

export type ErrorSeverity = 'critical' | 'warning' | 'notice';

export interface HumanErrorIssue {
  id: string;
  orderId: string;
  rowIndex: number;
  field: 'quarter' | 'region' | 'channel' | 'product' | 'units' | 'discount_pct' | 'revenue';
  currentValue: any;
  severity: ErrorSeverity;
  category: 'range' | 'typo' | 'duplicate' | 'outlier' | 'math' | 'formatting';
  title: string;
  message: string;
  suggestedFix?: any;
  fixable: boolean;
}

export interface AuditReport {
  healthScore: number; // 0 to 100
  totalOrders: number;
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  noticeCount: number;
  issues: HumanErrorIssue[];
  duplicateCount: number;
  categoryCounts: Record<string, number>;
}

// Simple Levenshtein distance for near-typo detection
function levenshtein(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[bn][an];
}

export function auditSalesOrders(orders: SalesOrder[]): AuditReport {
  const issues: HumanErrorIssue[] = [];
  let issueId = 1;

  if (orders.length === 0) {
    return {
      healthScore: 100,
      totalOrders: 0,
      totalIssues: 0,
      criticalCount: 0,
      warningCount: 0,
      noticeCount: 0,
      issues: [],
      duplicateCount: 0,
      categoryCounts: {},
    };
  }

  // 1. Calculate price baselines per product to detect 10x or 0.1x fat-finger typos
  const productPrices = new Map<string, number[]>();
  orders.forEach((o) => {
    if (o.units > 0 && o.revenue > 0) {
      // Estimated undiscounted unit price
      const discountMult = Math.max(0.1, 1 - (o.discount_pct || 0) / 100);
      const estUnitPrice = o.revenue / (o.units * discountMult);
      const normProd = o.product.trim().toLowerCase();
      if (!productPrices.has(normProd)) {
        productPrices.set(normProd, []);
      }
      productPrices.get(normProd)!.push(estUnitPrice);
    }
  });

  const productMedianPrice = new Map<string, number>();
  productPrices.forEach((prices, prod) => {
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
    productMedianPrice.set(prod, median);
  });

  // 2. Frequency map to find dominant spelling vs typo spellings
  const regionFreq = new Map<string, number>();
  const productFreq = new Map<string, number>();
  const channelFreq = new Map<string, number>();

  orders.forEach((o) => {
    regionFreq.set(o.region, (regionFreq.get(o.region) || 0) + 1);
    productFreq.set(o.product, (productFreq.get(o.product) || 0) + 1);
    channelFreq.set(o.channel, (channelFreq.get(o.channel) || 0) + 1);
  });

  // 3. Track duplicates
  const rowSignatures = new Map<string, number[]>();

  orders.forEach((o, idx) => {
    const rowNum = idx + 1;
    const sig = `${o.quarter.trim().toUpperCase()}|${o.region.trim().toLowerCase()}|${o.channel.trim().toLowerCase()}|${o.product.trim().toLowerCase()}|${o.units}|${o.discount_pct}|${o.revenue}`;
    if (!rowSignatures.has(sig)) {
      rowSignatures.set(sig, []);
    }
    rowSignatures.get(sig)!.push(rowNum);

    // --- Quarter Checks ---
    const qTrim = o.quarter.trim().toUpperCase();
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(qTrim)) {
      issues.push({
        id: `err_${issueId++}`,
        orderId: o.id,
        rowIndex: rowNum,
        field: 'quarter',
        currentValue: o.quarter,
        severity: 'warning',
        category: 'range',
        title: 'Non-Standard Quarter',
        message: `Quarter value "${o.quarter}" is outside standard fiscal reporting periods (Q1, Q2, Q3, Q4).`,
        suggestedFix: 'Q1',
        fixable: false,
      });
    }

    // --- Discount Checks ---
    if (o.discount_pct < 0) {
      issues.push({
        id: `err_${issueId++}`,
        orderId: o.id,
        rowIndex: rowNum,
        field: 'discount_pct',
        currentValue: o.discount_pct,
        severity: 'critical',
        category: 'range',
        title: 'Negative Discount Percentage',
        message: `Discount is negative (${o.discount_pct}%). Discounts should be >= 0%.`,
        suggestedFix: 0,
        fixable: true,
      });
    } else if (o.discount_pct > 100) {
      // Possible fat finger (e.g. 150 instead of 15)
      const suggested = o.discount_pct > 100 && o.discount_pct <= 999 ? Math.round(o.discount_pct / 10) : 15;
      issues.push({
        id: `err_${issueId++}`,
        orderId: o.id,
        rowIndex: rowNum,
        field: 'discount_pct',
        currentValue: o.discount_pct,
        severity: 'critical',
        category: 'range',
        title: 'Discount Exceeds 100%',
        message: `Discount is ${o.discount_pct}%, which exceeds 100% of price. This is likely a typing mistake.`,
        suggestedFix: suggested,
        fixable: true,
      });
    } else if (o.discount_pct > 65) {
      issues.push({
        id: `err_${issueId++}`,
        orderId: o.id,
        rowIndex: rowNum,
        field: 'discount_pct',
        currentValue: o.discount_pct,
        severity: 'warning',
        category: 'outlier',
        title: 'Unusually High Discount',
        message: `Discount is ${o.discount_pct}%, unusually high for commercial B2B sales. Verify this was approved.`,
        suggestedFix: undefined,
        fixable: false,
      });
    }

    // --- Units Checks ---
    if (o.units < 0) {
      issues.push({
        id: `err_${issueId++}`,
        orderId: o.id,
        rowIndex: rowNum,
        field: 'units',
        currentValue: o.units,
        severity: 'critical',
        category: 'range',
        title: 'Negative Units Sold',
        message: `Units count cannot be negative (${o.units}).`,
        suggestedFix: Math.abs(o.units),
        fixable: true,
      });
    } else if (o.units === 0 && o.revenue > 0) {
      issues.push({
        id: `err_${issueId++}`,
        orderId: o.id,
        rowIndex: rowNum,
        field: 'units',
        currentValue: o.units,
        severity: 'critical',
        category: 'math',
        title: 'Zero Units with Positive Revenue',
        message: `Order generated $${o.revenue.toLocaleString()} revenue but records 0 units sold.`,
        suggestedFix: 1,
        fixable: true,
      });
    }

    // --- Revenue Checks ---
    if (o.revenue < 0) {
      issues.push({
        id: `err_${issueId++}`,
        orderId: o.id,
        rowIndex: rowNum,
        field: 'revenue',
        currentValue: o.revenue,
        severity: 'critical',
        category: 'range',
        title: 'Negative Revenue',
        message: `Revenue is negative ($${o.revenue.toLocaleString()}). Unless this is a credit memo, revenue should be positive.`,
        suggestedFix: Math.abs(o.revenue),
        fixable: true,
      });
    } else if (o.revenue === 0 && o.units > 0) {
      issues.push({
        id: `err_${issueId++}`,
        orderId: o.id,
        rowIndex: rowNum,
        field: 'revenue',
        currentValue: o.revenue,
        severity: 'warning',
        category: 'math',
        title: 'Zero Revenue on Delivered Units',
        message: `Order delivered ${o.units} units but has $0 revenue recorded. Check if discount was 100% or price was omitted.`,
        suggestedFix: undefined,
        fixable: false,
      });
    }

    // --- Fat-Finger Price Check (10x or 0.1x outlier) ---
    const normProd = o.product.trim().toLowerCase();
    const medianPrice = productMedianPrice.get(normProd);
    if (medianPrice && o.units > 0 && o.revenue > 0) {
      const discountMult = Math.max(0.1, 1 - (o.discount_pct || 0) / 100);
      const estUnitPrice = o.revenue / (o.units * discountMult);
      const ratio = estUnitPrice / medianPrice;

      if (ratio >= 6.5) {
        // Likely extra zero typed in revenue or missed zero in units
        const correctedRevenue = Math.round(o.revenue / 10);
        issues.push({
          id: `err_${issueId++}`,
          orderId: o.id,
          rowIndex: rowNum,
          field: 'revenue',
          currentValue: o.revenue,
          severity: 'critical',
          category: 'outlier',
          title: 'Possible Extra Zero in Revenue (Fat-Finger)',
          message: `Implicit unit price is $${Math.round(estUnitPrice).toLocaleString()} vs typical median of $${Math.round(
            medianPrice
          ).toLocaleString()} (${ratio.toFixed(1)}x higher). Revenue may have an accidental extra zero.`,
          suggestedFix: correctedRevenue,
          fixable: true,
        });
      } else if (ratio <= 0.12 && o.discount_pct < 60) {
        issues.push({
          id: `err_${issueId++}`,
          orderId: o.id,
          rowIndex: rowNum,
          field: 'revenue',
          currentValue: o.revenue,
          severity: 'warning',
          category: 'outlier',
          title: 'Suspiciously Low Unit Revenue',
          message: `Implicit unit price is $${Math.round(estUnitPrice).toLocaleString()} vs typical median of $${Math.round(
            medianPrice
          ).toLocaleString()} (${(ratio * 100).toFixed(1)}% of normal).`,
          suggestedFix: undefined,
          fixable: false,
        });
      }
    }

    // --- Formatting & Whitespace Checks ---
    if (o.region !== o.region.trim()) {
      issues.push({
        id: `err_${issueId++}`,
        orderId: o.id,
        rowIndex: rowNum,
        field: 'region',
        currentValue: `"${o.region}"`,
        severity: 'notice',
        category: 'formatting',
        title: 'Trailing/Leading Whitespace in Region',
        message: `Region name contains unnecessary whitespace padding: "${o.region}".`,
        suggestedFix: o.region.trim(),
        fixable: true,
      });
    }

    if (o.product !== o.product.trim()) {
      issues.push({
        id: `err_${issueId++}`,
        orderId: o.id,
        rowIndex: rowNum,
        field: 'product',
        currentValue: `"${o.product}"`,
        severity: 'notice',
        category: 'formatting',
        title: 'Whitespace in Product Name',
        message: `Product name contains whitespace padding: "${o.product}".`,
        suggestedFix: o.product.trim(),
        fixable: true,
      });
    }
  });

  // 4. Near-match Typo checks (e.g. "North Amercia" vs "North America")
  const uniqueRegions = Array.from(regionFreq.keys());
  for (let i = 0; i < uniqueRegions.length; i++) {
    for (let j = i + 1; j < uniqueRegions.length; j++) {
      const r1 = uniqueRegions[i].trim();
      const r2 = uniqueRegions[j].trim();
      const dist = levenshtein(r1.toLowerCase(), r2.toLowerCase());
      if (dist > 0 && dist <= 2 && Math.min(r1.length, r2.length) >= 4) {
        // Find which is dominant
        const freq1 = regionFreq.get(uniqueRegions[i]) || 0;
        const freq2 = regionFreq.get(uniqueRegions[j]) || 0;
        const typoName = freq1 >= freq2 ? uniqueRegions[j] : uniqueRegions[i];
        const correctName = freq1 >= freq2 ? uniqueRegions[i] : uniqueRegions[j];

        // Find affected rows
        orders.forEach((o, idx) => {
          if (o.region === typoName) {
            issues.push({
              id: `err_${issueId++}`,
              orderId: o.id,
              rowIndex: idx + 1,
              field: 'region',
              currentValue: typoName,
              severity: 'warning',
              category: 'typo',
              title: 'Probable Spelling Typo in Region',
              message: `"${typoName}" appears to be a typo for "${correctName}" (${Math.max(
                freq1,
                freq2
              )} occurrences elsewhere).`,
              suggestedFix: correctName,
              fixable: true,
            });
          }
        });
      }
    }
  }

  // 5. Duplicate Row Reporting
  let duplicateCount = 0;
  rowSignatures.forEach((rowIndices) => {
    if (rowIndices.length > 1) {
      duplicateCount += rowIndices.length - 1;
      // Mark 2nd and subsequent rows as duplicate
      for (let i = 1; i < rowIndices.length; i++) {
        const rowNum = rowIndices[i];
        const order = orders[rowNum - 1];
        if (order) {
          issues.push({
            id: `err_${issueId++}`,
            orderId: order.id,
            rowIndex: rowNum,
            field: 'revenue',
            currentValue: `Row ${rowNum}`,
            severity: 'warning',
            category: 'duplicate',
            title: 'Exact Duplicate Sales Order',
            message: `Identical record already exists on Row ${rowIndices[0]} (${order.quarter}, ${order.region}, ${order.product}, ${order.units} units, $${order.revenue.toLocaleString()}).`,
            suggestedFix: 'Remove duplicate',
            fixable: true,
          });
        }
      }
    }
  });

  // Calculate health score: 100 minus weighted penalty
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const noticeCount = issues.filter((i) => i.severity === 'notice').length;

  const penalty = criticalCount * 8 + warningCount * 3 + noticeCount * 1;
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - (penalty / Math.max(10, orders.length)) * 100)));

  const categoryCounts: Record<string, number> = {};
  issues.forEach((iss) => {
    categoryCounts[iss.category] = (categoryCounts[iss.category] || 0) + 1;
  });

  return {
    healthScore,
    totalOrders: orders.length,
    totalIssues: issues.length,
    criticalCount,
    warningCount,
    noticeCount,
    issues,
    duplicateCount,
    categoryCounts,
  };
}

// Helper to inject realistic human typos into the dataset for testing/demo
export function injectSampleHumanErrors(cleanOrders: SalesOrder[]): SalesOrder[] {
  const cloned: SalesOrder[] = JSON.parse(JSON.stringify(cleanOrders));
  if (cloned.length < 10) return cloned;

  // 1. Fat finger typo: add an accidental extra zero to revenue in row 3
  if (cloned[2]) {
    cloned[2].revenue = cloned[2].revenue * 10;
  }

  // 2. Discount exceeding 100% typo (e.g. 150 instead of 15) in row 7
  if (cloned[6]) {
    cloned[6].discount_pct = 150;
  }

  // 3. Typo in region name: "North Amercia" instead of "North America" in row 12
  if (cloned[11]) {
    cloned[11].region = 'North Amercia';
  }

  // 4. Whitespace error: " Europe " in row 18
  if (cloned[17]) {
    cloned[17].region = ' Europe ';
  }

  // 5. Duplicate entry: duplicate row 5 into a new row
  if (cloned[4]) {
    const dup: SalesOrder = {
      ...cloned[4],
      id: `ord_dup_${Date.now()}`,
    };
    cloned.splice(5, 0, dup);
  }

  // 6. Zero units with positive revenue in row 22
  if (cloned[21]) {
    cloned[21].units = 0;
  }

  return cloned;
}

// Auto-fix safe issues across the dataset
export function autoFixHumanErrors(orders: SalesOrder[], issues: HumanErrorIssue[]): SalesOrder[] {
  const fixableMap = new Map<string, HumanErrorIssue>();
  const duplicateRowIndices = new Set<number>();

  issues.forEach((iss) => {
    if (iss.category === 'duplicate') {
      duplicateRowIndices.add(iss.rowIndex - 1);
    } else if (iss.fixable && iss.suggestedFix !== undefined) {
      fixableMap.set(`${iss.orderId}_${iss.field}`, iss);
    }
  });

  const updatedOrders: SalesOrder[] = [];

  orders.forEach((o, idx) => {
    // If it's a duplicate row, skip it
    if (duplicateRowIndices.has(idx)) {
      return;
    }

    const updated = { ...o };

    // Apply fixes
    const regionFix = fixableMap.get(`${o.id}_region`);
    if (regionFix) updated.region = regionFix.suggestedFix;

    const productFix = fixableMap.get(`${o.id}_product`);
    if (productFix) updated.product = productFix.suggestedFix;

    const discountFix = fixableMap.get(`${o.id}_discount_pct`);
    if (discountFix !== undefined) updated.discount_pct = Number(discountFix.suggestedFix);

    const unitsFix = fixableMap.get(`${o.id}_units`);
    if (unitsFix !== undefined) updated.units = Number(unitsFix.suggestedFix);

    const revenueFix = fixableMap.get(`${o.id}_revenue`);
    if (revenueFix !== undefined) updated.revenue = Number(revenueFix.suggestedFix);

    updatedOrders.push(updated);
  });

  return updatedOrders;
}
