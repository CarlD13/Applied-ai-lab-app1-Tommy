/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Package,
  Globe,
  Upload,
  Download,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Bug,
} from 'lucide-react';
import { SalesOrder } from './types';
import { generateSampleSalesData, exportOrdersToCsv } from './utils/csvParser';
import { calculateRegionQuarterMatrix, analyzeQ2ToQ3Shift, formatCurrency, formatPercent } from './utils/analytics';
import { auditSalesOrders, injectSampleHumanErrors, AuditReport } from './utils/errorAuditor';
import { Navbar } from './components/Navbar';
import { UploadModal } from './components/UploadModal';
import { AiSummaryCard } from './components/AiSummaryCard';
import { RevenueChart } from './components/RevenueChart';
import { RevenueTable } from './components/RevenueTable';
import { OrdersExplorer } from './components/OrdersExplorer';
import { ErrorAuditModal } from './components/ErrorAuditModal';

export default function App() {
  // Initialize with rich sample dataset
  const [orders, setOrders] = useState<SalesOrder[]>(() => generateSampleSalesData());
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  // Run Human Error Audit on active orders
  const auditReport: AuditReport = useMemo(() => {
    return auditSalesOrders(orders);
  }, [orders]);

  // Compute total revenue matrix by region and quarter
  const matrix = useMemo(() => {
    return calculateRegionQuarterMatrix(orders);
  }, [orders]);

  // Compute Q2 -> Q3 Shift analytics and drivers
  const shiftResult = useMemo(() => {
    return analyzeQ2ToQ3Shift(orders);
  }, [orders]);

  // Overall KPIs
  const totalRevenue = matrix.grandTotal;
  const totalUnits = useMemo(() => orders.reduce((sum, o) => sum + o.units, 0), [orders]);

  // Handle Load Sample
  const handleLoadSample = () => {
    setIsLoadingSample(true);
    setTimeout(() => {
      const sample = generateSampleSalesData();
      setOrders(sample);
      setIsLoadingSample(false);
      showNotification('Loaded sample enterprise sales dataset with 4 quarters and 4 regions.');
    }, 200);
  };

  // Handle Download Sample CSV Template
  const handleDownloadSample = () => {
    const csvContent = exportOrdersToCsv(orders);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sales_orders_dataset.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Downloaded CSV with required columns: quarter, region, channel, product, units, discount_pct, revenue.');
  };

  // Handle Custom CSV Upload
  const handleUploadSuccess = (newOrders: SalesOrder[]) => {
    setOrders(newOrders);
    const audit = auditSalesOrders(newOrders);
    if (audit.totalIssues > 0) {
      showNotification(`Imported ${newOrders.length.toLocaleString()} orders. Auditor detected ${audit.totalIssues} possible human errors.`);
    } else {
      showNotification(`Successfully imported ${newOrders.length.toLocaleString()} clean orders!`);
    }
  };

  // Handle applying fixes from Auditor
  const handleApplyFixes = (updatedOrders: SalesOrder[]) => {
    setOrders(updatedOrders);
    showNotification('Applied fixes to sales orders dataset! Calculations and charts updated.');
  };

  // Handle injecting simulated human errors for testing
  const handleInjectErrors = () => {
    const faulty = injectSampleHumanErrors(orders);
    setOrders(faulty);
    showNotification('Simulated human errors injected (fat-fingers, >100% discount, duplicate row, typos)!');
  };

  const topRegion = shiftResult.topRegionByDollar;

  return (
    <div className="min-h-screen bg-[#1a0407] text-slate-100 flex flex-col font-sans selection:bg-red-500/30 selection:text-red-200">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-900 border border-indigo-500/40 text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        orderCount={orders.length}
        regionCount={matrix.regions.length}
        quarterCount={matrix.quarters.length}
        totalRevenue={totalRevenue}
        errorCount={auditReport.totalIssues}
        criticalErrorCount={auditReport.criticalCount}
        onOpenAudit={() => setIsAuditOpen(true)}
        onLoadSample={handleLoadSample}
        onDownloadSample={handleDownloadSample}
        onOpenUpload={() => setIsUploadOpen(true)}
        isLoading={isLoadingSample}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Human Error Quick Alert Banner if issues detected */}
        {auditReport.totalIssues > 0 && (
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border border-amber-500/40 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    {auditReport.totalIssues} Potential Human Data Entry {auditReport.totalIssues === 1 ? 'Error' : 'Errors'} Detected
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Health: {auditReport.healthScore}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Identified {auditReport.criticalCount} critical issues (e.g. fat-finger prices, invalid discounts) and {auditReport.warningCount} warnings (duplicates, spelling typos).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setIsAuditOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/20 transition active:scale-95"
              >
                <span>Review &amp; Fix Errors</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Executive KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>Total Gross Revenue</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-white font-mono tracking-tight">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Aggregated across {matrix.quarters.length} quarters &amp; {matrix.regions.length} regions
            </div>
          </div>

          {/* Total Units */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>Total Units Sold</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-white font-mono tracking-tight">
              {totalUnits.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Volume across {orders.length.toLocaleString()} total order records
            </div>
          </div>

          {/* Active Geographies */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>Active Territories</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-white font-mono tracking-tight">
              {matrix.regions.length} Regions
            </div>
            <div className="mt-1 text-xs text-slate-400 truncate">
              {matrix.regions.slice(0, 3).join(', ')}
              {matrix.regions.length > 3 ? ` +${matrix.regions.length - 3} more` : ''}
            </div>
          </div>

          {/* Q2 -> Q3 Top Shift Leader */}
          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold uppercase tracking-wider">
              <span>Top Q2→Q3 Shift</span>
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            {topRegion ? (
              <>
                <div className="mt-3 text-2xl font-extrabold text-white truncate">
                  {topRegion.region}
                </div>
                <div className="mt-1 text-xs text-emerald-400 font-mono font-semibold flex items-center gap-1">
                  <span>
                    {topRegion.dollarDelta >= 0 ? '+' : ''}
                    {formatCurrency(topRegion.dollarDelta)}
                  </span>
                  <span className="text-slate-400 font-normal">
                    ({formatPercent(topRegion.pctDelta)})
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-3 text-xs text-slate-400">
                Requires Q2 and Q3 order records in dataset
              </div>
            )}
          </div>
        </section>

        {/* AI Three-Sentence Executive Summary Section */}
        <section>
          <AiSummaryCard shiftResult={shiftResult} />
        </section>

        {/* Total Revenue by Region and Quarter: Chart and Table */}
        <section className="space-y-8">
          {/* Chart Component */}
          <RevenueChart matrix={matrix} />

          {/* Pivot Table Component */}
          <RevenueTable matrix={matrix} orders={orders} />
        </section>

        {/* Underlying Line-Item Orders Explorer */}
        <section>
          <OrdersExplorer orders={orders} />
        </section>
      </main>

      {/* Human Error Auditor Modal */}
      <ErrorAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        report={auditReport}
        onApplyFixes={handleApplyFixes}
        onInjectErrors={handleInjectErrors}
        orders={orders}
      />

      {/* CSV Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        onDownloadSample={handleDownloadSample}
      />

      {/* Footer */}
      <footer className="border-t border-red-950/80 bg-[#120204] py-6 text-center text-xs text-red-200/60">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Quarterly Sales &amp; Region Revenue Analyzer</span>
          <span className="font-mono">Columns: quarter • region • channel • product • units • discount_pct • revenue</span>
        </div>
      </footer>
    </div>
  );
}
