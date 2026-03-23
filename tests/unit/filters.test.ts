import { describe, it, expect } from 'vitest';
import { getFilters } from '$lib/stores/filters.svelte';

describe('filter store', () => {
	it('starts with all event types active', () => {
		const filters = getFilters();
		const active = filters.getActiveTypes();
		expect(active).toContain('birth');
		expect(active).toContain('death');
		expect(active).toContain('marriage');
		expect(active).toContain('burial');
		expect(active).toContain('immigration');
		expect(active).toContain('emigration');
		expect(active).toContain('military');
		expect(active).toContain('christening');
		expect(active).toContain('census');
		expect(active).toContain('residence');
		expect(active).toContain('other');
		expect(active.length).toBe(11);
	});

	it('isActive returns true for all types initially', () => {
		const filters = getFilters();
		expect(filters.isActive('birth')).toBe(true);
		expect(filters.isActive('death')).toBe(true);
		expect(filters.isActive('marriage')).toBe(true);
	});

	it('toggle disables an active filter', () => {
		const filters = getFilters();
		filters.toggle('birth');
		expect(filters.isActive('birth')).toBe(false);
	});

	it('toggle re-enables a disabled filter', () => {
		const filters = getFilters();
		filters.toggle('birth');
		expect(filters.isActive('birth')).toBe(false);
		filters.toggle('birth');
		expect(filters.isActive('birth')).toBe(true);
	});

	it('toggling one type does not affect others', () => {
		const filters = getFilters();
		filters.toggle('death');
		expect(filters.isActive('birth')).toBe(true);
		expect(filters.isActive('marriage')).toBe(true);
		expect(filters.isActive('death')).toBe(false);
	});

	it('enableAll restores all filters after toggling', () => {
		const filters = getFilters();
		filters.toggle('birth');
		filters.toggle('death');
		filters.enableAll();
		expect(filters.isActive('birth')).toBe(true);
		expect(filters.isActive('death')).toBe(true);
		expect(filters.getActiveTypes().length).toBe(11);
	});

	it('getActiveTypes returns only active types', () => {
		const filters = getFilters();
		filters.toggle('birth');
		filters.toggle('census');
		const active = filters.getActiveTypes();
		expect(active).not.toContain('birth');
		expect(active).not.toContain('census');
		expect(active.length).toBe(9);
	});
});
