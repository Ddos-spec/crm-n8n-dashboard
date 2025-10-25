<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { Chart, ChartConfiguration } from 'chart.js';

  export let config: ChartConfiguration;
  export let hasData = false;
  export let height = 240;
  export let ariaLabel = '';
  export let emptyMessage = 'Belum ada data';
  export let emptyDescription: string | null = null;

  let canvas: HTMLCanvasElement | null = null;
  let chart: Chart | null = null;
  let chartModule: typeof import('chart.js/auto') | null = null;
  let moduleReady = false;

  function destroyChart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  function cloneConfig(): ChartConfiguration {
    return {
      ...config,
      data: config.data ? structuredClone(config.data) : undefined,
      options: config.options ? structuredClone(config.options) : undefined
    } as ChartConfiguration;
  }

  function renderChart() {
    if (!moduleReady || !canvas || !hasData || !chartModule) {
      destroyChart();
      return;
    }

    const ChartCtor = chartModule.Chart;
    if (!ChartCtor) {
      return;
    }

    destroyChart();
    chart = new ChartCtor(canvas.getContext('2d')!, cloneConfig());
  }

  $: if (moduleReady) {
    if (hasData) {
      renderChart();
    } else {
      destroyChart();
    }
  }

  onMount(async () => {
    chartModule = await import('chart.js/auto');
    moduleReady = true;
    renderChart();
  });

  onDestroy(() => {
    destroyChart();
  });
</script>

{#if hasData}
  <canvas
    bind:this={canvas}
    aria-label={ariaLabel}
    style={`height: ${height}px; width: 100%;`}
    class="w-full"
  />
{:else}
  <div class="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-surface-muted bg-surface px-4 py-8 text-center text-sm text-ink-soft">
    <p class="font-medium">{emptyMessage}</p>
    {#if emptyDescription}
      <p class="mt-2 text-xs text-ink-soft/80">{emptyDescription}</p>
    {/if}
  </div>
{/if}
