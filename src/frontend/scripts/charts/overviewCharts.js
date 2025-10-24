import { DashboardState } from '../state/dashboardState.js';
import { ensureArray } from '../../shared/utils/index.js';
import { lockChartArea, unlockChartArea } from './sizing.js';

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
  const canvas = document.getElementById('chart-response-time');
  if (!canvas) return;

  const emptyState = document.getElementById('chart-response-time-empty');
  const primaryMessage = emptyState?.querySelector('[data-empty-primary]');
  const secondaryMessage = emptyState?.querySelector('[data-empty-secondary]');

  const trend = ensureArray(DashboardState.stats?.responseTimeTrend || DashboardState.stats?.response_time_trend);
  const dataPoints = trend
    .map((item) => {
      const value = Number(item?.value ?? item?.avg ?? item?.average);
      if (!Number.isFinite(value)) return null;

      const dateInput = item?.date || item?.label || item?.period;
      const label = dateInput
        ? moment(dateInput).isValid()
          ? moment(dateInput).format('DD MMM')
          : dateInput
        : null;

      return {
        label,
        value
      };
    })
    .filter(Boolean);

  if (!dataPoints.length) {
    if (DashboardState.charts['chart-response-time']) {
      DashboardState.charts['chart-response-time'].destroy();
      delete DashboardState.charts['chart-response-time'];
    }

    unlockChartArea(canvas);
    canvas.classList.add('hidden');

    if (emptyState) {
      emptyState.classList.remove('hidden');

      if (primaryMessage) {
        primaryMessage.textContent = DashboardState.emptyStateMessage || 'Belum ada data';
      }

      if (secondaryMessage) {
        const latestAverage = Number(
          DashboardState.stats?.avgResponseTime ?? DashboardState.stats?.avg_response_time
        );

        if (Number.isFinite(latestAverage)) {
          secondaryMessage.textContent = `Rata-rata respon terakhir ${latestAverage} menit.`;
        } else {
          secondaryMessage.textContent = 'Data response time akan muncul setelah ada aktivitas terbaru.';
        }
      }
    }

    return;
  }

  canvas.classList.remove('hidden');
  if (emptyState) {
    emptyState.classList.add('hidden');
  }

  const labels = dataPoints.map((item, index) => item.label || `Poin ${index + 1}`);
  const values = dataPoints.map((item) => item.value);

  createOrUpdateChart('chart-response-time', canvas, {
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
  const values =
    funnelData?.values || [
      DashboardState.leads.length,
      Math.round(DashboardState.leads.length * 0.6),
      Math.round(DashboardState.leads.length * 0.3),
      Math.round(DashboardState.leads.length * 0.15)
    ];

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

export function renderOverviewCharts() {
  renderLineChart();
  renderEscalationChart();
  renderFunnelChart();
}
