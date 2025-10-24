import { DashboardState } from '../state/dashboardState.js';
import { ensureArray } from '../../shared/utils/index.js';
import { lockChartArea } from './sizing.js';

function createOrUpdateChart(id, ctx, config) {
  const canvas = ctx instanceof HTMLCanvasElement ? ctx : document.getElementById(id);
  if (!canvas) return;

  const sizing = lockChartArea(canvas, 256);

  if (DashboardState.charts[id]) {
    DashboardState.charts[id].destroy();
  }

  lockChartArea(canvas, sizing.height || 256);

  DashboardState.charts[id] = new Chart(canvas, config);

  lockChartArea(canvas, sizing.height || 256);
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

function renderFunnelSummary() {
  const section = document.getElementById('funnel-section');
  const summaryContainer = document.getElementById('funnel-summary');
  const tableBody = document.getElementById('funnel-summary-body');
  const emptyState = document.getElementById('funnel-empty');

  if (!section || !summaryContainer || !tableBody || !emptyState) {
    return;
  }

  const funnel = DashboardState.stats?.funnel || DashboardState.stats?.conversionFunnel;
  let rows = [];

  if (Array.isArray(funnel?.stages) && Array.isArray(funnel?.values) && funnel.stages.length === funnel.values.length) {
    rows = funnel.stages.map((stage, index) => ({
      key: stage.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      label: stage,
      count: Number(funnel.values[index] ?? 0) || 0,
      statuses: []
    }));
  } else {
    rows = deriveFunnelRowsFromStatuses();
  }

  const hasData = rows.some((row) => row.count > 0);

  if (!hasData) {
    tableBody.innerHTML = '';
    summaryContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  const formatter = new Intl.NumberFormat('id-ID');
  const stageColors = {
    'lead-baru': '#38bdf8',
    'lead-contacted': '#22d3ee',
    'lead-qualified': '#6366f1',
    'lead-proposal': '#a855f7',
    'lead-won': '#34d399',
    'lead-lost': '#f87171',
    others: '#94a3b8'
  };

  const markup = rows
    .filter((row) => row.count > 0)
    .map((row) => {
      const color = stageColors[row.key] || stageColors.others;
      const statusBadges = row.statuses.length
        ? `<div class="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">${row.statuses
            .map((status) => `<span class="badge badge-neutral">${formatStageStatusLabel(status)}</span>`)
            .join('')}</div>`
        : '';

      return `
        <tr>
          <td>
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-3">
                <span class="status-indicator" style="background:${color}"></span>
                <span class="font-semibold">${row.label}</span>
              </div>
              ${statusBadges}
            </div>
          </td>
          <td class="text-right text-lg font-semibold">${formatter.format(row.count)}</td>
        </tr>
      `;
    })
    .join('');

  tableBody.innerHTML = markup;
  emptyState.classList.add('hidden');
  summaryContainer.classList.remove('hidden');
}

export function renderOverviewCharts() {
  renderLineChart();
  renderEscalationChart();
  renderFunnelSummary();
}

function deriveFunnelRowsFromStatuses() {
  const businesses = ensureArray(DashboardState.stats?.businesses);
  const leads = ensureArray(DashboardState.leads);
  const source = businesses.length ? businesses : leads;

  if (!source.length) {
    return [];
  }

  const stageDefinitions = [
    { key: 'lead-baru', label: 'Lead Baru', statuses: ['new', 'baru', 'open', 'incoming', 'new_lead'] },
    { key: 'lead-contacted', label: 'Sudah Dihubungi', statuses: ['contacted', 'dihubungi', 'follow_up', 'in_progress', 'replied'] },
    { key: 'lead-qualified', label: 'Terkualifikasi', statuses: ['qualified', 'opportunity', 'qualified_lead', 'demo_scheduled', 'assessment'] },
    { key: 'lead-proposal', label: 'Proposal / Negosiasi', statuses: ['proposal', 'proposal_sent', 'negotiation', 'contract', 'contract_sent'] },
    { key: 'lead-won', label: 'Menang', statuses: ['won', 'closed_won', 'converted', 'deal_won'] },
    { key: 'lead-lost', label: 'Kalah', statuses: ['lost', 'closed_lost', 'unqualified', 'deal_lost', 'rejected'] }
  ];

  const stageMap = stageDefinitions.reduce((acc, stage) => {
    acc[stage.key] = { key: stage.key, label: stage.label, count: 0, statuses: new Set() };
    return acc;
  }, {});

  const others = { key: 'others', label: 'Status Lainnya', count: 0, statuses: new Set() };

  source.forEach((item) => {
    const rawStatus =
      item?.status || item?.stage || item?.pipeline_status || item?.current_status || item?.lead_status || '';
    const normalized = String(rawStatus).trim().toLowerCase();
    if (!normalized) return;

    const matchingStage = stageDefinitions.find((stage) => stage.statuses.includes(normalized));
    const target = matchingStage ? stageMap[matchingStage.key] : others;
    target.count += 1;
    target.statuses.add(normalized);
  });

  return [
    ...stageDefinitions.map((stage) => ({
      key: stage.key,
      label: stage.label,
      count: stageMap[stage.key].count,
      statuses: Array.from(stageMap[stage.key].statuses)
    })),
    ...(others.count > 0
      ? [
          {
            key: others.key,
            label: others.label,
            count: others.count,
            statuses: Array.from(others.statuses)
          }
        ]
      : [])
  ];
}

function formatStageStatusLabel(status) {
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
