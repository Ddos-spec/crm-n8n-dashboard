import { writable, derived } from 'svelte/store';
import { createQueryStore } from './queryStore';
import { postActionJson } from '$lib/utils/api';
import { normalizeListResponse } from '$lib/utils/n8n';
import type { EscalationRecord, ListResponse } from '$lib/types/api';

const escalationsQuery = createQueryStore(async () => {
  const response = await postActionJson<unknown>('escalationsList', 'get_escalations');
  return normalizeListResponse<EscalationRecord>(response);
});

const filterTerm = writable('');

const filteredEscalations = derived([escalationsQuery, filterTerm], ([$state, $term]) => {
  if ($state.status !== 'success' || !$state.data) {
    return [] as EscalationRecord[];
  }

  if (!$term) {
    return $state.data.items;
  }

  const lowered = $term.toLowerCase();
  return $state.data.items.filter((item) =>
    [item.customer_name, item.reason, item.priority, item.assigned_to]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(lowered))
  );
});

export const escalationsStore = {
  ...escalationsQuery,
  filterTerm: {
    subscribe: filterTerm.subscribe,
    set: filterTerm.set
  },
  filtered: filteredEscalations
};
