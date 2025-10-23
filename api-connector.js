// api-connector.js
class CRMApiConnector {
  constructor() {
    this.baseUrl = CONFIG.n8n.webhookUrl;
  }

  async fetchApi(endpoint, method = 'GET', body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  }

  // GET
  getCustomers() {
    return this.fetchApi(CONFIG.apiEndpoints.customersList);
  }
  getBusinessLeads() {
    return this.fetchApi(CONFIG.apiEndpoints.leadsList);
  }
  getQuickStats() {
    return this.fetchApi(CONFIG.apiEndpoints.quickStats);
  }
  getEscalations() {
    return this.fetchApi(CONFIG.apiEndpoints.escalationsList);
  }
  getChatHistory(customer_id) {
    return this.fetchApi(`${CONFIG.apiEndpoints.chatHistory}?customer_id=${customer_id}`);
  }
  getCustomerDetails(phone) {
    return this.fetchApi(`${CONFIG.apiEndpoints.customerDetails}?phone=${phone}`);
  }

  // POST
  contactLead(to, message) {
    return this.fetchApi(CONFIG.apiEndpoints.contactLead, 'POST', { to, message });
  }
  resolveEscalation(escalation_id, notes = '') {
    return this.fetchApi(CONFIG.apiEndpoints.resolveEscalation, 'POST', { escalation_id, notes });
  }
}

const apiConnector = new CRMApiConnector();
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CRMApiConnector;
}
