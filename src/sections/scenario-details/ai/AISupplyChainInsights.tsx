import React from 'react';
import { InsightCard } from './InsightCard';
import { ZIP_DATA, ZipFootprintItem, SCENARIOS } from '../../../data/aiMockData';
import { AnimatedNumber } from './AnimatedNumber';
import { ProgressBar } from './ProgressBar';
import { WorkflowInsight } from './AICopilotDrawer';

interface AISupplyChainInsightsProps {
  selectedKey: string;
  workflowInsights: WorkflowInsight[];
  defaultInsightResult?: any;
}

export const AISupplyChainInsights: React.FC<AISupplyChainInsightsProps> = ({
  selectedKey,
  workflowInsights,
  defaultInsightResult,
}) => {
  const activeScenario = SCENARIOS[selectedKey] || SCENARIOS.tactical_dallas;
  const totalCost = activeScenario.totalCost;
  const scaleFactor = totalCost / 97500000;

  // Determine the single active live insight
  const activeLiveInsight = workflowInsights.length > 0
    ? workflowInsights[0]
    : defaultInsightResult
      ? {
          id: "default-workflow-insight",
          title: defaultInsightResult.title || `Default Network Optimization Analysis for ${selectedKey === 'tactical_dallas' ? 'Tactical Pro Forma' : (selectedKey === 'baseline' ? 'US Baseline' : selectedKey)}`,
          category: defaultInsightResult.category || "AI Workflow Output · Baseline Assessment",
          stats: defaultInsightResult.stats || [
            { value: "4 Active", color: "#3B82F6", label: "DC Count" },
            { value: "1.69 days", color: "#10B981", label: "Avg Lead Time" },
            { value: "0.0% SLA", color: "#10B981", label: "Breach Rate" }
          ],
          body: defaultInsightResult.body || "The default network assessment has run successfully. All nodes are functioning within normal capacity constraints. Click any DC Suppression simulator to evaluate alternate network assignments.",
          action: defaultInsightResult.action || "<strong>Recommendation:</strong> Proceed with testing individual node suppression to check redundancy limits.",
          actionType: defaultInsightResult.actionType || "blue",
        }
      : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in">
      {/* Show exactly one live insight at a time */}
      {activeLiveInsight && (
        <InsightCard
          key={activeLiveInsight.id || "live-insight"}
          number="LIVE"
          numberBg="#8B5CF6"
          title={activeLiveInsight.title}
          category={activeLiveInsight.category}
          stats={activeLiveInsight.stats}
          body={activeLiveInsight.body}
          action={activeLiveInsight.action}
          actionType={activeLiveInsight.actionType || "blue"}
          fullWidth
        />
      )}

      {/* Static Mock Insights (Max 3) */}
      <InsightCard
        number="3"
        numberBg="#3B82F6"
        title="Know the suppression cost before you run a single scenario"
        category="Scenario Planning · DC Suppression · Risk Pre-Assessment"
        stats={[
          { value: <AnimatedNumber value={5.1 * scaleFactor} prefix="$" suffix="M" decimals={1} />, color: "#EF4444", label: "Dallas suppression penalty" },
          { value: <AnimatedNumber value={Math.round(1492 * scaleFactor)} />, color: "#F59E0B", label: "Lanes displaced" },
          { value: "0",     color: "#10B981", label: "Lanes with no backup" },
        ]}
        body="All the information needed to predict suppression cost <strong>already exists in the Ranked Options tab</strong>. When a DC is suppressed, Option #1 falls to Option #2 — that cost delta is the suppression penalty. Pre-computed for all four DCs instantly."
        action="<strong>Action:</strong> Use the Suppression Readiness tab to see all four DCs' pre-computed penalties before opening the scenario wizard."
        actionType="blue"
      />

      <InsightCard
        number="5"
        numberBg="#F59E0B"
        title="Elwood is carrying 3× more LTL freight than Dallas — $6.5M over-spend"
        category="Cost Reduction · LTL Freight · DC Routing"
        stats={[
          { value: <AnimatedNumber value={9.6 * scaleFactor} prefix="$" suffix="M" decimals={1} />, color: "#EF4444", label: "Elwood LTL spend" },
          { value: <AnimatedNumber value={3.2 * scaleFactor} prefix="$" suffix="M" decimals={1} />, color: "#10B981", label: "Dallas LTL spend" },
          { value: <AnimatedNumber value={6.5 * scaleFactor} prefix="$" suffix="M" decimals={1} />, color: "#F59E0B", label: "Recoverable saving" },
        ]}
        body="<strong>341 high-freight B2B lanes</strong> currently assigned to Elwood could be served more cheaply from Dallas. This isn't because Elwood serves harder customers — it's a routing decision. Elwood LTL = 9.8% of its total cost vs Dallas at 3.6%."
        action="<strong>Action:</strong> Run a Tactical Pro Forma with the top 50 high-LTL Elwood lanes reassigned to Dallas. Top offenders: ZIP 989 ($783K LTL), ZIP 924 ($475K), ZIP 957 ($370K)."
        actionType="amber"
      />

      <InsightCard
        number="8"
        numberBg="#10B981"
        title="10 ZIP codes are responsible for your Overcap problem — and most can move to Dallas with no cost penalty"
        fullWidth
        stats={[
          { value: <AnimatedNumber value={Math.round(3682 * scaleFactor)} suffix=" sqft" />, color: "#EF4444", label: "ZIP 945 at R Virginia — single biggest lane" },
          { value: <AnimatedNumber value={Math.round(1990 * scaleFactor)} suffix=" sqft" />, color: "#10B981", label: "Same ZIP 945 via Dallas — 46% smaller" },
          { value: "45%",        color: "#F59E0B", label: "Average space reduction top 10 ZIPs" },
          { value: "$0",         color: "#10B981", label: "Additional cost penalty" },
        ]}
        body="<strong>Just 10 ZIPs are driving your Overcap flags.</strong> Routing these through Dallas reduces space requirement by 45% on average — and Dallas is already the cheapest DC for most of them. This is the highest-impact, lowest-risk action in the entire network."
        action="<strong>Recommended action:</strong> Run a Consolidation Tactical scenario with ZIPs 945, 606, 481, 112, 900, 117, 921, 600, 920, and 770 locked to Dallas. The Overcap flags on R Virginia and Elwood will materially reduce — potentially clearing entirely."
        actionType="green"
      >
        <ZipFootprint scaleFactor={scaleFactor} />
      </InsightCard>
    </div>
  );
};

const ZipFootprint: React.FC<{ scaleFactor: number }> = ({ scaleFactor }) => {
  const maxVal = Math.max(...ZIP_DATA.map((z: ZipFootprintItem) => z.rva));
  
  return (
    <div className="px-5 pb-5 space-y-3">
      {ZIP_DATA.map((z: ZipFootprintItem) => {
        const scaledRva = Math.round(z.rva * scaleFactor);
        const scaledDal = Math.round(z.dal * scaleFactor);
        const scaledSave = Math.round(z.save * scaleFactor);
        const maxScaledVal = maxVal * scaleFactor;
        const rvaW = Math.round((scaledRva / maxScaledVal) * 100);
        const dalW = Math.round((scaledDal / maxScaledVal) * 100);
        
        return (
          <div key={z.zip} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-b-0">
            <div className="w-12 py-1 text-center text-xs font-bold bg-slate-800 text-white rounded-lg flex-shrink-0">
              {z.zip}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[10px] font-medium text-slate-400 mb-1">
                <span>{z.ch} · R Virginia: <AnimatedNumber value={scaledRva} /> sqft</span>
                <span>Dallas: <AnimatedNumber value={scaledDal} /> sqft</span>
              </div>
              <div className="flex items-center gap-1">
                <ProgressBar targetWidth={rvaW} color="#EF4444" className="h-2 rounded transition-all duration-800 ease-out" />
                <ProgressBar targetWidth={dalW} color="#10B981" className="h-2 rounded transition-all duration-800 ease-out" />
              </div>
            </div>
            
            <div className="w-20 text-right text-xs font-bold text-green-600 flex-shrink-0">
              -<AnimatedNumber value={scaledSave} suffix=" sqft" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
