const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const buildUrl = (path: string) => {
  if (!apiBase) throw new Error('VITE_API_URL belum di-set');
  return `${apiBase}${path}`;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(buildUrl(path));
  const data = (await res.json()) as T;
  if (!res.ok) {
    const err = (data as unknown as { error?: string })?.error ?? 'Request gagal';
    throw new Error(err);
  }
  return data;
}

export type Customer = {
  id: number;
  name: string | null;
  phone: string;
  status: 'active' | 'pending' | 'escalation';
  last_message_at: string | null;
};

export type Escalation = {
  id: number;
  name: string | null;
  phone: string;
  issue: string;
  priority: string;
  status: string;
};

export type Campaign = {
  name: string;
  total_leads: number;
  contacted: number;
  invalid: number;
  avg_lead_score: number;
  batch_date: string | null;
};

export type Business = {
  id: number;
  name: string | null;
  phone: string;
  status: string;
  campaign_batch: string | null;
  lead_score: number | null;
  location: string | null;
  market_segment: string | null;
  has_phone: boolean;
  message_sent: boolean;
  created_at: string;
};

export type ChatMessage = {
  id: number;
  customer_id: number;
  message_type: string;
  content: string;
  created_at: string;
  escalated: boolean;
};

export const api = {
  getCustomers: () => getJson<{ data: Customer[] }>('/api/customers'),
  getEscalations: () => getJson<{ data: Escalation[] }>('/api/escalations'),
  getChatHistory: (customerId: number) =>
    getJson<{ data: ChatMessage[] }>(`/api/chat-history?customerId=${customerId}`),
  getCampaigns: () => getJson<{ data: Campaign[] }>('/api/marketing'),
  getBusinesses: (params?: { limit?: number; offset?: number; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const q = query.toString();
    return getJson<{ data: Business[]; meta: { total: number; limit: number; offset: number; requestId: string } }>(
      `/api/businesses${q ? `?${q}` : ''}`,
    );
  },
  sendMessage: (body: {
    mtype: string;
    receiver: string;
    text?: string;
    url?: string;
    filename?: string;
  }) => fetch(buildUrl('/api/send-message'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
};
