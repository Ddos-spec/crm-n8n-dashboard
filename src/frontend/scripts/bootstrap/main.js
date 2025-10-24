import { DashboardState, setupAutoRefresh, restartCountdown, updateRefreshState } from '../state/dashboardState.js';
import { TableManager } from '../tables/tableManager.js';
import { renderSparklineCharts } from '../charts/sparklineCharts.js';
import { renderOverviewCharts } from '../charts/overviewCharts.js';
import { showToast } from '../ui/toast.js';
import { escapeHTML, refreshIcons, showLoadingOverlay, hideLoadingOverlay, updateConnectionStatus, formatDateCell, downloadFile } from '../ui/dom.js';
import { statusToBadge, priorityToBadge, updateDeltaBadge } from '../ui/badges.js';
import { renderAssignLeadForm, renderResolveEscalationForm, renderSendMessageForm, setupModal, openModal, closeModal, openQuickActionModal } from '../ui/modal.js';
import { ensureArray, formatNumber, capitalize, extractUnique } from '../../shared/utils/index.js';
import { apiConnector } from '../../services/apiConnector.js';
import { webhookApiConnector } from '../../services/webhookHandler.js';
import { CONFIG } from '../../shared/config.js';
import { initCampaignPerformance, loadCampaignPerformance } from '../marketing/campaignPerformance.js';

async function initializeDashboard() {
  moment.locale(CONFIG.ui.language || 'id');
  refreshIcons();
  setupTabs();
  setupQuickActions();
  setupModal();
  initCampaignPerformance();
  setupAutoRefresh(refreshData);
  initializeTables();
  bindExportButtons();
  document.getElementById('refresh-data').addEventListener('click', handleManualRefresh);
  document.getElementById('analytics-range').addEventListener('change', renderAnalyticsWidgets);
  document.getElementById('customer-date-from').addEventListener('change', () => filterByDateRange('customer'));
  document.getElementById('customer-date-to').addEventListener('change', () => filterByDateRange('customer'));
  await refreshData();
}

function setupTabs() {
  const buttons = document.querySelectorAll('.tab-button');
  const panels = document.querySelectorAll('.tab-panel');
  const description = document.getElementById('active-tab-description');

  const descriptions = {
    overview: 'Insight global dan KPI utama.',
    'customer-service': 'Pipeline pelanggan, SLA, dan eskalasi.',
    marketing: 'Leads intelligence & kampanye marketing.',
    analytics: 'Analitik performa lintas tim.'
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      buttons.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
      panels.forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${tab}`));
      description.textContent = descriptions[tab] || '';
    });
  });

  if (buttons.length) {
    buttons[0].click();
  }
}

function setupQuickActions() {
  document.querySelectorAll('.quick-action').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'assign-lead') {
        openQuickActionModal({
          title: 'Assign Lead',
          subtitle: 'Distribusikan lead baru ke anggota tim.',
          content: renderAssignLeadForm(),
          onSubmit: () => {
            showToast('Lead assigned ke anggota tim', 'success');
            closeModal();
          }
        });
      } else if (action === 'resolve-escalation') {
        openQuickActionModal({
          title: 'Resolve Escalation',
          subtitle: 'Tandai tiket kritikal sebagai selesai.',
          content: renderResolveEscalationForm(),
          onSubmit: (formData) => handleResolveEscalation(formData.get('escalation'), formData.get('notes'))
        });
      } else if (action === 'send-message') {
        openQuickActionModal({
          title: 'Send Message',
          subtitle: 'Kirim pesan ke pelanggan prioritas tinggi.',
          content: renderSendMessageForm(),
          onSubmit: (formData) => handleSendMessage(formData.get('customer'), formData.get('message'))
        });
      }
    });
  });
}

async function handleManualRefresh() {
  showToast('Memuat data terbaru...', 'info');
  await refreshData();
}

async function refreshData() {
  showLoadingOverlay();
  updateConnectionStatus('connecting');
  try {
    const [statsResponse, customersResponse, leadsResponse, escalationsResponse] = await Promise.all([
      apiConnector.getQuickStats(),
      apiConnector.getCustomers(),
      apiConnector.getBusinessLeads(),
      apiConnector.getEscalations()
    ]);

    DashboardState.stats = statsResponse.data || statsResponse;
    DashboardState.customers = ensureArray(customersResponse.data ?? customersResponse);
    DashboardState.leads = ensureArray(leadsResponse.data ?? leadsResponse);
    DashboardState.escalations = ensureArray(escalationsResponse.data ?? escalationsResponse);

    DashboardState.activities = deriveActivities(DashboardState);
    DashboardState.notifications = deriveNotifications(DashboardState);

    renderStats();
    renderSparklineCharts();
    renderOverviewCharts();
    renderActivities();
    renderNotifications();
    renderEscalationBadges();
    renderTeamLeaderboard();
    renderCSAT();
    populateLeadOwners();

    DashboardState.tableManagers.customers.setData(prepareCustomerRows(DashboardState.customers));
    DashboardState.tableManagers.escalations.setData(prepareEscalationRows(DashboardState.escalations));
    DashboardState.tableManagers.leads.setData(prepareLeadRows(DashboardState.leads));

    await loadCampaignPerformance({ silent: true });
    renderAnalyticsWidgets();
    updateRefreshState();
    updateNewItemsBadge();

    updateConnectionStatus('connected');
    showToast('Data dashboard diperbarui', 'success');
  } catch (error) {
    console.error('Dashboard refresh error:', error);
    updateConnectionStatus('error');
    showToast(error.message || 'Gagal memuat data', 'error');
  } finally {
    hideLoadingOverlay();
    restartCountdown();
  }
}

function initializeTables() {
  DashboardState.tableManagers.customers = new TableManager({
    tableId: 'customer-table',
    searchInputId: 'customer-search',
    filterId: 'customer-priority-filter',
    filterCallback: (item, value) => {
      if (!value || value === 'all') return true;
      return (item.priority || '').toLowerCase() === value.toLowerCase();
    },
    paginationId: 'customer-pagination',
    summaryId: 'customer-summary',
    exportButtonId: 'customer-export',
    pageSizeOptions: [10, 25, 50],
    columns: [
      {
        key: 'name',
        label: 'Customer Name',
        render: (item) => `
          <div class="flex flex-col">
            <span class="font-medium text-slate-700">${escapeHTML(item.name)}</span>
            <span class="text-xs text-slate-400">${escapeHTML(item.phone)}</span>
          </div>
        `
      },
      {
        key: 'status',
        label: 'Status',
        render: (item) => `<span class="badge ${statusToBadge(item.status)}">${escapeHTML(item.statusLabel)}</span>`
      },
      {
        key: 'last_contact',
        label: 'Last Contact',
        render: (item) => formatDateCell(item.lastContact)
      },
      {
        key: 'response_time',
        label: 'Response Time',
        render: (item) => `<span class="text-sm font-medium text-slate-600">${escapeHTML(item.responseTime || '—')}</span>`
      },
      {
        key: 'priority',
        label: 'Priority',
        render: (item) => `<span class="badge ${priorityToBadge(item.priority)}">${escapeHTML(item.priorityLabel)}</span>`
      },
      {
        key: 'actions',
        label: 'Actions',
        excludeFromExport: true,
        render: (item) => `
          <div class="actions flex gap-2">
            <button class="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-500" data-action="view" data-type="customer" data-id="${escapeHTML(item.sourceId)}">View</button>
            <button class="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500" data-action="chat" data-id="${escapeHTML(item.sourceId)}">Chat</button>
          </div>
        `
      }
    ]
  });

  DashboardState.tableManagers.escalations = new TableManager({
    tableId: 'escalation-table',
    searchInputId: null,
    filterId: null,
    paginationId: 'escalation-pagination',
    summaryId: 'escalation-summary',
    exportButtonId: 'export-escalations',
    pageSizeOptions: [10, 25, 50],
    columns: [
      {
        key: 'customer_name',
        label: 'Customer',
        render: (item) => `
          <div>
            <span class="font-medium text-slate-700">${escapeHTML(item.customer_name)}</span>
            <p class="text-xs text-slate-400">${escapeHTML(item.contact)}</p>
          </div>
        `
      },
      {
        key: 'issue',
        label: 'Issue',
        accessor: (item) => item.issue || item.escalation_type,
        render: (item) => `<span class="text-sm text-slate-600">${escapeHTML(item.issue || item.escalation_type || '—')}</span>`
      },
      {
        key: 'priority',
        label: 'Priority',
        render: (item) => `<span class="badge ${priorityToBadge(item.priority)}">${escapeHTML(capitalize(item.priority))}</span>`
      },
      {
        key: 'status',
        label: 'Status',
        render: (item) => `<span class="badge ${statusToBadge(item.status)}">${escapeHTML(capitalize(item.status))}</span>`
      },
      {
        key: 'created_at',
        label: 'Created At',
        render: (item) => formatDateCell(item.created_at)
      },
      {
        key: 'actions',
        label: 'Actions',
        excludeFromExport: true,
        render: (item) => `
          <div class="actions flex gap-2">
            <button class="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500" data-action="view" data-type="escalation" data-id="${escapeHTML(item.sourceId)}">Detail</button>
            <button class="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500" data-action="resolve" data-id="${escapeHTML(item.sourceId)}">Resolve</button>
          </div>
        `
      }
    ]
  });

  DashboardState.tableManagers.leads = new TableManager({
    tableId: 'leads-table',
    searchInputId: 'lead-search',
    filterId: 'lead-status-filter',
    filterCallback: (item, value) => {
      if (!value || value === 'all') return true;
      return (item.status || '').toLowerCase() === value.toLowerCase();
    },
    paginationId: 'lead-pagination',
    summaryId: 'lead-summary',
    exportButtonId: 'lead-export',
    pageSizeOptions: [10, 25, 50],
    columns: [
      {
        key: 'name',
        label: 'Lead Name',
        render: (item) => `
          <div>
            <span class="font-medium text-slate-700">${escapeHTML(item.name)}</span>
            <p class="text-xs text-slate-400">${escapeHTML(item.contact)}</p>
          </div>
        `
      },
      {
        key: 'source',
        label: 'Source',
        render: (item) => `<span class="badge badge-info">${escapeHTML(item.source || 'Unknown')}</span>`
      },
      {
        key: 'status',
        label: 'Status',
        render: (item) => `<span class="badge ${statusToBadge(item.status)}">${escapeHTML(item.statusLabel)}</span>`
      },
      {
        key: 'score',
        label: 'Score',
        accessor: (item) => item.scoreValue,
        render: (item) => `<span class="text-sm font-semibold text-slate-700">${escapeHTML(item.scoreValue ?? '—')}</span>`
      },
      {
        key: 'follow_up',
        label: 'Follow-up Date',
        render: (item) => formatDateCell(item.followUp)
      },
      {
        key: 'owner',
        label: 'Assign To',
        render: (item) => `<span class="text-sm text-slate-600">${escapeHTML(item.owner || 'Unassigned')}</span>`
      },
      {
        key: 'actions',
        label: 'Actions',
        excludeFromExport: true,
        render: (item) => `
          <div class="actions flex gap-2">
            <button class="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-500" data-action="view" data-type="lead" data-id="${escapeHTML(item.sourceId)}">Detail</button>
            <button class="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-500" data-action="contact" data-id="${escapeHTML(item.contact)}">Follow-up</button>
          </div>
        `
      }
    ]
  });

  document.addEventListener('click', async (event) => {
    const target = event.target.closest('button[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const type = target.dataset.type;
    const id = target.dataset.id;

    if (action === 'view') {
      if (type === 'customer') {
        await openCustomerDetail(id);
      } else if (type === 'lead') {
        openLeadDetail(id);
      } else if (type === 'escalation') {
        openEscalationDetail(id);
      }
    } else if (action === 'chat') {
      await openCustomerChat(id);
    } else if (action === 'contact') {
      await handleSendMessage(id, 'Halo! Kami ingin memastikan kebutuhan Anda terpenuhi.');
    } else if (action === 'resolve') {
      await handleResolveEscalation(id);
    }
  });
}

function bindExportButtons() {
  const analyticsExport = document.getElementById('analytics-export');
  if (analyticsExport) {
    analyticsExport.addEventListener('click', () => {
      const rows = DashboardState.analyticsWidgets.map((widget) => `"${widget.title}","${widget.value}","${widget.description}"`);
      const header = '"Metric","Value","Description"';
      downloadFile([header, ...rows].join('\n'), `analytics-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
    });
  }
}

function prepareCustomerRows(customers) {
  return customers.map((customer) => {
    const priority = (customer.priority || customer.customer_priority || 'medium').toLowerCase();
    const status = (customer.status || customer.customer_status || 'Active').toLowerCase();
    return {
      sourceId: customer.phone || customer.customer_id || customer.id || customer.email || customer.name,
      name: customer.name || customer.customer_name || 'Unknown Customer',
      phone: customer.phone || customer.whatsapp || '-',
      status,
      statusLabel: capitalize(status),
      lastContact: customer.last_contact || customer.last_interaction,
      responseTime: customer.response_time ? `${customer.response_time} mnt` : customer.avg_response_time ? `${customer.avg_response_time} mnt` : null,
      priority,
      priorityLabel: capitalize(priority)
    };
  });
}

function prepareEscalationRows(escalations) {
  return escalations.map((item) => {
    const priority = (item.priority || 'medium').toLowerCase();
    const status = (item.status || 'Open').toLowerCase();
    const sourceId = item.id || item.escalation_id || `${item.customer_name}-${item.created_at}`;
    return {
      ...item,
      sourceId,
      priority,
      status,
      contact: item.customer_phone || item.contact || '-',
      created_at: item.created_at || item.createdAt || item.created || item.updated_at
    };
  });
}

function prepareLeadRows(leads) {
  return leads.map((lead) => {
    const status = (lead.status || 'new').toLowerCase();
    return {
      sourceId: lead.id || lead.phone || `${lead.name}-${lead.source}`,
      name: lead.name || 'Unknown Lead',
      contact: lead.phone || lead.email || '-',
      source: lead.source || lead.market_segment || 'N/A',
      status,
      statusLabel: capitalize(status),
      scoreValue: lead.lead_score || lead.score || lead.score_value || null,
      followUp: lead.follow_up || lead.follow_up_date || lead.last_interaction,
      owner: lead.owner || lead.assignee || 'Unassigned'
    };
  });
}

function deriveActivities(state) {
  const items = [];
  (Array.isArray(state.customers) ? state.customers : []).slice(0, 5).forEach((customer) => {
    items.push({
      title: `${customer.name || 'Unknown'} melakukan interaksi`,
      detail: `Status: ${capitalize(customer.status || 'active')} • Prioritas ${capitalize(customer.priority || 'medium')}`,
      time: customer.last_interaction || customer.last_contact
    });
  });

  (Array.isArray(state.leads) ? state.leads : []).slice(0, 5).forEach((lead) => {
    items.push({
      title: `Lead ${lead.name || 'Unknown'} diperbarui`,
      detail: `Source ${lead.source || lead.market_segment || 'N/A'} • Score ${lead.lead_score || lead.score || '-'}`,
      time: lead.follow_up || lead.updated_at || lead.created_at
    });
  });

  return items.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)).slice(0, 8);
}

function deriveNotifications(state) {
 return (Array.isArray(state.escalations) ? state.escalations : [])
    .filter((item) => (item.status || '').toLowerCase() !== 'resolved')
    .slice(0, 5)
    .map((item) => ({
      title: `${item.customer_name || 'Unknown'} - ${capitalize(item.priority || 'medium')} priority`,
      detail: item.issue || item.escalation_type || 'Escalation ticket',
      priority: capitalize(item.priority || 'medium')
    }));
}

function renderActivities() {
  const container = document.getElementById('recent-activities');
  const template = document.getElementById('activity-item-template');
  if (!container || !template) return;

  container.innerHTML = '';
  DashboardState.activities.forEach((activity) => {
    const node = template.content.cloneNode(true);
    node.querySelector('.activity-title').textContent = activity.title;
    node.querySelector('.activity-detail').textContent = activity.detail;
    node.querySelector('.activity-time').textContent = activity.time ? moment(activity.time).fromNow() : '-';
    container.appendChild(node);
  });
}

function renderNotifications() {
  const container = document.getElementById('notification-list');
  const template = document.getElementById('notification-item-template');
  const badge = document.getElementById('notification-badge');
  if (!container || !template || !badge) return;

  container.innerHTML = '';
  DashboardState.notifications.forEach((item) => {
    const node = template.content.cloneNode(true);
    node.querySelector('.notification-title').textContent = item.title;
    node.querySelector('.notification-detail').textContent = item.detail;
    node.querySelector('.notification-priority').textContent = item.priority;
    container.appendChild(node);
  });

  badge.textContent = `${DashboardState.notifications.length} Urgent`;
}

function renderEscalationBadges() {
  const openCountEl = document.getElementById('open-escalations-count');
  const resolvedCountEl = document.getElementById('resolved-escalations-count');
  if (!openCountEl || !resolvedCountEl) return;

  const open = DashboardState.escalations.filter((item) => (item.status || '').toLowerCase() !== 'resolved').length;
  const resolved = DashboardState.escalations.length - open;

  openCountEl.textContent = `${open} Open`;
  resolvedCountEl.textContent = `${resolved} Resolved`;
}

function renderStats() {
  const stats = DashboardState.stats || {};
  const totals = {
    customers: stats.totalCustomers || stats.total_customers || 0,
    leads: stats.totalLeads || stats.total_leads || 0,
    escalations: stats.totalEscalations || stats.total_escalations || 0,
    responseRate: stats.responseRate || stats.response_rate || 0
  };

  document.getElementById('total-customers').textContent = formatNumber(totals.customers);
  document.getElementById('total-leads').textContent = formatNumber(totals.leads);
  document.getElementById('total-escalations').textContent = formatNumber(totals.escalations);
  document.getElementById('response-rate').textContent = `${Math.round(totals.responseRate)}%`;

  updateDeltaBadge('customers-delta', stats.customersDelta || stats.customers_delta);
  updateDeltaBadge('leads-delta', stats.leadsDelta || stats.leads_delta);
  updateDeltaBadge('escalations-delta', stats.escalationsDelta || stats.escalations_delta, true);
  updateDeltaBadge('response-rate-delta', stats.responseDelta || stats.response_delta);

  document.getElementById('customers-period').textContent = stats.customersPeriod || 'vs minggu lalu';
  document.getElementById('leads-period').textContent = stats.leadsPeriod || 'vs minggu lalu';
  document.getElementById('escalations-period').textContent = stats.escalationsPeriod || 'vs minggu lalu';
  document.getElementById('response-period').textContent = stats.responsePeriod || 'SLA realtime';
}

function renderTeamLeaderboard() {
  const list = document.getElementById('team-leaderboard');
  if (!list) return;

  const teamData = DashboardState.stats?.teamPerformance || DashboardState.stats?.team_performance || [];
  const fallback = DashboardState.customers
    .reduce((acc, customer) => {
      const owner = customer.owner || customer.agent || 'Tim A';
      acc[owner] = acc[owner] || { name: owner, handled: 0, sla: 0 };
      acc[owner].handled += 1;
      acc[owner].sla += customer.response_time || customer.avg_response_time || 30;
      return acc;
    }, {});

  const dataset = teamData.length
    ? teamData
    : Object.values(fallback).map((item) => ({
        name: item.name,
        handled: item.handled,
        sla: Math.round(item.sla / item.handled)
      }));

  list.innerHTML = dataset
    .sort((a, b) => (b.score || b.handled) - (a.score || a.handled))
    .slice(0, 5)
    .map((member, index) => `
      <li class="flex items-center justify-between rounded-2xl bg-white/60 p-4 shadow-sm">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sm font-semibold text-sky-500">#${index + 1}</span>
          <div>
            <p class="text-sm font-semibold text-slate-700">${escapeHTML(member.name || 'Unknown')}</p>
            <p class="text-xs text-slate-400">${member.handled || member.total || 0} tiket ditangani • SLA ${member.sla || member.avg_sla || 25}m</p>
          </div>
        </div>
        <span class="text-sm font-semibold text-emerald-500">${member.score ? `${member.score}%` : '⭐️'}</span>
      </li>
    `)
    .join('');
}

function renderCSAT() {
  const scoreEl = document.getElementById('csat-score');
  const starsEl = document.getElementById('csat-stars');
  const summaryEl = document.getElementById('csat-summary');
  if (!scoreEl || !starsEl || !summaryEl) return;

  const csat = DashboardState.stats?.csat || { score: 4.7, trend: 5, summary: 'Mayoritas pelanggan memberikan rating sangat baik.' };
  const score = csat.score || 4.6;

  scoreEl.textContent = score.toFixed(1);
  summaryEl.textContent = csat.summary || 'Mayoritas pelanggan memberikan rating sangat baik.';
  const stars = Math.round(score);
  starsEl.innerHTML = new Array(5)
    .fill(null)
    .map((_, idx) => `<i data-lucide="${idx < stars ? 'star' : 'star-off'}" class="h-5 w-5"></i>`)
    .join('');
  refreshIcons();
}

function populateLeadOwners() {
  const select = document.getElementById('lead-owner-filter');
  if (!select) return;

  const owners = extractUnique(DashboardState.leads, 'owner');
  select.innerHTML = '<option value="all">Semua</option>' + owners.map((owner) => `<option value="${escapeHTML(owner)}">${escapeHTML(owner)}</option>`).join('');

  select.addEventListener('change', () => {
    const value = select.value;
    DashboardState.tableManagers.leads.filterCallback = (item, statusValue) => {
      const statusMatch = !statusValue || statusValue === 'all' || (item.status || '').toLowerCase() === statusValue.toLowerCase();
      const ownerMatch = value === 'all' || (item.owner || '').toLowerCase() === value.toLowerCase();
      return statusMatch && ownerMatch;
    };
    DashboardState.tableManagers.leads.applyFilters();
  });
}

async function openCustomerDetail(id) {
  try {
    const detailResponse = await apiConnector.getCustomerDetails(id);
    const detail = detailResponse.data || detailResponse;

    const content = `
      <div class="space-y-6">
        <section class="rounded-3xl bg-white/60 p-4 shadow-sm">
          <h4 class="text-sm font-semibold text-slate-500 uppercase tracking-wide">Profil Customer</h4>
          <dl class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><dt class="text-xs text-slate-400">Nama</dt><dd class="text-sm font-medium text-slate-700">${escapeHTML(detail.name || '-')}</dd></div>
            <div><dt class="text-xs text-slate-400">Telepon</dt><dd class="text-sm font-medium text-slate-700">${escapeHTML(detail.phone || '-')}</dd></div>
            <div><dt class="text-xs text-slate-400">Lokasi</dt><dd class="text-sm text-slate-600">${escapeHTML(detail.location || '-')}</dd></div>
            <div><dt class="text-xs text-slate-400">Prioritas</dt><dd><span class="badge ${priorityToBadge(detail.customer_priority)}">${escapeHTML(capitalize(detail.customer_priority || '-'))}</span></dd></div>
          </dl>
        </section>
        <section class="rounded-3xl bg-white/60 p-4 shadow-sm">
          <h4 class="text-sm font-semibold text-slate-500 uppercase tracking-wide">Riwayat Kontak</h4>
          ${(detail.contact_history || []).map((item) => `
            <div class="mt-3 rounded-2xl bg-white/60 p-3">
              <p class="text-sm font-medium text-slate-700">${escapeHTML(item.channel || 'Chat')}</p>
              <p class="text-xs text-slate-400">${moment(item.time).fromNow()} • ${moment(item.time).format('DD MMM YYYY HH:mm')}</p>
              <p class="mt-2 text-sm text-slate-600">${escapeHTML(item.summary || item.notes || 'Tidak ada catatan')}</p>
            </div>
          `).join('') || '<p class="mt-3 text-sm text-slate-400">Belum ada riwayat.</p>'}
        </section>
      </div>
    `;

    openModal({
      title: detail.name || 'Customer Detail',
      subtitle: detail.phone || 'Detail pelanggan',
      content
    });
  } catch (error) {
    console.error('Customer detail error', error);
    showToast('Gagal memuat detail pelanggan', 'error');
  }
}

function openLeadDetail(id) {
  const lead = DashboardState.leads.find((item) => (item.id || item.phone || item.name) === id || (item.phone === id));
  if (!lead) {
    showToast('Lead tidak ditemukan', 'error');
    return;
  }

  const content = `
    <div class="space-y-6">
      <section class="rounded-3xl bg-white/60 p-4 shadow-sm">
        <h4 class="text-sm font-semibold text-slate-500 uppercase tracking-wide">Informasi Lead</h4>
        <dl class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><dt class="text-xs text-slate-400">Nama</dt><dd class="text-sm font-medium text-slate-700">${escapeHTML(lead.name || '-')}</dd></div>
          <div><dt class="text-xs text-slate-400">Kontak</dt><dd class="text-sm font-medium text-slate-700">${escapeHTML(lead.phone || lead.email || '-')}</dd></div>
          <div><dt class="text-xs text-slate-400">Source</dt><dd class="text-sm text-slate-600">${escapeHTML(lead.source || lead.market_segment || '-')}</dd></div>
          <div><dt class="text-xs text-slate-400">Status</dt><dd><span class="badge ${statusToBadge(lead.status)}">${escapeHTML(capitalize(lead.status || '-'))}</span></dd></div>
          <div><dt class="text-xs text-slate-400">Score</dt><dd class="text-sm font-medium text-slate-700">${escapeHTML(lead.lead_score || lead.score || '-')}</dd></div>
          <div><dt class="text-xs text-slate-400">Assigned</dt><dd class="text-sm text-slate-600">${escapeHTML(lead.owner || lead.assignee || 'Unassigned')}</dd></div>
        </dl>
      </section>
      <section class="rounded-3xl bg-white/60 p-4 shadow-sm">
        <h4 class="text-sm font-semibold text-slate-500 uppercase tracking-wide">Timeline Interaksi</h4>
        ${(lead.timeline || []).map((item) => `
          <div class="mt-3 rounded-2xl bg-white/60 p-3">
            <p class="text-sm font-medium text-slate-700">${escapeHTML(item.channel || 'Aktivitas')}</p>
            <p class="text-xs text-slate-400">${moment(item.time).format('DD MMM YYYY HH:mm')}</p>
            <p class="mt-2 text-sm text-slate-600">${escapeHTML(item.notes || '-')}</p>
          </div>
        `).join('') || '<p class="mt-3 text-sm text-slate-400">Belum ada interaksi.</p>'}
      </section>
    </div>
  `;

  openModal({
    title: lead.name || 'Lead Detail',
    subtitle: lead.phone || lead.email || '',
    content
  });
}

function openEscalationDetail(id) {
  const escalation = DashboardState.escalations.find((item) => (item.id || item.escalation_id || `${item.customer_name}-${item.created_at}`) === id);
  if (!escalation) {
    showToast('Escalation tidak ditemukan', 'error');
    return;
  }

  const timeline = escalation.timeline || [];
  const content = `
    <div class="space-y-6">
      <section class="rounded-3xl bg-white/60 p-4 shadow-sm">
        <h4 class="text-sm font-semibold text-slate-500 uppercase tracking-wide">Detail Escalation</h4>
        <dl class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><dt class="text-xs text-slate-400">Customer</dt><dd class="text-sm font-medium text-slate-700">${escapeHTML(escalation.customer_name || '-')}</dd></div>
          <div><dt class="text-xs text-slate-400">Prioritas</dt><dd><span class="badge ${priorityToBadge(escalation.priority)}">${escapeHTML(capitalize(escalation.priority || '-'))}</span></dd></div>
          <div><dt class="text-xs text-slate-400">Status</dt><dd><span class="badge ${statusToBadge(escalation.status)}">${escapeHTML(capitalize(escalation.status || '-'))}</span></dd></div>
          <div><dt class="text-xs text-slate-400">Dibuat</dt><dd class="text-sm text-slate-600">${moment(escalation.created_at).format('DD MMM YYYY HH:mm')}</dd></div>
          <div class="sm:col-span-2"><dt class="text-xs text-slate-400">Deskripsi</dt><dd class="text-sm text-slate-600">${escapeHTML(escalation.issue || escalation.description || '-')}</dd></div>
        </dl>
      </section>
      <section class="rounded-3xl bg-white/60 p-4 shadow-sm">
        <h4 class="text-sm font-semibold text-slate-500 uppercase tracking-wide">Timeline</h4>
        ${timeline.map((item) => `
          <div class="mt-3 rounded-2xl bg-white/60 p-3">
            <p class="text-sm font-medium text-slate-700">${escapeHTML(item.status || 'Update')}</p>
            <p class="text-xs text-slate-400">${moment(item.time || item.timestamp).format('DD MMM YYYY HH:mm')}</p>
            <p class="mt-2 text-sm text-slate-600">${escapeHTML(item.notes || '-')}</p>
          </div>
        `).join('') || '<p class="mt-3 text-sm text-slate-400">Belum ada timeline.</p>'}
      </section>
    </div>
  `;

  openModal({
    title: `Escalation • ${escalation.customer_name || 'Detail'}`,
    subtitle: capitalize(escalation.priority || 'medium'),
    content
  });
}

async function openCustomerChat(id) {
  try {
    const chatResponse = await apiConnector.getChatHistory(id);
    const chat = chatResponse.data || chatResponse;

    const messages = (chat.messages || chat || []).map((message) => `
      <div class="rounded-2xl bg-white/60 p-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-slate-700">${escapeHTML(message.sender || 'Agent')}</span>
          <span class="text-xs text-slate-400">${moment(message.time || message.timestamp).format('DD MMM YYYY HH:mm')}</span>
        </div>
        <p class="mt-2 text-sm text-slate-600">${escapeHTML(message.text || message.body || '')}</p>
      </div>
    `);

    openModal({
      title: 'Chat History',
      subtitle: id,
      content: `<div class="space-y-3">${messages.join('') || '<p class="text-sm text-slate-400">Belum ada percakapan.</p>'}</div>`
    });
  } catch (error) {
    console.error('Chat history error', error);
    showToast('Gagal memuat chat history', 'error');
  }
}

async function handleSendMessage(target, message) {
  if (!target || !message) {
    showToast('Nomor dan pesan harus diisi', 'error');
    return;
  }

  try {
    await apiConnector.contactLead(target, message);
    showToast('Pesan berhasil dikirim', 'success');
    closeModal();
  } catch (error) {
    console.error('Send message error', error);
    try {
      await webhookApiConnector.sendWhatsAppMessage(target, message);
      showToast('Pesan dikirim via webhook fallback', 'success');
      closeModal();
    } catch (fallbackError) {
      console.error('Webhook fallback error', fallbackError);
      showToast('Gagal mengirim pesan: ' + fallbackError.message, 'error');
    }
  }
}

async function handleResolveEscalation(id, notes = '') {
  if (!id) {
    showToast('Pilih escalation terlebih dahulu', 'error');
    return;
  }

  try {
    await apiConnector.resolveEscalation(id, notes);
    showToast('Escalation berhasil diselesaikan', 'success');
    closeModal();
    await refreshData();
  } catch (error) {
    console.error('Resolve escalation error', error);
    try {
      await webhookApiConnector.resolveEscalation(id);
      showToast('Escalation diselesaikan via webhook fallback', 'success');
      closeModal();
      await refreshData();
    } catch (fallbackError) {
      console.error('Webhook resolve escalation error', fallbackError);
      showToast('Gagal menyelesaikan escalation: ' + fallbackError.message, 'error');
    }
  }
}

function renderAnalyticsWidgets() {
  const container = document.getElementById('analytics-widgets');
  if (!container) return;

  const range = Number(document.getElementById('analytics-range').value || 7);
  const stats = DashboardState.stats || {};
  const analytics = [
    {
      title: 'Conversion Rate',
      value: `${((stats.conversionRate || stats.conversion_rate || 0) * 100).toFixed(1)}%`,
      trend: stats.conversionTrend || '+2.4%',
      description: `Performa ${range} hari terakhir`,
      icon: 'trending-up'
    },
    {
      title: 'Average Response Time',
      value: `${stats.avgResponseTime || stats.avg_response_time || 28}m`,
      trend: stats.responseDelta ? `${stats.responseDelta.toFixed(1)}%` : '-1.8%',
      description: 'Waktu rata-rata agent menanggapi tiket',
      icon: 'timer'
    },
    {
      title: 'Tickets Resolved',
      value: formatNumber(stats.resolvedTickets || stats.resolved_tickets || DashboardState.escalations.filter((item) => (item.status || '').toLowerCase() === 'resolved').length),
      trend: stats.resolvedDelta ? `${stats.resolvedDelta.toFixed(1)}%` : '+4.1%',
      description: 'Jumlah tiket closed periode ini',
      icon: 'shield-check'
    },
    {
      title: 'Net Promoter Score',
      value: stats.nps || 62,
      trend: stats.npsTrend || '+3 pts',
      description: 'Skor kepuasan pelanggan',
      icon: 'smile'
    },
    {
      title: 'Revenue Impact',
      value: `Rp ${formatNumber(stats.pipelineValue || stats.pipeline_value || 0)}`,
      trend: stats.pipelineTrend || '+8.2%',
      description: 'Estimasi nilai pipeline aktif',
      icon: 'coins'
    },
    {
      title: 'Active Campaigns',
      value: stats.activeCampaigns || stats.active_campaigns || DashboardState.leads.length,
      trend: stats.campaignTrend || '+1 kampanye',
      description: 'Marketing channel yang berjalan',
      icon: 'megaphone'
    }
  ];

  DashboardState.analyticsWidgets = analytics;
  container.innerHTML = analytics
    .map((item) => `
      <article class="glass-muted rounded-3xl p-5 shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">${escapeHTML(item.title)}</p>
            <p class="mt-2 text-2xl font-semibold text-slate-800">${escapeHTML(item.value)}</p>
          </div>
          <span class="rounded-2xl bg-sky-500/10 p-3 text-sky-500"><i data-lucide="${item.icon}"></i></span>
        </div>
        <div class="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span class="badge badge-success">${escapeHTML(item.trend)}</span>
          <span>${escapeHTML(item.description)}</span>
        </div>
      </article>
    `)
    .join('');
  refreshIcons();
}

function updateNewItemsBadge() {
  const badge = document.getElementById('new-items-count');
  const realtime = document.getElementById('realtime-status');
  if (!badge || !realtime) return;

  const currentIds = new Set(DashboardState.escalations.map((item) => item.id || item.escalation_id));
  let newItems = 0;
  currentIds.forEach((id) => {
    if (id && !DashboardState.previousEscalationIds.has(id)) {
      newItems += 1;
    }
  });

  badge.textContent = newItems;
  realtime.textContent = newItems > 0 ? `${newItems} tiket baru` : 'Standby';
  realtime.className = newItems > 0 ? 'text-emerald-500 font-semibold' : 'text-slate-500';

  DashboardState.previousEscalationIds = currentIds;
}

function filterByDateRange(type) {
  if (type !== 'customer') return;
  const from = document.getElementById('customer-date-from').value;
  const to = document.getElementById('customer-date-to').value;

  DashboardState.tableManagers.customers.filterCallback = (item, priorityValue) => {
    const priorityMatch = !priorityValue || priorityValue === 'all' || (item.priority || '').toLowerCase() === priorityValue.toLowerCase();
    if (!priorityMatch) return false;

    if (!from && !to) return true;
    const date = item.lastContact ? moment(item.lastContact) : null;
    if (!date || !date.isValid()) return false;

    const afterFrom = from ? date.isSameOrAfter(moment(from)) : true;
    const beforeTo = to ? date.isSameOrBefore(moment(to).endOf('day')) : true;
    return afterFrom && beforeTo;
  };

  DashboardState.tableManagers.customers.applyFilters();
  const rangeLabel = document.getElementById('active-date-range');
  if (rangeLabel) {
    if (from || to) {
      rangeLabel.textContent = `${from || 'awal'} s/d ${to || 'sekarang'}`;
    } else {
      rangeLabel.textContent = 'Semua waktu';
    }
  }
}

async function testConnection() {
  try {
    const result = await apiConnector.healthCheck();
    updateConnectionStatus(result.status === 'connected' ? 'connected' : 'error');
  } catch (error) {
    updateConnectionStatus('error');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await testConnection();
  await initializeDashboard();
});

