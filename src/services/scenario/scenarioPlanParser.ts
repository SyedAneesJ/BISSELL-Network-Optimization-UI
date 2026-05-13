import type { ScenarioExecutionPlan, ScenarioLogicDocument } from './scenarioLogicTypes';

const normalizeList = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));

const extractQuotedValues = (expression: string): string[] => {
  const match = expression.match(/IN\s*\(([^)]+)\)/i);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((part) => part.trim().replace(/^['"`]/, '').replace(/['"`]$/, ''))
    .filter(Boolean);
};

const findDcFilters = (node: any): { allowed: string[]; suppressed: string[]; sourceFilter: string | null } => {
  const allowed: string[] = [];
  const suppressed: string[] = [];
  let sourceFilter: string | null = null;

  const visit = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== 'object') return;

    if (typeof value.expression === 'string') {
      const expr = value.expression;
      const exprLower = expr.toLowerCase();
      if (exprLower.includes('costing warehouse') || exprLower.includes('warehouse')) {
        sourceFilter = expr;
        extractQuotedValues(expr).forEach((item) => allowed.push(item));
      }
    }

    if (typeof value.leftField === 'string' && typeof value.operator === 'string') {
      const leftLower = value.leftField.toLowerCase();
      if (leftLower.includes('costing warehouse') || leftLower === 'warehouse' || leftLower.includes('warehouse')) {
        sourceFilter = sourceFilter || `${value.leftField} ${value.operator}`;
        const rightValue = value.rightValue?.value ?? value.rightValue;
        if (Array.isArray(rightValue)) {
          rightValue.forEach((item) => allowed.push(String(item)));
        } else if (rightValue !== undefined && rightValue !== null && String(rightValue).trim()) {
          if (String(value.operator).toUpperCase() === 'NE') {
            suppressed.push(String(rightValue));
          } else {
            allowed.push(String(rightValue));
          }
        }
      }
    }

    Object.values(value).forEach(visit);
  };

  visit(node);
  return {
    allowed: normalizeList(allowed),
    suppressed: normalizeList(suppressed),
    sourceFilter,
  };
};

const extractScenarioType = (nodes: any[], fallback: string): string => {
  for (const node of nodes) {
    if (node?.type !== 'Constant') continue;
    const fields = Array.isArray(node.fields) ? node.fields : [];
    for (const field of fields) {
      if (String(field?.name || '').toLowerCase() === 'scenariotype' && String(field?.value || '').trim()) {
        return String(field.value).trim();
      }
    }
  }
  return fallback;
};

const extractOutputDefinitions = (nodes: any[]): string[] =>
  normalizeList(
    nodes
      .filter((node) => String(node?.type || '').toLowerCase() === 'publishtovault')
      .map((node) => String(node?.name || node?.dataSource?.name || '').trim())
  );

const extractRankRules = (nodes: any[]): string[] => {
  const rules: string[] = ['CostPerUnit ASC', 'Costing Warehouse ASC', 'Default Ship From ASC', '3-zip ASC'];
  nodes.forEach((node) => {
    if (String(node?.type || '').toLowerCase() === 'sql') {
      rules.push('SQL');
    }
  });
  return normalizeList(rules);
};

export const parseScenarioLogicDocument = (document: ScenarioLogicDocument): ScenarioExecutionPlan => {
  const nodes = Array.isArray(document.nodes) ? document.nodes : [];
  const dcFilters = findDcFilters(nodes);
  const scenarioType = extractScenarioType(nodes, document.scenarioType || 'Baseline');
  const outputDefinitions = extractOutputDefinitions(nodes);

  return {
    mode: document.source,
    logicVersion: document.logicVersion || '1.0',
    scenarioType,
    region: document.region,
    baselineScenarioKey: document.baselineScenarioKey || scenarioType,
    baselineDataflowId: document.baselineDataflowId || '',
    allowedDcs: dcFilters.allowed,
    suppressedDcs: dcFilters.suppressed,
    inputDatasets: document.inputDatasets,
    outputDefinitions: outputDefinitions.length > 0 ? outputDefinitions : document.outputDefinitions,
    rankRules: document.rankRules.length > 0 ? document.rankRules : extractRankRules(nodes),
    sourceLabel: document.sourceLabel,
    nodeCount: nodes.length,
    edgeCount: Array.isArray(document.edges) ? document.edges.length : 0,
    warnings: document.warnings.concat(dcFilters.allowed.length === 0 ? ['No DC filter could be derived from logic.'] : []),
  };
};
