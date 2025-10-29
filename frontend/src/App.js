import React, { useState, useEffect } from 'react';
import { 
  Home, Users, Briefcase, MessageSquare, X, 
  Search, Download, Filter, Send, RefreshCw, AlertCircle 
} from 'lucide-react';
import { api, exportToCSV } from './api';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [showChatModal, setShowChatModal] = useState(false);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    dateFrom: '',
    dateTo: ''
  });
  const [notification, setNotification] = useState(null);

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const response = await api.getStats();
      if (response.success) {
        // Map n8n response format to our format
        setStats({
          total_customers: parseInt(response.data.totalCustomers) || 0,
          total_leads: parseInt(response.data.totalLeads) || 0,
          open_escalations: parseInt(response.data.totalEscalations) || 0,
          today_chats: 0, // n8n doesn't provide this, we'll show 0
          recent_activities: [] // n8n doesn't provide this yet
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      showNotification('Gagal memuat statistik', 'error');
    }
  };

  // Fetch customers
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      
      const response = await axios.get(`${API_URL}/api/customers?${params.toString()}`);
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      showNotification('Gagal memuat data customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch businesses
  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      
      const response = await axios.get(`${API_URL}/api/businesses?${params.toString()}`);
      if (response.data.success) {
        setBusinesses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
      showNotification('Gagal memuat data lead', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch escalations
  const fetchEscalations = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status_filter', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      
      const response = await axios.get(`${API_URL}/api/escalations?${params.toString()}`);
      if (response.data.success) {
        setEscalations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching escalations:', error);
      showNotification('Gagal memuat data eskalasi', 'error');
    }
  };

  // Fetch chat history
  const fetchChatHistory = async (customerId) => {
    try {
      const response = await axios.get(`${API_URL}/api/chat-history/${customerId}`);
      if (response.data.success) {
        setChatHistory(response.data.chats);
        setSelectedCustomer(response.data.customer);
        setShowChatModal(true);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      showNotification('Gagal memuat riwayat chat', 'error');
    }
  };

  // Send WhatsApp message
  const sendWhatsAppMessage = async () => {
    if (!message.trim() || !selectedCustomer) return;
    
    try {
      const response = await axios.post(`${API_URL}/api/send-whatsapp`, {
        phone: selectedCustomer.phone,
        message: message,
        customer_id: selectedCustomer.id
      });
      
      if (response.data.success) {
        showNotification('Pesan berhasil dikirim!', 'success');
        setMessage('');
        // Refresh chat history
        fetchChatHistory(selectedCustomer.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showNotification('Gagal mengirim pesan', 'error');
    }
  };

  // Resolve escalation
  const resolveEscalation = async (escalationId) => {
    try {
      const response = await axios.post(`${API_URL}/api/escalations/${escalationId}/resolve`, {});
      if (response.data.success) {
        showNotification('Eskalasi berhasil diselesaikan', 'success');
        fetchEscalations();
      }
    } catch (error) {
      console.error('Error resolving escalation:', error);
      showNotification('Gagal menyelesaikan eskalasi', 'error');
    }
  };

  // Export to CSV
  const exportToCSV = (type) => {
    const url = `${API_URL}/api/export/${type}`;
    window.open(url, '_blank');
    showNotification('Mengunduh file CSV...', 'success');
  };

  // Show notification
  const showNotification = (msg, type = 'info') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Initial load
  useEffect(() => {
    fetchStats();
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'customer-service') {
      fetchCustomers();
      fetchEscalations();
    } else if (activeTab === 'marketing') {
      fetchBusinesses();
    }
  }, [activeTab]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format phone number
  const formatPhone = (phone) => {
    if (!phone) return '-';
    return phone.replace('@s.whatsapp.net', '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">CRM Dashboard</h1>
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab('home')}
                className={`flex items-center px-4 py-2 rounded-lg transition ${
                  activeTab === 'home' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Home className="w-5 h-5 mr-2" />
                Home
              </button>
              <button
                onClick={() => setActiveTab('customer-service')}
                className={`flex items-center px-4 py-2 rounded-lg transition ${
                  activeTab === 'customer-service' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users className="w-5 h-5 mr-2" />
                Customer Service
              </button>
              <button
                onClick={() => setActiveTab('marketing')}
                className={`flex items-center px-4 py-2 rounded-lg transition ${
                  activeTab === 'marketing' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Briefcase className="w-5 h-5 mr-2" />
                Marketing
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
              <button
                onClick={fetchStats}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Total Customer</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.total_customers}</p>
                    </div>
                    <Users className="w-12 h-12 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Total Lead</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.total_leads}</p>
                    </div>
                    <Briefcase className="w-12 h-12 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Eskalasi Terbuka</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.open_escalations}</p>
                    </div>
                    <AlertCircle className="w-12 h-12 text-red-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Chat Hari Ini</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.today_chats}</p>
                    </div>
                    <MessageSquare className="w-12 h-12 text-purple-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Aktivitas Terbaru</h3>
              <div className="space-y-4">
                {stats?.recent_activities?.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-blue-500 mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {activity.customer_name || formatPhone(activity.customer_phone)}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
                {(!stats?.recent_activities || stats.recent_activities.length === 0) && (
                  <p className="text-gray-500 text-center py-8">Belum ada aktivitas</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMER SERVICE TAB */}
        {activeTab === 'customer-service' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Customer Service</h2>
              <button
                onClick={() => exportToCSV('customers')}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cari</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Nama atau telepon..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prioritas</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({...filters, priority: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Semua</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dari Tanggal</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={fetchCustomers}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Filter className="w-4 h-4 inline mr-2" />
                  Terapkan Filter
                </button>
                <button
                  onClick={() => {
                    setFilters({ search: '', status: '', priority: '', dateFrom: '', dateTo: '' });
                    setTimeout(fetchCustomers, 100);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Daftar Customer</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telepon</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lokasi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioritas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Pesan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                          Memuat data...
                        </td>
                      </tr>
                    ) : customers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                          Tidak ada data customer
                        </td>
                      </tr>
                    ) : (
                      customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{customer.name || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatPhone(customer.phone)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.location || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {customer.conversation_stage}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              customer.customer_priority === 'high' ? 'bg-red-100 text-red-800' :
                              customer.customer_priority === 'normal' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {customer.customer_priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.total_messages || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => fetchChatHistory(customer.id)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Lihat Chat
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Escalations */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Eskalasi</h3>
                <button
                  onClick={fetchEscalations}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioritas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alasan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {escalations.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                          Tidak ada eskalasi
                        </td>
                      </tr>
                    ) : (
                      escalations.map((escalation) => (
                        <tr key={escalation.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {escalation.customer_name || formatPhone(escalation.customer_phone)}
                            </div>
                            <div className="text-xs text-gray-500">{formatPhone(escalation.customer_phone)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {escalation.escalation_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              escalation.priority_level === 'urgent' ? 'bg-red-100 text-red-800' :
                              escalation.priority_level === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {escalation.priority_level}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {escalation.escalation_reason || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              escalation.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {escalation.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(escalation.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {escalation.status === 'open' && (
                              <button
                                onClick={() => resolveEscalation(escalation.id)}
                                className="text-green-600 hover:text-green-900 font-medium"
                              >
                                Selesaikan
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MARKETING TAB */}
        {activeTab === 'marketing' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Marketing</h2>
              <button
                onClick={() => exportToCSV('businesses')}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cari</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Nama, telepon, atau alamat..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Semua</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="invalid_whatsapp">Invalid WhatsApp</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dari Tanggal</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={fetchBusinesses}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Filter className="w-4 h-4 inline mr-2" />
                  Terapkan Filter
                </button>
                <button
                  onClick={() => {
                    setFilters({ search: '', status: '', priority: '', dateFrom: '', dateTo: '' });
                    setTimeout(fetchBusinesses, 100);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Businesses Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Daftar Lead</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telepon</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alamat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segmen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kontak</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                          Memuat data...
                        </td>
                      </tr>
                    ) : businesses.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                          Tidak ada data lead
                        </td>
                      </tr>
                    ) : (
                      businesses.map((business) => (
                        <tr key={business.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{business.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {business.phone || business.formatted_phone_number || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {business.address || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {business.market_segment}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              business.status === 'new' ? 'bg-blue-100 text-blue-800' :
                              business.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                              business.status === 'qualified' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {business.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-bold bg-purple-100 text-purple-800 rounded">
                              {business.lead_score}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ⭐ {business.rating || 0} ({business.user_ratings_total || 0})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {business.contact_attempts} kali
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Chat Modal */}
      {showChatModal && (
        <div className="modal-overlay" onClick={() => setShowChatModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{width: '800px', maxWidth: '90%'}}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Riwayat Chat - {selectedCustomer?.name || formatPhone(selectedCustomer?.phone)}
                  </h3>
                  <p className="text-sm text-gray-500">{formatPhone(selectedCustomer?.phone)}</p>
                </div>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Chat History */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4" style={{maxHeight: '400px', overflowY: 'auto'}}>
                {chatHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Belum ada riwayat chat</p>
                ) : (
                  <div className="space-y-3">
                    {chatHistory.slice().reverse().map((chat) => (
                      <div
                        key={chat.id}
                        className={`p-3 rounded-lg ${
                          chat.message_type === 'incoming' 
                            ? 'bg-white border border-gray-200' 
                            : 'bg-blue-100 border border-blue-200 ml-auto'
                        }`}
                        style={{maxWidth: '80%', marginLeft: chat.message_type === 'outgoing' ? 'auto' : '0'}}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className={`text-xs font-semibold ${
                            chat.message_type === 'incoming' ? 'text-gray-700' : 'text-blue-700'
                          }`}>
                            {chat.message_type === 'incoming' ? 'Customer' : 'Anda'}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            {formatDate(chat.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800">{chat.content}</p>
                        {chat.classification && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                            {chat.classification}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Send Message */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Balas Pesan via WhatsApp
                </label>
                <div className="flex space-x-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ketik pesan Anda..."
                    rows="3"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <button
                    onClick={sendWhatsAppMessage}
                    disabled={!message.trim()}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Kirim
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
