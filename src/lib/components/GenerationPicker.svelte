<script lang="ts">
	import { MAX_GENERATIONS, DEFAULT_GENERATIONS } from '$lib/constants.js';

	let { totalPeople, onConfirm }: { totalPeople: number; onConfirm: (generations: number) => void } = $props();

	let generations = $state(DEFAULT_GENERATIONS);
</script>

<div class="generation-picker">
	<h2>How many generations?</h2>
	<p class="count">Your file contains {totalPeople} people</p>

	<label for="gen-slider" class="slider-label">
		Generations: <strong>{generations}</strong>
	</label>
	<input
		id="gen-slider"
		type="range"
		min="1"
		max={MAX_GENERATIONS}
		bind:value={generations}
		aria-label="Number of generations"
		aria-valuetext="{generations} generations"
	/>

	{#if generations >= 8}
		<p class="warning">Deeper generations may have sparse data — not all branches will be complete.</p>
	{/if}

	<button class="confirm-btn" onclick={() => onConfirm(generations)}>Show on Map</button>
</div>

<style>
	.generation-picker {
		text-align: center;
		max-width: 400px;
		margin: 32px auto;
		padding: 0 20px;
	}

	h2 {
		font-family: var(--font-heading);
		color: var(--color-brown-dark);
		font-size: 22px;
		margin: 0;
	}

	.count {
		color: #6b5a48;
		font-size: 14px;
		margin-top: 8px;
	}

	.slider-label {
		display: block;
		margin-top: 24px;
		color: #5c4a32;
		font-size: 15px;
	}

	input[type="range"] {
		width: 100%;
		margin-top: 8px;
		accent-color: var(--color-gold);
	}

	.warning {
		color: var(--color-gold);
		font-size: 13px;
		margin-top: 12px;
		font-style: italic;
	}

	.confirm-btn {
		margin-top: 24px;
		background: var(--color-gold);
		color: white;
		border: none;
		padding: 12px 32px;
		border-radius: 8px;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
	}

	.confirm-btn:hover {
		filter: brightness(1.1);
	}

	.confirm-btn:focus-visible {
		outline: 2px solid var(--color-brown-dark);
		outline-offset: 2px;
	}
</style>
