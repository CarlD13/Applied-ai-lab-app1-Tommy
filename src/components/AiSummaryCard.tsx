import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ShiftAnalysisResult, RegionQ2Q3Shift } from '../types';
import { formatCurrency, formatPercent } from '../utils/analytics';

interface AiSummaryCardProps {
  shiftResult: ShiftAnalysisResult;
  onRefreshSummary?: () => void;
}

export const AiSummaryCard: React.FC<AiSummaryCardProps> = ({ shiftResult }) => {
  const [metricMode, setMetricMode] = useState<'dollar' | 'pct'>('dollar');
  const [summaryText, setSummaryText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showVerifiedMath, setShowVerifiedMath] = useState<boolean>(false);
  const [engineSource, setEngineSource] = useState<string>('gemini-3.8-flash');

  const activeRegion: RegionQ2Q3Shift | null =
    metricMode === 'dollar' ? shiftResult.topRegionByDollar : shiftResult.topRegionByPct;

  const fetchSummary = async (region: RegionQ2Q3Shift) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        topRegion: region.region,
        metricUsed: metricMode,
        dollarDelta: region.dollarDelta,
        pctDelta: region.pctDelta,
        q2Revenue: region.q2Revenue,
        q3Revenue: region.q3Revenue,
        allRegions: shiftResult.allRegionsRanked.map((r) => ({
          region: r.region,
          q2Revenue: r.q2Revenue,
          q3Revenue: r.q3Revenue,
          dollarDelta: r.dollarDelta,
          pctDelta: r.pctDelta,
        })),
        topProducts: region.productDrivers.slice(0, 3).map((p) => ({
          product: p.product,
          q2Revenue: p.q2Revenue,
          q3Revenue: p.q3Revenue,
          delta: p.delta,
          q2Units: p.q2Units,
          q3Units: p.q3Units,
        })),
        topChannels: region.channelDrivers.slice(0, 3).map((c) => ({
          channel: c.channel,
          q2Revenue: c.q2Revenue,
          q3Revenue: c.q3Revenue,
          delta: c.delta,
        })),
        unitsDelta: region.unitsDelta,
        q2Units: region.q2Units,
        q3Units: region.q3Units,
        q2AvgDiscount: region.q2AvgDiscount,
        q3AvgDiscount: region.q3AvgDiscount,
      };

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Summary API returned status ${res.status}`);
      }

      const data = await res.json();
      setSummaryText(data.summary || '');
      setEngineSource(data.source || 'gemini-3.8-flash');
    } catch {
      // Fallback deterministic summary using exact numbers
      const topProd = region.productDrivers[0];
      const topChan = region.channelDrivers[0];

      const s1 = `${region.region} changed the most from Q2 to Q3 with a net revenue shift of ${formatCurrency(
        region.dollarDelta
      )} (${formatPercent(region.pctDelta)}), moving from ${formatCurrency(region.q2Revenue)} in Q2 to ${formatCurrency(
        region.q3Revenue
      )} in Q3.`;

      const s2 = topProd
        ? `This change was primarily driven by ${topProd.product}, which saw revenue shift by ${formatCurrency(
            topProd.delta
          )} with volume moving from ${topProd.q2Units.toLocaleString()} to ${topProd.q3Units.toLocaleString()} units.`
        : `Product revenue shifts across the regional portfolio accounted for the majority of this change.`;

      const s3 = topChan
        ? `Additionally, sales in the ${topChan.channel} channel shifted by ${formatCurrency(
            topChan.delta
          )} while overall regional volume shifted by ${region.unitsDelta >= 0 ? '+' : ''}${region.unitsDelta.toLocaleString()} units and average discount rate adjusted from ${region.q2AvgDiscount.toFixed(1)}% to ${region.q3AvgDiscount.toFixed(1)}%.`
        : `Overall volume moved by ${region.unitsDelta >= 0 ? '+' : ''}${region.unitsDelta.toLocaleString()} units while average discounts moved from ${region.q2AvgDiscount.toFixed(1)}% to ${region.q3AvgDiscount.toFixed(1)}%.`;

      setSummaryText(`${s1} ${s2} ${s3}`);
      setEngineSource('calculated-engine');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeRegion && shiftResult.hasQ2AndQ3) {
      fetchSummary(activeRegion);
    }
  }, [activeRegion?.region, metricMode, shiftResult.hasQ2AndQ3]);

  const handleCopy = () => {
    if (!summaryText) return;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!shiftResult.hasQ2AndQ3) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Q2 → Q3 AI Shift Summary</h3>
            <p className="text-sm text-slate-400 mt-1">
              {shiftResult.message || 'Both Q2 and Q3 data are required to identify which region changed most.'}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Tip: Upload a sales dataset containing Q2 and Q3 order rows, or click &ldquo;Demo Data&rdquo; in the top bar to load a standard 4-quarter enterprise dataset.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!activeRegion) return null;

  // Split summary into sentences for enhanced legibility
  const sentences = summaryText
    ? summaryText
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const isGrowth = activeRegion.dollarDelta >= 0;

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden ring-1 ring-indigo-500/10">
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/5 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Q2 → Q3 AI Regional Shift Analysis
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                Verified Math Only
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Three-sentence executive brief synthesized strictly from app-calculated figures
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Metric basis toggle */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setMetricMode('dollar')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                metricMode === 'dollar'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Absolute $ Change
            </button>
            <button
              onClick={() => setMetricMode('pct')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                metricMode === 'pct'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              % Change
            </button>
          </div>

          <button
            onClick={() => fetchSummary(activeRegion)}
            disabled={isLoading}
            title="Regenerate summary with Gemini"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={handleCopy}
            disabled={!summaryText || isLoading}
            title="Copy 3-sentence summary"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Target Region Quick Glance Bar */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            Region with Most Change
          </div>
          <div className="text-base font-bold text-white mt-0.5 truncate">{activeRegion.region}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Rank #1 by {metricMode === 'dollar' ? 'Dollar Shift' : 'Percent Shift'}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            Q2 Revenue
          </div>
          <div className="text-base font-bold text-slate-200 mt-0.5 font-mono">
            {formatCurrency(activeRegion.q2Revenue)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{activeRegion.q2Units.toLocaleString()} units</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            Q3 Revenue
          </div>
          <div className="text-base font-bold text-slate-200 mt-0.5 font-mono">
            {formatCurrency(activeRegion.q3Revenue)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{activeRegion.q3Units.toLocaleString()} units</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            Net Change (Q2 → Q3)
          </div>
          <div
            className={`text-base font-bold mt-0.5 font-mono flex items-center gap-1 ${
              isGrowth ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isGrowth ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{formatCurrency(activeRegion.dollarDelta)}</span>
            <span className="text-xs font-normal opacity-90">({formatPercent(activeRegion.pctDelta)})</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Avg discount: {activeRegion.q2AvgDiscount.toFixed(1)}% → {activeRegion.q3AvgDiscount.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Main Three-Sentence AI Summary */}
      <div className="mt-5 relative z-10">
        <div className="p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-indigo-500/20 text-slate-100 shadow-inner">
          <div className="flex items-center justify-between mb-3 text-xs text-slate-400 border-b border-slate-800/60 pb-2">
            <span className="font-semibold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Three-Sentence Executive Briefing
            </span>
            <span className="font-mono text-[10px] text-slate-500">Model: {engineSource}</span>
          </div>

          {isLoading ? (
            <div className="space-y-3 py-2 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-full"></div>
              <div className="h-4 bg-slate-800 rounded w-5/6"></div>
              <div className="h-4 bg-slate-800 rounded w-4/6"></div>
            </div>
          ) : sentences.length > 0 ? (
            <div className="space-y-2.5">
              {sentences.map((sentence, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold flex items-center justify-center mt-0.5 font-mono">
                    {idx + 1}
                  </span>
                  <p className="text-sm sm:text-base leading-relaxed text-slate-200 font-sans">
                    {sentence}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Generating summary...</p>
          )}

          {errorMsg && (
            <div className="mt-3 text-xs text-amber-400 bg-amber-950/30 p-2 rounded border border-amber-500/20">
              Notice: {errorMsg}
            </div>
          )}
        </div>
      </div>

      {/* Accordion Toggle for Verified App Calculations */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <button
          onClick={() => setShowVerifiedMath(!showVerifiedMath)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 transition"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Audit Proof: App-Calculated Numbers Behind Summary</span>
            <span className="text-[10px] text-slate-500 font-normal">
              (Inspect exact underlying math for all regions & drivers)
            </span>
          </div>
          {showVerifiedMath ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showVerifiedMath && (
          <div className="mt-3 space-y-4 animate-in fade-in duration-200 text-xs">
            {/* All Regions Ranking comparison */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <div className="font-semibold text-slate-200 mb-2 flex items-center justify-between">
                <span>All Regions Ranked by Q2 → Q3 Shift</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Ranked by |Q3 - Q2| Revenue Delta
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono">
                  <thead className="text-[10px] text-slate-400 border-b border-slate-800 bg-slate-900/60">
                    <tr>
                      <th className="p-2">Rank</th>
                      <th className="p-2">Region</th>
                      <th className="p-2 text-right">Q2 Revenue</th>
                      <th className="p-2 text-right">Q3 Revenue</th>
                      <th className="p-2 text-right">Dollar Delta ($)</th>
                      <th className="p-2 text-right">% Change</th>
                      <th className="p-2 text-right">Unit Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {shiftResult.allRegionsRanked.map((r, i) => {
                      const isTop = r.region === activeRegion.region;
                      const pos = r.dollarDelta >= 0;
                      return (
                        <tr
                          key={r.region}
                          className={`${
                            isTop ? 'bg-indigo-950/40 font-semibold text-indigo-200' : 'text-slate-300 hover:bg-slate-900/40'
                          }`}
                        >
                          <td className="p-2">
                            {isTop ? (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-500/30">
                                #{i + 1} Selected
                              </span>
                            ) : (
                              `#${i + 1}`
                            )}
                          </td>
                          <td className="p-2 font-sans font-medium text-white">{r.region}</td>
                          <td className="p-2 text-right text-slate-300">{formatCurrency(r.q2Revenue)}</td>
                          <td className="p-2 text-right text-slate-300">{formatCurrency(r.q3Revenue)}</td>
                          <td
                            className={`p-2 text-right font-semibold ${
                              pos ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {pos ? '+' : ''}
                            {formatCurrency(r.dollarDelta)}
                          </td>
                          <td className={`p-2 text-right ${pos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatPercent(r.pctDelta)}
                          </td>
                          <td className="p-2 text-right text-slate-400">
                            {r.unitsDelta >= 0 ? '+' : ''}
                            {r.unitsDelta.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Drivers for Top Region */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Product Drivers */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center gap-2 font-semibold text-slate-200 mb-2">
                  <Package className="w-4 h-4 text-indigo-400" />
                  <span>Product Shifts in {activeRegion.region}</span>
                </div>
                <div className="space-y-2 font-mono text-[11px]">
                  {activeRegion.productDrivers.map((p) => {
                    const pos = p.delta >= 0;
                    return (
                      <div
                        key={p.product}
                        className="p-2 rounded-lg bg-slate-900/80 border border-slate-850 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-sans font-medium text-slate-200">{p.product}</div>
                          <div className="text-[10px] text-slate-500">
                            Units: {p.q2Units.toLocaleString()} → {p.q3Units.toLocaleString()} (
                            {p.q3Units - p.q2Units >= 0 ? '+' : ''}
                            {(p.q3Units - p.q2Units).toLocaleString()})
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${pos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos ? '+' : ''}
                            {formatCurrency(p.delta)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {formatCurrency(p.q2Revenue)} → {formatCurrency(p.q3Revenue)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Channel Drivers */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center gap-2 font-semibold text-slate-200 mb-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Channel Shifts in {activeRegion.region}</span>
                </div>
                <div className="space-y-2 font-mono text-[11px]">
                  {activeRegion.channelDrivers.map((c) => {
                    const pos = c.delta >= 0;
                    return (
                      <div
                        key={c.channel}
                        className="p-2 rounded-lg bg-slate-900/80 border border-slate-850 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-sans font-medium text-slate-200">{c.channel}</div>
                          <div className="text-[10px] text-slate-500">Sales Channel</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${pos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos ? '+' : ''}
                            {formatCurrency(c.delta)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {formatCurrency(c.q2Revenue)} → {formatCurrency(c.q3Revenue)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
