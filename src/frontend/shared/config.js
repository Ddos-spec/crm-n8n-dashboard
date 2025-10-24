// config.js - PURE FRONTEND VERSION (GitHub Pages Compatible)
export const CONFIG = {
  n8n: {
    baseUrl: 'https://n8n-cors-proxy.setgraph69.workers.dev', // ✅ FIXED: Correct path dengan double webhook prefix
    webhookUrl: 'https://n8n-cors-proxy.setgraph69.workers.dev/webhook',
    workflowId: 'MWurQU8hFbk2EzP3'
  },
  apiEndpoints: {
    // ✅ All endpoints point directly to n8n webhooks
    customersList: '/webhook/crm/customers-list',
    leadsList: '/webhook/crm/leads-list',
    quickStats: '/webhook/crm/quick-stats',
    escalationsList: '/webhook/crm/escalations-list',
    chatHistory: '/webhook/crm/chat-history',
    customerDetails: '/webhook/crm/customer-details',
    contactLead: '/webhook/crm/contact-lead',
    resolveEscalation: '/webhook/crm/resolve-escalation'
  },
  ui: {
    itemsPerPage: 20,
    theme: 'light',
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    language: 'id',
    refreshInterval: 30000 // 30 seconds
  }
};

export default CONFIG;
