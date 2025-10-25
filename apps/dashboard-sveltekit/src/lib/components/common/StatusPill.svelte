<script lang="ts">
  export type StatusTone = 'accent' | 'warning' | 'success' | 'danger' | 'neutral';

  export let value: string | null | undefined;
  export let tone: StatusTone = 'neutral';

const toneClasses: Record<StatusTone, string> = {
  accent: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  success: 'bg-emerald-100 text-emerald-700',
  danger: 'bg-rose-100 text-rose-700',
  neutral: 'bg-slate-100 text-slate-600'
};
</script>

<span class={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
  {value ?? '—'}
</span>
