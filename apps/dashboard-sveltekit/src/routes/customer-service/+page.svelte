<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import HeroPanel, { type ConnectionStatus } from '$lib/components/dashboard/HeroPanel.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import DataTable, {
    type ColumnDefinition,
    type RowActionDetail
  } from '$lib/components/dashboard/DataTable.svelte';
  import CustomerStatusCell from '$lib/components/dashboard/CustomerStatusCell.svelte';
  import LeadStatusCell from '$lib/components/dashboard/LeadStatusCell.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import { statsStore } from '$stores/statsStore';
  import { customersStore } from '$stores/customersStore';
  import { leadsStore } from '$stores/leadsStore';
  import { escalationsStore } from '$stores/escalationsStore';
  import { authStore } from '$stores/auth/authStore';
  import { config } from '$config';
  import { postActionJson, postWebhookAction } from '$lib/utils/api';
  import type {
    ActionResponse,
    ChatHistoryResponse,
    ChatMessage,
    CustomerContactHistoryItem,
    CustomerDetail,
    CustomerRecord,
    LeadRecord,
    EscalationRecord
  } from '$lib/types/api';

  // Ambil data user dari auth store
  let currentUser = $authStore;

  const statsState = statsStore;
  const statsSummary = statsStore.summary;
  const statsUpdatedAt = statsStore.updatedAt;

  const customersState = customersStore;
  const customerFilter = customersStore.filterTerm;
  const customerRows = customersStore.filtered;

  const leadsState = leadsStore;
  const leadFilter = leadsStore.filterTerm;
  const leadRows = leadsStore.filtered;

  const escalationsState = escalationsStore;
  const escalationFilter = escalationsStore.filterTerm;
  const escalationRows = escalationsStore.filtered;

  type ActiveTab = 'customers' | 'leads' | 'escalations';
  let activeTab: ActiveTab = 'customers';
  let tableResetSignal = 0;
  type PipelineRecord = CustomerRecord | LeadRecord | EscalationRecord;

  let pendingAction:
    | {
        dataset: ActiveTab;
        action: string;
        record: PipelineRecord;
      }
    | null = null;

  interface DetailModalState {
    open: boolean;
    dataset: ActiveTab | null;
    record: PipelineRecord | null;
    loading: boolean;
    error: string | null;
    customerDetail: CustomerDetail | null;
    leadDetail: LeadRecord | null;
  }

  interface ChatModalState {
    open: boolean;
    dataset: ActiveTab | null;
    record: PipelineRecord | null;
    loading: boolean;
    error: string | null;
    messages: ChatMessage[];
  }

  interface MessageModalState {
    open: boolean;
    dataset: ActiveTab | null;
    record: PipelineRecord | null;
    phone: string;
    message: string;
    sending: boolean;
    error: string | null;
  }

  interface ResolveModalState {
    open: boolean;
    dataset: ActiveTab | null;
    record: PipelineRecord | null;
    escalationId: string | null;
    notes: string;
    sending: boolean;
    error: string | null;
  }

  function createDetailModalState(): DetailModalState {
    return {
      open: false,
      dataset: null,
      record: null,
      loading: false,
      error: null,
      customerDetail: null,
      leadDetail: null
    };
  }

  function createChatModalState(): ChatModalState {
    return {
      open: false,
      dataset: null,
      record: null,
      loading: false,
      error: null,
      messages: []
    };
  }

  function createMessageModalState(): MessageModalState {
    return {
      open: false,
      dataset: null,
      record: null,
      phone: '',
      message: '',
      sending: false,
      error: null
    };
  }

  function createResolveModalState(): ResolveModalState {
    return {
      open: false,
      dataset: null,
      record: null,
      escalationId: null,
      notes: '',
      sending: false,
      error: null
    };
  }

  let detailModal = createDetailModalState();
  let chatModal = createChatModalState();
  let messageModal = createMessageModalState();
  let resolveModal = createResolveModalState();
  let feedback: { type: 'success' | 'error'; message: string } | null = null;

  const customerColumns: ColumnDefinition<CustomerRecord>[] = [
    {
      id: 'name',
      label: 'Nama',
      accessor: (item) => item.name,
      sortable: true,
      class: 'font-medium text-slate-900'
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (item) => item.status,
      sortAccessor: (item) => item.status,
      sortable: true,
      cell: CustomerStatusCell
    },
    {
      id: 'phone',
      label: 'No. HP',
      accessor: (item) => item.phone,
      sortable: true
    },
    {
      id: 'last_contacted_at',
      label: 'Terakhir Kontak',
      accessor: (item) => item.last_contacted_at ? new Date(item.last_contacted_at).toLocaleDateString('id-ID') : 'Tidak ada',
      sortable: true,
      class: 'text-slate-600'
    },
    {
      id: 'next_action',
      label: 'Next Action',
      accessor: (item) => item.next_action ?? '—',
      class: 'text-slate-600'
    }
  ];

  const leadColumns: ColumnDefinition<LeadRecord>[] = [
    {
      id: 'name',
      label: 'Nama',
      accessor: (item) => item.name,
      sortable: true,
      class: 'font-medium text-slate-900'
    },
    {
      id: 'source',
      label: 'Sumber',
      accessor: (item) => item.source ?? '—',
      sortable: true,
      class: 'text-slate-600'
    },
    {
      id: 'phone',
      label: 'No. HP',
      accessor: (item) => item.phone,
      sortable: true
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (item) => item.status,
      sortAccessor: (item) => item.status,
      sortable: true,
      cell: LeadStatusCell
    },
    {
      id: 'last_activity_at',
      label: 'Aktivitas Terakhir',
      accessor: (item) => item.last_activity_at ? new Date(item.last_activity_at).toLocaleDateString('id-ID') : 'Tidak ada',
      sortable: true,
      class: 'text-slate-600'
    }
  ];

  const escalationColumns: ColumnDefinition<EscalationRecord>[] = [
    {
      id: 'customer_name',
      label: 'Nama Pelanggan',
      accessor: (item) => item.customer_name,
      sortable: true,
      class: 'font-medium text-slate-900'
    },
    {
      id: 'reason',
      label: 'Alasan',
      accessor: (item) => item.reason,
      sortable: true,
      class: 'text-slate-600'
    },
    {
      id: 'priority',
      label: 'Prioritas',
      accessor: (item) => item.priority,
      sortAccessor: (item) => item.priority,
      sortable: true,
      class: `text-sm font-semibold`
    },
    {
      id: 'created_at',
      label: 'Waktu Dibuat',
      accessor: (item) => new Date(item.created_at).toLocaleString('id-ID'),
      sortable: true,
      class: 'text-slate-600'
    },
    {
      id: 'assigned_to',
      label: 'Ditugaskan ke',
      accessor: (item) => item.assigned_to ?? 'Belum ditugaskan',
      sortable: true,
      class: 'text-slate-600'
    }
  ];

  const defaultIntervals = [0, 30000, 60000, 300000];
  const uniqueIntervals = Array.from(new Set([...defaultIntervals, config.ui.refreshInterval]));

  const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  function formatIntervalLabel(ms: number): string {
    if (ms === 0) return 'Off';
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds} detik`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (seconds === 0) return `${minutes} menit`;
    return `${minutes}m ${seconds}s`;
  }

  const refreshIntervalOptions = uniqueIntervals
    .sort((a, b) => a - b)
    .map((value) => ({
      value,
      label: formatIntervalLabel(value)
    }));

  let refreshInterval = config.ui.refreshInterval;
  let countdownSeconds = refreshInterval > 0 ? Math.floor(refreshInterval / 1000) : 0;
  let isRefreshing = false;
  let refreshError: string | null = null;
  let connectionStatus: ConnectionStatus = 'checking';
  let lastUpdated: Date | null = null;

  const isBrowser = typeof window !== 'undefined';
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  let autoRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  let realtimeStatus = 'Standby';
  const periodLabel = 'Semua waktu';
  let newItemsCount = 0;

  function formatCountdown(seconds: number): string {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remaining = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
  }

  function formatLastUpdated(value: Date | null): string {
    if (!value) return 'Belum pernah';
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(value);
  }

  function setFeedback(next: { type: 'success' | 'error'; message: string } | null) {
    feedback = next;
  }

  function formatDateTime(value: string | undefined | null): string {
    if (!value) return 'Tidak diketahui';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return dateTimeFormatter.format(parsed);
  }

  function normalizeContactHistory(detail: CustomerDetail | null): CustomerContactHistoryItem[] {
    if (!detail) return [];
    const raw =
      detail.contact_history ??
      detail.contactHistory ??
      ((detail as Record<string, unknown>).history as CustomerContactHistoryItem[] | undefined);
    if (!raw) return [];
    return raw.filter((item) => item && typeof item === 'object');
  }

  function normalizeLeadTimeline(record: LeadRecord | null): CustomerContactHistoryItem[] {
    if (!record) return [];
    const raw = (record as Record<string, unknown>).timeline as CustomerContactHistoryItem[] | undefined;
    if (!raw) return [];
    return raw.filter((item) => item && typeof item === 'object');
  }

  function normalizeMessages(response: ChatHistoryResponse | ChatMessage[] | null | undefined): ChatMessage[] {
    if (!response) return [];
    if (Array.isArray(response)) {
      return response.filter((item) => item && typeof item === 'object');
    }
    if (Array.isArray(response.messages)) {
      return response.messages.filter((item) => item && typeof item === 'object');
    }
    if (response.data && Array.isArray(response.data.messages)) {
      return response.data.messages.filter((item) => item && typeof item === 'object');
    }
    return [];
  }

  function extractIdentifiers(record: PipelineRecord | null) {
    if (!record || typeof record !== 'object') {
      return {
        id: null,
        phone: null,
        escalationId: null
      };
    }

    const source = record as Record<string, unknown>;
    const id = typeof source.id === 'string' ? source.id : null;
    const phone = typeof source.phone === 'string' ? source.phone : null;
    const escalationId =
      (typeof source.escalation_id === 'string' && source.escalation_id) ||
      (typeof source.escalationId === 'string' && source.escalationId) ||
      null;

    return { id, phone, escalationId };
  }

  function getOptionalString(source: Record<string, unknown>, key: string): string | null {
    const value = source[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    return null;
  }

  function leadContactDisplay(lead: LeadRecord | null): string {
    if (!lead) return '—';
    return lead.phone ?? getOptionalString(lead as Record<string, unknown>, 'email') ?? '—';
  }

  function leadScoreDisplay(lead: LeadRecord | null): string {
    if (!lead) return '—';
    if (lead.score != null) {
      return String(lead.score);
    }
    const fallback = getOptionalString(lead as Record<string, unknown>, 'lead_score');
    return fallback ?? '—';
  }

  function leadOwnerDisplay(lead: LeadRecord | null): string {
    if (!lead) return '—';
    return lead.owner ?? getOptionalString(lead as Record<string, unknown>, 'assignee') ?? '—';
  }

  $: countdownLabel = refreshInterval > 0 ? formatCountdown(countdownSeconds) : '—';
  $: lastUpdatedLabel = formatLastUpdated(lastUpdated ?? $statsUpdatedAt ?? null);

  function clearTimers() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (autoRefreshTimer) {
      clearTimeout(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  }

  function scheduleTimers() {
    clearTimers();
    if (!isBrowser) {
      countdownSeconds = 0;
      return;
    }
    if (refreshInterval <= 0) {
      countdownSeconds = 0;
      return;
    }

    countdownSeconds = Math.floor(refreshInterval / 1000);
    if (isRefreshing) {
      return;
    }

    countdownTimer = setInterval(() => {
      countdownSeconds = Math.max(countdownSeconds - 1, 0);
      if (countdownSeconds === 0 && countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }, 1000);

    autoRefreshTimer = setTimeout(() => {
      void refreshAll();
    }, refreshInterval);
  }

  async function refreshAll() {
    if (isRefreshing) {
      return;
    }

    isRefreshing = true;
    refreshError = null;
    connectionStatus = 'checking';
    clearTimers();

    await Promise.all([
      statsStore.refresh(), 
      customersStore.refresh(), 
      leadsStore.refresh(),
      escalationsStore.refresh()
    ]);

    const states = [get(statsState), get(customersState), get(leadsState), get(escalationsState)];
    const failed = states.find((state) => state.status === 'error');

    if (failed) {
      refreshError = failed.error ?? 'Tidak dapat memuat data.';
      connectionStatus = 'offline';
    } else {
      connectionStatus = 'online';
      lastUpdated = $statsUpdatedAt ?? new Date();
    }

    isRefreshing = false;
    scheduleTimers();
  }

  function handleIntervalChange(value: number) {
    refreshInterval = value;
    countdownSeconds = refreshInterval > 0 ? Math.floor(refreshInterval / 1000) : 0;
    scheduleTimers();
  }

  function handleSearch(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const value = input.value;
    if (activeTab === 'customers') {
      customersStore.filterTerm.set(value);
    } else if (activeTab === 'leads') {
      leadsStore.filterTerm.set(value);
    } else {
      escalationsStore.filterTerm.set(value);
    }
    tableResetSignal += 1;
  }

  function handleSelectAction(
    dataset: ActiveTab,
    event: CustomEvent<RowActionDetail>
  ) {
    pendingAction = {
      dataset,
      action: event.detail.action,
      record: event.detail.item as PipelineRecord
    };
    switch (event.detail.action) {
      case 'detail':
        void openDetailModal(dataset, event.detail.item as PipelineRecord);
        break;
      case 'chat':
        void openChatModal(dataset, event.detail.item as PipelineRecord);
        break;
      case 'whatsapp':
        openMessageModal(dataset, event.detail.item as PipelineRecord);
        break;
      case 'resolve':
        openResolveModal(dataset, event.detail.item as PipelineRecord);
        break;
      default:
        break;
    }
  }

  function closeDetailModal() {
    detailModal = createDetailModalState();
  }

  function closeChatModal() {
    chatModal = createChatModalState();
  }

  function closeMessageModal() {
    messageModal = createMessageModalState();
  }

  function closeResolveModal() {
    resolveModal = createResolveModalState();
  }

  async function openDetailModal(dataset: ActiveTab, record: PipelineRecord) {
    detailModal = {
      ...createDetailModalState(),
      open: true,
      dataset,
      record,
      loading: dataset === 'customers'
    };

    if (dataset === 'customers') {
      const { phone, id } = extractIdentifiers(record);
      const identifier = phone ?? id;
      if (!identifier) {
        detailModal = {
          ...detailModal,
          loading: false,
          error: 'Tidak dapat menemukan identitas pelanggan.'
        };
        return;
      }

      try {
        const response = await postActionJson<ActionResponse | CustomerDetail>(
          'customerDetails',
          'get_customer_details',
          { phone: identifier }
        );
        const detail = (response as Record<string, unknown>)?.data ?? response;
        detailModal = {
          ...detailModal,
          loading: false,
          customerDetail: detail as CustomerDetail
        };
      } catch (error) {
        detailModal = {
          ...detailModal,
          loading: false,
          error: (error as Error).message
        };
      }
    } else {
      detailModal = {
        ...detailModal,
        loading: false,
        leadDetail: record as LeadRecord
      };
    }
  }

  async function openChatModal(dataset: ActiveTab, record: PipelineRecord) {
    chatModal = {
      ...createChatModalState(),
      open: true,
      dataset,
      record,
      loading: true
    };

    await loadChatHistory(record);
  }

  function openMessageModal(dataset: ActiveTab, record: PipelineRecord) {
    const { phone } = extractIdentifiers(record);
    messageModal = {
      ...createMessageModalState(),
      open: true,
      dataset,
      record,
      phone: phone ?? '',
      message: '',
      error: phone ? null : 'Nomor telepon tidak tersedia.'
    };
  }

  function openResolveModal(dataset: ActiveTab, record: PipelineRecord) {
    const { escalationId } = extractIdentifiers(record);
    resolveModal = {
      ...createResolveModalState(),
      open: true,
      dataset,
      record,
      escalationId,
      error: escalationId ? null : 'Tidak ditemukan ID eskalasi untuk entri ini.'
    };
  }

  async function loadChatHistory(record: PipelineRecord) {
    chatModal = { ...chatModal, loading: true, error: null };
    const { id, phone } = extractIdentifiers(record);
    const identifier = phone ?? id;

    try {
      const response = await postActionJson<ChatHistoryResponse | ChatMessage[]>(
        'chatHistory',
        'get_chat_history',
        identifier ? { customer_id: identifier } : {}
      );
      const normalized = normalizeMessages(response);
      chatModal = { ...chatModal, loading: false, messages: normalized };
    } catch (error) {
      chatModal = { ...chatModal, loading: false, error: (error as Error).message };
    }
  }

  function retryChatHistory() {
    if (chatModal.record) {
      void loadChatHistory(chatModal.record as PipelineRecord);
    }
  }

  async function submitMessage(event: SubmitEvent) {
    event.preventDefault();
    if (!messageModal.open) return;
    if (!messageModal.phone) {
      messageModal = { ...messageModal, error: 'Nomor telepon wajib diisi.' };
      return;
    }
    if (!messageModal.message.trim()) {
      messageModal = { ...messageModal, error: 'Pesan tidak boleh kosong.' };
      return;
    }

    messageModal = { ...messageModal, sending: true, error: null };

    try {
      await postActionJson<ActionResponse>(
        'contactLead',
        'contact_lead',
        {
          phone: messageModal.phone,
          message: messageModal.message.trim()
        }
      );
      setFeedback({ type: 'success', message: 'Pesan WhatsApp berhasil dikirim.' });
      closeMessageModal();
    } catch (primaryError) {
      try {
        await postWebhookAction('send_whatsapp_message', {
          phone: messageModal.phone,
          message: messageModal.message.trim(),
          type: 'text'
        });
        setFeedback({ type: 'success', message: 'Pesan dikirim melalui webhook cadangan.' });
        closeMessageModal();
      } catch (fallbackError) {
        messageModal = {
          ...messageModal,
          sending: false,
          error: (fallbackError as Error).message ?? (primaryError as Error).message ?? 'Gagal mengirim pesan.'
        };
        return;
      }
    }

    messageModal = { ...messageModal, sending: false };
    await refreshAll();
  }

  async function submitResolve(event: SubmitEvent) {
    event.preventDefault();
    if (!resolveModal.open) return;
    if (!resolveModal.escalationId) {
      resolveModal = { ...resolveModal, error: 'ID eskalasi tidak ditemukan.' };
      return;
    }

    resolveModal = { ...resolveModal, sending: true, error: null };

    try {
      await postActionJson<ActionResponse>(
        'resolveEscalation',
        'resolve_escalation',
        {
          escalation_id: resolveModal.escalationId,
          notes: resolveModal.notes.trim()
        }
      );
      setFeedback({ type: 'success', message: 'Eskalasi berhasil diselesaikan.' });
      closeResolveModal();
    } catch (primaryError) {
      try {
        await postWebhookAction('resolve_escalation', {
          escalation_id: resolveModal.escalationId,
          notes: resolveModal.notes.trim()
        });
        setFeedback({ type: 'success', message: 'Eskalasi diselesaikan melalui webhook cadangan.' });
        closeResolveModal();
      } catch (fallbackError) {
        resolveModal = {
          ...resolveModal,
          sending: false,
          error: (fallbackError as Error).message ?? (primaryError as Error).message ?? 'Gagal menyelesaikan eskalasi.'
        };
        return;
      }
    }

    resolveModal = { ...resolveModal, sending: false };
    await refreshAll();
  }

  function chatModalTitle() {
    if (chatModal.record && typeof chatModal.record === 'object') {
      const nameCandidate = (chatModal.record as Record<string, unknown>).name;
      if (typeof nameCandidate === 'string' && nameCandidate.trim().length > 0) {
        return nameCandidate;
      }
    }
    const { phone } = extractIdentifiers(chatModal.record);
    return phone ?? 'Percakapan';
  }

  function detailModalTitle() {
    if (detailModal.dataset === 'customers') {
      if (detailModal.customerDetail?.name) {
        return detailModal.customerDetail.name;
      }
      if (detailModal.record && typeof detailModal.record === 'object') {
        const nameCandidate = (detailModal.record as Record<string, unknown>).name;
        if (typeof nameCandidate === 'string' && nameCandidate.trim().length > 0) {
          return nameCandidate;
        }
      }
      return 'Detail Pelanggan';
    }
    if (detailModal.dataset === 'leads') {
      return detailModal.leadDetail?.name ?? 'Detail Lead';
    }
    return 'Detail';
  }

  function resolveModalTargetName(): string {
    if (resolveModal.record && typeof resolveModal.record === 'object') {
      const nameCandidate = (resolveModal.record as Record<string, unknown>).name;
      if (typeof nameCandidate === 'string' && nameCandidate.trim().length > 0) {
        return nameCandidate;
      }
    }
    return 'entri ini';
  }

  function detailModalSubtitle() {
    if (detailModal.dataset === 'customers') {
      return detailModal.customerDetail?.phone ?? null;
    }
    if (detailModal.dataset === 'leads') {
      const lead = detailModal.leadDetail;
      if (!lead) return null;
      const contact = leadContactDisplay(lead);
      return contact === '—' ? null : contact;
    }
    return null;
  }

  function handleLogout() {
    authStore.logout();
  }

  onMount(() => {
    void refreshAll();
    // Set status realtime untuk customer service
    realtimeStatus = 'Siap melayani';
    return () => {
      clearTimers();
    };
  });
</script>

<div class="min-h-screen bg-white text-slate-900">
  <header class="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
    <div>
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">CUSTOMER SERVICE DASHBOARD</p>
      <h1 class="text-2xl font-semibold text-slate-900">Customer Service Center</h1>
      <p class="mt-1 text-sm text-slate-600">Pusat layanan pelanggan: manajemen pelanggan, lead, dan eskalasi.</p>
    </div>
    <div class="flex items-center gap-4">
      <div class="hidden flex-col text-right text-xs text-slate-500 sm:flex">
        <span class="text-sm font-semibold text-slate-900">{currentUser.user?.name || 'Customer Service'}</span>
        <span>{currentUser.user?.email || 'cs@tepatlaser.id'}</span>
      </div>
      <button
        type="button"
        class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-500 hover:text-blue-600"
        on:click={handleLogout}
      >
        Logout
      </button>
    </div>
  </header>

  <nav class="border-b border-slate-200 bg-slate-50 px-6 py-3 text-sm">
    <div class="flex flex-wrap items-center gap-6">
      <a href="/" class="text-slate-600 hover:text-blue-600">Dashboard Utama</a>
      <a href="/customer-service" class="font-semibold text-blue-600">Customer Service</a>
      <a href="/marketing" class="text-slate-600 hover:text-blue-600">Marketing</a>
    </div>
  </nav>

  <main class="space-y-10 px-6 py-8 lg:px-12">
    {#if feedback}
      <div
        class={`rounded-md border px-4 py-3 text-sm shadow-sm ${
          feedback.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-rose-200 bg-rose-50 text-rose-700'
        }`}
        role="status"
      >
        {feedback.message}
        <button
          type="button"
          class="ml-4 text-xs font-semibold text-slate-600 underline hover:text-slate-900"
          on:click={() => setFeedback(null)}
        >
          Tutup
        </button>
      </div>
    {/if}

    <HeroPanel
      title="Customer Service Command Center"
      subtitle="Dashboard khusus untuk tim customer service dengan fokus pada pelanggan dan eskalasi"
      workflowId={config.n8n.workflowId}
      baseUrl={config.n8n.baseUrl}
      connectionStatus={connectionStatus}
      lastUpdatedLabel={lastUpdatedLabel}
      refreshOptions={refreshIntervalOptions}
      refreshInterval={refreshInterval}
      countdownLabel={countdownLabel}
      isRefreshing={isRefreshing}
      refreshError={refreshError}
      onRefresh={refreshAll}
      onChangeInterval={handleIntervalChange}
      newItemsCount={newItemsCount}
      realtimeStatus={realtimeStatus}
      periodLabel={periodLabel}
    >
      <a
        slot="actions"
        href="/detail"
        class="inline-flex items-center justify-end gap-2 text-xs font-semibold text-blue-600 hover:text-blue-500"
      >
        Lihat detail lengkap →
      </a>
    </HeroPanel>

    <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-slate-900">Ringkasan KPI</h2>
          <p class="text-sm text-slate-600">Statistik penting untuk tim customer service.</p>
        </div>
      </header>

      <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {#if $statsSummary}
          {#each $statsSummary as card (card.id)}
            {#if card.id !== 'totalLeads'} <!-- Sembunyikan leads untuk customer service -->
              <KpiCard {...card} />
            {/if}
          {/each}
        {:else}
          {#if $statsState.status === 'loading'}
            {#each Array(3) as _, index (index)} <!-- Kurangi jumlah loading card -->
              <article class="animate-pulse rounded-lg border border-slate-200 bg-slate-100 p-5" aria-hidden="true">
                <div class="h-3 w-24 rounded bg-slate-200"></div>
                <div class="mt-4 h-6 w-16 rounded bg-slate-200"></div>
                <div class="mt-8 h-6 w-full rounded bg-slate-200"></div>
              </article>
            {/each}
          {:else if $statsState.status === 'error'}
            <article class="col-span-full rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              Tidak bisa memuat ringkasan: {$statsState.error}
            </article>
          {/if}
        {/if}
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <nav class="flex gap-2 rounded-lg bg-slate-100 p-1 text-sm font-semibold text-slate-600">
          <button
            class={`rounded-md px-4 py-2 transition ${
              activeTab === 'customers'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:text-blue-600'
            }`}
            on:click={() => {
              activeTab = 'customers';
              tableResetSignal += 1;
            }}
            type="button"
          >
            Pelanggan
          </button>
          <button
            class={`rounded-md px-4 py-2 transition ${
              activeTab === 'leads'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:text-blue-600'
            }`}
            on:click={() => {
              activeTab = 'leads';
              tableResetSignal += 1;
            }}
            type="button"
          >
            Leads
          </button>
          <button
            class={`rounded-md px-4 py-2 transition ${
              activeTab === 'escalations'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:text-blue-600'
            }`}
            on:click={() => {
              activeTab = 'escalations';
              tableResetSignal += 1;
            }}
            type="button"
          >
            Eskalasi
          </button>
        </nav>

        <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <label class="sr-only" for="data-search">Cari</label>
          <input
            id="data-search"
            type="search"
            placeholder={
              activeTab === 'customers' 
                ? 'Cari pelanggan…' 
                : activeTab === 'leads'
                  ? 'Cari leads…'
                  : 'Cari eskalasi…'
            }
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:w-72"
            value={
              activeTab === 'customers' ? $customerFilter : 
              activeTab === 'leads' ? $leadFilter : 
              $escalationsStore.filterTerm
            }
            on:input={handleSearch}
          />
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-500 hover:text-blue-600"
            on:click={() => {
              customersStore.filterTerm.set('');
              leadsStore.filterTerm.set('');
              escalationsStore.filterTerm.set('');
              tableResetSignal += 1;
            }}
          >
            Reset filter
          </button>
        </div>
      </div>

      <div class="px-6 pb-6">
        {#if activeTab === 'customers'}
          <DataTable
            items={$customerRows}
            columns={customerColumns}
            keyField="id"
            loading={$customersState.status === 'loading'}
            error={$customersState.status === 'error' ? $customersState.error : null}
            emptyMessage="Belum ada data pelanggan."
            summaryLabel="pelanggan"
            exportFilename="customers.csv"
            showActionsColumn
            resetSignal={tableResetSignal}
            on:select={(event) => handleSelectAction('customers', event)}
          />
        {:else if activeTab === 'leads'}
          <DataTable
            items={$leadRows}
            columns={leadColumns}
            keyField="id"
            loading={$leadsState.status === 'loading'}
            error={$leadsState.status === 'error' ? $leadsState.error : null}
            emptyMessage="Belum ada data leads."
            summaryLabel="leads"
            exportFilename="leads.csv"
            showActionsColumn
            resetSignal={tableResetSignal}
            on:select={(event) => handleSelectAction('leads', event)}
          />
        {:else}
          <DataTable
            items={$escalationRows}
            columns={escalationColumns}
            keyField="id"
            loading={$escalationsState.status === 'loading'}
            error={$escalationsState.status === 'error' ? $escalationsState.error : null}
            emptyMessage="Belum ada eskalasi."
            summaryLabel="eskalasi"
            exportFilename="escalations.csv"
            showActionsColumn
            resetSignal={tableResetSignal}
            on:select={(event) => handleSelectAction('escalations', event)}
          />
        {/if}
      </div>
    </section>
    <p class="sr-only" aria-live="polite">
      {#if pendingAction}
        Aksi {pendingAction.action} dipilih untuk {pendingAction.dataset === 'customers' ? 'pelanggan' : pendingAction.dataset === 'leads' ? 'lead' : 'eskalasi'}{' '}
        {pendingAction.record.name}.
      {/if}
    </p>

    <Modal
      open={detailModal.open}
      title={detailModalTitle()}
      subtitle={detailModalSubtitle()}
      size="lg"
      on:close={closeDetailModal}
    >
      {#if detailModal.loading}
        <p class="text-sm text-slate-600">Memuat detail…</p>
      {:else if detailModal.error}
        <p class="text-sm text-rose-600">{detailModal.error}</p>
      {:else if detailModal.dataset === 'customers'}
        {#if detailModal.customerDetail}
          <div class="space-y-6">
            <section class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Profil Pelanggan</h3>
              <dl class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt class="text-xs text-slate-500">Nama</dt>
                  <dd class="text-sm font-medium text-slate-900">{detailModal.customerDetail.name ?? '—'}</dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">Telepon</dt>
                  <dd class="text-sm font-medium text-slate-900">{detailModal.customerDetail.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">Lokasi</dt>
                  <dd class="text-sm text-slate-600">{detailModal.customerDetail.location ?? '—'}</dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">Prioritas</dt>
                  <dd class="text-sm font-medium text-slate-900">
                    {detailModal.customerDetail.customer_priority ?? detailModal.customerDetail.priority ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">PIC</dt>
                  <dd class="text-sm text-slate-600">{detailModal.customerDetail.assigned_to ?? '—'}</dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">Tags</dt>
                  <dd class="text-sm text-slate-600">
                    {#if Array.isArray(detailModal.customerDetail.tags) && detailModal.customerDetail.tags.length > 0}
                      {detailModal.customerDetail.tags.join(', ')}
                    {:else}
                      —
                    {/if}
                  </dd>
                </div>
              </dl>
            </section>
            <section class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Riwayat Kontak</h3>
              {#if normalizeContactHistory(detailModal.customerDetail).length > 0}
                <ol class="mt-4 space-y-3">
                  {#each normalizeContactHistory(detailModal.customerDetail) as item, index (index)}
                    <li class="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <p class="text-sm font-semibold text-slate-900">{item.channel ?? 'Interaksi'}</p>
                      <p class="text-xs text-slate-500">{formatDateTime(item.time ?? item.timestamp)}</p>
                      <p class="mt-2 text-sm text-slate-600">{item.summary ?? item.notes ?? 'Tidak ada catatan.'}</p>
                    </li>
                  {/each}
                </ol>
              {:else}
                <p class="mt-4 text-sm text-slate-600">Belum ada riwayat kontak.</p>
              {/if}
            </section>
          </div>
        {:else}
          <p class="text-sm text-slate-600">Detail pelanggan tidak tersedia.</p>
        {/if}
      {:else if detailModal.dataset === 'leads'}
        {#if detailModal.leadDetail}
          <div class="space-y-6">
            <section class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Informasi Lead</h3>
              <dl class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt class="text-xs text-slate-500">Nama</dt>
                  <dd class="text-sm font-medium text-slate-900">{detailModal.leadDetail.name ?? '—'}</dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">Kontak</dt>
                  <dd class="text-sm font-medium text-slate-900">{leadContactDisplay(detailModal.leadDetail)}</dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">Sumber</dt>
                  <dd class="text-sm text-slate-600">{detailModal.leadDetail.source ?? '—'}</dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">Status</dt>
                  <dd class="text-sm font-medium text-slate-900">{detailModal.leadDetail.status ?? '—'}</dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">Score</dt>
                  <dd class="text-sm font-medium text-slate-900">{leadScoreDisplay(detailModal.leadDetail)}</dd>
                </div>
                <div>
                  <dt class="text-xs text-slate-500">PIC</dt>
                  <dd class="text-sm text-slate-600">{leadOwnerDisplay(detailModal.leadDetail)}</dd>
                </div>
              </dl>
            </section>
            <section class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Timeline Interaksi</h3>
              {#if normalizeLeadTimeline(detailModal.leadDetail).length > 0}
                <ol class="mt-4 space-y-3">
                  {#each normalizeLeadTimeline(detailModal.leadDetail) as item, index (index)}
                    <li class="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <p class="text-sm font-semibold text-slate-900">{item.channel ?? 'Aktivitas'}</p>
                      <p class="text-xs text-slate-500">{formatDateTime(item.time ?? item.timestamp)}</p>
                      <p class="mt-2 text-sm text-slate-600">{item.notes ?? item.summary ?? 'Tidak ada catatan.'}</p>
                    </li>
                  {/each}
                </ol>
              {:else}
                <p class="mt-4 text-sm text-slate-600">Belum ada interaksi.</p>
              {/if}
            </section>
          </div>
        {:else}
          <p class="text-sm text-slate-600">Detail lead tidak tersedia.</p>
        {/if}
      {:else}
        <p class="text-sm text-slate-600">Pilih entri untuk melihat detail.</p>
      {/if}
    </Modal>

    <Modal open={chatModal.open} title={`Percakapan • ${chatModalTitle()}`} subtitle={extractIdentifiers(chatModal.record).phone} size="lg" on:close={closeChatModal}>
      {#if chatModal.loading}
        <p class="text-sm text-slate-600">Memuat riwayat chat…</p>
      {:else if chatModal.error}
        <div class="space-y-4">
          <p class="text-sm text-rose-600">{chatModal.error}</p>
          <button
            type="button"
            class="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-500 hover:text-blue-600"
            on:click={retryChatHistory}
          >
            Coba lagi
          </button>
        </div>
      {:else if chatModal.messages.length === 0}
        <p class="text-sm text-slate-600">Belum ada percakapan.</p>
      {:else}
        <ol class="space-y-3">
          {#each chatModal.messages as message, index (index)}
            <li class="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-slate-900">{message.sender ?? message.from ?? 'Customer'}</p>
                <span class="text-xs text-slate-500">{formatDateTime(message.time ?? message.timestamp ?? message.created_at)}</span>
              </div>
              <p class="mt-2 text-sm text-slate-600">{message.text ?? message.body ?? message.message ?? '—'}</p>
            </li>
          {/each}
        </ol>
      {/if}
    </Modal>

    <Modal
      open={messageModal.open}
      title="Kirim Pesan WhatsApp"
      subtitle={messageModal.phone ? `Ke ${messageModal.phone}` : null}
      size="md"
      on:close={closeMessageModal}
    >
      <form id="whatsapp-form" class="space-y-4" on:submit|preventDefault={submitMessage}>
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-500" for="whatsapp-phone">Nomor</label>
          <input
            id="whatsapp-phone"
            type="tel"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            bind:value={messageModal.phone}
            required
          />
        </div>
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-500" for="whatsapp-message">Pesan</label>
          <textarea
            id="whatsapp-message"
            class="mt-1 h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            bind:value={messageModal.message}
            required
          />
        </div>
        {#if messageModal.error}
          <p class="text-sm text-rose-600">{messageModal.error}</p>
        {/if}
      </form>
      <div class="flex items-center justify-end gap-3" slot="footer">
        <button
          type="button"
          class="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-500 hover:text-blue-600"
          on:click={closeMessageModal}
        >
          Batal
        </button>
        <button
          type="submit"
          form="whatsapp-form"
          class="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
          disabled={messageModal.sending}
        >
          {messageModal.sending ? 'Mengirim…' : 'Kirim Pesan'}
        </button>
      </div>
    </Modal>

    <Modal
      open={resolveModal.open}
      title="Selesaikan Eskalasi"
      subtitle={resolveModal.escalationId}
      size="md"
      on:close={closeResolveModal}
    >
      <form id="resolve-form" class="space-y-4" on:submit|preventDefault={submitResolve}>
        <p class="text-sm text-slate-600">
          Konfirmasi penyelesaian eskalasi untuk{' '}
          <strong class="text-slate-900">{resolveModalTargetName()}</strong>.
          Tambahkan catatan bila diperlukan.
        </p>
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-500" for="resolve-notes">Catatan</label>
          <textarea
            id="resolve-notes"
            class="mt-1 h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Opsional"
            bind:value={resolveModal.notes}
          />
        </div>
        {#if resolveModal.error}
          <p class="text-sm text-rose-600">{resolveModal.error}</p>
        {/if}
      </form>
      <div class="flex items-center justify-end gap-3" slot="footer">
        <button
          type="button"
          class="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-500 hover:text-blue-600"
          on:click={closeResolveModal}
        >
          Batal
        </button>
        <button
          type="submit"
          form="resolve-form"
          class="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
          disabled={resolveModal.sending}
        >
          {resolveModal.sending ? 'Memproses…' : 'Selesaikan'}
        </button>
      </div>
    </Modal>
  </main>
</div>