export interface QuickStatsResponse {
  total_customers: number;
  new_customers_today: number;
  total_leads: number;
  open_escalations: number;
  resolved_escalations: number;
  response_rate: number;
  updated_at: string;
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
