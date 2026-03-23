<script lang="ts">
	import { getTree } from '$lib/stores/tree.svelte';

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

	let childFamilies = $derived(
		personId && tree.data
			? tree.data.families.filter((f) => f.husbandId === personId || f.wifeId === personId)
			: []
	);

	let children = $derived.by(() => {
		const result: { id: string; name: string }[] = [];
		for (const fam of childFamilies) {
			for (const childId of fam.childIds) {
				const p = tree.getPerson(childId);
				if (p) result.push({ id: p.id, name: p.name });
			}
		}
		return result;
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
</script>

{#if person}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<aside tabindex="-1" onkeydown={handleKeyDown}>
		<header>
			<h2>{person.name}</h2>
			<button aria-label="Close panel" onclick={onClose}>&times;</button>
		</header>

		{#if person.generation !== undefined}
			<p>Generation {person.generation}</p>
		{/if}

		{#if events.length > 0}
			<section>
				<h3>Events</h3>
				{#each events as event}
					<div data-testid="event-{event.id}" data-year={event.year}>
						<strong>{capitalize(event.type)}</strong>
						{#if event.date}
							<span>{event.date}</span>
						{/if}
						{#if event.place}
							<span>{event.place}</span>
						{/if}
					</div>
				{/each}
			</section>
		{/if}

		{#if parents.length > 0}
			<section>
				<h3>Parents</h3>
				{#each parents as parent}
					<button onclick={() => onNavigate(parent.id)}>{parent.name}</button>
				{/each}
			</section>
		{/if}

		{#if spouses.length > 0}
			<section>
				<h3>Spouse</h3>
				{#each spouses as spouse}
					<button onclick={() => onNavigate(spouse.id)}>{spouse.name}</button>
				{/each}
			</section>
		{/if}

		{#if children.length > 0}
			<section>
				<h3>Children</h3>
				{#each children as child}
					<button onclick={() => onNavigate(child.id)}>{child.name}</button>
				{/each}
			</section>
		{/if}
	</aside>
{/if}
