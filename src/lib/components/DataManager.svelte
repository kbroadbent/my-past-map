<script lang="ts">
	import { clearAll } from '$lib/db';

	let confirming = $state(false);

	interface Props {
		onDataCleared?: () => void;
	}

	let { onDataCleared }: Props = $props();

	async function handleDelete() {
		if (!confirming) {
			confirming = true;
			return;
		}
		await clearAll();
		confirming = false;
		onDataCleared?.();
	}

	function handleCancel() {
		confirming = false;
	}
</script>

{#if confirming}
	<div class="confirm-warning">
		<p>Are you sure? This will delete all your data.</p>
		<button onclick={handleDelete}>Confirm delete</button>
		<button onclick={handleCancel}>Cancel</button>
	</div>
{:else}
	<button onclick={handleDelete}>Delete data</button>
{/if}
