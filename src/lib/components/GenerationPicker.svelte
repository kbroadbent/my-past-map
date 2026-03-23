<script lang="ts">
	import { MAX_GENERATIONS, DEFAULT_GENERATIONS } from '$lib/constants.js';

	let { totalPeople, onConfirm }: { totalPeople: number; onConfirm: (generations: number) => void } = $props();

	let generations = $state(DEFAULT_GENERATIONS);
</script>

<div class="generation-picker">
	<p class="count">Found {totalPeople} people in your file</p>
	<h2>How many generations?</h2>

	<input
		type="range"
		min="1"
		max={MAX_GENERATIONS}
		bind:value={generations}
		aria-label="Number of generations"
		aria-valuetext="{generations} generations"
	/>

	<p class="value">{generations} generations</p>

	{#if generations >= 8}
		<p class="warning">Data may be sparse at this depth</p>
	{/if}

	<button onclick={() => onConfirm(generations)}>Show on Map</button>
</div>
