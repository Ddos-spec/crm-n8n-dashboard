const RESPONSE_COLLECTION_KEYS = ['data', 'items', 'results', 'records', 'rows', 'list'];

function flattenN8nItem(item) {
  if (!item || typeof item !== 'object') {
    return item;
  }

  if (item.json && typeof item.json === 'object' && !Array.isArray(item.json)) {
    return { ...item.json };
  }

  return item;
}

function collectFromObject(value, collector) {
  if (!value || typeof value !== 'object') {
    return;
  }

  for (const key of RESPONSE_COLLECTION_KEYS) {
    if (Array.isArray(value[key])) {
      value[key].forEach((nested) => collector(nested));
      return;
    }
  }

  // Handle wrapped single-record payloads like { success: true, data: { ... } }
  if ('data' in value && value.data && typeof value.data === 'object' && !Array.isArray(value.data)) {
    collector(value.data);
    return;
  }

  // Fallback: treat object itself as a record
  collector(value);
}

export function ensureArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => flattenN8nItem(item));
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const collected = [];
  const collector = (item) => {
    if (!item) return;
    if (Array.isArray(item)) {
      item.forEach((nested) => collector(nested));
      return;
    }
    if (typeof item !== 'object') {
      return;
    }
    if (item.json && typeof item.json === 'object' && !Array.isArray(item.json)) {
      collected.push({ ...item.json });
      return;
    }
    collected.push(item);
  };

  collectFromObject(value, collector);

  return collected.map((item) => flattenN8nItem(item));
}

export function normalizeRecords(payload) {
  if (payload === undefined || payload === null) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => flattenN8nItem(item));
  }

  if (typeof payload !== 'object') {
    return [];
  }

  const collected = [];
  const queue = [payload];

  while (queue.length) {
    const current = queue.shift();
    if (current === null || current === undefined) {
      continue;
    }

    if (Array.isArray(current)) {
      current.forEach((item) => queue.push(item));
      continue;
    }

    if (typeof current !== 'object') {
      continue;
    }

    if (current.json && typeof current.json === 'object' && !Array.isArray(current.json)) {
      collected.push({ ...current.json });
      continue;
    }

    const collectionKey = RESPONSE_COLLECTION_KEYS.find((key) => Array.isArray(current[key]));
    if (collectionKey) {
      queue.push(current[collectionKey]);
      continue;
    }

    if ('data' in current) {
      queue.push(current.data);
      const remainingKeys = RESPONSE_COLLECTION_KEYS.filter((key) => key !== 'data' && key in current);
      for (const key of remainingKeys) {
        queue.push(current[key]);
      }
      continue;
    }

    collected.push(current);
  }

  return collected.map((item) => flattenN8nItem(item));
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
