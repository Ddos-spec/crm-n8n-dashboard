import { DashboardState } from '../state/dashboardState.js';
import { lockChartArea, unlockChartArea } from './sizing.js';

function extractSparklineData(stats) {
  const parseMetric = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const totals = {
    customers: parseMetric(stats?.totalCustomers ?? stats?.total_customers),
    leads: parseMetric(stats?.totalLeads ?? stats?.total_leads),
    escalations: parseMetric(stats?.totalEscalations ?? stats?.total_escalations),
    responseRate: parseMetric(stats?.responseRate ?? stats?.response_rate)
  };

  const normaliseTrend = (trend) => (Array.isArray(trend) ? trend.filter((item) => item !== null && item !== undefined) : []);

  const buildSeries = (trend, fallbackValue) => {
    const series = normaliseTrend(trend);
    if (series.length) return series;
    if (fallbackValue === null || fallbackValue === undefined) return [];
    return [
      {
        label: 'Saat ini',
        value: fallbackValue
      }
    ];
  };

  return {
    customers: buildSeries(stats?.customerTrend || stats?.customer_trend, totals.customers),
    leads: buildSeries(stats?.leadTrend || stats?.lead_trend, totals.leads),
    escalations: buildSeries(stats?.escalationTrend || stats?.escalation_trend, totals.escalations),
    responseRate: buildSeries(stats?.responseTrend || stats?.response_trend, totals.responseRate)
  };
}



function createSparkline(elementId, dataset) {
  const canvas = document.getElementById(elementId);
  if (!canvas) return;

  const emptyState = document.getElementById(`${elementId}-empty`);
  const dataSeries = Array.isArray(dataset) ? dataset.filter((item) => item !== null && item !== undefined) : [];

  if (!dataSeries.length) {
    if (DashboardState.charts[elementId]) {
      DashboardState.charts[elementId].destroy();
      delete DashboardState.charts[elementId];
    }

    unlockChartArea(canvas);
    canvas.classList.add('hidden');

    if (emptyState) {
      emptyState.classList.remove('hidden');
      const primaryMessage = emptyState.querySelector('[data-empty-primary]');
      if (primaryMessage) {
        primaryMessage.textContent = DashboardState.emptyStateMessage || 'Belum ada data';
      }
    }

    return;
  }

  canvas.classList.remove('hidden');
  if (emptyState) {
    emptyState.classList.add('hidden');
  }

  const sizing = lockChartArea(canvas, 64);

  const normalised = dataSeries.map((item, index) => {
    if (typeof item === 'number') {
      return { label: `Poin ${index + 1}`, value: item };
    }

    if (item && typeof item === 'object') {
      return item;
    }

    return { label: `Poin ${index + 1}`, value: 0 };
  });

  const labels = normalised.map((item, index) => {
    if (item.label) return item.label;
    if (item.date) {
      const momentDate = moment(item.date);
      return momentDate.isValid() ? momentDate.format('DD MMM') : item.date;
    }
    if (item.period) return item.period;
    return `Poin ${index + 1}`;
  });

  const data = normalised.map((item) => {
    const numeric = Number(
      item.value ?? item.total ?? item.count ?? item.amount ?? item.avg ?? item.average
    );
    return Number.isFinite(numeric) ? numeric : 0;
  });

  if (DashboardState.charts[elementId]) {
    DashboardState.charts[elementId].data.labels = labels;
    DashboardState.charts[elementId].data.datasets[0].data = data;
    DashboardState.charts[elementId].update();
    lockChartArea(canvas, sizing.height || 64);
    return;
  }

  DashboardState.charts[elementId] = new Chart(canvas, {
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

  lockChartArea(canvas, sizing.height || 64);
}



export function renderSparklineCharts() {
  const sparklineData = extractSparklineData(DashboardState.stats);
  createSparkline('sparkline-customers', sparklineData.customers);
  createSparkline('sparkline-leads', sparklineData.leads);
  createSparkline('sparkline-escalations', sparklineData.escalations);
  createSparkline('sparkline-response', sparklineData.responseRate);
}
