import Dexie, { type EntityTable } from 'dexie';
import type { Person, Event, Family, GeoCache } from './types.js';

const db = new Dexie('MyPastMap') as Dexie & {
	people: EntityTable<Person, 'id'>;
	events: EntityTable<Event, 'id'>;
	families: EntityTable<Family, 'id'>;
	geocache: EntityTable<GeoCache, 'place'>;
};

db.version(1).stores({
	people: 'id, generation',
	events: 'id, personId, type, [personId+type]',
	families: 'id',
	geocache: 'place'
});

export { db };

export async function hasData(): Promise<boolean> {
	const peopleCount = await db.people.count();
	if (peopleCount > 0) return true;
	const eventsCount = await db.events.count();
	return eventsCount > 0;
}

export async function clearAll(): Promise<void> {
	await db.people.clear();
	await db.events.clear();
	await db.families.clear();
}

export async function getCachedTreeSummary(): Promise<{ personCount: number; eventCount: number } | null> {
	const personCount = await db.people.count();
	if (personCount === 0) return null;
	const eventCount = await db.events.count();
	return { personCount, eventCount };
}
