import React from 'react';
import { KPICard } from '@/components/ui';

interface HomeKpiRowProps {
  aggregateKPIs: {
    totalCost: number;
    avgDeliveryDays: number;
    maxUtilPct: number;
    totalSpaceRequired: number;
    slaBreachPct: number;
  };
}

export const HomeKpiRow: React.FC<HomeKpiRowProps> = ({ aggregateKPIs }) => {
  return (
    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <KPICard
        label="Total Cost"
        value={aggregateKPIs.totalCost}
        format="currency"
        size="small"
      />
      <KPICard
        label="Avg Delivery Days"
        value={aggregateKPIs.avgDeliveryDays}
        format="decimal"
        size="small"
      />
      <KPICard
        label="Max Utilization"
        value={aggregateKPIs.maxUtilPct}
        format="percent"
        size="small"
      />
      <KPICard
        label="Total Space"
        value={aggregateKPIs.totalSpaceRequired}
        format="number"
        size="small"
      />
      <KPICard
        label="SLA Breach %"
        value={aggregateKPIs.slaBreachPct}
        format="decimal"
        size="small"
      />
    </div>
  );
};
