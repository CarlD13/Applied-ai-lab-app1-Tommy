import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { SalesOrder } from '../types';
import { formatCurrency } from '../utils/analytics';

interface OrdersExplorerProps {
  orders: SalesOrder[];
}

export const OrdersExplorer: React.FC<OrdersExplorerProps> = ({ orders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const quarters = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.quarter))).sort();
  }, [orders]);

  const regions = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.region))).sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedQuarter !== 'ALL' && o.quarter !== selectedQuarter) return false;
      if (selectedRegion !== 'ALL' && o.region !== selectedRegion) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const match =
          o.product.toLowerCase().includes(query) ||
          o.channel.toLowerCase().includes(query) ||
          o.region.toLowerCase().includes(query) ||
          o.quarter.toLowerCase().includes(query);
        if (!match) return false;
      }
      return true;
    });
  }, [orders, selectedQuarter, selectedRegion, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const pageOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const filteredRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.revenue, 0);
  }, [filteredOrders]);

  const filteredUnits = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.units, 0);
  }, [filteredOrders]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      {/* Header and Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Underlying Order Records Explorer
            </h3>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              {filteredOrders.length.toLocaleString()} matching
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Filter and verify line-item revenue, units, and discount rates across regions
          </p>
        </div>

        {/* Filter inputs */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search product, channel..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Quarter filter */}
          <select
            value={selectedQuarter}
            onChange={(e) => {
              setSelectedQuarter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Quarters</option>
            {quarters.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>

          {/* Region filter */}
          <select
            value={selectedRegion}
            onChange={(e) => {
              setSelectedRegion(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtered aggregates quick strip */}
      <div className="py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono border-b border-slate-800/60">
        <div>
          Filtered Total Revenue: <strong className="text-emerald-400">{formatCurrency(filteredRevenue)}</strong>
        </div>
        <div>
          Filtered Total Units: <strong className="text-slate-200">{filteredUnits.toLocaleString()}</strong>
        </div>
      </div>

      {/* Orders Table */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Order ID</th>
              <th className="py-2.5 px-3">Quarter</th>
              <th className="py-2.5 px-3">Region</th>
              <th className="py-2.5 px-3">Channel</th>
              <th className="py-2.5 px-3">Product</th>
              <th className="py-2.5 px-3 text-right">Units</th>
              <th className="py-2.5 px-3 text-right">Discount</th>
              <th className="py-2.5 px-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {pageOrders.length > 0 ? (
              pageOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-800/40 text-slate-300">
                  <td className="py-2 px-3 text-slate-500 text-[11px]">{o.id}</td>
                  <td className="py-2 px-3 font-semibold text-indigo-300">{o.quarter}</td>
                  <td className="py-2 px-3 font-sans text-white">{o.region}</td>
                  <td className="py-2 px-3 text-slate-400">{o.channel}</td>
                  <td className="py-2 px-3 font-sans text-slate-200">{o.product}</td>
                  <td className="py-2 px-3 text-right">{o.units.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-slate-400">{o.discount_pct}%</td>
                  <td className="py-2 px-3 text-right font-semibold text-emerald-400">
                    {formatCurrency(o.revenue)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No orders match your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing page <span className="font-semibold text-white">{currentPage}</span> of{' '}
          <span className="font-semibold text-white">{totalPages}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
