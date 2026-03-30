// import ryuu from 'ryuu.js';

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

const initDomo = async () => {
  if (!isDomoEnvironment()) {
    isMockMode = true;
    domoInstance = null;
    return;
  }

  if (typeof window !== 'undefined') {
    domoInstance = (window as any).domo || null;
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

const DomoApi = {
  async getEnvironment() {
    const domo = await ensureDomo();
    return domo.get('/domo/environment/v1');
  },
  async getCurrentUser() {
    const domo = await ensureDomo();
    const env = await domo.get('/domo/environment/v1');
    return { ...env, displayName: env.userName };
  },
  async getUser(userId: string) {
    const domo = await ensureDomo();
    return domo.get(`/domo/users/v1/${userId}?includeDetails=true`);
  },
  async getUserGroups(userId: string) {
    const domo = await ensureDomo();
    return domo.get(`/domo/groups/v1/user/${userId}`);
  },
  async getDatasetByAlias(alias: string, options?: any) {
    const domo = await ensureDomo();
    return domo.get(`/data/v1/${alias}`, options);
  },
  async get(path: string, options?: any) {
    const domo = await ensureDomo();
    return domo.get(path, options);
  },
  async post(path: string, data: any, options?: any) {
    const domo = await ensureDomo();
    return domo.post(path, data, options);
  },
  async put(path: string, data: any, options?: any) {
    const domo = await ensureDomo();
    return domo.put(path, data, options);
  },
  async del(path: string) {
    const domo = await ensureDomo();
    return domo.delete(path);
  }
};

export default DomoApi;
