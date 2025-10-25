<script lang="ts">
  export type KpiAccent = 'sky' | 'cyan' | 'amber' | 'emerald';

  export let label: string;
  export let value: string;
  export let delta: number | null = null;
  export let period: string | null = null;
  export let accent: KpiAccent = 'sky';
  export let inverse = false;

const accentBorders: Record<KpiAccent, string> = {
  sky: 'border-l-4 border-l-sky-500',
  cyan: 'border-l-4 border-l-cyan-500',
  amber: 'border-l-4 border-l-amber-500',
  emerald: 'border-l-4 border-l-emerald-500'
};

const accentHighlights: Record<KpiAccent, string> = {
  sky: 'text-sky-600',
  cyan: 'text-cyan-600',
  amber: 'text-amber-600',
  emerald: 'text-emerald-600'
};

const deltaTone = (value: number | null, inverted: boolean) => {
  if (value === null) return 'bg-slate-100 text-slate-600';
  if (value === 0) return 'bg-slate-100 text-slate-600';
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

<article class={`flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md ${accentBorders[accent]}`}>
  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
  <p class={`text-3xl font-semibold text-slate-900 ${accentHighlights[accent]}`}>{value}</p>
  {#if delta !== null}
    <span class={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${deltaTone(delta, inverse)}`}>
      {deltaLabel(delta)}
    </span>
  {/if}
  {#if period}
    <p class="text-xs text-slate-500">{period}</p>
  {/if}
</article>
