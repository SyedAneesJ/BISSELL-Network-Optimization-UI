import React, { useEffect, useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button, KPICard } from '@/components/ui';

interface AnimatedBarSegmentProps {
  value: number;
  total: number;
  className: string;
  ariaLabel: string;
}

const AnimatedBarSegment: React.FC<AnimatedBarSegmentProps> = ({
  value,
  total,
  className,
  ariaLabel,
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    setAnimatedValue(0);
    const id = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        setAnimatedValue(value);
      });
      return () => cancelAnimationFrame(id2);
    });
    return () => cancelAnimationFrame(id);
  }, [value]);

  const style = useMemo(() => {
    if (animatedValue <= 0 || total <= 0) {
      return {
        flex: '0 0 0%',
        minWidth: '0px',
        transition: 'flex 800ms cubic-bezier(0.4, 0, 0.2, 1)',
      };
    }
    const pct = (animatedValue / total) * 100;
    return {
      flex: `${Math.max(pct, 0.1)} 1 0%`,
      minWidth: '8px',
      transition: 'flex 800ms cubic-bezier(0.4, 0, 0.2, 1)',
    };
  }, [animatedValue, total]);

  return <div className={className} style={style} aria-label={ariaLabel} />;
};
import {
  ScenarioRunConfig,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
  getAdditionalCostsForDc,
} from '@/data';
import { formatCurrencyOrNA, formatDecimalOrNA, formatNumberOrNA, formatTextOrNA } from '@/utils';

interface ScenarioSummaryTabProps {
  scenario: ScenarioRunHeader;
  scenarioConfig?: ScenarioRunConfig;
  entityLabels: { first: string; second: string };
  dcResults: ScenarioRunResultsDC[];
  totalExtendedRevenue: number;
  laneResults: ScenarioRunResultsLane[];
  topFootprintLanes: ScenarioRunResultsLane[];
  onExportDCDetails?: () => void;
  exportDCDetailsActive?: boolean;
}

export const ScenarioSummaryTab: React.FC<ScenarioSummaryTabProps> = ({
  scenario,
  scenarioConfig,
  entityLabels,
  dcResults,
  totalExtendedRevenue,
  laneResults,
  topFootprintLanes,
  onExportDCDetails,
  exportDCDetailsActive = false,
}) => {
  const parsedUtilCap = Number.parseFloat(String(scenario.UtilizationCap || ''));
  const utilCapPct = Number.isFinite(scenarioConfig?.UtilCapPct)
    ? Number(scenarioConfig?.UtilCapPct)
    : (Number.isFinite(parsedUtilCap) ? parsedUtilCap : 100);
  const isUsBaseline = (() => {
    const region = String(scenario.Region || '').trim().toLowerCase();
    if (region !== 'us' && region !== 'canada') return false;
    const type = String(scenario.ScenarioType || '').toLowerCase();
    const name = String(scenario.RunName || '').toLowerCase();
    return scenario.ScenarioRunID === 'SR001' ||
      scenario.ScenarioRunID === 'SR005' ||
      scenario.ScenarioRunID === 'SR_ETL_11_CANADA_CANADA_BASELINE_NA' ||
      type.includes('baseline') ||
      name.includes('baseline');
  })();
  const getUtilSpace = (dc: ScenarioRunResultsDC): number => {
    if (dc.IsSuppressed === 'Y') return 0;
    const capacity = Number(dc.ActualSpace ?? 0);
    if (!Number.isFinite(capacity) || capacity <= 0) return 0;
    return capacity * (Math.max(0, Math.min(100, utilCapPct)) / 100);
  };

  const clampBarWidth = (numerator: number, denominator: number) => {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
    return Math.max(0, Math.min(100, (numerator / denominator) * 100));
  };

  // Returns the true percentage (unclamped) against actual DC capacity
  const truePct = (numerator: number, dc: ScenarioRunResultsDC): number => {
    const base = Number(dc.ActualSpace ?? dc.SpaceCore ?? 0);
    if (!Number.isFinite(base) || base <= 0) return 0;
    return (numerator / base) * 100;
  };

  const getSegmentStyle = (value: number, total: number) => {
    if (value <= 0 || total <= 0) {
      return {
        flex: '0 0 0%',
        minWidth: '0px',
      };
    }
  
    const pct = (value / total) * 100;
  
    return {
      flex: `${Math.max(pct, 0.1)} 1 0%`,
      minWidth: '8px',
    };
  };

  const maxUtilDc = dcResults.reduce(
    (max, dc) => (Number(dc.UtilPct) > (max ? Number(max.UtilPct) : -1) ? dc : max),
    null as ScenarioRunResultsDC | null,
  );
  const fixedCostComponents = dcResults.reduce((acc, dc) => {
    if (dc.IsSuppressed === 'Y') return acc;
    const costs = getAdditionalCostsForDc(dc.DCName);
    acc.rent += dc.Rent ?? costs.Rent;
    acc.managementFee += dc.ManagementFee ?? costs.ManagementFee;
    return acc;
  }, { rent: 0, managementFee: 0 });
  const additionalCost = fixedCostComponents.rent + fixedCostComponents.managementFee;

  // Lane rows can use different cost authorities.  The exclusion-based lane
  // cost does not contain Distribution Fixed, while BASELINE_COST_TO_SERVE
  // and FULL do.  Normalize every row to the exclusion basis before showing
  // Lane Data Cost so Distribution Fixed can be displayed exactly once.
  const laneDataCostExcludingDistributionFixed = (lane: (typeof laneResults)[number]): number => {
    const laneCost = Number(lane.TotalCost ?? lane.LaneCost ?? lane.RelocatableCost ?? 0);
    if (!Number.isFinite(laneCost)) return 0;

    const costBasis = String(lane.CostBasis ?? '').trim().toUpperCase();
    const includesDistributionFixed = costBasis === 'BASELINE_COST_TO_SERVE' || costBasis === 'FULL';
    if (!includesDistributionFixed) return laneCost;

    const distributionFixed = Number(lane.DistributionFixedCost ?? 0);
    return Number.isFinite(distributionFixed)
      ? Math.max(0, laneCost - distributionFixed)
      : laneCost;
  };

  // Lane-level scenario cost is the variable lane-data cost. Fixed rent and
  // management costs are shown separately; do not subtract them from the
  // actual Prepaid/Collect lane totals.
  const laneDataCostTotal = isUsBaseline
    ? dcResults.reduce((sum, dc) => sum + (dc.InboundSpend ?? 0) + (dc.DistributionCost ?? 0) + (dc.ParcelSpend ?? 0) + (dc.LtlSpend ?? 0) + (dc.TlSpend ?? 0), 0)
    : laneResults.reduce((sum, lane) => {
      return sum + laneDataCostExcludingDistributionFixed(lane);
    }, 0);
  const baseCost = laneDataCostTotal > 0 ? laneDataCostTotal : Math.max(0, Number(scenario.TotalCost) || 0);

  const inboundCostTotal = dcResults.reduce((sum, dc) => sum + (dc.InboundSpend ?? 0), 0);
  const distributionCostTotal = dcResults.reduce((sum, dc) => sum + (dc.DistributionCost ?? 0), 0);
  const parcelCostTotal = dcResults.reduce((sum, dc) => sum + (dc.ParcelSpend ?? 0), 0);
  const ltlCostTotal = dcResults.reduce((sum, dc) => sum + (dc.LtlSpend ?? 0), 0);
  const tlCostTotal = dcResults.reduce((sum, dc) => sum + (dc.TlSpend ?? 0), 0);
  const outboundCostTotal = parcelCostTotal + ltlCostTotal + tlCostTotal;
  const contractLaborTotal = dcResults.reduce((sum, dc) => {
    if (dc.IsSuppressed === 'Y') return sum;
    const costs = getAdditionalCostsForDc(dc.DCName);
    return sum + (dc.ContractLabor ?? costs.ContractLabor);
  }, 0);

  // Distribution fixed is part of distribution/variable scenario cost, not
  // the separate rent + management fixed-cost KPI. Lane Data Cost above is
  // normalized to exclude it, so it is added back exactly once here.
  const distributionFixedCostTotal = isUsBaseline
    ? 0
    : laneResults.reduce((sum, lane) => {
      const value = Number(lane.DistributionFixedCost ?? 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

  const variableCostTotal = baseCost + distributionFixedCostTotal + contractLaborTotal;
  const baselineDatasetTotalCost = isUsBaseline
    ? dcResults.reduce((sum, dc) => sum + Number(dc.TotalCost ?? 0), 0)
    : 0;
  const totalCostDisplay = isUsBaseline && baselineDatasetTotalCost > 0
    ? baselineDatasetTotalCost
    : variableCostTotal + additionalCost > 0
      ? variableCostTotal + additionalCost
      : Math.max(0, Number(scenario.TotalCost) || 0);

  const termCostBreakdown = useMemo(() => {
    const laneTotals = { prepaid: 0, collect: 0, other: 0 };
    const termUnits = { prepaid: 0, collect: 0, other: 0 };
    const componentTotals = {
      inbound: { prepaid: 0, collect: 0, other: 0 },
      distribution: { prepaid: 0, collect: 0, other: 0 },
      distributionFixed: { prepaid: 0, collect: 0, other: 0 },
      parcel: { prepaid: 0, collect: 0, other: 0 },
      ltl: { prepaid: 0, collect: 0, other: 0 },
      tl: { prepaid: 0, collect: 0, other: 0 },
    };

    laneResults.forEach((lane) => {
      const laneCost = laneDataCostExcludingDistributionFixed(lane);
      if (!Number.isFinite(laneCost)) return;

      const terms = String(lane.Terms || lane.FreightTerms || '').trim().toLowerCase();
      const bucket = terms.includes('collect') && !terms.includes('prepaid')
        ? 'collect'
        : terms.includes('prepaid') && !terms.includes('collect')
          ? 'prepaid'
          : 'other';
      const units = Number(lane.TotalCount ?? lane.TotalUnits ?? lane.VolumeUnits ?? 0);
      laneTotals[bucket] += laneCost;
      componentTotals.inbound[bucket] += Number(lane.InboundSpend ?? 0) || 0;
      componentTotals.distribution[bucket] += Number(lane.DistributionCost ?? 0) || 0;
      componentTotals.distributionFixed[bucket] += Number(lane.DistributionFixedCost ?? 0) || 0;
      componentTotals.parcel[bucket] += Number(lane.ParcelSpend ?? 0) || 0;
      componentTotals.ltl[bucket] += Number(lane.LtlSpend ?? 0) || 0;
      componentTotals.tl[bucket] += Number(lane.TlSpend ?? 0) || 0;
      if (Number.isFinite(units) && units > 0) termUnits[bucket] += units;
    });

    const laneTotal = laneTotals.prepaid + laneTotals.collect + laneTotals.other;
    const total = {
      prepaid: laneTotals.prepaid,
      collect: laneTotals.collect,
      other: laneTotals.other,
    };
    const fixedTotal = Math.max(0, additionalCost);
    const fixed = {
      prepaid: laneTotal > 0 ? fixedTotal * (laneTotals.prepaid / laneTotal) : 0,
      collect: laneTotal > 0 ? fixedTotal * (laneTotals.collect / laneTotal) : 0,
      other: laneTotal > 0 ? fixedTotal * (laneTotals.other / laneTotal) : fixedTotal,
    };
    const costPerUnit = {
      prepaid: termUnits.prepaid > 0 ? total.prepaid / termUnits.prepaid : 0,
      collect: termUnits.collect > 0 ? total.collect / termUnits.collect : 0,
      other: termUnits.other > 0 ? total.other / termUnits.other : 0,
    };
    const contractLabor = {
      prepaid: laneTotal > 0 ? contractLaborTotal * (laneTotals.prepaid / laneTotal) : 0,
      collect: laneTotal > 0 ? contractLaborTotal * (laneTotals.collect / laneTotal) : 0,
      other: laneTotal > 0 ? contractLaborTotal * (laneTotals.other / laneTotal) : contractLaborTotal,
    };

    const scaleComponentByDisplayedTotal = (
      rawValues: { prepaid: number; collect: number; other: number },
      displayedTotal: number,
    ) => {
      const rawTotal = rawValues.prepaid + rawValues.collect + rawValues.other;
      if (rawTotal <= 0 || displayedTotal <= 0) return { prepaid: 0, collect: 0, other: 0 };
      const componentScale = displayedTotal / rawTotal;
      return {
        prepaid: rawValues.prepaid * componentScale,
        collect: rawValues.collect * componentScale,
        other: rawValues.other * componentScale,
      };
    };

    const components = {
      inbound: scaleComponentByDisplayedTotal(componentTotals.inbound, inboundCostTotal),
      distribution: scaleComponentByDisplayedTotal(componentTotals.distribution, distributionCostTotal),
      distributionFixed: componentTotals.distributionFixed,
      parcel: scaleComponentByDisplayedTotal(componentTotals.parcel, parcelCostTotal),
      ltl: scaleComponentByDisplayedTotal(componentTotals.ltl, ltlCostTotal),
      tl: scaleComponentByDisplayedTotal(componentTotals.tl, tlCostTotal),
    };

    return { total, fixed, costPerUnit, contractLabor, components };
  }, [additionalCost, contractLaborTotal, distributionCostTotal, inboundCostTotal, laneResults, ltlCostTotal, parcelCostTotal, tlCostTotal]);

  const termBreakdownContent = (values: { prepaid: number; collect: number; other: number }, decimals = 0) => {
    const formatValue = (value: number) => `$${value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
    return (
      <div className="space-y-1">
        <div className="flex justify-between"><span>Prepaid:</span><span className="font-medium text-slate-700">{formatValue(values.prepaid)}</span></div>
        <div className="flex justify-between"><span>Collect:</span><span className="font-medium text-slate-700">{formatValue(values.collect)}</span></div>
        {values.other > 0 && (
          <div className="flex justify-between"><span>Other:</span><span className="font-medium text-slate-700">{formatValue(values.other)}</span></div>
        )}
      </div>
    );
  };

  const variableCostBreakdownContent = () => (
    <div className="space-y-2">
      <div className="flex justify-between font-semibold text-slate-600">
        <span>Lane Data Cost (excl. Distribution Fixed):</span>
        <span>{formatCurrencyOrNA(baseCost, 0)}</span>
      </div>
      <div className="pl-2 space-y-1 text-xs text-slate-500">
        <div className="flex justify-between"><span>Prepaid:</span><span>{formatCurrencyOrNA(termCostBreakdown.total.prepaid, 0)}</span></div>
        <div className="flex justify-between"><span>Collect:</span><span>{formatCurrencyOrNA(termCostBreakdown.total.collect, 0)}</span></div>
        {termCostBreakdown.total.other > 0 && (
          <div className="flex justify-between"><span>Other:</span><span>{formatCurrencyOrNA(termCostBreakdown.total.other, 0)}</span></div>
        )}
      </div>
      <div className="flex justify-between font-semibold text-slate-600 pt-2">
        <span>Distribution Fixed:</span>
        <span>{formatCurrencyOrNA(distributionFixedCostTotal, 0)}</span>
      </div>
      <div className="pl-2 space-y-1 text-xs text-slate-500">
        <div className="flex justify-between"><span>Prepaid:</span><span>{formatCurrencyOrNA(termCostBreakdown.components.distributionFixed.prepaid, 0)}</span></div>
        <div className="flex justify-between"><span>Collect:</span><span>{formatCurrencyOrNA(termCostBreakdown.components.distributionFixed.collect, 0)}</span></div>
        {termCostBreakdown.components.distributionFixed.other > 0 && (
          <div className="flex justify-between"><span>Other:</span><span>{formatCurrencyOrNA(termCostBreakdown.components.distributionFixed.other, 0)}</span></div>
        )}
      </div>
      <div className="flex justify-between font-semibold text-slate-600 pt-2">
        <span>Contract Labor:</span>
        <span>{formatCurrencyOrNA(contractLaborTotal, 0)}</span>
      </div>
    </div>
  );

  const fixedCostBreakdownContent = () => (
    <div className="space-y-1">
      <div className="flex justify-between"><span>Rent:</span><span className="font-medium text-slate-700">{formatCurrencyOrNA(fixedCostComponents.rent, 0)}</span></div>
      <div className="flex justify-between"><span>Management Fee:</span><span className="font-medium text-slate-700">{formatCurrencyOrNA(fixedCostComponents.managementFee, 0)}</span></div>
    </div>
  );

  const totalCostBreakdownContent = () => (
    <div className="space-y-1">
      <div className="flex justify-between"><span>Lane Data Cost (excl. Distribution Fixed):</span><span className="font-medium text-slate-700">{formatCurrencyOrNA(baseCost, 0)}</span></div>
      <div className="flex justify-between"><span>Distribution Fixed:</span><span className="font-medium text-slate-700">{formatCurrencyOrNA(distributionFixedCostTotal, 0)}</span></div>
      <div className="flex justify-between"><span>Contract Labor:</span><span className="font-medium text-slate-700">{formatCurrencyOrNA(contractLaborTotal, 0)}</span></div>
      <div className="flex justify-between"><span>Rent:</span><span className="font-medium text-slate-700">{formatCurrencyOrNA(fixedCostComponents.rent, 0)}</span></div>
      <div className="flex justify-between"><span>Management Fee:</span><span className="font-medium text-slate-700">{formatCurrencyOrNA(fixedCostComponents.managementFee, 0)}</span></div>
    </div>
  );

  const termCostPctBreakdown = (values: { prepaid: number; collect: number; other: number }) => {
    const formatValue = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    const formatPct = (value: number) => hasRevenueDenominator
      ? `${((value / totalExtendedRevenue) * 100).toFixed(2)}%`
      : 'NA';
    const row = (label: string, value: number) => (
      <div className="flex justify-between gap-2">
        <span>{label}:</span>
        <span className="font-medium text-slate-700">{formatValue(value)} <span className="text-slate-400">| {formatPct(value)}</span></span>
      </div>
    );
    return (
      <div className="space-y-1">
        {row('Prepaid', values.prepaid)}
        {row('Collect', values.collect)}
        {values.other > 0 && row('Other', values.other)}
      </div>
    );
  };

  const hasRevenueDenominator = Number.isFinite(totalExtendedRevenue) && totalExtendedRevenue > 0;
  const revenuePct = (cost: number): string => hasRevenueDenominator
    ? `${((cost / totalExtendedRevenue) * 100).toFixed(2)}%`
    : 'NA';
  const inboundPct = revenuePct(inboundCostTotal);
  const dstPct = revenuePct(distributionCostTotal);
  const parcelPct = revenuePct(parcelCostTotal);
  const ltlPct = revenuePct(ltlCostTotal);
  const tlPct = revenuePct(tlCostTotal);
  const outboundPct = revenuePct(outboundCostTotal);

  const formatCostPct = (cost: number, pctStr: string) => (
    <span className="inline-flex items-baseline gap-1 flex-wrap">
      <span className="text-sm font-normal text-slate-500">
        ${cost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </span>
      <span className="text-slate-300 text-sm font-normal mx-0.5">|</span>
      <span className="text-2xl font-semibold text-slate-900">{pctStr}</span>
    </span>
  );

  const effectiveMaxUtil = scenario.TotalSpaceRequired > 0
    ? (scenario.SpaceCore / scenario.TotalSpaceRequired) * 100
    : (scenario.MaxUtilPct || 0);
  const maxUtilDisplay = effectiveMaxUtil > 0
    ? `${effectiveMaxUtil.toFixed(2)}%`
    : 'NA';

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {onExportDCDetails && (
          <Button
            variant="secondary"
            size="small"
            icon={<Download className="w-4 h-4" />}
            onClick={onExportDCDetails}
            disabled={exportDCDetailsActive}
            className={exportDCDetailsActive ? 'bg-amber-50 text-amber-800' : ''}
          >
            {exportDCDetailsActive ? 'Exporting DC Details…' : 'Export DC Details CSV'}
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Cost Metrics */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span> Cost Metrics
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard label="Total Cost" value={totalCostDisplay} format="currency" expandableContent={isUsBaseline ? undefined : totalCostBreakdownContent()} />
            <KPICard label="Total Extended Revenue" value={hasRevenueDenominator ? totalExtendedRevenue : 'NA'} format={hasRevenueDenominator ? 'currency' : undefined} />
            <KPICard label="Variable Cost" value={variableCostTotal} format="currency" expandableContent={isUsBaseline ? undefined : variableCostBreakdownContent()} />
            <KPICard label="Fixed Cost" value={additionalCost} format="currency" expandableContent={isUsBaseline ? undefined : fixedCostBreakdownContent()} />
            <KPICard label="Cost per Unit" value={formatCurrencyOrNA(scenario.CostPerUnit, 2)} expandableContent={isUsBaseline ? undefined : termBreakdownContent(termCostBreakdown.costPerUnit, 2)} />
          </div>
        </div>

        {/* Cost % Sales */}
        {(inboundCostTotal > 0 || outboundCostTotal > 0 || distributionCostTotal > 0) && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span> Cost % Sales
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard label="Inbound % Revenue" value={formatCostPct(inboundCostTotal, inboundPct)} expandableContent={isUsBaseline ? undefined : termCostPctBreakdown(termCostBreakdown.components.inbound)} />
              <KPICard label="DST % Revenue" value={formatCostPct(distributionCostTotal, dstPct)} expandableContent={isUsBaseline ? undefined : termCostPctBreakdown(termCostBreakdown.components.distribution)} />
              <KPICard label="OB Parcel % Revenue" value={formatCostPct(parcelCostTotal, parcelPct)} expandableContent={isUsBaseline ? undefined : termCostPctBreakdown(termCostBreakdown.components.parcel)} />
              <KPICard label="OB LTL % Revenue" value={formatCostPct(ltlCostTotal, ltlPct)} expandableContent={isUsBaseline ? undefined : termCostPctBreakdown(termCostBreakdown.components.ltl)} />
              <KPICard label="OB TL % Revenue" value={formatCostPct(tlCostTotal, tlPct)} expandableContent={isUsBaseline ? undefined : termCostPctBreakdown(termCostBreakdown.components.tl)} />
              <KPICard 
                label="OB Total % Revenue" 
                value={formatCostPct(outboundCostTotal, outboundPct)} 
                expandableContent={isUsBaseline ? undefined : termCostPctBreakdown({
                  prepaid: termCostBreakdown.components.parcel.prepaid + termCostBreakdown.components.ltl.prepaid + termCostBreakdown.components.tl.prepaid,
                  collect: termCostBreakdown.components.parcel.collect + termCostBreakdown.components.ltl.collect + termCostBreakdown.components.tl.collect,
                  other: termCostBreakdown.components.parcel.other + termCostBreakdown.components.ltl.other + termCostBreakdown.components.tl.other,
                })}
                tooltip={`Parcel: $${parcelCostTotal.toLocaleString()}\nLTL: $${ltlCostTotal.toLocaleString()}\nTL: $${tlCostTotal.toLocaleString()}`}
              />
            </div>
          </div>
        )}

        {/* Parcel Service Metrics */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> Parcel Service Metrics
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard label="Avg Delivery Days Actual" value={formatDecimalOrNA(scenario.AvgDeliveryDays, 2)} />
            <KPICard label=" Estimated E2E - Standard HD" value={formatDecimalOrNA(scenario.AvgTransitDays, 2)} />
            {/* <KPICard label="SLA Breach %" value={Number.isFinite(scenario.SLABreachPct) ? scenario.SLABreachPct : 'NA'} format="decimal" /> */}
          </div>
        </div>

        {/* Space & Volume Metrics */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span> Space & Volume Metrics
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard label="Total Space" value={scenario.TotalSpaceRequired} format="number" />
            <KPICard label={`Space ${entityLabels.first}`} value={scenario.SpaceCore} format="number" />
            <KPICard label={`Space ${entityLabels.second}`} value={scenario.SpaceBCV} format="number" />
            <KPICard label="Utilization %" value={maxUtilDisplay} />
            {/* <KPICard label="Total Count" value={formatNumberOrNA(scenario.TotalCount)} /> */}
          </div>
        </div>
      </div>

      {scenarioConfig ? (
        <div className="surface-panel p-5">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Scenario Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-600">Active DCs:</span> {scenarioConfig.ActiveDCs && scenarioConfig.ActiveDCs !== 'NA' ? scenarioConfig.ActiveDCs : 'None'}</div>
            <div><span className="text-slate-600">Suppressed DCs:</span> {scenarioConfig.SuppressedDCs && scenarioConfig.SuppressedDCs !== 'NA' ? scenarioConfig.SuppressedDCs : 'None'}</div>
            <div><span className="text-slate-600">Footprint Mode:</span> {formatTextOrNA(scenarioConfig.FootprintMode)}</div>
            <div><span className="text-slate-600">Util Cap:</span> {scenarioConfig.UtilCapPct ? `${scenarioConfig.UtilCapPct}%` : 'NA'}</div>
            <div><span className="text-slate-600">Level Load:</span> {formatTextOrNA(scenarioConfig.LevelLoadMode)}</div>
            {/* <div><span className="text-slate-600">Lead Time Cap:</span> {formatTextOrNA(scenarioConfig.LeadTimeCapDays)}</div> */}
            <div><span className="text-slate-600">Cost vs Service:</span> {formatTextOrNA(scenarioConfig.CostVsServiceWeight)}</div>
            <div><span className="text-slate-600">Relocation Prepaid:</span> {formatTextOrNA(scenarioConfig.AllowRelocationPrepaid)}</div>
            <div><span className="text-slate-600">Relocation Collect:</span> {formatTextOrNA(scenarioConfig.AllowRelocationCollect)}</div>
            <div><span className="text-slate-600">Collect Treatment:</span> {formatTextOrNA(scenario.CollectTreatment)}</div>
          </div>
        </div>
      ) : (
        <div className="surface-panel p-5">
          <h3 className="mb-2 text-lg font-semibold text-slate-900">Scenario Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-600">Footprint Mode:</span> {formatTextOrNA(scenario.FootprintMode)}</div>
            <div><span className="text-slate-600">Level Load:</span> {formatTextOrNA(scenario.LevelLoad)}</div>
            <div><span className="text-slate-600">Utilization Cap:</span> {formatTextOrNA(scenario.UtilizationCap)}</div>
            <div><span className="text-slate-600">Collect Treatment:</span> {formatTextOrNA(scenario.CollectTreatment)}</div>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">DC Scorecard</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dcResults.map((dc) => {
            const isBaseline = scenario.ScenarioRunID === 'SR001' || String(scenario.ScenarioType || '').toLowerCase().includes('baseline');
            const dcCosts = getAdditionalCostsForDc(dc.DCName);
            const rentVal = dc.Rent ?? dcCosts.Rent;
            const laborVal = dc.ContractLabor ?? dcCosts.ContractLabor;
            const feeVal = dc.ManagementFee ?? dcCosts.ManagementFee;
            const addCost = rentVal + laborVal + feeVal;

            // Distribution fixed is part of Distribution Cost. Fixed Cost is Rent + Management Fee.
            const fixedCostVal = rentVal + feeVal;

            const baseCostDisplay = isBaseline 
              ? Math.max(0, dc.TotalCost - fixedCostVal) 
              : dc.TotalCost + (dc.IsSuppressed === 'N' ? laborVal : 0);
            const totalCostDisplay = isBaseline ? dc.TotalCost : dc.TotalCost + (dc.IsSuppressed === 'N' ? addCost : 0);

            const inboundVal = dc.InboundSpend ?? 0;
            const outboundVal = (dc.ParcelSpend ?? 0) + (dc.LtlSpend ?? 0) + (dc.TlSpend ?? 0);
            const distributionVal = dc.DistributionCost ?? 0;

            return (
              <DcScorecardCard
                key={dc.DCName}
                dc={dc}
                isBaseline={isBaseline}
                rentVal={rentVal}
                laborVal={laborVal}
                feeVal={feeVal}
                fixedCostDisplay={dc.IsSuppressed === 'N' ? fixedCostVal : 0}
                baseCostDisplay={baseCostDisplay}
                totalCostDisplay={totalCostDisplay}
                inboundVal={inboundVal}
                outboundVal={outboundVal}
                distributionVal={distributionVal}
                getUtilSpace={getUtilSpace}
                clampBarWidth={clampBarWidth}
                truePct={truePct}
                utilCapPct={utilCapPct}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface DcScorecardCardProps {
  dc: ScenarioRunResultsDC;
  isBaseline: boolean;
  rentVal: number;
  laborVal: number;
  feeVal: number;
  fixedCostDisplay: number;
  baseCostDisplay: number;
  totalCostDisplay: number;
  inboundVal: number;
  outboundVal: number;
  distributionVal: number;
  getUtilSpace: (dc: ScenarioRunResultsDC) => number;
  clampBarWidth: (numerator: number, denominator: number) => number;
  truePct: (numerator: number, dc: ScenarioRunResultsDC) => number;
  utilCapPct: number;
}

const DcScorecardCard: React.FC<DcScorecardCardProps> = ({
  dc,
  isBaseline,
  rentVal,
  laborVal,
  feeVal,
  fixedCostDisplay,
  baseCostDisplay,
  totalCostDisplay,
  inboundVal,
  outboundVal,
  distributionVal,
  getUtilSpace,
  clampBarWidth,
  truePct,
  utilCapPct,
}) => {
  const [varExpanded, setVarExpanded] = useState(false);
  const [fixedExpanded, setFixedExpanded] = useState(false);

  const hasVarDetails = dc.IsSuppressed === 'N' && (inboundVal > 0 || outboundVal > 0 || distributionVal > 0 || laborVal > 0);
  const hasFixedDetails = dc.IsSuppressed === 'N' && (rentVal > 0 || feeVal > 0);

  return (
    <div className="surface-card p-4 hover-lift">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-slate-900">{dc.DCName}</h4>
        {dc.IsSuppressed === 'Y' ? (
          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Suppressed</span>
        ) : (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Active</span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        {/* Variable Cost Header */}
        <div
          onClick={() => hasVarDetails && setVarExpanded(!varExpanded)}
          className={`flex justify-between border-b border-slate-100 pb-1 font-medium select-none ${
            hasVarDetails ? 'cursor-pointer hover:bg-slate-50 rounded px-1 -mx-1 transition-colors' : ''
          }`}
        >
          <span className="text-slate-600 flex items-center gap-1">
            {hasVarDetails && (
              <span
                className="text-[9px] text-slate-400 transition-transform duration-200"
                style={{ display: 'inline-block', transform: varExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                ▶
              </span>
            )}
            Variable Cost:
          </span>
          <span>${baseCostDisplay.toLocaleString('en-US')}</span>
        </div>

        {/* Variable Cost Details */}
        {hasVarDetails && varExpanded && (
          <div className="space-y-1 pl-3 border-l-2 border-cyan-200 text-xs my-2 text-slate-500">
            <div className="flex justify-between font-medium text-slate-600">
              <span>Inbound Cost:</span>
              <span>${inboundVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between font-medium text-slate-600">
              <span>Outbound Cost:</span>
              <span>${outboundVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="pl-2 flex flex-col gap-0.5 text-[10px] text-slate-400">
              <div className="flex justify-between">
                <span>Parcel:</span>
                <span>${(dc.ParcelSpend ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between">
                <span>LTL:</span>
                <span>${(dc.LtlSpend ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between">
                <span>TL:</span>
                <span>${(dc.TlSpend ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
            <div className="flex justify-between font-medium text-slate-600">
              <span>Distribution Cost (incl. fixed):</span>
              <span>${distributionVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between font-medium text-slate-600">
              <span>Contract Labor:</span>
              <span>${laborVal.toLocaleString('en-US')}</span>
            </div>
          </div>
        )}

        {/* Fixed Cost Header */}
        <div
          onClick={() => hasFixedDetails && setFixedExpanded(!fixedExpanded)}
          className={`flex justify-between border-b border-slate-100 pb-1 font-medium select-none ${
            hasFixedDetails ? 'cursor-pointer hover:bg-slate-50 rounded px-1 -mx-1 transition-colors' : ''
          }`}
        >
          <span className="text-slate-600 flex items-center gap-1">
            {hasFixedDetails && (
              <span
                className="text-[9px] text-slate-400 transition-transform duration-200"
                style={{ display: 'inline-block', transform: fixedExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                ▶
              </span>
            )}
            Fixed Cost:
          </span>
          <span>${fixedCostDisplay.toLocaleString('en-US')}</span>
        </div>

        {/* Fixed Cost Details */}
        {hasFixedDetails && fixedExpanded && (
          <div className="space-y-1 pl-3 border-l-2 border-blue-200 text-xs my-2 text-slate-500">
            <div className="flex justify-between">
              <span>Rent:</span>
              <span>${rentVal.toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between">
              <span>Management Fee:</span>
              <span>${feeVal.toLocaleString('en-US')}</span>
            </div>
          </div>
        )}

        {/* Total Cost */}
        <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t border-slate-100 mb-2">
          <span>Total Cost:</span>
          <span>${totalCostDisplay.toLocaleString('en-US')}</span>
        </div>

        {/* Other Metrics */}
        <div className="flex justify-between">
          <span className="text-slate-600">Avg Days:</span>
          <span className="font-medium">{formatDecimalOrNA(dc.AvgDays, 2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600">Utilization:</span>
          <span className={`font-medium ${dc.UtilPct > utilCapPct ? 'text-amber-600' : ''}`}>
            {dc.UtilPct > 0 ? `${dc.UtilPct.toFixed(2)}%` : 'NA'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Actual Space:</span>
          <span className="font-medium">{(dc.ActualSpace ?? 0).toLocaleString('en-US')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Space Required:</span>
          <span className="font-medium">{dc.SpaceRequired.toLocaleString('en-US')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Flag:</span>
          {dc.OvercapFlag === 'Y' ? (
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold">Overcap</span>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </div>
        {/*
        <div className="flex justify-between">
          <span className="text-slate-600">SLA Breaches:</span>
          <span className="font-medium">
            {dc.SLABreachCount}
          </span>
        </div>
        */}

        {/* Space Required bar */}
        <div className="pt-2 border-t border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Util Space / Space Required</div>
          <div
            className="flex gap-1 h-3 overflow-hidden rounded-full bg-slate-200"
            title={`Util Space ${getUtilSpace(dc).toLocaleString('en-US')} vs Space Required ${dc.SpaceRequired.toLocaleString(
              'en-US'
            )}`}
          >
            <AnimatedBarSegment
              className="bg-blue-500 rounded-l"
              value={clampBarWidth(getUtilSpace(dc), dc.ActualSpace ?? dc.SpaceCore ?? 1)}
              total={Math.max(
                clampBarWidth(getUtilSpace(dc), dc.ActualSpace ?? dc.SpaceCore ?? 1),
                clampBarWidth(dc.SpaceRequired, dc.ActualSpace ?? dc.SpaceCore ?? 1),
                1
              )}
              ariaLabel={`Util Space ${truePct(getUtilSpace(dc), dc).toFixed(2)}%`}
            />
            <AnimatedBarSegment
              className="bg-green-500 rounded-r"
              value={clampBarWidth(dc.SpaceRequired, dc.ActualSpace ?? dc.SpaceCore ?? 1)}
              total={Math.max(
                clampBarWidth(getUtilSpace(dc), dc.ActualSpace ?? dc.SpaceCore ?? 1),
                clampBarWidth(dc.SpaceRequired, dc.ActualSpace ?? dc.SpaceCore ?? 1),
                1
              )}
              ariaLabel={`Space Required ${truePct(dc.SpaceRequired, dc).toFixed(2)}%`}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-1 gap-1">
            <span className="truncate">{getUtilSpace(dc).toLocaleString('en-US')}</span>
            <span className="truncate text-right">{dc.SpaceRequired.toLocaleString('en-US')}</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-0.5 gap-1">
            <span>Util Space: {truePct(getUtilSpace(dc), dc).toFixed(2)}%</span>
            <span className={truePct(dc.SpaceRequired, dc) > 100 ? 'text-red-600 font-semibold' : ''}>
              Space Required: {truePct(dc.SpaceRequired, dc).toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="pt-2">
          <span className="text-xs text-slate-500">Rank: #{dc.RankOverall}</span>
        </div>
      </div>
    </div>
  );
};
