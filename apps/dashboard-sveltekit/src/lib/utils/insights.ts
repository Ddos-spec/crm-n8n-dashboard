import type {
  QuickStatsResponse,
  CustomerRecord,
  LeadRecord,
  EscalationRecord,
  TrendPointInput,
  FunnelData,
  TeamPerformanceEntry,
  CsatSummary,
  BusinessRecord
} from '$lib/types/api';

export interface SparklinePoint {
  label: string;
  value: number;
}

export interface SparklineSeriesMap {
  customers: SparklinePoint[];
  leads: SparklinePoint[];
  escalations: SparklinePoint[];
  responseRate: SparklinePoint[];
}

export interface ResponseTrend {
  labels: string[];
  values: number[];
  hasData: boolean;
  averageLabel: string | null;
}

export interface EscalationBreakdown {
  open: number;
  pending: number;
  resolved: number;
  total: number;
}

export interface FunnelRow {
  key: string;
  label: string;
  count: number;
  statuses: string[];
}

export interface ActivityItem {
  title: string;
  detail: string;
  timestamp: string | null;
}

export interface NotificationItem {
  title: string;
  detail: string;
  priority: string;
}

export interface LeaderboardEntry {
  name: string;
  handled: number;
  sla: string;
  score: string;
}

export interface CsatInsight {
  score: string | null;
  summary: string | null;
  trend: string | null;
  sentiment: string | null;
  responses: string | null;
}

const numberFormatter = new Intl.NumberFormat('id-ID');

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normaliseTrendPoint(point: number | TrendPointInput | null | undefined, index: number): SparklinePoint | null {
  if (typeof point === 'number') {
    return { label: `Poin ${index + 1}`, value: point };
  }
  if (!point || typeof point !== 'object') {
    return null;
  }

  const numeric = toNumber(point.value ?? point.total ?? point.count ?? point.avg ?? point.average);
  if (numeric === null) {
    return null;
  }

  const label =
    typeof point.label === 'string' && point.label.trim().length > 0
      ? point.label
      : typeof point.period === 'string' && point.period.trim().length > 0
        ? point.period
        : typeof point.date === 'string' && point.date.trim().length > 0
          ? point.date
          : `Poin ${index + 1}`;

  return { label, value: numeric };
}

function buildTrendSeries(
  input: Array<number | TrendPointInput> | null | undefined,
  fallback: unknown
): SparklinePoint[] {
  const series = Array.isArray(input)
    ? input
        .map((item, index) => normaliseTrendPoint(item, index))
        .filter((item): item is SparklinePoint => Boolean(item))
    : [];

  if (series.length > 0) {
    return series;
  }

  const fallbackNumber = toNumber(fallback);
  if (fallbackNumber !== null) {
    return [{ label: 'Saat ini', value: fallbackNumber }];
  }

  return [];
}

export function buildSparklineSeries(stats: QuickStatsResponse | null | undefined): SparklineSeriesMap {
  const customers = buildTrendSeries(
    stats?.customerTrend ?? stats?.customer_trend ?? null,
    stats?.total_customers
  );
  const leads = buildTrendSeries(stats?.leadTrend ?? stats?.lead_trend ?? null, stats?.total_leads);
  const escalations = buildTrendSeries(
    stats?.escalationTrend ?? stats?.escalation_trend ?? null,
    stats?.open_escalations ?? stats?.resolved_escalations
  );
  const responseRate = buildTrendSeries(
    stats?.responseTrend ?? stats?.response_trend ?? null,
    stats?.response_rate
  );

  return { customers, leads, escalations, responseRate };
}

export function buildResponseTrend(stats: QuickStatsResponse | null | undefined): ResponseTrend {
  const series = buildTrendSeries(
    stats?.responseTimeTrend ?? stats?.response_time_trend ?? null,
    stats?.avgResponseTime ?? stats?.avg_response_time
  );

  const labels = series.map((item, index) => item.label ?? `Poin ${index + 1}`);
  const values = series.map((item) => item.value);
  const hasData = values.length > 0;
  const average = toNumber(stats?.avgResponseTime ?? stats?.avg_response_time);

  return {
    labels,
    values,
    hasData,
    averageLabel: average !== null ? `${average.toFixed(1)} menit` : null
  };
}

function normaliseStatus(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

export function buildEscalationBreakdown(escalations: EscalationRecord[]): EscalationBreakdown {
  return escalations.reduce(
    (acc, escalation) => {
      const record = escalation as Record<string, unknown>;
      const status =
        normaliseStatus(record.status) ||
        normaliseStatus(record.current_status) ||
        normaliseStatus(record.state) ||
        'open';

      if (status.includes('resolved')) {
        acc.resolved += 1;
      } else if (status.includes('pending')) {
        acc.pending += 1;
      } else {
        acc.open += 1;
      }
      acc.total += 1;
      return acc;
    },
    { open: 0, pending: 0, resolved: 0, total: 0 }
  );
}

function capitalise(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function deriveFunnelRowsFromStatuses(businesses: BusinessRecord[] | null | undefined, leads: LeadRecord[]): FunnelRow[] {
  const source = (Array.isArray(businesses) && businesses.length > 0 ? businesses : leads) ?? [];
  if (source.length === 0) {
    return [];
  }

  const stageDefinitions = [
    { key: 'lead-baru', label: 'Lead Baru', statuses: ['new', 'baru', 'open', 'incoming', 'new_lead'] },
    {
      key: 'lead-contacted',
      label: 'Sudah Dihubungi',
      statuses: ['contacted', 'dihubungi', 'follow_up', 'in_progress', 'replied']
    },
    {
      key: 'lead-qualified',
      label: 'Terkualifikasi',
      statuses: ['qualified', 'opportunity', 'qualified_lead', 'demo_scheduled', 'assessment']
    },
    {
      key: 'lead-proposal',
      label: 'Proposal / Negosiasi',
      statuses: ['proposal', 'proposal_sent', 'negotiation', 'contract', 'contract_sent']
    },
    { key: 'lead-won', label: 'Menang', statuses: ['won', 'closed_won', 'converted', 'deal_won'] },
    { key: 'lead-lost', label: 'Kalah', statuses: ['lost', 'closed_lost', 'unqualified', 'deal_lost', 'rejected'] }
  ];

  const stageMap = new Map<string, { count: number; statuses: Set<string> }>();
  stageDefinitions.forEach((stage) => stageMap.set(stage.key, { count: 0, statuses: new Set() }));
  const others = { count: 0, statuses: new Set<string>() };

  const toStatusString = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
  };

  source.forEach((entry) => {
    const record = entry as Record<string, unknown>;
    const rawStatus =
      toStatusString(record.status) ||
      toStatusString(record.stage) ||
      toStatusString(record.pipeline_status) ||
      toStatusString(record.current_status) ||
      toStatusString(record.lead_status);

    if (!rawStatus) {
      return;
    }

    const match = stageDefinitions.find((stage) => stage.statuses.includes(rawStatus));
    if (match) {
      const stageState = stageMap.get(match.key)!;
      stageState.count += 1;
      stageState.statuses.add(rawStatus);
    } else {
      others.count += 1;
      others.statuses.add(rawStatus);
    }
  });

  const rows: FunnelRow[] = stageDefinitions.map((stage) => {
    const state = stageMap.get(stage.key)!;
    return {
      key: stage.key,
      label: stage.label,
      count: state.count,
      statuses: Array.from(state.statuses)
    };
  });

  if (others.count > 0) {
    rows.push({ key: 'others', label: 'Status Lainnya', count: others.count, statuses: Array.from(others.statuses) });
  }

  return rows;
}

export function buildFunnelRows(
  stats: QuickStatsResponse | null | undefined,
  leads: LeadRecord[]
): FunnelRow[] {
  const funnel: FunnelData | null | undefined = stats?.funnel ?? stats?.conversionFunnel ?? null;
  if (funnel?.stages && funnel?.values && funnel.stages.length === funnel.values.length) {
    return funnel.stages.map((stage, index) => ({
      key: typeof stage === 'string' ? stage.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `stage-${index}`,
      label: typeof stage === 'string' ? stage : `Tahap ${index + 1}`,
      count: Number(funnel.values[index] ?? 0) || 0,
      statuses: []
    }));
  }

  return deriveFunnelRowsFromStatuses(stats?.businesses ?? null, leads);
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function pickTimestamp(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }
  return null;
}

export function deriveActivities(
  customers: CustomerRecord[],
  leads: LeadRecord[]
): ActivityItem[] {
  const items: ActivityItem[] = [];

  customers.slice(0, 5).forEach((customer) => {
    const record = customer as Record<string, unknown>;
    const name = customer.name ?? pickString(record, ['customer_name', 'display_name']) ?? 'Pelanggan';
    const status = pickString(record, ['status', 'customer_status', 'conversation_stage', 'conversationStage']) ?? 'active';
    const priority = pickString(record, ['priority', 'customer_priority']) ?? 'medium';
    const timestamp =
      pickTimestamp(record, ['last_contacted_at', 'last_contact', 'last_interaction', 'updated_at']) ?? null;

    items.push({
      title: `${name} melakukan interaksi`,
      detail: `Status: ${capitalise(status)} • Prioritas ${capitalise(priority)}`,
      timestamp
    });
  });

  leads.slice(0, 5).forEach((lead) => {
    const record = lead as Record<string, unknown>;
    const name = lead.name ?? pickString(record, ['display_name']) ?? 'Lead';
    const source = lead.source ?? pickString(record, ['market_segment']) ?? 'N/A';
    const score = toNumber(lead.score ?? record.lead_score ?? record.score_value);
    const timestamp = pickTimestamp(record, ['last_activity_at', 'follow_up', 'updated_at', 'created_at']);

    items.push({
      title: `Lead ${name} diperbarui`,
      detail: `Source ${source} • Score ${score !== null ? score : '-'}`,
      timestamp
    });
  });

  return items
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 8);
}

export function deriveNotifications(escalations: EscalationRecord[]): NotificationItem[] {
  return escalations
    .filter((item) => {
      const status = pickString(item as Record<string, unknown>, ['status']) ?? 'open';
      return !status.toLowerCase().includes('resolved');
    })
    .slice(0, 6)
    .map((item) => ({
      title: `${item.customer_name ?? 'Unknown'} - ${capitalise(item.priority ?? 'medium')} priority`,
      detail: item.reason ?? 'Escalation ticket',
      priority: capitalise(item.priority ?? 'medium')
    }));
}

export function deriveTeamLeaderboard(stats: QuickStatsResponse | null | undefined): LeaderboardEntry[] {
  const teamData =
    (Array.isArray(stats?.teamPerformance) ? stats?.teamPerformance : null) ??
    (Array.isArray(stats?.team_performance) ? stats?.team_performance : null) ??
    [];

  return teamData
    .map((entry) => {
      const record = entry as TeamPerformanceEntry;
      const handled = toNumber(record.handled ?? record.total) ?? 0;
      const sla = toNumber(record.sla ?? record.avg_sla);
      const score = toNumber(record.score);
      const name = record.name ?? record.agent ?? record.team ?? 'Tim';

      return {
        name,
        handled,
        sla: sla !== null ? `${sla} menit` : '—',
        score: score !== null ? `${score}%` : '⭐️'
      };
    })
    .sort((a, b) => b.handled - a.handled)
    .slice(0, 5);
}

export function deriveCsatInsight(stats: QuickStatsResponse | null | undefined): CsatInsight {
  const csat: CsatSummary | null | undefined = stats?.csat ?? null;
  if (!csat) {
    return {
      score: null,
      summary: null,
      trend: null,
      sentiment: null,
      responses: null
    };
  }

  const score = toNumber(csat.score);
  const responses = toNumber(csat.responses ?? csat.totalResponses);
  const trend = toNumber(csat.trend ?? csat.delta ?? csat.change);
  const sentiment = toNumber(csat.sentiment ?? csat.sentiment_positive ?? csat.sentimentPositive);

  return {
    score: score !== null ? score.toFixed(1) : null,
    summary: typeof csat.summary === 'string' ? csat.summary : null,
    trend: trend !== null ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%` : null,
    sentiment: sentiment !== null ? `${sentiment.toFixed(1)}% positif` : null,
    responses: responses !== null ? numberFormatter.format(responses) : null
  };
}

export function formatNumber(value: number | null): string {
  return numberFormatter.format(value ?? 0);
}
