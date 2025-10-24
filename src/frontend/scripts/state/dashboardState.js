export const DashboardState = {
  stats: null,
  customers: [],
  leads: [],
  escalations: [],
  campaignPerformance: [],
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
  emptyStateMessage: 'Belum ada data',
  theme: 'light'
};

let refreshHandler = null;

export function setupAutoRefresh(handler) {
  refreshHandler = handler;
  const select = document.getElementById('refresh-interval');
  if (!select) {
    return;
  }

  DashboardState.refreshInterval = Number(select.value) || 0;
  select.addEventListener('change', () => {
    DashboardState.refreshInterval = Number(select.value) || 0;
    restartCountdown();
  });
  restartCountdown();
}

export function restartCountdown() {
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
      if (typeof refreshHandler === 'function') {
        await refreshHandler();
      }
    }
  }, 1000);
}

export function updateRefreshState() {
  DashboardState.lastRefresh = new Date();
  const lastUpdatedEl = document.getElementById('last-updated');
  if (lastUpdatedEl && typeof moment !== 'undefined') {
    lastUpdatedEl.textContent = moment(DashboardState.lastRefresh).format('DD MMM YYYY HH:mm:ss');
  }
}
