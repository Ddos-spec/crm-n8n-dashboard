const DashboardState = {
  stats: null,
  customers: [],
  leads: [],
  escalations: [],
  activities: [],
  notifications: [],
  lastRefresh: null,
  refreshInterval: 0,
  countdownTimer: null,
  countdownValue: 0,
  previousEscalationIds: new Set(),
  charts: {},
  tableManagers: {},
  analyticsWidgets: [],
  theme: 'light'
};

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.records)) return value.records;

  return Object.values(value).reduce((acc, item) => {
    if (Array.isArray(item)) {
      acc.push(...item);
    } else if (item && typeof item === 'object') {
      acc.push(item);
    }
    return acc;
  }, []);
}

class TableManager {
  constructor({
    tableId,
    searchInputId,
    filterId = null,
    filterCallback = null,
    paginationId,
    summaryId,
    exportButtonId = null,
    pageSizeOptions = [10, 25, 50],
    columns
  }) {
    this.table = document.querySelector(`#${tableId} tbody`);
    this.tableElement = document.getElementById(tableId);
    this.searchInput = searchInputId ? document.getElementById(searchInputId) : null;
    this.filterElement = filterId ? document.getElementById(filterId) : null;
    this.filterCallback = filterCallback;
    this.paginationEl = document.getElementById(paginationId);
    this.summaryEl = summaryId ? document.getElementById(summaryId) : null;
    this.exportButton = exportButtonId ? document.getElementById(exportButtonId) : null;
    this.pageSizeOptions = pageSizeOptions;
    this.columns = columns;
    this.currentPage = 1;
    this.pageSize = pageSizeOptions[0];
    this.data = [];
    this.filtered = [];
    this.sortKey = null;
    this.sortDirection = 'asc';

    this.setupEvents();
  }

  setupEvents() {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => {
        this.currentPage = 1;
        this.applyFilters();
      });
    }

    if (this.filterElement && this.filterCallback) {
      this.filterElement.addEventListener('change', () => {
        this.currentPage = 1;
        this.applyFilters();
      });
    }

    if (this.tableElement) {
      const headers = this.tableElement.querySelectorAll('thead th[data-sort]');
      headers.forEach((header) => {
        header.addEventListener('click', () => {
          const key = header.dataset.sort;
          this.toggleSort(key);
        });
      });
    }

    if (this.exportButton) {
      this.exportButton.addEventListener('click', () => {
        this.exportCSV();
      });
    }
  }

  setData(data) {
    this.data = Array.isArray(data) ? data : [];
    this.applyFilters();
  }

  applyFilters() {
    const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
    const filterValue = this.filterElement ? this.filterElement.value : 'all';

    this.filtered = this.data.filter((item) => {
      const matchesSearch = !searchTerm || this.columns.some((col) => {
        if (col.excludeFromSearch) return false;
        const value = typeof col.accessor === 'function' ? col.accessor(item) : item[col.key];
        return value && value.toString().toLowerCase().includes(searchTerm);
      });

      const matchesFilter = this.filterCallback ? this.filterCallback(item, filterValue) : true;
      return matchesSearch && matchesFilter;
    });

    if (this.sortKey) {
      this.filtered.sort((a, b) => this.compareValues(a, b));
    }

    this.render();
  }

  toggleSort(key) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }

    this.applyFilters();
  }

  compareValues(a, b) {
    const column = this.columns.find((col) => col.key === this.sortKey);
    if (!column) return 0;

    const valueA = typeof column.accessor === 'function' ? column.accessor(a) : a[column.key];
    const valueB = typeof column.accessor === 'function' ? column.accessor(b) : b[column.key];

    if (valueA === valueB) return 0;
    if (valueA === undefined || valueA === null) return this.sortDirection === 'asc' ? -1 : 1;
    if (valueB === undefined || valueB === null) return this.sortDirection === 'asc' ? 1 : -1;

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return this.sortDirection === 'asc'
        ? valueA.localeCompare(valueB, 'id')
        : valueB.localeCompare(valueA, 'id');
    }

    return this.sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
  }

  render() {
    if (!this.table) return;

    const totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    const pageData = this.filtered.slice(start, start + this.pageSize);

    const rows = pageData.map((item) => {
      const cells = this.columns
        .map((col) => {
          const content = col.render
            ? col.render(item)
            : escapeHTML(
                typeof col.accessor === 'function'
                  ? col.accessor(item) ?? ''
                  : item[col.key] ?? ''
              );
          const label = escapeHTML(col.label ?? col.key);
          return `<td data-label="${label}">${content}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    });

    this.table.innerHTML = rows.join('') ||
      '<tr><td colspan="100%" class="py-10 text-center text-sm text-slate-400">Tidak ada data untuk ditampilkan.</td></tr>';

    this.renderPagination(totalPages);
    this.renderSummary(pageData.length);
    refreshIcons();
  }

  renderPagination(totalPages) {
    if (!this.paginationEl) return;

    const controls = [];
    controls.push(`
      <button class="rounded-full px-3 py-1 text-xs font-semibold ${this.currentPage === 1 ? 'text-slate-400' : 'text-sky-500'}"
        ${this.currentPage === 1 ? 'disabled' : ''} data-page="prev">Prev</button>
    `);

    controls.push(`<span class="text-xs text-slate-400">Halaman ${this.currentPage} dari ${totalPages}</span>`);

    controls.push(`
      <button class="rounded-full px-3 py-1 text-xs font-semibold ${this.currentPage === totalPages ? 'text-slate-400' : 'text-sky-500'}"
        ${this.currentPage === totalPages ? 'disabled' : ''} data-page="next">Next</button>
    `);

    controls.push(`
      <label class="flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1">
        <span class="text-xs text-slate-400">Show</span>
        <select class="rounded-full border-none bg-transparent text-xs focus:ring-0" data-page="size">
          ${this.pageSizeOptions
            .map((size) => `<option value="${size}" ${size === this.pageSize ? 'selected' : ''}>${size}</option>`)
            .join('')}
        </select>
      </label>
    `);

    this.paginationEl.innerHTML = controls.join('');

    this.paginationEl.querySelectorAll('button[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.page;
        if (type === 'prev' && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        if (type === 'next' && this.currentPage < totalPages) {
          this.currentPage += 1;
        }
        this.render();
      });
    });

    const select = this.paginationEl.querySelector('select[data-page="size"]');
    if (select) {
      select.addEventListener('change', () => {
        this.pageSize = Number(select.value);
        this.currentPage = 1;
        this.render();
      });
    }
  }

  renderSummary(currentCount) {
    if (!this.summaryEl) return;
    const total = this.filtered.length;
    const start = total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    const end = (this.currentPage - 1) * this.pageSize + currentCount;
    this.summaryEl.textContent = `Menampilkan ${start}-${end} dari ${total} entri`;
  }

  exportCSV() {
    const headers = this.columns
      .filter((col) => !col.excludeFromExport)
      .map((col) => '"' + (col.label ?? col.key) + '"');

    const rows = this.filtered.map((item) => {
      return this.columns
        .filter((col) => !col.excludeFromExport)
        .map((col) => {
          const value = col.exportAccessor
            ? col.exportAccessor(item)
            : typeof col.accessor === 'function'
              ? col.accessor(item)
              : item[col.key];
          return '"' + (value ?? '').toString().replace(/"/g, '""') + '"';
        })
        .join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadFile(csvContent, `${this.tableElement.id}-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }
}

function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return value
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function showLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.remove('hidden');
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function updateConnectionStatus(status) {
  const indicator = document.getElementById('connection-indicator');
  const text = document.getElementById('connection-status');
  if (!indicator || !text) return;

  indicator.classList.remove('bg-emerald-400', 'bg-amber-400', 'bg-rose-500');
  if (status === 'connected') {
    indicator.classList.add('bg-emerald-400');
    text.textContent = 'Terhubung dengan n8n';
  } else if (status === 'connecting') {
    indicator.classList.add('bg-amber-400');
    text.textContent = 'Menghubungkan...';
  } else {
    indicator.classList.add('bg-rose-500');
    text.textContent = 'Terputus - cek proxy Cloudflare';
  }
}

async function initializeDashboard() {
  moment.locale(CONFIG.ui.language || 'id');
  refreshIcons();
  setupTabs();
  setupQuickActions();
  setupModal();
  setupAutoRefresh();
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
        openQuickActionModal('Assign Lead', 'Distribusikan lead baru ke anggota tim.', renderAssignLeadForm());
      } else if (action === 'resolve-escalation') {
        openQuickActionModal('Resolve Escalation', 'Tandai tiket kritikal sebagai selesai.', renderResolveEscalationForm());
      } else if (action === 'send-message') {
        openQuickActionModal('Send Message', 'Kirim pesan ke pelanggan prioritas tinggi.', renderSendMessageForm());
      }
    });
  });
}

function renderAssignLeadForm() {
  const owners = extractUnique(DashboardState.leads, 'owner');
  return `
    <form id="assign-lead-form" class="space-y-4">
      <div>
        <label class="text-sm font-medium text-slate-500">Pilih Lead</label>
        <select name="lead" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
          ${DashboardState.leads
            .map((lead) => `<option value="${escapeHTML(lead.id ?? lead.phone ?? lead.name)}">${escapeHTML(lead.name || 'Tanpa nama')} • ${escapeHTML(lead.status || 'unknown')}</option>`)
            .join('')}
        </select>
      </div>
      <div>
        <label class="text-sm font-medium text-slate-500">Assign ke</label>
        <select name="owner" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
          ${owners.map((owner) => `<option value="${escapeHTML(owner)}">${escapeHTML(owner)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="text-sm font-medium text-slate-500">Catatan</label>
        <textarea name="notes" rows="3" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" placeholder="Instruksi singkat"></textarea>
      </div>
      <button type="submit" class="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white">Assign Sekarang</button>
    </form>
  `;
}

function renderResolveEscalationForm() {
  const openEscalations = DashboardState.escalations.filter((item) => (item.status || '').toLowerCase() !== 'resolved');
  return `
    <form id="resolve-escalation-form" class="space-y-4">
      <div>
        <label class="text-sm font-medium text-slate-500">Pilih Escalation</label>
        <select name="escalation" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
          ${openEscalations
            .map((item) => `<option value="${escapeHTML(item.id ?? item.escalation_id ?? item.customer_name)}">${escapeHTML(item.customer_name || 'Unknown')} • ${escapeHTML(item.priority)}</option>`)
            .join('')}
        </select>
      </div>
      <div>
        <label class="text-sm font-medium text-slate-500">Catatan penyelesaian</label>
        <textarea name="notes" rows="3" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" placeholder="Langkah penyelesaian"></textarea>
      </div>
      <button type="submit" class="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-400 px-4 py-2 text-sm font-semibold text-white">Tandai Selesai</button>
    </form>
  `;
}

function renderSendMessageForm() {
  const highPriorityCustomers = DashboardState.customers.filter((cust) => (cust.priority || cust.customer_priority || '').toLowerCase() === 'high');
  return `
    <form id="send-message-form" class="space-y-4">
      <div>
        <label class="text-sm font-medium text-slate-500">Pilih Customer</label>
        <select name="customer" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
          ${highPriorityCustomers
            .map((cust) => `<option value="${escapeHTML(cust.phone || cust.customer_id || cust.id)}">${escapeHTML(cust.name || cust.customer_name || 'Unknown')} • ${escapeHTML(cust.phone || '')}</option>`)
            .join('')}
        </select>
      </div>
      <div>
        <label class="text-sm font-medium text-slate-500">Pesan</label>
        <textarea name="message" rows="3" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" placeholder="Masukkan pesan follow-up"></textarea>
      </div>
      <button type="submit" class="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-purple-400 px-4 py-2 text-sm font-semibold text-white">Kirim Pesan</button>
    </form>
  `;
}

function openQuickActionModal(title, subtitle, content) {
  openModal({ title, subtitle, content });

  const form = document.querySelector('#modal-content form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    if (form.id === 'assign-lead-form') {
      showToast('Lead assigned ke anggota tim', 'success');
      closeModal();
    } else if (form.id === 'resolve-escalation-form') {
      await handleResolveEscalation(formData.get('escalation'), formData.get('notes'));
    } else if (form.id === 'send-message-form') {
      await handleSendMessage(formData.get('customer'), formData.get('message'));
    }
  });
}

function setupModal() {
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');
  if (!overlay || !closeBtn) return;

  closeBtn.addEventListener('click', () => closeModal());
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });
}

function openModal({ title, subtitle, content }) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-subtitle').textContent = subtitle || '';
  document.getElementById('modal-content').innerHTML = content || '';

  overlay.classList.remove('hidden');
  setTimeout(() => overlay.classList.add('flex'), 10);
  refreshIcons();
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('flex');
  overlay.classList.add('hidden');
}

function setupAutoRefresh() {
  const select = document.getElementById('refresh-interval');
  if (!select) return;

  DashboardState.refreshInterval = Number(select.value) || 0;
  select.addEventListener('change', () => {
    DashboardState.refreshInterval = Number(select.value) || 0;
    restartCountdown();
  });
}

function restartCountdown() {
  clearInterval(DashboardState.countdownTimer);
  const countdownEl = document.getElementById('refresh-countdown');

  if (!DashboardState.refreshInterval) {
    DashboardState.countdownTimer = null;
    if (countdownEl) countdownEl.textContent = '';
    return;
  }

  DashboardState.countdownValue = DashboardState.refreshInterval / 1000;
  if (countdownEl) countdownEl.textContent = `(${DashboardState.countdownValue}s)`;

  DashboardState.countdownTimer = setInterval(async () => {
    DashboardState.countdownValue -= 1;
    if (countdownEl) countdownEl.textContent = `(${DashboardState.countdownValue}s)`;

    if (DashboardState.countdownValue <= 0) {
      clearInterval(DashboardState.countdownTimer);
      await refreshData();
    }
  }, 1000);
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

function formatDateCell(dateValue) {
  if (!dateValue) return '<span class="text-xs text-slate-400">No data</span>';
  const date = moment(dateValue);
  if (!date.isValid()) return `<span class="text-xs text-slate-400">${escapeHTML(dateValue)}</span>`;
  return `<div class="flex flex-col">
      <span class="text-sm text-slate-600">${date.fromNow()}</span>
      <span class="text-xs text-slate-400">${date.format('DD MMM YYYY, HH:mm')}</span>
    </div>`;
}

function statusToBadge(status) {
  const value = (status || '').toLowerCase();
  if (value.includes('resolved') || value.includes('won') || value.includes('active')) return 'badge-success';
  if (value.includes('pending') || value.includes('open') || value.includes('new')) return 'badge-warning';
  if (value.includes('escalated') || value.includes('lost')) return 'badge-danger';
  return 'badge-neutral';
}

function priorityToBadge(priority) {
  const value = (priority || '').toLowerCase();
  if (value === 'high' || value === 'urgent') return 'badge-danger';
  if (value === 'medium') return 'badge-warning';
  if (value === 'low') return 'badge-success';
  return 'badge-neutral';
}

function capitalize(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
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

function updateDeltaBadge(elementId, deltaValue, inverted = false) {
  const badge = document.getElementById(elementId);
  if (!badge) return;

  let value = Number(deltaValue);
  if (isNaN(value)) value = 0;
  badge.textContent = `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  badge.classList.remove('badge-success', 'badge-warning', 'badge-danger', 'badge-info');

  if (value === 0) {
    badge.classList.add('badge-info');
  } else if ((value > 0 && !inverted) || (value < 0 && inverted)) {
    badge.classList.add('badge-success');
  } else if (Math.abs(value) > 10) {
    badge.classList.add('badge-danger');
  } else {
    badge.classList.add('badge-warning');
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(value || 0);
}

function renderSparklineCharts() {
  const sparklineData = extractSparklineData(DashboardState.stats);
  createSparkline('sparkline-customers', sparklineData.customers);
  createSparkline('sparkline-leads', sparklineData.leads);
  createSparkline('sparkline-escalations', sparklineData.escalations);
  createSparkline('sparkline-response', sparklineData.responseRate);
}

function extractSparklineData(stats) {
  const fallback = Array.from({ length: 8 }).map((_, idx) => ({
    label: moment().subtract(7 - idx, 'days').format('DD MMM'),
    value: Math.round(Math.random() * 100)
  }));

  const safeArray = (arr) => (Array.isArray(arr) && arr.length ? arr : fallback);

  return {
    customers: safeArray(stats?.customerTrend || stats?.customer_trend),
    leads: safeArray(stats?.leadTrend || stats?.lead_trend),
    escalations: safeArray(stats?.escalationTrend || stats?.escalation_trend),
    responseRate: safeArray(stats?.responseTrend || stats?.response_trend)
  };
}

function createSparkline(elementId, dataset) {
  const ctx = document.getElementById(elementId);
  if (!ctx) return;

  const labels = dataset.map((item) => item.label || moment(item.date).format('DD MMM'));
  const data = dataset.map((item) => Number(item.value || item.total || 0));

  if (DashboardState.charts[elementId]) {
    DashboardState.charts[elementId].data.labels = labels;
    DashboardState.charts[elementId].data.datasets[0].data = data;
    DashboardState.charts[elementId].update();
    return;
  }

  DashboardState.charts[elementId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          data,
          fill: true,
          tension: 0.4,
          borderColor: 'rgba(56, 189, 248, 0.9)',
          backgroundColor: 'rgba(56, 189, 248, 0.2)',
          pointRadius: 0,
          pointHoverRadius: 3,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}

function renderOverviewCharts() {
  renderLineChart();
  renderEscalationChart();
  renderFunnelChart();
}

function renderLineChart() {
  const ctx = document.getElementById('chart-response-time');
  if (!ctx) return;

  const dataPoints = (DashboardState.stats?.responseTimeTrend || DashboardState.stats?.response_time_trend || []).map((item) => ({
    date: item.date || item.label,
    value: item.value || item.avg || item.average
  }));

  const dataset = dataPoints.length
    ? dataPoints
    : Array.from({ length: 7 }).map((_, idx) => ({
        date: moment().subtract(6 - idx, 'days').format('DD MMM'),
        value: 30 + Math.round(Math.random() * 20)
      }));

  const labels = dataset.map((item) => item.date);
  const values = dataset.map((item) => Number(item.value));

  createOrUpdateChart('chart-response-time', ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Average Response Time (minutes)',
          data: values,
          borderColor: 'rgba(14, 165, 233, 0.9)',
          backgroundColor: 'rgba(14, 165, 233, 0.2)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#0ea5e9',
          borderWidth: 2
        },
        {
          label: 'SLA Target',
          data: new Array(values.length).fill(20),
          borderColor: 'rgba(16, 185, 129, 0.8)',
          borderDash: [6, 6],
          fill: false,
          pointRadius: 0,
          borderWidth: 1.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#64748b' },
          grid: { color: 'rgba(148, 163, 184, 0.2)' }
        },
        x: {
          ticks: { color: '#94a3b8' },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { labels: { color: '#64748b' } },
        tooltip: {
          callbacks: {
            label: (context) => `${context.parsed.y} menit`
          }
        }
      }
    }
  });
}

function renderEscalationChart() {
  const ctx = document.getElementById('chart-escalations');
  if (!ctx) return;

  const escalations = ensureArray(DashboardState.escalations);

  const statusGroups = escalations.reduce(
    (acc, item) => {
      const status = (item.status || 'Open').toLowerCase();
      if (status.includes('resolved')) acc.resolved += 1;
      else if (status.includes('pending')) acc.pending += 1;
      else acc.open += 1;
      return acc;
    },
    { open: 0, pending: 0, resolved: 0 }
  );

  createOrUpdateChart('chart-escalations', ctx, {
    type: 'doughnut',
    data: {
      labels: ['Open', 'Pending', 'Resolved'],
      datasets: [
        {
          data: [statusGroups.open, statusGroups.pending, statusGroups.resolved],
          backgroundColor: ['#f97316', '#facc15', '#34d399'],
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#64748b' }
        }
      }
    }
  });
}

function renderFunnelChart() {
  const ctx = document.getElementById('chart-funnel');
  if (!ctx) return;

  const funnelData = DashboardState.stats?.funnel || DashboardState.stats?.conversionFunnel;
  const stages = funnelData?.stages || ['Leads', 'Qualified', 'Proposal', 'Won'];
  const values = funnelData?.values || [DashboardState.leads.length, Math.round(DashboardState.leads.length * 0.6), Math.round(DashboardState.leads.length * 0.3), Math.round(DashboardState.leads.length * 0.15)];

  createOrUpdateChart('chart-funnel', ctx, {
    type: 'bar',
    data: {
      labels: stages,
      datasets: [
        {
          data: values,
          backgroundColor: ['#38bdf8', '#22d3ee', '#a855f7', '#34d399'],
          borderRadius: 12,
          barPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: '#64748b' },
          grid: { color: 'rgba(148, 163, 184, 0.2)' }
        },
        y: {
          ticks: { color: '#64748b' },
          grid: { display: false }
        }
      }
    }
  });
}

function createOrUpdateChart(id, ctx, config) {
  const canvas = ctx instanceof HTMLCanvasElement ? ctx : document.getElementById(id);
  if (!canvas) return;

  const container = canvas.parentElement;

  const ensureFixedHeight = () => {
    if (container && !container.dataset.fixedHeight) {
      let measuredHeight = container.clientHeight;
      if (typeof window !== 'undefined' && window.getComputedStyle) {
        const computed = window.getComputedStyle(container);
        if (computed) {
          const paddingTop = parseFloat(computed.paddingTop) || 0;
          const paddingBottom = parseFloat(computed.paddingBottom) || 0;
          measuredHeight = Math.max(measuredHeight - (paddingTop + paddingBottom), 0);
        }
      }

      if (!measuredHeight) {
        measuredHeight = canvas.clientHeight;
      }

      if (!measuredHeight) {
        const inlineHeight = canvas.style.height || canvas.getAttribute('height');
        if (inlineHeight && !Number.isNaN(parseFloat(inlineHeight))) {
          measuredHeight = parseFloat(inlineHeight);
        } else if (typeof window !== 'undefined' && window.getComputedStyle) {
          const computedHeight = window.getComputedStyle(canvas).height;
          measuredHeight = parseFloat(computedHeight);
        }
      }

      const normalizedHeight = `${measuredHeight || 256}px`;
      container.dataset.fixedHeight = normalizedHeight;
      canvas.dataset.fixedHeight = normalizedHeight;
    } else if (!canvas.dataset.fixedHeight) {
      let measuredHeight = canvas.clientHeight;
      if (!measuredHeight) {
        const inlineHeight = canvas.style.height || canvas.getAttribute('height');
        if (inlineHeight && !Number.isNaN(parseFloat(inlineHeight))) {
          measuredHeight = parseFloat(inlineHeight);
        } else if (typeof window !== 'undefined' && window.getComputedStyle) {
          const computedHeight = window.getComputedStyle(canvas).height;
          measuredHeight = parseFloat(computedHeight);
        }
      }
      canvas.dataset.fixedHeight = `${measuredHeight || 256}px`;
    }
  };

  ensureFixedHeight();

  const fixedHeight = container?.dataset.fixedHeight || canvas.dataset.fixedHeight;
  if (fixedHeight) {
    if (container) {
      container.style.height = fixedHeight;
      container.style.maxHeight = fixedHeight;
    }

    canvas.style.height = fixedHeight;
    const numericHeight = parseFloat(fixedHeight);
    if (!Number.isNaN(numericHeight)) {
      canvas.setAttribute('height', numericHeight);
    }
  }
  canvas.style.width = '100%';

  if (DashboardState.charts[id]) {
    DashboardState.charts[id].destroy();
  }
  DashboardState.charts[id] = new Chart(canvas, config);
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

function extractUnique(collection, key) {
  const values = new Set();
  collection.forEach((item) => {
    const value = (item[key] || item[key]?.name || '').toString().trim();
    if (value) values.add(value);
  });
  return Array.from(values);
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
    showToast('Gagal mengirim pesan: ' + error.message, 'error');
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
    showToast('Gagal menyelesaikan escalation: ' + error.message, 'error');
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

function updateRefreshState() {
  DashboardState.lastRefresh = new Date();
  const lastUpdatedEl = document.getElementById('last-updated');
  if (lastUpdatedEl) {
    lastUpdatedEl.textContent = moment(DashboardState.lastRefresh).format('DD MMM YYYY HH:mm:ss');
  }
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

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = {
    success: 'from-emerald-500 to-green-400',
    error: 'from-rose-500 to-pink-500',
    info: 'from-sky-500 to-cyan-400'
  };

  const icon = {
    success: 'check-circle',
    error: 'alert-triangle',
    info: 'info'
  }[type] || 'bell';

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto rounded-2xl bg-gradient-to-r ${colors[type] || colors.info} px-4 py-3 text-white shadow-lg shadow-slate-900/20 transition`;
  toast.innerHTML = `
    <div class="flex items-center gap-3">
      <i data-lucide="${icon}" class="h-4 w-4"></i>
      <span class="text-sm font-medium">${escapeHTML(message)}</span>
    </div>
  `;
  container.appendChild(toast);
  refreshIcons();

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
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

