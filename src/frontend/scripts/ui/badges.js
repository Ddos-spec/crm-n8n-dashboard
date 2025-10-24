import { capitalize } from '../../shared/utils/index.js';

export function statusToBadge(status) {
  const value = (status || '').toLowerCase();
  if (value.includes('active') || value.includes('open')) return 'badge-info';
  if (value.includes('pending')) return 'badge-warning';
  if (value.includes('resolved') || value.includes('closed')) return 'badge-success';
  if (value.includes('critical') || value.includes('overdue')) return 'badge-danger';
  return 'badge-neutral';
}

export function priorityToBadge(priority) {
  const value = (priority || '').toLowerCase();
  if (value === 'high' || value === 'critical') return 'badge-danger';
  if (value === 'medium') return 'badge-warning';
  if (value === 'low') return 'badge-info';
  return 'badge-neutral';
}

export function updateDeltaBadge(elementId, deltaValue, inverted = false) {
  const badge = document.getElementById(elementId);
  if (!badge) return;

  let value = Number(deltaValue);
  if (Number.isNaN(value)) value = 0;
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

export function formatBadgeLabel(value) {
  return capitalize(value || '');
}
