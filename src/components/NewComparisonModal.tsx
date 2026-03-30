import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ScenarioRunHeader } from '../data/mockData';

interface NewComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (payload: NewComparisonSubmit) => void;
  scenarioRunHeaders: ScenarioRunHeader[];
  preselectedA?: string;
  preselectedB?: string;
}

export interface NewComparisonSubmit {
  comparisonName: string;
  runA: string;
  runB: string;
  notes: string;
}

export const NewComparisonModal: React.FC<NewComparisonModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  scenarioRunHeaders,
  preselectedA,
  preselectedB,
}) => {
  const [runA, setRunA] = useState(preselectedA || '');
  const [runB, setRunB] = useState(preselectedB || '');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  const sortedScenarios = useMemo(() => {
    return [...scenarioRunHeaders].sort((a, b) => (
      new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()
    ));
  }, [scenarioRunHeaders]);

  useEffect(() => {
    if (!isOpen) return;
    setRunA(preselectedA || '');
    setRunB(preselectedB || '');
  }, [isOpen, preselectedA, preselectedB]);

  useEffect(() => {
    if (!isOpen) return;
    if (runA && !scenarioRunHeaders.find(s => s.ScenarioRunID === runA)) {
      setRunA('');
    }
    if (runB && !scenarioRunHeaders.find(s => s.ScenarioRunID === runB)) {
      setRunB('');
    }
  }, [isOpen, runA, runB, scenarioRunHeaders]);

  const handleCreate = () => {
    onComplete({
      comparisonName: name.trim() || `${scenarioA?.RunName || 'Run A'} vs ${scenarioB?.RunName || 'Run B'}`,
      runA,
      runB,
      notes,
    });
    onClose();
  };

  const scenarioA = scenarioRunHeaders.find(s => s.ScenarioRunID === runA);
  const scenarioB = scenarioRunHeaders.find(s => s.ScenarioRunID === runB);

  const canCompare = runA && runB && runA !== runB;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Comparison"
      size="large"
      footer={
        <>
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button onClick={handleCreate} variant="primary" disabled={!canCompare}>
            Create Comparison
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Comparison Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Baseline vs Strategic Pharr Expansion"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Run A (Baseline)
            </label>
            <select
              value={runA}
              onChange={(e) => setRunA(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select scenario...</option>
              {sortedScenarios.map((scenario) => (
                <option key={scenario.ScenarioRunID} value={scenario.ScenarioRunID}>
                  {scenario.RunName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Run B (Comparison)
            </label>
            <select
              value={runB}
              onChange={(e) => setRunB(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select scenario...</option>
              {sortedScenarios.map((scenario) => (
                <option key={scenario.ScenarioRunID} value={scenario.ScenarioRunID}>
                  {scenario.RunName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {canCompare && scenarioA && scenarioB && (
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Preview</h3>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="font-medium text-slate-600">Metric</div>
              <div className="font-medium text-slate-600 text-center">Run A</div>
              <div className="font-medium text-slate-600 text-center">Run B</div>

              <div className="text-slate-700">Total Cost</div>
              <div className="text-center">${scenarioA.TotalCost.toLocaleString()}</div>
              <div className="text-center">${scenarioB.TotalCost.toLocaleString()}</div>

              <div className="text-slate-700">Cost / Unit</div>
              <div className="text-center">${scenarioA.CostPerUnit.toFixed(2)}</div>
              <div className="text-center">${scenarioB.CostPerUnit.toFixed(2)}</div>

              <div className="text-slate-700">Avg Days</div>
              <div className="text-center">{scenarioA.AvgDeliveryDays.toFixed(1)}</div>
              <div className="text-center">{scenarioB.AvgDeliveryDays.toFixed(1)}</div>

              <div className="text-slate-700">SLA Breach %</div>
              <div className="text-center">{scenarioA.SLABreachPct.toFixed(1)}%</div>
              <div className="text-center">{scenarioB.SLABreachPct.toFixed(1)}%</div>

              <div className="text-slate-700">Max Util %</div>
              <div className="text-center">{scenarioA.MaxUtilPct.toFixed(2)}%</div>
              <div className="text-center">{scenarioB.MaxUtilPct.toFixed(2)}%</div>

              <div className="text-slate-700 font-semibold pt-2 border-t border-slate-200">Delta</div>
              <div className={`text-center font-semibold pt-2 border-t border-slate-200 ${
                scenarioB.TotalCost - scenarioA.TotalCost > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                ${Math.abs(scenarioB.TotalCost - scenarioA.TotalCost).toLocaleString()}
              </div>
              <div className={`text-center font-semibold pt-2 border-t border-slate-200 ${
                scenarioB.TotalCost - scenarioA.TotalCost > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {((scenarioB.TotalCost - scenarioA.TotalCost) / scenarioA.TotalCost * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Purpose of this comparison..."
          />
        </div>
      </div>
    </Modal>
  );
};
