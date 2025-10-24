import { DashboardState } from '../state/dashboardState.js';
import { lockChartArea } from './sizing.js';

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

  const sizing = lockChartArea(ctx, 64);

  const labels = dataset.map((item) => item.label || moment(item.date).format('DD MMM'));
  const data = dataset.map((item) => Number(item.value || item.total || 0));

  if (DashboardState.charts[elementId]) {
    DashboardState.charts[elementId].data.labels = labels;
    DashboardState.charts[elementId].data.datasets[0].data = data;
    DashboardState.charts[elementId].update();
    lockChartArea(ctx, sizing.height || 64);
    return;
  }

  DashboardState.charts[elementId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: 'rgba(14, 165, 233, 0.9)',
          backgroundColor: 'rgba(14, 165, 233, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });

  lockChartArea(ctx, sizing.height || 64);
}

export function renderSparklineCharts() {
  const sparklineData = extractSparklineData(DashboardState.stats);
  createSparkline('sparkline-customers', sparklineData.customers);
  createSparkline('sparkline-leads', sparklineData.leads);
  createSparkline('sparkline-escalations', sparklineData.escalations);
  createSparkline('sparkline-response', sparklineData.responseRate);
}
