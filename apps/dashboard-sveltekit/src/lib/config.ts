const defaultBaseUrl = '/api';

export const config = {
  n8n: {
    baseUrl: process.env.PUBLIC_N8N_BASE_URL ?? defaultBaseUrl,
    webhookUrl: process.env.PUBLIC_N8N_WEBHOOK_URL ?? '/api/proxy', // Gunakan endpoint proxy umum
    workflowId: process.env.PUBLIC_N8N_WORKFLOW_ID ?? 'MWurQU8hFbk2EzP3'
  },
  apiEndpoints: {
    customersList: process.env.PUBLIC_CUSTOMERS_LIST_ENDPOINT ?? '/api/customers',
    leadsList: process.env.PUBLIC_LEADS_LIST_ENDPOINT ?? '/api/leads',
    quickStats: process.env.PUBLIC_QUICK_STATS_ENDPOINT ?? '/api/stats',
    escalationsList: process.env.PUBLIC_ESCALATIONS_LIST_ENDPOINT ?? '/api/escalations',
    chatHistory: process.env.PUBLIC_CHAT_HISTORY_ENDPOINT ?? '/api/proxy', // Gunakan endpoint proxy umum
    customerDetails: process.env.PUBLIC_CUSTOMER_DETAILS_ENDPOINT ?? '/api/proxy', // Gunakan endpoint proxy umum
    contactLead: process.env.PUBLIC_CONTACT_LEAD_ENDPOINT ?? '/api/proxy', // Gunakan endpoint proxy umum
    resolveEscalation: process.env.PUBLIC_RESOLVE_ESCALATION_ENDPOINT ?? '/api/proxy', // Gunakan endpoint proxy umum
    businessesList: process.env.PUBLIC_BUSINESSES_LIST_ENDPOINT ?? '/api/proxy' // Gunakan endpoint proxy umum
  },
  ui: {
    itemsPerPage: Number(process.env.PUBLIC_ITEMS_PER_PAGE ?? 20),
    refreshInterval: Number(process.env.PUBLIC_REFRESH_INTERVAL ?? 60000) // Diubah dari 30 detik ke 60 detik
  }
} as const;

export type Config = typeof config;
