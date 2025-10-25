import { derived } from 'svelte/store';
import { createQueryStore } from './queryStore';
import { getJson } from '$lib/utils/api';
import type { QuickStatsResponse } from '$lib/types/api';

export interface StatSummaryCard {
  id: 'totalCustomers' | 'totalLeads' | 'openEscalations' | 'responseRate';
  label: string;
  value: string;
  delta: number | null;
  period: string | null;
  accent: 'sky' | 'cyan' | 'amber' | 'emerald';
  inverse?: boolean;
}

const numberFormatter = new Intl.NumberFormat('id-ID');

function parseDelta(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parsePeriod(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return fallback;
}

function normalizeResponseRate(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  if (value <= 1) {
    return value * 100;
  }
  return value;
}

const rawStatsStore = createQueryStore(() => getJson<QuickStatsResponse>('quickStats'), { immediate: false });

export const statsStore = {
  ...rawStatsStore,
  summary: derived(rawStatsStore, ($state): StatSummaryCard[] | null => {
    if ($state.status !== 'success' || !$state.data) {
      return null;
    }

    const stats = $state.data;
    const responseRate = normalizeResponseRate(stats.response_rate);

    return [
      {
        id: 'totalCustomers',
        label: 'Total Customers',
        value: numberFormatter.format(stats.total_customers ?? 0),
        delta: parseDelta((stats as Record<string, unknown>).customers_delta ?? (stats as Record<string, unknown>).customersDelta),
        period: parsePeriod((stats as Record<string, unknown>).customers_period ?? (stats as Record<string, unknown>).customersPeriod ?? null, 'vs minggu lalu'),
        accent: 'sky'
      },
      {
        id: 'totalLeads',
        label: 'Total Leads',
        value: numberFormatter.format(stats.total_leads ?? 0),
        delta: parseDelta((stats as Record<string, unknown>).leads_delta ?? (stats as Record<string, unknown>).leadsDelta),
        period: parsePeriod((stats as Record<string, unknown>).leads_period ?? (stats as Record<string, unknown>).leadsPeriod ?? null, 'vs minggu lalu'),
        accent: 'cyan'
      },
      {
        id: 'openEscalations',
        label: 'Open Escalations',
        value: numberFormatter.format(stats.open_escalations ?? 0),
        delta: parseDelta((stats as Record<string, unknown>).escalations_delta ?? (stats as Record<string, unknown>).escalationsDelta),
        period: parsePeriod((stats as Record<string, unknown>).escalations_period ?? (stats as Record<string, unknown>).escalationsPeriod ?? null, 'vs minggu lalu'),
        accent: 'amber',
        inverse: true
      },
      {
        id: 'responseRate',
        label: 'Response Rate',
        value: `${responseRate.toFixed(1)}%`,
        delta: parseDelta((stats as Record<string, unknown>).response_delta ?? (stats as Record<string, unknown>).responseDelta),
        period: parsePeriod((stats as Record<string, unknown>).response_period ?? (stats as Record<string, unknown>).responsePeriod ?? null, 'SLA realtime'),
        accent: 'emerald'
      }
    ];
  }),
  updatedAt: derived(rawStatsStore, ($state) => {
    if ($state.status !== 'success' || !$state.data?.updated_at) {
      return null;
    }

    const updatedAt = new Date($state.data.updated_at);
    return Number.isNaN(updatedAt.getTime()) ? null : updatedAt;
  })
};
