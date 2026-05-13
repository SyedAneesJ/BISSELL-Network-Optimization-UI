import { extractDataflowLogic } from '@/services/domo/domoDataflow';
import type { ScenarioEngineMode, ScenarioLogicDocument } from './scenarioLogicTypes';
import sampleLogicText from './us-baseline.logic.txt?raw';

const unwrapResponseText = (text: string): string => {
  const trimmed = String(text || '').trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
};

const toDocument = (payload: any, source: ScenarioEngineMode, sourceLabel: string): ScenarioLogicDocument => {
  const nodes = Array.isArray(payload?.enrichedActions) ? payload.enrichedActions : [];
  const edges = Array.isArray(payload?.edges) ? payload.edges : [];
  return {
    logicVersion: String(payload?.logicVersion || payload?.version || '1.0').trim(),
    scenarioType: String(payload?.scenarioType || payload?.dataFlowName || 'Baseline').trim(),
    region: (String(payload?.region || '').trim() === 'Canada' ? 'Canada' : 'US'),
    baselineScenarioKey: String(payload?.baselineScenarioKey || payload?.dataFlowName || payload?.dataFlowID || '').trim(),
    baselineDataflowId: String(payload?.dataFlowID || payload?.baselineDataflowId || '').trim(),
    dataFlowId: payload?.dataFlowID ?? payload?.dataFlowId ?? null,
    dataFlowName: payload?.dataFlowName ?? payload?.name ?? null,
    source,
    sourceLabel,
    nodes,
    edges,
    inputDatasets: Array.isArray(payload?.inputDatasets) ? payload.inputDatasets.map((item: any) => String(item || '').trim()).filter(Boolean) : [],
    outputDefinitions: Array.isArray(payload?.outputDefinitions) ? payload.outputDefinitions.map((item: any) => String(item || '').trim()).filter(Boolean) : [],
    rankRules: Array.isArray(payload?.rankRules) ? payload.rankRules.map((item: any) => String(item || '').trim()).filter(Boolean) : [],
    dcRules: {
      allowedDcs: Array.isArray(payload?.dcRules?.allowedDcs) ? payload.dcRules.allowedDcs.map((item: any) => String(item || '').trim()).filter(Boolean) : [],
      suppressedDcs: Array.isArray(payload?.dcRules?.suppressedDcs) ? payload.dcRules.suppressedDcs.map((item: any) => String(item || '').trim()).filter(Boolean) : [],
      sourceFilter: payload?.dcRules?.sourceFilter ? String(payload.dcRules.sourceFilter) : null,
    },
    warnings: Array.isArray(payload?.warnings) ? payload.warnings.map((item: any) => String(item || '').trim()).filter(Boolean) : [],
    raw: payload,
  };
};

const loadSampleLogic = async (region: 'US' | 'Canada'): Promise<ScenarioLogicDocument> => {
  const jsonText = unwrapResponseText(sampleLogicText);
  const payload = JSON.parse(jsonText);
  const document = toDocument(payload, 'sample', 'sample:bundled');
  document.region = region;
  console.log('[Scenario Logic] source=sample', {
    path: 'bundled:src/services/scenario/us-baseline.logic.txt',
    logicVersion: document.logicVersion,
    dataFlowId: document.dataFlowId,
    dataFlowName: document.dataFlowName,
  });
  return document;
};

const normalizeDataflowLogicResponse = (response: any): any => {
  const result = response?.result ?? response;
  if (typeof result === 'string') {
    try {
      return JSON.parse(result);
    } catch {
      const jsonText = unwrapResponseText(result);
      return JSON.parse(jsonText);
    }
  }
  return result;
};

const loadDataflowLogic = async (dataFlowId: string, region: 'US' | 'Canada'): Promise<ScenarioLogicDocument> => {
  const response = await extractDataflowLogic(dataFlowId);
  const payload = normalizeDataflowLogicResponse(response);
  const document = toDocument(payload, 'dataflow', `dataflow:${dataFlowId}`);
  if (!document.region || !['US', 'Canada'].includes(document.region)) {
    document.region = region;
  }
  if (!document.baselineDataflowId) {
    document.baselineDataflowId = String(dataFlowId);
  }
  console.log('[Scenario Logic] source=dataflow', {
    dataflowId,
    logicVersion: document.logicVersion,
    dataFlowName: document.dataFlowName,
  });
  return document;
};

export const loadScenarioLogicDocument = async (params: {
  mode: ScenarioEngineMode;
  region: 'US' | 'Canada';
  dataflowId?: string | null;
}): Promise<ScenarioLogicDocument> => {
  const { mode, region, dataflowId } = params;
  if (mode === 'dataflow' && dataflowId) {
    try {
      return await loadDataflowLogic(dataflowId, region);
    } catch (error) {
      console.warn('[Scenario Logic] dataflow mode failed; falling back to sample logic.', error);
    }
  }
  return loadSampleLogic(region);
};
