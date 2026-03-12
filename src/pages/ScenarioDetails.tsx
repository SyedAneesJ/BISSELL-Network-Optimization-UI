import React, { useState } from 'react';
import {
  ArrowLeft, Download, Copy, CheckCircle, Archive, MessageSquare, Play,
  BarChart3, Map, ListOrdered, FileSpreadsheet, Package, Settings
} from 'lucide-react';
import {
  Tabs, Tab, KPICard, StatusBadge, Button, DataTable, Column, Tooltip, Modal
} from '../components';
import {
  ScenarioRunConfig,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
  ScenarioOverride,
} from '../data/mockData';
import { downloadBlob, toCSV } from '../utils/export';
import { useActionFeedback } from '../utils/actionFeedback';

interface ScenarioDetailsProps {
  scenarioId: string;
  onBack: () => void;
  scenarioRunHeaders: ScenarioRunHeader[];
  scenarioRunConfigs: ScenarioRunConfig[];
  scenarioRunResultsDC: ScenarioRunResultsDC[];
  scenarioRunResultsLanes: ScenarioRunResultsLane[];
  scenarioOverrides: ScenarioOverride[];
  onDuplicateScenario: (scenarioId: string) => void;
  onPublishScenario: (scenarioId: string) => void;
  onApproveScenario: (scenarioId: string) => void;
  onArchiveScenario: (scenarioId: string) => void;
  onAddComment: (scenarioId: string, comment: string) => void;
  onApplyOverride: (scenarioId: string, override: Omit<ScenarioOverride, 'ScenarioRunID' | 'OverrideVersion' | 'UpdatedAt' | 'UpdatedBy'>) => void;
}

export const ScenarioDetails: React.FC<ScenarioDetailsProps> = ({
  scenarioId,
  onBack,
  scenarioRunHeaders,
  scenarioRunConfigs,
  scenarioRunResultsDC,
  scenarioRunResultsLanes,
  scenarioOverrides,
  onDuplicateScenario,
  onPublishScenario,
  onApproveScenario,
  onArchiveScenario,
  onAddComment,
  onApplyOverride,
}) => {
  const { trigger: triggerAction, isActive: isActionActive } = useActionFeedback();
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedLane, setSelectedLane] = useState<ScenarioRunResultsLane | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [overrideLaneKey, setOverrideLaneKey] = useState('');
  const [overrideNewDC, setOverrideNewDC] = useState('');
  const [overrideReason, setOverrideReason] = useState<ScenarioOverride['ReasonCode']>('Capacity');
  const [overrideComment, setOverrideComment] = useState('');
  const [networkView, setNetworkView] = useState<'current' | 'baseline' | 'difference'>('current');
  const [laneChannelFilter, setLaneChannelFilter] = useState('All');
  const [laneTermsFilter, setLaneTermsFilter] = useState('All');
  const [laneFlagFilter, setLaneFlagFilter] = useState('All');

  const scenario = scenarioRunHeaders.find(s => s.ScenarioRunID === scenarioId);
  const scenarioConfig = scenarioRunConfigs.find(c => c.ScenarioRunID === scenarioId);
  const dcResults = scenarioRunResultsDC.filter(dc => dc.ScenarioRunID === scenarioId);
  const laneResults = scenarioRunResultsLanes.filter(lane => lane.ScenarioRunID === scenarioId);
  const overrides = scenarioOverrides.filter(o => o.ScenarioRunID === scenarioId);

  const laneOptions = laneResults.map((lane) => {
    const key = `${lane.Dest3Zip}|${lane.Channel}|${lane.Terms}|${lane.CustomerGroup}`;
    return {
      key,
      label: `${lane.Dest3Zip} ${lane.DestState} | ${lane.Channel} ${lane.Terms} | ${lane.CustomerGroup} | ${lane.AssignedDC}`,
      lane,
    };
  });

  const lanesByDC = laneResults.reduce<Record<string, number>>((acc, lane) => {
    acc[lane.AssignedDC] = (acc[lane.AssignedDC] || 0) + 1;
    return acc;
  }, {});

  const getBaselineScenario = () => {
    const candidates = scenarioRunHeaders.filter(
      (s) => s.Region === scenario.Region && s.ScenarioType === 'Baseline'
    );
    if (candidates.length === 0) return null;
    const sorted = [...candidates].sort(
      (a, b) => new Date(b.LastUpdatedAt).getTime() - new Date(a.LastUpdatedAt).getTime()
    );
    return sorted[0];
  };

  const baselineScenario = scenario ? getBaselineScenario() : null;
  const baselineScenarioId = baselineScenario?.ScenarioRunID;
  const baselineDcResults = baselineScenarioId
    ? scenarioRunResultsDC.filter((dc) => dc.ScenarioRunID === baselineScenarioId)
    : [];
  const baselineLaneResults = baselineScenarioId
    ? scenarioRunResultsLanes.filter((lane) => lane.ScenarioRunID === baselineScenarioId)
    : [];

  const baselineLanesByDC = baselineLaneResults.reduce<Record<string, number>>((acc, lane) => {
    acc[lane.AssignedDC] = (acc[lane.AssignedDC] || 0) + 1;
    return acc;
  }, {});

  const channelOptions = Array.from(new Set(laneResults.map((lane) => lane.Channel))).sort();
  const termsOptions = Array.from(new Set(laneResults.map((lane) => lane.Terms))).sort();

  const filteredLanes = laneResults.filter((lane) => {
    if (laneChannelFilter !== 'All' && lane.Channel !== laneChannelFilter) return false;
    if (laneTermsFilter !== 'All' && lane.Terms !== laneTermsFilter) return false;
    if (laneFlagFilter === 'SLA Breaches Only') return lane.SLABreachFlag === 'Y';
    if (laneFlagFilter === 'Excluded by SLA') return lane.ExcludedBySLAFlag === 'Y';
    if (laneFlagFilter === 'Overrides Only') return lane.OverrideAppliedFlag === 'Y';
    if (laneFlagFilter === 'Flagged Lanes') return lane.NotesFlag === 'Y';
    return true;
  });

  const networkLaneEntries = (() => {
    if (networkView === 'difference') {
      const dcs = new Set([...Object.keys(lanesByDC), ...Object.keys(baselineLanesByDC)]);
      return Array.from(dcs).map((dc) => ({
        dc,
        count: (lanesByDC[dc] || 0) - (baselineLanesByDC[dc] || 0),
      }));
    }
    const source = networkView === 'baseline' ? baselineLanesByDC : lanesByDC;
    return Object.entries(source).map(([dc, count]) => ({ dc, count }));
  })();

  const networkDcVolumeRowsDiff = (() => {
    const dcs = new Set([
      ...dcResults.map((dc) => dc.DCName),
      ...baselineDcResults.map((dc) => dc.DCName),
    ]);
    const rows = Array.from(dcs).map((dcName) => {
      const current = dcResults.find((dc) => dc.DCName === dcName);
      const base = baselineDcResults.find((dc) => dc.DCName === dcName);
      return {
        dcName,
        delta: (current?.VolumeUnits || 0) - (base?.VolumeUnits || 0),
        current,
        base,
      };
    });
    return rows.filter((row) => (row.current?.IsSuppressed ?? 'N') === 'N' || (row.base?.IsSuppressed ?? 'N') === 'N');
  })();

  const networkDcVolumeRowsBase = (() => {
    const source = networkView === 'baseline' ? baselineDcResults : dcResults;
    return source.filter((dc) => dc.IsSuppressed === 'N').map((dc) => ({ dcName: dc.DCName, value: dc.VolumeUnits }));
  })();

  const networkAvgDaysRowsDiff = (() => {
    const dcs = new Set([
      ...dcResults.map((dc) => dc.DCName),
      ...baselineDcResults.map((dc) => dc.DCName),
    ]);
    const rows = Array.from(dcs).map((dcName) => {
      const current = dcResults.find((dc) => dc.DCName === dcName);
      const base = baselineDcResults.find((dc) => dc.DCName === dcName);
      return {
        dcName,
        delta: (current?.AvgDays || 0) - (base?.AvgDays || 0),
        current,
        base,
      };
    });
    return rows.filter((row) => (row.current?.IsSuppressed ?? 'N') === 'N' || (row.base?.IsSuppressed ?? 'N') === 'N');
  })();

  const networkAvgDaysRowsBase = (() => {
    const source = networkView === 'baseline' ? baselineDcResults : dcResults;
    return source.filter((dc) => dc.IsSuppressed === 'N').map((dc) => ({ dcName: dc.DCName, value: dc.AvgDays }));
  })();

  const topFootprintLanes = [...laneResults]
    .sort((a, b) => b.FootprintContribution - a.FootprintContribution)
    .slice(0, 5);

  const handleExportDecisionPack = () => {
    if (!scenario) return;
    const rows = [{
      ScenarioRunID: scenario.ScenarioRunID,
      RunName: scenario.RunName,
      Region: scenario.Region,
      Status: scenario.Status,
      ScenarioType: scenario.ScenarioType,
      TotalCost: scenario.TotalCost,
      CostPerUnit: scenario.CostPerUnit,
      AvgDeliveryDays: scenario.AvgDeliveryDays,
      SLABreachPct: scenario.SLABreachPct,
      MaxUtilPct: scenario.MaxUtilPct,
      TotalSpaceRequired: scenario.TotalSpaceRequired,
      OverrideCount: scenario.OverrideCount,
      LastUpdatedAt: scenario.LastUpdatedAt,
    }];
    const csv = toCSV(rows);
    downloadBlob(csv, `${scenario.ScenarioRunID}_decision_pack.csv`, 'text/csv;charset=utf-8;');
    triggerAction('scenario_export_decision');
  };

  const handleExportRoutingCSV = () => {
    const rows = laneResults.map((lane) => ({
      ScenarioRunID: lane.ScenarioRunID,
      Dest3Zip: lane.Dest3Zip,
      DestState: lane.DestState,
      Channel: lane.Channel,
      Terms: lane.Terms,
      CustomerGroup: lane.CustomerGroup,
      AssignedDC: lane.AssignedDC,
      LaneCost: lane.LaneCost,
      DeliveryDays: lane.DeliveryDays,
      SLABreachFlag: lane.SLABreachFlag,
    }));
    const csv = toCSV(rows);
    downloadBlob(csv, `${scenarioId}_routing_assignments.csv`, 'text/csv;charset=utf-8;');
    triggerAction('scenario_export_routing');
  };

  const handleExportLaneCSV = () => {
    const rows = laneResults.map((lane) => ({
      ScenarioRunID: lane.ScenarioRunID,
      Dest3Zip: lane.Dest3Zip,
      DestState: lane.DestState,
      Channel: lane.Channel,
      Terms: lane.Terms,
      CustomerGroup: lane.CustomerGroup,
      AssignedDC: lane.AssignedDC,
      RankedOption1DC: lane.RankedOption1DC,
      RankedOption1Cost: lane.RankedOption1Cost,
      RankedOption1Days: lane.RankedOption1Days,
      RankedOption2DC: lane.RankedOption2DC,
      RankedOption2Cost: lane.RankedOption2Cost,
      RankedOption2Days: lane.RankedOption2Days,
      RankedOption3DC: lane.RankedOption3DC,
      RankedOption3Cost: lane.RankedOption3Cost,
      RankedOption3Days: lane.RankedOption3Days,
      ChosenRank: lane.ChosenRank,
      LaneCost: lane.LaneCost,
      CostDeltaVsBest: lane.CostDeltaVsBest,
      DeliveryDays: lane.DeliveryDays,
      SLABreachFlag: lane.SLABreachFlag,
      ExcludedBySLAFlag: lane.ExcludedBySLAFlag,
      FootprintContribution: lane.FootprintContribution,
      UtilImpactPct: lane.UtilImpactPct,
      OverrideAppliedFlag: lane.OverrideAppliedFlag,
      OverrideVersion: lane.OverrideVersion,
      NotesFlag: lane.NotesFlag,
    }));
    const csv = toCSV(rows);
    downloadBlob(csv, `${scenarioId}_lane_table.csv`, 'text/csv;charset=utf-8;');
    triggerAction('scenario_export_lane');
  };

  const handleExportExceptionsCSV = () => {
    const rows = laneResults
      .filter(l => l.SLABreachFlag === 'Y' || l.ExcludedBySLAFlag === 'Y' || l.OverrideAppliedFlag === 'Y')
      .map((lane) => ({
        ScenarioRunID: lane.ScenarioRunID,
        Dest3Zip: lane.Dest3Zip,
        DestState: lane.DestState,
        Channel: lane.Channel,
        Terms: lane.Terms,
        CustomerGroup: lane.CustomerGroup,
        AssignedDC: lane.AssignedDC,
        SLABreachFlag: lane.SLABreachFlag,
        ExcludedBySLAFlag: lane.ExcludedBySLAFlag,
        OverrideAppliedFlag: lane.OverrideAppliedFlag,
        OverrideVersion: lane.OverrideVersion,
        NotesFlag: lane.NotesFlag,
      }));
    const csv = toCSV(rows);
    downloadBlob(csv, `${scenarioId}_exceptions.csv`, 'text/csv;charset=utf-8;');
    triggerAction('scenario_export_exceptions');
  };

  if (!scenario) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-slate-600">Scenario not found</p>
          <Button onClick={onBack} variant="primary" className="mt-4">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const dcColumns: Column<ScenarioRunResultsDC>[] = [
    { key: 'DCName', header: 'DC Name', sortable: true },
    {
      key: 'TotalCost',
      header: 'Cost',
      sortable: true,
      render: (row) => `$${row.TotalCost.toLocaleString()}`,
    },
    {
      key: 'VolumeUnits',
      header: 'Volume',
      sortable: true,
      render: (row) => row.VolumeUnits.toLocaleString(),
    },
    {
      key: 'AvgDays',
      header: 'Avg Days',
      sortable: true,
      render: (row) => row.AvgDays.toFixed(1),
    },
    {
      key: 'UtilPct',
      header: 'Util %',
      sortable: true,
      render: (row) => (
        <span className={row.UtilPct > 85 ? 'text-amber-600 font-medium' : ''}>
          {row.UtilPct}%
        </span>
      ),
    },
    {
      key: 'SpaceRequired',
      header: 'Space Req',
      sortable: true,
      render: (row) => row.SpaceRequired.toLocaleString(),
    },
    {
      key: 'SLABreachCount',
      header: 'SLA Breaches',
      sortable: true,
      render: (row) => (
        <span className={row.SLABreachCount > 5 ? 'text-red-600 font-medium' : ''}>
          {row.SLABreachCount}
        </span>
      ),
    },
    {
      key: 'RankOverall',
      header: 'Rank',
      sortable: true,
      render: (row) => `#${row.RankOverall}`,
    },
  ];

  const laneColumns: Column<ScenarioRunResultsLane>[] = [
    { key: 'Dest3Zip', header: '3-Zip', width: '80px', sortable: true },
    { key: 'DestState', header: 'State', width: '60px', sortable: true },
    { key: 'Channel', header: 'Channel', width: '80px', sortable: true },
    { key: 'Terms', header: 'Terms', width: '80px', sortable: true },
    { key: 'CustomerGroup', header: 'Customer', width: '120px', sortable: true },
    { key: 'AssignedDC', header: 'Assigned DC', width: '120px', sortable: true },
    {
      key: 'LaneCost',
      header: 'Cost',
      width: '90px',
      sortable: true,
      render: (row) => `$${row.LaneCost.toFixed(2)}`,
    },
    {
      key: 'CostDeltaVsBest',
      header: 'Delta vs Best',
      width: '100px',
      sortable: true,
      render: (row) => (
        <span className={row.CostDeltaVsBest > 0 ? 'text-amber-600' : 'text-green-600'}>
          ${row.CostDeltaVsBest.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'DeliveryDays',
      header: 'Days',
      width: '70px',
      sortable: true,
      render: (row) => row.DeliveryDays.toFixed(1),
    },
    {
      key: 'SLABreachFlag',
      header: 'SLA',
      width: '60px',
      sortable: true,
      render: (row) => (
        row.SLABreachFlag === 'Y' ? <span className="text-red-600 font-medium">Breach</span> : '-'
      ),
    },
    {
      key: 'OverrideAppliedFlag',
      header: 'Override',
      width: '80px',
      render: (row) => (
        row.OverrideAppliedFlag === 'Y' ? (
          <span className="text-blue-600 text-xs">{row.OverrideVersion}</span>
        ) : '-'
      ),
    },
  ];

  const rankedOptionsColumns: Column<ScenarioRunResultsLane>[] = [
    { key: 'Dest3Zip', header: '3-Zip', width: '80px', sortable: true },
    { key: 'Channel', header: 'Channel', width: '80px', sortable: true },
    { key: 'Terms', header: 'Terms', width: '80px', sortable: true },
    { key: 'CustomerGroup', header: 'Customer', width: '120px', sortable: true },
    {
      key: 'RankedOption1DC',
      header: 'Option #1',
      width: '200px',
      render: (row) => (
        <div className="text-xs">
          <div className="font-medium">{row.RankedOption1DC}</div>
          <div className="text-slate-600">${row.RankedOption1Cost.toFixed(2)} | {row.RankedOption1Days}d</div>
        </div>
      ),
    },
    {
      key: 'RankedOption2DC',
      header: 'Option #2',
      width: '200px',
      render: (row) => (
        <div className="text-xs">
          <div className="font-medium">{row.RankedOption2DC}</div>
          <div className="text-slate-600">${row.RankedOption2Cost.toFixed(2)} | {row.RankedOption2Days}d</div>
        </div>
      ),
    },
    {
      key: 'RankedOption3DC',
      header: 'Option #3',
      width: '200px',
      render: (row) => (
        <div className="text-xs">
          <div className="font-medium">{row.RankedOption3DC}</div>
          <div className="text-slate-600">${row.RankedOption3Cost.toFixed(2)} | {row.RankedOption3Days}d</div>
        </div>
      ),
    },
    {
      key: 'AssignedDC',
      header: 'Selected',
      width: '120px',
      render: (row) => (
        <div className="font-medium text-blue-600">{row.AssignedDC}</div>
      ),
    },
    {
      key: 'ChosenRank',
      header: 'Rank',
      width: '80px',
      sortable: true,
      render: (row) => `#${row.ChosenRank}`,
    },
    {
      key: 'CostDeltaVsBest',
      header: 'Delta',
      width: '90px',
      sortable: true,
      render: (row) => (
        <span className={row.CostDeltaVsBest > 0 ? 'text-amber-600' : 'text-green-600'}>
          ${row.CostDeltaVsBest.toFixed(2)}
        </span>
      ),
    },
  ];

  const tabs: Tab[] = [
    {
      id: 'summary',
      label: 'Summary',
      icon: <BarChart3 className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <KPICard label="Total Cost" value={scenario.TotalCost} format="currency" />
            <KPICard label="Cost per Unit" value={scenario.CostPerUnit} format="currency" />
            <KPICard label="Avg Delivery Days" value={scenario.AvgDeliveryDays} format="decimal" />
            <KPICard label="SLA Breach %" value={scenario.SLABreachPct} format="decimal" />
            <KPICard label="Max Utilization %" value={scenario.MaxUtilPct} format="number" />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <KPICard label="Total Space" value={scenario.TotalSpaceRequired} format="number" tooltip="Total warehouse space required (sq ft)" />
            <KPICard label="Space Core" value={scenario.SpaceCore} format="number" tooltip="Space for core products" />
            <KPICard label="Space BCV" value={scenario.SpaceBCV} format="number" tooltip="Space for business critical volume" />
            <KPICard label="Overrides" value={scenario.OverrideCount} format="number" tooltip="Number of manual overrides applied" />
          </div>

          {scenarioConfig && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Scenario Configuration</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-slate-600">Active DCs:</span> {scenarioConfig.ActiveDCs || '—'}</div>
                <div><span className="text-slate-600">Suppressed DCs:</span> {scenarioConfig.SuppressedDCs || '—'}</div>
                <div><span className="text-slate-600">Footprint Mode:</span> {scenarioConfig.FootprintMode}</div>
                <div><span className="text-slate-600">Util Cap:</span> {scenarioConfig.UtilCapPct}%</div>
                <div><span className="text-slate-600">Level Load:</span> {scenarioConfig.LevelLoadMode}</div>
                <div><span className="text-slate-600">Lead Time Cap:</span> {scenarioConfig.LeadTimeCapDays ?? 'None'}</div>
                <div><span className="text-slate-600">Cost vs Service:</span> {scenarioConfig.CostVsServiceWeight}</div>
                <div><span className="text-slate-600">Relocation Prepaid:</span> {scenarioConfig.AllowRelocationPrepaid}</div>
                <div><span className="text-slate-600">Relocation Collect:</span> {scenarioConfig.AllowRelocationCollect}</div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">DC Scorecard</h3>
            <div className="grid grid-cols-3 gap-4">
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
                      <span className="font-medium">{dc.AvgDays.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Utilization:</span>
                      <span className={`font-medium ${dc.UtilPct > 85 ? 'text-amber-600' : ''}`}>
                        {dc.UtilPct}%
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
                      <div className="text-xs text-slate-500 mb-1">Core/BCV Split</div>
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
                      <div className="flex justify-between text-xs text-slate-600 mt-1">
                        <span>Core: {dc.SpaceCore.toLocaleString()}</span>
                        <span>BCV: {dc.SpaceBCV.toLocaleString()}</span>
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
            <div className="grid grid-cols-4 gap-4">
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
      ),
    },
    {
      id: 'network',
      label: 'Network View',
      icon: <Map className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Network Map</h3>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  disabled={!baselineScenarioId}
                  onClick={() => setNetworkView(networkView === 'baseline' ? 'current' : 'baseline')}
                  className={networkView === 'baseline' ? 'bg-amber-100 text-amber-800' : ''}
                >
                  {networkView === 'baseline' ? 'Showing Baseline' : 'Show Baseline'}
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  disabled={!baselineScenarioId}
                  onClick={() => setNetworkView(networkView === 'difference' ? 'current' : 'difference')}
                  className={networkView === 'difference' ? 'bg-amber-100 text-amber-800' : ''}
                >
                  {networkView === 'difference' ? 'Showing Difference' : 'Show Difference'}
                </Button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="grid grid-cols-3 gap-4 text-sm">
                {networkLaneEntries.map((entry) => (
                  <div key={entry.dc} className="flex items-center justify-between p-3 bg-white rounded border border-slate-200">
                    <span className="text-slate-700">{entry.dc}</span>
                    {networkView === 'difference' ? (
                      <span className={`font-semibold ${entry.count >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.count >= 0 ? '+' : ''}{entry.count} lanes
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-900">{entry.count} lanes</span>
                    )}
                  </div>
                ))}
                {networkLaneEntries.length === 0 && (
                  <div className="text-slate-500">No lane assignments available for this scenario.</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">DC Volume Share</h3>
              <div className="space-y-3">
                {networkView === 'difference' ? (() => {
                  const maxAbs = Math.max(1, ...networkDcVolumeRowsDiff.map((row) => Math.abs(row.delta)));
                  return networkDcVolumeRowsDiff.map((row) => (
                    <div key={row.dcName}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700">{row.dcName}</span>
                        <span className={`font-medium ${row.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {row.delta >= 0 ? '+' : ''}{row.delta.toLocaleString()} units
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${row.delta >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                          style={{ width: `${(Math.abs(row.delta) / maxAbs) * 100}%` }}
                        />
                      </div>
                    </div>
                  ));
                })() : (
                  (() => {
                    const total = Math.max(1, networkDcVolumeRowsBase.reduce((sum, row) => sum + (row.value || 0), 0));
                    return networkDcVolumeRowsBase.map((row) => (
                      <div key={row.dcName}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-700">{row.dcName}</span>
                          <span className="font-medium">{(row.value || 0).toLocaleString()} units</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${((row.value || 0) / total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Avg Days by DC</h3>
              <div className="space-y-3">
                {networkView === 'difference' ? (() => {
                  const maxAbs = Math.max(1, ...networkAvgDaysRowsDiff.map((row) => Math.abs(row.delta)));
                  return networkAvgDaysRowsDiff.map((row) => (
                    <div key={row.dcName}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700">{row.dcName}</span>
                        <span className={`font-medium ${row.delta >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {row.delta >= 0 ? '+' : ''}{row.delta.toFixed(1)} days
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${row.delta >= 0 ? 'bg-red-600' : 'bg-green-600'}`}
                          style={{ width: `${(Math.abs(row.delta) / maxAbs) * 100}%` }}
                        />
                      </div>
                    </div>
                  ));
                })() : (
                  (() => {
                    const maxDays = Math.max(10, ...networkAvgDaysRowsBase.map((row) => row.value || 0));
                    return networkAvgDaysRowsBase.map((row) => (
                      <div key={row.dcName}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-700">{row.dcName}</span>
                          <span className="font-medium">{(row.value || 0).toFixed(1)} days</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${((row.value || 0) / maxDays) * 100}%` }}
                          />
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'ranked',
      label: 'Ranked Options',
      icon: <ListOrdered className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              This view shows the top 3 ranked DC options for each lane based on cost optimization. The chosen rank indicates which option was selected in the final solution.
            </p>
          </div>

          <DataTable
            columns={rankedOptionsColumns}
            data={laneResults}
            maxHeight="600px"
          />
        </div>
      ),
    },
    {
      id: 'lanes',
      label: 'Lanes',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              value={laneChannelFilter}
              onChange={(e) => setLaneChannelFilter(e.target.value)}
            >
              <option value="All">All Channels</option>
              {channelOptions.map((channel) => (
                <option key={channel} value={channel}>{channel}</option>
              ))}
            </select>

            <select
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              value={laneTermsFilter}
              onChange={(e) => setLaneTermsFilter(e.target.value)}
            >
              <option value="All">All Terms</option>
              {termsOptions.map((term) => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>

            <select
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              value={laneFlagFilter}
              onChange={(e) => setLaneFlagFilter(e.target.value)}
            >
              <option value="All">All Lanes</option>
              <option value="SLA Breaches Only">SLA Breaches Only</option>
              <option value="Excluded by SLA">Excluded by SLA</option>
              <option value="Overrides Only">Overrides Only</option>
              <option value="Flagged Lanes">Flagged Lanes</option>
            </select>
          </div>

          <DataTable
            columns={laneColumns}
            data={filteredLanes}
            maxHeight="600px"
            onRowClick={(row) => setSelectedLane(row)}
          />
        </div>
      ),
    },
    {
      id: 'capacity',
      label: 'Capacity & Footprint',
      icon: <Package className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">DC Capacity Analysis</h3>
            <DataTable columns={dcColumns} data={dcResults} />
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Space Required by DC</h3>
            <div className="space-y-3">
              {dcResults.map((dc) => {
                const total = Math.max(dc.SpaceRequired, 1);
                const corePct = (dc.SpaceCore / total) * 100;
                const bcvPct = (dc.SpaceBCV / total) * 100;
                return (
                  <div key={dc.DCName}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700">{dc.DCName}</span>
                      <span className="font-medium">{dc.SpaceRequired.toLocaleString()} sq ft</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-200">
                      <div className="bg-blue-500" style={{ width: `${corePct}%` }} />
                      <div className="bg-green-500" style={{ width: `${bcvPct}%` }} />
                    </div>
                  </div>
                );
              })}
              {dcResults.length === 0 && (
                <div className="text-sm text-slate-500">No DC results available for this scenario.</div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Footprint Contributors</h3>
            <div className="space-y-2 text-sm">
              {topFootprintLanes.map((lane) => (
                <div key={`${lane.Dest3Zip}-${lane.Channel}-${lane.Terms}-${lane.CustomerGroup}`} className="flex justify-between">
                  <div className="text-slate-700">
                    {lane.Dest3Zip} {lane.DestState} | {lane.Channel} {lane.Terms} | {lane.CustomerGroup}
                  </div>
                  <div className="font-medium text-slate-900">{lane.FootprintContribution.toLocaleString()}</div>
                </div>
              ))}
              {topFootprintLanes.length === 0 && (
                <div className="text-slate-500">No lane data available for footprint analysis.</div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'overrides',
      label: 'Overrides',
      icon: <Settings className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Override Summary:</strong> {scenario.OverrideCount} override(s) applied to this scenario.
              Overrides allow manual adjustments to the optimized lane assignments.
            </p>
          </div>

          {overrides.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Applied Overrides</h3>
              <div className="space-y-3">
                {overrides.map((override, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-slate-900">
                          {override.Dest3Zip} | {override.Channel} | {override.Terms} | {override.CustomerGroup}
                        </div>
                    <div className="text-sm text-slate-600 mt-1">
                      <span className="text-red-600">{override.OldDC}</span>
                          {' -> '}
                      <span className="text-green-600">{override.NewDC}</span>
                    </div>
                  </div>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {override.OverrideVersion}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700 mb-1">
                      <strong>Reason:</strong> {override.ReasonCode}
                    </div>
                    <div className="text-sm text-slate-600">
                      {override.Comment}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      By {override.UpdatedBy} on {new Date(override.UpdatedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
              <Settings className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No overrides applied to this scenario</p>
              <Button onClick={() => setShowOverrideModal(true)} variant="secondary" size="small" className="mt-4">
                Apply Override
              </Button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </button>
            <div className="h-6 w-px bg-slate-300" />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-slate-900">{scenario.RunName}</h1>
                <StatusBadge status={scenario.Status} />
                {scenario.AssumptionsSummary && (
                  <Tooltip content={scenario.AssumptionsSummary}>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      Assumptions
                    </span>
                  </Tooltip>
                )}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {scenario.ScenarioType} | {scenario.Region} | {scenario.EntityScope}
                {scenario.ApprovedBy && (
                  <span className="ml-3">Approved by {scenario.ApprovedBy}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <Button variant="secondary" size="small" icon={<Download className="w-4 h-4" />}>
                Export
              </Button>
              <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                <button
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${isActionActive('scenario_export_decision') ? 'bg-amber-50 text-amber-800' : ''}`}
                  onClick={handleExportDecisionPack}
                >
                  {isActionActive('scenario_export_decision') ? 'Exporting Decision Pack...' : 'Export Decision Pack CSV'}
                </button>
                <button
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${isActionActive('scenario_export_routing') ? 'bg-amber-50 text-amber-800' : ''}`}
                  onClick={handleExportRoutingCSV}
                >
                  {isActionActive('scenario_export_routing') ? 'Exporting Routing CSV...' : 'Export Routing Assignment CSV'}
                </button>
                <button
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${isActionActive('scenario_export_lane') ? 'bg-amber-50 text-amber-800' : ''}`}
                  onClick={handleExportLaneCSV}
                >
                  {isActionActive('scenario_export_lane') ? 'Exporting Lane Table...' : 'Export Lane Table CSV'}
                </button>
                <button
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${isActionActive('scenario_export_exceptions') ? 'bg-amber-50 text-amber-800' : ''}`}
                  onClick={handleExportExceptionsCSV}
                >
                  {isActionActive('scenario_export_exceptions') ? 'Exporting Exceptions...' : 'Export Exceptions CSV'}
                </button>
              </div>
            </div>

            <Button
              variant="secondary"
              size="small"
              icon={<Copy className="w-4 h-4" />}
              onClick={() => {
                onDuplicateScenario(scenarioId);
                triggerAction('scenario_duplicate');
              }}
              className={isActionActive('scenario_duplicate') ? 'bg-amber-100 text-amber-800' : ''}
            >
              {isActionActive('scenario_duplicate') ? 'Duplicated' : 'Duplicate'}
            </Button>

            {scenario.Status !== 'Published' && (
              <Button
                variant="primary"
                size="small"
                icon={<CheckCircle className="w-4 h-4" />}
                onClick={() => {
                  onPublishScenario(scenarioId);
                  triggerAction('scenario_publish');
                }}
                className={isActionActive('scenario_publish') ? 'bg-amber-500 text-white' : ''}
              >
                {isActionActive('scenario_publish') ? 'Publishing...' : 'Publish'}
              </Button>
            )}

            {scenario.Status === 'Completed' && !scenario.ApprovedBy && (
              <Button
                variant="primary"
                size="small"
                icon={<CheckCircle className="w-4 h-4" />}
                onClick={() => {
                  onApproveScenario(scenarioId);
                  triggerAction('scenario_approve');
                }}
                className={isActionActive('scenario_approve') ? 'bg-amber-500 text-white' : ''}
              >
                {isActionActive('scenario_approve') ? 'Approving...' : 'Approve'}
              </Button>
            )}

            <Button
              variant="secondary"
              size="small"
              icon={<MessageSquare className="w-4 h-4" />}
              onClick={() => {
                setShowCommentModal(true);
                triggerAction('scenario_comment_open');
              }}
              className={isActionActive('scenario_comment_open') ? 'bg-amber-100 text-amber-800' : ''}
            >
              {isActionActive('scenario_comment_open') ? 'Adding...' : 'Add Comment'}
            </Button>

            <Button
              variant="ghost"
              size="small"
              icon={<Archive className="w-4 h-4" />}
              onClick={() => {
                onArchiveScenario(scenarioId);
                triggerAction('scenario_archive');
              }}
              className={isActionActive('scenario_archive') ? 'bg-amber-100 text-amber-800' : ''}
            >
              {isActionActive('scenario_archive') ? 'Archived' : 'Archive'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-6 py-6">
        <Tabs tabs={tabs} defaultTab="summary" />
      </div>

      {selectedLane && (
        <Modal
          isOpen={!!selectedLane}
          onClose={() => setSelectedLane(null)}
          title="Lane Details"
          size="large"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">3-Zip:</span>
                <span className="ml-2 font-medium">{selectedLane.Dest3Zip}</span>
              </div>
              <div>
                <span className="text-slate-600">State:</span>
                <span className="ml-2 font-medium">{selectedLane.DestState}</span>
              </div>
              <div>
                <span className="text-slate-600">Channel:</span>
                <span className="ml-2 font-medium">{selectedLane.Channel}</span>
              </div>
              <div>
                <span className="text-slate-600">Terms:</span>
                <span className="ml-2 font-medium">{selectedLane.Terms}</span>
              </div>
              <div>
                <span className="text-slate-600">Customer Group:</span>
                <span className="ml-2 font-medium">{selectedLane.CustomerGroup}</span>
              </div>
              <div>
                <span className="text-slate-600">Assigned DC:</span>
                <span className="ml-2 font-medium text-blue-600">{selectedLane.AssignedDC}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-semibold text-slate-900 mb-3">Cost Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Lane Cost:</span>
                  <span className="font-medium">${selectedLane.LaneCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Delta vs Best:</span>
                  <span className={selectedLane.CostDeltaVsBest > 0 ? 'text-amber-600 font-medium' : 'text-green-600 font-medium'}>
                    ${selectedLane.CostDeltaVsBest.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Delivery Days:</span>
                  <span className="font-medium">{selectedLane.DeliveryDays.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <Modal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        title="Add Comment"
        size="medium"
        footer={
          <>
            <Button onClick={() => setShowCommentModal(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (commentText.trim()) {
                  onAddComment(scenarioId, commentText.trim());
                  triggerAction('scenario_comment_save');
                }
                setCommentText('');
                setShowCommentModal(false);
              }}
              variant="primary"
              className={isActionActive('scenario_comment_save') ? 'bg-amber-500 text-white' : ''}
            >
              {isActionActive('scenario_comment_save') ? 'Saving...' : 'Save Comment'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Comment
          </label>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add a note about this scenario..."
          />
        </div>
      </Modal>

      <Modal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        title="Apply Override"
        size="large"
        footer={
          <>
            <Button onClick={() => setShowOverrideModal(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              onClick={() => {
                const selected = laneOptions.find(l => l.key === overrideLaneKey);
                if (!selected || !overrideNewDC.trim()) return;
                onApplyOverride(scenarioId, {
                  Dest3Zip: selected.lane.Dest3Zip,
                  Channel: selected.lane.Channel,
                  Terms: selected.lane.Terms,
                  CustomerGroup: selected.lane.CustomerGroup,
                  OldDC: selected.lane.AssignedDC,
                  NewDC: overrideNewDC,
                  ReasonCode: overrideReason,
                  Comment: overrideComment || 'Override applied',
                });
                setOverrideLaneKey('');
                setOverrideNewDC('');
                setOverrideReason('Capacity');
                setOverrideComment('');
                setShowOverrideModal(false);
              }}
              variant="primary"
              disabled={!overrideLaneKey || !overrideNewDC.trim()}
            >
              Apply Override
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Lane
            </label>
            <select
              value={overrideLaneKey}
              onChange={(e) => setOverrideLaneKey(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select lane...</option>
              {laneOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              New DC
            </label>
            <input
              type="text"
              value={overrideNewDC}
              onChange={(e) => setOverrideNewDC(e.target.value)}
              placeholder="e.g., DC3"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reason
            </label>
            <select
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value as ScenarioOverride['ReasonCode'])}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Capacity">Capacity</option>
              <option value="SLA">SLA</option>
              <option value="CustomerPreference">Customer Preference</option>
              <option value="OpsLimitation">Ops Limitation</option>
              <option value="FinanceDirective">Finance Directive</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Comment
            </label>
            <textarea
              value={overrideComment}
              onChange={(e) => setOverrideComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Why this override is needed..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
