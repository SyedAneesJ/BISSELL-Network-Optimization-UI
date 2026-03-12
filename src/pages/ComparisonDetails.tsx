import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Download, ArrowLeftRight, TrendingUp, TrendingDown,
  BarChart3, Building2, FileSpreadsheet, AlertTriangle
} from 'lucide-react';
import {
  Tabs, Tab, KPICard, StatusBadge, Button, DataTable, Column, Modal
} from '../components';
import {
  ComparisonDetailDC,
  ComparisonDetailLane,
  ComparisonHeader,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
} from '../data/mockData';
import { downloadBlob, toCSV } from '../utils/export';
import { useActionFeedback } from '../utils/actionFeedback';

interface ComparisonDetailsProps {
  comparisonId: string;
  onBack: () => void;
  scenarioRunHeaders: ScenarioRunHeader[];
  comparisonHeaders: ComparisonHeader[];
  comparisonDetailDC: ComparisonDetailDC[];
  comparisonDetailLanes: ComparisonDetailLane[];
  scenarioRunResultsDC: ScenarioRunResultsDC[];
  scenarioRunResultsLanes: ScenarioRunResultsLane[];
  onPublishComparison: (comparisonId: string) => void;
  onAddDecision: (comparisonId: string, verdict: string, reason: string) => void;
}

export const ComparisonDetails: React.FC<ComparisonDetailsProps> = ({
  comparisonId,
  onBack,
  scenarioRunHeaders,
  comparisonHeaders,
  comparisonDetailDC,
  comparisonDetailLanes,
  scenarioRunResultsDC,
  scenarioRunResultsLanes,
  onPublishComparison,
  onAddDecision,
}) => {
  const { trigger: triggerAction, isActive: isActionActive } = useActionFeedback();
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionVerdict, setDecisionVerdict] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [laneDiffFilter, setLaneDiffFilter] = useState('Only Changed Lanes');
  const [laneChannelFilter, setLaneChannelFilter] = useState('All Channels');

  const comparison = comparisonHeaders.find(c => c.ComparisonID === comparisonId);
  const dcComparisonStored = comparisonDetailDC.filter(dc => dc.ComparisonID === comparisonId);
  const laneComparisonStored = comparisonDetailLanes.filter(lane => lane.ComparisonID === comparisonId);

  if (!comparison) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-slate-600">Comparison not found</p>
          <Button onClick={onBack} variant="primary" className="mt-4">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const scenarioA = scenarioRunHeaders.find(s => s.ScenarioRunID === comparison.ScenarioRunID_A);
  const scenarioB = scenarioRunHeaders.find(s => s.ScenarioRunID === comparison.ScenarioRunID_B);

  const dcComparison = useMemo(() => {
    const a = scenarioRunResultsDC.filter(r => r.ScenarioRunID === comparison.ScenarioRunID_A);
    const b = scenarioRunResultsDC.filter(r => r.ScenarioRunID === comparison.ScenarioRunID_B);
    if (a.length === 0 && b.length === 0) return dcComparisonStored;

    const byA = new Map(a.map(dc => [dc.DCName, dc]));
    const byB = new Map(b.map(dc => [dc.DCName, dc]));
    const dcNames = Array.from(new Set([...byA.keys(), ...byB.keys()]));

    return dcNames.map((name) => {
      const dcA = byA.get(name);
      const dcB = byB.get(name);
      return {
        ComparisonID: comparisonId,
        DCName: name,
        Cost_A: dcA?.TotalCost || 0,
        Cost_B: dcB?.TotalCost || 0,
        Cost_Delta: (dcB?.TotalCost || 0) - (dcA?.TotalCost || 0),
        Util_A: dcA?.UtilPct || 0,
        Util_B: dcB?.UtilPct || 0,
        Util_Delta: (dcB?.UtilPct || 0) - (dcA?.UtilPct || 0),
        Space_A: dcA?.SpaceRequired || 0,
        Space_B: dcB?.SpaceRequired || 0,
        Space_Delta: (dcB?.SpaceRequired || 0) - (dcA?.SpaceRequired || 0),
        SLABreach_A: dcA?.SLABreachCount || 0,
        SLABreach_B: dcB?.SLABreachCount || 0,
      };
    });
  }, [comparisonId, comparison.ScenarioRunID_A, comparison.ScenarioRunID_B, scenarioRunResultsDC, dcComparisonStored]);

  const laneComparison = useMemo(() => {
    const a = scenarioRunResultsLanes.filter(r => r.ScenarioRunID === comparison.ScenarioRunID_A);
    const b = scenarioRunResultsLanes.filter(r => r.ScenarioRunID === comparison.ScenarioRunID_B);
    if (a.length === 0 && b.length === 0) return laneComparisonStored;

    const key = (lane: ScenarioRunResultsLane) =>
      `${lane.Dest3Zip}|${lane.Channel}|${lane.Terms}|${lane.CustomerGroup}`;
    const byA = new Map(a.map(l => [key(l), l]));
    const byB = new Map(b.map(l => [key(l), l]));
    const keys = Array.from(new Set([...byA.keys(), ...byB.keys()]));

    return keys.map((k) => {
      const laneA = byA.get(k);
      const laneB = byB.get(k);
      const flags: string[] = [];
      if (laneA?.AssignedDC && laneB?.AssignedDC && laneA.AssignedDC !== laneB.AssignedDC) flags.push('DCChange');
      if ((laneB?.DeliveryDays || 0) - (laneA?.DeliveryDays || 0) > 0.5) flags.push('SLA');
      if (laneB?.OverrideAppliedFlag === 'Y' || laneA?.OverrideAppliedFlag === 'Y') flags.push('Override');

      return {
        ComparisonID: comparisonId,
        Dest3Zip: laneA?.Dest3Zip || laneB?.Dest3Zip || '',
        Channel: laneA?.Channel || laneB?.Channel || '',
        Terms: laneA?.Terms || laneB?.Terms || '',
        CustomerGroup: laneA?.CustomerGroup || laneB?.CustomerGroup || '',
        DC_A: laneA?.AssignedDC || '',
        DC_B: laneB?.AssignedDC || '',
        Cost_A: laneA?.LaneCost || 0,
        Cost_B: laneB?.LaneCost || 0,
        Cost_Delta: (laneB?.LaneCost || 0) - (laneA?.LaneCost || 0),
        Days_A: laneA?.DeliveryDays || 0,
        Days_B: laneB?.DeliveryDays || 0,
        Days_Delta: (laneB?.DeliveryDays || 0) - (laneA?.DeliveryDays || 0),
        UtilImpact_A: laneA?.UtilImpactPct || 0,
        UtilImpact_B: laneB?.UtilImpactPct || 0,
        Flags: flags.join(','),
      };
    });
  }, [comparisonId, comparison.ScenarioRunID_A, comparison.ScenarioRunID_B, scenarioRunResultsLanes, laneComparisonStored]);

  const filteredLaneComparison = useMemo(() => {
    let rows = laneComparison;
    if (laneDiffFilter === 'Only Changed Lanes') {
      rows = rows.filter(l => l.DC_A !== l.DC_B || l.Cost_Delta !== 0 || l.Days_Delta !== 0);
    } else if (laneDiffFilter === 'Only SLA Worsened') {
      rows = rows.filter(l => l.Flags.includes('SLA'));
    } else if (laneDiffFilter === 'Only Capacity Improved') {
      rows = rows.filter(l => l.UtilImpact_B < l.UtilImpact_A);
    } else if (laneDiffFilter === 'Top 50 Cost Impact') {
      rows = [...rows].sort((a, b) => Math.abs(b.Cost_Delta) - Math.abs(a.Cost_Delta)).slice(0, 50);
    } else if (laneDiffFilter === 'Top 100 Cost Impact') {
      rows = [...rows].sort((a, b) => Math.abs(b.Cost_Delta) - Math.abs(a.Cost_Delta)).slice(0, 100);
    }

    if (laneChannelFilter !== 'All Channels') {
      rows = rows.filter(l => l.Channel === laneChannelFilter);
    }
    return rows;
  }, [laneComparison, laneDiffFilter, laneChannelFilter]);

  const handleExportComparisonPack = () => {
    if (!comparison) return;
    const rows = [{
      ComparisonID: comparison.ComparisonID,
      ComparisonName: comparison.ComparisonName,
      ScenarioRunID_A: comparison.ScenarioRunID_A,
      ScenarioRunID_B: comparison.ScenarioRunID_B,
      CostDelta: comparison.CostDelta,
      CostDeltaPct: comparison.CostDeltaPct,
      AvgDaysDelta: comparison.AvgDaysDelta,
      SLABreachDelta: comparison.SLABreachDelta,
      MaxUtilDelta: comparison.MaxUtilDelta,
      SpaceDelta: comparison.SpaceDelta,
      ChangedLaneDelta: comparison.ChangedLaneDelta,
      Status: comparison.Status,
      CreatedAt: comparison.CreatedAt,
      CreatedBy: comparison.CreatedBy,
      DecisionVerdict: comparison.DecisionVerdict || '',
      DecisionReason: comparison.DecisionReason || '',
    }];
    const csv = toCSV(rows);
    downloadBlob(csv, `${comparison.ComparisonID}_comparison_pack.csv`, 'text/csv;charset=utf-8;');
    triggerAction('comparison_export_pack');
  };

  const handleExportLaneDiff = () => {
    const rows = filteredLaneComparison.map((lane) => ({
      ComparisonID: lane.ComparisonID,
      Dest3Zip: lane.Dest3Zip,
      Channel: lane.Channel,
      Terms: lane.Terms,
      CustomerGroup: lane.CustomerGroup,
      DC_A: lane.DC_A,
      DC_B: lane.DC_B,
      Cost_A: lane.Cost_A,
      Cost_B: lane.Cost_B,
      Cost_Delta: lane.Cost_Delta,
      Days_A: lane.Days_A,
      Days_B: lane.Days_B,
      Days_Delta: lane.Days_Delta,
      UtilImpact_A: lane.UtilImpact_A,
      UtilImpact_B: lane.UtilImpact_B,
      Flags: lane.Flags,
    }));
    const csv = toCSV(rows);
    downloadBlob(csv, `${comparisonId}_lane_diff.csv`, 'text/csv;charset=utf-8;');
    triggerAction('comparison_export_lane');
  };

  const handleExportDCDiff = () => {
    const rows = dcComparison.map((dc) => ({
      ComparisonID: dc.ComparisonID,
      DCName: dc.DCName,
      Cost_A: dc.Cost_A,
      Cost_B: dc.Cost_B,
      Cost_Delta: dc.Cost_Delta,
      Util_A: dc.Util_A,
      Util_B: dc.Util_B,
      Util_Delta: dc.Util_Delta,
      Space_A: dc.Space_A,
      Space_B: dc.Space_B,
      Space_Delta: dc.Space_Delta,
      SLABreach_A: dc.SLABreach_A,
      SLABreach_B: dc.SLABreach_B,
    }));
    const csv = toCSV(rows);
    downloadBlob(csv, `${comparisonId}_dc_diff.csv`, 'text/csv;charset=utf-8;');
    triggerAction('comparison_export_dc');
  };

  const dcComparisonColumns: Column<ComparisonDetailDC>[] = [
    { key: 'DCName', header: 'DC Name', sortable: true },
    {
      key: 'Cost_A',
      header: `Cost A`,
      sortable: true,
      render: (row) => `$${row.Cost_A.toLocaleString()}`,
    },
    {
      key: 'Cost_B',
      header: `Cost B`,
      sortable: true,
      render: (row) => `$${row.Cost_B.toLocaleString()}`,
    },
    {
      key: 'Cost_Delta',
      header: 'Cost Delta',
      sortable: true,
      render: (row) => (
        <span className={row.Cost_Delta > 0 ? 'text-red-600 font-medium' : row.Cost_Delta < 0 ? 'text-green-600 font-medium' : ''}>
          {row.Cost_Delta > 0 ? '+' : ''}${row.Cost_Delta.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'Util_A',
      header: 'Util A',
      sortable: true,
      render: (row) => `${row.Util_A}%`,
    },
    {
      key: 'Util_B',
      header: 'Util B',
      sortable: true,
      render: (row) => `${row.Util_B}%`,
    },
    {
      key: 'Util_Delta',
      header: 'Util Delta',
      sortable: true,
      render: (row) => (
        <span className={row.Util_Delta > 0 ? 'text-amber-600' : row.Util_Delta < 0 ? 'text-green-600' : ''}>
          {row.Util_Delta > 0 ? '+' : ''}{row.Util_Delta}%
        </span>
      ),
    },
    {
      key: 'SLABreach_A',
      header: 'SLA A',
      sortable: true,
    },
    {
      key: 'SLABreach_B',
      header: 'SLA B',
      sortable: true,
    },
  ];

  const laneComparisonColumns: Column<ComparisonDetailLane>[] = [
    { key: 'Dest3Zip', header: '3-Zip', width: '80px', sortable: true },
    { key: 'Channel', header: 'Channel', width: '80px', sortable: true },
    { key: 'Terms', header: 'Terms', width: '80px', sortable: true },
    { key: 'CustomerGroup', header: 'Customer', width: '120px', sortable: true },
    {
      key: 'DC_A',
      header: 'DC A',
      width: '100px',
      render: (row) => (
        <span className={row.DC_A !== row.DC_B ? 'font-medium text-blue-600' : ''}>
          {row.DC_A}
        </span>
      ),
    },
    {
      key: 'DC_B',
      header: 'DC B',
      width: '100px',
      render: (row) => (
        <span className={row.DC_A !== row.DC_B ? 'font-medium text-blue-600' : ''}>
          {row.DC_B}
        </span>
      ),
    },
    {
      key: 'Cost_Delta',
      header: 'Cost Delta',
      width: '100px',
      sortable: true,
      render: (row) => (
        <span className={row.Cost_Delta > 0 ? 'text-red-600' : row.Cost_Delta < 0 ? 'text-green-600' : ''}>
          ${row.Cost_Delta.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'Days_Delta',
      header: 'Days Delta',
      width: '100px',
      sortable: true,
      render: (row) => (
        <span className={row.Days_Delta > 0 ? 'text-red-600' : row.Days_Delta < 0 ? 'text-green-600' : ''}>
          {row.Days_Delta > 0 ? '+' : ''}{row.Days_Delta}
        </span>
      ),
    },
    {
      key: 'Flags',
      header: 'Flags',
      width: '150px',
      render: (row) => (
        <div className="flex gap-1 flex-wrap">
          {row.Flags.split(',').map((flag, idx) => (
            flag && <span key={idx} className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">{flag}</span>
          ))}
        </div>
      ),
    },
  ];

  const kpiComparisons = [
    { label: 'Total Cost', valueA: scenarioA?.TotalCost || 0, valueB: scenarioB?.TotalCost || 0, format: 'currency' as const },
    { label: 'Cost per Unit', valueA: scenarioA?.CostPerUnit || 0, valueB: scenarioB?.CostPerUnit || 0, format: 'decimal' as const },
    { label: 'Avg Days', valueA: scenarioA?.AvgDeliveryDays || 0, valueB: scenarioB?.AvgDeliveryDays || 0, format: 'decimal' as const },
    { label: 'SLA Breach %', valueA: scenarioA?.SLABreachPct || 0, valueB: scenarioB?.SLABreachPct || 0, format: 'decimal' as const },
    { label: 'Excluded SLA', valueA: scenarioA?.ExcludedBySLACount || 0, valueB: scenarioB?.ExcludedBySLACount || 0, format: 'number' as const },
    { label: 'Max Util %', valueA: scenarioA?.MaxUtilPct || 0, valueB: scenarioB?.MaxUtilPct || 0, format: 'number' as const },
    { label: 'Total Space', valueA: scenarioA?.TotalSpaceRequired || 0, valueB: scenarioB?.TotalSpaceRequired || 0, format: 'number' as const },
    { label: 'Space Core', valueA: scenarioA?.SpaceCore || 0, valueB: scenarioB?.SpaceCore || 0, format: 'number' as const },
    { label: 'Space BCV', valueA: scenarioA?.SpaceBCV || 0, valueB: scenarioB?.SpaceBCV || 0, format: 'number' as const },
    { label: 'Overrides', valueA: scenarioA?.OverrideCount || 0, valueB: scenarioB?.OverrideCount || 0, format: 'number' as const },
    { label: 'Changed Lanes', valueA: scenarioA?.ChangedLaneCountVsBaseline || 0, valueB: scenarioB?.ChangedLaneCountVsBaseline || 0, format: 'number' as const },
  ];

  const formatValue = (val: number, format: 'currency' | 'decimal' | 'number'): string => {
    switch (format) {
      case 'currency':
        return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
      case 'decimal':
        return val.toFixed(2);
      default:
        return val.toLocaleString('en-US');
    }
  };

  const tabs: Tab[] = [
    {
      id: 'kpi',
      label: 'KPI Compare',
      icon: <BarChart3 className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <KPICard
              label="Cost Delta"
              value={comparison.CostDelta}
              format="currency"
              size="medium"
            />
            <KPICard
              label="Cost Delta %"
              value={comparison.CostDeltaPct}
              format="decimal"
              size="medium"
            />
            <KPICard
              label="Changed Lanes"
              value={comparison.ChangedLaneDelta}
              format="number"
              size="medium"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">KPI</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Run A</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Run B</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Delta</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Delta %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {kpiComparisons.map((kpi, idx) => {
                  const delta = kpi.valueB - kpi.valueA;
                  const deltaPct = kpi.valueA !== 0 ? (delta / kpi.valueA) * 100 : 0;
                  const isNegativeBetter = ['SLA Breach %', 'Excluded SLA', 'Max Util %'].includes(kpi.label);

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{kpi.label}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">{formatValue(kpi.valueA, kpi.format)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">{formatValue(kpi.valueB, kpi.format)}</td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        delta > 0 ? (isNegativeBetter ? 'text-red-600' : 'text-red-600') :
                        delta < 0 ? (isNegativeBetter ? 'text-green-600' : 'text-green-600') :
                        'text-slate-700'
                      }`}>
                        {delta > 0 ? '+' : ''}{formatValue(delta, kpi.format)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        delta > 0 ? (isNegativeBetter ? 'text-red-600' : 'text-red-600') :
                        delta < 0 ? (isNegativeBetter ? 'text-green-600' : 'text-green-600') :
                        'text-slate-700'
                      }`}>
                        {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {comparison.DecisionVerdict && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-1">Decision: {comparison.DecisionVerdict}</h3>
                  <p className="text-sm text-green-800">{comparison.DecisionReason}</p>
                  <p className="text-xs text-green-700 mt-2">
                    Decision by {comparison.CreatedBy} on {new Date(comparison.CreatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'dc',
      label: 'DC Compare',
      icon: <Building2 className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Utilization Comparison</h3>
              <div className="space-y-3">
                {dcComparison.map((dc) => (
                  <div key={dc.DCName}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700">{dc.DCName}</span>
                      <span className="font-medium">{dc.Util_A}% vs {dc.Util_B}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-200 rounded h-2 overflow-hidden">
                        <div className="bg-blue-500 h-2" style={{ width: `${dc.Util_A}%` }} />
                      </div>
                      <div className="bg-slate-200 rounded h-2 overflow-hidden">
                        <div className="bg-green-500 h-2" style={{ width: `${dc.Util_B}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                {dcComparison.length === 0 && (
                  <div className="text-sm text-slate-500">No DC comparison data available.</div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Cost by DC</h3>
              <div className="space-y-3">
                {dcComparison.map((dc) => {
                  const maxCost = Math.max(dc.Cost_A, dc.Cost_B, 1);
                  return (
                    <div key={dc.DCName}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700">{dc.DCName}</span>
                        <span className="font-medium">${dc.Cost_A.toLocaleString()} vs ${dc.Cost_B.toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-200 rounded h-2 overflow-hidden">
                          <div className="bg-blue-500 h-2" style={{ width: `${(dc.Cost_A / maxCost) * 100}%` }} />
                        </div>
                        <div className="bg-slate-200 rounded h-2 overflow-hidden">
                          <div className="bg-green-500 h-2" style={{ width: `${(dc.Cost_B / maxCost) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {dcComparison.length === 0 && (
                  <div className="text-sm text-slate-500">No DC comparison data available.</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">DC Comparison Detail</h3>
            <DataTable
              columns={dcComparisonColumns}
              data={dcComparison}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'lanes',
      label: 'Lane Diff',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              value={laneDiffFilter}
              onChange={(e) => setLaneDiffFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option>Only Changed Lanes</option>
              <option>All Lanes</option>
              <option>Only SLA Worsened</option>
              <option>Only Capacity Improved</option>
              <option>Top 50 Cost Impact</option>
              <option>Top 100 Cost Impact</option>
            </select>

            <select
              value={laneChannelFilter}
              onChange={(e) => setLaneChannelFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option>All Channels</option>
              <option>B2C</option>
              <option>B2B</option>
              <option>D2C</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Showing {filteredLaneComparison.length} lane(s) with differences between the two scenarios.
              Use filters above to focus on specific types of changes.
            </p>
          </div>

          <DataTable
            columns={laneComparisonColumns}
            data={filteredLaneComparison}
            maxHeight="600px"
          />
        </div>
      ),
    },
    {
      id: 'exceptions',
      label: 'Exceptions Compare',
      icon: <AlertTriangle className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-sm text-slate-600 mb-1">SLA Breaches A</div>
              <div className="text-3xl font-bold text-slate-900">{scenarioA?.ExcludedBySLACount || 0}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-sm text-slate-600 mb-1">SLA Breaches B</div>
              <div className="text-3xl font-bold text-slate-900">{scenarioB?.ExcludedBySLACount || 0}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-sm text-slate-600 mb-1">Delta</div>
              <div className={`text-3xl font-bold ${
                (scenarioB?.ExcludedBySLACount || 0) - (scenarioA?.ExcludedBySLACount || 0) > 0
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}>
                {(scenarioB?.ExcludedBySLACount || 0) - (scenarioA?.ExcludedBySLACount || 0) > 0 ? '+' : ''}
                {(scenarioB?.ExcludedBySLACount || 0) - (scenarioA?.ExcludedBySLACount || 0)}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-sm text-slate-600 mb-1">Change</div>
              <div className={`text-2xl font-bold ${comparison.SLABreachDelta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {comparison.SLABreachDelta > 0 ? 'Worse' : comparison.SLABreachDelta < 0 ? 'Better' : 'Same'}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Exception Summary</h3>

            <div className="space-y-4">
              {[
                {
                  label: 'DC Changes',
                  count: laneComparison.filter(l => l.Flags.includes('DCChange')).length,
                  note: 'Lanes with a different assigned DC between A and B',
                },
                {
                  label: 'SLA Worsened',
                  count: laneComparison.filter(l => l.Flags.includes('SLA')).length,
                  note: 'Lanes with higher delivery days in B',
                },
                {
                  label: 'Overrides Involved',
                  count: laneComparison.filter(l => l.Flags.includes('Override')).length,
                  note: 'Lanes impacted by manual overrides',
                },
              ].map((item) => (
                <div key={item.label} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-900">{item.label}</h4>
                    <div className="text-sm text-slate-700">
                      Count: <strong className="text-slate-900">{item.count}</strong>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{item.note}</p>
                </div>
              ))}
              {laneComparison.length === 0 && (
                <div className="text-sm text-slate-500">No lane exceptions available for this comparison.</div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportLaneDiff}
              className={isActionActive('comparison_export_lane') ? 'bg-amber-100 text-amber-800' : ''}
            >
              {isActionActive('comparison_export_lane') ? 'Exporting...' : 'Export Exceptions Diff CSV'}
            </Button>
          </div>
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
                <h1 className="text-xl font-semibold text-slate-900">{comparison.ComparisonName}</h1>
                <StatusBadge status={comparison.Status} />
              </div>
              <div className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                <span className="font-medium text-blue-600">{scenarioA?.RunName}</span>
                <ArrowLeftRight className="w-4 h-4" />
                <span className="font-medium text-blue-600">{scenarioB?.RunName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">
              Run A: <span className="font-medium text-slate-900">{scenarioA?.RunName}</span>
            </div>
            <div className="text-sm text-slate-600">
              Run B: <span className="font-medium text-slate-900">{scenarioB?.RunName}</span>
            </div>

            <div className="flex-1" />

            <div className="relative group">
              <Button variant="secondary" size="small" icon={<Download className="w-4 h-4" />}>
                Export
              </Button>
              <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                <button
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${isActionActive('comparison_export_pack') ? 'bg-amber-50 text-amber-800' : ''}`}
                  onClick={handleExportComparisonPack}
                >
                  {isActionActive('comparison_export_pack') ? 'Exporting Comparison Pack...' : 'Export Comparison Pack CSV'}
                </button>
                <button
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${isActionActive('comparison_export_lane') ? 'bg-amber-50 text-amber-800' : ''}`}
                  onClick={handleExportLaneDiff}
                >
                  {isActionActive('comparison_export_lane') ? 'Exporting Lane Diff...' : 'Export Lane Diff CSV'}
                </button>
                <button
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${isActionActive('comparison_export_dc') ? 'bg-amber-50 text-amber-800' : ''}`}
                  onClick={handleExportDCDiff}
                >
                  {isActionActive('comparison_export_dc') ? 'Exporting DC Diff...' : 'Export DC Diff CSV'}
                </button>
              </div>
            </div>

            {!comparison.DecisionVerdict && (
              <Button
                onClick={() => setShowDecisionModal(true)}
                variant="primary"
                size="small"
              >
                Add Decision
              </Button>
            )}

            {comparison.Status !== 'Published' && (
              <Button
                variant="primary"
                size="small"
                onClick={() => {
                  onPublishComparison(comparison.ComparisonID);
                  triggerAction('comparison_publish');
                }}
                className={isActionActive('comparison_publish') ? 'bg-amber-500 text-white' : ''}
              >
                {isActionActive('comparison_publish') ? 'Publishing...' : 'Publish'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-6 py-6">
        <Tabs tabs={tabs} defaultTab="kpi" />
      </div>

      <Modal
        isOpen={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        title="Add Decision"
        size="medium"
        footer={
          <>
            <Button onClick={() => setShowDecisionModal(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (decisionVerdict.trim()) {
                  onAddDecision(comparisonId, decisionVerdict, decisionReason);
                  triggerAction('comparison_decision');
                }
                setShowDecisionModal(false);
              }}
              variant="primary"
            >
              {isActionActive('comparison_decision') ? 'Saving...' : 'Save Decision'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Decision Verdict
            </label>
            <select
              value={decisionVerdict}
              onChange={(e) => setDecisionVerdict(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select verdict...</option>
              <option value="Recommend A">Recommend A</option>
              <option value="Recommend B">Recommend B</option>
              <option value="No clear winner">No clear winner</option>
              <option value="Needs more data">Needs more data</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Decision Reason
            </label>
            <textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Explain the rationale for this decision..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
