import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  X,
  Wand2,
  Bug,
  Filter,
  Check,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { HumanErrorIssue, AuditReport } from '../utils/errorAuditor';
import { SalesOrder } from '../types';

interface ErrorAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AuditReport;
  onApplyFixes: (updatedOrders: SalesOrder[]) => void;
  onInjectErrors: () => void;
  orders: SalesOrder[];
}

export const ErrorAuditModal: React.FC<ErrorAuditModalProps> = ({
  isOpen,
  onClose,
  report,
  onApplyFixes,
  onInjectErrors,
  orders,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'warning' | 'notice'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [fixedIssueIds, setFixedIssueIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const filteredIssues = report.issues.filter((iss) => {
    if (fixedIssueIds.has(iss.id)) return false;
    if (selectedFilter !== 'all' && iss.severity !== selectedFilter) return false;
    if (selectedCategory !== 'all' && iss.category !== selectedCategory) return false;
    return true;
  });

  // Handle single issue auto-fix
  const handleFixSingle = (issue: HumanErrorIssue) => {
    if (!issue.fixable || issue.suggestedFix === undefined) return;

    const updated = orders
      .filter((o, idx) => {
        if (issue.category === 'duplicate' && idx === issue.rowIndex - 1) {
          return false; // remove duplicate row
        }
        return true;
      })
      .map((o) => {
        if (o.id === issue.orderId) {
          const mod = { ...o };
          (mod as any)[issue.field] = issue.suggestedFix;
          return mod;
        }
        return o;
      });

    setFixedIssueIds((prev) => new Set(prev).add(issue.id));
    onApplyFixes(updated);
  };

  // Handle fix all safe issues
  const handleFixAll = () => {
    const fixableMap = new Map<string, any>();
    const duplicateIndices = new Set<number>();

    report.issues.forEach((iss) => {
      if (iss.category === 'duplicate') {
        duplicateIndices.add(iss.rowIndex - 1);
      } else if (iss.fixable && iss.suggestedFix !== undefined) {
        fixableMap.set(`${iss.orderId}_${iss.field}`, iss.suggestedFix);
      }
    });

    const updated: SalesOrder[] = [];
    orders.forEach((o, idx) => {
      if (duplicateIndices.has(idx)) return;
      const mod = { ...o };
      if (fixableMap.has(`${o.id}_region`)) mod.region = fixableMap.get(`${o.id}_region`);
      if (fixableMap.has(`${o.id}_product`)) mod.product = fixableMap.get(`${o.id}_product`);
      if (fixableMap.has(`${o.id}_discount_pct`)) mod.discount_pct = Number(fixableMap.get(`${o.id}_discount_pct`));
      if (fixableMap.has(`${o.id}_units`)) mod.units = Number(fixableMap.get(`${o.id}_units`));
      if (fixableMap.has(`${o.id}_revenue`)) mod.revenue = Number(fixableMap.get(`${o.id}_revenue`));
      updated.push(mod);
    });

    onApplyFixes(updated);
    setFixedIssueIds(new Set(report.issues.map((i) => i.id)));
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
    if (score >= 80) return 'text-amber-400 border-amber-500/30 bg-amber-950/20';
    return 'text-rose-400 border-rose-500/30 bg-rose-950/20';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Human Error &amp; Data Quality Auditor
                </h2>
                <span
                  className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${getScoreColor(
                    report.healthScore
                  )}`}
                >
                  Health Score: {report.healthScore}%
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Scans for fat-finger typos, mathematical contradictions, accidental duplicate rows, and spelling mistakes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Banner & Remediations */}
        <div className="py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Critical Errors
            </div>
            <div className="text-xl font-bold text-rose-400 font-mono mt-0.5 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              <span>{report.criticalCount}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Fat-fingers, negative numbers</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Warnings
            </div>
            <div className="text-xl font-bold text-amber-400 font-mono mt-0.5 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>{report.warningCount}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Duplicates, probable typos</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Formatting Notices
            </div>
            <div className="text-xl font-bold text-blue-400 font-mono mt-0.5 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-400" />
              <span>{report.noticeCount}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Whitespace, non-standard text</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Audited Orders
            </div>
            <div className="text-xl font-bold text-white font-mono mt-0.5">
              {report.totalOrders.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">100% coverage verified</div>
          </div>
        </div>

        {/* Action Bar: Filters + Auto-Fix */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 text-xs">
          {/* Severity tabs */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                selectedFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({report.totalIssues})
            </button>
            <button
              onClick={() => setSelectedFilter('critical')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                selectedFilter === 'critical'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Critical ({report.criticalCount})
            </button>
            <button
              onClick={() => setSelectedFilter('warning')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                selectedFilter === 'warning'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Warnings ({report.warningCount})
            </button>
            <button
              onClick={() => setSelectedFilter('notice')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                selectedFilter === 'notice'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Notices ({report.noticeCount})
            </button>
          </div>

          {/* Quick remediation buttons */}
          <div className="flex items-center gap-2">
            {report.totalIssues > 0 && (
              <button
                onClick={handleFixAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition active:scale-95"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Auto-Fix All Safe Issues</span>
              </button>
            )}

            <button
              onClick={onInjectErrors}
              title="Inject realistic human entry typos to test this detector"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              <Bug className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Typos</span>
            </button>
          </div>
        </div>

        {/* Issues List Container */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          {filteredIssues.length > 0 ? (
            filteredIssues.map((issue) => {
              const isCrit = issue.severity === 'critical';
              const isWarn = issue.severity === 'warning';
              return (
                <div
                  key={issue.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isCrit
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : isWarn
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-950/40 border-slate-800'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isCrit
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isWarn
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        }`}
                      >
                        {issue.severity}
                      </span>
                      <span className="font-mono text-slate-400 text-xs font-semibold">
                        Row #{issue.rowIndex} ({issue.orderId})
                      </span>
                      <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded text-indigo-300">
                        {issue.field}
                      </span>
                      <span className="font-semibold text-white text-xs">{issue.title}</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{issue.message}</p>

                    {issue.suggestedFix !== undefined && (
                      <div className="flex items-center gap-2 text-xs font-mono pt-0.5">
                        <span className="text-slate-500 line-through">
                          {String(issue.currentValue)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="text-emerald-400 font-bold">
                          {String(issue.suggestedFix)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Fix button */}
                  {issue.fixable && issue.suggestedFix !== undefined && (
                    <button
                      onClick={() => handleFixSingle(issue)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/50 transition flex-shrink-0 self-end sm:self-auto"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Fix</span>
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">No Human Entry Errors Detected</h4>
                <p className="text-xs text-slate-400 max-w-md mt-1">
                  All orders adhere to positive revenue ranges, standard quarter formatting, reasonable discount bounds, and verified product pricing distributions.
                </p>
              </div>
              <button
                onClick={onInjectErrors}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/40 transition"
              >
                <Bug className="w-4 h-4 text-amber-400" />
                <span>Simulate Common Human Typos to Test Auditor</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Automatic checks: Outliers, negative numbers, &gt;100% discounts, typos, duplicates
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Close Auditor
          </button>
        </div>
      </div>
    </div>
  );
};
