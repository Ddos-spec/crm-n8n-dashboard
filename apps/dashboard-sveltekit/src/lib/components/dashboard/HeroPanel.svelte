<script lang="ts">
  export type ConnectionStatus = 'checking' | 'online' | 'offline';

  interface RefreshOption {
    label: string;
    value: number;
  }

  export let title = 'CRM Overview';
  export let subtitle = '';
  export let workflowId: string;
  export let baseUrl: string;
  export let connectionStatus: ConnectionStatus = 'checking';
  export let lastUpdatedLabel = 'Belum pernah';
  export let refreshOptions: RefreshOption[] = [];
  export let refreshInterval = 0;
  export let countdownLabel = '—';
  export let isRefreshing = false;
  export let refreshError: string | null = null;
  export let onRefresh: () => void;
  export let onChangeInterval: (value: number) => void;
  export let newItemsCount = 0;
  export let realtimeStatus = 'Standby';
  export let periodLabel = 'Semua waktu';

const statusMeta: Record<ConnectionStatus, { label: string; tone: string }> = {
  checking: { label: 'Mengecek koneksi…', tone: 'bg-amber-100 text-amber-700' },
  online: { label: 'Terhubung', tone: 'bg-emerald-100 text-emerald-700' },
  offline: { label: 'Putus sambungan', tone: 'bg-rose-100 text-rose-700' }
};

const indicatorTone: Record<ConnectionStatus, string> = {
  checking: 'bg-amber-500',
  online: 'bg-emerald-500',
  offline: 'bg-rose-500'
};

  const refreshLabel = (option: RefreshOption) => option.label;

  function handleChange(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    const value = Number(select.value);
    onChangeInterval?.(value);
  }
</script>

<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
  <div class="flex flex-col gap-6 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
    <div class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CRM Dashboard</p>
      <h1 class="text-3xl font-semibold text-slate-900">{title}</h1>
      {#if subtitle}
        <p class="text-sm text-slate-600">{subtitle}</p>
      {/if}
      <p class="text-xs text-slate-500">
        Workflow <span class="font-semibold text-slate-900">{workflowId}</span> • sumber data n8n di
        <span class="font-semibold text-slate-900">{baseUrl}</span>
      </p>
    </div>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div class="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span class={`h-2.5 w-2.5 rounded-full ${indicatorTone[connectionStatus]}`}></span>
        <span class={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta[connectionStatus].tone}`}>
          {statusMeta[connectionStatus].label}
        </span>
        <span class="hidden text-slate-400 sm:inline" aria-hidden="true">•</span>
        <div class="flex flex-col text-xs text-slate-600">
          <span class="font-medium text-slate-900">Update terakhir</span>
          <span>{lastUpdatedLabel}</span>
        </div>
      </div>
      <div class="flex flex-col gap-3 sm:items-end">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label class="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Auto refresh
            <select
              class="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              on:change={handleChange}
              disabled={isRefreshing}
              value={refreshInterval}
            >
              {#each refreshOptions as option (option.value)}
                <option value={option.value}>{refreshLabel(option)}</option>
              {/each}
            </select>
          </label>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            on:click={() => onRefresh?.()}
            disabled={isRefreshing}
          >
            {#if isRefreshing}
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
              Menyegarkan…
            {:else}
              Refresh data
            {/if}
            {#if refreshInterval > 0}
              <span class="ml-1 text-xs font-medium text-white/80">{countdownLabel}</span>
            {/if}
          </button>
        </div>
        <div class="text-sm text-slate-500">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </div>
  <div class="mt-6 grid gap-4 text-sm text-slate-600 md:grid-cols-3">
    <div class="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span class="inline-flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-sm font-semibold text-blue-600">{newItemsCount}</span>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Update baru</p>
        <p class="text-sm text-slate-900">Sejak refresh terakhir</p>
      </div>
    </div>
    <div class="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span class="inline-flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">•</span>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Status real-time</p>
        <p class="text-sm text-slate-900">{realtimeStatus}</p>
      </div>
    </div>
    <div class="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span class="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">🗓</span>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Periode aktif</p>
        <p class="text-sm text-slate-900">{periodLabel}</p>
      </div>
    </div>
  </div>
  {#if refreshError}
    <div class="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      Gagal memuat data terbaru: {refreshError}
    </div>
  {/if}
</section>
