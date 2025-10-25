const defaultBaseUrl = 'https://n8n-cors-proxy.setgraph69.workers.dev';

export const config = {
  n8n: {
    baseUrl: process.env.PUBLIC_N8N_BASE_URL ?? defaultBaseUrl,
    webhookUrl: process.env.PUBLIC_N8N_WEBHOOK_URL ?? `${defaultBaseUrl}/webhook`,
    workflowId: process.env.PUBLIC_N8N_WORKFLOW_ID ?? 'MWurQU8hFbk2EzP3'
  },
  apiEndpoints: {
    customersList: process.env.PUBLIC_CUSTOMERS_LIST_ENDPOINT ?? '/webhook/crm/customers-list',
    leadsList: process.env.PUBLIC_LEADS_LIST_ENDPOINT ?? '/webhook/crm/leads-list',
    quickStats: process.env.PUBLIC_QUICK_STATS_ENDPOINT ?? '/webhook/crm/quick-stats',
    escalationsList: process.env.PUBLIC_ESCALATIONS_LIST_ENDPOINT ?? '/webhook/crm/escalations-list',
    chatHistory: process.env.PUBLIC_CHAT_HISTORY_ENDPOINT ?? '/webhook/crm/chat-history',
    customerDetails: process.env.PUBLIC_CUSTOMER_DETAILS_ENDPOINT ?? '/webhook/crm/customer-details',
    contactLead: process.env.PUBLIC_CONTACT_LEAD_ENDPOINT ?? '/webhook/crm/contact-lead',
    resolveEscalation: process.env.PUBLIC_RESOLVE_ESCALATION_ENDPOINT ?? '/webhook/crm/resolve-escalation',
    businessesList: process.env.PUBLIC_BUSINESSES_LIST_ENDPOINT ?? '/webhook/crm/businesses-list'
  },
  ui: {
    itemsPerPage: Number(process.env.PUBLIC_ITEMS_PER_PAGE ?? 20),
    refreshInterval: Number(process.env.PUBLIC_REFRESH_INTERVAL ?? 30000)
  }
} as const;

export type Config = typeof config;
