const RESPONSE_COLLECTION_KEYS = ['data', 'items', 'results', 'records', 'rows', 'list'];

function isObject(value) {
  return value !== null && typeof value === 'object';
}

function flattenN8nItem(item) {
  if (!item || typeof item !== 'object') {
    return item;
  }

  if (item.json && typeof item.json === 'object' && !Array.isArray(item.json)) {
    return { ...item.json };
  }

  return item;
}

function pruneContainerFields(item) {
  if (!isObject(item)) {
    return item;
  }

  const copy = { ...item };
  delete copy.json;
  delete copy.binary;
  delete copy.pairedItem;
  return copy;
}

const NUMERIC_KEY_PATTERN = /^\d+$/;
const NUMERIC_OBJECT_METADATA_KEYS = new Set(['length']);

function extractNumericArrayLike(value) {
  if (!isObject(value) || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return null;
  }

  const numericEntries = entries.filter(([key]) => NUMERIC_KEY_PATTERN.test(key));
  if (numericEntries.length === 0) {
    return null;
  }

  const sortedNumericEntries = numericEntries.slice().sort((a, b) => Number(a[0]) - Number(b[0]));
  const indices = sortedNumericEntries.map(([key]) => Number(key));

  const startIndex = indices[0];
  const isSequential = indices.every((index, position) => index === startIndex + position);
  if (!isSequential) {
    return null;
  }

  const remainderEntries = entries.filter(([key]) => !NUMERIC_KEY_PATTERN.test(key));
  const remainder = remainderEntries.reduce((acc, [key, entryValue]) => {
    acc[key] = entryValue;
    return acc;
  }, {});

  NUMERIC_OBJECT_METADATA_KEYS.forEach((metaKey) => {
    if (metaKey in remainder) {
      delete remainder[metaKey];
    }
  });

  return {
    values: sortedNumericEntries.map(([, entryValue]) => entryValue),
    remainder,
  };
}

function expandNestedCollections(value) {
  const result = [];
  const queue = [];

  if (Array.isArray(value)) {
    queue.push(...value);
  } else if (value !== undefined) {
    queue.push(value);
  }

  while (queue.length) {
    const current = queue.shift();
    if (current === null || current === undefined) {
      continue;
    }

    if (Array.isArray(current)) {
      for (let i = current.length - 1; i >= 0; i -= 1) {
        queue.unshift(current[i]);
      }
      continue;
    }

    if (!isObject(current)) {
      continue;
    }

    if (current.json && isObject(current.json)) {
      queue.unshift(current.json);
      continue;
    }

    const container = pruneContainerFields(current);

    const arrayLikeContainer = extractNumericArrayLike(container);
    if (arrayLikeContainer) {
      if (Object.keys(arrayLikeContainer.remainder).length > 0) {
        queue.unshift(arrayLikeContainer.remainder);
      }

      for (let i = arrayLikeContainer.values.length - 1; i >= 0; i -= 1) {
        queue.unshift(arrayLikeContainer.values[i]);
      }
      continue;
    }

    const nestedArrays = RESPONSE_COLLECTION_KEYS
      .map((key) => ({ key, value: container[key] }))
      .filter(({ value }) => Array.isArray(value) && value.some((entry) => isObject(entry)));

    const numericCollections = Object.entries(container)
      .map(([key, entryValue]) => {
        const arrayLike = extractNumericArrayLike(entryValue);
        if (!arrayLike) {
          return null;
        }

        return { key, values: arrayLike.values, remainder: arrayLike.remainder };
      })
      .filter(Boolean);

    const hasNestedObject = nestedArrays.length > 0 || numericCollections.length > 0;

    if (hasNestedObject) {
      [...nestedArrays, ...numericCollections].forEach(({ value }) => {
        for (let i = value.length - 1; i >= 0; i -= 1) {
          queue.unshift(value[i]);
        }
      });

      numericCollections.forEach(({ values }) => {
        for (let i = values.length - 1; i >= 0; i -= 1) {
          queue.unshift(values[i]);
        }
      });

      const retained = { ...container };

      nestedArrays.forEach(({ key }) => {
        delete retained[key];
      });

      numericCollections.forEach(({ key, remainder }) => {
        if (Object.keys(remainder).length > 0) {
          retained[key] = remainder;
        } else {
          delete retained[key];
        }
      });

      if (Object.keys(retained).length > 0) {
        queue.unshift(retained);
      }

      continue;
    }

    if ('data' in container && isObject(container.data)) {
      queue.unshift(container.data);
      continue;
    }

    result.push(container);
  }

  return result.map((item) => flattenN8nItem(item));
}

export function ensureArray(value) {
  if (!value) {
    return [];
  }

  return expandNestedCollections(value);
}

export function normalizeRecords(payload) {
  if (payload === undefined || payload === null) {
    return [];
  }

  if (typeof payload !== 'object' && !Array.isArray(payload)) {
    return [];
  }

  return expandNestedCollections(payload);
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
