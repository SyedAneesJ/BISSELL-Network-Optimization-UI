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
  if (decimals > 0) return num.toFixed(decimals);
  return num.toLocaleString('en-US');
};

export const formatDecimalOrNA = (value: unknown, decimals = 2): string => {
  const num = toNumber(value);
  if (num === null) return 'NA';
  return num.toFixed(decimals);
};

export const formatCurrencyOrNA = (value: unknown, decimals = 0): string => {
  const num = toNumber(value);
  if (num === null) return 'NA';
  if (decimals > 0) return `$${num.toFixed(decimals)}`;
  return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

export const formatPercentOrNA = (value: unknown, decimals = 2): string => {
  const num = toNumber(value);
  if (num === null) return 'NA';
  return `${num.toFixed(decimals)}%`;
};
