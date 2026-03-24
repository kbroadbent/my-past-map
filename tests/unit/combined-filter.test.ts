import { describe, it, expect } from 'vitest';

/**
 * Tests for combined Mapbox filter expressions.
 *
 * The map page needs to apply BOTH event-type filtering and timeline-year
 * filtering simultaneously. This requires a combined filter expression
 * using Mapbox GL's ['all', ...] combinator:
 *
 *   ['all',
 *     ['<=', ['get', 'year'], currentYear],
 *     ['in', ['get', 'type'], ['literal', activeTypes]]
 *   ]
 *
 * buildCombinedFilter(year, activeTypes) should be exported from source.ts
 * alongside buildFilterExpression.
 */

async function getCombinedFilter() {
	const mod = await import('../../src/lib/map/source.js');
	return mod.buildCombinedFilter;
}

describe('buildCombinedFilter', () => {
	it('is exported as a function from source.ts', async () => {
		const buildCombinedFilter = await getCombinedFilter();
		expect(typeof buildCombinedFilter).toBe('function');
	});

	it('returns a Mapbox "all" expression combining year and type filters', async () => {
		const buildCombinedFilter = await getCombinedFilter();
		const expr = buildCombinedFilter(1900, ['birth', 'death']);

		expect(Array.isArray(expr)).toBe(true);
		expect(expr[0]).toBe('all');
	});

	it('includes a year filter using <= comparison', async () => {
		const buildCombinedFilter = await getCombinedFilter();
		const expr = buildCombinedFilter(1900, ['birth', 'death']);

		const flat = JSON.stringify(expr);
		expect(flat).toContain('<=');
		expect(flat).toContain('year');
		expect(flat).toContain('1900');
	});

	it('includes a type filter using the active types', async () => {
		const buildCombinedFilter = await getCombinedFilter();
		const expr = buildCombinedFilter(1900, ['birth', 'death']);

		const flat = JSON.stringify(expr);
		expect(flat).toContain('type');
		expect(flat).toContain('birth');
		expect(flat).toContain('death');
	});

	it('does not include inactive types in the expression', async () => {
		const buildCombinedFilter = await getCombinedFilter();
		const expr = buildCombinedFilter(1900, ['birth']);

		const flat = JSON.stringify(expr);
		expect(flat).toContain('birth');
		expect(flat).not.toContain('death');
		expect(flat).not.toContain('marriage');
	});

	it('uses the provided year value in the year comparison', async () => {
		const buildCombinedFilter = await getCombinedFilter();
		const expr2000 = buildCombinedFilter(2000, ['birth']);
		const expr1850 = buildCombinedFilter(1850, ['birth']);

		expect(JSON.stringify(expr2000)).toContain('2000');
		expect(JSON.stringify(expr1850)).toContain('1850');
	});

	it('handles empty active types with year filter still present', async () => {
		const buildCombinedFilter = await getCombinedFilter();
		const expr = buildCombinedFilter(1900, []);

		expect(Array.isArray(expr)).toBe(true);
		const flat = JSON.stringify(expr);
		// Year filter should still be present
		expect(flat).toContain('year');
		// Should match nothing for types (empty)
		expect(expr[0]).toBe('all');
	});

	it('handles all event types active', async () => {
		const buildCombinedFilter = await getCombinedFilter();
		const allTypes = [
			'birth', 'death', 'marriage', 'burial', 'immigration',
			'emigration', 'military', 'christening', 'census', 'residence', 'other'
		];
		const expr = buildCombinedFilter(2000, allTypes);

		expect(Array.isArray(expr)).toBe(true);
		expect(expr[0]).toBe('all');
		const flat = JSON.stringify(expr);
		for (const t of allTypes) {
			expect(flat).toContain(t);
		}
	});
});
