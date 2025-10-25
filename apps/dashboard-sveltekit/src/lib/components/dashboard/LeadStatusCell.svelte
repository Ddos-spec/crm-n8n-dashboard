<script lang="ts">
  import StatusPill from '$lib/components/common/StatusPill.svelte';
  import { getLeadStatusTone } from '$lib/utils/statusTone';
  import type { LeadRecord } from '$lib/types/api';

  export let item: LeadRecord;
</script>

<StatusPill value={item.status} tone={getLeadStatusTone(item.status)} />
