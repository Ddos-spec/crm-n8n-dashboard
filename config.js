// config.js - FIXED VERSION
const CONFIG = {
  n8n: {
    baseUrl: 'https://projek-n8n-n8n.qk6yxt.easypanel.host',
    webhookUrl: 'https://projek-n8n-n8n.qk6yxt.easypanel.host',
    workflowId: 'C92dXduOKH38M3pj'
  },
  apiEndpoints: {
    // ✅ FIXED: Added full webhook paths
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
    language: 'id'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
