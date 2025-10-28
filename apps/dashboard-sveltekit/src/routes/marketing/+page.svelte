<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import HeroPanel, { type ConnectionStatus } from '$lib/components/dashboard/HeroPanel.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import DataTable, {
    type ColumnDefinition,
    type RowActionDetail
  } from '$lib/components/dashboard/DataTable.svelte';
  import LeadStatusCell from '$lib/components/dashboard/LeadStatusCell.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import { statsStore } from '$stores/statsStore';
  import { leadsStore } from '$stores/leadsStore';
  import { config } from '$config';
  import { postActionJson, postWebhookAction } from '$lib/utils/api';
  import type {
    ActionResponse,
    ChatHistoryResponse,
    ChatMessage,
    CustomerContactHistoryItem,
    LeadRecord
  } from '$lib/types/api';

  const statsState = statsStore;
  const statsSummary = statsStore.summary;
  const statsUpdatedAt = statsStore.updatedAt;

  const leadsState = leadsStore;
  const leadFilter = leadsStore.filterTerm;
  const leadRows = leadsStore.filtered;

  type ActiveTab = 'leads' | 'analytics';
  let activeTab: ActiveTab = 'leads';
  let tableResetSignal = 0;

  let pendingAction:
    | {
        dataset: ActiveTab;
        action: string;
        record: LeadRecord;
      }
    | null = null;

  interface DetailModalState {
    open: boolean;
    dataset: ActiveTab | null;
    record: LeadRecord | null;
    loading: boolean;
    error: string | null;
    leadDetail: LeadRecord | null;
  }

  interface MessageModalState {
    open: boolean;
    record: LeadRecord | null;
    phone: string;
    message: string;
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
      leadDetail: null
    };
  }

  function createMessageModalState(): MessageModalState {
    return {
      open: false,
      record: null,
      phone: '',
      message: '',
      sending: false,
      error: null
    };
  }

  let detailModal = createDetailModalState();
  let messageModal = createMessageModalState();
  let feedback: { type: 'success' | 'error'; message: string } | null = null;

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
    },
    {
      id: 'score',
      label: 'Score',
      accessor: (item) => item.score ?? 0,
      sortable: true,
      class: 'text-slate-600'
    },
    {
      id: 'owner',
      label: 'PIC',
      accessor: (item) => item.owner ?? 'Belum ditugaskan',
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

  function normalizeLeadTimeline(record: LeadRecord | null): CustomerContactHistoryItem[] {
    if (!record) return [];
    const raw = (record as Record<string, unknown>).timeline as CustomerContactHistoryItem[] | undefined;
    if (!raw) return [];
    return raw.filter((item) => item && typeof item === 'object');
  }

  function extractIdentifiers(record: LeadRecord | null) {
    if (!record || typeof record !== 'object') {
      return {
        id: null,
        phone: null
      };
    }

    const source = record as Record<string, unknown>;
    const id = typeof source.id === 'string' ? source.id : null;
    const phone = typeof source.phone === 'string' ? source.phone : null;

    return { id, phone };
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
      leadsStore.refresh()
    ]);

    const states = [get(statsState), get(leadsState)];
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
    leadsStore.filterTerm.set(value);
    tableResetSignal += 1;
  }

  function handleSelectAction(
    dataset: ActiveTab,
    event: CustomEvent<RowActionDetail>
  ) {
    pendingAction = {
      dataset,
      action: event.detail.action,
      record: event.detail.item as LeadRecord
    };
    switch (event.detail.action) {
      case 'detail':
        openDetailModal(dataset, event.detail.item as LeadRecord);
        break;
      case 'whatsapp':
        openMessageModal(event.detail.item as LeadRecord);
        break;
      default:
        break;
    }
  }

  function closeDetailModal() {
    detailModal = createDetailModalState();
  }

  function closeMessageModal() {
    messageModal = createMessageModalState();
  }

  function openDetailModal(dataset: ActiveTab, record: LeadRecord) {
    detailModal = {
      ...createDetailModalState(),
      open: true,
      dataset,
      record,
      loading: false,
      leadDetail: record
    };
  }

  function openMessageModal(record: LeadRecord) {
    const { phone } = extractIdentifiers(record);
    messageModal = {
      ...createMessageModalState(),
      open: true,
      record,
      phone: phone ?? '',
      message: '',
      error: phone ? null : 'Nomor telepon tidak tersedia.'
    };
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

  function detailModalTitle() {
    return detailModal.leadDetail?.name ?? 'Detail Lead';
  }

  function detailModalSubtitle() {
    const lead = detailModal.leadDetail;
    if (!lead) return null;
    const contact = leadContactDisplay(lead);
    return contact === '—' ? null : contact;
  }

  onMount(() => {
    void refreshAll();
    // Set status realtime untuk marketing
    realtimeStatus = 'Siap follow-up';
    return () => {
      clearTimers();
    };
  });
</script>

<div class="min-h-screen bg-white text-slate-900">
  <header class="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
    <div>
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">MARKETING DASHBOARD</p>
      <h1 class="text-2xl font-semibold text-slate-900">Marketing Command Center</h1>
      <p class="mt-1 text-sm text-slate-600">Pusat analisis dan pengelolaan lead untuk tim marketing.</p>
    </div>
    <div class="flex items-center gap-4">
      <div class="hidden flex-col text-right text-xs text-slate-500 sm:flex">
        <span class="text-sm font-semibold text-slate-900">Marketing Agent</span>
        <span>marketing@tepatlaser.id</span>
      </div>
      <button
        type="button"
        class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-500 hover:text-blue-600"
      >
        Logout
      </button>
    </div>
  </header>

  <nav class="border-b border-slate-200 bg-slate-50 px-6 py-3 text-sm">
    <div class="flex flex-wrap items-center gap-6">
      <a href="/" class="text-slate-600 hover:text-blue-600">Dashboard Utama</a>
      <a href="/customer-service" class="text-slate-600 hover:text-blue-600">Customer Service</a>
      <a href="/marketing" class="font-semibold text-blue-600">Marketing</a>
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
      title="Marketing Command Center"
      subtitle="Dashboard khusus untuk tim marketing dengan fokus pada lead dan analisis performa"
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
          <h2 class="text-2xl font-semibold text-slate-900">Ringkasan KPI Marketing</h2>
          <p class="text-sm text-slate-600">Statistik penting untuk tim marketing.</p>
        </div>
      </header>

      <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {#if $statsSummary}
          {#each $statsSummary as card (card.id)}
            {#if card.id === 'totalLeads' || card.id === 'responseRate'} <!-- Hanya tampilkan lead dan response untuk marketing -->
              <KpiCard {...card} />
            {/if}
          {/each}
        {:else}
          {#if $statsState.status === 'loading'}
            {#each Array(2) as _, index (index)} <!-- Kurangi jumlah loading card untuk marketing -->
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
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:text-blue-600'
            }`}
            on:click={() => {
              activeTab = 'analytics';
              tableResetSignal += 1;
            }}
            type="button"
            disabled <!-- Analitik akan diimplementasi nanti -->
          >
            Analitik
          </button>
        </nav>

        <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <label class="sr-only" for="data-search">Cari</label>
          <input
            id="data-search"
            type="search"
            placeholder="Cari leads…"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:w-72"
            value={$leadFilter}
            on:input={handleSearch}
          />
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-500 hover:text-blue-600"
            on:click={() => {
              leadsStore.filterTerm.set('');
              tableResetSignal += 1;
            }}
          >
            Reset filter
          </button>
        </div>
      </div>

      <div class="px-6 pb-6">
        {#if activeTab === 'leads'}
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
          <div class="py-12 text-center">
            <p class="text-slate-600">Modul analitik sedang dalam pengembangan.</p>
          </div>
        {/if}
      </div>
    </section>
    <p class="sr-only" aria-live="polite">
      {#if pendingAction}
        Aksi {pendingAction.action} dipilih untuk lead {pendingAction.record.name}.
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
      {:else if detailModal.leadDetail}
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
  </main>
</div>