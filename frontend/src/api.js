import axios from 'axios';

// Base URL untuk Python Backend Lokal
const API_BASE_URL = 'http://localhost:8001/api';

// Helper untuk handle response
const handleResponse = (response) => {
  return response.data;
};

// API Functions
export const api = {
  // Dashboard Stats
  getStats: async () => {
    const response = await axios.get(`${API_BASE_URL}/stats`);
    return handleResponse(response);
  },

  // Customers
  getCustomers: async (params = {}) => {
    // Convert generic params to snake_case query params expected by backend
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    
    const response = await axios.get(`${API_BASE_URL}/customers?${queryParams.toString()}`);
    return handleResponse(response);
  },

  getCustomerDetail: async (customerId) => {
    const response = await axios.get(`${API_BASE_URL}/customers/${customerId}`);
    return handleResponse(response);
  },

  // Chat History
  getChatHistory: async (customerId) => {
    const response = await axios.get(`${API_BASE_URL}/chat-history/${customerId}`);
    return handleResponse(response);
  },

  // Send WhatsApp
  sendWhatsApp: async (phone, message, customerId) => {
    const response = await axios.post(`${API_BASE_URL}/send-whatsapp`, {
      phone: phone.replace('@s.whatsapp.net', ''),
      message: message,
      customer_id: customerId
    });
    return handleResponse(response);
  },

  // Businesses/Leads
  getBusinesses: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const response = await axios.get(`${API_BASE_URL}/businesses?${queryParams.toString()}`);
    return handleResponse(response);
  },

  // Escalations
  getEscalations: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status_filter) queryParams.append('status_filter', params.status_filter);
    if (params.priority) queryParams.append('priority', params.priority);

    const response = await axios.get(`${API_BASE_URL}/escalations?${queryParams.toString()}`);
    return handleResponse(response);
  },

  resolveEscalation: async (escalationId) => {
    const response = await axios.post(`${API_BASE_URL}/escalations/${escalationId}/resolve`, {});
    return handleResponse(response);
  },

  // Export CSV - using browser download via backend
  exportCustomersCSV: () => {
    window.location.href = `${API_BASE_URL}/export/customers`;
  },

  exportBusinessesCSV: () => {
    window.location.href = `${API_BASE_URL}/export/businesses`;
  },

  exportChatHistoryCSV: () => {
    window.location.href = `${API_BASE_URL}/export/chat-history`;
  }
};

// Export to CSV helper (client-side backup/legacy)
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
