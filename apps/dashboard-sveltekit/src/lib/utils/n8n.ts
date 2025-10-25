const RESPONSE_COLLECTION_KEYS = ['data', 'items', 'results', 'records', 'rows', 'list'] as const;
const NUMERIC_OBJECT_METADATA_KEYS = new Set(['length']);
const NUMERIC_KEY_PATTERN = /^\d+$/;

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function flattenN8nItem(item: PlainObject): PlainObject {
  if ('json' in item && isPlainObject(item.json)) {
    return { ...item.json };
  }
  return item;
}

function pruneContainerFields(item: PlainObject): PlainObject {
  const copy: PlainObject = { ...item };
  delete copy.json;
  delete copy.binary;
  delete copy.pairedItem;
  return copy;
}

function extractNumericArrayLike(value: unknown): { values: unknown[]; remainder: PlainObject } | null {
  if (!isPlainObject(value)) {
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
  const remainder: PlainObject = {};
  remainderEntries.forEach(([key, entryValue]) => {
    remainder[key] = entryValue;
  });

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

function expandNestedCollections(value: unknown): PlainObject[] {
  const result: PlainObject[] = [];
  const queue: unknown[] = [];

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

    if (!isPlainObject(current)) {
      continue;
    }

    if ('json' in current && isPlainObject(current.json)) {
      queue.unshift(current.json);
      continue;
    }

    const container = pruneContainerFields(current);

    const arrayLike = extractNumericArrayLike(container);
    if (arrayLike) {
      if (Object.keys(arrayLike.remainder).length > 0) {
        queue.unshift(arrayLike.remainder);
      }
      for (let i = arrayLike.values.length - 1; i >= 0; i -= 1) {
        queue.unshift(arrayLike.values[i]);
      }
      continue;
    }

    const nestedArrays = RESPONSE_COLLECTION_KEYS
      .map((key) => ({ key, value: container[key] }))
      .filter(({ value }) => Array.isArray(value) && value.some((entry) => isPlainObject(entry)));

    const numericCollections = Object.entries(container)
      .map(([key, entryValue]) => {
        const arrayLikeEntry = extractNumericArrayLike(entryValue);
        if (!arrayLikeEntry) {
          return null;
        }
        return { key, values: arrayLikeEntry.values, remainder: arrayLikeEntry.remainder };
      })
      .filter((entry): entry is { key: string; values: unknown[]; remainder: PlainObject } => Boolean(entry));

    const hasNestedObject = nestedArrays.length > 0 || numericCollections.length > 0;

    if (hasNestedObject) {
      nestedArrays.forEach(({ value }) => {
        for (let i = value.length - 1; i >= 0; i -= 1) {
          queue.unshift(value[i]);
        }
      });

      numericCollections.forEach(({ values }) => {
        for (let i = values.length - 1; i >= 0; i -= 1) {
          queue.unshift(values[i]);
        }
      });

      const retained: PlainObject = { ...container };

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

    if ('data' in container && isPlainObject(container.data)) {
      queue.unshift(container.data);
      continue;
    }

    result.push(container);
  }

  return result.map((item) => flattenN8nItem(item));
}

export function normalizeRecords<T = PlainObject>(payload: unknown): T[] {
  return expandNestedCollections(payload).map((item) => item as unknown as T);
}

function findListResponseCandidate<T>(payload: unknown): (PlainObject & { items: unknown[] }) | null {
  const queue: unknown[] = [];

  if (payload !== undefined) {
    queue.push(payload);
  }

  while (queue.length) {
    const current = queue.shift();
    if (current === null || current === undefined) {
      continue;
    }

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (!isPlainObject(current)) {
      continue;
    }

    if (Array.isArray(current.items)) {
      return current as PlainObject & { items: unknown[] };
    }

    if ('json' in current && isPlainObject(current.json)) {
      queue.push(current.json);
    }

    if ('data' in current && current.data !== undefined) {
      queue.push(current.data);
    }

    RESPONSE_COLLECTION_KEYS.forEach((key) => {
      const value = current[key];
      if (value !== undefined) {
        queue.push(value);
      }
    });
  }

  return null;
}

export interface NormalizedList<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export function normalizeListResponse<T>(payload: unknown): NormalizedList<T> {
  const candidate = findListResponseCandidate<T>(payload);

  if (candidate) {
    const rawItems = candidate.items.flatMap((item) => normalizeRecords<T>(item));
    const items = rawItems.length > 0 ? rawItems : (candidate.items as T[]);
    const total = typeof candidate.total === 'number' ? candidate.total : items.length;
    const page = typeof candidate.page === 'number' ? candidate.page : 1;
    const pageSize = typeof candidate.page_size === 'number' ? candidate.page_size : items.length;

    return {
      items,
      total,
      page,
      page_size: pageSize,
    };
  }

  const items = normalizeRecords<T>(payload);
  return {
    items,
    total: items.length,
    page: 1,
    page_size: items.length,
  };
}

export function extractPrimaryRecord<T>(payload: unknown): T | null {
  const candidates = normalizeRecords<T>(payload);
  if (candidates.length > 0) {
    return candidates[0];
  }

  if (isPlainObject(payload)) {
    const data = payload.data;
    if (isPlainObject(data)) {
      return data as unknown as T;
    }

    return payload as unknown as T;
  }

  return null;
}
