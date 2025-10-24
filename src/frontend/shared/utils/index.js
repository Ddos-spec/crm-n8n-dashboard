export function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.records)) return value.records;

  return Object.values(value).reduce((acc, item) => {
    if (Array.isArray(item)) {
      acc.push(...item);
    } else if (item && typeof item === 'object') {
      acc.push(item);
    }
    return acc;
  }, []);
}

export function parseNumeric(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function formatNumber(value, locale = 'id-ID') {
  return new Intl.NumberFormat(locale).format(value || 0);
}

export function capitalize(value) {
  if (typeof value !== 'string') return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function extractUnique(collection, key) {
  if (!Array.isArray(collection)) {
    return [];
  }
  const seen = new Set();
  collection.forEach((item) => {
    const value = item?.[key];
    if (value) {
      seen.add(value);
    }
  });
  return Array.from(seen);
}
