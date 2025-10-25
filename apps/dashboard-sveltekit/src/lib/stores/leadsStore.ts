import { writable, derived } from 'svelte/store';
import { createQueryStore } from './queryStore';
import { postActionJson } from '$lib/utils/api';
import { normalizeListResponse } from '$lib/utils/n8n';
import type { LeadRecord, ListResponse } from '$lib/types/api';

const leadsQuery = createQueryStore(async () => {
  const response = await postActionJson<unknown>('leadsList', 'get_leads');
  return normalizeListResponse<LeadRecord>(response);
});

const filterTerm = writable('');

const filteredLeads = derived([leadsQuery, filterTerm], ([$state, $term]) => {
  if ($state.status !== 'success' || !$state.data) {
    return [] as LeadRecord[];
  }

  if (!$term) {
    return $state.data.items;
  }

  const lowered = $term.toLowerCase();
  return $state.data.items.filter((item) =>
    [item.name, item.source, item.phone, item.status]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(lowered))
  );
});

export const leadsStore = {
  ...leadsQuery,
  filterTerm: {
    subscribe: filterTerm.subscribe,
    set: filterTerm.set
  },
  filtered: filteredLeads
};
