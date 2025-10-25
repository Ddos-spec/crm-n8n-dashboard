import { derived } from 'svelte/store';
import { createQueryStore } from './queryStore';
import { postActionJson } from '$lib/utils/api';
import { extractPrimaryRecord } from '$lib/utils/n8n';
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

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      const sanitized = trimmed.replace(/[\s,%]+/g, '').replace(',', '.');
      const parsed = Number.parseFloat(sanitized);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
}

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
  const numeric = parseNumber(value, 0);
  if (numeric <= 1) {
    return numeric * 100;
  }
  return numeric;
}

const rawStatsStore = createQueryStore(async () => {
  const response = await postActionJson<unknown>('quickStats', 'get_quick_stats');
  const stats = extractPrimaryRecord<QuickStatsResponse>(response);

  if (!stats) {
    throw new Error('Respon statistik tidak valid.');
  }

  return stats;
}, { immediate: false });

export const statsStore = {
  ...rawStatsStore,
  summary: derived(rawStatsStore, ($state): StatSummaryCard[] | null => {
    if ($state.status !== 'success' || !$state.data) {
      return null;
    }

    const stats = $state.data;
    const statsRecord = stats as Record<string, unknown>;

    const totalCustomers = parseNumber(stats.total_customers ?? statsRecord.totalCustomers ?? null, 0);
    const totalLeads = parseNumber(stats.total_leads ?? statsRecord.totalLeads ?? null, 0);
    const openEscalations = parseNumber(
      stats.open_escalations ?? statsRecord.openEscalations ?? statsRecord.pendingEscalations ?? null,
      0
    );
    const responseRate = normalizeResponseRate(stats.response_rate ?? statsRecord.responseRate ?? null);

    return [
      {
        id: 'totalCustomers',
        label: 'Total Customers',
        value: numberFormatter.format(totalCustomers),
        delta: parseDelta(statsRecord.customers_delta ?? statsRecord.customersDelta),
        period: parsePeriod(statsRecord.customers_period ?? statsRecord.customersPeriod ?? null, 'vs minggu lalu'),
        accent: 'sky'
      },
      {
        id: 'totalLeads',
        label: 'Total Leads',
        value: numberFormatter.format(totalLeads),
        delta: parseDelta(statsRecord.leads_delta ?? statsRecord.leadsDelta),
        period: parsePeriod(statsRecord.leads_period ?? statsRecord.leadsPeriod ?? null, 'vs minggu lalu'),
        accent: 'cyan'
      },
      {
        id: 'openEscalations',
        label: 'Open Escalations',
        value: numberFormatter.format(openEscalations),
        delta: parseDelta(statsRecord.escalations_delta ?? statsRecord.escalationsDelta),
        period: parsePeriod(statsRecord.escalations_period ?? statsRecord.escalationsPeriod ?? null, 'vs minggu lalu'),
        accent: 'amber',
        inverse: true
      },
      {
        id: 'responseRate',
        label: 'Response Rate',
        value: `${responseRate.toFixed(1)}%`,
        delta: parseDelta(statsRecord.response_delta ?? statsRecord.responseDelta),
        period: parsePeriod(statsRecord.response_period ?? statsRecord.responsePeriod ?? null, 'SLA realtime'),
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
