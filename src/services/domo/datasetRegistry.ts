export type ScenarioDatasetRegistryItem = {
  datasetId: string;
  scenarioKey: string;
  scenarioLabel: string;
  regionDefault: 'US' | 'Canada' | 'Auto';
  enabled: boolean;
  dataflowId?: string;
};

export const scenarioDatasetRegistry: ScenarioDatasetRegistryItem[] = [
  { datasetId: '0c09f231-4e4e-4516-a64f-c9ec01a772d1', dataflowId: '3246', scenarioKey: 'etl_01', scenarioLabel: 'Dataset 01', regionDefault: 'Auto', enabled: true },
  { datasetId: '93cec818-6244-4b25-b189-3a9856fa02d8', dataflowId: '3237', scenarioKey: 'etl_02', scenarioLabel: 'Dataset 02', regionDefault: 'Auto', enabled: true },
  { datasetId: '6d798b7e-9a59-4917-9e2a-90d99d2c8f41', dataflowId: '3238', scenarioKey: 'etl_03', scenarioLabel: 'Dataset 03', regionDefault: 'Auto', enabled: true },
  { datasetId: 'bda36b1c-0bd0-4132-89c9-ca1892b1c11b', dataflowId: '3239', scenarioKey: 'etl_04', scenarioLabel: 'Dataset 04', regionDefault: 'Auto', enabled: true },
  { datasetId: '57f438b5-1493-4844-a7cf-2ba71d8a28a2', dataflowId: '3240', scenarioKey: 'etl_05', scenarioLabel: 'Dataset 05', regionDefault: 'Auto', enabled: true },
  { datasetId: 'a8bcb1f0-21c1-40a4-8785-11f446022a42', dataflowId: '3241', scenarioKey: 'etl_06', scenarioLabel: 'Dataset 06', regionDefault: 'Auto', enabled: true },
  { datasetId: '390d6172-17ea-4fdd-82ab-6ea1558e5fc6', dataflowId: '3242', scenarioKey: 'etl_07', scenarioLabel: 'Dataset 07', regionDefault: 'Auto', enabled: true },
  { datasetId: '9daeb5b1-5780-421e-b6b0-03b3ef03bb3d', dataflowId: '3243', scenarioKey: 'etl_08', scenarioLabel: 'Dataset 08', regionDefault: 'Auto', enabled: true },
  { datasetId: 'f19cf90a-7034-4694-bebb-238ecdbe2e4b', dataflowId: '3244', scenarioKey: 'etl_09', scenarioLabel: 'Dataset 09', regionDefault: 'Auto', enabled: true },
  { datasetId: '57ff5862-6c17-475f-a39b-d7d8df7d1226', dataflowId: '3245', scenarioKey: 'etl_10', scenarioLabel: 'Dataset 10', regionDefault: 'Auto', enabled: true },
  { datasetId: 'a75c6d8a-259d-4482-9bde-31763f981d75', dataflowId: '3228', scenarioKey: 'etl_11', scenarioLabel: 'Dataset 11', regionDefault: 'Auto', enabled: true },
  { datasetId: '508f0863-35b5-4a47-8178-ec5f0698f38b', dataflowId: '3229', scenarioKey: 'etl_12', scenarioLabel: 'Dataset 12', regionDefault: 'Auto', enabled: true },
  { datasetId: '799947d0-d460-4bf8-92ac-0999388e5b18', dataflowId: '3230', scenarioKey: 'etl_13', scenarioLabel: 'Dataset 13', regionDefault: 'Auto', enabled: true },
  { datasetId: 'a72050a7-f75a-4085-904a-9cdbf26e93d0', dataflowId: '3231', scenarioKey: 'etl_14', scenarioLabel: 'Dataset 14', regionDefault: 'Auto', enabled: true },
  { datasetId: '6fa7fce5-7bac-44cf-8154-7d0849350791', dataflowId: '3233', scenarioKey: 'etl_15', scenarioLabel: 'Dataset 15', regionDefault: 'Auto', enabled: true },
  { datasetId: '368699b9-895b-445e-9465-4fbc6032f7be', dataflowId: '3232', scenarioKey: 'etl_16', scenarioLabel: 'Dataset 16', regionDefault: 'Auto', enabled: true },
  { datasetId: 'ca512476-35cd-4889-92a2-d78494ca7be7', dataflowId: '3234', scenarioKey: 'etl_17', scenarioLabel: 'Dataset 17', regionDefault: 'Auto', enabled: true },
  { datasetId: 'f4cddd13-0419-4552-9487-b30580822651', dataflowId: '3235', scenarioKey: 'etl_18', scenarioLabel: 'Dataset 18', regionDefault: 'Auto', enabled: true },
  { datasetId: '32850f65-eec1-427c-b010-a951e69b1ecd', dataflowId: '3211', scenarioKey: 'etl_19', scenarioLabel: 'Dataset 19', regionDefault: 'Auto', enabled: true },
];
