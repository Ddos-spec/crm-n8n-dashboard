import type { StatusTone } from '$lib/components/common/StatusPill.svelte';

function normalize(value?: string | null): string {
  return (value ?? '').toLowerCase();
}

export function getCustomerStatusTone(status?: string | null): StatusTone {
  switch (normalize(status)) {
    case 'new':
    case 'lead':
    case 'prospect':
      return 'accent';
    case 'active':
    case 'ongoing':
      return 'success';
    case 'escalated':
    case 'urgent':
    case 'overdue':
      return 'danger';
    case 'inactive':
    case 'pending':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function getLeadStatusTone(status?: string | null): StatusTone {
  switch (normalize(status)) {
    case 'new':
    case 'open':
      return 'accent';
    case 'qualified':
    case 'won':
      return 'success';
    case 'lost':
    case 'churned':
      return 'danger';
    case 'nurturing':
    case 'follow-up':
      return 'warning';
    default:
      return 'neutral';
  }
}
