<script lang="ts">
  export type KpiAccent = 'sky' | 'cyan' | 'amber' | 'emerald';

  export let label: string;
  export let value: string;
  export let delta: number | null = null;
  export let period: string | null = null;
  export let accent: KpiAccent = 'sky';
  export let inverse = false;

  const accentStyles: Record<KpiAccent, string> = {
    sky: 'border-sky-100 bg-sky-50/60',
    cyan: 'border-cyan-100 bg-cyan-50/60',
    amber: 'border-amber-100 bg-amber-50/60',
    emerald: 'border-emerald-100 bg-emerald-50/60'
  };

  const accentText: Record<KpiAccent, string> = {
    sky: 'text-sky-700',
    cyan: 'text-cyan-700',
    amber: 'text-amber-700',
    emerald: 'text-emerald-700'
  };

  const deltaTone = (value: number | null, inverted: boolean) => {
    if (value === null) return 'bg-slate-100 text-ink-soft';
    if (value === 0) return 'bg-slate-100 text-ink-soft';
    const isPositive = value > 0;
    if ((isPositive && !inverted) || (!isPositive && inverted)) {
      return 'bg-emerald-100 text-emerald-700';
    }
    if (Math.abs(value) > 10) {
      return 'bg-rose-100 text-rose-700';
    }
    return 'bg-amber-100 text-amber-700';
  };

  const deltaLabel = (value: number | null) => {
    if (value === null) return null;
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
  };
</script>

<article class={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${accentStyles[accent]}`}>
  <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft/70">{label}</p>
  <p class={`mt-3 text-3xl font-semibold text-ink ${accentText[accent]}`}>{value}</p>
  {#if delta !== null}
    <span class={`mt-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${deltaTone(delta, inverse)}`}>
      {deltaLabel(delta)}
    </span>
  {/if}
  {#if period}
    <p class="mt-2 text-xs text-ink-soft/80">{period}</p>
  {/if}
</article>
