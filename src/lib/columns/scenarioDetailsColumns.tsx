import { Column } from '@/components/ui';
import { ScenarioRunResultsDC, ScenarioRunResultsLane, getAdditionalCostsForDc } from '@/data';
import { formatCurrencyOrNA, formatDecimalOrNA, formatNumberOrNA, formatPercentOrNA, formatTextOrNA } from '@/utils';

export const createScenarioDcColumns = (isBaseline = false, utilCap = 85): Column<ScenarioRunResultsDC>[] => [
  { key: 'DCName', header: 'DC Name', sortable: true },
  {
    key: 'TotalCost',
    header: 'Variable Cost',
    sortable: true,
    render: (row) => {
      if (isBaseline) {
        const dcCosts = getAdditionalCostsForDc(row.DCName);
        const rentVal = row.Rent ?? dcCosts.Rent;
        const laborVal = row.ContractLabor ?? dcCosts.ContractLabor;
        const feeVal = row.ManagementFee ?? dcCosts.ManagementFee;
        const addCost = rentVal + laborVal + feeVal;
        return formatCurrencyOrNA(Math.max(0, row.TotalCost - addCost));
      }
      return formatCurrencyOrNA(row.TotalCost);
    },
  },
  {
    key: 'Rent',
    header: 'Rent',
    sortable: true,
    render: (row) => {
      const dcCosts = getAdditionalCostsForDc(row.DCName);
      const rentVal = row.Rent ?? dcCosts.Rent;
      return formatCurrencyOrNA(row.IsSuppressed === 'N' ? rentVal : 0);
    },
  },
  {
    key: 'ContractLabor',
    header: 'Contract Labor',
    sortable: true,
    render: (row) => {
      const dcCosts = getAdditionalCostsForDc(row.DCName);
      const laborVal = row.ContractLabor ?? dcCosts.ContractLabor;
      return formatCurrencyOrNA(row.IsSuppressed === 'N' ? laborVal : 0);
    },
  },
  {
    key: 'ManagementFee',
    header: 'Mgt Fee',
    sortable: true,
    render: (row) => {
      const dcCosts = getAdditionalCostsForDc(row.DCName);
      const feeVal = row.ManagementFee ?? dcCosts.ManagementFee;
      return formatCurrencyOrNA(row.IsSuppressed === 'N' ? feeVal : 0);
    },
  },
  {
    key: 'CombinedCost',
    header: 'Total Cost',
    sortable: true,
    render: (row) => {
      const dcCosts = getAdditionalCostsForDc(row.DCName);
      const rentVal = row.Rent ?? dcCosts.Rent;
      const laborVal = row.ContractLabor ?? dcCosts.ContractLabor;
      const feeVal = row.ManagementFee ?? dcCosts.ManagementFee;
      const addCost = rentVal + laborVal + feeVal;
      
      const totalCostDisplay = isBaseline ? row.TotalCost : row.TotalCost + (row.IsSuppressed === 'N' ? addCost : 0);
      return formatCurrencyOrNA(totalCostDisplay);
    },
  },
  {
    key: 'VolumeUnits',
    header: 'Volume',
    sortable: true,
    render: (row) => formatNumberOrNA(row.VolumeUnits),
  },
  {
    key: 'AvgDays',
    header: 'Avg Days',
    sortable: true,
    render: (row) => formatDecimalOrNA(row.AvgDays, 2),
  },
  {
    key: 'UtilPct',
    header: 'Util %',
    sortable: true,
    render: (row) => (
      <span className={row.UtilPct > utilCap ? 'text-amber-600 font-medium' : ''}>
        {formatPercentOrNA(row.UtilPct, 2)}
      </span>
    ),
  },
  {
    key: 'ActualSpace',
    header: 'Actual Space',
    sortable: true,
    render: (row) => formatNumberOrNA(row.ActualSpace),
  },
  {
    key: 'SpaceRequired',
    header: 'Space Req',
    sortable: true,
    render: (row) => formatNumberOrNA(row.SpaceRequired),
  },
  /*
  {
    key: 'SLABreachCount',
    header: 'SLA Breaches',
    sortable: true,
    render: (row) => (
      <span className={row.SLABreachCount > 5 ? 'text-red-600 font-medium' : ''}>
        {formatNumberOrNA(row.SLABreachCount)}
      </span>
    ),
  },
  */
  {
    key: 'OvercapFlag',
    header: 'Flag',
    sortable: true,
    render: (row) => (
      row.OvercapFlag === 'Y'
        ? <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold">Overcap</span>
        : <span className="text-slate-400">-</span>
    ),
  },
  {
    key: 'RankOverall',
    header: 'Rank',
    sortable: true,
    render: (row) => `#${row.RankOverall}`,
  },
];

export const createScenarioLaneColumns = (): Column<ScenarioRunResultsLane>[] => [
  { key: 'Dest3Zip', header: 'Destination 3ZIP', width: '120px', sortable: true },
  {
    key: 'DefaultShipFrom',
    header: 'Default Warehouse',
    width: '140px',
    sortable: true,
    render: (row) => row.DefaultShipFrom || row.AssignedDC || '-',
  },
  {
    key: 'CostingWarehouse',
    header: 'Costing Warehouse',
    width: '140px',
    sortable: true,
    render: (row) => row.CostingWarehouse || row.DefaultShipFrom || '-',
  },
  {
    key: 'RankedOption1DC',
    header: 'Cheapest to Serve',
    width: '140px',
    sortable: true,
    render: (row) => row.RankedOption1DC || '-',
  },
  {
    key: 'InboundSpend',
    header: 'Inbound Spend',
    width: '110px',
    sortable: true,
    render: (row) => formatCurrencyOrNA(row.InboundSpend ?? null, 2),
  },
  {
    key: 'DistributionCost',
    header: 'Distribution Spend',
    width: '130px',
    sortable: true,
    render: (row) => formatCurrencyOrNA(row.DistributionCost ?? null, 2),
  },
  {
    key: 'ParcelSpend',
    header: 'Parcel Spend',
    width: '110px',
    sortable: true,
    render: (row) => formatCurrencyOrNA(row.ParcelSpend ?? null, 2),
  },
  {
    key: 'DeliveryDays',
    header: 'Service Days',
    width: '100px',
    sortable: true,
    render: (row) => formatDecimalOrNA(row.DeliveryDays ?? row.AvgDeliveryDays, 1),
  },
  {
    key: 'TlSpend',
    header: 'TL Spend',
    width: '110px',
    sortable: true,
    render: (row) => formatCurrencyOrNA(row.TlSpend ?? 0, 2),
  },
  {
    key: 'LtlSpend',
    header: 'LTL Spend',
    width: '110px',
    sortable: true,
    render: (row) => formatCurrencyOrNA(row.LtlSpend ?? 0, 2),
  },
  {
    key: 'TotalCost',
    header: 'Total Spend',
    width: '120px',
    sortable: true,
    render: (row) => formatCurrencyOrNA(row.TotalCost ?? row.LaneCost, 2),
  },
];

export const createScenarioRankedOptionsColumns = (): Column<ScenarioRunResultsLane>[] => [
  { key: 'Dest3Zip', header: 'Destination 3Zip', width: '120px', sortable: true },
  {
    key: 'RankedOption1DC',
    header: 'Option 1',
    width: '180px',
    render: (row) => {
      const dc = row.RankedOption1DC;
      const cost = Number(row.RankedOption1Cost ?? 0);
      if (!dc || cost <= 0) return <span className="text-slate-400 text-xs">- NA</span>;
      return (
        <div className="text-xs">
          <div className="font-medium">{dc}</div>
          <div className="text-slate-600">{formatCurrencyOrNA(cost, 2)}</div>
        </div>
      );
    },
  },
  {
    key: 'RankedOption2DC',
    header: 'Option 2',
    width: '180px',
    render: (row) => {
      const dc = row.RankedOption2DC;
      const cost = Number(row.RankedOption2Cost ?? 0);
      if (!dc || cost <= 0) return <span className="text-slate-400 text-xs">- NA</span>;
      return (
        <div className="text-xs">
          <div className="font-medium">{dc}</div>
          <div className="text-slate-600">{formatCurrencyOrNA(cost, 2)}</div>
        </div>
      );
    },
  },
  {
    key: 'RankedOption3DC',
    header: 'Option 3',
    width: '180px',
    render: (row) => {
      const dc = row.RankedOption3DC;
      const cost = Number(row.RankedOption3Cost ?? 0);
      if (!dc || cost <= 0) return <span className="text-slate-400 text-xs">- NA</span>;
      return (
        <div className="text-xs">
          <div className="font-medium">{dc}</div>
          <div className="text-slate-600">{formatCurrencyOrNA(cost, 2)}</div>
        </div>
      );
    },
  },
  {
    key: 'RankedOption4DC',
    header: 'Option 4',
    width: '180px',
    render: (row) => {
      const dc = (row as any).RankedOption4DC;
      const cost = Number((row as any).RankedOption4Cost ?? 0);
      if (!dc || cost <= 0) return <span className="text-slate-400 text-xs">- NA</span>;
      return (
        <div className="text-xs">
          <div className="font-medium">{dc}</div>
          <div className="text-slate-600">{formatCurrencyOrNA(cost, 2)}</div>
        </div>
      );
    },
  },
  {
    key: 'DefaultShipFrom',
    header: 'Selected',
    width: '140px',
    render: (row) => (
      <div className="font-medium text-blue-600">{row.DefaultShipFrom || row.AssignedDC || '-'}</div>
    ),
  },
];
