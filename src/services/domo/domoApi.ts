let domoInstance: any = null;
let isMockMode = true;
let initPromise: Promise<void> | null = null;

const isDomoEnvironment = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  const href = window.location.href;
  return host.includes('domo') || href.includes('domo');
};

const mockDomo = {
  get: async () => ({
    userId: 'mock-user',
    userName: 'Mock User',
    instance: 'mock.domo.com',
    pageId: 'mock-page'
  }),
  post: async (_url: string, data: any) => ({ id: `mock-${Date.now()}`, ...data }),
  put: async (_url: string, data: any) => ({ id: `mock-${Date.now()}`, ...data }),
  delete: async () => ({ success: true })
};

const tryGetEnvironment = async (domo: any, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await domo.get('/domo/environment/v1');
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return false;
};

const getCandidateDomoClients = (): any[] => {
  if (typeof window === 'undefined') return [];
  const candidates: any[] = [];
  const add = (client: any) => {
    if (!client) return;
    if (candidates.includes(client)) return;
    candidates.push(client);
  };
  add((window as any).domo);
  try {
    add((window as any).parent?.domo);
  } catch {
    // Ignore cross-origin frame access errors.
  }
  try {
    add((window as any).top?.domo);
  } catch {
    // Ignore cross-origin frame access errors.
  }
  return candidates;
};

const initDomo = async () => {
  if (!isDomoEnvironment()) {
    isMockMode = true;
    domoInstance = null;
    return;
  }

  if (typeof window !== 'undefined') {
    domoInstance = null;
    const candidates = getCandidateDomoClients();
    for (const candidate of candidates) {
      if (await tryGetEnvironment(candidate, 1)) {
        domoInstance = candidate;
        break;
      }
    }
  }

  const ok = domoInstance && await tryGetEnvironment(domoInstance, 3);
  isMockMode = !ok;

  if (isMockMode) {
    domoInstance = null;
  }
};

const ensureDomo = async () => {
  if (!initPromise) {
    initPromise = initDomo();
  }
  await initPromise;
  return isMockMode || !domoInstance ? mockDomo : domoInstance;
};

const fetchWithSession = async (path: string, method: string, data?: any) => {
  const headers: Record<string, string> = {};
  let body: string | undefined;
  if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }

  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers,
    body,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`${method} ${path} failed: ${response.status} ${response.statusText} ${errText}`.trim());
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const DomoApi = {
  async getEnvironment() {
    const domo = await ensureDomo();
    if (!isDomoEnvironment()) {
      return domo.get('/domo/environment/v1');
    }
    if (!isMockMode && domoInstance) {
      return domo.get('/domo/environment/v1');
    }
    return fetchWithSession('/domo/environment/v1', 'GET');
  },
  async getCurrentUser() {
    const env = await this.getEnvironment();
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const emailFromQuery = params?.get('userEmail') || undefined;
    const userId = env?.userId ? String(env.userId) : '';
    let userDetail: any = null;

    if (userId) {
      try {
        userDetail = await this.getUser(userId);
      } catch {
        userDetail = null;
      }
    }

    const displayName = String(
      env?.userName ||
      userDetail?.displayName ||
      userDetail?.name ||
      ''
    ).trim();

    const userEmail = String(
      env?.userEmail ||
      userDetail?.emailAddress ||
      userDetail?.email ||
      userDetail?.detail?.email ||
      emailFromQuery ||
      ''
    ).trim();

    return {
      ...env,
      ...(userDetail || {}),
      displayName: displayName || env?.userName || 'User',
      userEmail: userEmail || undefined,
    };
  },
  async getUser(userId: string) {
    const domo = await ensureDomo();
    if (isDomoEnvironment() && (isMockMode || !domoInstance)) {
      return fetchWithSession(`/domo/users/v1/${userId}?includeDetails=true`, 'GET');
    }
    return domo.get(`/domo/users/v1/${userId}?includeDetails=true`);
  },
  async getUserGroups(userId: string) {
    const domo = await ensureDomo();
    if (isDomoEnvironment() && (isMockMode || !domoInstance)) {
      return fetchWithSession(`/domo/groups/v1/user/${userId}`, 'GET');
    }
    return domo.get(`/domo/groups/v1/user/${userId}`);
  },
  async getDatasetByAlias(alias: string, options?: any) {
    const domo = await ensureDomo();
    if (isDomoEnvironment() && (isMockMode || !domoInstance)) {
      return fetchWithSession(`/data/v1/${alias}`, 'GET');
    }
    return domo.get(`/data/v1/${alias}`, options);
  },
  async get(path: string, options?: any) {
    const domo = await ensureDomo();
    if (isDomoEnvironment() && (isMockMode || !domoInstance)) {
      return fetchWithSession(path, 'GET');
    }
    return domo.get(path, options);
  },
  async post(path: string, data: any, options?: any) {
    const domo = await ensureDomo();
    if (isDomoEnvironment() && (isMockMode || !domoInstance)) {
      return fetchWithSession(path, 'POST', data);
    }
    return domo.post(path, data, options);
  },
  async put(path: string, data: any, options?: any) {
    const domo = await ensureDomo();
    if (isDomoEnvironment() && (isMockMode || !domoInstance)) {
      return fetchWithSession(path, 'PUT', data);
    }
    return domo.put(path, data, options);
  },
  async del(path: string) {
    const domo = await ensureDomo();
    if (isDomoEnvironment() && (isMockMode || !domoInstance)) {
      return fetchWithSession(path, 'DELETE');
    }
    return domo.delete(path);
  }
};

export default DomoApi;
