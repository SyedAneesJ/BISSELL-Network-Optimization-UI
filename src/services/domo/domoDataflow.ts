import DomoApi from './domoApi';

export interface DataflowExecutionResponse {
  id: number | string;
  onboardFlowId: number;
  previewRows: number;
  dapDataFlowExecutionId: string;
  beginTime: number;
  lastUpdated: number;
  state: 'CREATED' | 'SUCCESS' | 'FAILED' | 'RUNNING';
  activationType: string;
}

const DATAFLOW_STATES = new Set(['CREATED', 'RUNNING', 'SUCCESS', 'FAILED'] as const);
const DATAFLOW_PACKAGE_ID = 'fd94540a-8c94-4d8c-af0f-8b149138add0';
const DATAFLOW_PACKAGE_VERSION = '2.0.13';

const START_DATAFLOW_ENDPOINTS = [
  '/domo/codeengine/v2/packages/startdataflow',
  `/domo/codeengine/v2/packages/${DATAFLOW_PACKAGE_ID}/versions/${DATAFLOW_PACKAGE_VERSION}/functions/startDataFlow`,
] as const;

const STATUS_DATAFLOW_ENDPOINTS = [
  '/domo/codeengine/v2/packages/dataflowstatus',
  `/domo/codeengine/v2/packages/${DATAFLOW_PACKAGE_ID}/versions/${DATAFLOW_PACKAGE_VERSION}/functions/getDataflowExecutionsStatus`,
] as const;

const METADATA_DATAFLOW_ENDPOINTS = [
  '/domo/codeengine/v2/packages/dataflowmetadata',
  `/domo/codeengine/v2/packages/${DATAFLOW_PACKAGE_ID}/versions/${DATAFLOW_PACKAGE_VERSION}/functions/getDataFlowMetadata`,
] as const;

const parseExecutionId = (response: any): number | string => {
  const rawId = response?.id ?? response?.executionId ?? response?.dapDataFlowExecutionId;
  if (rawId === undefined || rawId === null || rawId === '') {
    throw new Error('Invalid trigger response: missing execution id. Verify app is running inside Domo.');
  }
  return rawId as number | string;
};

const parseState = (response: any): DataflowExecutionResponse['state'] => {
  const rawState = String(response?.state ?? '').trim().toUpperCase();
  if (!rawState || !DATAFLOW_STATES.has(rawState as DataflowExecutionResponse['state'])) {
    throw new Error(
      `Invalid dataflow status response: missing/unknown state "${rawState || 'EMPTY'}". Verify Domo runtime/proxy.`
    );
  }
  return rawState as DataflowExecutionResponse['state'];
};

const parsePackageResult = (response: any) => {
  if (typeof response?.result === 'string') {
    try {
      return JSON.parse(response.result);
    } catch {
      return response.result;
    }
  }
  return response?.result ?? response;
};

const normalizeStateFromExecution = (execution: any): DataflowExecutionResponse['state'] => {
  const stateRaw = String(
    execution?.state ??
    execution?.executionState ??
    execution?.status ??
    ''
  ).trim().toUpperCase();

  if (stateRaw.includes('RUNNING') || stateRaw === 'QUEUED' || stateRaw === 'CREATED') {
    return 'RUNNING';
  }
  if (stateRaw.includes('SUCCESS') || stateRaw.includes('COMPLETED')) {
    return 'SUCCESS';
  }
  if (execution?.failed === true || stateRaw.includes('FAIL')) {
    return 'FAILED';
  }
  return 'RUNNING';
};

const extractExecutionId = (execution: any): string => {
  const raw = execution?.id ?? execution?.executionId ?? execution?.dapDataFlowExecutionId ?? execution?.onboardFlowExecutionId;
  return raw === undefined || raw === null ? '' : String(raw);
};

const callPostWithFallback = async (endpoints: readonly string[], payload: any) => {
  let lastError: unknown = null;
  const tried: string[] = [];
  for (const endpoint of endpoints) {
    try {
      tried.push(endpoint);
      return await DomoApi.post(endpoint, payload);
    } catch (err) {
      lastError = err;
    }
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Code Engine call failed. Tried: ${tried.join(', ')}. Last error: ${detail}`);
};

/**
 * Triggers a Domo Magic ETL dataflow using the internal Domo API via proxy.
 */
export const triggerDataflow = async (dataflowId: string): Promise<DataflowExecutionResponse> => {
  try {
    const response = await callPostWithFallback(START_DATAFLOW_ENDPOINTS, {
      dataFlowId: String(dataflowId),
    });
    const packageResult = parsePackageResult(response);
    const executionId = parseExecutionId(packageResult);
    return {
      ...(packageResult as DataflowExecutionResponse),
      id: Number.isFinite(Number(executionId)) ? Number(executionId) : executionId,
      state: 'RUNNING',
    };
  } catch (err) {
    console.error('Error triggering dataflow:', err);
    throw err;
  }
};

/**
 * Checks the execution status of a previously triggered Domo dataflow.
 * The package status function is keyed by dataFlowId, not executionId.
 */
export const checkDataflowStatus = async (dataflowId: string, _executionId: number | string): Promise<DataflowExecutionResponse> => {
  try {
    const requestedExecutionId = String(_executionId);
    const metadataResponse = await callPostWithFallback(METADATA_DATAFLOW_ENDPOINTS, {
      dataFlowId: String(dataflowId),
    });
    const metadataResult = parsePackageResult(metadataResponse) || {};
    const lastExecution = metadataResult?.lastExecution ?? {};
    const lastExecutionId = extractExecutionId(lastExecution);

    // Protect against false SUCCESS from another concurrent or previous execution.
    if (requestedExecutionId && lastExecutionId && requestedExecutionId !== lastExecutionId) {
      return {
        id: requestedExecutionId,
        onboardFlowId: 0,
        previewRows: 0,
        dapDataFlowExecutionId: requestedExecutionId,
        beginTime: 0,
        lastUpdated: Date.now(),
        state: 'RUNNING',
        activationType: 'CODE_ENGINE_PACKAGE',
      };
    }

    const metadataState = normalizeStateFromExecution(lastExecution);
    if (metadataState === 'SUCCESS' || metadataState === 'FAILED') {
      return {
        ...(typeof metadataResult === 'object' && metadataResult !== null ? metadataResult : {}),
        id: requestedExecutionId || lastExecutionId || String(dataflowId),
        state: metadataState,
        onboardFlowId: 0,
        previewRows: 0,
        dapDataFlowExecutionId: lastExecutionId || requestedExecutionId || '',
        beginTime: Number(lastExecution?.beginTime ?? 0),
        lastUpdated: Date.now(),
        activationType: 'CODE_ENGINE_PACKAGE',
      };
    }

    // Fallback to package status helper as secondary signal.
    const response = await callPostWithFallback(STATUS_DATAFLOW_ENDPOINTS, {
      dataFlowId: String(dataflowId),
    });
    const packageResult = parsePackageResult(response);
    const statusText = typeof packageResult === 'string'
      ? packageResult
      : (packageResult?.status ?? packageResult?.state ?? '');
    const normalizedStatus = String(statusText).trim().toUpperCase();
    const mappedState: DataflowExecutionResponse['state'] =
      normalizedStatus === 'SUCCESS' ? 'SUCCESS'
        : normalizedStatus === 'RUNNING' ? 'RUNNING'
          : normalizedStatus === 'CREATED' ? 'CREATED'
            : 'FAILED';

    const state = requestedExecutionId && mappedState === 'SUCCESS'
      ? 'RUNNING'
      : parseState({ state: mappedState });
    return {
      ...(typeof packageResult === 'object' && packageResult !== null ? packageResult : {}),
      id: requestedExecutionId || String(dataflowId),
      state,
      onboardFlowId: 0,
      previewRows: 0,
      dapDataFlowExecutionId: '',
      beginTime: 0,
      lastUpdated: Date.now(),
      activationType: 'CODE_ENGINE_PACKAGE',
    };
  } catch (err) {
    console.error('Error checking dataflow status:', err);
    throw err;
  }
};
