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

<div>
	<h3>Show Events</h3>
	<fieldset role="group" aria-label="Event type filters" style="border: none; padding: 0; margin: 0;">
		{#each visibleTypes as type}
			{@const config = EVENT_TYPES[type]}
			{@const active = isChecked(type)}
			<label style="display: flex; align-items: center; gap: 0.5rem; opacity: {active ? 1 : 0.4};">
				<input
					type="checkbox"
					checked={active}
					onchange={() => handleToggle(type)}
					aria-label={config?.label ?? type}
				/>
				<span style="width: 12px; height: 12px; border-radius: 50%; background: {config?.color ?? '#999'}; display: inline-block;"></span>
				<span>{config?.label ?? type}</span>
				<span>({eventCounts[type]})</span>
			</label>
		{/each}
	</fieldset>
</div>
