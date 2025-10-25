<script lang="ts">
  import { onMount } from 'svelte';
  import { statsStore } from '$stores/statsStore';
  import { customersStore } from '$stores/customersStore';
  import { leadsStore } from '$stores/leadsStore';
  import { config } from '$config';

  const statsState = statsStore;
  const statsSummary = statsStore.summary;

  const customersState = customersStore;
  const customerFilter = customersStore.filterTerm;
  const customerRows = customersStore.filtered;

  const leadsState = leadsStore;
  const leadFilter = leadsStore.filterTerm;
  const leadRows = leadsStore.filtered;

  type ActiveTab = 'customers' | 'leads';
  let activeTab: ActiveTab = 'customers';

  onMount(() => {
    statsStore.refresh();
    customersStore.refresh();
    leadsStore.refresh();
  });
</script>

<section class="px-6 py-10">
  <header class="mb-8">
    <h1 class="text-3xl font-semibold text-ink">CRM Overview</h1>
    <p class="mt-2 text-ink-soft">
      Data diambil langsung dari workflow n8n (<span class="font-medium">{config.n8n.workflowId}</span>) melalui proxy {config.n8n.baseUrl}.
    </p>
  </header>

  <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#if $statsSummary}
      {#each $statsSummary as card (card.id)}
        <article class="rounded-xl border border-accent-muted/80 bg-surface p-5 shadow-sm">
          <h2 class="text-sm font-medium text-ink-soft">{card.label}</h2>
          <p class="mt-3 text-2xl font-semibold text-ink">{card.value}</p>
        </article>
      {/each}
    {:else}
      {#if $statsState.status === 'loading'}
        {#each Array(4) as _, index (index)}
          <article class="animate-pulse rounded-xl border border-surface-muted bg-surface p-5" aria-hidden="true">
            <div class="h-3 w-24 rounded bg-surface-muted"></div>
            <div class="mt-4 h-6 w-16 rounded bg-surface-muted"></div>
          </article>
        {/each}
      {:else if $statsState.status === 'error'}
        <article class="col-span-full rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
          Tidak bisa memuat ringkasan: {$statsState.error}
        </article>
      {/if}
    {/if}
  </section>

  <section class="mt-10 rounded-2xl border border-surface-muted bg-surface shadow-sm">
    <div class="flex flex-col gap-4 border-b border-surface-muted p-6 sm:flex-row sm:items-center sm:justify-between">
      <nav class="flex gap-2 rounded-full bg-surface-muted p-1 text-sm font-medium">
        <button
          class={`rounded-full px-4 py-2 transition ${activeTab === 'customers' ? 'bg-accent-muted text-accent shadow-sm' : 'bg-surface text-ink-soft'}`}
          on:click={() => (activeTab = 'customers')}
          type="button"
        >
          Customers
        </button>
        <button
          class={`rounded-full px-4 py-2 transition ${activeTab === 'leads' ? 'bg-accent-muted text-accent shadow-sm' : 'bg-surface text-ink-soft'}`}
          on:click={() => (activeTab = 'leads')}
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
          on:input={(event) => {
            const value = event.currentTarget.value;
            if (activeTab === 'customers') {
              customersStore.filterTerm.set(value);
            } else {
              leadsStore.filterTerm.set(value);
            }
          }}
        />
      </div>
    </div>

    <div class="p-6">
      {#if activeTab === 'customers'}
        {#if $customersState.status === 'loading'}
          <p class="text-sm text-ink-soft">Memuat data pelanggan…</p>
        {:else if $customersState.status === 'error'}
          <p class="text-sm text-red-600">Gagal memuat pelanggan: {$customersState.error}</p>
        {:else}
          <table class="min-w-full text-left text-sm">
            <thead class="text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th class="pb-3 pr-4">Nama</th>
                <th class="pb-3 pr-4">Status</th>
                <th class="pb-3 pr-4">No. HP</th>
                <th class="pb-3 pr-4">Next Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-muted text-ink">
              {#if $customerRows.length === 0}
                <tr>
                  <td class="py-6 text-center text-sm text-ink-soft" colspan="4">Belum ada data pelanggan.</td>
                </tr>
              {:else}
                {#each $customerRows as customer (customer.id)}
                  <tr class="hover:bg-surface-muted/70">
                    <td class="py-3 pr-4 font-medium">{customer.name}</td>
                    <td class="py-3 pr-4">
                      <span class="inline-flex items-center rounded-full bg-accent-muted px-2.5 py-1 text-xs font-semibold text-accent">
                        {customer.status}
                      </span>
                    </td>
                    <td class="py-3 pr-4">{customer.phone}</td>
                    <td class="py-3 pr-4 text-ink-soft">{customer.next_action ?? '—'}</td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        {/if}
      {:else}
        {#if $leadsState.status === 'loading'}
          <p class="text-sm text-ink-soft">Memuat data leads…</p>
        {:else if $leadsState.status === 'error'}
          <p class="text-sm text-red-600">Gagal memuat leads: {$leadsState.error}</p>
        {:else}
          <table class="min-w-full text-left text-sm">
            <thead class="text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th class="pb-3 pr-4">Nama</th>
                <th class="pb-3 pr-4">Sumber</th>
                <th class="pb-3 pr-4">No. HP</th>
                <th class="pb-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-muted text-ink">
              {#if $leadRows.length === 0}
                <tr>
                  <td class="py-6 text-center text-sm text-ink-soft" colspan="4">Belum ada data leads.</td>
                </tr>
              {:else}
                {#each $leadRows as lead (lead.id)}
                  <tr class="hover:bg-surface-muted/70">
                    <td class="py-3 pr-4 font-medium">{lead.name}</td>
                    <td class="py-3 pr-4 text-ink-soft">{lead.source ?? '—'}</td>
                    <td class="py-3 pr-4">{lead.phone}</td>
                    <td class="py-3 pr-4">
                      <span class="inline-flex items-center rounded-full bg-accent-muted px-2.5 py-1 text-xs font-semibold text-accent">
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        {/if}
      {/if}
    </div>
  </section>
</section>
