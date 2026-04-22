import DomoApi from './domoApi';

const NOTIFICATIONS_PACKAGE_ID = '03ba6971-98d0-4654-9bfd-aa897816df33';
const SEND_EMAIL_ENDPOINTS = [
  `/domo/codeengine/v2/packages/sendEmail`,
  `/domo/codeengine/v2/packages/${NOTIFICATIONS_PACKAGE_ID}/versions/1.0.0/functions/sendEmail`,
  `/domo/codeengine/v2/packages/${NOTIFICATIONS_PACKAGE_ID}/versions/1.0.1/functions/sendEmail`,
  `/domo/codeengine/v2/packages/${NOTIFICATIONS_PACKAGE_ID}/versions/2.1.13/functions/sendEmail`,
] as const;

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

const callPostWithFallback = async (endpoints: readonly string[], payload: any) => {
  let lastError: unknown = null;
  const tried: string[] = [];
  for (const endpoint of endpoints) {
    try {
      tried.push(endpoint);
      const response = await DomoApi.post(endpoint, payload);
      return parsePackageResult(response);
    } catch (error) {
      lastError = error;
    }
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Code Engine notifications call failed. Tried: ${tried.join(', ')}. Last error: ${detail}`);
};

export interface SendEmailParams {
  recipientEmails: string;
  subject: string;
  body: string;
  personRecipients?: string[];
  groupRecipients?: string[];
  attachments?: number[];
  attachment?: number;
  includeReplyAll?: boolean;
}

export const sendCodeEngineEmail = async (params: SendEmailParams) => {
  const payload = {
    recipientEmails: params.recipientEmails,
    subject: params.subject,
    body: params.body,
    personRecipients: params.personRecipients || [],
    groupRecipients: params.groupRecipients || [],
    attachments: params.attachments || [],
    attachment: params.attachment,
    includeReplyAll: !!params.includeReplyAll,
  };
  return callPostWithFallback(SEND_EMAIL_ENDPOINTS, payload);
};
