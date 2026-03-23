import { db } from '$lib/db';
import { COMMON_PLACES } from './common-places.js';
import { searchGeoNames } from './geonames.js';
import { GEOCODE_CONCURRENCY } from '$lib/constants.js';
import type { Event, GeoCache } from '$lib/types.js';

export function deduplicateLocations(events: Event[]): string[] {
	const places = new Set<string>();
	for (const event of events) {
		if (event.place) {
			places.add(event.place);
		}
	}
	return [...places].sort();
}

export function lookupCommonPlace(
	place: string
): { latitude: number; longitude: number; source: string } | null {
	const key = place.trim().toLowerCase();
	const entry = COMMON_PLACES.get(key);
	if (!entry) return null;
	return { latitude: entry.lat, longitude: entry.lng, source: 'common-places' };
}

interface GeocodeOptions {
	mapboxToken: string;
}

async function queryMapbox(
	place: string,
	token: string
): Promise<{ latitude: number; longitude: number; source: string } | null> {
	const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json?access_token=${token}&limit=1`;
	const response = await fetch(url);
	if (!response.ok) return null;
	const data = await response.json();
	if (!data.features || data.features.length === 0) return null;
	const feature = data.features[0];
	const [lng, lat] = feature.center;
	return { latitude: lat, longitude: lng, source: 'mapbox' };
}

async function queryGeoNames(
	place: string
): Promise<{ latitude: number; longitude: number; source: string } | null> {
	const result = await searchGeoNames(place);
	if (!result) return null;
	return { latitude: result.lat, longitude: result.lng, source: 'geonames' };
}

export async function geocodeLocation(
	place: string,
	options: GeocodeOptions
): Promise<{ latitude: number; longitude: number; source: string } | null> {
	// Check cache first
	const cached = await db.geocache.get(place);
	if (cached) {
		return { latitude: cached.latitude, longitude: cached.longitude, source: cached.source };
	}

	// Check common places
	const common = lookupCommonPlace(place);
	if (common) {
		const entry: GeoCache = {
			place,
			latitude: common.latitude,
			longitude: common.longitude,
			source: common.source,
			timestamp: Date.now()
		};
		await db.geocache.put(entry);
		return common;
	}

	// Try Mapbox
	const mapbox = await queryMapbox(place, options.mapboxToken);
	if (mapbox) {
		const entry: GeoCache = {
			place,
			latitude: mapbox.latitude,
			longitude: mapbox.longitude,
			source: mapbox.source,
			timestamp: Date.now()
		};
		await db.geocache.put(entry);
		return mapbox;
	}

	// Fallback to GeoNames
	const geonames = await queryGeoNames(place);
	if (geonames) {
		const entry: GeoCache = {
			place,
			latitude: geonames.latitude,
			longitude: geonames.longitude,
			source: geonames.source,
			timestamp: Date.now()
		};
		await db.geocache.put(entry);
		return geonames;
	}

	return null;
}

interface BatchOptions extends GeocodeOptions {
	concurrency?: number;
	onProgress?: (resolved: number, total: number, currentLocation: string) => void;
}

export async function geocodeBatch(
	locations: string[],
	options: BatchOptions
): Promise<Map<string, { latitude: number; longitude: number; source: string }>> {
	const concurrency = options.concurrency ?? GEOCODE_CONCURRENCY;
	const results = new Map<string, { latitude: number; longitude: number; source: string }>();
	let resolved = 0;
	const total = locations.length;

	const queue = [...locations];
	const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
		while (queue.length > 0) {
			const location = queue.shift()!;
			const result = await geocodeLocation(location, options);
			resolved++;
			if (result) {
				results.set(location, result);
			}
			options.onProgress?.(resolved, total, location);
		}
	});

	await Promise.all(workers);
	return results;
}
