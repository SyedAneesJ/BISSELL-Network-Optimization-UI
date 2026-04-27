import React from 'react';
import { KPICard } from '@/components/ui';
import {
  ScenarioRunConfig,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
} from '@/data';
import { formatCurrencyOrNA, formatDecimalOrNA, formatNumberOrNA, formatTextOrNA } from '@/utils';

interface ScenarioSummaryTabProps {
  scenario: ScenarioRunHeader;
  scenarioConfig?: ScenarioRunConfig;
  entityLabels: { first: string; second: string };
  dcResults: ScenarioRunResultsDC[];
  laneResults: ScenarioRunResultsLane[];
  topFootprintLanes: ScenarioRunResultsLane[];
}

export const ScenarioSummaryTab: React.FC<ScenarioSummaryTabProps> = ({
  scenario,
  scenarioConfig,
  entityLabels,
  dcResults,
  laneResults,
  topFootprintLanes,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KPICard label="Total Cost" value={scenario.TotalCost} format="currency" />
        <KPICard label="Cost per Unit" value={formatCurrencyOrNA(scenario.CostPerUnit, 2)} />
        <KPICard label="Avg Delivery Days" value={formatDecimalOrNA(scenario.AvgDeliveryDays, 2)} />
        <KPICard label="Avg Transit Days" value={formatDecimalOrNA(scenario.AvgTransitDays, 2)} />
        <KPICard label="SLA Breach %" value={Number.isFinite(scenario.SLABreachPct) ? scenario.SLABreachPct : 'NA'} format="decimal" />
        <KPICard label="Max Utilization %" value={scenario.MaxUtilPct > 0 ? scenario.MaxUtilPct.toFixed(2) : 'NA'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Space Required" value={scenario.TotalSpaceRequired} format="number" tooltip="Total warehouse space required (sq ft)" />
        <KPICard label={`Space ${entityLabels.first}`} value={scenario.SpaceCore} format="number" tooltip={`Space for ${entityLabels.first}`} />
        <KPICard label={`Space ${entityLabels.second}`} value={scenario.SpaceBCV} format="number" tooltip={`Space for ${entityLabels.second}`} />
        <KPICard label="Total Count" value={formatNumberOrNA(scenario.TotalCount)} tooltip="Dataset total count" />
      </div>

      {scenarioConfig ? (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Scenario Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-600">Active DCs:</span> {formatTextOrNA(scenarioConfig.ActiveDCs)}</div>
            <div><span className="text-slate-600">Suppressed DCs:</span> {formatTextOrNA(scenarioConfig.SuppressedDCs)}</div>
            <div><span className="text-slate-600">Footprint Mode:</span> {formatTextOrNA(scenarioConfig.FootprintMode)}</div>
            <div><span className="text-slate-600">Util Cap:</span> {scenarioConfig.UtilCapPct ? `${scenarioConfig.UtilCapPct}%` : 'NA'}</div>
            <div><span className="text-slate-600">Level Load:</span> {formatTextOrNA(scenarioConfig.LevelLoadMode)}</div>
            <div><span className="text-slate-600">Lead Time Cap:</span> {formatTextOrNA(scenarioConfig.LeadTimeCapDays)}</div>
            <div><span className="text-slate-600">Cost vs Service:</span> {formatTextOrNA(scenarioConfig.CostVsServiceWeight)}</div>
            <div><span className="text-slate-600">Relocation Prepaid:</span> {formatTextOrNA(scenarioConfig.AllowRelocationPrepaid)}</div>
            <div><span className="text-slate-600">Relocation Collect:</span> {formatTextOrNA(scenarioConfig.AllowRelocationCollect)}</div>
            <div><span className="text-slate-600">Collect Treatment:</span> {formatTextOrNA(scenario.CollectTreatment)}</div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Scenario Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-600">Footprint Mode:</span> {formatTextOrNA(scenario.FootprintMode)}</div>
            <div><span className="text-slate-600">Level Load:</span> {formatTextOrNA(scenario.LevelLoad)}</div>
            <div><span className="text-slate-600">Utilization Cap:</span> {formatTextOrNA(scenario.UtilizationCap)}</div>
            <div><span className="text-slate-600">Collect Treatment:</span> {formatTextOrNA(scenario.CollectTreatment)}</div>
            <div><span className="text-slate-600">Overrides:</span> {formatNumberOrNA(scenario.OverrideCount)}</div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">DC Scorecard</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dcResults.map((dc) => (
            <div key={dc.DCName} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-900">{dc.DCName}</h4>
                {dc.IsSuppressed === 'Y' ? (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Suppressed</span>
                ) : (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Active</span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Cost:</span>
                  <span className="font-medium">${dc.TotalCost.toLocaleString()}</span>
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
                  <span className="text-slate-600">Space:</span>
                  <span className="font-medium">{dc.SpaceRequired.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">SLA Breaches:</span>
                  <span className={`font-medium ${dc.SLABreachCount > 5 ? 'text-red-600' : ''}`}>
                    {dc.SLABreachCount}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="text-xs text-slate-500 mb-1">Square Footage/Working Capacity</div>
                  <div className="flex gap-1 h-2">
                    <div
                      className="bg-blue-500 rounded-l"
                      style={{ width: `${(dc.SpaceCore / dc.SpaceRequired) * 100}%` }}
                    />
                    <div
                      className="bg-green-500 rounded-r"
                      style={{ width: `${(dc.SpaceBCV / dc.SpaceRequired) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 mt-1 gap-1">
                    <span className="truncate">Square Footage: {dc.SpaceCore.toLocaleString()}</span>
                    <span className="truncate text-right">Working Capacity: {dc.SpaceBCV.toLocaleString()}</span>
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

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Exceptions Summary</h3>
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
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-3xl font-bold text-slate-700">{scenario.OverrideCount}</p>
            <p className="text-sm text-slate-600 mt-1">Manual Overrides</p>
          </div>
        </div>
      </div>
    </div>
  );
};
