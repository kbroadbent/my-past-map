export interface MapFeatureProperties {
	eventId: string;
	personId: string;
	personName: string;
	type: string;
	year: number;
	generation: number;
	locationText: string;
	hasDate: boolean;
}

interface EventInput {
	id: string;
	personId: string;
	type: string;
	date?: { year: number; month?: number; day?: number; original: string };
	locationText?: string;
	lat: number | null;
	lng: number | null;
}

interface PersonInput {
	id: string;
	name: string;
	generation: number;
}

interface GeoJSONFeature {
	type: 'Feature';
	geometry: {
		type: 'Point';
		coordinates: [number, number];
	};
	properties: MapFeatureProperties;
}

interface GeoJSONFeatureCollection {
	type: 'FeatureCollection';
	features: GeoJSONFeature[];
}

export function buildGeoJSON(events: EventInput[], people: PersonInput[]): GeoJSONFeatureCollection {
	const peopleMap = new Map(people.map((p) => [p.id, p]));

	const features: GeoJSONFeature[] = [];

	for (const event of events) {
		if (event.lat == null || event.lng == null) continue;

		const person = peopleMap.get(event.personId);
		if (!person) continue;

		features.push({
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [event.lng, event.lat]
			},
			properties: {
				eventId: event.id,
				personId: event.personId,
				personName: person.name,
				type: event.type,
				year: event.date?.year ?? 0,
				generation: person.generation,
				locationText: event.locationText ?? '',
				hasDate: event.date != null
			}
		});
	}

	return { type: 'FeatureCollection', features };
}

export function buildFilterExpression(activeTypes: string[]): any[] {
	if (activeTypes.length === 0) {
		return ['==', ['get', 'type'], ''];
	}
	return ['in', ['get', 'type'], ['literal', activeTypes]];
}
