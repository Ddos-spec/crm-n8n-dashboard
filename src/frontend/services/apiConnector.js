import { CONFIG } from '../shared/config.js';

export class ApiConnector {
  constructor(config = CONFIG) {
    this.config = config;
    this.baseUrl = config.n8n.baseUrl;
  }

  async fetchApi(endpoint, method = 'GET', body = null) {
    const url = `${this.baseUrl}${endpoint}`;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
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

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }

      return data;
    } catch (error) {
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

  async getCustomers() {
    return this.fetchApi(
      this.config.apiEndpoints.customersList,
      'POST',
      this.buildPayload('get_customers')
    );
  }

  async getBusinessLeads() {
    return this.fetchApi(
      this.config.apiEndpoints.leadsList,
      'POST',
      this.buildPayload('get_leads')
    );
  }

  async getQuickStats() {
    return this.fetchApi(
      this.config.apiEndpoints.quickStats,
      'POST',
      this.buildPayload('get_quick_stats')
    );
  }

  async getEscalations() {
    return this.fetchApi(
      this.config.apiEndpoints.escalationsList,
      'POST',
      this.buildPayload('get_escalations')
    );
  }

  async getChatHistory(customerId = null) {
    return this.fetchApi(
      this.config.apiEndpoints.chatHistory,
      'POST',
      this.buildPayload('get_chat_history', customerId ? { customer_id: customerId } : {})
    );
  }

  async getCustomerDetails(phone) {
    return this.fetchApi(
      this.config.apiEndpoints.customerDetails,
      'POST',
      this.buildPayload('get_customer_details', { phone })
    );
  }

  async contactLead(to, message) {
    return this.fetchApi(
      this.config.apiEndpoints.contactLead,
      'POST',
      this.buildPayload('contact_lead', { phone: to, message })
    );
  }

  async resolveEscalation(escalationId, notes = '') {
    return this.fetchApi(
      this.config.apiEndpoints.resolveEscalation,
      'POST',
      this.buildPayload('resolve_escalation', { escalation_id: escalationId, notes })
    );
  }

  async healthCheck() {
    try {
      await this.getQuickStats();
      return { status: 'connected', message: 'n8n connection OK' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

    async getBusinesses() {
        return this.fetchApi(
            this.config.apiEndpoints.businessesList,
            'POST',
            this.buildPayload('get_businesses')
        );
    }
}

export const apiConnector = new ApiConnector();
