import React from 'react';
import { Download } from 'lucide-react';
import { Button, KPICard } from '@/components/ui';
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

  const maxUtilDisplay = scenario.MaxUtilPct > 0 
    ? `${scenario.MaxUtilPct.toFixed(2)}%${maxUtilDc && maxUtilDc.DCName ? ` | ${maxUtilDc.DCName}` : ''}` 
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
            <KPICard label="Base Cost" value={baseCost} format="currency" />
            <KPICard label="Additional Cost" value={additionalCost} format="currency" />
            <KPICard label="Cost per Unit" value={formatCurrencyOrNA(scenario.CostPerUnit, 2)} />
          </div>
        </div>

        {/* Service Metrics */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> Service Metrics
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard label="Avg Delivery Days" value={formatDecimalOrNA(scenario.AvgDeliveryDays, 2)} />
            <KPICard label="Avg Transit Days" value={formatDecimalOrNA(scenario.AvgTransitDays, 2)} />
            <KPICard label="SLA Breach %" value={Number.isFinite(scenario.SLABreachPct) ? scenario.SLABreachPct : 'NA'} format="decimal" />
            <KPICard label="Max Utilization %" value={maxUtilDisplay} />
          </div>
        </div>

        {/* Space & Volume Metrics */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span> Space & Volume Metrics
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard label="Total Space Required" value={scenario.TotalSpaceRequired} format="number" />
            <KPICard label={`Space ${entityLabels.first}`} value={scenario.SpaceCore} format="number" />
            <KPICard label={`Space ${entityLabels.second}`} value={scenario.SpaceBCV} format="number" />
            <KPICard label="Total Count" value={formatNumberOrNA(scenario.TotalCount)} />
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
          {dcResults.map((dc) => (
            <div key={dc.DCName} className="surface-card p-4 hover-lift">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-900">{dc.DCName}</h4>
                {dc.IsSuppressed === 'Y' ? (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Suppressed</span>
                ) : (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Active</span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-1 font-medium">
                  <span className="text-slate-600">Base Cost:</span>
                  <span>${dc.TotalCost.toLocaleString('en-US')}</span>
                </div>
                {dc.IsSuppressed === 'N' && (
                  <div className="space-y-1 pl-2 border-l-2 border-blue-200 text-xs my-1 text-slate-500">
                    <div className="flex justify-between">
                      <span>Rent:</span>
                      <span>${(dc.Rent ?? 0).toLocaleString('en-US')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contract Labor:</span>
                      <span>${(dc.ContractLabor ?? 0).toLocaleString('en-US')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Management Fee:</span>
                      <span>${(dc.ManagementFee ?? 0).toLocaleString('en-US')}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t border-slate-100 mb-2">
                  <span>Total Cost:</span>
                  <span>
                    ${(dc.TotalCost + (dc.IsSuppressed === 'N' ? (dc.Rent ?? 0) + (dc.ContractLabor ?? 0) + (dc.ManagementFee ?? 0) : 0)).toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Avg Days:</span>
                  <span className="font-medium">{formatDecimalOrNA(dc.AvgDays, 2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-600">Utilization:</span>
                  <span className={`font-medium ${dc.UtilPct > 85 ? 'text-amber-600' : ''}`}>
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

                <div className="pt-2 border-t border-slate-200">
                  <div className="text-xs text-slate-500 mb-1">Util Space / Space Required</div>
                  <div
                    className="flex gap-1 h-3 overflow-hidden rounded-full bg-slate-200"
                    title={`Util Space ${getUtilSpace(dc).toLocaleString('en-US')} vs Space Required ${dc.SpaceRequired.toLocaleString('en-US')}`}
                  >
                    <div
                      className="bg-blue-500 rounded-l"
                      style={getSegmentStyle(clampBarWidth(getUtilSpace(dc), dc.ActualSpace ?? dc.SpaceCore ?? 1), Math.max(clampBarWidth(getUtilSpace(dc), dc.ActualSpace ?? dc.SpaceCore ?? 1), clampBarWidth(dc.SpaceRequired, dc.ActualSpace ?? dc.SpaceCore ?? 1), 1))}
                      aria-label={`Util Space ${truePct(getUtilSpace(dc), dc).toFixed(2)}%`}
                    />
                    <div
                      className="bg-green-500 rounded-r"
                      style={getSegmentStyle(clampBarWidth(dc.SpaceRequired, dc.ActualSpace ?? dc.SpaceCore ?? 1), Math.max(clampBarWidth(getUtilSpace(dc), dc.ActualSpace ?? dc.SpaceCore ?? 1), clampBarWidth(dc.SpaceRequired, dc.ActualSpace ?? dc.SpaceCore ?? 1), 1))}
                      aria-label={`Space Required ${truePct(dc.SpaceRequired, dc).toFixed(2)}%`}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 mt-1 gap-1">
                    <span className="truncate">{getUtilSpace(dc).toLocaleString('en-US')}</span>
                    <span className="truncate text-right">{dc.SpaceRequired.toLocaleString('en-US')}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-0.5 gap-1">
                    <span>Util Space: {truePct(getUtilSpace(dc), dc).toFixed(2)}%</span>
                    <span className={truePct(dc.SpaceRequired, dc) > 100 ? 'text-red-600 font-semibold' : ''}>Space Required: {truePct(dc.SpaceRequired, dc).toFixed(2)}%</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-xs text-slate-500">Rank: #{dc.RankOverall}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* <div className="surface-panel p-5">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Exceptions Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-700">{scenario.ExcludedBySLACount}</p>
            <p className="text-sm text-red-600 mt-1">Excluded by SLA</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-3xl font-bold text-amber-700">
              {laneResults.filter(l => l.SLABreachFlag === 'Y').length}
            </p>
            <p className="text-sm text-amber-600 mt-1">SLA Breach Lanes</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-700">
              {laneResults.filter(l => l.NotesFlag).length}
            </p>
            <p className="text-sm text-blue-600 mt-1">Flagged Lanes</p>
          </div>
        </div>
      </div> */}
    </div>
  );
};
