// config.js
const CONFIG = {
  n8n: {
    baseUrl: 'https://projek-n8n-n8n.qk6yxt.easypanel.host',
    webhookUrl: 'https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/crm',
    workflowId: 'C92dXduOKH38M3pj'
  },
  apiEndpoints: {
    customersList: '/customers-list',
    leadsList: '/leads-list',
    quickStats: '/quick-stats',
    escalationsList: '/escalations-list',
    chatHistory: '/chat-history',
    customerDetails: '/customer-details',
    contactLead: '/contact-lead',
    resolveEscalation: '/resolve-escalation'
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
