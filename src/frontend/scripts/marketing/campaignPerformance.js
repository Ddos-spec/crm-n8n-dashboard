import { apiConnector } from '../../services/apiConnector.js';
import { DashboardState } from '../state/dashboardState.js';
import { ensureArray, parseNumeric, formatNumber } from '../../shared/utils/index.js';
import { escapeHTML } from '../ui/dom.js';

const state = {
  initialized: false,
  loading: false,
  elements: null
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
});

function queryElements() {
  if (state.elements) {
    return state.elements;
  }

  const section = document.getElementById('campaign-performance-section');
  if (!section) {
    return null;
  }

  state.elements = {
    section,
    loading: section.querySelector('[data-role="campaign-loading"]'),
    content: section.querySelector('[data-role="campaign-content"]'),
    empty: section.querySelector('[data-role="campaign-empty"]'),
    tableBody: section.querySelector('[data-role="campaign-table-body"]'),
    summaries: section.querySelector('[data-role="campaign-summaries"]'),
    error: section.querySelector('[data-role="campaign-error"]')
  };

  return state.elements;
}

function showElement(element) {
  if (element) {
    element.classList.remove('hidden');
  }
}

function hideElement(element) {
  if (element) {
    element.classList.add('hidden');
  }
}

function showLoading(force = false) {
  const elements = queryElements();
  if (!elements) return;

  const shouldShow = force || (DashboardState.campaignPerformance || []).length === 0;
  if (!shouldShow) return;

  showElement(elements.loading);
  hideElement(elements.content);
  hideElement(elements.empty);
}

function hideLoading() {
  const elements = queryElements();
  if (!elements) return;

  hideElement(elements.loading);
}

function showError(message) {
  const elements = queryElements();
  if (!elements) return;

  if (elements.error) {
    elements.error.textContent = message;
    showElement(elements.error);
  }
}

function hideError() {
  const elements = queryElements();
  if (!elements) return;

  hideElement(elements.error);
}

function getNumericValue(item, keys, fallback = 0) {
  for (const key of keys) {
    if (key in item) {
      const value = parseNumeric(item[key]);
      if (value !== null) {
        return value;
      }
    }
  }
  return fallback;
}

function formatCurrency(value) {
  const numeric = parseNumeric(value);
  if (numeric === null) {
    return '—';
  }

  return currencyFormatter.format(numeric);
}

function formatPercentage(value) {
  const numeric = parseNumeric(value);
  if (numeric === null) {
    return '—';
  }

  const percent = numeric > 1 ? numeric : numeric * 100;
  return `${percent.toFixed(1)}%`;
}

function renderSummaries(items) {
  const elements = queryElements();
  if (!elements?.summaries) return;

  if (!items.length) {
    elements.summaries.innerHTML = '';
    return;
  }

  const totalSpend = items.reduce(
    (total, item) => total + getNumericValue(item, ['spend', 'total_spend', 'cost']),
    0
  );
  const totalLeads = items.reduce(
    (total, item) => total + getNumericValue(item, ['leads', 'leads_generated', 'total_leads']),
    0
  );
  const averageConversion = items.length
    ? items.reduce(
        (total, item) => total + getNumericValue(item, ['conversion_rate', 'cvr', 'conversion']),
        0
      ) / items.length
    : 0;
  const averageRoi = items.length
    ? items.reduce((total, item) => total + getNumericValue(item, ['roi', 'return_on_investment']), 0) /
      items.length
    : 0;

  const summaryCards = [
    {
      label: 'Total Kampanye',
      value: formatNumber(items.length)
    },
    {
      label: 'Leads Terkumpul',
      value: formatNumber(totalLeads)
    },
    {
      label: 'Rata-rata Konversi',
      value: formatPercentage(averageConversion)
    },
    {
      label: 'Rata-rata ROI',
      value: formatPercentage(averageRoi)
    },
    {
      label: 'Total Spend',
      value: formatCurrency(totalSpend)
    }
  ];

  elements.summaries.innerHTML = summaryCards
    .map(
      (card) => `
        <article class="glass-muted rounded-2xl p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">${escapeHTML(card.label)}</p>
          <p class="mt-2 text-2xl font-semibold text-slate-800">${escapeHTML(card.value)}</p>
        </article>
      `
    )
    .join('');
}

function renderTable(items) {
  const elements = queryElements();
  if (!elements?.tableBody) return;

  if (!items.length) {
    elements.tableBody.innerHTML = '';
    return;
  }

  elements.tableBody.innerHTML = items
    .map((item) => {
      const name = item.campaign_name || item.name || 'Tanpa Nama';
      const channel = item.channel || item.source || '—';
      const status = item.status || item.stage || '—';
      const spend = formatCurrency(
        getNumericValue(item, ['spend', 'total_spend', 'cost'])
      );
      const leads = formatNumber(
        getNumericValue(item, ['leads', 'leads_generated', 'total_leads'])
      );
      const conversion = formatPercentage(
        getNumericValue(item, ['conversion_rate', 'cvr', 'conversion'])
      );
      const roi = formatPercentage(getNumericValue(item, ['roi', 'return_on_investment']));

      return `
        <tr class="align-top">
          <td class="whitespace-nowrap">
            <div class="font-semibold text-slate-700">${escapeHTML(name)}</div>
            <div class="text-xs text-slate-400">${escapeHTML(channel)}</div>
          </td>
          <td class="text-sm text-slate-600">${escapeHTML(status)}</td>
          <td class="text-sm font-semibold text-slate-700">${escapeHTML(spend)}</td>
          <td class="text-sm font-semibold text-slate-700">${escapeHTML(leads)}</td>
          <td class="text-sm font-semibold text-emerald-600">${escapeHTML(conversion)}</td>
          <td class="text-sm font-semibold text-sky-600">${escapeHTML(roi)}</td>
        </tr>
      `;
    })
    .join('');
}

function renderCampaignPerformance(items) {
  const elements = queryElements();
  if (!elements) return;

  hideElement(elements.loading);

  if (!items.length) {
    hideElement(elements.content);
    showElement(elements.empty);
    renderSummaries([]);
    renderTable([]);
    return;
  }

  renderSummaries(items);
  renderTable(items);

  hideElement(elements.empty);
  showElement(elements.content);
}

export function initCampaignPerformance() {
  if (state.initialized) return;
  const elements = queryElements();
  if (!elements) return;

  showElement(elements.loading);
  hideElement(elements.content);
  hideElement(elements.empty);
  hideElement(elements.error);

  state.initialized = true;
}

export async function loadCampaignPerformance({ silent = false } = {}) {
  const elements = queryElements();
  if (!elements || state.loading) {
    return;
  }

  const shouldForceLoading = !silent || (DashboardState.campaignPerformance || []).length === 0;
  if (shouldForceLoading) {
    showLoading(true);
  }

  state.loading = true;
  hideError();

  try {
    const response = await apiConnector.getCampaignPerformance();
    const campaigns = ensureArray(response?.data ?? response);
    DashboardState.campaignPerformance = campaigns;
    hideError();
    renderCampaignPerformance(campaigns);
  } catch (error) {
    console.error('Campaign performance error:', error);
    showError(error.message || 'Gagal memuat data kampanye. Coba lagi nanti.');
    renderCampaignPerformance(DashboardState.campaignPerformance || []);
  } finally {
    hideLoading();
    state.loading = false;
  }
}
