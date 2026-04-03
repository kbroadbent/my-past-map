<script lang="ts">
	interface Props {
		onReset: () => void;
	}

	let { onReset }: Props = $props();
</script>

<button class="reset-btn" onclick={onReset} aria-label="Reset map view to defaults">
	Reset View
</button>

<style>
	.reset-btn {
		position: absolute;
		top: 12px;
		right: 12px;
		background: var(--color-map-panel);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: var(--color-map-text-primary);
		padding: 6px 14px;
		border-radius: 6px;
		font-size: 12px;
		cursor: pointer;
		z-index: 5;
	}

	.reset-btn:hover {
		background: rgba(50, 44, 34, 0.95);
	}

	.reset-btn:focus-visible {
		outline: 2px solid var(--color-gold);
		outline-offset: 2px;
	}
</style>
