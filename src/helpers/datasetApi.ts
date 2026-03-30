const normalizeDatasetId = (datasetId: any) => {
    if (typeof datasetId === 'string') return datasetId;
    if (datasetId && typeof datasetId === 'object') {
      if (typeof datasetId.id === 'string') return datasetId.id;
      if (typeof datasetId.datasetId === 'string') return datasetId.datasetId;
    }
    return String(datasetId);
  };
  
  const DatasetApi = {
    async fetchAccessToken() {
      const clientId = import.meta.env.VITE_DOMO_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_DOMO_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error('Missing VITE_DOMO_CLIENT_ID or VITE_DOMO_CLIENT_SECRET');
      }
  
      const auth = btoa(`${clientId}:${clientSecret}`);
      const response = await fetch('https://api.domo.com/oauth/token?grant_type=client_credentials', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
  
      if (!response.ok) {
        throw new Error(`OAuth failed: ${response.status}`);
      }
  
      const data = await response.json();
      return data.access_token as string;
    },
  
    async createDataset({ name, description, schema, token }: any) {
      const response = await fetch('https://api.domo.com/v1/datasets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description, schema })
      });
  
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Create dataset failed: ${response.status} ${err}`);
      }
  
      return response.json();
    },
  
    async uploadCsvData(datasetId: string, csvText: string, token: string) {
      const id = normalizeDatasetId(datasetId);
      const response = await fetch(`https://api.domo.com/v1/datasets/${id}/data`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/csv'
        },
        body: csvText
      });
  
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Upload failed: ${response.status} ${err}`);
      }
  
      return true;
    },
  
    async getDataset(datasetId: string, token: string) {
      const id = normalizeDatasetId(datasetId);
      const response = await fetch(`https://api.domo.com/v1/datasets/${id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
  
      if (!response.ok) {
        throw new Error(`Get dataset failed: ${response.status}`);
      }
  
      return response.json();
    },
  
  async getDatasetDataCsv(datasetId: string, token: string, limit = 10, offset = 0) {
      const id = normalizeDatasetId(datasetId);
      const url = `https://api.domo.com/v1/datasets/${id}/data?includeHeader=true&limit=${limit}&offset=${offset}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/csv'
        }
      });
  
      if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`Get dataset data failed: ${response.status} ${err}`);
      }
  
    return response.text();
  }
  };

  const parseCsv = (csvText: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const next = csvText[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i++;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') i++;
        row.push(current);
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
        current = '';
        continue;
      }

      current += char;
    }

    if (current.length > 0 || row.length > 0) {
      row.push(current);
      rows.push(row);
    }

    return rows;
  };

  const csvToObjects = (csvText: string): Array<Record<string, string>> => {
    const rows = parseCsv(csvText);
    if (rows.length === 0) return [];
    const headers = rows[0].map((h) => h.trim());
    return rows.slice(1).map((cells) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, idx) => {
        obj[header] = (cells[idx] ?? '').trim();
      });
      return obj;
    });
  };

  export const DatasetApiHelpers = {
    parseCsv,
    csvToObjects,
  };
  
  export default DatasetApi;
  
