# Dataflow Trigger Approach Without Admin Access

This app triggers Domo dataflows from inside the Domo app runtime, without using admin credentials, API tokens, or external backend services.

The key idea is:

- Use the Domo app runtime context for authentication.
- Call the Dataflow execution API through Code Engine package mappings.
- Keep the mapping between scenarios and dataflows in the app registry.
- Poll execution status until the run completes.
- Refresh scenario data and update the UI when the run succeeds.

## Why This Works

The app runs inside Domo, so it already has access to the tenant context.

Instead of trying to manage admin-level access or external OAuth credentials, the app:

1. Uses `DomoApi` to call Domo endpoints from the app runtime.
2. Uses Code Engine package mappings in `manifest.json` to invoke the internal Dataflow package.
3. Maps each scenario to a specific `dataflowId` in `datasetRegistry.ts`.

This is a safer and simpler pattern than exposing admin credentials in the frontend.

## Core Mapping

The registry holds the scenario-to-dataflow relationship:

```ts
export const scenarioDatasetRegistry = [
  {
    datasetId: '0c09f231-4e4e-4516-a64f-c9ec01a772d1',
    dataflowId: '3246',
    scenarioKey: 'etl_01',
    scenarioLabel: 'Dataset 01',
    regionDefault: 'Auto',
    enabled: true,
  },
];
```

That mapping is used to connect:

- the dataset rows loaded from Domo
- the scenario headers shown in the UI
- the dataflow ID that should be triggered when the user clicks `Run`

## Trigger Flow

The actual trigger logic lives in `src/services/domo/domoDataflow.ts`.

### Trigger

```ts
export const triggerDataflow = async (dataflowId: string) => {
  const response = await callPostWithFallback(START_DATAFLOW_ENDPOINTS, {
    dataFlowId: String(dataflowId),
  });
  const executionId = parseExecutionId(parsePackageResult(response));
  return { id: executionId, state: 'RUNNING' };
};
```

### Status Check

```ts
export const checkDataflowStatus = async (dataflowId: string, executionId: number | string) => {
  const metadataResponse = await callPostWithFallback(METADATA_DATAFLOW_ENDPOINTS, {
    dataFlowId: String(dataflowId),
  });

  const lastExecution = parsePackageResult(metadataResponse)?.lastExecution ?? {};
  const lastExecutionId = extractExecutionId(lastExecution);

  if (executionId && lastExecutionId && String(executionId) !== lastExecutionId) {
    return { state: 'RUNNING', id: executionId };
  }

  const metadataState = normalizeStateFromExecution(lastExecution);
  return { state: metadataState, id: executionId };
};
```

## UI Orchestration

The app handles the full run lifecycle in `src/App.tsx`.

When the user clicks `Run`:

1. The scenario is marked `Running` in local state.
2. `triggerDataflow(dataflowId)` is called.
3. Polling starts every 5 seconds.
4. On `SUCCESS`:
   - polling stops
   - Domo datasets are reloaded
   - scenario status changes to `Completed`
   - a success toast is shown
5. On `FAILED` or timeout:
   - status reverts to the previous state
   - polling stops
   - an error toast is shown

### Runtime Guardrails

The current implementation also includes:

- duplicate-run guard
- polling timeout
- max retry limit
- consecutive poll error cutoff
- cleanup on unmount

## Relevant App Snippet

```ts
const execution = await triggerDataflow(dataflowId);
pushToast(`${scenario.RunName} is running.`, 'info');

const status = await checkDataflowStatus(dataflowId, execution.id);
if (status.state === 'SUCCESS') {
  await loadDomoDc();
  setScenarioState(...Completed...);
}
```

## Manifest Wiring

The Code Engine package mappings are declared in `public/manifest.json`.

### Dataflow Package

```json
{
  "name": "DOMO DataFlows",
  "alias": "startdataflow",
  "packageId": "fd94540a-8c94-4d8c-af0f-8b149138add0",
  "version": "2.0.13",
  "functionName": "startDataFlow"
}
```

Related package aliases also exist for:

- `dataflowstatus`
- `dataflowmetadata`

These let the app call the dataflow package from inside Domo without external auth.

## What You Do Not Need

This approach does not require:

- admin user credentials
- client secret exposed in the UI
- a separate backend to proxy the request
- manual browser session handling

## What You Do Need

To keep this working, the Domo tenant must have:

- the app deployed inside Domo
- the Code Engine Dataflow package installed
- the package version referenced by the manifest
- the registry entries populated with the correct `datasetId` and `dataflowId`

## Practical Notes

- `dataFlowId` must be passed as a string.
- Status polling is intentionally conservative to avoid false success when another execution is running.
- The UI sorts scenarios by `DataflowID` so the mapping is easier to verify.

## Files Involved

- `src/services/domo/domoDataflow.ts`
- `src/services/domo/datasetRegistry.ts`
- `src/App.tsx`
- `public/manifest.json`

