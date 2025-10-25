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
