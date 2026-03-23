import type { Person, Event, Family } from '../types.js';

interface TreeData {
	people: Person[];
	events: Event[];
	families: Family[];
}

let instance: ReturnType<typeof createTree> | null = null;

function createTree() {
	let data: TreeData | null = $state(null);

	function load(input: TreeData) {
		data = input;
	}

	function clear() {
		data = null;
	}

	function getPerson(id: string): Person | undefined {
		return data?.people.find((p) => p.id === id);
	}

	function getPersonEvents(personId: string): Event[] {
		if (!data) return [];
		return data.events.filter((e) => e.personId === personId);
	}

	function getFamily(id: string): Family | undefined {
		return data?.families.find((f) => f.id === id);
	}

	function getEventsByGeneration(maxGeneration: number): Event[] {
		if (!data) return [];
		const personIds = new Set(
			data.people.filter((p) => (p.generation ?? 0) <= maxGeneration).map((p) => p.id)
		);
		return data.events.filter((e) => personIds.has(e.personId));
	}

	return {
		get data() {
			return data;
		},
		get isLoaded() {
			return data !== null;
		},
		load,
		clear,
		getPerson,
		getPersonEvents,
		getFamily,
		getEventsByGeneration
	};
}

export function getTree() {
	if (!instance) {
		instance = createTree();
	}
	return instance;
}
