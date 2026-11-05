import React, { useState } from 'react';
import {
  Table,
  ChevronDown,
  ChevronUp,
  Download,
  ArrowUpDown,
  Sparkles,
  Package,
  Layers,
} from 'lucide-react';
import Papa from 'papaparse';
import { RegionQuarterMatrix, SalesOrder } from '../types';
import { formatCurrency, formatPercent } from '../utils/analytics';

interface RevenueTableProps {
  matrix: RegionQuarterMatrix;
  orders: SalesOrder[];
}

type SortField = 'region' | 'total' | 'q2q3Delta' | string;
type SortOrder = 'asc' | 'desc';

export const RevenueTable: React.FC<RevenueTableProps> = ({ matrix, orders }) => {
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  const { regions, quarters, data, regionTotals, quarterTotals, grandTotal } = matrix;

  const hasQ2 = quarters.includes('Q2');
  const hasQ3 = quarters.includes('Q3');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Prepare table rows with Q2->Q3 delta calculations
  const tableRows = regions.map((region) => {
    const q2Val = data[region]?.['Q2'] || 0;
    const q3Val = data[region]?.['Q3'] || 0;
    const q2q3Delta = q3Val - q2Val;
    const q2q3Pct = q2Val > 0 ? ((q3Val - q2Val) / q2Val) * 100 : 0;
    const total = regionTotals[region] || 0;

    return {
      region,
      quarters: data[region] || {},
      q2Val,
      q3Val,
      q2q3Delta,
      q2q3Pct,
      total,
    };
  });

  // Sort rows
  tableRows.sort((a, b) => {
    let comp = 0;
    if (sortField === 'region') {
      comp = a.region.localeCompare(b.region);
    } else if (sortField === 'total') {
      comp = a.total - b.total;
    } else if (sortField === 'q2q3Delta') {
      comp = a.q2q3Delta - b.q2q3Delta;
    } else {
      // Specific quarter
      const qA = a.quarters[sortField] || 0;
      const qB = b.quarters[sortField] || 0;
      comp = qA - qB;
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  // Grand totals Q2->Q3
  const overallQ2 = quarterTotals['Q2'] || 0;
  const overallQ3 = quarterTotals['Q3'] || 0;
  const overallQ2Q3Delta = overallQ3 - overallQ2;
  const overallQ2Q3Pct = overallQ2 > 0 ? (overallQ2Q3Delta / overallQ2) * 100 : 0;

  // Export pivot table as CSV
  const handleExportPivotCsv = () => {
    const exportData = tableRows.map((r) => {
      const row: Record<string, any> = { Region: r.region };
      quarters.forEach((q) => {
        row[q] = r.quarters[q] || 0;
      });
      if (hasQ2 && hasQ3) {
        row['Q2_to_Q3_Delta_$'] = r.q2q3Delta;
        row['Q2_to_Q3_Change_%'] = r.q2q3Pct.toFixed(2);
      }
      row['Total_Revenue'] = r.total;
      return row;
    });

    // Add total row
    const totalRow: Record<string, any> = { Region: 'Grand Total' };
    quarters.forEach((q) => {
      totalRow[q] = quarterTotals[q] || 0;
    });
    if (hasQ2 && hasQ3) {
      totalRow['Q2_to_Q3_Delta_$'] = overallQ2Q3Delta;
      totalRow['Q2_to_Q3_Change_%'] = overallQ2Q3Pct.toFixed(2);
    }
    totalRow['Total_Revenue'] = grandTotal;
    exportData.push(totalRow);

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sales_revenue_by_region_and_quarter.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get drill-down data for expanded region
  const getRegionDrilldown = (region: string) => {
    const regionOrders = orders.filter((o) => o.region === region);
    const productAgg: Record<string, number> = {};
    const channelAgg: Record<string, number> = {};

    regionOrders.forEach((o) => {
      productAgg[o.product] = (productAgg[o.product] || 0) + o.revenue;
      channelAgg[o.channel] = (channelAgg[o.channel] || 0) + o.revenue;
    });

    const products = Object.entries(productAgg)
      .map(([name, rev]) => ({ name, rev, share: (rev / (regionTotals[region] || 1)) * 100 }))
      .sort((a, b) => b.rev - a.rev);

    const channels = Object.entries(channelAgg)
      .map(([name, rev]) => ({ name, rev, share: (rev / (regionTotals[region] || 1)) * 100 }))
      .sort((a, b) => b.rev - a.rev);

    return { products, channels };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      {/* Table Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Total Revenue Table by Region & Quarter
            </h3>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Pivot Matrix
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Click on any row to expand product and channel drilldowns
          </p>
        </div>

        <button
          onClick={handleExportPivotCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Pivot CSV</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left font-mono text-xs">
          {/* Table Head */}
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
            <tr>
              {/* Region column */}
              <th
                onClick={() => handleSort('region')}
                className="py-3 px-4 font-semibold text-slate-300 cursor-pointer hover:text-white transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Region</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              {/* Quarter columns */}
              {quarters.map((q) => (
                <th
                  key={q}
                  onClick={() => handleSort(q)}
                  className="py-3 px-3 text-right font-semibold text-slate-300 cursor-pointer hover:text-white transition select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{q}</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>
              ))}

              {/* Q2 -> Q3 Delta column */}
              {hasQ2 && hasQ3 && (
                <th
                  onClick={() => handleSort('q2q3Delta')}
                  className="py-3 px-3 text-right font-semibold text-indigo-300 bg-indigo-950/20 border-l border-r border-indigo-900/30 cursor-pointer hover:text-white transition select-none"
                  title="Q3 Revenue minus Q2 Revenue"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Q2 → Q3 Shift ($ / %)</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-indigo-400" />
                  </div>
                </th>
              )}

              {/* Total Revenue column */}
              <th
                onClick={() => handleSort('total')}
                className="py-3 px-4 text-right font-semibold text-slate-200 cursor-pointer hover:text-white transition select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Revenue</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-850">
            {tableRows.map((row) => {
              const isExpanded = expandedRegion === row.region;
              const isPositive = row.q2q3Delta >= 0;

              return (
                <React.Fragment key={row.region}>
                  <tr
                    onClick={() => setExpandedRegion(isExpanded ? null : row.region)}
                    className={`cursor-pointer transition select-none ${
                      isExpanded
                        ? 'bg-slate-800/80 text-white'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    {/* Region name with expand arrow */}
                    <td className="py-3 px-4 font-sans font-semibold text-white flex items-center gap-2">
                      <span className="text-slate-500 hover:text-slate-300 transition">
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <span>{row.region}</span>
                    </td>

                    {/* Quarter revenues */}
                    {quarters.map((q) => {
                      const val = row.quarters[q] || 0;
                      return (
                        <td key={q} className="py-3 px-3 text-right font-mono">
                          {formatCurrency(val)}
                        </td>
                      );
                    })}

                    {/* Q2 -> Q3 Shift highlight */}
                    {hasQ2 && hasQ3 && (
                      <td className="py-3 px-3 text-right font-mono bg-indigo-950/10 border-l border-r border-indigo-900/20">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {formatCurrency(row.q2q3Delta)}
                          <span className="text-[10px] opacity-80">
                            ({formatPercent(row.q2q3Pct)})
                          </span>
                        </span>
                      </td>
                    )}

                    {/* Total revenue */}
                    <td className="py-3 px-4 text-right font-bold text-white font-mono">
                      {formatCurrency(row.total)}
                    </td>
                  </tr>

                  {/* Inline Expanded Drilldown */}
                  {isExpanded && (
                    <tr className="bg-slate-950/90">
                      <td colSpan={quarters.length + (hasQ2 && hasQ3 ? 3 : 2)} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                          {/* Product Distribution */}
                          {(() => {
                            const { products, channels } = getRegionDrilldown(row.region);
                            return (
                              <>
                                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                                  <div className="flex items-center gap-2 font-semibold text-slate-200 mb-2.5">
                                    <Package className="w-4 h-4 text-indigo-400" />
                                    <span>Product Revenue Breakdown for {row.region}</span>
                                  </div>
                                  <div className="space-y-2">
                                    {products.map((p) => (
                                      <div key={p.name} className="space-y-1">
                                        <div className="flex justify-between text-[11px]">
                                          <span className="text-slate-300 font-medium">{p.name}</span>
                                          <span className="font-mono text-slate-200">
                                            {formatCurrency(p.rev)}{' '}
                                            <span className="text-slate-500 font-sans">
                                              ({p.share.toFixed(1)}%)
                                            </span>
                                          </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${p.share}%` }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                                  <div className="flex items-center gap-2 font-semibold text-slate-200 mb-2.5">
                                    <Layers className="w-4 h-4 text-cyan-400" />
                                    <span>Sales Channel Distribution for {row.region}</span>
                                  </div>
                                  <div className="space-y-2">
                                    {channels.map((c) => (
                                      <div key={c.name} className="space-y-1">
                                        <div className="flex justify-between text-[11px]">
                                          <span className="text-slate-300 font-medium">{c.name}</span>
                                          <span className="font-mono text-slate-200">
                                            {formatCurrency(c.rev)}{' '}
                                            <span className="text-slate-500 font-sans">
                                              ({c.share.toFixed(1)}%)
                                            </span>
                                          </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-cyan-500 rounded-full"
                                            style={{ width: `${c.share}%` }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>

          {/* Table Footer: Grand Totals */}
          <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-700 text-white">
            <tr>
              <td className="py-3 px-4 font-sans">Grand Total</td>
              {quarters.map((q) => (
                <td key={q} className="py-3 px-3 text-right font-mono text-slate-200">
                  {formatCurrency(quarterTotals[q] || 0)}
                </td>
              ))}
              {hasQ2 && hasQ3 && (
                <td className="py-3 px-3 text-right font-mono bg-indigo-950/30 border-l border-r border-indigo-900/40">
                  <span
                    className={
                      overallQ2Q3Delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    {overallQ2Q3Delta >= 0 ? '+' : ''}
                    {formatCurrency(overallQ2Q3Delta)} ({formatPercent(overallQ2Q3Pct)})
                  </span>
                </td>
              )}
              <td className="py-3 px-4 text-right font-mono text-indigo-400 text-sm">
                {formatCurrency(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
