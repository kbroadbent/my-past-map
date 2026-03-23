<script lang="ts">
	import type { Person, Event } from '$lib/types';

	type SortKey = 'name' | 'generation' | 'birthYear';
	type SortDir = 'ascending' | 'descending';

	let { people = [], events = [] }: { people: Person[]; events: Event[] } = $props();

	let sortKey: SortKey | null = $state(null);
	let sortDir: SortDir = $state('ascending');

	function getBirthYear(person: Person): number | null {
		const birthEvent = events.find((e) => e.personId === person.id && e.type === 'birth');
		return birthEvent?.year ?? null;
	}

	function handleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'ascending' ? 'descending' : 'ascending';
		} else {
			sortKey = key;
			sortDir = 'ascending';
		}
	}

	let nameAriaSort = $derived(sortKey === 'name' ? sortDir : 'none');
	let genAriaSort = $derived(sortKey === 'generation' ? sortDir : 'none');
	let yearAriaSort = $derived(sortKey === 'birthYear' ? sortDir : 'none');

	let sortedPeople = $derived.by(() => {
		const copy = [...people];
		if (sortKey === null) return copy;

		const dir = sortDir === 'ascending' ? 1 : -1;
		const key = sortKey;

		return copy.sort((a, b) => {
			if (key === 'name') {
				return dir * a.name.localeCompare(b.name);
			}
			if (key === 'generation') {
				return dir * ((a.generation ?? 0) - (b.generation ?? 0));
			}
			if (key === 'birthYear') {
				const aYear = getBirthYear(a);
				const bYear = getBirthYear(b);
				if (aYear === null && bYear === null) return 0;
				if (aYear === null) return 1;
				if (bYear === null) return -1;
				return dir * (aYear - bYear);
			}
			return 0;
		});
	});
</script>

{#if people.length === 0}
	<p>No people to display</p>
{:else}
	<table>
		<thead>
			<tr>
				<th aria-sort={nameAriaSort} onclick={() => handleSort('name')}>
					<button type="button">Name</button>
				</th>
				<th aria-sort={genAriaSort} onclick={() => handleSort('generation')}>
					<button type="button">Generation</button>
				</th>
				<th aria-sort={yearAriaSort} onclick={() => handleSort('birthYear')}>
					<button type="button">Birth Year</button>
				</th>
			</tr>
		</thead>
		<tbody>
			{#each sortedPeople as person (person.id)}
				<tr>
					<td>{person.name}</td>
					<td>{person.generation ?? ''}</td>
					<td>{getBirthYear(person) ?? '—'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
