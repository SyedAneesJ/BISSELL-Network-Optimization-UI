import DomoApi from './domoApi';

export const startWorkflow = async (workflowAlias: string, body: Record<string, any>) => {
  const encoded = encodeURIComponent(workflowAlias);
  return DomoApi.post(`/domo/workflow/v1/models/${encoded}/start`, body);
};

export const startWorkflowWithFallback = async (
  workflowAliases: string[],
  body: Record<string, any>
) => {
  let lastError: unknown = null;
  const tried: string[] = [];
  for (const alias of workflowAliases) {
    try {
      tried.push(alias);
      return await startWorkflow(alias, body);
    } catch (error) {
      lastError = error;
    }
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Workflow start failed. Tried aliases: ${tried.join(', ')}. Last error: ${detail}`);
};
