import React from 'react';
import { ComparisonDetailLane, ComparisonHeader, ScenarioRunHeader } from '@/data';
import { useAnimatedValue } from '@/components/ui/KPICard';

interface AnimatedCountProps {
  value: number;
}

const formatValue = (val: number): string => {
  return Number(val.toFixed(3)).toLocaleString('en-US', { maximumFractionDigits: 3 });
};

const AnimatedCount: React.FC<AnimatedCountProps> = ({ value }) => {
  const animated = useAnimatedValue(value);
  const formatted = typeof animated === 'number'
    ? formatValue(animated)
    : animated;
  return <>{formatted}</>;
};

interface ComparisonExceptionsTabProps {
  laneComparison: ComparisonDetailLane[];
  comparison: ComparisonHeader;
  scenarioA?: ScenarioRunHeader;
  scenarioB?: ScenarioRunHeader;
}

export const ComparisonExceptionsTab: React.FC<ComparisonExceptionsTabProps> = ({
  laneComparison,
  comparison,
  scenarioA,
  scenarioB,
}) => {
  const countA = scenarioA?.ExcludedBySLACount || 0;
  const countB = scenarioB?.ExcludedBySLACount || 0;
  const delta = countB - countA;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 min-w-0 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 break-words" title="SLA Breaches A">SLA Breaches A</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 break-words" title={formatValue(countA)}>
            <AnimatedCount value={countA} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 min-w-0 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 break-words" title="SLA Breaches B">SLA Breaches B</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 break-words" title={formatValue(countB)}>
            <AnimatedCount value={countB} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 min-w-0 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 break-words" title="Delta">Delta</div>
          <div className={`text-2xl sm:text-3xl font-bold break-words ${delta > 0 ? 'text-red-600' : 'text-green-600'}`} title={(delta > 0 ? '+' : '') + formatValue(delta)}>
            {delta > 0 ? '+' : ''}
            <AnimatedCount value={delta} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 min-w-0 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 break-words" title="Change">Change</div>
          <div className={`text-xl sm:text-2xl font-bold break-words ${comparison.SLABreachDelta > 0 ? 'text-red-600' : 'text-green-600'}`} title={comparison.SLABreachDelta > 0 ? 'Worse' : comparison.SLABreachDelta < 0 ? 'Better' : 'Same'}>
            {comparison.SLABreachDelta > 0 ? 'Worse' : comparison.SLABreachDelta < 0 ? 'Better' : 'Same'}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
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
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h4 className="font-medium text-slate-900">{item.label}</h4>
                <div className="text-sm text-slate-700">
                  Count: <strong className="text-slate-900"><AnimatedCount value={item.count} /></strong>
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
    </div>
  );
};
