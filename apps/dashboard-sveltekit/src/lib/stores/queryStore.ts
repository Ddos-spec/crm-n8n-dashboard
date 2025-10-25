import { writable, type Readable } from 'svelte/store';

export interface QueryState<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: T | null;
  error: string | null;
  lastUpdated?: number;
}

export interface QueryControls<T> extends Readable<QueryState<T>> {
  refresh: () => Promise<void>;
}

export function createQueryStore<T>(loader: () => Promise<T>, options: { immediate?: boolean } = {}): QueryControls<T> {
  const { subscribe, set, update } = writable<QueryState<T>>({ status: 'idle', data: null, error: null });

  async function refresh() {
    update((state) => ({ ...state, status: 'loading', error: null }));
    try {
      const data = await loader();
      set({ status: 'success', data, error: null, lastUpdated: Date.now() });
    } catch (error) {
      set({ status: 'error', data: null, error: (error as Error).message });
    }
  }

  if (options.immediate) {
    void refresh();
  }

  return {
    subscribe,
    refresh
  };
}
