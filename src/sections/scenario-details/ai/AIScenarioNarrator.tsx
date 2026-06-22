import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, RefreshCw, Play, CheckCircle, AlertTriangle, Key, ArrowRight } from 'lucide-react';
import { SCENARIOS, AIScenario } from '../../../data/aiMockData';
import { narrateScenario, NarrativeSection } from '../../../services/ai/aiService';

const MOCK_NARRATIVES: Record<string, NarrativeSection[]> = {
  tactical_dallas: [
    { label: "📊 EXECUTIVE SUMMARY", text: "Tactical Pro Forma represents an optimized active configuration. Total network spend stands at <strong>$36.1M</strong> with average transit of <strong>1.69 days</strong>." },
    { label: "💰 COST ANALYSIS", text: "Average Cost per Unit is optimized at <strong>$6.85</strong>. No suppression penalties are incurred since all nodes are fully operational." },
    { label: "⚡ CAPACITY & RISK", text: "Network operates at a balanced capacity. R Virginia and Dallas share regional volume, keeping utilization below critical levels." },
    { label: "📦 SERVICE LEVEL", text: "SLA breach rate is at <strong>0.0%</strong>. Lead transits are within bounds across all regions." },
    { label: "✅ RECOMMENDATION", text: "Use this Tactical Pro Forma as the primary active baseline. Simulate suppression of individual DCs to evaluate network redundancy." }
  ],
  baseline: [
    { label: "📊 EXECUTIVE SUMMARY", text: "All 4 major DCs are active. Total network spend stands at <strong>$97.5M</strong> with average transit of <strong>1.69 days</strong>." },
    { label: "💰 COST ANALYSIS", text: "Average Cost per Unit is optimized at <strong>$4.91</strong>. B2B LTL spend represents <strong>3.6%</strong> of total routing spend." },
    { label: "⚡ CAPACITY & RISK", text: "Network operates at a balanced <strong>66.8%</strong> maximum utilization. R Virginia has comfortable headroom at <strong>66.8%</strong>." },
    { label: "📦 SERVICE LEVEL", text: "SLA breaches are at <strong>0.0%</strong> with optimal carrier coverage across all core lanes." },
    { label: "✅ RECOMMENDATION", text: "Maintain current configuration as the baseline benchmark for tactical changes." }
  ],
  strategic: [
    { label: "📊 EXECUTIVE SUMMARY", text: "Running an unconstrained footprint scenario shows potential optimization opportunities. Total cost is <strong>$51.5M</strong>." },
    { label: "💰 COST ANALYSIS", text: "Cost per Unit is <strong>$8.39</strong>. B2C transit routes are minimized through high-volume lane consolidation." },
    { label: "⚡ CAPACITY & RISK", text: "Overutilization detected on unconstrained modes due to high volume accumulation." },
    { label: "📦 SERVICE LEVEL", text: "SLA breaches rise to <strong>46.0%</strong> due to lead time caps and long transits on collect terms." },
    { label: "✅ RECOMMENDATION", text: "Constrain utilization to <strong>85%</strong> to stabilize the footprint." }
  ],
  consolidation: [
    { label: "📊 EXECUTIVE SUMMARY", text: "Consolidation scenario with Pharr TX and Stratford CT active. Total network spend is <strong>$8.8M</strong>." },
    { label: "💰 COST ANALYSIS", text: "Cost per Unit is <strong>$11.39</strong> due to lower volume efficiencies and longer regional transits." },
    { label: "⚡ CAPACITY & RISK", text: "High capacity utilization on Stratford CT, reaching peak thresholds." },
    { label: "📦 SERVICE LEVEL", text: "SLA breaches are low at <strong>5.24%</strong> with average delivery days at <strong>3.15 days</strong>." },
    { label: "✅ RECOMMENDATION", text: "Balance load across Pharr and Elwood to release Stratford bottleneck." }
  ]
};

const SCENARIOS_LIST = [
  { key: "tactical_dallas", label: "Tactical Pro Forma", primary: true },
  { key: "baseline",        label: "US Baseline",                   primary: false },
  { key: "strategic",       label: "Strategic Pro Forma",            primary: false },
  { key: "consolidation",   label: "Consolidation Tactical",         primary: false },
];

interface AIScenarioNarratorProps {
  activeScenarioName?: string;
  selectedKey: string;
  onSelectedKeyChange: (key: string) => void;
  onGoToSuppression?: () => void;
  defaultInsightResult?: any;
  isDefaultInsightLoading?: boolean;
}

const MOCK_DEFAULT_NARRATIVE: Record<string, NarrativeSection[]> = {
  tactical_dallas: [
    { label: "📊 EXECUTIVE SUMMARY (DEFAULT WORKFLOW)", text: "Tactical Pro Forma represents an optimized active configuration. Total network spend stands at <strong>$36.1M</strong> with average transit of <strong>1.69 days</strong>." },
    { label: "💰 COST ANALYSIS", text: "Average Cost per Unit is optimized at <strong>$6.85</strong>. No suppression penalties are incurred since all nodes are fully operational." },
    { label: "⚡ CAPACITY & RISK", text: "Network operates at a balanced capacity. R Virginia and Dallas share regional volume, keeping utilization below critical levels." },
    { label: "📦 SERVICE LEVEL", text: "SLA breach rate is at <strong>0.0%</strong>. Lead transits are within bounds across all regions." },
    { label: "✅ RECOMMENDATION", text: "Use this Tactical Pro Forma as the primary active baseline. Simulate suppression of individual DCs to evaluate network redundancy." }
  ],
  baseline: [
    { label: "📊 EXECUTIVE SUMMARY (DEFAULT WORKFLOW)", text: "All 4 major DCs are active. Total network spend stands at <strong>$97.5M</strong> with average transit of <strong>1.69 days</strong>." },
    { label: "💰 COST ANALYSIS", text: "Average Cost per Unit is optimized at <strong>$4.91</strong>. B2B LTL spend represents <strong>3.6%</strong> of total routing spend." },
    { label: "⚡ CAPACITY & RISK", text: "Network operates at a balanced <strong>66.8%</strong> maximum utilization. R Virginia has comfortable headroom at <strong>66.8%</strong>." },
    { label: "📦 SERVICE LEVEL", text: "SLA breaches are at <strong>0.0%</strong> with optimal carrier coverage across all core lanes." },
    { label: "✅ RECOMMENDATION", text: "Maintain current configuration as the baseline benchmark for tactical changes." }
  ],
  strategic: [
    { label: "📊 EXECUTIVE SUMMARY (DEFAULT WORKFLOW)", text: "Running an unconstrained footprint scenario shows potential optimization opportunities. Total cost is <strong>$51.5M</strong>." },
    { label: "💰 COST ANALYSIS", text: "Cost per Unit is <strong>$8.39</strong>. B2C transit routes are minimized through high-volume lane consolidation." },
    { label: "⚡ CAPACITY & RISK", text: "Overutilization detected on unconstrained modes due to high volume accumulation." },
    { label: "📦 SERVICE LEVEL", text: "SLA breaches rise to <strong>46.0%</strong> due to lead time caps and long transits on collect terms." },
    { label: "✅ RECOMMENDATION", text: "Constrain utilization to <strong>85%</strong> to stabilize the footprint." }
  ],
  consolidation: [
    { label: "📊 EXECUTIVE SUMMARY (DEFAULT WORKFLOW)", text: "Consolidation scenario with Pharr TX and Stratford CT active. Total network spend is <strong>$8.8M</strong>." },
    { label: "💰 COST ANALYSIS", text: "Cost per Unit is <strong>$11.39</strong> due to lower volume efficiencies and longer regional transits." },
    { label: "⚡ CAPACITY & RISK", text: "High capacity utilization on Stratford CT, reaching peak thresholds." },
    { label: "📦 SERVICE LEVEL", text: "SLA breaches are low at <strong>5.24%</strong> with average delivery days at <strong>3.15 days</strong>." },
    { label: "✅ RECOMMENDATION", text: "Balance load across Pharr and Elwood to release Stratford bottleneck." }
  ]
};

export const AIScenarioNarrator: React.FC<AIScenarioNarratorProps> = ({
  activeScenarioName = '',
  selectedKey,
  onSelectedKeyChange,
  onGoToSuppression,
  defaultInsightResult,
  isDefaultInsightLoading = false,
}) => {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [sections, setSections] = useState<NarrativeSection[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const key = import.meta.env.VITE_ANTHROPIC_KEY;
    setHasKey(!!key);
  }, []);

  useEffect(() => {
    if (isDefaultInsightLoading) {
      setStatus("loading");
      setSections([]);
    } else if (defaultInsightResult) {
      const responseSections = defaultInsightResult.narrative || 
                               (Array.isArray(defaultInsightResult) ? defaultInsightResult : null);
      if (responseSections && responseSections.length > 0) {
        setSections(responseSections);
      } else {
        const fallback = MOCK_DEFAULT_NARRATIVE[selectedKey] || MOCK_NARRATIVES[selectedKey] || [];
        setSections(fallback);
      }
      setStatus("done");
    } else {
      setStatus("idle");
    }
  }, [defaultInsightResult, isDefaultInsightLoading, selectedKey]);

  const activeScenario = SCENARIOS[selectedKey];

  async function handleNarrate() {
    setStatus("loading");
    setSections([]);
    setErrorMsg("");
    setCopied(false);

    if (!hasKey) {
      // Demo mode fallback
      setTimeout(() => {
        setSections(MOCK_DEFAULT_NARRATIVE[selectedKey] || MOCK_NARRATIVES[selectedKey] || []);
        setStatus("done");
      }, 1500);
      return;
    }

    try {
      const result = await narrateScenario(activeScenario);
      setSections(result);
      setStatus("done");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Failed to connect to Anthropic API");
      setStatus("error");
    }
  }

  function fallbackCopyText(textStr: string) {
    const textArea = document.createElement("textarea");
    textArea.value = textStr;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  }

  function handleCopy() {
    const text = sections.map((s) => `${s.label}\n${s.text.replace(/<[^>]+>/g, "")}`).join("\n\n");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          fallbackCopyText(text);
        });
    } else {
      fallbackCopyText(text);
    }
  }

  return (
    <div className="space-y-6 fade-in">
      {/* API Key warning banner */}
      {/* {!hasKey && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 backdrop-blur-sm flex gap-3 text-amber-800 text-xs">
          <Key className="w-5 h-5 flex-shrink-0 text-amber-500 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-900 block mb-0.5">Demo Mode (Mocked Narratives)</span>
            No <code className="bg-amber-100/80 px-1 py-0.5 rounded text-amber-900 font-mono">VITE_ANTHROPIC_KEY</code> was found in your <code className="bg-amber-100/80 px-1 py-0.5 rounded text-amber-900 font-mono">.env</code>. The narrator is running in demo mode with pre-computed analysis summaries.
          </div>
        </div>
      )} */}

      {/* Main card */}
      <div className="surface-card p-0 overflow-hidden shadow-strong">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center text-lg shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">AI Scenario Analyst</h3>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">Generative Narration Layer</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {status === "idle" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                Ready to Analyze
              </span>
            )}
            {status === "loading" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 animate-pulse">
                Analyzing Scenario...
              </span>
            )}
            {status === "done" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                Analysis Complete
              </span>
            )}
            {status === "error" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                Analysis Error
              </span>
            )}

            <button
              onClick={handleNarrate}
              disabled={status === "loading"}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Narrate Scenario
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {status === "idle" && (
            <div className="text-center py-10 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-2xl mx-auto mb-4 border border-slate-100">
                🎙️
              </div>
              <h4 className="text-sm font-semibold text-slate-800 mb-1">Generate Narrative Report</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click the <strong className="text-slate-800">Narrate Scenario</strong> button above to let us explain the operational and cost impacts of this configuration.
              </p>
            </div>
          )}

          {status === "loading" && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              {/* Thinking dots */}
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" />
              </div>
              <span className="text-xs font-semibold text-blue-600 mt-2">
                We are the analyzing network constraints...
              </span>
              <p className="text-[11px] text-slate-400 max-w-xs text-center leading-relaxed">
                Reviewing active footprint, DC capacity profiles, and lane-level cost adjustments.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-red-800 text-xs flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <span className="font-semibold text-red-900 block mb-0.5">Narrator API Error</span>
                {errorMsg}
              </div>
            </div>
          )}

          {status === "done" && sections.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3.5">
                {sections.map((sec, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/20 hover:bg-slate-50/40 transition duration-150"
                  >
                    <div className="text-[10px] font-bold tracking-wider text-blue-600 mb-1.5 uppercase">
                      {sec.label}
                    </div>
                    <div
                      className="text-xs text-slate-600 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sec.text }}
                    />
                  </div>
                ))}
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap items-center gap-3 pt-5 mt-5 border-t border-slate-100">
                <button
                  onClick={handleNarrate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-narrate
                </button>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Narrative
                    </>
                  )}
                </button>
                {onGoToSuppression && (
                  <button
                    onClick={onGoToSuppression}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-slate-50 text-xs font-semibold text-blue-600 transition ml-auto"
                  >
                    View Suppression Readiness
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scenario switcher card for demonstration */}
      <div className="surface-card shadow-sm p-5">
        <h4 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-3">
          Simulate Another Scenario (Demo Selection)
        </h4>
        <div className="flex flex-wrap gap-2.5">
          {SCENARIOS_LIST.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                onSelectedKeyChange(s.key);
                setStatus("idle");
                setSections([]);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition duration-200 border ${
                selectedKey === s.key
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
