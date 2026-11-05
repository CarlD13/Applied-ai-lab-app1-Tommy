import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertTriangle, Download, ArrowRight } from 'lucide-react';
import { parseCsvString, ParseResult } from '../utils/csvParser';
import { SalesOrder } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (orders: SalesOrder[]) => void;
  onDownloadSample: () => void;
}

const REQUIRED_COLUMNS = [
  { name: 'quarter', desc: 'e.g., Q1, Q2, Q3, Q4' },
  { name: 'region', desc: 'e.g., North America, Europe, Asia Pacific' },
  { name: 'channel', desc: 'e.g., Direct Enterprise, Partner, Online' },
  { name: 'product', desc: 'e.g., Cloud Suite, Copilot Pro' },
  { name: 'units', desc: 'Sold unit quantity (e.g., 1500)' },
  { name: 'discount_pct', desc: 'Discount percentage (e.g., 12.5 or 0.125)' },
  { name: 'revenue', desc: 'Calculated gross or net revenue ($)' },
];

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  onDownloadSample,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setParseResult({
        orders: [],
        errors: ['Please upload a valid .csv file format.'],
        matchedColumns: null,
        totalParsedRows: 0,
      });
      setFileName(file.name);
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const res = parseCsvString(text);
      setParseResult(res);
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setParseResult({
        orders: [],
        errors: ['Failed to read file from disk.'],
        matchedColumns: null,
        totalParsedRows: 0,
      });
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleApply = () => {
    if (parseResult && parseResult.orders.length > 0) {
      onUploadSuccess(parseResult.orders);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Upload Sales Orders CSV</h2>
              <p className="text-xs text-slate-400">
                Visualizes total revenue by region & quarter and triggers AI Q2→Q3 analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Required columns specification */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Required CSV Columns (7 Total)
              </span>
              <button
                type="button"
                onClick={onDownloadSample}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
              >
                <Download className="w-3 h-3" />
                Download CSV Sample
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {REQUIRED_COLUMNS.map((col) => {
                const isMatched =
                  parseResult?.matchedColumns &&
                  (parseResult.matchedColumns as any)[col.name];
                return (
                  <div
                    key={col.name}
                    className={`p-2 rounded-lg border font-mono transition ${
                      isMatched
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{col.name}</span>
                      {isMatched && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{col.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
              dragOver
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-700 hover:border-slate-500 bg-slate-950/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shadow">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                {fileName ? fileName : 'Drag and drop your CSV here, or browse files'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports standard CSV files exported from ERP/CRM</p>
            </div>
          </div>

          {/* Validation Feedback */}
          {parseResult && (
            <div className="space-y-3">
              {parseResult.errors.length > 0 ? (
                <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl space-y-1.5 text-xs text-red-300">
                  <div className="flex items-center gap-2 font-semibold text-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>Upload Validation Issues:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {parseResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>
                      Successfully validated <strong>{parseResult.orders.length.toLocaleString()}</strong> orders
                      across all required columns!
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Sample of parsed rows */}
              {parseResult.orders.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-800/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex justify-between">
                    <span>Parsed Preview (First 3 Orders)</span>
                    <span className="text-indigo-400 font-mono">{parseResult.orders.length} total rows</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[10px]">
                        <tr>
                          <th className="px-3 py-1.5">Quarter</th>
                          <th className="px-3 py-1.5">Region</th>
                          <th className="px-3 py-1.5">Channel</th>
                          <th className="px-3 py-1.5">Product</th>
                          <th className="px-3 py-1.5 text-right">Units</th>
                          <th className="px-3 py-1.5 text-right">Disc %</th>
                          <th className="px-3 py-1.5 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-300 text-[11px]">
                        {parseResult.orders.slice(0, 3).map((o) => (
                          <tr key={o.id} className="hover:bg-slate-800/40">
                            <td className="px-3 py-1.5 text-indigo-300 font-bold">{o.quarter}</td>
                            <td className="px-3 py-1.5">{o.region}</td>
                            <td className="px-3 py-1.5 text-slate-400">{o.channel}</td>
                            <td className="px-3 py-1.5 truncate max-w-[120px]">{o.product}</td>
                            <td className="px-3 py-1.5 text-right">{o.units.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-right">{o.discount_pct}%</td>
                            <td className="px-3 py-1.5 text-right text-emerald-400 font-semibold">
                              ${o.revenue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!parseResult || parseResult.orders.length === 0 || parseResult.errors.length > 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            <span>Analyze Dataset</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
