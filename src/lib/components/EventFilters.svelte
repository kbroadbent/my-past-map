<script lang="ts">
	import { EVENT_TYPES } from '$lib/constants.js';

	let { eventCounts, onFilterChange }: { eventCounts: Record<string, number>; onFilterChange: (activeTypes: string[]) => void } = $props();

	let unchecked: Set<string> = $state(new Set());

	let visibleTypes = $derived(Object.keys(eventCounts).filter((t) => eventCounts[t] > 0));

	function isChecked(type: string): boolean {
		return !unchecked.has(type);
	}

	function handleToggle(type: string) {
		const next = new Set(unchecked);
		if (next.has(type)) {
			next.delete(type);
		} else {
			next.add(type);
		}
		unchecked = next;
		const activeTypes = visibleTypes.filter((t) => !next.has(t));
		onFilterChange(activeTypes);
	}
</script>

<div class="event-filters" role="group" aria-label="Event type filters">
	<div class="filter-header">Show Events</div>
	{#each visibleTypes as type}
		{@const config = EVENT_TYPES[type]}
		{@const active = isChecked(type)}
		<label class="filter-item" class:inactive={!active}>
			<input
				type="checkbox"
				checked={active}
				onchange={() => handleToggle(type)}
				class="visually-hidden"
			/>
			<span class="dot" style="background: {config?.color ?? '#999'}" aria-hidden="true"></span>
			<span class="label">{config?.label ?? type}</span>
			<span class="count">({eventCounts[type]})</span>
		</label>
	{/each}
</div>

<style>
	.event-filters {
		position: absolute;
		top: 12px;
		left: 12px;
		background: var(--color-map-panel);
		border-radius: 8px;
		padding: 12px;
		font-size: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		z-index: 5;
	}

	.filter-header {
		color: var(--color-map-text-primary);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 1px;
		margin-bottom: 8px;
		opacity: 0.7;
	}

	.filter-item {
		display: flex;
		align-items: center;
		color: var(--color-map-text-primary);
		margin-bottom: 6px;
		cursor: pointer;
		gap: 8px;
	}

	.filter-item.inactive {
		opacity: 0.4;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.count {
		color: var(--color-map-text-primary);
		opacity: 0.5;
		font-size: 11px;
	}
</style>
