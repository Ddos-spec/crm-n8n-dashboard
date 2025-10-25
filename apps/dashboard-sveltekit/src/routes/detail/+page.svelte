<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import type { ChartConfiguration } from 'chart.js';
  import BaseChart from '$lib/components/charts/BaseChart.svelte';
  import { config } from '$config';
  import { statsStore } from '$stores/statsStore';
  import { customersStore } from '$stores/customersStore';
  import { leadsStore } from '$stores/leadsStore';
  import { escalationsStore } from '$stores/escalationsStore';
  import {
    buildSparklineSeries,
    buildResponseTrend,
    buildEscalationBreakdown,
    buildFunnelRows,
    deriveActivities,
    deriveNotifications,
    deriveTeamLeaderboard,
    deriveCsatInsight,
    formatNumber,
    type SparklinePoint,
    type ResponseTrend,
    type EscalationBreakdown,
    type FunnelRow,
    type ActivityItem,
    type NotificationItem,
    type LeaderboardEntry,
    type CsatInsight
  } from '$lib/utils/insights';
  import type { CustomerRecord, LeadRecord, EscalationRecord } from '$lib/types/api';

  const statsState = statsStore;
  const statsSummary = statsStore.summary;
  const customersState = customersStore;
  const leadsState = leadsStore;
  const escalationsState = escalationsStore;

  let refreshing = false;
  let refreshError: string | null = null;

  const numberFormatter = new Intl.NumberFormat('id-ID');
  const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const relativeFormatter = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });

  const accentPalette: Record<string, { border: string; background: string }> = {
    sky: { border: 'rgba(14, 165, 233, 0.9)', background: 'rgba(14, 165, 233, 0.2)' },
    cyan: { border: 'rgba(6, 182, 212, 0.9)', background: 'rgba(6, 182, 212, 0.2)' },
    amber: { border: 'rgba(245, 158, 11, 0.9)', background: 'rgba(245, 158, 11, 0.15)' },
    emerald: { border: 'rgba(16, 185, 129, 0.9)', background: 'rgba(16, 185, 129, 0.15)' }
  };

  $: statsData = $statsState.data;
  $: customers =
    $customersState.status === 'success' && $customersState.data
      ? ($customersState.data.items as CustomerRecord[])
      : ([] as CustomerRecord[]);
  $: leads =
    $leadsState.status === 'success' && $leadsState.data
      ? ($leadsState.data.items as LeadRecord[])
      : ([] as LeadRecord[]);
  $: escalations =
    $escalationsState.status === 'success' && $escalationsState.data
      ? ($escalationsState.data.items as EscalationRecord[])
      : ([] as EscalationRecord[]);

  $: sparklineSeries = buildSparklineSeries(statsData);
  $: responseTrend = buildResponseTrend(statsData);
  $: funnelRows = buildFunnelRows(statsData, leads);
  $: escalationBreakdown = buildEscalationBreakdown(escalations);
  $: activities = deriveActivities(customers, leads);
  $: notifications = deriveNotifications(escalations);
  $: leaderboard = deriveTeamLeaderboard(statsData);
  $: csat = deriveCsatInsight(statsData);

  function sparklineConfig(points: SparklinePoint[], accent: 'sky' | 'cyan' | 'amber' | 'emerald'): ChartConfiguration<'line'> {
    const palette = accentPalette[accent];
    return {
      type: 'line',
      data: {
        labels: points.map((point) => point.label),
        datasets: [
          {
            data: points.map((point) => point.value),
            borderColor: palette.border,
            backgroundColor: palette.background,
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    };
  }

  function responseChartConfig(trend: ResponseTrend): ChartConfiguration<'line'> {
    return {
      type: 'line',
      data: {
        labels: trend.labels,
        datasets: [
          {
            label: 'Average Response Time',
            data: trend.values,
            borderColor: 'rgba(37, 99, 235, 0.9)',
            backgroundColor: 'rgba(37, 99, 235, 0.2)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#2563eb',
            borderWidth: 2
          },
          {
            label: 'SLA Target',
            data: new Array(trend.values.length).fill(20),
            borderColor: 'rgba(16, 185, 129, 0.8)',
            borderDash: [6, 6],
            fill: false,
            pointRadius: 0,
            borderWidth: 1.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#4b5563' } },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} menit`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#4b5563' },
            grid: { color: 'rgba(148, 163, 184, 0.2)' }
          },
          x: {
            ticks: { color: '#64748b' },
            grid: { display: false }
          }
        }
      }
    };
  }

  function escalationChartConfig(breakdown: EscalationBreakdown): ChartConfiguration<'doughnut'> {
    return {
      type: 'doughnut',
      data: {
        labels: ['Open', 'Pending', 'Resolved'],
        datasets: [
          {
            data: [breakdown.open, breakdown.pending, breakdown.resolved],
            backgroundColor: ['#f97316', '#facc15', '#34d399'],
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#4b5563' } }
        }
      }
    };
  }

  function formatRelativeTime(value: string | null): string {
    if (!value) return 'Tidak diketahui';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const diffMs = date.getTime() - Date.now();
    const diffMinutes = Math.round(diffMs / 60000);
    if (Math.abs(diffMinutes) < 60) {
      return relativeFormatter.format(diffMinutes, 'minute');
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return relativeFormatter.format(diffHours, 'hour');
    }
    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 30) {
      return relativeFormatter.format(diffDays, 'day');
    }
    const diffMonths = Math.round(diffDays / 30);
    if (Math.abs(diffMonths) < 12) {
      return relativeFormatter.format(diffMonths, 'month');
    }
    const diffYears = Math.round(diffMonths / 12);
    return relativeFormatter.format(diffYears, 'year');
  }

  function sparklineFor(cardId: string): SparklinePoint[] {
    switch (cardId) {
      case 'totalCustomers':
        return sparklineSeries.customers;
      case 'totalLeads':
        return sparklineSeries.leads;
      case 'openEscalations':
        return sparklineSeries.escalations;
      case 'responseRate':
        return sparklineSeries.responseRate;
      default:
        return [];
    }
  }

  function accentFor(cardId: string): 'sky' | 'cyan' | 'amber' | 'emerald' {
    switch (cardId) {
      case 'totalCustomers':
        return 'sky';
      case 'totalLeads':
        return 'cyan';
      case 'openEscalations':
        return 'amber';
      case 'responseRate':
      default:
        return 'emerald';
    }
  }

  async function refreshAll() {
    if (refreshing) return;
    refreshing = true;
    refreshError = null;

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
    }

    refreshing = false;
  }

  onMount(() => {
    void refreshAll();
  });
</script>

<svelte:head>
  <title>Insight Lengkap • CRM Dashboard</title>
</svelte:head>

<section class="space-y-10 px-6 py-10">
  <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <a
        href="/"
        class="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80"
        aria-label="Kembali ke ringkasan"
      >
        ← Kembali ke ringkasan
      </a>
      <h1 class="mt-2 text-3xl font-semibold text-ink">Insight Lengkap</h1>
      <p class="mt-1 text-sm text-ink-soft">
        Semua data CRM dari workflow <span class="font-semibold text-ink">{config.n8n.workflowId}</span> di{' '}
        <span class="font-semibold text-ink">{config.n8n.baseUrl}</span>.
      </p>
    </div>
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      {#if refreshError}
        <p class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700">{refreshError}</p>
      {/if}
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-ink-soft/40"
        on:click={() => refreshAll()}
        disabled={refreshing}
      >
        {#if refreshing}
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
          Menyegarkan…
        {:else}
          Refresh data
        {/if}
      </button>
    </div>
  </header>

  <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {#if $statsSummary}
      {#each $statsSummary as card (card.id)}
        <article class="flex h-full flex-col justify-between rounded-3xl border border-surface-muted bg-surface p-5 shadow-sm">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft/70">{card.label}</p>
            <p class="mt-2 text-3xl font-semibold text-ink">{card.value}</p>
            {#if card.delta !== null}
              <p class={`mt-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${card.delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {card.delta > 0 ? '+' : ''}{card.delta}% • {card.period ?? 'Periode tidak diketahui'}
              </p>
            {:else if card.period}
              <p class="mt-2 text-xs text-ink-soft">{card.period}</p>
            {/if}
          </div>
          <div class="mt-4 h-24">
            <BaseChart
              config={sparklineConfig(sparklineFor(card.id), accentFor(card.id))}
              hasData={sparklineFor(card.id).length > 0}
              height={96}
              ariaLabel={`Tren ${card.label}`}
              emptyMessage={`Belum ada tren ${card.label.toLowerCase()}`}
            />
          </div>
        </article>
      {/each}
    {:else}
      <p class="rounded-3xl border border-dashed border-surface-muted bg-surface px-4 py-10 text-center text-sm text-ink-soft">
        Menunggu data statistik dari n8n…
      </p>
    {/if}
  </section>

  <section class="grid gap-6 lg:grid-cols-2">
    <article class="flex h-full flex-col gap-4 rounded-3xl border border-surface-muted bg-surface p-6 shadow-sm">
      <header class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-ink">Response Time Trend</h2>
          <p class="text-sm text-ink-soft">Analisis rata-rata waktu respon per periode.</p>
        </div>
        {#if responseTrend.averageLabel}
          <span class="rounded-full bg-accent-muted px-3 py-1 text-xs font-semibold text-accent">
            Rata-rata {responseTrend.averageLabel}
          </span>
        {/if}
      </header>
      <div class="h-72">
        <BaseChart
          config={responseChartConfig(responseTrend)}
          hasData={responseTrend.hasData}
          ariaLabel="Grafik tren waktu respon"
          emptyMessage="Belum ada data response time"
          emptyDescription="Grafik akan muncul setelah n8n mengirimkan histori response time."
        />
      </div>
    </article>
    <article class="flex h-full flex-col gap-4 rounded-3xl border border-surface-muted bg-surface p-6 shadow-sm">
      <header class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-ink">Status Eskalasi</h2>
          <p class="text-sm text-ink-soft">Distribusi tiket eskalasi terbaru.</p>
        </div>
        <span class="text-sm font-semibold text-ink">{numberFormatter.format(escalationBreakdown.total)} tiket</span>
      </header>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="h-64">
          <BaseChart
            config={escalationChartConfig(escalationBreakdown)}
            hasData={escalationBreakdown.total > 0}
            ariaLabel="Diagram status eskalasi"
            emptyMessage="Belum ada data eskalasi"
            emptyDescription="Semua tiket sudah terselesaikan atau belum diterima dari n8n."
          />
        </div>
        <ul class="flex flex-col justify-center gap-3 text-sm text-ink-soft">
          <li class="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3">
            <span class="font-medium text-rose-600">Open</span>
            <span class="text-base font-semibold text-ink">{formatNumber(escalationBreakdown.open)}</span>
          </li>
          <li class="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
            <span class="font-medium text-amber-600">Pending</span>
            <span class="text-base font-semibold text-ink">{formatNumber(escalationBreakdown.pending)}</span>
          </li>
          <li class="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
            <span class="font-medium text-emerald-600">Resolved</span>
            <span class="text-base font-semibold text-ink">{formatNumber(escalationBreakdown.resolved)}</span>
          </li>
        </ul>
      </div>
    </article>
  </section>

  <section class="grid gap-6 lg:grid-cols-3">
    <article class="rounded-3xl border border-surface-muted bg-surface p-6 shadow-sm lg:col-span-2">
      <header class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-ink">Funnel Konversi</h2>
          <p class="text-sm text-ink-soft">Tahapan leads berdasarkan data n8n.</p>
        </div>
        <span class="text-xs font-semibold uppercase tracking-wide text-ink-soft">{funnelRows.length} tahap</span>
      </header>
      {#if funnelRows.length > 0}
        <table class="mt-4 w-full border-separate border-spacing-y-3">
          <tbody>
            {#each funnelRows as row (row.key)}
              <tr class="rounded-2xl border border-surface-muted bg-surface">
                <td class="px-4 py-3">
                  <p class="text-sm font-semibold text-ink">{row.label}</p>
                  {#if row.statuses.length > 0}
                    <div class="mt-2 flex flex-wrap gap-2 text-xs text-ink-soft">
                      {#each row.statuses as status (status)}
                        <span class="rounded-full bg-surface-muted px-2 py-1">{status}</span>
                      {/each}
                    </div>
                  {/if}
                </td>
                <td class="px-4 py-3 text-right text-lg font-semibold text-ink">
                  {numberFormatter.format(row.count)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="mt-6 rounded-2xl border border-dashed border-surface-muted bg-surface px-4 py-6 text-sm text-ink-soft">
          Belum ada data funnel yang dapat ditampilkan.
        </p>
      {/if}
    </article>
    <article class="flex flex-col gap-4 rounded-3xl border border-surface-muted bg-surface p-6 shadow-sm">
      <header>
        <h2 class="text-lg font-semibold text-ink">Customer Satisfaction</h2>
        <p class="text-sm text-ink-soft">Ikhtisar CSAT dari laporan terbaru.</p>
      </header>
      {#if csat.score}
        <div class="flex items-end justify-between">
          <div>
            <p class="text-5xl font-semibold text-ink">{csat.score}</p>
            <p class="text-sm text-ink-soft">Skor rata-rata</p>
          </div>
          {#if csat.trend}
            <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">{csat.trend}</span>
          {/if}
        </div>
        {#if csat.summary}
          <p class="text-sm text-ink-soft">{csat.summary}</p>
        {/if}
        <dl class="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-soft/70">Respon</dt>
            <dd class="mt-1 font-semibold text-ink">{csat.responses ?? '—'}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-soft/70">Sentimen positif</dt>
            <dd class="mt-1 font-semibold text-ink">{csat.sentiment ?? '—'}</dd>
          </div>
        </dl>
      {:else}
        <p class="rounded-2xl border border-dashed border-surface-muted bg-surface px-4 py-6 text-sm text-ink-soft">
          Tambahkan data CSAT pada workflow n8n untuk memunculkan ringkasan ini.
        </p>
      {/if}
    </article>
  </section>

  <section class="grid gap-6 lg:grid-cols-2">
    <article class="rounded-3xl border border-surface-muted bg-surface p-6 shadow-sm">
      <header class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-ink">Aktivitas Terbaru</h2>
        <span class="text-xs font-semibold uppercase tracking-wide text-ink-soft">{activities.length} entri</span>
      </header>
      {#if activities.length > 0}
        <ol class="mt-4 space-y-3">
          {#each activities as activity, index (index)}
            <li class="rounded-2xl border border-surface-muted bg-surface px-4 py-3">
              <p class="text-sm font-semibold text-ink">{activity.title}</p>
              <p class="text-xs text-ink-soft">{activity.detail}</p>
              <p
                class="mt-2 text-xs text-ink-soft/80"
                title={activity.timestamp ? dateFormatter.format(new Date(activity.timestamp)) : undefined}
              >
                {formatRelativeTime(activity.timestamp)}
              </p>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="mt-6 rounded-2xl border border-dashed border-surface-muted bg-surface px-4 py-6 text-sm text-ink-soft">
          Belum ada aktivitas terbaru yang tercatat.
        </p>
      {/if}
    </article>
    <article class="rounded-3xl border border-surface-muted bg-surface p-6 shadow-sm">
      <header class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-ink">Notifikasi Eskalasi</h2>
        <span class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Prioritas</span>
      </header>
      {#if notifications.length > 0}
        <ul class="mt-4 space-y-3">
          {#each notifications as notification, index (index)}
            <li class="rounded-2xl border border-surface-muted bg-surface px-4 py-3">
              <p class="text-sm font-semibold text-ink">{notification.title}</p>
              <p class="text-xs text-ink-soft">{notification.detail}</p>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="mt-6 rounded-2xl border border-dashed border-surface-muted bg-surface px-4 py-6 text-sm text-ink-soft">
          Semua eskalasi sudah terselesaikan. Tidak ada notifikasi baru.
        </p>
      {/if}
    </article>
  </section>

  <section class="rounded-3xl border border-surface-muted bg-surface p-6 shadow-sm">
    <header class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-ink">Team Performance</h2>
        <p class="text-sm text-ink-soft">Top agent berdasarkan data n8n.</p>
      </div>
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-soft">{leaderboard.length} anggota</span>
    </header>
    {#if leaderboard.length > 0}
      <ul class="mt-4 space-y-3">
        {#each leaderboard as member, index (member.name + index)}
          <li class="flex items-center justify-between rounded-2xl bg-surface-muted/60 px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent">#{index + 1}</span>
              <div>
                <p class="text-sm font-semibold text-ink">{member.name}</p>
                <p class="text-xs text-ink-soft">{member.handled} tiket • SLA {member.sla}</p>
              </div>
            </div>
            <span class="text-sm font-semibold text-emerald-600">{member.score}</span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="mt-6 rounded-2xl border border-dashed border-surface-muted bg-surface px-4 py-6 text-sm text-ink-soft">
        Belum ada data performa tim untuk ditampilkan.
      </p>
    {/if}
  </section>
</section>
