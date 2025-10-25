import { derived } from 'svelte/store';
import { createQueryStore } from './queryStore';
import { getJson } from '$lib/utils/api';
import type { QuickStatsResponse } from '$lib/types/api';

const rawStatsStore = createQueryStore(() => getJson<QuickStatsResponse>('quickStats'), { immediate: false });

export const statsStore = {
  ...rawStatsStore,
  summary: derived(rawStatsStore, ($state) => {
    if ($state.status !== 'success' || !$state.data) {
      return null;
    }

    const { total_customers, total_leads, open_escalations, response_rate } = $state.data;
    return [
      {
        id: 'totalCustomers',
        label: 'Total Customers',
        value: total_customers.toLocaleString('id-ID')
      },
      {
        id: 'totalLeads',
        label: 'Total Leads',
        value: total_leads.toLocaleString('id-ID')
      },
      {
        id: 'openEscalations',
        label: 'Open Escalations',
        value: open_escalations.toLocaleString('id-ID')
      },
      {
        id: 'responseRate',
        label: 'Response Rate',
        value: `${(response_rate * 100).toFixed(1)}%`
      }
    ] as const;
  })
};
