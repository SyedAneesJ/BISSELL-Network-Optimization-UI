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
  laneResults,
  topFootprintLanes,
  onExportDCDetails,
  exportDCDetailsActive = false,
}) => {
  const parsedUtilCap = Number.parseFloat(String(scenario.UtilizationCap || ''));
  const utilCapPct = Number.isFinite(scenarioConfig?.UtilCapPct)
    ? Number(scenarioConfig?.UtilCapPct)
    : (Number.isFinite(parsedUtilCap) ? parsedUtilCap : 100);
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
  const additionalCost = dcResults.reduce((sum, dc) => {
        if (dc.IsSuppressed === 'Y') return sum;
        const costs = getAdditionalCostsForDc(dc.DCName);
        return sum + (dc.Rent ?? costs.Rent) + (dc.ContractLabor ?? costs.ContractLabor) + (dc.ManagementFee ?? costs.ManagementFee);
      }, 0);

  const baseCost = Math.max(0, scenario.TotalCost - additionalCost);

  const inboundCostTotal = dcResults.reduce((sum, dc) => sum + (dc.InboundSpend ?? 0), 0);
  const distributionCostTotal = dcResults.reduce((sum, dc) => sum + (dc.DistributionCost ?? 0), 0);
  const parcelCostTotal = dcResults.reduce((sum, dc) => sum + (dc.ParcelSpend ?? 0), 0);
  const ltlCostTotal = dcResults.reduce((sum, dc) => sum + (dc.LtlSpend ?? 0), 0);
  const tlCostTotal = dcResults.reduce((sum, dc) => sum + (dc.TlSpend ?? 0), 0);
  const outboundCostTotal = parcelCostTotal + ltlCostTotal + tlCostTotal;

  const isBaseline = scenario.ScenarioRunID === 'SR001' || String(scenario.ScenarioType || '').toLowerCase().includes('baseline');
  const isUsBaseline = scenario.Region === 'US' && isBaseline;

  const activeDcs = dcResults.filter(dc => dc.IsSuppressed !== 'Y');

  const totalDenominator = scenario.TotalCost || 1;
  const totalExtendedPriceSum = activeDcs.reduce((sum, dc) => sum + ((dc as any).TotalExtendedPrice || 0), 0);
  const salesDenominator = isUsBaseline && totalExtendedPriceSum > 0 ? totalExtendedPriceSum : totalDenominator;

  const inboundPctVal = (inboundCostTotal / salesDenominator) * 100;
  const dstPctVal = (distributionCostTotal / salesDenominator) * 100;
  const parcelPctVal = (parcelCostTotal / salesDenominator) * 100;
  const ltlPctVal = (ltlCostTotal / salesDenominator) * 100;
  const tlPctVal = (tlCostTotal / salesDenominator) * 100;
  const outboundPctVal = (outboundCostTotal / salesDenominator) * 100;
  const totalPctVal = ((inboundCostTotal + distributionCostTotal + outboundCostTotal) / salesDenominator) * 100;
  const pctToSalesVal = ((inboundCostTotal + distributionCostTotal + outboundCostTotal) / salesDenominator) * 100;

  const inboundPct = `${inboundPctVal.toFixed(isUsBaseline ? 2 : 1)}%`;
  const dstPct = `${dstPctVal.toFixed(isUsBaseline ? 2 : 1)}%`;
  const parcelPct = `${parcelPctVal.toFixed(isUsBaseline ? 2 : 1)}%`;
  const ltlPct = `${ltlPctVal.toFixed(isUsBaseline ? 2 : 1)}%`;
  const tlPct = `${tlPctVal.toFixed(isUsBaseline ? 2 : 1)}%`;
  const outboundPct = `${outboundPctVal.toFixed(isUsBaseline ? 2 : 1)}%`;
  const totalPct = `${totalPctVal.toFixed(isUsBaseline ? 2 : 1)}%`;
  const pctToSales = `${pctToSalesVal.toFixed(isUsBaseline ? 2 : 1)}%`;

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
            <KPICard label="Total Cost" value={scenario.TotalCost} format="currency" />
            <KPICard label="Variable Cost" value={baseCost} format="currency" />
            <KPICard label="Fixed Cost" value={additionalCost} format="currency" />
            <KPICard label="Cost per Unit" value={formatCurrencyOrNA(scenario.CostPerUnit, 2)} />
          </div>
        </div>

        {/* Cost % Sales */}
        {(inboundCostTotal > 0 || outboundCostTotal > 0 || distributionCostTotal > 0) && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span> Cost % Sales
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard label="Inbound % Revenue" value={formatCostPct(inboundCostTotal, inboundPct)} />
              <KPICard label="DST % Revenue" value={formatCostPct(distributionCostTotal, dstPct)} />
              <KPICard label="OB Parcel % Revenue" value={formatCostPct(parcelCostTotal, parcelPct)} />
              <KPICard label="OB LTL % Revenue" value={formatCostPct(ltlCostTotal, ltlPct)} />
              <KPICard label="OB TL % Revenue" value={formatCostPct(tlCostTotal, tlPct)} />
              <KPICard 
                label="OB Total % Revenue" 
                value={formatCostPct(outboundCostTotal, outboundPct)} 
                tooltip={`Parcel: $${parcelCostTotal.toLocaleString()}\nLTL: $${ltlCostTotal.toLocaleString()}\nTL: $${tlCostTotal.toLocaleString()}`}
              />
              {/* <KPICard 
                label={`${activeDcs.length} DC Scenario Cost % Sales`} 
                value={formatCostPct(inboundCostTotal + distributionCostTotal + outboundCostTotal, isUsBaseline ? pctToSales : totalPct)} 
              /> */}
            </div>
          </div>
        )}

        {/* Service Metrics */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> Service Metrics
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard label="Avg Delivery Days" value={formatDecimalOrNA(scenario.AvgDeliveryDays, 2)} />
            <KPICard label="Avg Transit Days" value={formatDecimalOrNA(scenario.AvgTransitDays, 2)} />
            <KPICard label="SLA Breach %" value={Number.isFinite(scenario.SLABreachPct) ? scenario.SLABreachPct : 'NA'} format="decimal" />
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

            const baseCostDisplay = isBaseline ? Math.max(0, dc.TotalCost - addCost) : dc.TotalCost;
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
                addCost={addCost}
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
  addCost: number;
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
  addCost,
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

  const hasVarDetails = dc.IsSuppressed === 'N' && (inboundVal > 0 || outboundVal > 0 || distributionVal > 0);
  const hasFixedDetails = dc.IsSuppressed === 'N' && (rentVal > 0 || laborVal > 0 || feeVal > 0);

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
              <span>Distribution Cost:</span>
              <span>${distributionVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
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
          <span>${(dc.IsSuppressed === 'N' ? addCost : 0).toLocaleString('en-US')}</span>
        </div>

        {/* Fixed Cost Details */}
        {hasFixedDetails && fixedExpanded && (
          <div className="space-y-1 pl-3 border-l-2 border-blue-200 text-xs my-2 text-slate-500">
            <div className="flex justify-between">
              <span>Rent:</span>
              <span>${rentVal.toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between">
              <span>Contract Labor:</span>
              <span>${laborVal.toLocaleString('en-US')}</span>
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
        <div className="flex justify-between">
          <span className="text-slate-600">SLA Breaches:</span>
          <span className={`font-medium ${dc.SLABreachCount > 5 ? 'text-red-600' : ''}`}>
            {dc.SLABreachCount}
          </span>
        </div>

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
