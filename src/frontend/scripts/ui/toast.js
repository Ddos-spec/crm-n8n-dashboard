import { escapeHTML, refreshIcons } from './dom.js';

export function showToast(message, type = 'info') {
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
