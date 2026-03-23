import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/db';

describe('data management', () => {
	beforeEach(async () => {
		await db.delete();
		await db.open();
	});

	describe('hasData', () => {
		it('returns false when database is empty', async () => {
			const { hasData } = await import('$lib/db');
			const result = await hasData();
			expect(result).toBe(false);
		});

		it('returns true when people table has records', async () => {
			const { hasData } = await import('$lib/db');
			await db.people.add({ id: '@I1@', name: 'John Smith' });
			const result = await hasData();
			expect(result).toBe(true);
		});

		it('returns true when events table has records but people is empty', async () => {
			const { hasData } = await import('$lib/db');
			await db.events.add({ id: 'evt-1', personId: '@I1@', type: 'birth' });
			const result = await hasData();
			expect(result).toBe(true);
		});
	});

	describe('clearAll', () => {
		it('removes all records from people table', async () => {
			const { clearAll } = await import('$lib/db');
			await db.people.add({ id: '@I1@', name: 'John Smith' });
			await clearAll();
			const count = await db.people.count();
			expect(count).toBe(0);
		});

		it('removes all records from events table', async () => {
			const { clearAll } = await import('$lib/db');
			await db.events.add({ id: 'evt-1', personId: '@I1@', type: 'birth' });
			await clearAll();
			const count = await db.events.count();
			expect(count).toBe(0);
		});

		it('removes all records from families table', async () => {
			const { clearAll } = await import('$lib/db');
			await db.families.add({ id: '@F1@', childIds: ['@I1@'] });
			await clearAll();
			const count = await db.families.count();
			expect(count).toBe(0);
		});

		it('preserves geocache when clearing data', async () => {
			const { clearAll } = await import('$lib/db');
			await db.geocache.add({
				place: 'London, England',
				latitude: 51.51,
				longitude: -0.13,
				source: 'mapbox',
				timestamp: Date.now()
			});
			await clearAll();
			const count = await db.geocache.count();
			expect(count).toBe(1);
		});

		it('makes hasData return false after clearing', async () => {
			const { hasData, clearAll } = await import('$lib/db');
			await db.people.add({ id: '@I1@', name: 'John Smith' });
			await db.events.add({ id: 'evt-1', personId: '@I1@', type: 'birth' });
			await clearAll();
			const result = await hasData();
			expect(result).toBe(false);
		});
	});

	describe('getCachedTreeSummary', () => {
		it('returns null when database is empty', async () => {
			const { getCachedTreeSummary } = await import('$lib/db');
			const summary = await getCachedTreeSummary();
			expect(summary).toBeNull();
		});

		it('returns person count when data exists', async () => {
			const { getCachedTreeSummary } = await import('$lib/db');
			await db.people.bulkAdd([
				{ id: '@I1@', name: 'John Smith' },
				{ id: '@I2@', name: 'Jane Smith' },
				{ id: '@I3@', name: 'Bob Smith' }
			]);
			const summary = await getCachedTreeSummary();
			expect(summary?.personCount).toBe(3);
		});

		it('returns event count when data exists', async () => {
			const { getCachedTreeSummary } = await import('$lib/db');
			await db.people.add({ id: '@I1@', name: 'John Smith' });
			await db.events.bulkAdd([
				{ id: 'evt-1', personId: '@I1@', type: 'birth' },
				{ id: 'evt-2', personId: '@I1@', type: 'death' }
			]);
			const summary = await getCachedTreeSummary();
			expect(summary?.eventCount).toBe(2);
		});
	});
});
