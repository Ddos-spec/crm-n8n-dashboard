import { writable, derived } from 'svelte/store';
import { createQueryStore } from './queryStore';
import { getJson } from '$lib/utils/api';
import type { CustomerRecord, ListResponse } from '$lib/types/api';

const customersQuery = createQueryStore(() => getJson<ListResponse<CustomerRecord>>('customersList'));

const filterTerm = writable('');

const filteredCustomers = derived([customersQuery, filterTerm], ([$state, $term]) => {
  if ($state.status !== 'success' || !$state.data) {
    return [] as CustomerRecord[];
  }

  if (!$term) {
    return $state.data.items;
  }

  const lowered = $term.toLowerCase();
  return $state.data.items.filter((item) =>
    [item.name, item.status, item.phone, item.next_action]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(lowered))
  );
});

export const customersStore = {
  ...customersQuery,
  filterTerm: {
    subscribe: filterTerm.subscribe,
    set: filterTerm.set
  },
  filtered: filteredCustomers
};
