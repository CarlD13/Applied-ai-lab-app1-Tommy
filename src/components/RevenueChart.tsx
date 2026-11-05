import React, { useState, useId } from 'react';
import { BarChart, Layers, TrendingUp, Info } from 'lucide-react';
import { RegionQuarterMatrix } from '../types';
import { formatCurrency } from '../utils/analytics';

interface RevenueChartProps {
  matrix: RegionQuarterMatrix;
}

type ChartMode = 'quarter-group' | 'region-group' | 'stacked' | 'trend';

// Harmonious, distinct color palette for regions/quarters
const PALETTE = [
  { fill: '#6366f1', stroke: '#818cf8', label: 'Indigo' },   // Indigo
  { fill: '#06b6d4', stroke: '#22d3ee', label: 'Cyan' },     // Cyan
  { fill: '#10b981', stroke: '#34d399', label: 'Emerald' },  // Emerald
  { fill: '#f59e0b', stroke: '#fbbf24', label: 'Amber' },    // Amber
  { fill: '#ec4899', stroke: '#f472b6', label: 'Pink' },     // Pink
  { fill: '#8b5cf6', stroke: '#a78bfa', label: 'Violet' },   // Violet
  { fill: '#14b8a6', stroke: '#2dd4bf', label: 'Teal' },     // Teal
  { fill: '#f43f5e', stroke: '#fb7185', label: 'Rose' },     // Rose
];

export const RevenueChart: React.FC<RevenueChartProps> = ({ matrix }) => {
  const [chartMode, setChartMode] = useState<ChartMode>('quarter-group');
  const [hoveredData, setHoveredData] = useState<{
    quarter: string;
    region: string;
    revenue: number;
    shareOfQuarter: number;
    x: number;
    y: number;
  } | null>(null);

  const [hiddenRegions, setHiddenRegions] = useState<Set<string>>(new Set());

  const chartId = useId();

  const { regions, quarters, data, quarterTotals } = matrix;

  const activeRegions = regions.filter((r) => !hiddenRegions.has(r));

  const toggleRegion = (reg: string) => {
    const next = new Set(hiddenRegions);
    if (next.has(reg)) {
      next.delete(reg);
    } else {
      if (activeRegions.length > 1) {
        next.add(reg);
      }
    }
    setHiddenRegions(next);
  };

  // Dimensions
  const svgWidth = 840;
  const svgHeight = 360;
  const padding = { top: 30, right: 30, bottom: 50, left: 75 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Compute maximum values based on view mode
  let maxValue = 1;
  if (chartMode === 'stacked') {
    quarters.forEach((q) => {
      let qTotal = 0;
      activeRegions.forEach((r) => {
        qTotal += data[r]?.[q] || 0;
      });
      if (qTotal > maxValue) maxValue = qTotal;
    });
  } else {
    activeRegions.forEach((r) => {
      quarters.forEach((q) => {
        const val = data[r]?.[q] || 0;
        if (val > maxValue) maxValue = val;
      });
    });
  }

  // Round up maxValue for tidy grid lines
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
  const normalized = maxValue / magnitude;
  let niceMax = Math.ceil(normalized * 1.1) * magnitude;
  if (niceMax === 0) niceMax = 1000;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => niceMax * pct);

  const getY = (val: number) => {
    return padding.top + plotHeight - (val / niceMax) * plotHeight;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Total Revenue by Region & Quarter
            </h3>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Interactive Visualization
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare regional performance across quarterly reporting periods
          </p>
        </div>

        {/* View mode toggle */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 self-start sm:self-auto text-xs">
          <button
            onClick={() => setChartMode('quarter-group')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              chartMode === 'quarter-group'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart className="w-3.5 h-3.5" />
            <span>By Quarter</span>
          </button>
          <button
            onClick={() => setChartMode('region-group')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              chartMode === 'region-group'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart className="w-3.5 h-3.5 rotate-90" />
            <span>By Region</span>
          </button>
          <button
            onClick={() => setChartMode('stacked')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              chartMode === 'stacked'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stacked</span>
          </button>
          <button
            onClick={() => setChartMode('trend')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              chartMode === 'trend'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Trend Line</span>
          </button>
        </div>
      </div>

      {/* Interactive Legend */}
      <div className="flex flex-wrap items-center gap-2 pt-3 pb-2 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
          Regions:
        </span>
        {regions.map((reg, idx) => {
          const color = PALETTE[idx % PALETTE.length];
          const isHidden = hiddenRegions.has(reg);
          return (
            <button
              key={reg}
              onClick={() => toggleRegion(reg)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
                isHidden
                  ? 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                  : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-slate-600 shadow-sm'
              }`}
              title={isHidden ? 'Click to show' : 'Click to hide'}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: isHidden ? '#475569' : color.fill }}
              />
              <span className={isHidden ? 'line-through' : ''}>{reg}</span>
            </button>
          );
        })}
      </div>

      {/* SVG Canvas Container */}
      <div className="relative flex-1 w-full mt-2 select-none overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[550px] overflow-visible"
        >
          {/* Y-axis grid lines and labels */}
          {yTicks.map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray={i === 0 ? 'none' : '3 3'}
                  strokeWidth={i === 0 ? 1.5 : 0.8}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {formatCurrency(tick, true)}
                </text>
              </g>
            );
          })}

          {/* Grouped by Quarter Mode */}
          {chartMode === 'quarter-group' && (
            <>
              {quarters.map((q, qIdx) => {
                const groupWidth = plotWidth / quarters.length;
                const groupX = padding.left + qIdx * groupWidth;
                const innerPadding = groupWidth * 0.15;
                const barAreaWidth = groupWidth - innerPadding * 2;
                const barWidth = Math.max(8, barAreaWidth / activeRegions.length - 3);

                return (
                  <g key={q}>
                    {/* Quarter label on X axis */}
                    <text
                      x={groupX + groupWidth / 2}
                      y={svgHeight - padding.bottom + 22}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {q}
                    </text>
                    <text
                      x={groupX + groupWidth / 2}
                      y={svgHeight - padding.bottom + 36}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      Total: {formatCurrency(quarterTotals[q] || 0, true)}
                    </text>

                    {/* Bars for each active region */}
                    {activeRegions.map((r, rIdx) => {
                      const val = data[r]?.[q] || 0;
                      const barHeight = (val / niceMax) * plotHeight;
                      const x = groupX + innerPadding + rIdx * (barWidth + 3);
                      const y = getY(val);
                      const originalIdx = regions.indexOf(r);
                      const color = PALETTE[originalIdx % PALETTE.length];
                      const qTotal = quarterTotals[q] || 1;
                      const share = (val / qTotal) * 100;

                      return (
                        <rect
                          key={r}
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          fill={color.fill}
                          rx={3}
                          className="transition-all duration-200 cursor-pointer hover:brightness-125"
                          onMouseEnter={() =>
                            setHoveredData({
                              quarter: q,
                              region: r,
                              revenue: val,
                              shareOfQuarter: share,
                              x: x + barWidth / 2,
                              y,
                            })
                          }
                          onMouseLeave={() => setHoveredData(null)}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </>
          )}

          {/* Grouped by Region Mode */}
          {chartMode === 'region-group' && (
            <>
              {activeRegions.map((reg, rIdx) => {
                const groupWidth = plotWidth / activeRegions.length;
                const groupX = padding.left + rIdx * groupWidth;
                const innerPadding = groupWidth * 0.12;
                const barAreaWidth = groupWidth - innerPadding * 2;
                const barWidth = Math.max(8, barAreaWidth / quarters.length - 3);
                const originalIdx = regions.indexOf(reg);
                const color = PALETTE[originalIdx % PALETTE.length];

                return (
                  <g key={reg}>
                    {/* Region label on X axis */}
                    <text
                      x={groupX + groupWidth / 2}
                      y={svgHeight - padding.bottom + 22}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {reg.length > 14 ? `${reg.slice(0, 12)}…` : reg}
                    </text>

                    {/* Bars for each quarter */}
                    {quarters.map((q, qIdx) => {
                      const val = data[reg]?.[q] || 0;
                      const barHeight = (val / niceMax) * plotHeight;
                      const x = groupX + innerPadding + qIdx * (barWidth + 3);
                      const y = getY(val);
                      const qTotal = quarterTotals[q] || 1;
                      const share = (val / qTotal) * 100;

                      // Slight opacity variations across quarters for contrast
                      const opacity = 0.55 + (qIdx / (quarters.length || 1)) * 0.45;

                      return (
                        <g key={q}>
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            fill={color.fill}
                            fillOpacity={opacity}
                            rx={3}
                            className="transition-all duration-200 cursor-pointer hover:brightness-125"
                            onMouseEnter={() =>
                              setHoveredData({
                                quarter: q,
                                region: reg,
                                revenue: val,
                                shareOfQuarter: share,
                                x: x + barWidth / 2,
                                y,
                              })
                            }
                            onMouseLeave={() => setHoveredData(null)}
                          />
                          <text
                            x={x + barWidth / 2}
                            y={svgHeight - padding.bottom + 36}
                            textAnchor="middle"
                            fill="#64748b"
                            fontSize="8"
                            fontFamily="monospace"
                          >
                            {q}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </>
          )}

          {/* Stacked Mode */}
          {chartMode === 'stacked' && (
            <>
              {quarters.map((q, qIdx) => {
                const groupWidth = plotWidth / quarters.length;
                const groupX = padding.left + qIdx * groupWidth;
                const barWidth = Math.min(60, groupWidth * 0.5);
                const x = groupX + (groupWidth - barWidth) / 2;
                const qTotal = quarterTotals[q] || 1;

                let currentYOffset = padding.top + plotHeight;

                return (
                  <g key={q}>
                    {/* X axis labels */}
                    <text
                      x={groupX + groupWidth / 2}
                      y={svgHeight - padding.bottom + 22}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {q}
                    </text>
                    <text
                      x={groupX + groupWidth / 2}
                      y={svgHeight - padding.bottom + 36}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {formatCurrency(qTotal, true)}
                    </text>

                    {/* Stack segments */}
                    {activeRegions.map((reg) => {
                      const val = data[reg]?.[q] || 0;
                      const segmentHeight = (val / niceMax) * plotHeight;
                      currentYOffset -= segmentHeight;
                      const segmentY = currentYOffset;

                      const originalIdx = regions.indexOf(reg);
                      const color = PALETTE[originalIdx % PALETTE.length];
                      const share = (val / qTotal) * 100;

                      return (
                        <rect
                          key={reg}
                          x={x}
                          y={segmentY}
                          width={barWidth}
                          height={segmentHeight}
                          fill={color.fill}
                          stroke="#0f172a"
                          strokeWidth={0.5}
                          className="transition-all duration-200 cursor-pointer hover:brightness-125"
                          onMouseEnter={() =>
                            setHoveredData({
                              quarter: q,
                              region: reg,
                              revenue: val,
                              shareOfQuarter: share,
                              x: x + barWidth / 2,
                              y: segmentY,
                            })
                          }
                          onMouseLeave={() => setHoveredData(null)}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </>
          )}

          {/* Trend Line Mode */}
          {chartMode === 'trend' && (
            <>
              {/* Quarter marks on X axis */}
              {quarters.map((q, qIdx) => {
                const x = padding.left + (qIdx / (quarters.length - 1 || 1)) * plotWidth;
                return (
                  <g key={q}>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={svgHeight - padding.bottom}
                      stroke="#1e293b"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={x}
                      y={svgHeight - padding.bottom + 22}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {q}
                    </text>
                  </g>
                );
              })}

              {/* Lines and dots for each region */}
              {activeRegions.map((reg) => {
                const originalIdx = regions.indexOf(reg);
                const color = PALETTE[originalIdx % PALETTE.length];

                const points = quarters.map((q, qIdx) => {
                  const val = data[reg]?.[q] || 0;
                  const x = padding.left + (qIdx / (quarters.length - 1 || 1)) * plotWidth;
                  const y = getY(val);
                  return { x, y, q, val };
                });

                const pathData = points
                  .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                  .join(' ');

                return (
                  <g key={reg}>
                    <path
                      d={pathData}
                      fill="none"
                      stroke={color.fill}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {points.map((p) => {
                      const qTotal = quarterTotals[p.q] || 1;
                      const share = (p.val / qTotal) * 100;
                      return (
                        <circle
                          key={p.q}
                          cx={p.x}
                          cy={p.y}
                          r={5}
                          fill="#0f172a"
                          stroke={color.fill}
                          strokeWidth={2.5}
                          className="cursor-pointer transition-all hover:scale-150"
                          onMouseEnter={() =>
                            setHoveredData({
                              quarter: p.q,
                              region: reg,
                              revenue: p.val,
                              shareOfQuarter: share,
                              x: p.x,
                              y: p.y,
                            })
                          }
                          onMouseLeave={() => setHoveredData(null)}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </>
          )}

          {/* Interactive Tooltip Card */}
          {hoveredData && (
            <g
              transform={`translate(${Math.min(
                svgWidth - 170,
                Math.max(padding.left + 10, hoveredData.x - 75)
              )}, ${Math.max(10, hoveredData.y - 70)})`}
              className="pointer-events-none"
            >
              <rect
                width={150}
                height={58}
                rx={8}
                fill="#020617"
                stroke="#4f46e5"
                strokeWidth={1.5}
                filter="drop-shadow(0 10px 15px rgba(0,0,0,0.5))"
              />
              <text x={12} y={18} fill="#94a3b8" fontSize="10" fontWeight="600">
                {hoveredData.quarter} • {hoveredData.region}
              </text>
              <text
                x={12}
                y={36}
                fill="#ffffff"
                fontSize="13"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {formatCurrency(hoveredData.revenue)}
              </text>
              <text x={12} y={50} fill="#38bdf8" fontSize="9" fontFamily="monospace">
                {hoveredData.shareOfQuarter.toFixed(1)}% of quarter total
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
