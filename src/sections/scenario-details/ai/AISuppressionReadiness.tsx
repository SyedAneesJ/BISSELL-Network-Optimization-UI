import React, { useState, useEffect } from 'react';
import { SUPPRESSION_DATA, SuppressionItem } from '../../../data/aiMockData';
import { ShieldAlert, RefreshCw, XCircle, ArrowRightCircle } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

interface AISuppressionReadinessProps {
  selectedKey: string;
}

export const AISuppressionReadiness: React.FC<AISuppressionReadinessProps> = ({ selectedKey }) => {
  const [suppressedDCs, setSuppressedDCs] = useState<string[]>([]);

  useEffect(() => {
    if (selectedKey === 'tactical_dallas') {
      setSuppressedDCs(['Dallas']);
    } else if (selectedKey === 'consolidation') {
      setSuppressedDCs(['Pharr TX']);
    } else {
      setSuppressedDCs([]);
    }
  }, [selectedKey]);

  function toggleSuppress(dc: string) {
    setSuppressedDCs((prev) =>
      prev.includes(dc) ? prev.filter((d) => d !== dc) : [...prev, dc]
    );
  }

  const totalPenalty = suppressedDCs.reduce((sum, dc) => {
    const d = SUPPRESSION_DATA.find((x) => x.dc === dc);
    return sum + (d ? d.penalty : 0);
  }, 0);

  const totalLanes = suppressedDCs.reduce((sum, dc) => {
    const d = SUPPRESSION_DATA.find((x) => x.dc === dc);
    return sum + (d ? d.lanes : 0);
  }, 0);

  return (
    <div className="space-y-6 fade-in">
      <div className="surface-card p-0 overflow-hidden shadow-strong">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-600 flex items-center justify-center text-lg shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Suppression Readiness</h3>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">Pre-Computed Impact Simulator</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 self-start sm:self-auto">
            Live from Ranked Options
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6">
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Before running any scenario — see the estimated cost penalty, lanes displaced, and capacity risk for each DC suppression. Derived from Option #1 vs Option #2 delta in Ranked Options.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUPPRESSION_DATA.map((dc: SuppressionItem) => {
              const isSuppressed = suppressedDCs.includes(dc.dc);
              return (
                <div
                  key={dc.dc}
                  className={`rounded-2xl border p-5 relative transition duration-200 ${
                    isSuppressed
                      ? 'border-red-200 bg-red-50/30'
                      : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                  }`}
                >
                  <div className="absolute top-4 right-4 text-2xl opacity-10 pointer-events-none">📦</div>
                  
                  <div className="flex items-center justify-between mb-3">
                     <span className="font-bold text-sm text-slate-800">{dc.dc}</span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isSuppressed
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {isSuppressed ? "SUPPRESSED" : "ACTIVE"}
                    </span>
                  </div>

                  <div className={`text-2xl font-extrabold tabular-nums tracking-tight ${dc.flag ? 'text-red-500' : 'text-amber-500'}`}>
                    <AnimatedNumber value={dc.penalty / 1000000} prefix="$" suffix="M" decimals={1} />
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">Estimated suppression cost penalty</div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100/80">
                    <MetaItem val={dc.lanes.toLocaleString()} lbl="Lanes displaced" />
                    <MetaItem val={dc.absorb} lbl="Primary absorber" />
                    <MetaItem val={dc.utilImpact} lbl="Util impact" valColor={dc.flag ? "text-red-500" : "text-amber-500"} />
                  </div>

                  <button
                    onClick={() => toggleSuppress(dc.dc)}
                    className={`w-full mt-4 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition duration-200 border ${
                      isSuppressed
                        ? 'bg-red-600 hover:bg-red-700 text-white border-transparent'
                        : 'bg-transparent border-blue-200 hover:border-blue-300 text-blue-600'
                    }`}
                  >
                    {isSuppressed ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Restore DC
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        Simulate Suppression
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Combined Suppression Analysis Panel */}
          {suppressedDCs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                AI Suppression Simulation Analysis
              </h4>
              <div className="rounded-2xl bg-blue-50/30 border border-blue-100/50 p-5 text-xs text-slate-600 leading-relaxed space-y-3">
                <div>
                  <strong className="text-slate-800">Selected suppressions: {suppressedDCs.join(" + ")}</strong>
                </div>
                <div>
                  Suppressing {suppressedDCs.join(" + ")} shifts <strong className="text-slate-800"><AnimatedNumber value={totalLanes} /> lanes</strong> at an estimated cost penalty of <strong className="text-slate-800"><AnimatedNumber value={totalPenalty / 1000000} prefix="$" suffix="M" decimals={1} /></strong>.
                  {suppressedDCs.includes("Dallas") && (
                    <span> R Virginia will absorb the majority of displaced volume and represents the primary capacity risk — currently at 66.8% utilization, suppressing Dallas pushes it toward 92%.</span>
                  )}
                  {suppressedDCs.length > 1 && (
                    <span className="block mt-2 font-semibold text-red-600">
                      ⚠️ Warning: Suppressing multiple DCs simultaneously significantly increases overcapacity risk across the remaining network. Run a full scenario to validate the assignment distribution.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-blue-600 font-semibold pt-1">
                  <ArrowRightCircle className="w-4 h-4 flex-shrink-0" />
                  To confirm these pre-computed estimates, run a Tactical Pro Forma scenario with {suppressedDCs.join(" + ")} suppressed in the scenario wizard.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface MetaItemProps {
  val: string;
  lbl: string;
  valColor?: string;
}

const MetaItem: React.FC<MetaItemProps> = ({ val, lbl, valColor }) => {
  return (
    <div className="flex flex-col gap-0.5">
      <div className={`text-xs font-bold text-slate-700 truncate ${valColor ?? ''}`}>{val}</div>
      <div className="text-[9px] text-slate-400 font-medium leading-none">{lbl}</div>
    </div>
  );
};
