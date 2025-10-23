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

  // GET Methods - Updated dengan proper HTTP method
  async getCustomers() {
    return this.fetchApi(CONFIG.apiEndpoints.customersList, 'GET');
  }
  
  async getBusinessLeads() {
    return this.fetchApi(CONFIG.apiEndpoints.leadsList, 'POST');  // ✅ Changed to POST sesuai workflow
  }
  
  async getQuickStats() {
    return this.fetchApi(CONFIG.apiEndpoints.quickStats, 'GET');
  }
  
  async getEscalations() {
    return this.fetchApi(CONFIG.apiEndpoints.escalationsList, 'GET');
  }
  
  async getChatHistory(customer_id = null) {
    const endpoint = customer_id 
      ? `${CONFIG.apiEndpoints.chatHistory}?customer_id=${customer_id}`
      : CONFIG.apiEndpoints.chatHistory;
    return this.fetchApi(endpoint, 'GET');
  }
  
  async getCustomerDetails(phone) {
    const endpoint = `${CONFIG.apiEndpoints.customerDetails}?phone=${phone}`;
    return this.fetchApi(endpoint, 'GET');
  }

  // POST Methods
  async contactLead(to, message) {
    return this.fetchApi(
      CONFIG.apiEndpoints.contactLead, 
      'POST', 
      { 
        data: { phone: to, message },
        action: 'contact_lead',
        request_id: `req_${Date.now()}`
      }
    );
  }
  
  async resolveEscalation(escalation_id, notes = '') {
    return this.fetchApi(
      CONFIG.apiEndpoints.resolveEscalation, 
      'POST', 
      { 
        data: { escalation_id, notes },
        action: 'resolve_escalation',
        request_id: `req_${Date.now()}`
      }
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
