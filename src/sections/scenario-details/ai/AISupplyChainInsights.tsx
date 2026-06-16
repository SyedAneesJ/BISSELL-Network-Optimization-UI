import React from 'react';
import { InsightCard } from './InsightCard';
import { ZIP_DATA, ZipFootprintItem, SCENARIOS } from '../../../data/aiMockData';
import { AnimatedNumber } from './AnimatedNumber';
import { ProgressBar } from './ProgressBar';

interface AISupplyChainInsightsProps {
  selectedKey: string;
}

export const AISupplyChainInsights: React.FC<AISupplyChainInsightsProps> = ({ selectedKey }) => {
  const activeScenario = SCENARIOS[selectedKey] || SCENARIOS.tactical_dallas;
  const totalCost = activeScenario.totalCost;
  const scaleFactor = totalCost / 97500000;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in">
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
        number="7A"
        numberBg="#EF4444"
        title="D2C orders are the reason your DCs are over capacity — not B2B"
        category="Capacity · Space Utilisation · D2C Footprint"
        stats={[
          { value: "70%",    color: "#EF4444", label: "DC floor space consumed by D2C" },
          { value: "0.15 sqft", color: "#F59E0B", label: "D2C space per order" },
          { value: <AnimatedNumber value={5.2 * scaleFactor} suffix="M" decimals={1} />,   color: "#3B82F6", label: "D2C orders (56% more than B2B)" },
        ]}
        body={`D2C occupies <strong>${Math.round(198280 * scaleFactor).toLocaleString()} sq ft</strong> across the network vs B2B's ${Math.round(85451 * scaleFactor).toLocaleString()} sq ft — even though D2C drives only 7% of total cost. Every D2C volume increase pushes utilisation bars faster than expected.`}
        action="<strong>Action:</strong> Reroute the 10 highest-footprint D2C ZIPs from R Virginia to Dallas. Clears Overcap flags at zero cost penalty. See Ocean Exposure tab for the full ZIP list."
        actionType="red"
      />

      <InsightCard
        number="7B"
        numberBg="#6366F1"
        title="93% of network cost is B2B — and the tool only moves 28 cents of every dollar"
        category="Cost Risk · B2B Inbound Freight · Strategic"
        stats={[
          { value: "93%",  color: "#6366F1", label: "Network cost that is B2B" },
          { value: "72%",  color: "#EF4444", label: "B2B cost that is inbound ocean" },
          { value: "28%",  color: "#10B981", label: "B2B cost routing can influence" },
        ]}
        body={`<strong>$${(63.3 * scaleFactor).toFixed(1)}M of every $${(87.7 * scaleFactor).toFixed(1)}M</strong> in B2B cost is inbound ocean freight — decisions made upstream. The entire optimization engine is moving the 28%. A <strong>10% ocean rate increase = $${(6.7 * scaleFactor).toFixed(1)}M overnight</strong> with no DC routing lever to offset it.`}
        action="<strong>Action:</strong> Surface ocean freight sensitivity on the Summary screen. A 5% and 10% rate increase impact should be visible alongside total cost — giving leadership the full picture, not just the routing story."
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
