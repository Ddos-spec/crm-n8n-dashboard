export interface TrendPointInput {
  label?: string;
  period?: string;
  date?: string;
  value?: number | string;
  total?: number | string;
  count?: number | string;
  avg?: number | string;
  average?: number | string;
}

export interface FunnelData {
  stages?: Array<string | null | undefined>;
  values?: Array<number | string | null | undefined>;
}

export interface TeamPerformanceEntry {
  name?: string;
  agent?: string;
  team?: string;
  handled?: number | string;
  total?: number | string;
  score?: number | string;
  sla?: number | string;
  avg_sla?: number | string;
}

export interface CsatSummary {
  score?: number | string;
  summary?: string;
  responses?: number | string;
  totalResponses?: number | string;
  trend?: number | string;
  delta?: number | string;
  change?: number | string;
  sentiment?: number | string;
  sentiment_positive?: number | string;
  sentimentPositive?: number | string;
}

export interface BusinessRecord {
  status?: string;
  stage?: string;
  pipeline_status?: string;
  current_status?: string;
  lead_status?: string;
}

export interface QuickStatsResponse {
  total_customers: number;
  new_customers_today: number;
  total_leads: number;
  open_escalations: number;
  resolved_escalations: number;
  response_rate: number;
  updated_at: string;
  customers_delta?: number | string;
  customers_period?: string;
  leads_delta?: number | string;
  leads_period?: string;
  escalations_delta?: number | string;
  escalations_period?: string;
  response_delta?: number | string;
  response_period?: string;
  avg_response_time?: number | string;
  avgResponseTime?: number | string;
  customer_trend?: Array<number | TrendPointInput>;
  customerTrend?: Array<number | TrendPointInput>;
  lead_trend?: Array<number | TrendPointInput>;
  leadTrend?: Array<number | TrendPointInput>;
  escalation_trend?: Array<number | TrendPointInput>;
  escalationTrend?: Array<number | TrendPointInput>;
  response_trend?: Array<number | TrendPointInput>;
  responseTrend?: Array<number | TrendPointInput>;
  response_time_trend?: Array<number | TrendPointInput>;
  responseTimeTrend?: Array<number | TrendPointInput>;
  funnel?: FunnelData | null;
  conversionFunnel?: FunnelData | null;
  teamPerformance?: TeamPerformanceEntry[] | null;
  team_performance?: TeamPerformanceEntry[] | null;
  csat?: CsatSummary | null;
  businesses?: BusinessRecord[] | null;
  emptyStateMessage?: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  status: string;
  phone: string;
  last_contacted_at?: string;
  next_action?: string;
  assigned_to?: string;
  tags?: string[];
  priority?: string;
}

export interface LeadRecord {
  id: string;
  name: string;
  source: string;
  phone: string;
  status: string;
  last_activity_at?: string;
  owner?: string;
  score?: number;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface EscalationRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  reason: string;
  priority: string;
  created_at: string;
  assigned_to?: string;
}

export interface CustomerContactHistoryItem {
  channel?: string;
  time?: string;
  timestamp?: string;
  summary?: string;
  notes?: string;
}

export interface CustomerDetail {
  id?: string;
  name?: string;
  phone?: string;
  location?: string;
  customer_priority?: string;
  priority?: string;
  assigned_to?: string;
  tags?: string[];
  contact_history?: CustomerContactHistoryItem[];
  contactHistory?: CustomerContactHistoryItem[];
  [key: string]: unknown;
}

export interface ChatMessage {
  id?: string;
  sender?: string;
  from?: string;
  direction?: 'inbound' | 'outbound';
  text?: string;
  body?: string;
  message?: string;
  channel?: string;
  time?: string;
  timestamp?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface ChatHistoryResponse {
  messages?: ChatMessage[];
  data?: { messages?: ChatMessage[] };
  [key: string]: unknown;
}

export interface ActionResponse {
  success?: boolean;
  message?: string;
  error?: string;
  [key: string]: unknown;
}
