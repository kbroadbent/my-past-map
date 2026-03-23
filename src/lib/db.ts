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
