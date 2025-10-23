// api-connector.js - FIXED VERSION WITH CORS HANDLING
class CRMApiConnector {
  constructor() {
    this.baseUrl = CONFIG.n8n.baseUrl;
  }

  async fetchApi(endpoint, method = 'GET', body = null) {
    const url = `${this.baseUrl}${endpoint}`;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      // ✅ CRITICAL: Added mode to handle CORS
      mode: 'cors',
      credentials: 'omit'
    };

    if (method === 'POST' && body === null) {
      body = {};
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error [${response.status}]: ${errorText}`);
      }
      
      const data = await response.json();
      
      // ✅ Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }
      
      return data;
      
    } catch (error) {
      // ✅ Better error handling
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('CORS error: Server tidak allow request dari domain ini. Cek n8n CORS settings!');
      }
      throw error;
    }
  }

  buildPayload(action, data = {}) {
    return {
      action,
      request_id: `req_${Date.now()}`,
      data
    };
  }

  // GET Methods - Updated dengan proper HTTP method
  async getCustomers() {
    return this.fetchApi(
      CONFIG.apiEndpoints.customersList,
      'POST',
      this.buildPayload('get_customers')
    );
  }
  
  async getBusinessLeads() {
    return this.fetchApi(CONFIG.apiEndpoints.leadsList, 'POST');  // ✅ Changed to POST sesuai workflow
  }
  
  async getQuickStats() {
    return this.fetchApi(
      CONFIG.apiEndpoints.quickStats,
      'POST',
      this.buildPayload('get_quick_stats')
    );
  }

  async getEscalations() {
    return this.fetchApi(
      CONFIG.apiEndpoints.escalationsList,
      'POST',
      this.buildPayload('get_escalations')
    );
  }

  async getChatHistory(customer_id = null) {
    return this.fetchApi(
      CONFIG.apiEndpoints.chatHistory,
      'POST',
      this.buildPayload('get_chat_history', customer_id ? { customer_id } : {})
    );
  }

  async getCustomerDetails(phone) {
    return this.fetchApi(
      CONFIG.apiEndpoints.customerDetails,
      'POST',
      this.buildPayload('get_customer_details', { phone })
    );
  }

  // POST Methods
  async contactLead(to, message) {
    return this.fetchApi(
      CONFIG.apiEndpoints.contactLead,
      'POST',
      this.buildPayload('contact_lead', { phone: to, message })
    );
  }

  async resolveEscalation(escalation_id, notes = '') {
    return this.fetchApi(
      CONFIG.apiEndpoints.resolveEscalation,
      'POST',
      this.buildPayload('resolve_escalation', { escalation_id, notes })
    );
  }

  // ✅ NEW: Health check method
  async healthCheck() {
    try {
      await this.getQuickStats();
      return { status: 'connected', message: 'n8n connection OK' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

// Initialize global instance
const apiConnector = new CRMApiConnector();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CRMApiConnector;
}
