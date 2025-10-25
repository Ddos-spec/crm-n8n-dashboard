<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import type { ComponentType } from 'svelte';

  export interface ColumnDefinition<T = unknown> {
    id: string;
    label: string;
    align?: 'left' | 'center' | 'right';
    accessor?: (item: T) => string | number | null | undefined;
    sortAccessor?: (item: T) => string | number | null | undefined;
    sortable?: boolean;
    width?: string;
    class?: string;
    cell?: ComponentType<{ item: T }>;
    excludeFromExport?: boolean;
  }

  export interface ExportColumn<T = unknown> {
    id: string;
    label: string;
    accessor?: (item: T) => string | number | null | undefined;
  }

  export interface RowActionDetail<T = unknown> {
    action: string;
    item: T;
  }

  export let columns: ColumnDefinition[] = [];
  export let items: unknown[] = [];
  export let keyField = 'id';
  export let pageSizeOptions = [10, 25, 50];
  export let initialPageSize: number | null = null;
  export let loading = false;
  export let error: string | null = null;
  export let emptyMessage = 'Tidak ada data untuk ditampilkan.';
  export let exportFilename = 'data-export.csv';
  export let exportColumns: ExportColumn[] | null = null;
  export let enableExport = true;
  export let summaryLabel = 'entri';
  export let showActionsColumn = false;
  export let actionsLabel = 'Aksi';
  export let resetSignal = 0;

  const dispatch = createEventDispatcher<{ select: RowActionDetail }>();

  let pageSize = initialPageSize ?? pageSizeOptions[0] ?? 10;
  let page = 1;
  let sortKey: string | null = null;
  let sortDirection: 'asc' | 'desc' = 'asc';
  let openMenuKey: string | number | null = null;

  let tableContainer: HTMLElement | null = null;

  let lastItemsRef: unknown[] = items;
  $: if (items !== lastItemsRef) {
    lastItemsRef = items;
    page = 1;
  }

  $: if (resetSignal) {
    page = 1;
  }

  $: resolvedColumns = columns ?? [];

  $: computedPageSizeOptions = pageSizeOptions.length > 0 ? pageSizeOptions : [10, 25, 50];
  $: pageSize = computedPageSizeOptions.includes(pageSize) ? pageSize : computedPageSizeOptions[0];

  $: sortedItems = sortKey ? [...(items ?? [])].sort(compareItems) : [...(items ?? [])];
  $: totalItems = sortedItems.length;
  $: totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  $: if (page > totalPages) {
    page = totalPages;
  }
  $: pageStartIndex = totalItems === 0 ? 0 : (page - 1) * pageSize;
  $: pageEndIndex = totalItems === 0 ? 0 : Math.min(page * pageSize, totalItems);
  $: visibleItems = sortedItems.slice(pageStartIndex, pageStartIndex + pageSize);

  function resolveRowKey(item: unknown, index: number): string | number {
    if (item && typeof item === 'object' && keyField in (item as Record<string, unknown>)) {
      const value = (item as Record<string, unknown>)[keyField];
      if (typeof value === 'string' || typeof value === 'number') {
        return value;
      }
    }
    return `${index}`;
  }

  function compareItems(a: unknown, b: unknown): number {
    if (!sortKey) return 0;
    const column = resolvedColumns.find((col) => col.id === sortKey);
    if (!column) return 0;
    const accessor = column.sortAccessor ?? column.accessor ?? ((item: any) => (item ? item[column.id] : undefined));
    const valueA = accessor?.(a);
    const valueB = accessor?.(b);

    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return sortDirection === 'asc' ? -1 : 1;
    if (valueB == null) return sortDirection === 'asc' ? 1 : -1;

    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    }

    const textA = String(valueA).toLocaleLowerCase();
    const textB = String(valueB).toLocaleLowerCase();
    return sortDirection === 'asc' ? textA.localeCompare(textB, 'id') : textB.localeCompare(textA, 'id');
  }

  function toggleSort(columnId: string) {
    if (sortKey === columnId) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = columnId;
      sortDirection = 'asc';
    }
  }

  function goToPreviousPage() {
    if (page > 1) {
      page -= 1;
    }
  }

  function goToNextPage() {
    if (page < totalPages) {
      page += 1;
    }
  }

  function changePageSize(value: number) {
    pageSize = value;
    page = 1;
  }

  function getCellAlignmentClass(align: ColumnDefinition['align']) {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  }

  function getValue(item: any, column: ColumnDefinition) {
    if (column.accessor) {
      const value = column.accessor(item);
      return value == null || value === '' ? '—' : value;
    }
    const value = item ? item[column.id] : undefined;
    return value == null || value === '' ? '—' : value;
  }

  function exportToCsv() {
    if (!enableExport) return;
    const rows = items ?? [];
    if (!rows.length) return;

    const columnsToUse = exportColumns ?? resolvedColumns.filter((col) => !col.excludeFromExport);

    const header = columnsToUse.map((col) => `"${col.label}"`).join(',');
    const dataRows = rows.map((item) =>
      columnsToUse
        .map((col) => {
          const accessor = col.accessor ?? ((record: any) => (record ? record[col.id] : undefined));
          const raw = accessor(item);
          const value = raw == null ? '' : String(raw);
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = [header, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', exportFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleActionSelect(action: string, item: unknown) {
    dispatch('select', { action, item });
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeAllMenus();
    }
  }

  function handleDocumentClick(event: MouseEvent) {
    if (!tableContainer) return;
    if (!(event.target instanceof Node)) return;
    if (!tableContainer.contains(event.target)) {
      closeAllMenus();
    }
  }

  function closeAllMenus() {
    openMenuKey = null;
  }

  onMount(() => {
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('keydown', handleKeyDown);
  });
</script>

<div class="space-y-4" bind:this={tableContainer}>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-slate-200 text-sm text-slate-900">
      <thead class="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <tr>
          {#each resolvedColumns as column (column.id)}
            <th
              scope="col"
              class={`whitespace-nowrap px-4 py-3 font-semibold ${getCellAlignmentClass(column.align)} ${column.class ?? ''}`}
              style={column.width ? `width: ${column.width}` : undefined}
            >
              {#if column.sortable}
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-inherit hover:text-slate-900"
                  on:click={() => toggleSort(column.id)}
                >
                  <span>{column.label}</span>
                  {#if sortKey === column.id}
                    <span aria-hidden="true">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  {/if}
                  <span class="sr-only">Urutkan</span>
                </button>
              {:else}
                {column.label}
              {/if}
            </th>
          {/each}
          {#if showActionsColumn}
            <th scope="col" class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
              {actionsLabel}
            </th>
          {/if}
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200 bg-white">
        {#if loading}
          <tr>
            <td colspan={resolvedColumns.length + (showActionsColumn ? 1 : 0)} class="px-4 py-6 text-center text-sm text-slate-600">
              Memuat data…
            </td>
          </tr>
        {:else if error}
          <tr>
            <td colspan={resolvedColumns.length + (showActionsColumn ? 1 : 0)} class="px-4 py-6 text-center text-sm text-rose-600">
              {error}
            </td>
          </tr>
        {:else if totalItems === 0}
          <tr>
            <td colspan={resolvedColumns.length + (showActionsColumn ? 1 : 0)} class="px-4 py-10 text-center text-sm text-slate-600">
              {emptyMessage}
            </td>
          </tr>
        {:else}
          {#each visibleItems as item, index}
            {@const rowKey = resolveRowKey(item, index)}
            <tr class="transition hover:bg-slate-50">
              {#each resolvedColumns as column (column.id)}
                <td class={`px-4 py-3 align-top ${getCellAlignmentClass(column.align)} ${column.class ?? ''}`}>
                  {#if column.cell}
                    <svelte:component this={column.cell} {item} />
                  {:else}
                    {getValue(item, column)}
                  {/if}
                </td>
              {/each}
              {#if showActionsColumn}
                <td class="px-4 py-3 text-right">
                  {#if item}
                    <div class="relative inline-block text-left">
                      <button
                        type="button"
                        class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-blue-500 hover:text-blue-600"
                        on:click={() => (openMenuKey = openMenuKey === rowKey ? null : rowKey)}
                        aria-haspopup="true"
                        aria-expanded={openMenuKey === rowKey}
                      >
                        <span class="sr-only">Buka menu aksi</span>
                        ⋯
                      </button>
                      {#if openMenuKey === rowKey}
                        <div class="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                          <ul class="py-1 text-left text-sm text-slate-700">
                            <li>
                              <button
                                type="button"
                                class="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-100"
                                on:click={() => {
                                  handleActionSelect('detail', item);
                                  closeAllMenus();
                                }}
                              >
                                Detail
                              </button>
                            </li>
                            <li>
                              <button
                                type="button"
                                class="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-100"
                                on:click={() => {
                                  handleActionSelect('chat', item);
                                  closeAllMenus();
                                }}
                              >
                                Chat
                              </button>
                            </li>
                            <li>
                              <button
                                type="button"
                                class="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-100"
                                on:click={() => {
                                  handleActionSelect('resolve', item);
                                  closeAllMenus();
                                }}
                              >
                                Tandai selesai
                              </button>
                            </li>
                            <li>
                              <button
                                type="button"
                                class="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-100"
                                on:click={() => {
                                  handleActionSelect('whatsapp', item);
                                  closeAllMenus();
                                }}
                              >
                                Kirim WA
                              </button>
                            </li>
                          </ul>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </td>
              {/if}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <div class="flex flex-col gap-4 border-t border-slate-200 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
    <div>
      {#if totalItems > 0}
        Menampilkan {pageStartIndex + 1}-{pageEndIndex} dari {totalItems} {summaryLabel}.
      {:else}
        Tidak ada {summaryLabel} untuk ditampilkan.
      {/if}
    </div>
    <div class="flex flex-wrap items-center gap-3">
      {#if enableExport}
        <button
          type="button"
          class="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-500 hover:text-blue-600"
          on:click={exportToCsv}
        >
          Ekspor CSV
        </button>
      {/if}
      <div class="flex items-center gap-2">
        <span class="text-xs uppercase tracking-wide text-slate-500">Tampilkan</span>
        <select
          class="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          bind:value={pageSize}
          on:change={(event) => changePageSize(Number(event.currentTarget.value))}
        >
          {#each computedPageSizeOptions as option}
            <option value={option}>{option}</option>
          {/each}
        </select>
      </div>
      <nav class="flex items-center gap-2" aria-label="Pagination">
        <button
          type="button"
          class="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          on:click={goToPreviousPage}
          disabled={page <= 1}
        >
          Sebelumnya
        </button>
        <span class="text-xs uppercase tracking-wide text-slate-500">
          Halaman {totalItems === 0 ? 0 : page} dari {totalItems === 0 ? 0 : totalPages}
        </span>
        <button
          type="button"
          class="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          on:click={goToNextPage}
          disabled={page >= totalPages}
        >
          Selanjutnya
        </button>
      </nav>
    </div>
  </div>
</div>
