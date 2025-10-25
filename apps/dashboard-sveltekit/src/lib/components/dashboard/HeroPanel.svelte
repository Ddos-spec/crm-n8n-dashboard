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
    checking: 'bg-amber-400',
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

<section class="rounded-3xl border border-surface-muted bg-surface shadow-sm">
  <div class="flex flex-col gap-6 border-b border-surface-muted px-6 py-6 md:flex-row md:items-center md:justify-between">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft/70">CRM Dashboard</p>
      <h1 class="mt-2 text-3xl font-semibold text-ink">{title}</h1>
      {#if subtitle}
        <p class="mt-2 text-sm text-ink-soft">{subtitle}</p>
      {/if}
      <p class="mt-3 text-xs text-ink-soft/80">
        Workflow <span class="font-semibold text-ink">{workflowId}</span> • sumber data n8n di
        <span class="font-semibold text-ink">{baseUrl}</span>
      </p>
    </div>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div class="flex items-center gap-3 rounded-2xl border border-surface-muted px-4 py-3 text-sm text-ink-soft">
        <span class={`h-2.5 w-2.5 rounded-full ${indicatorTone[connectionStatus]}`}></span>
        <span class={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta[connectionStatus].tone}`}>
          {statusMeta[connectionStatus].label}
        </span>
        <span class="hidden text-surface-muted sm:inline" aria-hidden="true">•</span>
        <div class="flex flex-col text-xs text-ink-soft">
          <span class="font-medium text-ink">Update terakhir</span>
          <span>{lastUpdatedLabel}</span>
        </div>
      </div>
      <div class="flex flex-col gap-3 sm:items-end">
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 rounded-full border border-surface-muted bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Auto refresh
            <select
              class="rounded-full border border-surface-muted bg-white px-2 py-1 text-xs font-medium text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
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
            class="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-ink-soft/40"
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
        <slot name="actions" />
      </div>
    </div>
  </div>
  <div class="grid gap-4 px-6 py-4 text-sm text-ink-soft md:grid-cols-3">
    <div class="flex items-center gap-2 rounded-2xl border border-surface-muted bg-surface px-3 py-3">
      <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent">{newItemsCount}</span>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft/70">Update baru</p>
        <p class="text-sm text-ink">Sejak refresh terakhir</p>
      </div>
    </div>
    <div class="flex items-center gap-2 rounded-2xl border border-surface-muted bg-surface px-3 py-3">
      <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">•</span>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft/70">Status real-time</p>
        <p class="text-sm text-ink">{realtimeStatus}</p>
      </div>
    </div>
    <div class="flex items-center gap-2 rounded-2xl border border-surface-muted bg-surface px-3 py-3">
      <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-ink">🗓</span>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft/70">Periode aktif</p>
        <p class="text-sm text-ink">{periodLabel}</p>
      </div>
    </div>
  </div>
  {#if refreshError}
    <div class="border-t border-surface-muted bg-rose-50 px-6 py-4 text-sm text-rose-700">
      Gagal memuat data terbaru: {refreshError}
    </div>
  {/if}
</section>
