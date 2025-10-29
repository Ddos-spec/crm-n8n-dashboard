<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { tick } from 'svelte';
  import { browser } from '$app/environment';

  export let open = false;
  export let title = '';
  export let subtitle: string | null = null;
  export let size: 'sm' | 'md' | 'lg' = 'md';

  const dispatch = createEventDispatcher<{ close: void }>();

  let dialogRef: HTMLDivElement | null = null;
  let footerContainer: HTMLDivElement | null = null;
  let footerObserver: MutationObserver | null = null;
  let hasFooter = false;
  let previousOverflow: string | null = null;

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  }

  function close() {
    dispatch('close');
  }

  function updateBodyScroll(lock: boolean) {
    if (!browser) return;
    if (lock) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else if (previousOverflow !== null) {
      document.body.style.overflow = previousOverflow;
      previousOverflow = null;
    }
  }

  function syncFooterPresence() {
    hasFooter = Boolean(footerContainer && footerContainer.childNodes.length > 0);
  }

  function initializeFooterObserver() {
    if (!browser || typeof MutationObserver === 'undefined') return;
    footerObserver?.disconnect();
    if (!footerContainer) {
      return;
    }
    footerObserver = new MutationObserver(() => syncFooterPresence());
    footerObserver.observe(footerContainer, { childList: true });
    syncFooterPresence();
  }

  async function focusDialog() {
    if (!open || !browser) return;
    await tick();
    dialogRef?.focus();
  }

  $: updateBodyScroll(open);
  $: void focusDialog();
  $: if (open) {
    syncFooterPresence();
  }
  $: if (footerContainer) {
    initializeFooterObserver();
  }

  onMount(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeydown);
    }
    initializeFooterObserver();
  });

  onDestroy(() => {
    updateBodyScroll(false);
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', handleKeydown);
    }
    footerObserver?.disconnect();
  });

  $: dialogSizeClass =
    size === 'lg'
      ? 'w-full max-w-4xl'
      : size === 'sm'
      ? 'w-full max-w-md'
      : 'w-full max-w-2xl';
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8"
    on:click={handleBackdropClick}
    role="presentation"
    transition:fade
  >
    <div
      class={`max-h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${dialogSizeClass}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={subtitle ? 'modal-subtitle' : undefined}
      tabindex="-1"
      bind:this={dialogRef}
    >
      <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
        <div class="space-y-1">
          {#if title}
            <h2 id="modal-title" class="text-lg font-semibold text-slate-900">{title}</h2>
          {/if}
          {#if subtitle}
            <p id="modal-subtitle" class="text-sm text-slate-600">{subtitle}</p>
          {/if}
        </div>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-blue-500 hover:text-blue-600"
          on:click={close}
        >
          <span class="sr-only">Tutup</span>
          ×
        </button>
      </header>
      <div class={`overflow-y-auto px-6 py-6 text-slate-700 ${hasFooter ? 'pb-4' : 'pb-6'}`}>
        <slot />
      </div>
      <div
        class={`border-t border-slate-200 px-6 py-4 ${hasFooter ? 'block' : 'hidden'}`}
        bind:this={footerContainer}
      >
        <slot name="footer" />
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body.modal-open) {
    overflow: hidden;
  }
</style>
