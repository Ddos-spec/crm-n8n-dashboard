import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home as HomeIcon, Users, Briefcase, X, 
  Search, Download, Filter, Send, RefreshCw, AlertCircle, MessageSquare 
} from 'lucide-react';
import { api, exportToCSV } from './api';
import Home from './Home';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [isEscalationFilterActive, setIsEscalationFilterActive] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    dateFrom: '',
    dateTo: ''
  });
  
  const [notification, setNotification] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Merge customers with active escalations
  const processedCustomers = useMemo(() => {
    return customers.map(cust => {
      const escalation = escalations.find(e => e.customer_id === cust.id && e.status === 'open');
      return { ...cust, activeEscalation: escalation };
    });
  }, [customers, escalations]);

  // Filtered customers for Sidebar
  const filteredCustomersList = useMemo(() => {
    let result = processedCustomers;
    
    // Filter by Search
    if (filters.search) {
      const lowerSearch = filters.search.toLowerCase();
      result = result.filter(c => 
        (c.name && c.name.toLowerCase().includes(lowerSearch)) || 
        (c.phone && c.phone.includes(lowerSearch))
      );
    }

    // Filter by Escalation Toggle
    if (isEscalationFilterActive) {
      result = result.filter(c => c.activeEscalation);
    }

    // Sort: Escalations first, then by last interaction
    return result.sort((a, b) => {
      if (a.activeEscalation && !b.activeEscalation) return -1;
      if (!a.activeEscalation && b.activeEscalation) return 1;
      return new Date(b.last_interaction || 0) - new Date(a.last_interaction || 0);
    });
  }, [processedCustomers, filters.search, isEscalationFilterActive]);

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const response = await api.getStats();
      if (response.success) {
        setStats({
          total_customers: parseInt(response.data.total_customers) || 0,
          total_leads: parseInt(response.data.total_leads) || 0,
          open_escalations: parseInt(response.data.open_escalations) || 0,
          today_chats: parseInt(response.data.today_chats) || 0,
          total_messages: parseInt(response.data.total_messages) || 0,
          ...response.data
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
      const params = {};
      if (filters.priority) params.priority = filters.priority;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      
      const response = await api.getCustomers(params);
      if (response.success && Array.isArray(response.data)) {
        setCustomers(response.data);
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
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      
      const response = await api.getBusinesses(params);
      if (response.success && Array.isArray(response.data)) {
        setBusinesses(response.data);
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
      const params = {};
      if (filters.status) params.status_filter = filters.status;
      if (filters.priority) params.priority = filters.priority;
      
      const response = await api.getEscalations(params);
      if (response.success && Array.isArray(response.data)) {
        setEscalations(response.data);
      }
    } catch (error) {
      console.error('Error fetching escalations:', error);
      showNotification('Gagal memuat data eskalasi', 'error');
    }
  };

  // Fetch chat history
  const fetchChatHistory = async (customerId) => {
    try {
      const response = await api.getChatHistory(customerId);
      if (response.success && Array.isArray(response.data)) {
        setChatHistory(response.data);
        
        const currentCust = processedCustomers.find(c => c.id === customerId);
        
        if (currentCust) {
          setSelectedCustomer(currentCust);
        } else if (response.data.length > 0 && response.data[0].customer_name) {
          setSelectedCustomer({
            id: customerId,
            name: response.data[0].customer_name,
            phone: response.data[0].customer_phone
          });
        } else {
          setSelectedCustomer({ id: customerId, phone: 'Unknown' });
        }
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
      const response = await api.sendWhatsApp(
        selectedCustomer.phone,
        message,
        selectedCustomer.id
      );
      
      if (response.success) {
        showNotification('Pesan berhasil dikirim!', 'success');
        setMessage('');
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
      const response = await api.resolveEscalation(escalationId);
      if (response.success) {
        showNotification('Eskalasi berhasil diselesaikan', 'success');
        await fetchEscalations();
        if (selectedCustomer) {
            setSelectedCustomer(prev => ({...prev, activeEscalation: null}));
        }
      }
    } catch (error) {
      console.error('Error resolving escalation:', error);
      showNotification('Gagal menyelesaikan eskalasi', 'error');
    }
  };

  // Export to CSV
  const handleExportCSV = (type) => {
    let data, filename;
    
    switch(type) {
      case 'customers':
        data = customers;
        filename = 'customers.csv';
        break;
      case 'businesses':
        data = businesses;
        filename = 'leads.csv';
        break;
      case 'chat-history':
        data = chatHistory;
        filename = 'chat_history.csv';
        break;
      default:
        return;
    }
    
    exportToCSV(data, filename);
    showNotification('File CSV berhasil diunduh', 'success');
  };

  // Show notification
  const showNotification = (msg, type = 'info') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Initial load
  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'home') {
      fetchCustomers();
      fetchBusinesses();
      fetchEscalations();
    } else if (activeTab === 'customer-service') {
      fetchCustomers();
      fetchEscalations();
    } else if (activeTab === 'marketing') {
      fetchBusinesses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Pagination helpers
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = customers.slice(indexOfFirstItem, indexOfLastItem);
  const currentBusinesses = businesses.slice(indexOfFirstItem, indexOfLastItem);
  const totalCustomerPages = Math.ceil(customers.length / itemsPerPage);
  const totalBusinessPages = Math.ceil(businesses.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Reset to page 1 when changing tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Format date helper
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

  // Format phone helper
  const formatPhone = (phone) => {
    if (!phone) return '-';
    return phone.replace('@s.whatsapp.net', '');
  };

  // Pagination Component
  const Pagination = ({ currentPage, totalPages, paginate }) => {
    const pageNumbers = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
        <div className="text-sm text-gray-700">
          Halaman <span className="font-semibold">{currentPage}</span> dari{' '}
          <span className="font-semibold">{totalPages}</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Prev
          </button>
          
          {startPage > 1 && (
            <>
              <button
                onClick={() => paginate(1)}
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
              >
                1
              </button>
              {startPage > 2 && <span className="px-2">...</span>}
            </>
          )}
          
          {pageNumbers.map(number => (
            <button
              key={number}
              onClick={() => paginate(number)}
              className={`px-3 py-1 rounded ${
                currentPage === number
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {number}
            </button>
          ))}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="px-2">...</span>}
              <button
                onClick={() => paginate(totalPages)}
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
              >
                {totalPages}
              </button>
            </>
          )}
          
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm z-10">
        <div className="max-w-full mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <h1 className="text-xl font-bold text-gray-900 flex items-center">
              <span className="bg-blue-600 text-white p-1 rounded mr-2">CRM</span>
              Dashboard
            </h1>
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('home')}
                className={`flex items-center px-3 py-2 rounded-lg text-sm transition ${
                  activeTab === 'home' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <HomeIcon className="w-4 h-4 mr-2" />
                Home
              </button>
              <button
                onClick={() => setActiveTab('customer-service')}
                className={`flex items-center px-3 py-2 rounded-lg text-sm transition ${
                  activeTab === 'customer-service' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                Customer Service
              </button>
              <button
                onClick={() => setActiveTab('marketing')}
                className={`flex items-center px-3 py-2 rounded-lg text-sm transition ${
                  activeTab === 'marketing' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Briefcase className="w-4 h-4 mr-2" />
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

      {/* Main Content Area - Full Height minus Header */}
      <div className="flex-1 overflow-hidden relative">
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="h-full overflow-auto p-6">
            <div className="max-w-7xl mx-auto">
              <Home 
                stats={stats} 
                customers={customers} 
                businesses={businesses} 
              />
            </div>
          </div>
        )}

        {/* CUSTOMER SERVICE TAB - INBOX STYLE */}
        {activeTab === 'customer-service' && (
          <div className="flex h-full bg-white">
            {/* LEFT SIDEBAR: Customer List */}
            <div className="w-1/3 min-w-[320px] border-r border-gray-200 flex flex-col bg-white h-full">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Inbox</h2>
                  <button 
                    onClick={() => handleExportCSV('customers')}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                    title="Export CSV"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>

                {/* Search & Filter */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari customer..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                  
                  {/* Escalation Toggle */}
                  <div 
                    onClick={() => setIsEscalationFilterActive(!isEscalationFilterActive)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition select-none ${
                      isEscalationFilterActive 
                        ? 'bg-red-50 border border-red-200 text-red-700' 
                        : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <AlertCircle className={`w-4 h-4 mr-2 ${isEscalationFilterActive ? 'text-red-600' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium">Hanya Eskalasi (Urgent)</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition ${isEscalationFilterActive ? 'bg-red-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isEscalationFilterActive ? 'left-6' : 'left-1'}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer List Items */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2" />
                    Memuat data...
                  </div>
                ) : filteredCustomersList.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>Tidak ada customer ditemukan</p>
                  </div>
                ) : (
                  filteredCustomersList.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => fetchChatHistory(customer.id)}
                      className={`group p-4 border-b border-gray-50 cursor-pointer transition hover:bg-gray-50 relative ${
                        selectedCustomer?.id === customer.id ? 'bg-blue-50' : ''
                      } ${customer.activeEscalation ? 'bg-red-50/50 hover:bg-red-50' : ''}`}
                    >
                      {/* Left Border for Active/Escalation */}
                      {customer.activeEscalation && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                      )}
                      
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center">
                          <h3 className={`font-semibold text-sm ${customer.activeEscalation ? 'text-red-700' : 'text-gray-900'}`}>
                            {customer.name || formatPhone(customer.phone)}
                          </h3>
                          {customer.activeEscalation && (
                            <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded border border-red-200 uppercase tracking-wide">
                              Urgent
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {customer.last_interaction ? formatDate(customer.last_interaction).split(',')[0] : ''}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-end">
                        <p className="text-sm text-gray-500 truncate max-w-[180px]">
                          {customer.phone ? formatPhone(customer.phone) : 'No Phone'}
                        </p>
                        {(customer.message_count_today > 0) && (
                          <span className="min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center bg-blue-600 text-white text-xs font-bold rounded-full">
                            {customer.message_count_today}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT MAIN AREA: Chat Interface */}
            <div className="flex-1 flex flex-col h-full bg-gray-50 relative">
              {selectedCustomer ? (
                <>
                  {/* Chat Header */}
                  <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white mr-3 ${
                         selectedCustomer.activeEscalation ? 'bg-red-500' : 'bg-blue-500'
                      }`}>
                        {(selectedCustomer.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-bold text-gray-900">{selectedCustomer.name || formatPhone(selectedCustomer.phone)}</h2>
                        <div className="flex items-center text-xs text-gray-500">
                          <span>{formatPhone(selectedCustomer.phone)}</span>
                          <span className="mx-2">•</span>
                          <span className={`capitalize ${
                            selectedCustomer.customer_priority === 'high' ? 'text-red-600 font-semibold' : 'text-green-600'
                          }`}>
                            Priority: {selectedCustomer.customer_priority || 'Normal'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* URGENT ESCALATION STICKY BANNER */}
                  {selectedCustomer.activeEscalation && (
                    <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between animate-in slide-in-from-top-2">
                      <div className="flex items-center text-red-800">
                        <AlertCircle className="w-5 h-5 mr-3 text-red-600" />
                        <div>
                          <p className="text-sm font-bold">⚠️ STATUS ESKALASI AKTIF: {selectedCustomer.activeEscalation.escalation_type}</p>
                          <p className="text-xs text-red-600 mt-0.5">
                            Alasan: "{selectedCustomer.activeEscalation.escalation_reason || 'Tidak ada alasan'}" — {formatDate(selectedCustomer.activeEscalation.created_at)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => resolveEscalation(selectedCustomer.activeEscalation.id)}
                        className="px-4 py-1.5 bg-white border border-red-200 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-50 hover:border-red-300 transition shadow-sm"
                      >
                        ✅ Selesaikan
                      </button>
                    </div>
                  )}

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-100/50">
                    {chatHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                        <p>Belum ada riwayat percakapan</p>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-3">
                        {chatHistory.slice().reverse().map((chat) => (
                          <div
                            key={chat.id}
                            className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm ${
                              chat.message_type === 'incoming' 
                                ? 'bg-white text-gray-800 self-start rounded-tl-none border border-gray-100' 
                                : 'bg-blue-600 text-white self-end rounded-tr-none'
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{chat.content}</p>
                            <div className={`text-[10px] mt-1.5 text-right ${
                              chat.message_type === 'incoming' ? 'text-gray-400' : 'text-blue-200'
                            }`}>
                              {new Date(chat.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="bg-white border-t border-gray-200 p-4">
                    <div className="flex items-end space-x-2 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Ketik pesan balasan..."
                        rows={1}
                        className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2 px-2 text-sm text-gray-800"
                        onInput={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                      />
                      <button
                        onClick={sendWhatsAppMessage}
                        disabled={!message.trim()}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm mb-0.5"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-center text-gray-400 mt-2">
                      Pesan akan dikirim via WhatsApp API
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-600">Selamat Datang di Inbox</h3>
                  <p className="text-sm max-w-xs text-center mt-2 text-gray-400">
                    Pilih salah satu customer di sebelah kiri untuk melihat riwayat chat dan menangani eskalasi.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MARKETING TAB */}
        {activeTab === 'marketing' && (
          <div className="h-full overflow-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Marketing</h2>
                <button
                  onClick={() => handleExportCSV('businesses')}
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
                        currentBusinesses.map((business) => (
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
                {businesses.length > itemsPerPage && (
                  <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalBusinessPages} 
                    paginate={paginate} 
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
