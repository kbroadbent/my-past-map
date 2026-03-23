import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/db';
import type { Person, Event, Family, GeoCache } from '$lib/types.js';

describe('database', () => {
	beforeEach(async () => {
		await db.delete();
		await db.open();
	});

	describe('people table', () => {
		it('stores and retrieves a person by id', async () => {
			const person: Person = {
				id: '@I1@',
				name: 'John Smith',
				givenName: 'John',
				surname: 'Smith',
				sex: 'M',
				birthDate: '1 JAN 1850',
				deathDate: '15 MAR 1920',
				generation: 0
			};
			await db.people.add(person);
			const retrieved = await db.people.get('@I1@');
			expect(retrieved?.name).toBe('John Smith');
		});

		it('indexes people by generation for ancestor filtering', async () => {
			await db.people.bulkAdd([
				{ id: '@I1@', name: 'Child', generation: 0 },
				{ id: '@I2@', name: 'Parent', generation: 1 },
				{ id: '@I3@', name: 'Grandparent', generation: 2 },
				{ id: '@I4@', name: 'Other Parent', generation: 1 }
			]);
			const gen1 = await db.people.where('generation').equals(1).toArray();
			expect(gen1).toHaveLength(2);
			expect(gen1.map((p) => p.name).sort()).toEqual(['Other Parent', 'Parent']);
		});

		it('stores a person with only required fields', async () => {
			await db.people.add({ id: '@I5@', name: 'Unknown Person' });
			const retrieved = await db.people.get('@I5@');
			expect(retrieved?.id).toBe('@I5@');
			expect(retrieved?.name).toBe('Unknown Person');
		});
	});

	describe('events table', () => {
		it('stores and retrieves an event by id', async () => {
			const event: Event = {
				id: 'evt-1',
				personId: '@I1@',
				type: 'birth',
				date: '1 JAN 1850',
				place: 'Liverpool, England',
				latitude: 53.41,
				longitude: -2.98,
				year: 1850
			};
			await db.events.add(event);
			const retrieved = await db.events.get('evt-1');
			expect(retrieved?.place).toBe('Liverpool, England');
		});

		it('queries events by personId', async () => {
			await db.events.bulkAdd([
				{ id: 'evt-1', personId: '@I1@', type: 'birth', year: 1850 },
				{ id: 'evt-2', personId: '@I1@', type: 'death', year: 1920 },
				{ id: 'evt-3', personId: '@I2@', type: 'birth', year: 1880 }
			]);
			const personEvents = await db.events.where('personId').equals('@I1@').toArray();
			expect(personEvents).toHaveLength(2);
		});

		it('queries events by type', async () => {
			await db.events.bulkAdd([
				{ id: 'evt-1', personId: '@I1@', type: 'birth' },
				{ id: 'evt-2', personId: '@I2@', type: 'birth' },
				{ id: 'evt-3', personId: '@I1@', type: 'death' }
			]);
			const births = await db.events.where('type').equals('birth').toArray();
			expect(births).toHaveLength(2);
		});

		it('queries events by compound index personId+type', async () => {
			await db.events.bulkAdd([
				{ id: 'evt-1', personId: '@I1@', type: 'birth' },
				{ id: 'evt-2', personId: '@I1@', type: 'death' },
				{ id: 'evt-3', personId: '@I2@', type: 'birth' }
			]);
			const result = await db.events.where('[personId+type]').equals(['@I1@', 'birth']).toArray();
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('evt-1');
		});
	});

	describe('families table', () => {
		it('stores and retrieves a family by id', async () => {
			const family: Family = {
				id: '@F1@',
				husbandId: '@I1@',
				wifeId: '@I2@',
				childIds: ['@I3@', '@I4@']
			};
			await db.families.add(family);
			const retrieved = await db.families.get('@F1@');
			expect(retrieved?.husbandId).toBe('@I1@');
			expect(retrieved?.childIds).toEqual(['@I3@', '@I4@']);
		});

		it('stores a family with optional fields omitted', async () => {
			await db.families.add({ id: '@F2@', childIds: ['@I5@'] });
			const retrieved = await db.families.get('@F2@');
			expect(retrieved?.childIds).toEqual(['@I5@']);
			expect(retrieved?.husbandId).toBeUndefined();
			expect(retrieved?.wifeId).toBeUndefined();
		});
	});

	describe('geocache table', () => {
		it('stores and retrieves a geocache entry by place', async () => {
			const entry: GeoCache = {
				place: 'Liverpool, England',
				latitude: 53.41,
				longitude: -2.98,
				source: 'mapbox',
				timestamp: Date.now()
			};
			await db.geocache.add(entry);
			const cached = await db.geocache.get('Liverpool, England');
			expect(cached?.latitude).toBeCloseTo(53.41);
			expect(cached?.longitude).toBeCloseTo(-2.98);
		});

		it('bulk puts geocache entries without duplicates', async () => {
			const entries: GeoCache[] = [
				{ place: 'London, England', latitude: 51.51, longitude: -0.13, source: 'mapbox', timestamp: Date.now() },
				{ place: 'Dublin, Ireland', latitude: 53.35, longitude: -6.26, source: 'geonames', timestamp: Date.now() }
			];
			await db.geocache.bulkPut(entries);
			const count = await db.geocache.count();
			expect(count).toBe(2);
		});

		it('overwrites geocache entry on put with same place key', async () => {
			const ts1 = Date.now();
			await db.geocache.put({
				place: 'London, England',
				latitude: 51.5,
				longitude: -0.1,
				source: 'geonames',
				timestamp: ts1
			});
			const ts2 = ts1 + 1000;
			await db.geocache.put({
				place: 'London, England',
				latitude: 51.51,
				longitude: -0.13,
				source: 'mapbox',
				timestamp: ts2
			});
			const count = await db.geocache.count();
			expect(count).toBe(1);
			const entry = await db.geocache.get('London, England');
			expect(entry?.source).toBe('mapbox');
			expect(entry?.latitude).toBeCloseTo(51.51);
		});
	});

	describe('schema structure', () => {
		it('has exactly four tables: people, events, families, geocache', () => {
			const tableNames = db.tables.map((t) => t.name).sort();
			expect(tableNames).toEqual(['events', 'families', 'geocache', 'people']);
		});

		it('database is named MyPastMap', () => {
			expect(db.name).toBe('MyPastMap');
		});
	});
});
