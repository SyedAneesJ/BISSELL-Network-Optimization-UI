import DomoApi from './domoApi';

const BASE_URL = '/domo/datastores/v1';

export const APPDB_COLLECTIONS = {
  comparisons: 'comparision_scenarios',
  notifications: 'notification',
} as const;

export const APPDB_RECORD_TYPES = {
  comparisons: 'comparison-state',
  notifications: 'notification-state',
} as const;

type AppDbDocument = {
  id?: string;
  content?: any;
  createdAt?: string;
  updatedAt?: string;
  __docId?: string;
};

const normalizeDocuments = (documents: unknown): AppDbDocument[] => {
  if (!Array.isArray(documents)) return [];
  return documents
    .map((doc: any) => ({
      ...(doc?.content || doc || {}),
      __docId: doc?.id,
      createdAt: doc?.createdOn || doc?.createdAt || doc?.content?.createdAt,
      updatedAt: doc?.updatedOn || doc?.updatedAt || doc?.content?.updatedAt,
    }))
    .filter(Boolean);
};

const getDocumentTimestamp = (doc: AppDbDocument): number => {
  const ts = String(doc.updatedAt || doc.createdAt || '');
  const parsed = Date.parse(ts);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const listCollectionDocuments = async (collection: string): Promise<AppDbDocument[]> => {
  const response = await DomoApi.get(`${BASE_URL}/collections/${collection}/documents/`);
  return normalizeDocuments(response);
};

export const queryCollectionDocuments = async (collection: string, query: any): Promise<AppDbDocument[]> => {
  const response = await DomoApi.post(`${BASE_URL}/collections/${collection}/documents/query`, query);
  return normalizeDocuments(response);
};

export const createCollectionDocument = async (collection: string, content: any) => {
  return DomoApi.post(`${BASE_URL}/collections/${collection}/documents/`, { content });
};

export const getCollectionDocument = async (collection: string, documentId: string): Promise<AppDbDocument | null> => {
  try {
    const response = await DomoApi.get(`${BASE_URL}/collections/${collection}/documents/${documentId}`);
    return response || null;
  } catch (error) {
    return null;
  }
};

export const updateCollectionDocument = async (collection: string, documentId: string, content: any) => {
  return DomoApi.put(`${BASE_URL}/collections/${collection}/documents/${documentId}`, { content });
};

export const upsertCollectionDocumentByField = async (
  collection: string,
  fieldName: string,
  fieldValue: string,
  content: any,
) => {
  const documents = await listCollectionDocuments(collection);
  const existing = documents
    .filter((doc: any) => String(doc?.[fieldName] ?? '').trim() === String(fieldValue).trim())
    .sort((a, b) => getDocumentTimestamp(b) - getDocumentTimestamp(a))[0];
  if (existing?.__docId) {
    console.log(`[AppDB] ${collection} update`, { fieldName, fieldValue, documentId: existing.__docId });
    return updateCollectionDocument(collection, existing.__docId, content);
  }
  console.log(`[AppDB] ${collection} create`, { fieldName, fieldValue });
  return createCollectionDocument(collection, content);
};

export const loadLatestCollectionRecord = async <T,>(
  collection: string,
  recordType: string,
): Promise<T | null> => {
  try {
    const documents = await listCollectionDocuments(collection);
    const latest = documents
      .filter((doc) => doc && (doc as any).kind === recordType)
      .sort((a, b) => getDocumentTimestamp(b) - getDocumentTimestamp(a))[0];
    const rawPayload = latest?.payload ?? latest?.state ?? latest?.items ?? null;
    if (typeof rawPayload === 'string') {
      try {
        return JSON.parse(rawPayload) as T;
      } catch {
        return rawPayload as T;
      }
    }
    return rawPayload as T | null;
  } catch (error) {
    console.warn(`Failed to load AppDB collection ${collection}`, error);
    return null;
  }
};

export const loadLatestCollectionDocument = async (
  collection: string,
  recordType: string,
): Promise<AppDbDocument | null> => {
  try {
    const documents = await listCollectionDocuments(collection);
    return documents
      .filter((doc) => doc && (doc as any).kind === recordType)
      .sort((a, b) => getDocumentTimestamp(b) - getDocumentTimestamp(a))[0] || null;
  } catch (error) {
    console.warn(`Failed to load AppDB document from ${collection}`, error);
    return null;
  }
};

export const saveCollectionRecord = async <T,>(
  collection: string,
  recordType: string,
  payload: T,
): Promise<void> => {
  const nowIso = new Date().toISOString();
  const existing = await loadLatestCollectionDocument(collection, recordType);
  const documentId = existing?.__docId;
  const content = {
    id: recordType,
    kind: recordType,
    payload: JSON.stringify(payload),
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  if (documentId) {
    console.log(`[AppDB] ${collection} update`, { recordType, documentId });
    await updateCollectionDocument(collection, documentId, content);
    return;
  }

  console.log(`[AppDB] ${collection} create`, { recordType });
  await createCollectionDocument(collection, content);
};
