export const isMissing = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  return false;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').replace(/%/g, '').trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const formatTextOrNA = (value: unknown): string =>
  isMissing(value) ? 'NA' : String(value);

export const formatNumberOrNA = (value: unknown, decimals = 0): string => {
  const num = toNumber(value);
  if (num === null) return 'NA';
  if (decimals > 0) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return num.toLocaleString('en-US');
};

export const formatDecimalOrNA = (value: unknown, decimals = 2): string => {
  const num = toNumber(value);
  if (num === null) return 'NA';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatCurrencyOrNA = (value: unknown, decimals = 0): string => {
  const num = toNumber(value);
  if (num === null) return 'NA';
  if (decimals > 0) {
    return `$${num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
  return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

export const formatPercentOrNA = (value: unknown, decimals = 2): string => {
  const num = toNumber(value);
  if (num === null) return 'NA';
  return `${num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
};

export const normalizeZip3 = (zip: string | number | null | undefined): string => {
  const str = String(zip ?? '').trim();
  if (/^\d+$/.test(str)) {
    return str.padStart(3, '0');
  }
  return str.toLowerCase();
};

export const normalizeWarehouseName = (name: string | null | undefined): string => {
  let cleaned = String(name ?? '').trim().toLowerCase();
  // Strip common suffixes/prefixes like ' dc', ' whse', ' warehouse', 'r '
  cleaned = cleaned.replace(/\bdc\b/g, '');
  cleaned = cleaned.replace(/\bwhse\b/g, '');
  cleaned = cleaned.replace(/\bwarehouse\b/g, '');
  cleaned = cleaned.replace(/\br\b/g, '');
  // Remove non-alphanumeric characters
  cleaned = cleaned.replace(/[^a-z0-9]+/g, '');
  return cleaned;
};
