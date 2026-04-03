<script lang="ts">
	import { getTree } from '$lib/stores/tree.svelte';
	import { EVENT_TYPES } from '$lib/constants.js';

	interface Props {
		personId: string | null;
		onClose: () => void;
		onNavigate: (id: string) => void;
	}

	let { personId, onClose, onNavigate }: Props = $props();

	const tree = getTree();

	let person = $derived(personId ? tree.getPerson(personId) : undefined);
	let events = $derived(
		personId
			? tree.getPersonEvents(personId).sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
			: []
	);

	let parentFamily = $derived(
		personId && tree.data
			? tree.data.families.find((f) => f.childIds.includes(personId))
			: undefined
	);

	let spouseFamilies = $derived(
		personId && tree.data
			? tree.data.families.filter((f) => f.husbandId === personId || f.wifeId === personId)
			: []
	);

	let parents = $derived.by(() => {
		if (!parentFamily) return [];
		const result: { id: string; name: string }[] = [];
		if (parentFamily.husbandId) {
			const p = tree.getPerson(parentFamily.husbandId);
			if (p) result.push({ id: p.id, name: p.name });
		}
		if (parentFamily.wifeId) {
			const p = tree.getPerson(parentFamily.wifeId);
			if (p) result.push({ id: p.id, name: p.name });
		}
		return result;
	});

	let spouses = $derived.by(() => {
		const result: { id: string; name: string }[] = [];
		for (const fam of spouseFamilies) {
			const spouseId = fam.husbandId === personId ? fam.wifeId : fam.husbandId;
			if (spouseId) {
				const p = tree.getPerson(spouseId);
				if (p) result.push({ id: p.id, name: p.name });
			}
		}
		return result;
	});

	let children = $derived.by(() => {
		const result: { id: string; name: string }[] = [];
		for (const fam of spouseFamilies) {
			for (const childId of fam.childIds) {
				const p = tree.getPerson(childId);
				if (p) result.push({ id: p.id, name: p.name });
			}
		}
		return result;
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	let panelEl: HTMLElement | undefined = $state();

	$effect(() => {
		if (personId && panelEl) {
			panelEl.focus();
		}
	});
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if person}
	<aside class="person-panel" bind:this={panelEl} tabindex="-1" aria-label="Person details: {person.name}">
		<button class="close-btn" onclick={onClose} aria-label="Close person details">&times;</button>

		<div class="person-header">
			<h2>{person.name}</h2>
			{#if person.generation !== undefined && person.generation >= 0}
				<div class="generation-label">Generation {person.generation}</div>
			{/if}
		</div>

		{#if events.length > 0}
			<div class="section">
				<h3>Life Events</h3>
				{#each events as event}
					{@const config = EVENT_TYPES[event.type]}
					<div class="event-item">
						<span class="event-dot" style="background: {config?.color ?? '#9a7b5a'}" aria-hidden="true"></span>
						<div class="event-details">
							<div class="event-type">{config?.label ?? event.type}</div>
							<div class="event-meta">
								{#if event.date}{event.date}{/if}
								{#if event.date && event.place} &middot; {/if}
								{#if event.place}{event.place}{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if parents.length > 0}
			<div class="section">
				<h3>Parents</h3>
				{#each parents as parent}
					<button class="family-link" onclick={() => onNavigate(parent.id)}>{parent.name}</button>
				{/each}
			</div>
		{/if}

		{#if spouses.length > 0}
			<div class="section">
				<h3>Spouse</h3>
				{#each spouses as spouse}
					<button class="family-link" onclick={() => onNavigate(spouse.id)}>{spouse.name}</button>
				{/each}
			</div>
		{/if}

		{#if children.length > 0}
			<div class="section">
				<h3>Children</h3>
				{#each children as child}
					<button class="family-link" onclick={() => onNavigate(child.id)}>{child.name}</button>
				{/each}
			</div>
		{/if}
	</aside>
{/if}

<style>
	.person-panel {
		position: absolute;
		top: 0;
		right: 0;
		width: 300px;
		height: 100%;
		background: var(--color-map-panel);
		border-left: 1px solid rgba(255, 255, 255, 0.1);
		padding: 16px;
		overflow-y: auto;
		z-index: 10;
		outline: none;
	}

	.close-btn {
		position: absolute;
		top: 12px;
		right: 12px;
		background: none;
		border: none;
		color: var(--color-map-text-primary);
		font-size: 22px;
		cursor: pointer;
		padding: 4px 8px;
		opacity: 0.7;
	}

	.close-btn:hover { opacity: 1; }
	.close-btn:focus-visible { outline: 2px solid var(--color-gold); }

	.person-header { margin-bottom: 16px; }

	h2 {
		color: var(--color-map-text-primary);
		font-size: 18px;
		font-weight: 600;
		font-family: var(--font-heading);
		margin: 0;
		padding-right: 24px;
	}

	.generation-label {
		color: var(--color-map-text-primary);
		opacity: 0.6;
		font-size: 13px;
		margin-top: 4px;
	}

	.section {
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding-top: 12px;
		margin-top: 16px;
	}

	h3 {
		color: var(--color-gold);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 1px;
		margin: 0 0 10px;
	}

	.event-item {
		display: flex;
		align-items: start;
		margin-bottom: 12px;
		gap: 10px;
	}

	.event-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-top: 5px;
		flex-shrink: 0;
	}

	.event-type {
		color: var(--color-map-text-primary);
		font-size: 13px;
	}

	.event-meta {
		color: var(--color-map-text-primary);
		opacity: 0.6;
		font-size: 12px;
		margin-top: 2px;
	}

	.family-link {
		display: block;
		background: none;
		border: none;
		color: var(--color-gold);
		font-size: 13px;
		cursor: pointer;
		padding: 3px 0;
		text-align: left;
	}

	.family-link:hover { text-decoration: underline; }
	.family-link:focus-visible { outline: 2px solid var(--color-gold); }
</style>
