// dashboard.js - WITH DEBUGGING
async function loadOverview() {
  const loadingEl = document.getElementById('loading-overview');
  const errorEl = document.getElementById('error-overview');
  
  try {
    if (loadingEl) loadingEl.style.display = 'block';
    if (errorEl) errorEl.style.display = 'none';
    
    console.log('📊 Fetching quick stats...');
    const stats = await apiConnector.getQuickStats();
    console.log('✅ Stats received:', stats);
    
    if (!stats.success || !stats.data) {
      throw new Error('Invalid stats response structure');
    }
    
    document.getElementById('total-customers').textContent = stats.data.totalCustomers || 0;
    document.getElementById('total-leads').textContent = stats.data.totalLeads || 0;
    document.getElementById('total-escalations').textContent = stats.data.totalEscalations || 0;
    document.getElementById('response-rate').textContent = (stats.data.responseRate || 0) + '%';
    
    if (loadingEl) loadingEl.style.display = 'none';
    
  } catch (err) {
    console.error('❌ Overview load error:', err);
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.textContent = `Error: ${err.message}`;
    }
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

async function loadCustomerService() {
  try {
    console.log('👥 Fetching customers...');
    const customers = await apiConnector.getCustomers();
    console.log('✅ Customers received:', customers.data?.length || 0, 'rows');
    renderCustomerTable(customers.data || []);
    
    console.log('🚨 Fetching escalations...');
    const escalations = await apiConnector.getEscalations();
    console.log('✅ Escalations received:', escalations.data?.length || 0, 'rows');
    renderEscalationTable(escalations.data || []);
    
  } catch (err) {
    console.error('❌ Customer Service load error:', err);
    alert('Failed to load customer service data: ' + err.message);
  }
}

async function loadMarketing() {
  try {
    console.log('📈 Fetching leads...');
    const leads = await apiConnector.getBusinessLeads();
    console.log('✅ Leads received:', leads.data?.length || 0, 'rows');
    renderLeadsTable(leads.data || []);
    
  } catch (err) {
    console.error('❌ Marketing load error:', err);
    alert('Failed to load marketing data: ' + err.message);
  }
}

async function searchCustomerDetail(phone) {
  if (!phone || phone.trim() === '') {
    alert('Masukkan nomor telepon!');
    return;
  }
  
  try {
    console.log('🔍 Searching customer:', phone);
    const detail = await apiConnector.getCustomerDetails(phone);
    console.log('✅ Customer detail:', detail);
    renderCustomerDetail(detail.data);
    
  } catch (err) {
    console.error('❌ Customer detail error:', err);
    alert('Customer not found or error: ' + err.message);
  }
}

async function contactLeadAction(to, message) {
  if (!to || !message) {
    alert('Phone dan message harus diisi!');
    return;
  }
  
  try {
    console.log('📱 Sending message to:', to);
    const res = await apiConnector.contactLead(to, message);
    console.log('✅ Message sent:', res);
    
    alert(res.success ? 'Message sent successfully!' : 'Failed to send message');
    
  } catch (err) {
    console.error('❌ Contact lead error:', err);
    alert('Error sending message: ' + err.message);
  }
}

// ✅ NEW: Connection test on page load
async function testConnection() {
  console.log('🔌 Testing n8n connection...');
  const result = await apiConnector.healthCheck();
  
  if (result.status === 'connected') {
    console.log('✅ n8n connection OK');
  } else {
    console.error('❌ n8n connection failed:', result.message);
    alert('Warning: Cannot connect to n8n server!\n' + result.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Dashboard initializing...');
  
  // Test connection first
  await testConnection();
  
  // Load all data
  await Promise.all([
    loadOverview(),
    loadCustomerService(),
    loadMarketing()
  ]);
  
  console.log('✅ Dashboard loaded');
});

// Render functions (implement sesuai HTML structure lo)
function renderCustomerTable(data) {
  const tbody = document.querySelector('#customer-table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = data.map(c => `
    <tr>
      <td>${c.phone}</td>
      <td>${c.name || 'N/A'}</td>
      <td>${c.location || 'N/A'}</td>
      <td><span class="badge ${c.customer_priority}">${c.customer_priority}</span></td>
      <td>${new Date(c.last_interaction).toLocaleString('id-ID')}</td>
    </tr>
  `).join('');
}

function renderEscalationTable(data) {
  const tbody = document.querySelector('#escalation-table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = data.map(e => `
    <tr>
      <td>${e.customer_name || 'Unknown'}</td>
      <td>${e.escalation_type}</td>
      <td><span class="badge ${e.priority}">${e.priority}</span></td>
      <td>${e.status}</td>
      <td>${new Date(e.created_at).toLocaleString('id-ID')}</td>
    </tr>
  `).join('');
}

function renderLeadsTable(data) {
  const tbody = document.querySelector('#leads-table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = data.map(l => `
    <tr>
      <td>${l.name}</td>
      <td>${l.phone || 'N/A'}</td>
      <td>${l.market_segment}</td>
      <td>${l.lead_score}</td>
      <td><span class="badge ${l.status}">${l.status}</span></td>
      <td>
        <button onclick="contactLeadAction('${l.phone}', 'Hello from CRM')">Contact</button>
      </td>
    </tr>
  `).join('');
}

function renderCustomerDetail(data) {
  const detailEl = document.getElementById('customer-detail');
  if (!detailEl) return;
  
  detailEl.innerHTML = `
    <h3>${data.name || 'Unknown Customer'}</h3>
    <p><strong>Phone:</strong> ${data.phone}</p>
    <p><strong>Location:</strong> ${data.location || 'N/A'}</p>
    <p><strong>Priority:</strong> ${data.customer_priority}</p>
    <p><strong>Last Interaction:</strong> ${new Date(data.last_interaction).toLocaleString('id-ID')}</p>
  `;
}
