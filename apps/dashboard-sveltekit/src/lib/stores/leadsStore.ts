import { writable, derived } from 'svelte/store';
import { createQueryStore } from './queryStore';
import { getJson } from '$lib/utils/api';
import type { LeadRecord, ListResponse } from '$lib/types/api';

const leadsQuery = createQueryStore(() => getJson<ListResponse<LeadRecord>>('leadsList'));

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
