export function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return value
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function downloadFile(content, filename, mimeType) {
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

export function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function showLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.remove('hidden');
}

export function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('hidden');
}

export function updateConnectionStatus(status) {
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

export function formatDateCell(dateValue) {
  if (!dateValue || typeof moment === 'undefined') {
    return '<span class="text-sm text-slate-500">—</span>';
  }

  const date = moment(dateValue);
  if (!date.isValid()) {
    return '<span class="text-sm text-slate-500">—</span>';
  }

  return `
    <div class="flex flex-col">
      <span class="text-sm font-medium text-slate-700">${date.format('DD MMM YYYY')}</span>
      <span class="text-xs text-slate-400">${date.fromNow()}</span>
    </div>
  `;
}
