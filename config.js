// config.js - FIXED VERSION
const CONFIG = {
  n8n: {
    baseUrl: 'https://projek-n8n-n8n.qk6yxt.easypanel.host',
    webhookUrl: 'https://projek-n8n-n8n.qk6yxt.easypanel.host',
    workflowId: 'C92dXduOKH38M3pj'
  },
  apiEndpoints: {
    // ✅ FIXED: Correct double-webhook prefix from Easypanel routing
    customersList: '/webhook/webhook/crm/customers-list',
    leadsList: '/webhook/webhook/crm/leads-list',
    quickStats: '/webhook/webhook/crm/quick-stats',
    escalationsList: '/webhook/webhook/crm/escalations-list',
    chatHistory: '/webhook/webhook/crm/chat-history',
    customerDetails: '/webhook/webhook/crm/customer-details',
    contactLead: '/webhook/webhook/crm/contact-lead',
    resolveEscalation: '/webhook/webhook/crm/resolve-escalation'
  },
  ui: {
    itemsPerPage: 20,
    theme: 'light',
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    language: 'id'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
