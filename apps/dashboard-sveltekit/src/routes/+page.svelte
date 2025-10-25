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
  import { statsStore } from '$stores/statsStore';
  import { customersStore } from '$stores/customersStore';
  import { leadsStore } from '$stores/leadsStore';
  import { config } from '$config';
  import type { CustomerRecord, LeadRecord } from '$lib/types/api';

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
  }

  onMount(() => {
    void refreshAll();
    return () => {
      clearTimers();
    };
  });
</script>

<section class="space-y-10 px-6 py-10">
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
</section>
