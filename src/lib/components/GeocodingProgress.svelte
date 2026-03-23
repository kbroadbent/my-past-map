<script lang="ts">
	let { resolved, total, currentLocation }: { resolved: number; total: number; currentLocation: string } = $props();

	let percent = $derived(total > 0 ? Math.round((resolved / total) * 100) : 0);
</script>

<div class="geocoding-progress" role="status" aria-live="polite">
	<h2>Geocoding locations...</h2>
	<p>{resolved}/{total}</p>
	<div class="track">
		<div class="bar" style="width: {percent}%"></div>
	</div>
	{#if currentLocation}
		<p class="current">{currentLocation}</p>
	{/if}
</div>
