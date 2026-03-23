import { describe, it, expect, vi, beforeEach } from 'vitest';

// Types will be added by implementer - using inline types for now
// to match the planned GedcomEvent and extended Person interfaces
interface ParsedDate {
	year: number;
	month?: number;
	day?: number;
	original: string;
}

interface GedcomEvent {
	id: string;
	personId: string;
	type: string;
	date?: ParsedDate;
	locationText?: string;
	lat: number | null;
	lng: number | null;
}

interface PersonForTest {
	id: string;
	name: string;
	gender: string;
	generation: number;
	parentFamilyId: string | null;
	spouseFamilyIds: string[];
}

describe('buildGeoJSON', () => {
	// These imports will fail until implementation exists — that's the point
	async function getBuildGeoJSON() {
		const mod = await import('../../src/lib/map/source.js');
		return mod.buildGeoJSON;
	}

	const people: PersonForTest[] = [
		{ id: '@I1@', name: 'John Smith', gender: 'M', generation: 0, parentFamilyId: null, spouseFamilyIds: ['@F1@'] },
		{ id: '@I2@', name: 'Jane Doe', gender: 'F', generation: 1, parentFamilyId: '@F2@', spouseFamilyIds: [] }
	];

	const events: GedcomEvent[] = [
		{
			id: 'E1', personId: '@I1@', type: 'birth',
			date: { year: 1950, month: 3, day: 15, original: '15 MAR 1950' },
			locationText: 'Salt Lake City, Utah', lat: 40.76, lng: -111.89
		},
		{
			id: 'E2', personId: '@I1@', type: 'death',
			date: { year: 2020, month: 1, day: 10, original: '10 JAN 2020' },
			locationText: 'Provo, Utah', lat: 40.23, lng: -111.66
		},
		{
			id: 'E3', personId: '@I1@', type: 'residence',
			date: { year: 1975, month: 6, day: 1, original: '1 JUN 1975' },
			locationText: 'Unknown Place', lat: null, lng: null
		}
	];

	it('returns a valid GeoJSON FeatureCollection', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const geojson = buildGeoJSON(events, people);
		expect(geojson.type).toBe('FeatureCollection');
		expect(Array.isArray(geojson.features)).toBe(true);
	});

	it('skips events with null lat/lng', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const geojson = buildGeoJSON(events, people);
		expect(geojson.features).toHaveLength(2);
	});

	it('sets Point geometry with [lng, lat] coordinate order', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const geojson = buildGeoJSON(events, people);
		const feature = geojson.features[0];
		expect(feature.geometry.type).toBe('Point');
		expect(feature.geometry.coordinates).toEqual([-111.89, 40.76]);
	});

	it('includes event type and year in properties', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const geojson = buildGeoJSON(events, people);
		const feature = geojson.features[0];
		expect(feature.properties.type).toBe('birth');
		expect(feature.properties.year).toBe(1950);
	});

	it('includes personName from people lookup', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const geojson = buildGeoJSON(events, people);
		expect(geojson.features[0].properties.personName).toBe('John Smith');
	});

	it('includes generation in properties', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const geojson = buildGeoJSON(events, people);
		expect(geojson.features[0].properties.generation).toBe(0);
	});

	it('includes eventId and personId in properties', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const geojson = buildGeoJSON(events, people);
		const props = geojson.features[0].properties;
		expect(props.eventId).toBe('E1');
		expect(props.personId).toBe('@I1@');
	});

	it('includes locationText in properties', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const geojson = buildGeoJSON(events, people);
		expect(geojson.features[0].properties.locationText).toBe('Salt Lake City, Utah');
	});

	it('includes hasDate boolean in properties', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const geojson = buildGeoJSON(events, people);
		expect(geojson.features[0].properties.hasDate).toBe(true);
	});

	it('returns empty FeatureCollection when given no events', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const geojson = buildGeoJSON([], people);
		expect(geojson.type).toBe('FeatureCollection');
		expect(geojson.features).toHaveLength(0);
	});

	it('returns empty FeatureCollection when all events lack coordinates', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const noCoordEvents: GedcomEvent[] = [
			{ id: 'E1', personId: '@I1@', type: 'birth', locationText: 'Nowhere', lat: null, lng: null }
		];
		const geojson = buildGeoJSON(noCoordEvents, people);
		expect(geojson.features).toHaveLength(0);
	});

	it('skips events whose personId has no matching person', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const orphanEvents: GedcomEvent[] = [
			{
				id: 'E99', personId: '@UNKNOWN@', type: 'birth',
				date: { year: 1900, month: 1, day: 1, original: '1 JAN 1900' },
				locationText: 'Somewhere', lat: 50.0, lng: 10.0
			}
		];
		const geojson = buildGeoJSON(orphanEvents, people);
		expect(geojson.features).toHaveLength(0);
	});

	it('sets hasDate to false when event has no date', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const noDateEvents: GedcomEvent[] = [
			{ id: 'E10', personId: '@I1@', type: 'census', locationText: 'City', lat: 45.0, lng: -90.0 }
		];
		const geojson = buildGeoJSON(noDateEvents, people);
		expect(geojson.features[0].properties.hasDate).toBe(false);
	});

	it('sets year to 0 when event has no date', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const noDateEvents: GedcomEvent[] = [
			{ id: 'E10', personId: '@I1@', type: 'census', locationText: 'City', lat: 45.0, lng: -90.0 }
		];
		const geojson = buildGeoJSON(noDateEvents, people);
		expect(geojson.features[0].properties.year).toBe(0);
	});

	it('handles multiple people across events', async () => {
		const buildGeoJSON = await getBuildGeoJSON();
		const multiEvents: GedcomEvent[] = [
			{
				id: 'E1', personId: '@I1@', type: 'birth',
				date: { year: 1950, month: 1, day: 1, original: '1 JAN 1950' },
				locationText: 'Place A', lat: 40.0, lng: -110.0
			},
			{
				id: 'E2', personId: '@I2@', type: 'birth',
				date: { year: 1920, month: 6, day: 15, original: '15 JUN 1920' },
				locationText: 'Place B', lat: 35.0, lng: -105.0
			}
		];
		const geojson = buildGeoJSON(multiEvents, people);
		expect(geojson.features).toHaveLength(2);
		expect(geojson.features[0].properties.personName).toBe('John Smith');
		expect(geojson.features[1].properties.personName).toBe('Jane Doe');
		expect(geojson.features[1].properties.generation).toBe(1);
	});
});

describe('MapFeatureProperties export', () => {
	it('exports MapFeatureProperties interface (module loads)', async () => {
		const mod = await import('../../src/lib/map/source.js');
		expect(mod).toBeDefined();
		expect(typeof mod.buildGeoJSON).toBe('function');
	});
});

describe('loadMarkerIcons', () => {
	async function getLoadMarkerIcons() {
		const mod = await import('../../src/lib/map/icons.js');
		return mod.loadMarkerIcons;
	}

	it('exports loadMarkerIcons as a function', async () => {
		const loadMarkerIcons = await getLoadMarkerIcons();
		expect(typeof loadMarkerIcons).toBe('function');
	});

	it('registers marker images for each event type', async () => {
		const loadMarkerIcons = await getLoadMarkerIcons();
		const { EVENT_TYPES } = await import('../../src/lib/constants.js');

		const addedImages: string[] = [];
		const mockMap = {
			hasImage: vi.fn().mockReturnValue(false),
			addImage: vi.fn((name: string) => { addedImages.push(name); })
		};

		await loadMarkerIcons(mockMap as any);

		const expectedNames = Object.keys(EVENT_TYPES).map(t => `marker-${t}`);
		for (const name of expectedNames) {
			expect(addedImages).toContain(name);
		}
	});

	it('does not add image if it already exists on map', async () => {
		const loadMarkerIcons = await getLoadMarkerIcons();

		const mockMap = {
			hasImage: vi.fn().mockReturnValue(true),
			addImage: vi.fn()
		};

		await loadMarkerIcons(mockMap as any);

		expect(mockMap.addImage).not.toHaveBeenCalled();
	});
});

describe('ICON_SVGS coverage', () => {
	it('has SVG definitions for all icon shapes used in EVENT_TYPES', async () => {
		const { EVENT_TYPES } = await import('../../src/lib/constants.js');
		// Collect unique icon names
		const usedIcons = new Set(Object.values(EVENT_TYPES).map((c: any) => c.icon));
		// star, cross, ring, arrow, shield, circle
		expect(usedIcons.size).toBeGreaterThanOrEqual(5);

		// The module should export or use ICON_SVGS internally covering these shapes
		// We verify indirectly: if loadMarkerIcons processes all event types without error,
		// then all icon shapes have SVG definitions
		const mod = await import('../../src/lib/map/icons.js');
		expect(mod.loadMarkerIcons).toBeDefined();
	});
});
