import { describe, it, expect } from 'vitest';
import { getTree } from '$lib/stores/tree.svelte';

const sampleTreeData = {
	people: [
		{ id: '@I1@', name: 'John Smith', generation: 0 },
		{ id: '@I2@', name: 'Jane Smith', generation: 0 },
		{ id: '@I3@', name: 'Robert Smith', generation: 1 },
		{ id: '@I4@', name: 'Mary Johnson', generation: 1 },
		{ id: '@I5@', name: 'William Smith', generation: 2 }
	],
	events: [
		{ id: 'E1', personId: '@I1@', type: 'birth', year: 1980, place: 'London' },
		{ id: 'E2', personId: '@I1@', type: 'marriage', year: 2005, place: 'Paris' },
		{ id: 'E3', personId: '@I2@', type: 'birth', year: 1982, place: 'London' },
		{ id: 'E4', personId: '@I3@', type: 'birth', year: 1950, place: 'Berlin' },
		{ id: 'E5', personId: '@I3@', type: 'death', year: 2020, place: 'London' },
		{ id: 'E6', personId: '@I5@', type: 'birth', year: 1920, place: 'Dublin' }
	],
	families: [
		{ id: '@F1@', husbandId: '@I3@', wifeId: '@I4@', childIds: ['@I1@'] }
	]
};

describe('tree store', () => {
	it('starts with no data loaded', () => {
		const tree = getTree();
		expect(tree.data).toBeNull();
		expect(tree.isLoaded).toBe(false);
	});

	it('loads tree data', () => {
		const tree = getTree();
		tree.load(sampleTreeData);
		expect(tree.isLoaded).toBe(true);
		expect(tree.data).not.toBeNull();
	});

	it('clears tree data', () => {
		const tree = getTree();
		tree.load(sampleTreeData);
		tree.clear();
		expect(tree.data).toBeNull();
		expect(tree.isLoaded).toBe(false);
	});

	it('getPerson returns person by id', () => {
		const tree = getTree();
		tree.load(sampleTreeData);
		const person = tree.getPerson('@I1@');
		expect(person).toBeDefined();
		expect(person!.name).toBe('John Smith');
	});

	it('getPerson returns undefined for unknown id', () => {
		const tree = getTree();
		tree.load(sampleTreeData);
		expect(tree.getPerson('@UNKNOWN@')).toBeUndefined();
	});

	it('getPersonEvents returns all events for a person', () => {
		const tree = getTree();
		tree.load(sampleTreeData);
		const events = tree.getPersonEvents('@I1@');
		expect(events.length).toBe(2);
		expect(events.map((e: any) => e.type)).toContain('birth');
		expect(events.map((e: any) => e.type)).toContain('marriage');
	});

	it('getPersonEvents returns empty array for person with no events', () => {
		const tree = getTree();
		tree.load(sampleTreeData);
		const events = tree.getPersonEvents('@I4@');
		expect(events).toEqual([]);
	});

	it('getPersonEvents returns empty array when no data loaded', () => {
		const tree = getTree();
		tree.clear();
		const events = tree.getPersonEvents('@I1@');
		expect(events).toEqual([]);
	});

	it('getFamily returns family by id', () => {
		const tree = getTree();
		tree.load(sampleTreeData);
		const family = tree.getFamily('@F1@');
		expect(family).toBeDefined();
		expect(family!.husbandId).toBe('@I3@');
		expect(family!.childIds).toContain('@I1@');
	});

	it('getFamily returns undefined for unknown id', () => {
		const tree = getTree();
		tree.load(sampleTreeData);
		expect(tree.getFamily('@UNKNOWN@')).toBeUndefined();
	});

	it('getEventsByGeneration filters events by max generation', () => {
		const tree = getTree();
		tree.load(sampleTreeData);
		// Generation 0 people: @I1@, @I2@ — events: E1, E2, E3
		const gen0Events = tree.getEventsByGeneration(0);
		expect(gen0Events.length).toBe(3);

		// Generation 0+1 people: @I1@, @I2@, @I3@, @I4@ — events: E1, E2, E3, E4, E5
		const gen1Events = tree.getEventsByGeneration(1);
		expect(gen1Events.length).toBe(5);

		// All generations — all 6 events
		const allEvents = tree.getEventsByGeneration(2);
		expect(allEvents.length).toBe(6);
	});

	it('getEventsByGeneration returns empty array when no data loaded', () => {
		const tree = getTree();
		tree.clear();
		expect(tree.getEventsByGeneration(5)).toEqual([]);
	});
});
