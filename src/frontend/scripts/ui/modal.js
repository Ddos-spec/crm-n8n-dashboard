import { DashboardState } from '../state/dashboardState.js';
import { escapeHTML, refreshIcons } from './dom.js';
import { extractUnique } from '../../../shared/utils/index.js';

export function renderAssignLeadForm() {
  const owners = extractUnique(DashboardState.leads, 'owner');
  return `
    <form id="assign-lead-form" class="space-y-4">
      <div>
        <label class="text-sm font-medium text-slate-500">Pilih Lead</label>
        <select name="lead" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
          ${DashboardState.leads
            .map((lead) => `<option value="${escapeHTML(lead.id ?? lead.phone ?? lead.name)}">${escapeHTML(lead.name || 'Tanpa nama')} • ${escapeHTML(lead.status || 'unknown')}</option>`)
            .join('')}
        </select>
      </div>
      <div>
        <label class="text-sm font-medium text-slate-500">Assign ke</label>
        <select name="owner" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
          ${owners.map((owner) => `<option value="${escapeHTML(owner)}">${escapeHTML(owner)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="text-sm font-medium text-slate-500">Catatan</label>
        <textarea name="notes" rows="3" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" placeholder="Instruksi singkat"></textarea>
      </div>
      <button type="submit" class="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white">Assign Sekarang</button>
    </form>
  `;
}

export function renderResolveEscalationForm() {
  const openEscalations = DashboardState.escalations.filter((item) => (item.status || '').toLowerCase() !== 'resolved');
  return `
    <form id="resolve-escalation-form" class="space-y-4">
      <div>
        <label class="text-sm font-medium text-slate-500">Pilih Escalation</label>
        <select name="escalation" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
          ${openEscalations
            .map((item) => `<option value="${escapeHTML(item.id ?? item.escalation_id ?? item.customer_name)}">${escapeHTML(item.customer_name || 'Unknown')} • ${escapeHTML(item.priority)}</option>`)
            .join('')}
        </select>
      </div>
      <div>
        <label class="text-sm font-medium text-slate-500">Catatan penyelesaian</label>
        <textarea name="notes" rows="3" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" placeholder="Langkah penyelesaian"></textarea>
      </div>
      <button type="submit" class="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-400 px-4 py-2 text-sm font-semibold text-white">Tandai Selesai</button>
    </form>
  `;
}

export function renderSendMessageForm() {
  const highPriorityCustomers = DashboardState.customers.filter(
    (cust) => (cust.priority || cust.customer_priority || '').toLowerCase() === 'high'
  );
  return `
    <form id="send-message-form" class="space-y-4">
      <div>
        <label class="text-sm font-medium text-slate-500">Pilih Customer</label>
        <select name="customer" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
          ${highPriorityCustomers
            .map((cust) => `<option value="${escapeHTML(cust.phone || cust.customer_id || cust.id)}">${escapeHTML(cust.name || cust.customer_name || 'Unknown')} • ${escapeHTML(cust.phone || '')}</option>`)
            .join('')}
        </select>
      </div>
      <div>
        <label class="text-sm font-medium text-slate-500">Pesan</label>
        <textarea name="message" rows="3" class="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" placeholder="Masukkan pesan follow-up"></textarea>
      </div>
      <button type="submit" class="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-purple-400 px-4 py-2 text-sm font-semibold text-white">Kirim Pesan</button>
    </form>
  `;
}

export function setupModal() {
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');
  if (!overlay || !closeBtn) return;

  closeBtn.addEventListener('click', () => closeModal());
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });
}

export function openModal({ title, subtitle, content }) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-subtitle').textContent = subtitle || '';
  document.getElementById('modal-content').innerHTML = content || '';

  overlay.classList.remove('hidden');
  setTimeout(() => overlay.classList.add('flex'), 10);
  refreshIcons();
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('flex');
  overlay.classList.add('hidden');
}

export function openQuickActionModal({ title, subtitle, content, onSubmit }) {
  openModal({ title, subtitle, content });
  const form = document.querySelector('#modal-content form');
  if (!form || typeof onSubmit !== 'function') return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    onSubmit(formData, form);
  });
}
