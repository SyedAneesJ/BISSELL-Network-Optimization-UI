export interface NewScenarioFormData {
  region: 'US' | 'Canada';
  baselineScenarioId: string;
  baselineDataflowId: string;
  scenarioType: string;
  entityScope: string;
  channelScope: string[];
  termsScope: string;
  runName: string;
  tags: string[];
  notes: string;
  activeDCs: Set<string>;
  suppressedDCs: Set<string>;
  footprintMode: string;
  utilCap: number;
  levelLoad: boolean;
  leadTimeCap: number;
  excludeBeyondCap: boolean;
  costVsService: number;
  fuelSurchargeMode: string;
  fuelSurchargeOverride: number | null;
  accessorials: {
    residential: boolean;
    liftgate: boolean;
    insideDelivery: boolean;
  };
  allowRelocationPrepaid: boolean;
  allowRelocationCollect: boolean;
  bcvRuleSet: string;
  allowManualOverride: boolean;
}
