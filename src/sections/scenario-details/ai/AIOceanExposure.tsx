import React from 'react';
import { EXPOSED_LANES, ExposedLaneItem, SCENARIOS } from '../../../data/aiMockData';
import { Waves, AlertTriangle, Package } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';
import { ProgressBar } from './ProgressBar';

const SENSITIVITY = [
  { pct: "+5%",  impact:  3335000, color: "#F59E0B" },
  { pct: "+10%", impact:  6670000, color: "#EF4444" },
  { pct: "+15%", impact:  9995000, color: "#DC2626" },
  { pct: "+20%", impact: 13340000, color: "#991B1B" },
  { pct: "-5%",  impact: -3335000, color: "#10B981" },
  { pct: "-10%", impact: -6670000, color: "#059669" },
];

interface AIOceanExposureProps {
  selectedKey: string;
}

export const AIOceanExposure: React.FC<AIOceanExposureProps> = ({ selectedKey }) => {
  const activeScenario = SCENARIOS[selectedKey] || SCENARIOS.tactical_dallas;
  const totalCost = activeScenario.totalCost;
  const scaleFactor = totalCost / 97500000;
  const maxAbs = Math.max(...SENSITIVITY.map((s) => Math.abs(s.impact)));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in">
      {/* Sensitivity analysis */}
      <div className="surface-card p-0 overflow-hidden shadow-strong col-span-1">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center text-lg shadow-sm">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Ocean Freight Exposure</h3>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">Sensitivity & Exposure Analysis</p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <SummaryTile value={<AnimatedNumber value={66.6 * scaleFactor} prefix="$" suffix="M" decimals={1} />} label="Total inbound ocean freight" valueColor="text-amber-500" />
            <SummaryTile value="70%" label="Of total network cost — unoptimisable" valueColor="text-red-400" />
          </div>

          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            RATE SENSITIVITY — IMPACT OF RATE CHANGES
          </h4>
          
          <div className="space-y-3">
            {SENSITIVITY.map((s) => {
              const pct = Math.round((Math.abs(s.impact) / maxAbs) * 100);
              const isPos = s.impact > 0;
              return (
                <div key={s.pct} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-b-0">
                  <div className="w-10 text-xs font-bold text-slate-700">{s.pct}</div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <ProgressBar targetWidth={pct} color={s.color} />
                  </div>
                  <div className="w-20 text-right text-xs font-bold tabular-nums" style={{ color: s.color }}>
                    {isPos ? "+" : "-"}<AnimatedNumber value={Math.abs(s.impact) / 1000000} prefix="$" suffix="M" decimals={1} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Most exposed lanes */}
      <div className="surface-card p-0 overflow-hidden shadow-strong col-span-1">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100/80 text-red-600 flex items-center justify-center text-lg shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Most Exposed Lanes</h3>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">High Vulnerability ZIPs</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-55 bg-amber-50 text-amber-700 border border-amber-200">
            95 ZIPs &gt;80% Inbound
          </span>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            ZIP codes where inbound ocean freight is more than 80% of total lane cost. For these lanes, even a perfect DC routing decision only moves 20 cents in every dollar.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="py-2.5 px-3 font-semibold text-slate-500">ZIP</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-500">Channel</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-500 text-right">Inbound</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-500 text-right">Total Cost</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-500 text-right">Inbound %</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-500 text-center">Risk</th>
                </tr>
              </thead>
              <tbody>
                {EXPOSED_LANES.map((l: ExposedLaneItem) => (
                  <tr key={l.zip} className="border-b border-slate-100 hover:bg-slate-50/40 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-700">{l.zip}</td>
                    <td className="py-2.5 px-3 text-slate-500">{l.ch}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-700 tabular-nums">${(l.inbound / 1000).toFixed(0)}K</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-700 tabular-nums">${(l.total / 1000).toFixed(0)}K</td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-500 tabular-nums">{l.pct}%</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-700 border border-red-100">
                        High Risk
                      </span>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={6} className="py-3 px-3 text-center text-slate-400 font-medium text-[11px] bg-slate-50/20">
                    + 88 more B2B ZIP codes with &gt;80% inbound exposure
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* B2B cost structure */}
      <div className="surface-card p-0 overflow-hidden shadow-strong md:col-span-2 col-span-1">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-100/80 text-green-600 flex items-center justify-center text-lg shadow-sm">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">B2B Cost Structure</h3>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">Where the Money Actually Goes</p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <CostTile value={<AnimatedNumber value={63.3 * scaleFactor} prefix="$" suffix="M" decimals={1} />} label="Inbound Ocean" pct="72%" valueColor="text-red-500" tag="Not optimisable" tagColor="text-red-600 bg-red-50 border-red-100" />
            <CostTile value={<AnimatedNumber value={11.6 * scaleFactor} prefix="$" suffix="M" decimals={1} />} label="Distribution" pct="13%" valueColor="text-blue-500" tag="Optimisable ✓" tagColor="text-green-700 bg-green-50 border-green-100" />
            <CostTile value={<AnimatedNumber value={6.9 * scaleFactor} prefix="$" suffix="M" decimals={1} />} label="LTL Freight" pct="8%" valueColor="text-amber-500" tag="Optimisable ✓" tagColor="text-green-700 bg-green-50 border-green-100" />
            <CostTile value={<AnimatedNumber value={0.1 * scaleFactor} prefix="$" suffix="M" decimals={1} />} label="Parcel" pct="0.1%" valueColor="text-slate-400" tag="Optimisable ✓" tagColor="text-green-700 bg-green-50 border-green-100" />
          </div>

          <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-4 text-xs text-amber-800 leading-relaxed font-medium">
            <strong>The tool optimises the 28% of B2B cost that routing can influence.</strong> The other 72% is locked in inbound ocean decisions made upstream. When leadership asks &quot;we ran all these scenarios and only saved X% — why?&quot;, this is the answer. The next conversation should be about ocean freight exposure and nearshoring strategy.
          </div>
        </div>
      </div>
    </div>
  );
};

interface SummaryTileProps {
  value: React.ReactNode;
  label: string;
  valueColor: string;
}

const SummaryTile: React.FC<SummaryTileProps> = ({ value, label, valueColor }) => {
  return (
    <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 text-center">
      <div className={`text-2xl font-black ${valueColor}`}>{value}</div>
      <div className="text-[10px] font-semibold text-slate-400 mt-1 leading-tight">{label}</div>
    </div>
  );
};

interface CostTileProps {
  value: React.ReactNode;
  label: string;
  pct: string;
  valueColor: string;
  tag: string;
  tagColor: string;
}

const CostTile: React.FC<CostTileProps> = ({ value, label, pct, valueColor, tag, tagColor }) => {
  return (
    <div className="border border-slate-100 bg-white rounded-2xl p-4 text-center hover:shadow-sm transition duration-150">
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
      <div className="text-[10px] font-medium text-slate-400 mt-0.5">{label}</div>
      <div className="text-xs font-extrabold text-slate-700 mt-2">{pct}</div>
      <div className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-2 border ${tagColor}`}>
        {tag}
      </div>
    </div>
  );
};
