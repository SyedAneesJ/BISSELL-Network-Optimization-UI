export interface ScenarioRunHeader {
  ScenarioRunID: string;
  RunName: string;
  Region: 'US' | 'Canada';
  ScenarioType: 'Baseline' | 'Tactical Fixed Footprint' | 'Strategic Unconstrained Footprint' | 'Consolidation Tactical' | 'Consolidation Strategic' | 'BCV Ingestion Only';
  EntityScope: 'Core' | 'BCV' | 'Core+BCV';
  ChannelScope: string;
  TermsScope: 'Collect' | 'Prepaid' | 'Collect+Prepaid';
  CreatedBy: string;
  CreatedAt: string;
  LastUpdatedAt: string;
  Status: 'Draft' | 'Running' | 'Completed' | 'Reviewed' | 'Published' | 'Archived';
  ApprovedBy: string | null;
  ApprovedAt: string | null;
  LatestComment: string;
  Tags: string;
  DataSnapshotVersion: string;
  AssumptionsSummary: string;
  AlertFlags: string;
  TotalCost: number;
  CostPerUnit: number;
  AvgDeliveryDays: number;
  SLABreachPct: number;
  ExcludedBySLACount: number;
  MaxUtilPct: number;
  TotalSpaceRequired: number;
  SpaceCore: number;
  SpaceBCV: number;
  OverrideCount: number;
  LaneCount: number;
  ChangedLaneCountVsBaseline: number;
}

export interface ScenarioRunConfig {
  ScenarioRunID: string;
  ActiveDCs: string;
  SuppressedDCs: string;
  FootprintMode: 'Fixed' | 'Unconstrained';
  UtilCapPct: number;
  LevelLoadMode: 'On' | 'Off';
  LeadTimeCapDays: number | null;
  CostVsServiceWeight: number;
  AllowRelocationPrepaid: 'Y' | 'N';
  AllowRelocationCollect: 'Y' | 'N';
  BCVRuleSet: 'Default' | 'Custom';
  FuelSurchargeMode: 'FromRates' | 'Override';
  FuelSurchargeOverridePct: number | null;
  AccessorialFlags: string;
  Notes: string;
}

export interface ScenarioRunResultsDC {
  ScenarioRunID: string;
  DCName: string;
  TotalCost: number;
  VolumeUnits: number;
  AvgDays: number;
  UtilPct: number;
  SpaceRequired: number;
  SpaceCore: number;
  SpaceBCV: number;
  SLABreachCount: number;
  ExcludedBySLACount: number;
  RankOverall: number;
  IsSuppressed: 'Y' | 'N';
}

export interface ScenarioRunResultsLane {
  ScenarioRunID: string;
  Dest3Zip: string;
  DestState: string;
  Channel: 'B2C' | 'B2B' | 'D2C';
  Terms: 'Collect' | 'Prepaid';
  CustomerGroup: string;
  AssignedDC: string;
  RankedOption1DC: string;
  RankedOption1Cost: number;
  RankedOption1Days: number;
  RankedOption2DC: string;
  RankedOption2Cost: number;
  RankedOption2Days: number;
  RankedOption3DC: string;
  RankedOption3Cost: number;
  RankedOption3Days: number;
  ChosenRank: number;
  LaneCost: number;
  CostDeltaVsBest: number;
  DeliveryDays: number;
  SLABreachFlag: 'Y' | 'N';
  ExcludedBySLAFlag: 'Y' | 'N';
  FootprintContribution: number;
  UtilImpactPct: number;
  OverrideAppliedFlag: 'Y' | 'N';
  OverrideVersion: string | null;
  NotesFlag: string;
}

export interface ScenarioOverride {
  ScenarioRunID: string;
  OverrideVersion: string;
  Dest3Zip: string;
  Channel: string;
  Terms: string;
  CustomerGroup: string;
  OldDC: string;
  NewDC: string;
  ReasonCode: 'Capacity' | 'SLA' | 'CustomerPreference' | 'OpsLimitation' | 'FinanceDirective' | 'Other';
  Comment: string;
  UpdatedBy: string;
  UpdatedAt: string;
}

export interface ComparisonHeader {
  ComparisonID: string;
  ComparisonName: string;
  ScenarioRunID_A: string;
  ScenarioRunID_B: string;
  CreatedBy: string;
  CreatedAt: string;
  Status: 'Working' | 'Published' | 'Archived';
  Notes: string;
  DecisionVerdict: string | null;
  DecisionReason: string | null;
  CostDelta: number;
  CostDeltaPct: number;
  AvgDaysDelta: number;
  SLABreachDelta: number;
  MaxUtilDelta: number;
  SpaceDelta: number;
  SpaceCoreDelta: number;
  SpaceBCVDelta: number;
  ChangedLaneDelta: number;
}

export interface ComparisonDetailDC {
  ComparisonID: string;
  DCName: string;
  Cost_A: number;
  Cost_B: number;
  Cost_Delta: number;
  Util_A: number;
  Util_B: number;
  Util_Delta: number;
  Space_A: number;
  Space_B: number;
  Space_Delta: number;
  SLABreach_A: number;
  SLABreach_B: number;
}

export interface ComparisonDetailLane {
  ComparisonID: string;
  Dest3Zip: string;
  Channel: string;
  Terms: string;
  CustomerGroup: string;
  DC_A: string;
  DC_B: string;
  Cost_A: number;
  Cost_B: number;
  Cost_Delta: number;
  Days_A: number;
  Days_B: number;
  Days_Delta: number;
  UtilImpact_A: number;
  UtilImpact_B: number;
  Flags: string;
}

export interface DataHealthSnapshot {
  SnapshotTime: string;
  ForecastFreshness: 'OK' | 'Warn' | 'Error';
  RatesCoveragePct: number;
  MissingRatesLaneCount: number;
  CapacityFreshness: 'OK' | 'Warn' | 'Error';
  MissingCapacityDCCount: number;
  BCVDimsAvailability: 'OK' | 'Assumed' | 'Missing';
  Notes: string;
}

export const scenarioRunHeaders: ScenarioRunHeader[] = [
  {
    ScenarioRunID: 'SR001',
    RunName: 'Q1 2026 Baseline US',
    Region: 'US',
    ScenarioType: 'Baseline',
    EntityScope: 'Core+BCV',
    ChannelScope: 'B2C,B2B,D2C',
    TermsScope: 'Collect+Prepaid',
    CreatedBy: 'Sarah Chen',
    CreatedAt: '2026-01-05T09:15:00',
    LastUpdatedAt: '2026-01-05T10:42:00',
    Status: 'Published',
    ApprovedBy: 'Michael Torres',
    ApprovedAt: '2026-01-05T14:20:00',
    LatestComment: 'Approved for Q1 planning baseline',
    Tags: 'Quarterly,Baseline',
    DataSnapshotVersion: '2026.01.04',
    AssumptionsSummary: 'BCV dims assumed via carton avg',
    AlertFlags: '',
    TotalCost: 12847320,
    CostPerUnit: 6.42,
    AvgDeliveryDays: 4.2,
    SLABreachPct: 2.1,
    ExcludedBySLACount: 14,
    MaxUtilPct: 78,
    TotalSpaceRequired: 342000,
    SpaceCore: 268000,
    SpaceBCV: 74000,
    OverrideCount: 0,
    LaneCount: 1847,
    ChangedLaneCountVsBaseline: 0,
  },
  {
    ScenarioRunID: 'SR002',
    RunName: 'Q1 2026 Tactical - DC4 Suppressed',
    Region: 'US',
    ScenarioType: 'Tactical Fixed Footprint',
    EntityScope: 'Core+BCV',
    ChannelScope: 'B2C,B2B,D2C',
    TermsScope: 'Collect+Prepaid',
    CreatedBy: 'Sarah Chen',
    CreatedAt: '2026-01-06T11:22:00',
    LastUpdatedAt: '2026-01-06T13:18:00',
    Status: 'Completed',
    ApprovedBy: null,
    ApprovedAt: null,
    LatestComment: 'Testing impact of DC4 closure for maintenance',
    Tags: 'Tactical,DC4',
    DataSnapshotVersion: '2026.01.04',
    AssumptionsSummary: 'BCV dims assumed via carton avg',
    AlertFlags: 'OverCap,SLA',
    TotalCost: 13124680,
    CostPerUnit: 6.56,
    AvgDeliveryDays: 4.8,
    SLABreachPct: 8.4,
    ExcludedBySLACount: 72,
    MaxUtilPct: 94,
    TotalSpaceRequired: 342000,
    SpaceCore: 268000,
    SpaceBCV: 74000,
    OverrideCount: 0,
    LaneCount: 1775,
    ChangedLaneCountVsBaseline: 243,
  },
  {
    ScenarioRunID: 'SR003',
    RunName: 'Q1 2026 Strategic - Pharr Expansion',
    Region: 'US',
    ScenarioType: 'Strategic Unconstrained Footprint',
    EntityScope: 'Core+BCV',
    ChannelScope: 'B2C,B2B,D2C',
    TermsScope: 'Collect+Prepaid',
    CreatedBy: 'James Kim',
    CreatedAt: '2026-01-07T08:45:00',
    LastUpdatedAt: '2026-01-08T16:32:00',
    Status: 'Reviewed',
    ApprovedBy: null,
    ApprovedAt: null,
    LatestComment: 'Ready for executive review - shows 4.2% cost reduction',
    Tags: 'Strategic,Pharr',
    DataSnapshotVersion: '2026.01.04',
    AssumptionsSummary: 'BCV dims assumed via carton avg; Pharr capacity +50k sqft',
    AlertFlags: '',
    TotalCost: 12298450,
    CostPerUnit: 6.15,
    AvgDeliveryDays: 3.9,
    SLABreachPct: 1.2,
    ExcludedBySLACount: 8,
    MaxUtilPct: 82,
    TotalSpaceRequired: 392000,
    SpaceCore: 308000,
    SpaceBCV: 84000,
    OverrideCount: 5,
    LaneCount: 1847,
    ChangedLaneCountVsBaseline: 186,
  },
  {
    ScenarioRunID: 'SR004',
    RunName: 'Peak Season Q4 2025 Baseline',
    Region: 'US',
    ScenarioType: 'Baseline',
    EntityScope: 'Core',
    ChannelScope: 'B2C,D2C',
    TermsScope: 'Prepaid',
    CreatedBy: 'Maria Rodriguez',
    CreatedAt: '2025-11-12T14:10:00',
    LastUpdatedAt: '2025-11-15T09:28:00',
    Status: 'Published',
    ApprovedBy: 'Michael Torres',
    ApprovedAt: '2025-11-15T11:00:00',
    LatestComment: 'Peak season capacity validated',
    Tags: 'Peak,Quarterly',
    DataSnapshotVersion: '2025.11.10',
    AssumptionsSummary: 'Core entity only',
    AlertFlags: '',
    TotalCost: 18942100,
    CostPerUnit: 7.82,
    AvgDeliveryDays: 5.1,
    SLABreachPct: 4.2,
    ExcludedBySLACount: 42,
    MaxUtilPct: 96,
    TotalSpaceRequired: 398000,
    SpaceCore: 398000,
    SpaceBCV: 0,
    OverrideCount: 12,
    LaneCount: 1542,
    ChangedLaneCountVsBaseline: 0,
  },
  {
    ScenarioRunID: 'SR005',
    RunName: 'Canada Baseline Q1 2026',
    Region: 'Canada',
    ScenarioType: 'Baseline',
    EntityScope: 'Core+BCV',
    ChannelScope: 'B2C,B2B',
    TermsScope: 'Collect+Prepaid',
    CreatedBy: 'David Park',
    CreatedAt: '2026-01-08T10:00:00',
    LastUpdatedAt: '2026-01-08T12:45:00',
    Status: 'Completed',
    ApprovedBy: null,
    ApprovedAt: null,
    LatestComment: 'Initial Canada network baseline',
    Tags: 'Quarterly,Baseline',
    DataSnapshotVersion: '2026.01.07',
    AssumptionsSummary: 'BCV dims assumed via carton avg',
    AlertFlags: 'MissingRates',
    TotalCost: 4124800,
    CostPerUnit: 8.24,
    AvgDeliveryDays: 6.2,
    SLABreachPct: 3.8,
    ExcludedBySLACount: 18,
    MaxUtilPct: 68,
    TotalSpaceRequired: 124000,
    SpaceCore: 96000,
    SpaceBCV: 28000,
    OverrideCount: 0,
    LaneCount: 486,
    ChangedLaneCountVsBaseline: 0,
  },
  {
    ScenarioRunID: 'SR006',
    RunName: 'Consolidation Test - 4DC to 3DC',
    Region: 'US',
    ScenarioType: 'Consolidation Strategic',
    EntityScope: 'Core',
    ChannelScope: 'B2B',
    TermsScope: 'Collect',
    CreatedBy: 'Sarah Chen',
    CreatedAt: '2026-01-09T09:30:00',
    LastUpdatedAt: '2026-01-09T14:10:00',
    Status: 'Draft',
    ApprovedBy: null,
    ApprovedAt: null,
    LatestComment: 'Testing consolidation scenario for B2B network',
    Tags: 'Pilot,Consolidation',
    DataSnapshotVersion: '2026.01.04',
    AssumptionsSummary: 'B2B Collect only; DC2 suppressed',
    AlertFlags: 'OverCap,SLA',
    TotalCost: 3847200,
    CostPerUnit: 5.92,
    AvgDeliveryDays: 5.8,
    SLABreachPct: 12.4,
    ExcludedBySLACount: 94,
    MaxUtilPct: 98,
    TotalSpaceRequired: 186000,
    SpaceCore: 186000,
    SpaceBCV: 0,
    OverrideCount: 0,
    LaneCount: 642,
    ChangedLaneCountVsBaseline: 428,
  },
  {
    ScenarioRunID: 'SR007',
    RunName: 'Rate Change Impact Analysis',
    Region: 'US',
    ScenarioType: 'Tactical Fixed Footprint',
    EntityScope: 'Core+BCV',
    ChannelScope: 'B2C,B2B,D2C',
    TermsScope: 'Collect+Prepaid',
    CreatedBy: 'James Kim',
    CreatedAt: '2026-01-10T08:00:00',
    LastUpdatedAt: '2026-01-10T08:15:00',
    Status: 'Running',
    ApprovedBy: null,
    ApprovedAt: null,
    LatestComment: 'Analyzing new carrier rate sheet impact',
    Tags: 'RateChange,Audit',
    DataSnapshotVersion: '2026.01.09',
    AssumptionsSummary: 'New rate sheet v2026.1; BCV dims assumed',
    AlertFlags: '',
    TotalCost: 0,
    CostPerUnit: 0,
    AvgDeliveryDays: 0,
    SLABreachPct: 0,
    ExcludedBySLACount: 0,
    MaxUtilPct: 0,
    TotalSpaceRequired: 0,
    SpaceCore: 0,
    SpaceBCV: 0,
    OverrideCount: 0,
    LaneCount: 0,
    ChangedLaneCountVsBaseline: 0,
  },
  {
    ScenarioRunID: 'SR008',
    RunName: 'BCV Network Ingestion Test',
    Region: 'US',
    ScenarioType: 'BCV Ingestion Only',
    EntityScope: 'BCV',
    ChannelScope: 'B2C',
    TermsScope: 'Prepaid',
    CreatedBy: 'Maria Rodriguez',
    CreatedAt: '2026-01-11T13:20:00',
    LastUpdatedAt: '2026-01-11T16:42:00',
    Status: 'Completed',
    ApprovedBy: null,
    ApprovedAt: null,
    LatestComment: 'BCV-only test for network validation',
    Tags: 'BCV,Pilot',
    DataSnapshotVersion: '2026.01.10',
    AssumptionsSummary: 'BCV actual dims from warehouse system',
    AlertFlags: '',
    TotalCost: 1847600,
    CostPerUnit: 7.42,
    AvgDeliveryDays: 4.6,
    SLABreachPct: 2.8,
    ExcludedBySLACount: 12,
    MaxUtilPct: 64,
    TotalSpaceRequired: 84000,
    SpaceCore: 0,
    SpaceBCV: 84000,
    OverrideCount: 0,
    LaneCount: 248,
    ChangedLaneCountVsBaseline: 0,
  },
];

export const scenarioRunConfigs: ScenarioRunConfig[] = [
  {
    ScenarioRunID: 'SR001',
    ActiveDCs: 'DC1,DC2,DC3,DC4,Pharr TX,Stratford CT',
    SuppressedDCs: '',
    FootprintMode: 'Fixed',
    UtilCapPct: 80,
    LevelLoadMode: 'On',
    LeadTimeCapDays: 7,
    CostVsServiceWeight: 50,
    AllowRelocationPrepaid: 'Y',
    AllowRelocationCollect: 'N',
    BCVRuleSet: 'Default',
    FuelSurchargeMode: 'FromRates',
    FuelSurchargeOverridePct: null,
    AccessorialFlags: 'Residential,Liftgate',
    Notes: 'Standard baseline configuration',
  },
  {
    ScenarioRunID: 'SR002',
    ActiveDCs: 'DC1,DC2,DC3,Pharr TX,Stratford CT',
    SuppressedDCs: 'DC4',
    FootprintMode: 'Fixed',
    UtilCapPct: 80,
    LevelLoadMode: 'On',
    LeadTimeCapDays: 7,
    CostVsServiceWeight: 50,
    AllowRelocationPrepaid: 'Y',
    AllowRelocationCollect: 'N',
    BCVRuleSet: 'Default',
    FuelSurchargeMode: 'FromRates',
    FuelSurchargeOverridePct: null,
    AccessorialFlags: 'Residential,Liftgate',
    Notes: 'DC4 suppressed for maintenance window testing',
  },
  {
    ScenarioRunID: 'SR003',
    ActiveDCs: 'DC1,DC2,DC3,DC4,Pharr TX,Stratford CT',
    SuppressedDCs: '',
    FootprintMode: 'Unconstrained',
    UtilCapPct: 85,
    LevelLoadMode: 'Off',
    LeadTimeCapDays: 7,
    CostVsServiceWeight: 40,
    AllowRelocationPrepaid: 'Y',
    AllowRelocationCollect: 'Y',
    BCVRuleSet: 'Default',
    FuelSurchargeMode: 'FromRates',
    FuelSurchargeOverridePct: null,
    AccessorialFlags: 'Residential,Liftgate,InsideDelivery',
    Notes: 'Strategic scenario with Pharr expansion capacity',
  },
  {
    ScenarioRunID: 'SR004',
    ActiveDCs: 'DC1,DC2,DC3,DC4,Pharr TX,Stratford CT',
    SuppressedDCs: '',
    FootprintMode: 'Fixed',
    UtilCapPct: 90,
    LevelLoadMode: 'On',
    LeadTimeCapDays: 7,
    CostVsServiceWeight: 45,
    AllowRelocationPrepaid: 'Y',
    AllowRelocationCollect: 'N',
    BCVRuleSet: 'Default',
    FuelSurchargeMode: 'FromRates',
    FuelSurchargeOverridePct: null,
    AccessorialFlags: 'Residential,Liftgate',
    Notes: 'Peak season baseline configuration',
  },
  {
    ScenarioRunID: 'SR005',
    ActiveDCs: 'DC1,DC2,DC3,Stratford CT',
    SuppressedDCs: 'DC4,Pharr TX',
    FootprintMode: 'Fixed',
    UtilCapPct: 80,
    LevelLoadMode: 'On',
    LeadTimeCapDays: 10,
    CostVsServiceWeight: 55,
    AllowRelocationPrepaid: 'Y',
    AllowRelocationCollect: 'N',
    BCVRuleSet: 'Default',
    FuelSurchargeMode: 'FromRates',
    FuelSurchargeOverridePct: null,
    AccessorialFlags: 'Residential,Liftgate',
    Notes: 'Canada baseline configuration',
  },
  {
    ScenarioRunID: 'SR006',
    ActiveDCs: 'DC1,DC3,DC4',
    SuppressedDCs: 'DC2',
    FootprintMode: 'Fixed',
    UtilCapPct: 90,
    LevelLoadMode: 'On',
    LeadTimeCapDays: 7,
    CostVsServiceWeight: 50,
    AllowRelocationPrepaid: 'Y',
    AllowRelocationCollect: 'Y',
    BCVRuleSet: 'Default',
    FuelSurchargeMode: 'FromRates',
    FuelSurchargeOverridePct: null,
    AccessorialFlags: 'Residential,Liftgate',
    Notes: 'Consolidation draft configuration',
  },
  {
    ScenarioRunID: 'SR008',
    ActiveDCs: 'DC1,DC3,Pharr TX',
    SuppressedDCs: 'DC2,DC4,Stratford CT',
    FootprintMode: 'Fixed',
    UtilCapPct: 75,
    LevelLoadMode: 'On',
    LeadTimeCapDays: 7,
    CostVsServiceWeight: 60,
    AllowRelocationPrepaid: 'Y',
    AllowRelocationCollect: 'N',
    BCVRuleSet: 'Default',
    FuelSurchargeMode: 'FromRates',
    FuelSurchargeOverridePct: null,
    AccessorialFlags: 'Residential,Liftgate',
    Notes: 'BCV ingestion-only configuration',
  },
  {
    ScenarioRunID: 'SR007',
    ActiveDCs: 'DC1,DC2,DC3,DC4,Pharr TX,Stratford CT',
    SuppressedDCs: '',
    FootprintMode: 'Fixed',
    UtilCapPct: 85,
    LevelLoadMode: 'On',
    LeadTimeCapDays: 7,
    CostVsServiceWeight: 55,
    AllowRelocationPrepaid: 'Y',
    AllowRelocationCollect: 'N',
    BCVRuleSet: 'Default',
    FuelSurchargeMode: 'FromRates',
    FuelSurchargeOverridePct: null,
    AccessorialFlags: 'Residential,Liftgate',
    Notes: 'Rate change impact analysis configuration',
  },
];

export const scenarioRunResultsDC: ScenarioRunResultsDC[] = [
  { ScenarioRunID: 'SR001', DCName: 'DC1', TotalCost: 2847320, VolumeUnits: 448200, AvgDays: 3.8, UtilPct: 72, SpaceRequired: 78000, SpaceCore: 62000, SpaceBCV: 16000, SLABreachCount: 4, ExcludedBySLACount: 2, RankOverall: 2, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR001', DCName: 'DC2', TotalCost: 1924800, VolumeUnits: 298400, AvgDays: 4.1, UtilPct: 65, SpaceRequired: 64000, SpaceCore: 52000, SpaceBCV: 12000, SLABreachCount: 3, ExcludedBySLACount: 1, RankOverall: 3, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR001', DCName: 'DC3', TotalCost: 3124680, VolumeUnits: 512400, AvgDays: 4.5, UtilPct: 78, SpaceRequired: 82000, SpaceCore: 64000, SpaceBCV: 18000, SLABreachCount: 5, ExcludedBySLACount: 4, RankOverall: 1, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR001', DCName: 'DC4', TotalCost: 2142100, VolumeUnits: 342800, AvgDays: 4.2, UtilPct: 68, SpaceRequired: 58000, SpaceCore: 46000, SpaceBCV: 12000, SLABreachCount: 1, ExcludedBySLACount: 3, RankOverall: 4, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR001', DCName: 'Pharr TX', TotalCost: 1847220, VolumeUnits: 286800, AvgDays: 4.8, UtilPct: 58, SpaceRequired: 38000, SpaceCore: 28000, SpaceBCV: 10000, SLABreachCount: 2, ExcludedBySLACount: 2, RankOverall: 6, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR001', DCName: 'Stratford CT', TotalCost: 961200, VolumeUnits: 151200, AvgDays: 3.6, UtilPct: 42, SpaceRequired: 22000, SpaceCore: 16000, SpaceBCV: 6000, SLABreachCount: 1, ExcludedBySLACount: 2, RankOverall: 5, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR002', DCName: 'DC1', TotalCost: 3247890, VolumeUnits: 524800, AvgDays: 4.2, UtilPct: 88, SpaceRequired: 94000, SpaceCore: 74000, SpaceBCV: 20000, SLABreachCount: 18, ExcludedBySLACount: 14, RankOverall: 1, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR002', DCName: 'DC2', TotalCost: 2424600, VolumeUnits: 384200, AvgDays: 4.6, UtilPct: 84, SpaceRequired: 78000, SpaceCore: 62000, SpaceBCV: 16000, SLABreachCount: 16, ExcludedBySLACount: 12, RankOverall: 2, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR002', DCName: 'DC3', TotalCost: 3624800, VolumeUnits: 598400, AvgDays: 5.1, UtilPct: 94, SpaceRequired: 96000, SpaceCore: 76000, SpaceBCV: 20000, SLABreachCount: 24, ExcludedBySLACount: 22, RankOverall: 3, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR002', DCName: 'DC4', TotalCost: 0, VolumeUnits: 0, AvgDays: 0, UtilPct: 0, SpaceRequired: 0, SpaceCore: 0, SpaceBCV: 0, SLABreachCount: 0, ExcludedBySLACount: 0, RankOverall: 6, IsSuppressed: 'Y' },
  { ScenarioRunID: 'SR002', DCName: 'Pharr TX', TotalCost: 2424700, VolumeUnits: 386400, AvgDays: 5.4, UtilPct: 82, SpaceRequired: 48000, SpaceCore: 36000, SpaceBCV: 12000, SLABreachCount: 12, ExcludedBySLACount: 14, RankOverall: 4, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR002', DCName: 'Stratford CT', TotalCost: 1402690, VolumeUnits: 224800, AvgDays: 4.2, UtilPct: 64, SpaceRequired: 26000, SpaceCore: 20000, SpaceBCV: 6000, SLABreachCount: 8, ExcludedBySLACount: 10, RankOverall: 5, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR003', DCName: 'DC1', TotalCost: 2648920, VolumeUnits: 438200, AvgDays: 3.6, UtilPct: 70, SpaceRequired: 82000, SpaceCore: 64000, SpaceBCV: 18000, SLABreachCount: 2, ExcludedBySLACount: 1, RankOverall: 2, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR003', DCName: 'DC2', TotalCost: 1824500, VolumeUnits: 292400, AvgDays: 3.9, UtilPct: 64, SpaceRequired: 68000, SpaceCore: 54000, SpaceBCV: 14000, SLABreachCount: 1, ExcludedBySLACount: 1, RankOverall: 3, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR003', DCName: 'DC3', TotalCost: 2948650, VolumeUnits: 498400, AvgDays: 4.2, UtilPct: 76, SpaceRequired: 86000, SpaceCore: 68000, SpaceBCV: 18000, SLABreachCount: 3, ExcludedBySLACount: 2, RankOverall: 1, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR003', DCName: 'DC4', TotalCost: 2042100, VolumeUnits: 338200, AvgDays: 4.0, UtilPct: 66, SpaceRequired: 60000, SpaceCore: 48000, SpaceBCV: 12000, SLABreachCount: 1, ExcludedBySLACount: 2, RankOverall: 4, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR003', DCName: 'Pharr TX', TotalCost: 2024280, VolumeUnits: 324800, AvgDays: 4.2, UtilPct: 82, SpaceRequired: 72000, SpaceCore: 54000, SpaceBCV: 18000, SLABreachCount: 1, ExcludedBySLACount: 1, RankOverall: 5, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR003', DCName: 'Stratford CT', TotalCost: 810000, VolumeUnits: 132400, AvgDays: 3.4, UtilPct: 38, SpaceRequired: 24000, SpaceCore: 20000, SpaceBCV: 4000, SLABreachCount: 0, ExcludedBySLACount: 1, RankOverall: 6, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR004', DCName: 'DC1', TotalCost: 4120000, VolumeUnits: 612400, AvgDays: 4.8, UtilPct: 88, SpaceRequired: 98000, SpaceCore: 98000, SpaceBCV: 0, SLABreachCount: 12, ExcludedBySLACount: 8, RankOverall: 2, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR004', DCName: 'DC2', TotalCost: 2980000, VolumeUnits: 418200, AvgDays: 5.0, UtilPct: 84, SpaceRequired: 76000, SpaceCore: 76000, SpaceBCV: 0, SLABreachCount: 10, ExcludedBySLACount: 6, RankOverall: 3, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR004', DCName: 'DC3', TotalCost: 5280000, VolumeUnits: 724800, AvgDays: 5.2, UtilPct: 96, SpaceRequired: 112000, SpaceCore: 112000, SpaceBCV: 0, SLABreachCount: 16, ExcludedBySLACount: 12, RankOverall: 1, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR004', DCName: 'DC4', TotalCost: 3240000, VolumeUnits: 468000, AvgDays: 5.3, UtilPct: 92, SpaceRequired: 84000, SpaceCore: 84000, SpaceBCV: 0, SLABreachCount: 11, ExcludedBySLACount: 7, RankOverall: 4, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR004', DCName: 'Pharr TX', TotalCost: 1960000, VolumeUnits: 286200, AvgDays: 5.6, UtilPct: 78, SpaceRequired: 52000, SpaceCore: 52000, SpaceBCV: 0, SLABreachCount: 7, ExcludedBySLACount: 5, RankOverall: 5, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR004', DCName: 'Stratford CT', TotalCost: 1280000, VolumeUnits: 182000, AvgDays: 4.6, UtilPct: 66, SpaceRequired: 36000, SpaceCore: 36000, SpaceBCV: 0, SLABreachCount: 4, ExcludedBySLACount: 4, RankOverall: 6, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR005', DCName: 'DC1', TotalCost: 980000, VolumeUnits: 142000, AvgDays: 6.1, UtilPct: 62, SpaceRequired: 42000, SpaceCore: 32000, SpaceBCV: 10000, SLABreachCount: 4, ExcludedBySLACount: 3, RankOverall: 2, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR005', DCName: 'DC2', TotalCost: 840000, VolumeUnits: 126000, AvgDays: 6.4, UtilPct: 58, SpaceRequired: 36000, SpaceCore: 28000, SpaceBCV: 8000, SLABreachCount: 3, ExcludedBySLACount: 3, RankOverall: 3, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR005', DCName: 'DC3', TotalCost: 1120000, VolumeUnits: 168000, AvgDays: 6.0, UtilPct: 64, SpaceRequired: 46000, SpaceCore: 36000, SpaceBCV: 10000, SLABreachCount: 5, ExcludedBySLACount: 4, RankOverall: 1, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR005', DCName: 'Stratford CT', TotalCost: 780000, VolumeUnits: 110000, AvgDays: 6.6, UtilPct: 54, SpaceRequired: 32000, SpaceCore: 24000, SpaceBCV: 8000, SLABreachCount: 2, ExcludedBySLACount: 2, RankOverall: 4, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR006', DCName: 'DC1', TotalCost: 1240000, VolumeUnits: 186000, AvgDays: 5.4, UtilPct: 92, SpaceRequired: 52000, SpaceCore: 52000, SpaceBCV: 0, SLABreachCount: 7, ExcludedBySLACount: 6, RankOverall: 1, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR006', DCName: 'DC3', TotalCost: 1460000, VolumeUnits: 212000, AvgDays: 5.7, UtilPct: 94, SpaceRequired: 56000, SpaceCore: 56000, SpaceBCV: 0, SLABreachCount: 8, ExcludedBySLACount: 7, RankOverall: 2, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR006', DCName: 'DC4', TotalCost: 1140000, VolumeUnits: 170000, AvgDays: 5.9, UtilPct: 90, SpaceRequired: 48000, SpaceCore: 48000, SpaceBCV: 0, SLABreachCount: 6, ExcludedBySLACount: 5, RankOverall: 3, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR008', DCName: 'DC1', TotalCost: 620000, VolumeUnits: 92000, AvgDays: 4.5, UtilPct: 62, SpaceRequired: 28000, SpaceCore: 0, SpaceBCV: 28000, SLABreachCount: 2, ExcludedBySLACount: 2, RankOverall: 2, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR008', DCName: 'DC3', TotalCost: 720000, VolumeUnits: 104000, AvgDays: 4.7, UtilPct: 66, SpaceRequired: 32000, SpaceCore: 0, SpaceBCV: 32000, SLABreachCount: 3, ExcludedBySLACount: 3, RankOverall: 1, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR008', DCName: 'Pharr TX', TotalCost: 508000, VolumeUnits: 76000, AvgDays: 4.9, UtilPct: 58, SpaceRequired: 24000, SpaceCore: 0, SpaceBCV: 24000, SLABreachCount: 2, ExcludedBySLACount: 2, RankOverall: 3, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR007', DCName: 'DC1', TotalCost: 2480000, VolumeUnits: 386000, AvgDays: 4.4, UtilPct: 76, SpaceRequired: 84000, SpaceCore: 66000, SpaceBCV: 18000, SLABreachCount: 6, ExcludedBySLACount: 4, RankOverall: 2, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR007', DCName: 'DC2', TotalCost: 1860000, VolumeUnits: 302000, AvgDays: 4.7, UtilPct: 70, SpaceRequired: 72000, SpaceCore: 56000, SpaceBCV: 16000, SLABreachCount: 5, ExcludedBySLACount: 4, RankOverall: 3, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR007', DCName: 'DC3', TotalCost: 2980000, VolumeUnits: 456000, AvgDays: 4.9, UtilPct: 84, SpaceRequired: 98000, SpaceCore: 76000, SpaceBCV: 22000, SLABreachCount: 7, ExcludedBySLACount: 5, RankOverall: 1, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR007', DCName: 'DC4', TotalCost: 2140000, VolumeUnits: 328000, AvgDays: 4.8, UtilPct: 78, SpaceRequired: 76000, SpaceCore: 60000, SpaceBCV: 16000, SLABreachCount: 6, ExcludedBySLACount: 4, RankOverall: 4, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR007', DCName: 'Pharr TX', TotalCost: 1720000, VolumeUnits: 262000, AvgDays: 5.2, UtilPct: 72, SpaceRequired: 64000, SpaceCore: 48000, SpaceBCV: 16000, SLABreachCount: 5, ExcludedBySLACount: 3, RankOverall: 5, IsSuppressed: 'N' },
  { ScenarioRunID: 'SR007', DCName: 'Stratford CT', TotalCost: 980000, VolumeUnits: 162000, AvgDays: 4.1, UtilPct: 52, SpaceRequired: 42000, SpaceCore: 32000, SpaceBCV: 10000, SLABreachCount: 3, ExcludedBySLACount: 2, RankOverall: 6, IsSuppressed: 'N' },
];

export const scenarioRunResultsLanes: ScenarioRunResultsLane[] = [
  { ScenarioRunID: 'SR001', Dest3Zip: '900', DestState: 'CA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 6.20, RankedOption1Days: 3, RankedOption2DC: 'DC3', RankedOption2Cost: 7.40, RankedOption2Days: 4, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 8.90, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.20, CostDeltaVsBest: 0, DeliveryDays: 3, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 12400, UtilImpactPct: 3.8, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR001', Dest3Zip: '606', DestState: 'IL', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 5.80, RankedOption1Days: 2, RankedOption2DC: 'DC2', RankedOption2Cost: 6.20, RankedOption2Days: 3, RankedOption3DC: 'DC4', RankedOption3Cost: 6.40, RankedOption3Days: 3, ChosenRank: 1, LaneCost: 5.80, CostDeltaVsBest: 0, DeliveryDays: 2, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 24800, UtilImpactPct: 7.2, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR001', Dest3Zip: '100', DestState: 'NY', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'TopRetailerB', AssignedDC: 'Stratford CT', RankedOption1DC: 'Stratford CT', RankedOption1Cost: 4.20, RankedOption1Days: 2, RankedOption2DC: 'DC2', RankedOption2Cost: 5.60, RankedOption2Days: 4, RankedOption3DC: 'DC3', RankedOption3Cost: 6.10, RankedOption3Days: 5, ChosenRank: 1, LaneCost: 4.20, CostDeltaVsBest: 0, DeliveryDays: 2, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 18200, UtilImpactPct: 5.4, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR001', Dest3Zip: '770', DestState: 'TX', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'Pharr TX', RankedOption1DC: 'Pharr TX', RankedOption1Cost: 5.40, RankedOption1Days: 3, RankedOption2DC: 'DC4', RankedOption2Cost: 7.20, RankedOption2Days: 5, RankedOption3DC: 'DC3', RankedOption3Cost: 7.80, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 5.40, CostDeltaVsBest: 0, DeliveryDays: 3, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 14600, UtilImpactPct: 4.2, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR001', Dest3Zip: '331', DestState: 'FL', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC4', RankedOption1DC: 'DC4', RankedOption1Cost: 6.80, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 7.20, RankedOption2Days: 5, RankedOption3DC: 'Stratford CT', RankedOption3Cost: 8.40, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.80, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 16800, UtilImpactPct: 4.8, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR001', Dest3Zip: '980', DestState: 'WA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.20, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 8.90, RankedOption2Days: 6, RankedOption3DC: 'DC2', RankedOption3Cost: 9.20, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 7.20, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 22400, UtilImpactPct: 6.4, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR001', Dest3Zip: '857', DestState: 'AZ', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'Pharr TX', RankedOption1DC: 'Pharr TX', RankedOption1Cost: 6.40, RankedOption1Days: 4, RankedOption2DC: 'DC1', RankedOption2Cost: 7.80, RankedOption2Days: 5, RankedOption3DC: 'DC4', RankedOption3Cost: 8.20, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.40, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 11200, UtilImpactPct: 3.2, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR001', Dest3Zip: '021', DestState: 'MA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'Stratford CT', RankedOption1DC: 'Stratford CT', RankedOption1Cost: 5.60, RankedOption1Days: 3, RankedOption2DC: 'DC2', RankedOption2Cost: 6.80, RankedOption2Days: 4, RankedOption3DC: 'DC3', RankedOption3Cost: 7.40, RankedOption3Days: 5, ChosenRank: 1, LaneCost: 5.60, CostDeltaVsBest: 0, DeliveryDays: 3, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 14800, UtilImpactPct: 4.2, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR001', Dest3Zip: '303', DestState: 'GA', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC4', RankedOption1DC: 'DC4', RankedOption1Cost: 6.90, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 7.60, RankedOption2Days: 5, RankedOption3DC: 'Stratford CT', RankedOption3Cost: 8.20, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.90, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 16200, UtilImpactPct: 4.6, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR001', Dest3Zip: '981', DestState: 'WA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.10, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 8.80, RankedOption2Days: 6, RankedOption3DC: 'DC2', RankedOption3Cost: 9.10, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 7.10, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 22000, UtilImpactPct: 6.2, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR002', Dest3Zip: '331', DestState: 'FL', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 7.20, RankedOption1Days: 5, RankedOption2DC: 'Pharr TX', RankedOption2Cost: 8.60, RankedOption2Days: 7, RankedOption3DC: 'Stratford CT', RankedOption3Cost: 9.10, RankedOption3Days: 8, ChosenRank: 1, LaneCost: 7.20, CostDeltaVsBest: 0.40, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 16800, UtilImpactPct: 6.2, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: 'DC4Suppressed' },
  { ScenarioRunID: 'SR002', Dest3Zip: '900', DestState: 'CA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.10, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 8.10, RankedOption2Days: 5, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 9.00, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 7.10, CostDeltaVsBest: 0.30, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 19000, UtilImpactPct: 5.8, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR002', Dest3Zip: '606', DestState: 'IL', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 6.20, RankedOption1Days: 3, RankedOption2DC: 'DC2', RankedOption2Cost: 6.80, RankedOption2Days: 4, RankedOption3DC: 'DC1', RankedOption3Cost: 7.10, RankedOption3Days: 5, ChosenRank: 1, LaneCost: 6.20, CostDeltaVsBest: 0.10, DeliveryDays: 3, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 21000, UtilImpactPct: 7.0, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR002', Dest3Zip: '100', DestState: 'NY', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'TopRetailerB', AssignedDC: 'Stratford CT', RankedOption1DC: 'Stratford CT', RankedOption1Cost: 5.40, RankedOption1Days: 3, RankedOption2DC: 'DC2', RankedOption2Cost: 6.20, RankedOption2Days: 4, RankedOption3DC: 'DC3', RankedOption3Cost: 6.70, RankedOption3Days: 5, ChosenRank: 1, LaneCost: 5.40, CostDeltaVsBest: 0.20, DeliveryDays: 3, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 17600, UtilImpactPct: 5.1, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR002', Dest3Zip: '770', DestState: 'TX', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'Pharr TX', RankedOption1DC: 'Pharr TX', RankedOption1Cost: 6.10, RankedOption1Days: 4, RankedOption2DC: 'DC4', RankedOption2Cost: 7.40, RankedOption2Days: 6, RankedOption3DC: 'DC3', RankedOption3Cost: 7.90, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 6.10, CostDeltaVsBest: 0.30, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 16200, UtilImpactPct: 4.6, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR002', Dest3Zip: '021', DestState: 'MA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'Stratford CT', RankedOption1DC: 'Stratford CT', RankedOption1Cost: 6.30, RankedOption1Days: 4, RankedOption2DC: 'DC2', RankedOption2Cost: 7.10, RankedOption2Days: 5, RankedOption3DC: 'DC3', RankedOption3Cost: 7.70, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.30, CostDeltaVsBest: 0.20, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 15800, UtilImpactPct: 4.5, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR002', Dest3Zip: '981', DestState: 'WA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.50, RankedOption1Days: 5, RankedOption2DC: 'DC3', RankedOption2Cost: 8.80, RankedOption2Days: 7, RankedOption3DC: 'DC2', RankedOption3Cost: 9.10, RankedOption3Days: 8, ChosenRank: 1, LaneCost: 7.50, CostDeltaVsBest: 0.40, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 23200, UtilImpactPct: 6.8, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR002', Dest3Zip: '303', DestState: 'GA', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC4', RankedOption1DC: 'DC4', RankedOption1Cost: 7.40, RankedOption1Days: 5, RankedOption2DC: 'DC3', RankedOption2Cost: 8.10, RankedOption2Days: 6, RankedOption3DC: 'Stratford CT', RankedOption3Cost: 8.90, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 7.40, CostDeltaVsBest: 0.30, DeliveryDays: 5, SLABreachFlag: 'Y', ExcludedBySLAFlag: 'N', FootprintContribution: 17200, UtilImpactPct: 5.0, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR002', Dest3Zip: '850', DestState: 'AZ', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 6.80, RankedOption1Days: 5, RankedOption2DC: 'Pharr TX', RankedOption2Cost: 7.60, RankedOption2Days: 6, RankedOption3DC: 'DC3', RankedOption3Cost: 8.10, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 6.80, CostDeltaVsBest: 0.20, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 17000, UtilImpactPct: 4.9, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR002', Dest3Zip: '482', DestState: 'MI', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 6.10, RankedOption1Days: 4, RankedOption2DC: 'DC1', RankedOption2Cost: 6.70, RankedOption2Days: 5, RankedOption3DC: 'DC2', RankedOption3Cost: 7.10, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.10, CostDeltaVsBest: 0.10, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 15800, UtilImpactPct: 4.5, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR003', Dest3Zip: '900', DestState: 'CA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 6.10, RankedOption1Days: 3, RankedOption2DC: 'DC3', RankedOption2Cost: 7.30, RankedOption2Days: 4, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 8.80, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.10, CostDeltaVsBest: 0, DeliveryDays: 3, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 12800, UtilImpactPct: 3.6, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR003', Dest3Zip: '606', DestState: 'IL', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'Pharr TX', RankedOption1DC: 'DC3', RankedOption1Cost: 5.70, RankedOption1Days: 2, RankedOption2DC: 'Pharr TX', RankedOption2Cost: 5.90, RankedOption2Days: 3, RankedOption3DC: 'DC2', RankedOption3Cost: 6.10, RankedOption3Days: 3, ChosenRank: 2, LaneCost: 5.90, CostDeltaVsBest: 0.20, DeliveryDays: 3, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 24800, UtilImpactPct: 8.4, OverrideAppliedFlag: 'Y', OverrideVersion: 'v1', NotesFlag: 'CapacityBalancing' },
  { ScenarioRunID: 'SR003', Dest3Zip: '900', DestState: 'CA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 6.10, RankedOption1Days: 3, RankedOption2DC: 'DC3', RankedOption2Cost: 7.30, RankedOption2Days: 4, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 8.80, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.10, CostDeltaVsBest: 0, DeliveryDays: 3, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 12800, UtilImpactPct: 3.6, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR003', Dest3Zip: '100', DestState: 'NY', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'TopRetailerB', AssignedDC: 'Stratford CT', RankedOption1DC: 'Stratford CT', RankedOption1Cost: 4.10, RankedOption1Days: 2, RankedOption2DC: 'DC2', RankedOption2Cost: 5.30, RankedOption2Days: 4, RankedOption3DC: 'DC3', RankedOption3Cost: 5.90, RankedOption3Days: 5, ChosenRank: 1, LaneCost: 4.10, CostDeltaVsBest: 0, DeliveryDays: 2, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 17600, UtilImpactPct: 5.1, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR003', Dest3Zip: '770', DestState: 'TX', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'Pharr TX', RankedOption1DC: 'Pharr TX', RankedOption1Cost: 5.30, RankedOption1Days: 3, RankedOption2DC: 'DC4', RankedOption2Cost: 7.00, RankedOption2Days: 5, RankedOption3DC: 'DC3', RankedOption3Cost: 7.50, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 5.30, CostDeltaVsBest: 0, DeliveryDays: 3, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 15200, UtilImpactPct: 4.3, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR003', Dest3Zip: '331', DestState: 'FL', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC4', RankedOption1DC: 'DC4', RankedOption1Cost: 6.40, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 6.90, RankedOption2Days: 5, RankedOption3DC: 'Stratford CT', RankedOption3Cost: 7.80, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.40, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 16400, UtilImpactPct: 4.7, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR003', Dest3Zip: '021', DestState: 'MA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'Stratford CT', RankedOption1DC: 'Stratford CT', RankedOption1Cost: 5.40, RankedOption1Days: 3, RankedOption2DC: 'DC2', RankedOption2Cost: 6.40, RankedOption2Days: 4, RankedOption3DC: 'DC3', RankedOption3Cost: 7.00, RankedOption3Days: 5, ChosenRank: 1, LaneCost: 5.40, CostDeltaVsBest: 0, DeliveryDays: 3, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 14800, UtilImpactPct: 4.2, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR003', Dest3Zip: '850', DestState: 'AZ', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'Pharr TX', RankedOption1DC: 'Pharr TX', RankedOption1Cost: 6.20, RankedOption1Days: 4, RankedOption2DC: 'DC1', RankedOption2Cost: 7.40, RankedOption2Days: 5, RankedOption3DC: 'DC4', RankedOption3Cost: 7.80, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.20, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 12000, UtilImpactPct: 3.4, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR003', Dest3Zip: '981', DestState: 'WA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.00, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 8.60, RankedOption2Days: 6, RankedOption3DC: 'DC2', RankedOption3Cost: 9.00, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 7.00, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 22200, UtilImpactPct: 6.3, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR003', Dest3Zip: '303', DestState: 'GA', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC4', RankedOption1DC: 'DC4', RankedOption1Cost: 6.60, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 7.20, RankedOption2Days: 5, RankedOption3DC: 'Stratford CT', RankedOption3Cost: 8.00, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.60, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 17000, UtilImpactPct: 4.9, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR004', Dest3Zip: '900', DestState: 'CA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.10, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 8.40, RankedOption2Days: 5, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 9.20, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 7.10, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 21400, UtilImpactPct: 5.1, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR004', Dest3Zip: '606', DestState: 'IL', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 6.40, RankedOption1Days: 3, RankedOption2DC: 'DC2', RankedOption2Cost: 7.10, RankedOption2Days: 4, RankedOption3DC: 'DC4', RankedOption3Cost: 7.30, RankedOption3Days: 4, ChosenRank: 1, LaneCost: 6.40, CostDeltaVsBest: 0, DeliveryDays: 3, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 26400, UtilImpactPct: 7.8, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR004', Dest3Zip: '100', DestState: 'NY', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'TopRetailerB', AssignedDC: 'Stratford CT', RankedOption1DC: 'Stratford CT', RankedOption1Cost: 5.10, RankedOption1Days: 3, RankedOption2DC: 'DC2', RankedOption2Cost: 6.10, RankedOption2Days: 4, RankedOption3DC: 'DC3', RankedOption3Cost: 6.60, RankedOption3Days: 5, ChosenRank: 1, LaneCost: 5.10, CostDeltaVsBest: 0, DeliveryDays: 3, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 19600, UtilImpactPct: 5.6, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR004', Dest3Zip: '331', DestState: 'FL', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC4', RankedOption1DC: 'DC4', RankedOption1Cost: 7.60, RankedOption1Days: 5, RankedOption2DC: 'DC3', RankedOption2Cost: 8.20, RankedOption2Days: 6, RankedOption3DC: 'Stratford CT', RankedOption3Cost: 9.10, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 7.60, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'Y', ExcludedBySLAFlag: 'N', FootprintContribution: 18200, UtilImpactPct: 6.2, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR004', Dest3Zip: '770', DestState: 'TX', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'Pharr TX', RankedOption1DC: 'Pharr TX', RankedOption1Cost: 6.10, RankedOption1Days: 4, RankedOption2DC: 'DC4', RankedOption2Cost: 7.50, RankedOption2Days: 5, RankedOption3DC: 'DC3', RankedOption3Cost: 8.00, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.10, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 16800, UtilImpactPct: 4.8, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR004', Dest3Zip: '021', DestState: 'MA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'Stratford CT', RankedOption1DC: 'Stratford CT', RankedOption1Cost: 6.10, RankedOption1Days: 4, RankedOption2DC: 'DC2', RankedOption2Cost: 7.20, RankedOption2Days: 5, RankedOption3DC: 'DC3', RankedOption3Cost: 7.80, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.10, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 15400, UtilImpactPct: 4.4, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR004', Dest3Zip: '850', DestState: 'AZ', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 6.90, RankedOption1Days: 5, RankedOption2DC: 'Pharr TX', RankedOption2Cost: 7.60, RankedOption2Days: 6, RankedOption3DC: 'DC3', RankedOption3Cost: 8.10, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 6.90, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 17600, UtilImpactPct: 5.0, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR004', Dest3Zip: '981', DestState: 'WA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.40, RankedOption1Days: 5, RankedOption2DC: 'DC3', RankedOption2Cost: 8.80, RankedOption2Days: 6, RankedOption3DC: 'DC2', RankedOption3Cost: 9.10, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 7.40, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 22800, UtilImpactPct: 6.6, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR004', Dest3Zip: '303', DestState: 'GA', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC4', RankedOption1DC: 'DC4', RankedOption1Cost: 7.20, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 8.10, RankedOption2Days: 5, RankedOption3DC: 'Stratford CT', RankedOption3Cost: 8.90, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 7.20, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 17200, UtilImpactPct: 4.9, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR004', Dest3Zip: '752', DestState: 'TX', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'TopRetailerB', AssignedDC: 'Pharr TX', RankedOption1DC: 'Pharr TX', RankedOption1Cost: 6.60, RankedOption1Days: 4, RankedOption2DC: 'DC4', RankedOption2Cost: 7.50, RankedOption2Days: 5, RankedOption3DC: 'DC3', RankedOption3Cost: 8.00, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.60, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 16000, UtilImpactPct: 4.6, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR005', Dest3Zip: 'V5K', DestState: 'BC', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 8.20, RankedOption1Days: 6, RankedOption2DC: 'DC2', RankedOption2Cost: 8.90, RankedOption2Days: 7, RankedOption3DC: 'DC3', RankedOption3Cost: 9.40, RankedOption3Days: 8, ChosenRank: 1, LaneCost: 8.20, CostDeltaVsBest: 0, DeliveryDays: 6, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 9800, UtilImpactPct: 3.2, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR005', Dest3Zip: 'M5V', DestState: 'ON', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 7.80, RankedOption1Days: 5, RankedOption2DC: 'DC2', RankedOption2Cost: 8.30, RankedOption2Days: 6, RankedOption3DC: 'DC1', RankedOption3Cost: 8.90, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 7.80, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 11200, UtilImpactPct: 3.6, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR005', Dest3Zip: 'H2Y', DestState: 'QC', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'Stratford CT', RankedOption1DC: 'Stratford CT', RankedOption1Cost: 8.60, RankedOption1Days: 7, RankedOption2DC: 'DC3', RankedOption2Cost: 9.10, RankedOption2Days: 8, RankedOption3DC: 'DC2', RankedOption3Cost: 9.40, RankedOption3Days: 9, ChosenRank: 1, LaneCost: 8.60, CostDeltaVsBest: 0, DeliveryDays: 7, SLABreachFlag: 'Y', ExcludedBySLAFlag: 'N', FootprintContribution: 10400, UtilImpactPct: 3.4, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR005', Dest3Zip: 'T2P', DestState: 'AB', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC2', RankedOption1DC: 'DC2', RankedOption1Cost: 8.40, RankedOption1Days: 6, RankedOption2DC: 'DC1', RankedOption2Cost: 8.80, RankedOption2Days: 7, RankedOption3DC: 'DC3', RankedOption3Cost: 9.20, RankedOption3Days: 8, ChosenRank: 1, LaneCost: 8.40, CostDeltaVsBest: 0, DeliveryDays: 6, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 10800, UtilImpactPct: 3.5, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR005', Dest3Zip: 'R3C', DestState: 'MB', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'TopRetailerB', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 8.90, RankedOption1Days: 7, RankedOption2DC: 'DC2', RankedOption2Cost: 9.10, RankedOption2Days: 8, RankedOption3DC: 'DC3', RankedOption3Cost: 9.50, RankedOption3Days: 9, ChosenRank: 1, LaneCost: 8.90, CostDeltaVsBest: 0, DeliveryDays: 7, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 10200, UtilImpactPct: 3.3, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR005', Dest3Zip: 'S7K', DestState: 'SK', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 9.10, RankedOption1Days: 7, RankedOption2DC: 'DC2', RankedOption2Cost: 9.30, RankedOption2Days: 8, RankedOption3DC: 'DC1', RankedOption3Cost: 9.70, RankedOption3Days: 9, ChosenRank: 1, LaneCost: 9.10, CostDeltaVsBest: 0, DeliveryDays: 7, SLABreachFlag: 'Y', ExcludedBySLAFlag: 'N', FootprintContribution: 11400, UtilImpactPct: 3.7, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR005', Dest3Zip: 'E1C', DestState: 'NB', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'Stratford CT', RankedOption1DC: 'Stratford CT', RankedOption1Cost: 9.40, RankedOption1Days: 8, RankedOption2DC: 'DC3', RankedOption2Cost: 9.80, RankedOption2Days: 9, RankedOption3DC: 'DC2', RankedOption3Cost: 10.10, RankedOption3Days: 10, ChosenRank: 1, LaneCost: 9.40, CostDeltaVsBest: 0, DeliveryDays: 8, SLABreachFlag: 'Y', ExcludedBySLAFlag: 'Y', FootprintContribution: 9600, UtilImpactPct: 3.1, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR005', Dest3Zip: 'B3J', DestState: 'NS', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 9.20, RankedOption1Days: 8, RankedOption2DC: 'Stratford CT', RankedOption2Cost: 9.60, RankedOption2Days: 9, RankedOption3DC: 'DC3', RankedOption3Cost: 10.00, RankedOption3Days: 10, ChosenRank: 1, LaneCost: 9.20, CostDeltaVsBest: 0, DeliveryDays: 8, SLABreachFlag: 'Y', ExcludedBySLAFlag: 'Y', FootprintContribution: 9800, UtilImpactPct: 3.2, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR005', Dest3Zip: 'A1B', DestState: 'NL', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC2', RankedOption1DC: 'DC2', RankedOption1Cost: 9.80, RankedOption1Days: 9, RankedOption2DC: 'DC1', RankedOption2Cost: 10.10, RankedOption2Days: 10, RankedOption3DC: 'DC3', RankedOption3Cost: 10.40, RankedOption3Days: 11, ChosenRank: 1, LaneCost: 9.80, CostDeltaVsBest: 0, DeliveryDays: 9, SLABreachFlag: 'Y', ExcludedBySLAFlag: 'Y', FootprintContribution: 9400, UtilImpactPct: 3.0, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR005', Dest3Zip: 'Y1A', DestState: 'YT', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 10.20, RankedOption1Days: 10, RankedOption2DC: 'DC2', RankedOption2Cost: 10.60, RankedOption2Days: 11, RankedOption3DC: 'DC1', RankedOption3Cost: 11.00, RankedOption3Days: 12, ChosenRank: 1, LaneCost: 10.20, CostDeltaVsBest: 0, DeliveryDays: 10, SLABreachFlag: 'Y', ExcludedBySLAFlag: 'Y', FootprintContribution: 8800, UtilImpactPct: 2.9, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR006', Dest3Zip: '900', DestState: 'CA', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 6.40, RankedOption1Days: 5, RankedOption2DC: 'DC3', RankedOption2Cost: 7.10, RankedOption2Days: 6, RankedOption3DC: 'DC4', RankedOption3Cost: 7.60, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 6.40, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 14400, UtilImpactPct: 4.1, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR006', Dest3Zip: '606', DestState: 'IL', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'TopRetailerB', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 6.10, RankedOption1Days: 4, RankedOption2DC: 'DC1', RankedOption2Cost: 6.90, RankedOption2Days: 5, RankedOption3DC: 'DC4', RankedOption3Cost: 7.20, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.10, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 16800, UtilImpactPct: 4.8, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR006', Dest3Zip: '303', DestState: 'GA', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC4', RankedOption1DC: 'DC4', RankedOption1Cost: 6.80, RankedOption1Days: 5, RankedOption2DC: 'DC3', RankedOption2Cost: 7.10, RankedOption2Days: 6, RankedOption3DC: 'DC1', RankedOption3Cost: 7.40, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 6.80, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 15200, UtilImpactPct: 4.3, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR006', Dest3Zip: '770', DestState: 'TX', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 6.50, RankedOption1Days: 5, RankedOption2DC: 'DC4', RankedOption2Cost: 7.00, RankedOption2Days: 6, RankedOption3DC: 'DC1', RankedOption3Cost: 7.30, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 6.50, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 15800, UtilImpactPct: 4.5, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR006', Dest3Zip: '850', DestState: 'AZ', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 6.70, RankedOption1Days: 6, RankedOption2DC: 'DC3', RankedOption2Cost: 7.20, RankedOption2Days: 7, RankedOption3DC: 'DC4', RankedOption3Cost: 7.60, RankedOption3Days: 8, ChosenRank: 1, LaneCost: 6.70, CostDeltaVsBest: 0, DeliveryDays: 6, SLABreachFlag: 'Y', ExcludedBySLAFlag: 'N', FootprintContribution: 15000, UtilImpactPct: 4.2, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR006', Dest3Zip: '981', DestState: 'WA', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.10, RankedOption1Days: 6, RankedOption2DC: 'DC3', RankedOption2Cost: 7.80, RankedOption2Days: 7, RankedOption3DC: 'DC4', RankedOption3Cost: 8.20, RankedOption3Days: 8, ChosenRank: 1, LaneCost: 7.10, CostDeltaVsBest: 0, DeliveryDays: 6, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 17400, UtilImpactPct: 5.1, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR006', Dest3Zip: '100', DestState: 'NY', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC4', RankedOption1DC: 'DC4', RankedOption1Cost: 6.90, RankedOption1Days: 6, RankedOption2DC: 'DC3', RankedOption2Cost: 7.40, RankedOption2Days: 7, RankedOption3DC: 'DC1', RankedOption3Cost: 7.80, RankedOption3Days: 8, ChosenRank: 1, LaneCost: 6.90, CostDeltaVsBest: 0, DeliveryDays: 6, SLABreachFlag: 'Y', ExcludedBySLAFlag: 'N', FootprintContribution: 16200, UtilImpactPct: 4.7, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR006', Dest3Zip: '331', DestState: 'FL', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC4', RankedOption1DC: 'DC4', RankedOption1Cost: 6.60, RankedOption1Days: 5, RankedOption2DC: 'DC3', RankedOption2Cost: 7.10, RankedOption2Days: 6, RankedOption3DC: 'DC1', RankedOption3Cost: 7.40, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 6.60, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 14800, UtilImpactPct: 4.1, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR006', Dest3Zip: '482', DestState: 'MI', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 6.30, RankedOption1Days: 4, RankedOption2DC: 'DC1', RankedOption2Cost: 6.80, RankedOption2Days: 5, RankedOption3DC: 'DC4', RankedOption3Cost: 7.10, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.30, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 15600, UtilImpactPct: 4.4, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR006', Dest3Zip: '641', DestState: 'MO', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 6.40, RankedOption1Days: 5, RankedOption2DC: 'DC1', RankedOption2Cost: 6.90, RankedOption2Days: 6, RankedOption3DC: 'DC4', RankedOption3Cost: 7.30, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 6.40, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 15200, UtilImpactPct: 4.3, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR006', Dest3Zip: '554', DestState: 'MN', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 6.20, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 6.70, RankedOption2Days: 5, RankedOption3DC: 'DC4', RankedOption3Cost: 7.10, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.20, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 15000, UtilImpactPct: 4.2, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR008', Dest3Zip: '900', DestState: 'CA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.10, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 7.60, RankedOption2Days: 5, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 8.10, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 7.10, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 12000, UtilImpactPct: 3.6, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR008', Dest3Zip: '606', DestState: 'IL', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 6.80, RankedOption1Days: 4, RankedOption2DC: 'DC1', RankedOption2Cost: 7.20, RankedOption2Days: 5, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 7.60, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.80, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 13200, UtilImpactPct: 3.9, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR008', Dest3Zip: '770', DestState: 'TX', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'Pharr TX', RankedOption1DC: 'Pharr TX', RankedOption1Cost: 6.60, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 7.20, RankedOption2Days: 5, RankedOption3DC: 'DC1', RankedOption3Cost: 7.60, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.60, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 11800, UtilImpactPct: 3.5, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR008', Dest3Zip: '331', DestState: 'FL', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.40, RankedOption1Days: 5, RankedOption2DC: 'DC3', RankedOption2Cost: 7.80, RankedOption2Days: 6, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 8.20, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 7.40, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 12600, UtilImpactPct: 3.8, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR008', Dest3Zip: '100', DestState: 'NY', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 6.90, RankedOption1Days: 4, RankedOption2DC: 'DC1', RankedOption2Cost: 7.30, RankedOption2Days: 5, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 7.70, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.90, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 12200, UtilImpactPct: 3.7, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR008', Dest3Zip: '021', DestState: 'MA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.30, RankedOption1Days: 5, RankedOption2DC: 'DC3', RankedOption2Cost: 7.70, RankedOption2Days: 6, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 8.10, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 7.30, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 11600, UtilImpactPct: 3.4, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR008', Dest3Zip: '850', DestState: 'AZ', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'Pharr TX', RankedOption1DC: 'Pharr TX', RankedOption1Cost: 6.70, RankedOption1Days: 4, RankedOption2DC: 'DC1', RankedOption2Cost: 7.10, RankedOption2Days: 5, RankedOption3DC: 'DC3', RankedOption3Cost: 7.50, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.70, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 11400, UtilImpactPct: 3.3, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR008', Dest3Zip: '482', DestState: 'MI', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 6.90, RankedOption1Days: 4, RankedOption2DC: 'DC1', RankedOption2Cost: 7.20, RankedOption2Days: 5, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 7.60, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.90, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 11800, UtilImpactPct: 3.5, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR008', Dest3Zip: '303', DestState: 'GA', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.20, RankedOption1Days: 5, RankedOption2DC: 'DC3', RankedOption2Cost: 7.60, RankedOption2Days: 6, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 8.00, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 7.20, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 12000, UtilImpactPct: 3.6, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR008', Dest3Zip: '981', DestState: 'WA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.60, RankedOption1Days: 5, RankedOption2DC: 'DC3', RankedOption2Cost: 8.10, RankedOption2Days: 6, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 8.60, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 7.60, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 13400, UtilImpactPct: 3.9, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR008', Dest3Zip: '752', DestState: 'TX', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'TopRetailerB', AssignedDC: 'Pharr TX', RankedOption1DC: 'Pharr TX', RankedOption1Cost: 6.80, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 7.20, RankedOption2Days: 5, RankedOption3DC: 'DC1', RankedOption3Cost: 7.60, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.80, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 11200, UtilImpactPct: 3.3, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR007', Dest3Zip: '900', DestState: 'CA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 6.90, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 8.10, RankedOption2Days: 5, RankedOption3DC: 'Pharr TX', RankedOption3Cost: 8.80, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.90, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 19800, UtilImpactPct: 5.6, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR007', Dest3Zip: '606', DestState: 'IL', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 6.20, RankedOption1Days: 3, RankedOption2DC: 'DC2', RankedOption2Cost: 6.90, RankedOption2Days: 4, RankedOption3DC: 'DC1', RankedOption3Cost: 7.40, RankedOption3Days: 5, ChosenRank: 1, LaneCost: 6.20, CostDeltaVsBest: 0, DeliveryDays: 3, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 21400, UtilImpactPct: 7.1, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR007', Dest3Zip: '100', DestState: 'NY', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'TopRetailerB', AssignedDC: 'Stratford CT', RankedOption1DC: 'Stratford CT', RankedOption1Cost: 5.10, RankedOption1Days: 2, RankedOption2DC: 'DC2', RankedOption2Cost: 6.20, RankedOption2Days: 4, RankedOption3DC: 'DC3', RankedOption3Cost: 6.70, RankedOption3Days: 5, ChosenRank: 1, LaneCost: 5.10, CostDeltaVsBest: 0, DeliveryDays: 2, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 18200, UtilImpactPct: 5.3, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR007', Dest3Zip: '770', DestState: 'TX', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'Pharr TX', RankedOption1DC: 'Pharr TX', RankedOption1Cost: 6.00, RankedOption1Days: 4, RankedOption2DC: 'DC4', RankedOption2Cost: 7.10, RankedOption2Days: 5, RankedOption3DC: 'DC3', RankedOption3Cost: 7.60, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.00, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 16800, UtilImpactPct: 4.8, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR007', Dest3Zip: '331', DestState: 'FL', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC4', RankedOption1DC: 'DC4', RankedOption1Cost: 6.80, RankedOption1Days: 5, RankedOption2DC: 'DC3', RankedOption2Cost: 7.40, RankedOption2Days: 6, RankedOption3DC: 'Stratford CT', RankedOption3Cost: 8.10, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 6.80, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'Y', ExcludedBySLAFlag: 'N', FootprintContribution: 17600, UtilImpactPct: 5.1, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR007', Dest3Zip: '021', DestState: 'MA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'Stratford CT', RankedOption1DC: 'Stratford CT', RankedOption1Cost: 6.00, RankedOption1Days: 4, RankedOption2DC: 'DC2', RankedOption2Cost: 6.90, RankedOption2Days: 5, RankedOption3DC: 'DC3', RankedOption3Cost: 7.40, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.00, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 15400, UtilImpactPct: 4.4, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR007', Dest3Zip: '981', DestState: 'WA', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 7.20, RankedOption1Days: 5, RankedOption2DC: 'DC3', RankedOption2Cost: 8.60, RankedOption2Days: 6, RankedOption3DC: 'DC2', RankedOption3Cost: 9.00, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 7.20, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 22400, UtilImpactPct: 6.5, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR007', Dest3Zip: '303', DestState: 'GA', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', AssignedDC: 'DC4', RankedOption1DC: 'DC4', RankedOption1Cost: 6.90, RankedOption1Days: 4, RankedOption2DC: 'DC3', RankedOption2Cost: 7.50, RankedOption2Days: 5, RankedOption3DC: 'Stratford CT', RankedOption3Cost: 8.20, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.90, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 17000, UtilImpactPct: 4.9, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR007', Dest3Zip: '850', DestState: 'AZ', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC1', RankedOption1DC: 'DC1', RankedOption1Cost: 6.60, RankedOption1Days: 5, RankedOption2DC: 'Pharr TX', RankedOption2Cost: 7.20, RankedOption2Days: 6, RankedOption3DC: 'DC3', RankedOption3Cost: 7.60, RankedOption3Days: 7, ChosenRank: 1, LaneCost: 6.60, CostDeltaVsBest: 0, DeliveryDays: 5, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 16600, UtilImpactPct: 4.7, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
  { ScenarioRunID: 'SR007', Dest3Zip: '482', DestState: 'MI', Channel: 'B2B', Terms: 'Collect', CustomerGroup: 'Other', AssignedDC: 'DC3', RankedOption1DC: 'DC3', RankedOption1Cost: 6.10, RankedOption1Days: 4, RankedOption2DC: 'DC1', RankedOption2Cost: 6.70, RankedOption2Days: 5, RankedOption3DC: 'DC2', RankedOption3Cost: 7.10, RankedOption3Days: 6, ChosenRank: 1, LaneCost: 6.10, CostDeltaVsBest: 0, DeliveryDays: 4, SLABreachFlag: 'N', ExcludedBySLAFlag: 'N', FootprintContribution: 15800, UtilImpactPct: 4.5, OverrideAppliedFlag: 'N', OverrideVersion: null, NotesFlag: '' },
];

export const scenarioOverrides: ScenarioOverride[] = [
  {
    ScenarioRunID: 'SR003',
    OverrideVersion: 'v1',
    Dest3Zip: '606',
    Channel: 'B2C',
    Terms: 'Prepaid',
    CustomerGroup: 'TopRetailerA',
    OldDC: 'DC3',
    NewDC: 'Pharr TX',
    ReasonCode: 'Capacity',
    Comment: 'DC3 approaching util cap; shifted high volume lane to Pharr',
    UpdatedBy: 'James Kim',
    UpdatedAt: '2026-01-08T14:22:00',
  },
  {
    ScenarioRunID: 'SR003',
    OverrideVersion: 'v1',
    Dest3Zip: '857',
    Channel: 'B2B',
    Terms: 'Collect',
    CustomerGroup: 'TopRetailerB',
    OldDC: 'DC1',
    NewDC: 'Pharr TX',
    ReasonCode: 'CustomerPreference',
    Comment: 'Customer requested Pharr sourcing for regional consolidation',
    UpdatedBy: 'James Kim',
    UpdatedAt: '2026-01-08T14:28:00',
  },
];

export const comparisonHeaders: ComparisonHeader[] = [
  {
    ComparisonID: 'CMP001',
    ComparisonName: 'Baseline vs Tactical (DC4 Suppressed)',
    ScenarioRunID_A: 'SR001',
    ScenarioRunID_B: 'SR002',
    CreatedBy: 'Sarah Chen',
    CreatedAt: '2026-01-06T14:00:00',
    Status: 'Published',
    Notes: 'Analysis of DC4 maintenance window impact',
    DecisionVerdict: 'Recommend A',
    DecisionReason: 'DC4 suppression increases cost by 2.2% and significantly impacts SLA performance. Recommend deferring maintenance to off-peak period.',
    CostDelta: 277360,
    CostDeltaPct: 2.16,
    AvgDaysDelta: 0.6,
    SLABreachDelta: 6.3,
    MaxUtilDelta: 16,
    SpaceDelta: 0,
    SpaceCoreDelta: 0,
    SpaceBCVDelta: 0,
    ChangedLaneDelta: 243,
  },
  {
    ComparisonID: 'CMP002',
    ComparisonName: 'Baseline vs Strategic (Pharr Expansion)',
    ScenarioRunID_A: 'SR001',
    ScenarioRunID_B: 'SR003',
    CreatedBy: 'James Kim',
    CreatedAt: '2026-01-08T17:00:00',
    Status: 'Published',
    Notes: 'Evaluating ROI of Pharr facility expansion',
    DecisionVerdict: 'Recommend B',
    DecisionReason: 'Strategic scenario shows 4.3% cost reduction ($549K annual savings) with improved service levels. Pharr expansion investment justified by network optimization gains.',
    CostDelta: -548870,
    CostDeltaPct: -4.27,
    AvgDaysDelta: -0.3,
    SLABreachDelta: -0.9,
    MaxUtilDelta: 4,
    SpaceDelta: 50000,
    SpaceCoreDelta: 40000,
    SpaceBCVDelta: 10000,
    ChangedLaneDelta: 186,
  },
  {
    ComparisonID: 'CMP003',
    ComparisonName: 'Tactical vs Strategic Comparison',
    ScenarioRunID_A: 'SR002',
    ScenarioRunID_B: 'SR003',
    CreatedBy: 'Michael Torres',
    CreatedAt: '2026-01-09T10:30:00',
    Status: 'Working',
    Notes: 'Executive review pending',
    DecisionVerdict: null,
    DecisionReason: null,
    CostDelta: -826230,
    CostDeltaPct: -6.30,
    AvgDaysDelta: -0.9,
    SLABreachDelta: -7.2,
    MaxUtilDelta: -12,
    SpaceDelta: 50000,
    SpaceCoreDelta: 40000,
    SpaceBCVDelta: 10000,
    ChangedLaneDelta: 429,
  },
];

export const comparisonDetailDC: ComparisonDetailDC[] = [
  { ComparisonID: 'CMP001', DCName: 'DC1', Cost_A: 2847320, Cost_B: 3247890, Cost_Delta: 400570, Util_A: 72, Util_B: 88, Util_Delta: 16, Space_A: 78000, Space_B: 94000, Space_Delta: 16000, SLABreach_A: 4, SLABreach_B: 18 },
  { ComparisonID: 'CMP001', DCName: 'DC2', Cost_A: 1924800, Cost_B: 2424600, Cost_Delta: 499800, Util_A: 65, Util_B: 84, Util_Delta: 19, Space_A: 64000, Space_B: 78000, Space_Delta: 14000, SLABreach_A: 3, SLABreach_B: 16 },
  { ComparisonID: 'CMP001', DCName: 'DC3', Cost_A: 3124680, Cost_B: 3624800, Cost_Delta: 500120, Util_A: 78, Util_B: 94, Util_Delta: 16, Space_A: 82000, Space_B: 96000, Space_Delta: 14000, SLABreach_A: 5, SLABreach_B: 24 },
  { ComparisonID: 'CMP001', DCName: 'DC4', Cost_A: 2142100, Cost_B: 0, Cost_Delta: -2142100, Util_A: 68, Util_B: 0, Util_Delta: -68, Space_A: 58000, Space_B: 0, Space_Delta: -58000, SLABreach_A: 1, SLABreach_B: 0 },
  { ComparisonID: 'CMP001', DCName: 'Pharr TX', Cost_A: 1847220, Cost_B: 2424700, Cost_Delta: 577480, Util_A: 58, Util_B: 82, Util_Delta: 24, Space_A: 38000, Space_B: 48000, Space_Delta: 10000, SLABreach_A: 2, SLABreach_B: 12 },
  { ComparisonID: 'CMP001', DCName: 'Stratford CT', Cost_A: 961200, Cost_B: 1402690, Cost_Delta: 441490, Util_A: 42, Util_B: 64, Util_Delta: 22, Space_A: 22000, Space_B: 26000, Space_Delta: 4000, SLABreach_A: 1, SLABreach_B: 8 },
  { ComparisonID: 'CMP002', DCName: 'DC1', Cost_A: 2847320, Cost_B: 2648920, Cost_Delta: -198400, Util_A: 72, Util_B: 70, Util_Delta: -2, Space_A: 78000, Space_B: 82000, Space_Delta: 4000, SLABreach_A: 4, SLABreach_B: 2 },
  { ComparisonID: 'CMP002', DCName: 'DC2', Cost_A: 1924800, Cost_B: 1824500, Cost_Delta: -100300, Util_A: 65, Util_B: 64, Util_Delta: -1, Space_A: 64000, Space_B: 68000, Space_Delta: 4000, SLABreach_A: 3, SLABreach_B: 1 },
  { ComparisonID: 'CMP002', DCName: 'DC3', Cost_A: 3124680, Cost_B: 2948650, Cost_Delta: -176030, Util_A: 78, Util_B: 76, Util_Delta: -2, Space_A: 82000, Space_B: 86000, Space_Delta: 4000, SLABreach_A: 5, SLABreach_B: 3 },
  { ComparisonID: 'CMP002', DCName: 'DC4', Cost_A: 2142100, Cost_B: 2042100, Cost_Delta: -100000, Util_A: 68, Util_B: 66, Util_Delta: -2, Space_A: 58000, Space_B: 60000, Space_Delta: 2000, SLABreach_A: 1, SLABreach_B: 1 },
  { ComparisonID: 'CMP002', DCName: 'Pharr TX', Cost_A: 1847220, Cost_B: 2024280, Cost_Delta: 177060, Util_A: 58, Util_B: 82, Util_Delta: 24, Space_A: 38000, Space_B: 72000, Space_Delta: 34000, SLABreach_A: 2, SLABreach_B: 1 },
  { ComparisonID: 'CMP002', DCName: 'Stratford CT', Cost_A: 961200, Cost_B: 810000, Cost_Delta: -151200, Util_A: 42, Util_B: 38, Util_Delta: -4, Space_A: 22000, Space_B: 24000, Space_Delta: 2000, SLABreach_A: 1, SLABreach_B: 0 },
];

export const comparisonDetailLanes: ComparisonDetailLane[] = [
  { ComparisonID: 'CMP001', Dest3Zip: '331', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', DC_A: 'DC4', DC_B: 'DC3', Cost_A: 6.80, Cost_B: 7.20, Cost_Delta: 0.40, Days_A: 4, Days_B: 5, Days_Delta: 1, UtilImpact_A: 4.8, UtilImpact_B: 6.2, Flags: 'DCChange,SLA' },
  { ComparisonID: 'CMP001', Dest3Zip: '606', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', DC_A: 'DC3', DC_B: 'DC3', Cost_A: 5.80, Cost_B: 5.80, Cost_Delta: 0, Days_A: 2, Days_B: 2, Days_Delta: 0, UtilImpact_A: 7.2, UtilImpact_B: 7.2, Flags: '' },
  { ComparisonID: 'CMP001', Dest3Zip: '770', Channel: 'D2C', Terms: 'Prepaid', CustomerGroup: 'Other', DC_A: 'Pharr TX', DC_B: 'Pharr TX', Cost_A: 5.40, Cost_B: 5.40, Cost_Delta: 0, Days_A: 3, Days_B: 3, Days_Delta: 0, UtilImpact_A: 4.2, UtilImpact_B: 4.2, Flags: '' },
  { ComparisonID: 'CMP002', Dest3Zip: '606', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'TopRetailerA', DC_A: 'DC3', DC_B: 'Pharr TX', Cost_A: 5.80, Cost_B: 5.90, Cost_Delta: 0.10, Days_A: 2, Days_B: 3, Days_Delta: 1, UtilImpact_A: 7.2, UtilImpact_B: 8.4, Flags: 'DCChange,Override' },
  { ComparisonID: 'CMP002', Dest3Zip: '900', Channel: 'B2C', Terms: 'Prepaid', CustomerGroup: 'Other', DC_A: 'DC1', DC_B: 'DC1', Cost_A: 6.20, Cost_B: 6.10, Cost_Delta: -0.10, Days_A: 3, Days_B: 3, Days_Delta: 0, UtilImpact_A: 3.8, UtilImpact_B: 3.6, Flags: '' },
];

export const dataHealthSnapshotsByRegion: Record<'US' | 'Canada', DataHealthSnapshot> = {
  US: {
    SnapshotTime: '2026-01-10T06:00:00',
    ForecastFreshness: 'OK',
    RatesCoveragePct: 94.2,
    MissingRatesLaneCount: 142,
    CapacityFreshness: 'OK',
    MissingCapacityDCCount: 0,
    BCVDimsAvailability: 'Assumed',
    Notes: 'Forecast updated daily. BCV dimensions using carton average assumptions. Rate gaps primarily in new 3-digit zones (rural).',
  },
  Canada: {
    SnapshotTime: '2026-01-09T06:00:00',
    ForecastFreshness: 'Warn',
    RatesCoveragePct: 88.5,
    MissingRatesLaneCount: 46,
    CapacityFreshness: 'OK',
    MissingCapacityDCCount: 0,
    BCVDimsAvailability: 'Assumed',
    Notes: 'Forecast updated 3 days ago. Some carrier rates missing in northern regions.',
  },
};

export const getDataHealthSnapshot = (workspace: 'All' | 'US' | 'Canada'): DataHealthSnapshot => {
  if (workspace !== 'All') return dataHealthSnapshotsByRegion[workspace];

  const regions: Array<'US' | 'Canada'> = ['US', 'Canada'];
  const snapshots = regions.map((region) => dataHealthSnapshotsByRegion[region]);

  const worstStatus = (a: DataHealthSnapshot['ForecastFreshness'], b: DataHealthSnapshot['ForecastFreshness']) => {
    const order = { OK: 0, Warn: 1, Error: 2 } as const;
    return order[a] >= order[b] ? a : b;
  };

  const aggregateForecast = snapshots.reduce(
    (acc, s) => worstStatus(acc, s.ForecastFreshness),
    'OK' as DataHealthSnapshot['ForecastFreshness']
  );

  const aggregateCapacity = snapshots.reduce(
    (acc, s) => worstStatus(acc, s.CapacityFreshness),
    'OK' as DataHealthSnapshot['CapacityFreshness']
  );

  const aggregateBCV = snapshots.some(s => s.BCVDimsAvailability === 'Missing')
    ? 'Missing'
    : snapshots.some(s => s.BCVDimsAvailability === 'Assumed')
      ? 'Assumed'
      : 'OK';

  const avgRatesCoverage = Math.round(
    (snapshots.reduce((sum, s) => sum + s.RatesCoveragePct, 0) / snapshots.length) * 10
  ) / 10;

  const latestSnapshotTime = snapshots
    .map(s => s.SnapshotTime)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return {
    SnapshotTime: latestSnapshotTime,
    ForecastFreshness: aggregateForecast,
    RatesCoveragePct: avgRatesCoverage,
    MissingRatesLaneCount: snapshots.reduce((sum, s) => sum + s.MissingRatesLaneCount, 0),
    CapacityFreshness: aggregateCapacity,
    MissingCapacityDCCount: snapshots.reduce((sum, s) => sum + s.MissingCapacityDCCount, 0),
    BCVDimsAvailability: aggregateBCV,
    Notes: 'Aggregated snapshot across all workspaces (worst status, summed missing counts, average coverage).',
  };
};

export const dcList = ['DC1', 'DC2', 'DC3', 'DC4', 'Pharr TX', 'Stratford CT'];

export const dcCapacityReference = [
  { DCName: 'DC1', CurrentCapacity: 95000, Notes: 'West Coast hub' },
  { DCName: 'DC2', CurrentCapacity: 82000, Notes: 'Midwest regional' },
  { DCName: 'DC3', CurrentCapacity: 108000, Notes: 'Central distribution hub' },
  { DCName: 'DC4', CurrentCapacity: 74000, Notes: 'Southeast regional' },
  { DCName: 'Pharr TX', CurrentCapacity: 58000, Notes: 'Southwest hub; expansion planned' },
  { DCName: 'Stratford CT', CurrentCapacity: 42000, Notes: 'Northeast regional' },
];
