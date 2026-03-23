import { describe, it, expect } from 'vitest';
import { findVisibleEventRange, computeDelta } from '$lib/stores/timeline.svelte';

describe('findVisibleEventRange', () => {
	const sorted = [
		{ year: 1800, eventIndex: 0 },
		{ year: 1850, eventIndex: 1 },
		{ year: 1900, eventIndex: 2 },
		{ year: 1950, eventIndex: 3 },
		{ year: 2000, eventIndex: 4 }
	];

	it('returns all events up to current year', () => {
		const end = findVisibleEventRange(sorted, 1900);
		expect(end).toBe(3); // indices 0, 1, 2 are visible
	});

	it('returns 0 for year before all events', () => {
		const end = findVisibleEventRange(sorted, 1799);
		expect(end).toBe(0);
	});

	it('returns all for year after all events', () => {
		const end = findVisibleEventRange(sorted, 2001);
		expect(end).toBe(5);
	});

	it('returns correct count for exact year match', () => {
		const end = findVisibleEventRange(sorted, 1800);
		expect(end).toBe(1); // only index 0 visible
	});

	it('handles empty array', () => {
		const end = findVisibleEventRange([], 1900);
		expect(end).toBe(0);
	});

	it('handles single-element array with year before', () => {
		const end = findVisibleEventRange([{ year: 1900, eventIndex: 0 }], 1899);
		expect(end).toBe(0);
	});

	it('handles single-element array with year equal', () => {
		const end = findVisibleEventRange([{ year: 1900, eventIndex: 0 }], 1900);
		expect(end).toBe(1);
	});

	it('handles duplicate years correctly', () => {
		const dupes = [
			{ year: 1900, eventIndex: 0 },
			{ year: 1900, eventIndex: 1 },
			{ year: 1900, eventIndex: 2 },
			{ year: 1950, eventIndex: 3 }
		];
		const end = findVisibleEventRange(dupes, 1900);
		expect(end).toBe(3); // all three 1900 events visible
	});
});

describe('computeDelta', () => {
	const sorted = [
		{ year: 1800, eventIndex: 0 },
		{ year: 1850, eventIndex: 1 },
		{ year: 1900, eventIndex: 2 }
	];

	it('returns events entering the range when moving forward', () => {
		const delta = computeDelta(sorted, 1800, 1860);
		expect(delta.entering).toEqual([1]); // eventIndex 1 enters
		expect(delta.leaving).toEqual([]);
	});

	it('returns events leaving the range when moving backward', () => {
		const delta = computeDelta(sorted, 1900, 1840);
		expect(delta.entering).toEqual([]);
		expect(delta.leaving).toEqual([2, 1]); // eventIndices 2 and 1 leave
	});

	it('returns empty arrays when year does not change', () => {
		const delta = computeDelta(sorted, 1850, 1850);
		expect(delta.entering).toEqual([]);
		expect(delta.leaving).toEqual([]);
	});

	it('returns all events entering when moving from before all to after all', () => {
		const delta = computeDelta(sorted, 1799, 1901);
		expect(delta.entering).toEqual([0, 1, 2]);
		expect(delta.leaving).toEqual([]);
	});

	it('returns all events leaving when moving from after all to before all', () => {
		const delta = computeDelta(sorted, 1901, 1799);
		expect(delta.entering).toEqual([]);
		expect(delta.leaving).toEqual([2, 1, 0]);
	});

	it('handles empty sorted array', () => {
		const delta = computeDelta([], 1800, 1900);
		expect(delta.entering).toEqual([]);
		expect(delta.leaving).toEqual([]);
	});

	it('handles forward movement crossing multiple events', () => {
		const delta = computeDelta(sorted, 1799, 1860);
		expect(delta.entering).toEqual([0, 1]);
		expect(delta.leaving).toEqual([]);
	});
});
