import React from 'react';
import { BarChart3, Upload, Download, Sparkles, FileSpreadsheet, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  orderCount: number;
  regionCount: number;
  quarterCount: number;
  totalRevenue: number;
  errorCount: number;
  criticalErrorCount: number;
  onOpenAudit: () => void;
  onLoadSample: () => void;
  onDownloadSample: () => void;
  onOpenUpload: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  orderCount,
  regionCount,
  quarterCount,
  totalRevenue,
  errorCount,
  criticalErrorCount,
  onOpenAudit,
  onLoadSample,
  onDownloadSample,
  onOpenUpload,
  isLoading,
}) => {
  return (
    <header className="border-b border-red-950/80 bg-[#1e0509]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-tight">
                Quarterly Sales & Region Revenue
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                AI Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Revenue Breakdown, Trend Visualizations & Q2→Q3 Shift Intelligence
            </p>
          </div>
        </div>

        {/* Global Stats & Actions */}
        <div className="flex items-center gap-2.5">
          {orderCount > 0 && (
            <div className="hidden xl:flex items-center gap-3 text-xs text-slate-400 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-lg font-mono">
              <span>
                <strong className="text-slate-200">{orderCount.toLocaleString()}</strong> orders
              </span>
              <span className="text-slate-600">•</span>
              <span>
                <strong className="text-slate-200">{regionCount}</strong> regions
              </span>
              <span className="text-slate-600">•</span>
              <span>
                <strong className="text-slate-200">{quarterCount}</strong> quarters
              </span>
            </div>
          )}

          {/* Human Error Auditor Button */}
          <button
            onClick={onOpenAudit}
            title="Scan dataset for human entry mistakes, fat-finger outliers, and typos"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-sm ${
              errorCount > 0
                ? criticalErrorCount > 0
                  ? 'bg-rose-950/50 text-rose-300 border-rose-600/40 hover:bg-rose-900/60'
                  : 'bg-amber-950/50 text-amber-300 border-amber-600/40 hover:bg-amber-900/60'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-600/40 hover:bg-emerald-900/50'
            }`}
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${errorCount > 0 ? (criticalErrorCount > 0 ? 'text-rose-400 animate-pulse' : 'text-amber-400') : 'text-emerald-400'}`} />
            <span>Check Human Errors</span>
            {errorCount > 0 ? (
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${criticalErrorCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'}`}>
                {errorCount}
              </span>
            ) : (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                0
              </span>
            )}
          </button>

          {/* Action buttons */}
          <button
            onClick={onDownloadSample}
            title="Download CSV template with required columns"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Sample CSV</span>
          </button>

          <button
            onClick={onLoadSample}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/40 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Demo Data</span>
          </button>

          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 shadow-md shadow-indigo-500/20 transition active:scale-[0.98]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
};
