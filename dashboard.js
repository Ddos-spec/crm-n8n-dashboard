// dashboard.js
async function loadOverview() {
  try {
    const stats = await apiConnector.getQuickStats();
    document.getElementById('total-customers').textContent = stats.data.totalCustomers;
    document.getElementById('total-leads').textContent = stats.data.totalLeads;
    document.getElementById('total-escalations').textContent = stats.data.totalEscalations;
    document.getElementById('response-rate').textContent = stats.data.responseRate + '%';
  } catch (err) {
    console.error('Overview load error:', err);
  }
}

async function loadCustomerService() {
  try {
    const customers = await apiConnector.getCustomers();
    renderCustomerTable(customers.data);
    const escalations = await apiConnector.getEscalations();
    renderEscalationTable(escalations.data);
  } catch (err) {
    console.error('Customer Service load error:', err);
  }
}

async function loadMarketing() {
  try {
    const leads = await apiConnector.getBusinessLeads();
    renderLeadsTable(leads.data);
  } catch (err) {
    console.error('Marketing load error:', err);
  }
}

async function searchCustomerDetail(phone) {
  try {
    const detail = await apiConnector.getCustomerDetails(phone);
    renderCustomerDetail(detail.data);
  } catch (err) {
    console.error('Customer detail error:', err);
  }
}

async function contactLeadAction(to, message) {
  try {
    const res = await apiConnector.contactLead(to, message);
    alert(res.success ? 'Message sent!' : 'Failed to send message');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadOverview();
  loadCustomerService();
  loadMarketing();
  // Bind UI events ke function di atas sesuai kebutuhan UI
});

function renderCustomerTable(data) {
  // Implementasi update tabel customer di HTML
}
function renderEscalationTable(data) {
  // Implementasi update tabel escalation di HTML
}
function renderLeadsTable(data) {
  // Implementasi update tabel leads di HTML
}
function renderCustomerDetail(data) {
  // Implementasi update detail customer di panel/UI
}
