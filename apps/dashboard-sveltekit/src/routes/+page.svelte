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
  import { config } from '$config';
  import { postActionJson, postWebhookAction } from '$lib/utils/api';
  import type {
    ActionResponse,
    ChatHistoryResponse,
    ChatMessage,
    CustomerContactHistoryItem,
    CustomerDetail,
    CustomerRecord,
    LeadRecord
  } from '$lib/types/api';

  const statsState = statsStore;
  const statsSummary = statsStore.summary;
  const statsUpdatedAt = statsStore.updatedAt;

  const customersState = customersStore;
  const customerFilter = customersStore.filterTerm;
  const customerRows = customersStore.filtered;

  const leadsState = leadsStore;
  const leadFilter = leadsStore.filterTerm;
  const leadRows = leadsStore.filtered;

  type ActiveTab = 'customers' | 'leads';
  let activeTab: ActiveTab = 'customers';
  let tableResetSignal = 0;
  type PipelineRecord = CustomerRecord | LeadRecord;

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
      class: 'font-medium text-ink'
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
      id: 'next_action',
      label: 'Next Action',
      accessor: (item) => item.next_action ?? '—',
      class: 'text-ink-soft'
    }
  ];

  const leadColumns: ColumnDefinition<LeadRecord>[] = [
    {
      id: 'name',
      label: 'Nama',
      accessor: (item) => item.name,
      sortable: true,
      class: 'font-medium text-ink'
    },
    {
      id: 'source',
      label: 'Sumber',
      accessor: (item) => item.source ?? '—',
      sortable: true,
      class: 'text-ink-soft'
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

  const realtimeStatus = 'Standby';
  const periodLabel = 'Semua waktu';
  const newItemsCount = 0;

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

    await Promise.all([statsStore.refresh(), customersStore.refresh(), leadsStore.refresh()]);

    const states = [get(statsState), get(customersState), get(leadsState)];
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
    } else {
      leadsStore.filterTerm.set(value);
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

  onMount(() => {
    void refreshAll();
    return () => {
      clearTimers();
    };
  });
</script>

<section class="space-y-10 px-6 py-10">
  {#if feedback}
    <div
      class={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
        feedback.type === 'success'
          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
          : 'border-rose-100 bg-rose-50 text-rose-700'
      }`}
      role="status"
    >
      {feedback.message}
      <button
        type="button"
        class="ml-4 text-xs font-semibold text-ink-soft underline hover:text-ink"
        on:click={() => setFeedback(null)}
      >
        Tutup
      </button>
    </div>
  {/if}

  <HeroPanel
    title="Tepat Laser Command Center"
    subtitle="Ringkasan performa customer service & marketing dalam satu layar"
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
  />

  <section class="rounded-2xl border border-surface-muted bg-surface p-6 shadow-sm">
    <header class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-ink">Ringkasan KPI</h2>
        <p class="text-sm text-ink-soft">Empat angka utama untuk memantau pelanggan, leads, eskalasi, dan respons.</p>
      </div>
    </header>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#if $statsSummary}
        {#each $statsSummary as card (card.id)}
          <KpiCard {...card} />
        {/each}
      {:else}
        {#if $statsState.status === 'loading'}
          {#each Array(4) as _, index (index)}
            <article class="animate-pulse rounded-2xl border border-surface-muted bg-surface p-5" aria-hidden="true">
              <div class="h-3 w-24 rounded bg-surface-muted"></div>
              <div class="mt-4 h-6 w-16 rounded bg-surface-muted"></div>
              <div class="mt-8 h-6 w-full rounded bg-surface-muted"></div>
            </article>
          {/each}
        {:else if $statsState.status === 'error'}
          <article class="col-span-full rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700">
            Tidak bisa memuat ringkasan: {$statsState.error}
          </article>
        {/if}
      {/if}
    </div>
  </section>

  <section class="rounded-2xl border border-surface-muted bg-surface shadow-sm">
    <div class="flex flex-col gap-4 border-b border-surface-muted p-6 sm:flex-row sm:items-center sm:justify-between">
      <nav class="flex gap-2 rounded-full bg-surface-muted p-1 text-sm font-medium">
        <button
          class={`rounded-full px-4 py-2 transition ${activeTab === 'customers' ? 'bg-accent-muted text-accent shadow-sm' : 'bg-surface text-ink-soft'}`}
          on:click={() => {
            activeTab = 'customers';
            tableResetSignal += 1;
          }}
          type="button"
        >
          Customers
        </button>
        <button
          class={`rounded-full px-4 py-2 transition ${activeTab === 'leads' ? 'bg-accent-muted text-accent shadow-sm' : 'bg-surface text-ink-soft'}`}
          on:click={() => {
            activeTab = 'leads';
            tableResetSignal += 1;
          }}
          type="button"
        >
          Leads
        </button>
      </nav>

      <div class="w-full sm:w-72">
        <label class="sr-only" for="data-search">Cari</label>
        <input
          id="data-search"
          type="search"
          placeholder={activeTab === 'customers' ? 'Cari pelanggan…' : 'Cari leads…'}
          class="w-full rounded-lg border border-surface-muted bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          value={activeTab === 'customers' ? $customerFilter : $leadFilter}
          on:input={handleSearch}
        />
      </div>
    </div>

    <div class="p-6">
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
      {:else}
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
      {/if}
    </div>
  </section>
  <p class="sr-only" aria-live="polite">
    {#if pendingAction}
      Aksi {pendingAction.action} dipilih untuk {pendingAction.dataset === 'customers' ? 'pelanggan' : 'lead'}{' '}
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
      <p class="text-sm text-ink-soft">Memuat detail…</p>
    {:else if detailModal.error}
      <p class="text-sm text-rose-600">{detailModal.error}</p>
    {:else if detailModal.dataset === 'customers'}
      {#if detailModal.customerDetail}
        <div class="space-y-6">
          <section class="rounded-2xl border border-surface-muted bg-surface px-4 py-4">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-ink-soft">Profil Pelanggan</h3>
            <dl class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt class="text-xs text-ink-soft">Nama</dt>
                <dd class="text-sm font-medium text-ink">{detailModal.customerDetail.name ?? '—'}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-soft">Telepon</dt>
                <dd class="text-sm font-medium text-ink">{detailModal.customerDetail.phone ?? '—'}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-soft">Lokasi</dt>
                <dd class="text-sm text-ink-soft">{detailModal.customerDetail.location ?? '—'}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-soft">Prioritas</dt>
                <dd class="text-sm font-medium text-ink">
                  {detailModal.customerDetail.customer_priority ?? detailModal.customerDetail.priority ?? '—'}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-ink-soft">PIC</dt>
                <dd class="text-sm text-ink-soft">{detailModal.customerDetail.assigned_to ?? '—'}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-soft">Tags</dt>
                <dd class="text-sm text-ink-soft">
                  {#if Array.isArray(detailModal.customerDetail.tags) && detailModal.customerDetail.tags.length > 0}
                    {detailModal.customerDetail.tags.join(', ')}
                  {:else}
                    —
                  {/if}
                </dd>
              </div>
            </dl>
          </section>
          <section class="rounded-2xl border border-surface-muted bg-surface px-4 py-4">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-ink-soft">Riwayat Kontak</h3>
            {#if normalizeContactHistory(detailModal.customerDetail).length > 0}
              <ol class="mt-4 space-y-3">
                {#each normalizeContactHistory(detailModal.customerDetail) as item, index (index)}
                  <li class="rounded-xl border border-surface-muted bg-surface px-4 py-3">
                    <p class="text-sm font-semibold text-ink">{item.channel ?? 'Interaksi'}</p>
                    <p class="text-xs text-ink-soft">{formatDateTime(item.time ?? item.timestamp)}</p>
                    <p class="mt-2 text-sm text-ink-soft">{item.summary ?? item.notes ?? 'Tidak ada catatan.'}</p>
                  </li>
                {/each}
              </ol>
            {:else}
              <p class="mt-4 text-sm text-ink-soft">Belum ada riwayat kontak.</p>
            {/if}
          </section>
        </div>
      {:else}
        <p class="text-sm text-ink-soft">Detail pelanggan tidak tersedia.</p>
      {/if}
    {:else if detailModal.dataset === 'leads'}
      {#if detailModal.leadDetail}
        <div class="space-y-6">
          <section class="rounded-2xl border border-surface-muted bg-surface px-4 py-4">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-ink-soft">Informasi Lead</h3>
            <dl class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt class="text-xs text-ink-soft">Nama</dt>
                <dd class="text-sm font-medium text-ink">{detailModal.leadDetail.name ?? '—'}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-soft">Kontak</dt>
                <dd class="text-sm font-medium text-ink">{leadContactDisplay(detailModal.leadDetail)}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-soft">Sumber</dt>
                <dd class="text-sm text-ink-soft">{detailModal.leadDetail.source ?? '—'}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-soft">Status</dt>
                <dd class="text-sm font-medium text-ink">{detailModal.leadDetail.status ?? '—'}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-soft">Score</dt>
                <dd class="text-sm font-medium text-ink">{leadScoreDisplay(detailModal.leadDetail)}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-soft">PIC</dt>
                <dd class="text-sm text-ink-soft">{leadOwnerDisplay(detailModal.leadDetail)}</dd>
              </div>
            </dl>
          </section>
          <section class="rounded-2xl border border-surface-muted bg-surface px-4 py-4">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-ink-soft">Timeline Interaksi</h3>
            {#if normalizeLeadTimeline(detailModal.leadDetail).length > 0}
              <ol class="mt-4 space-y-3">
                {#each normalizeLeadTimeline(detailModal.leadDetail) as item, index (index)}
                  <li class="rounded-xl border border-surface-muted bg-surface px-4 py-3">
                    <p class="text-sm font-semibold text-ink">{item.channel ?? 'Aktivitas'}</p>
                    <p class="text-xs text-ink-soft">{formatDateTime(item.time ?? item.timestamp)}</p>
                    <p class="mt-2 text-sm text-ink-soft">{item.notes ?? item.summary ?? 'Tidak ada catatan.'}</p>
                  </li>
                {/each}
              </ol>
            {:else}
              <p class="mt-4 text-sm text-ink-soft">Belum ada interaksi.</p>
            {/if}
          </section>
        </div>
      {:else}
        <p class="text-sm text-ink-soft">Detail lead tidak tersedia.</p>
      {/if}
    {:else}
      <p class="text-sm text-ink-soft">Pilih entri untuk melihat detail.</p>
    {/if}
  </Modal>

  <Modal open={chatModal.open} title={`Percakapan • ${chatModalTitle()}`} subtitle={extractIdentifiers(chatModal.record).phone} size="lg" on:close={closeChatModal}>
    {#if chatModal.loading}
      <p class="text-sm text-ink-soft">Memuat riwayat chat…</p>
    {:else if chatModal.error}
      <div class="space-y-4">
        <p class="text-sm text-rose-600">{chatModal.error}</p>
          <button
            type="button"
            class="rounded-lg border border-surface-muted bg-surface px-3 py-2 text-sm font-medium text-ink-soft transition hover:border-accent hover:text-accent"
            on:click={retryChatHistory}
          >
            Coba lagi
          </button>
      </div>
    {:else if chatModal.messages.length === 0}
      <p class="text-sm text-ink-soft">Belum ada percakapan.</p>
    {:else}
      <ol class="space-y-3">
        {#each chatModal.messages as message, index (index)}
          <li class="rounded-xl border border-surface-muted bg-surface px-4 py-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-ink">{message.sender ?? message.from ?? 'Agent'}</p>
              <span class="text-xs text-ink-soft">{formatDateTime(message.time ?? message.timestamp ?? message.created_at)}</span>
            </div>
            <p class="mt-2 text-sm text-ink-soft">{message.text ?? message.body ?? message.message ?? '—'}</p>
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
        <label class="text-xs font-semibold uppercase tracking-wide text-ink-soft" for="whatsapp-phone">Nomor</label>
        <input
          id="whatsapp-phone"
          type="tel"
          class="mt-1 w-full rounded-lg border border-surface-muted px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          bind:value={messageModal.phone}
          required
        />
      </div>
      <div>
        <label class="text-xs font-semibold uppercase tracking-wide text-ink-soft" for="whatsapp-message">Pesan</label>
        <textarea
          id="whatsapp-message"
          class="mt-1 h-32 w-full rounded-lg border border-surface-muted px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
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
        class="rounded-lg border border-surface-muted px-3 py-2 text-sm font-medium text-ink-soft transition hover:border-accent hover:text-accent"
        on:click={closeMessageModal}
      >
        Batal
      </button>
      <button
        type="submit"
        form="whatsapp-form"
        class="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90 disabled:opacity-50"
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
      <p class="text-sm text-ink-soft">
        Konfirmasi penyelesaian eskalasi untuk{' '}
        <strong>{resolveModalTargetName()}</strong>.
        Tambahkan catatan bila diperlukan.
      </p>
      <div>
        <label class="text-xs font-semibold uppercase tracking-wide text-ink-soft" for="resolve-notes">Catatan</label>
        <textarea
          id="resolve-notes"
          class="mt-1 h-28 w-full rounded-lg border border-surface-muted px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
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
        class="rounded-lg border border-surface-muted px-3 py-2 text-sm font-medium text-ink-soft transition hover:border-accent hover:text-accent"
        on:click={closeResolveModal}
      >
        Batal
      </button>
      <button
        type="submit"
        form="resolve-form"
        class="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90 disabled:opacity-50"
        disabled={resolveModal.sending}
      >
        {resolveModal.sending ? 'Memproses…' : 'Selesaikan'}
      </button>
    </div>
  </Modal>
</section>
