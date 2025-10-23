// config.js - PURE FRONTEND VERSION (GitHub Pages Compatible)
const CONFIG = {
  n8n: {
    baseUrl: 'https://projek-n8n-nginx.qk6yxt.easypanel.host',
    // ✅ FIXED: Correct path dengan double webhook prefix
    webhookUrl: 'https://projek-n8n-nginx.qk6yxt.easypanel.host/webhook',
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
  },
  // ⚠️ REMOVED: database config (no direct DB access from browser!)
  // ⚠️ REMOVED: whatsapp config (handled by n8n workflow)
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
