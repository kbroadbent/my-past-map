import type { SelectionGedcom } from 'read-gedcom';

interface TransformDate {
	year: number;
	raw: string;
}

interface TransformPerson {
	id: string;
	name: string;
	gender: string;
	generation: number;
}

interface TransformEvent {
	id: string;
	personId: string;
	type: string;
	date?: TransformDate;
	locationText?: string;
}

interface TransformFamily {
	id: string;
	spouse1Id?: string;
	spouse2Id?: string;
	childIds: string[];
}

interface SortedEvent {
	year: number;
	eventId: string;
	personId: string;
}

interface GenerationBoundary {
	minYear: number;
	maxYear: number;
}

interface TimelineIndex {
	sortedEvents: SortedEvent[];
	generationBoundaries: Map<number, GenerationBoundary>;
}

interface TransformResult {
	people: TransformPerson[];
	events: TransformEvent[];
	families: TransformFamily[];
	index: TimelineIndex;
}

function parseGedcomDate(dateStr: string | undefined | null): TransformDate | undefined {
	if (!dateStr) return undefined;
	const match = dateStr.match(/(\d{4})/);
	if (!match) return undefined;
	return { year: parseInt(match[1], 10), raw: dateStr };
}

function cleanName(rawName: string): string {
	return rawName.replace(/\//g, '').trim();
}

export function transformGedcom(gedcom: SelectionGedcom, rootPersonId: string): TransformResult {
	const individuals = gedcom.getIndividualRecord();
	const familyRecords = gedcom.getFamilyRecord();

	// Build family lookup structures
	const families: TransformFamily[] = [];
	const childToFamilyMap = new Map<string, string>(); // childId -> familyId

	for (const fam of familyRecords.arraySelect()) {
		const famId = fam.pointer()[0];
		const spouse1Id = fam.getHusband().value()[0] || undefined;
		const spouse2Id = fam.getWife().value()[0] || undefined;
		const childIds: string[] = [];
		for (const val of fam.getChild().value()) {
			if (val) {
				childIds.push(val);
				childToFamilyMap.set(val, famId);
			}
		}
		families.push({ id: famId, spouse1Id, spouse2Id, childIds });
	}

	const familyById = new Map<string, TransformFamily>();
	for (const f of families) {
		familyById.set(f.id, f);
	}

	// BFS to compute generations starting from root
	const generationMap = new Map<string, number>();
	generationMap.set(rootPersonId, 0);
	const queue = [rootPersonId];

	while (queue.length > 0) {
		const personId = queue.shift()!;
		const gen = generationMap.get(personId)!;

		// Find parent family (FAMC)
		const indi = individuals.arraySelect().find((i) => i.pointer()[0] === personId);
		if (indi) {
			const famcPointers = indi.getFamilyAsChild().pointer();
			for (const famcId of famcPointers) {
				const fam = familyById.get(famcId);
				if (fam) {
					for (const parentId of [fam.spouse1Id, fam.spouse2Id]) {
						if (parentId && !generationMap.has(parentId)) {
							generationMap.set(parentId, gen + 1);
							queue.push(parentId);
						}
					}
				}
			}
		}
	}

	// Extract people
	const people: TransformPerson[] = [];
	for (const indi of individuals.arraySelect()) {
		const id = indi.pointer()[0];
		const rawName = indi.getName().value()[0] || '';
		const sex = indi.getSex().value()[0] || 'U';
		people.push({
			id,
			name: cleanName(rawName),
			gender: sex,
			generation: generationMap.get(id) ?? -1
		});
	}

	// Extract events
	const events: TransformEvent[] = [];
	let eventCounter = 0;

	const eventTypes: Array<{
		type: string;
		getter: (indi: ReturnType<typeof individuals.arraySelect>[0]) => any;
	}> = [
		{ type: 'birth', getter: (i) => i.getEventBirth() },
		{ type: 'death', getter: (i) => i.getEventDeath() },
		{ type: 'immigration', getter: (i) => i.getEventImmigration() }
	];

	for (const indi of individuals.arraySelect()) {
		const personId = indi.pointer()[0];

		for (const { type, getter } of eventTypes) {
			const eventRecords = getter(indi);
			if (eventRecords.length === 0) continue;

			for (const evt of eventRecords.arraySelect()) {
				const dateStr = evt.getDate().value()[0];
				const placeStr = evt.getPlace().value()[0];
				eventCounter++;
				events.push({
					id: `evt-${eventCounter}`,
					personId,
					type,
					date: parseGedcomDate(dateStr),
					locationText: placeStr || undefined
				});
			}
		}
	}

	// Build timeline index
	const sortedEvents: SortedEvent[] = events
		.filter((e) => e.date?.year && e.date.year > 0)
		.map((e) => ({
			year: e.date!.year,
			eventId: e.id,
			personId: e.personId
		}))
		.sort((a, b) => a.year - b.year);

	const generationBoundaries = new Map<number, GenerationBoundary>();
	for (const evt of events) {
		if (!evt.date?.year || evt.date.year <= 0) continue;
		const person = people.find((p) => p.id === evt.personId);
		if (!person || person.generation < 0) continue;
		const gen = person.generation;
		const existing = generationBoundaries.get(gen);
		if (existing) {
			existing.minYear = Math.min(existing.minYear, evt.date.year);
			existing.maxYear = Math.max(existing.maxYear, evt.date.year);
		} else {
			generationBoundaries.set(gen, {
				minYear: evt.date.year,
				maxYear: evt.date.year
			});
		}
	}

	return {
		people,
		events,
		families,
		index: { sortedEvents, generationBoundaries }
	};
}
