import React from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Users, Briefcase, AlertCircle, MessageSquare, TrendingUp } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const Home = ({ stats }) => {
  // Data Transformers (Mapping Backend Data to Recharts Format)
  
  const customersByPriority = (stats?.customers_by_priority || []).map(item => ({
    name: (item.customer_priority || 'Normal').charAt(0).toUpperCase() + (item.customer_priority || 'normal').slice(1),
    value: item.count
  }));

  const leadsByStatus = (stats?.leads_by_status || []).map(item => ({
    name: (item.status || 'New').replace('_', ' ').toUpperCase(),
    value: item.count
  }));

  const customerTrend = (stats?.customer_trend || []).map(item => ({
    date: item.date,
    customers: item.count
  }));

  const messageDistribution = (stats?.message_distribution || []).map(item => ({
    range: item.range,
    count: item.count
  }));

  const topCustomers = stats?.top_customers || [];
  const topLeads = stats?.top_leads || [];

  // Insight Calculations from Backend Data
  const totalMessages = stats?.total_messages || 0;
  const totalCustomers = stats?.total_customers || 1; // Prevent division by zero
  const avgMessagesPerCustomer = (totalMessages / totalCustomers).toFixed(1);
  
  const highPriorityCount = (stats?.customers_by_priority || [])
    .find(c => c.customer_priority === 'high')?.count || 0;
    
  const qualifiedLeads = (stats?.leads_by_status || [])
    .find(l => l.status === 'qualified')?.count || 0;
  
  const totalLeads = stats?.total_leads || 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
        <div className="text-sm text-gray-500">
          Update terakhir: {new Date().toLocaleString('id-ID')}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-10 h-10 opacity-80" />
            <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1 text-xs">
              Total Database
            </div>
          </div>
          <p className="text-sm opacity-90 mb-1">Total Customer</p>
          <p className="text-4xl font-bold">{stats?.total_customers || 0}</p>
          <p className="text-xs mt-2 opacity-80">{highPriorityCount} prioritas tinggi</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Briefcase className="w-10 h-10 opacity-80" />
            <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1 text-xs">
              Total Database
            </div>
          </div>
          <p className="text-sm opacity-90 mb-1">Total Lead</p>
          <p className="text-4xl font-bold">{stats?.total_leads || 0}</p>
          <p className="text-xs mt-2 opacity-80">{qualifiedLeads} lead qualified</p>
        </div>
        
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-10 h-10 opacity-80" />
            <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1 text-xs">
              Perlu perhatian
            </div>
          </div>
          <p className="text-sm opacity-90 mb-1">Eskalasi Terbuka</p>
          <p className="text-4xl font-bold">{stats?.open_escalations || 0}</p>
          <p className="text-xs mt-2 opacity-80">Semua ditangani</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <MessageSquare className="w-10 h-10 opacity-80" />
            <TrendingUp className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-sm opacity-90 mb-1">Total Pesan</p>
          <p className="text-4xl font-bold">{totalMessages}</p>
          <p className="text-xs mt-2 opacity-80">Rata-rata {avgMessagesPerCustomer} per customer</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Customer Trend */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Trend Customer (7 Hari Terakhir)</h3>
          {customerTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={customerTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="customers" stroke="#3B82F6" strokeWidth={2} name="Customer Baru" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Belum ada data trend
            </div>
          )}
        </div>

        {/* Customer by Priority */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Customer Berdasarkan Prioritas</h3>
          {customersByPriority.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={customersByPriority}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {customersByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Belum ada data customer
            </div>
          )}
        </div>

        {/* Message Distribution */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Distribusi Pesan per Customer</h3>
          {messageDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={messageDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#10B981" name="Jumlah Customer" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Belum ada data pesan
            </div>
          )}
        </div>

        {/* Leads by Status */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Lead Berdasarkan Status</h3>
          {leadsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={leadsByStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" style={{ fontSize: '12px' }} />
                <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '11px' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#F59E0B" name="Jumlah Lead" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Belum ada data lead
            </div>
          )}
        </div>
      </div>

      {/* Top Performers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Customers */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
            Top 5 Customer Teraktif
          </h3>
          {topCustomers.length > 0 ? (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{customer.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{customer.message_count || 0}</p>
                    <p className="text-xs text-gray-500">pesan</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Belum ada data customer
            </div>
          )}
        </div>

        {/* Top Leads */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
            Top 5 Lead Terbaik
          </h3>
          {topLeads.length > 0 ? (
            <div className="space-y-3">
              {topLeads.map((lead, index) => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-green-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.market_segment || 'General'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{lead.lead_score}</p>
                    <p className="text-xs text-gray-500">skor</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Belum ada data lead
            </div>
          )}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Insight Cepat</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Rata-rata Pesan</p>
            <p className="text-2xl font-bold text-blue-600">{avgMessagesPerCustomer}</p>
            <p className="text-xs text-gray-500 mt-1">pesan per customer</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">lead menjadi qualified</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Customer Priority High</p>
            <p className="text-2xl font-bold text-red-600">{highPriorityCount}</p>
            <p className="text-xs text-gray-500 mt-1">memerlukan perhatian khusus</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
