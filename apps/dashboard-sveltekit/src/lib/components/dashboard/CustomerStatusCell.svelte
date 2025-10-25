<script lang="ts">
  import StatusPill from '$lib/components/common/StatusPill.svelte';
  import { getCustomerStatusTone } from '$lib/utils/statusTone';
  import type { CustomerRecord } from '$lib/types/api';

  export let item: CustomerRecord;
</script>

<StatusPill value={item.status} tone={getCustomerStatusTone(item.status)} />
