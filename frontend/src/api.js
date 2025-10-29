import axios from 'axios';

// Base URL untuk n8n webhooks
const N8N_BASE_URL = 'https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook';

// Helper untuk handle response dari n8n (yang return array dengan 1 object)
const handleN8nResponse = (response) => {
  if (Array.isArray(response.data) && response.data.length > 0) {
    return response.data[0];
  }
  return response.data;
};

// API Functions
export const api = {
  // Dashboard Stats
  getStats: async () => {
    const response = await axios.post(`${N8N_BASE_URL}/crm/quick-stats`, {});
    return handleN8nResponse(response);
  },

  // Customers
  getCustomers: async (params = {}) => {
    const response = await axios.post(`${N8N_BASE_URL}/crm/customers-list`, params);
    return handleN8nResponse(response);
  },

  getCustomerDetail: async (customerId) => {
    const response = await axios.post(`${N8N_BASE_URL}/crm/customer-details`, { 
      customer_id: customerId 
    });
    return handleN8nResponse(response);
  },

  // Chat History
  getChatHistory: async (customerId) => {
    const response = await axios.post(`${N8N_BASE_URL}/crm/chat-history`, { 
      customer_id: customerId 
    });
    return handleN8nResponse(response);
  },

  // Send WhatsApp
  sendWhatsApp: async (phone, message, customerId) => {
    const response = await axios.post(`${N8N_BASE_URL}/crm/resolve-escalation`, {
      to: phone.replace('@s.whatsapp.net', ''),
      message: message
    });
    return handleN8nResponse(response);
  },

  // Businesses/Leads
  getBusinesses: async (params = {}) => {
    const response = await axios.post(`${N8N_BASE_URL}/crm/leads-list`, params);
    return handleN8nResponse(response);
  },

  // Escalations
  getEscalations: async (params = {}) => {
    const response = await axios.post(`${N8N_BASE_URL}/crm/escalations-list`, params);
    return handleN8nResponse(response);
  },

  resolveEscalation: async (escalationId) => {
    const response = await axios.post(`${N8N_BASE_URL}/crm/resolve-escalation`, {
      escalation_id: escalationId
    });
    return handleN8nResponse(response);
  },

  // Export CSV - using browser download
  exportCustomersCSV: () => {
    // Since n8n doesn't have export endpoint, we'll handle this client-side
    return null;
  },

  exportBusinessesCSV: () => {
    return null;
  },

  exportChatHistoryCSV: () => {
    return null;
  }
};

// Export to CSV helper (client-side)
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diexport');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
