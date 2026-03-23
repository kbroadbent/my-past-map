import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '$lib/db';
import type { Event, GeoCache } from '$lib/types.js';

describe('geocoding pipeline', () => {
	beforeEach(async () => {
		await db.delete();
		await db.open();
	});

	describe('deduplicateLocations', () => {
		it('extracts unique location strings from events', async () => {
			const { deduplicateLocations } = await import('$lib/geo/geocoder.js');
			const events: Event[] = [
				{ id: 'evt-1', personId: '@I1@', type: 'birth', place: 'London, England' },
				{ id: 'evt-2', personId: '@I2@', type: 'birth', place: 'London, England' },
				{ id: 'evt-3', personId: '@I1@', type: 'death', place: 'Dublin, Ireland' }
			];
			const result = deduplicateLocations(events);
			expect(result).toEqual(['Dublin, Ireland', 'London, England']);
		});

		it('filters out events with null or undefined places', async () => {
			const { deduplicateLocations } = await import('$lib/geo/geocoder.js');
			const events: Event[] = [
				{ id: 'evt-1', personId: '@I1@', type: 'birth', place: 'London, England' },
				{ id: 'evt-2', personId: '@I2@', type: 'death' },
				{ id: 'evt-3', personId: '@I3@', type: 'birth', place: undefined }
			];
			const result = deduplicateLocations(events);
			expect(result).toEqual(['London, England']);
		});

		it('returns empty array when no events have places', async () => {
			const { deduplicateLocations } = await import('$lib/geo/geocoder.js');
			const events: Event[] = [
				{ id: 'evt-1', personId: '@I1@', type: 'birth' },
				{ id: 'evt-2', personId: '@I2@', type: 'death' }
			];
			const result = deduplicateLocations(events);
			expect(result).toEqual([]);
		});

		it('returns sorted unique locations', async () => {
			const { deduplicateLocations } = await import('$lib/geo/geocoder.js');
			const events: Event[] = [
				{ id: 'evt-1', personId: '@I1@', type: 'birth', place: 'Berlin, Germany' },
				{ id: 'evt-2', personId: '@I2@', type: 'birth', place: 'Amsterdam, Netherlands' },
				{ id: 'evt-3', personId: '@I3@', type: 'birth', place: 'Copenhagen, Denmark' }
			];
			const result = deduplicateLocations(events);
			expect(result).toEqual(['Amsterdam, Netherlands', 'Berlin, Germany', 'Copenhagen, Denmark']);
		});
	});

	describe('common places dictionary', () => {
		it('exports a COMMON_PLACES map with known ancestral locations', async () => {
			const { COMMON_PLACES } = await import('$lib/geo/common-places.js');
			expect(COMMON_PLACES).toBeDefined();
			expect(COMMON_PLACES.size).toBeGreaterThanOrEqual(30);
		});

		it('contains London with correct approximate coordinates', async () => {
			const { COMMON_PLACES } = await import('$lib/geo/common-places.js');
			const london = COMMON_PLACES.get('london, england');
			expect(london).toBeDefined();
			expect(london!.lat).toBeCloseTo(51.51, 0);
			expect(london!.lng).toBeCloseTo(-0.13, 0);
		});

		it('contains Dublin with correct approximate coordinates', async () => {
			const { COMMON_PLACES } = await import('$lib/geo/common-places.js');
			const dublin = COMMON_PLACES.get('dublin, ireland');
			expect(dublin).toBeDefined();
			expect(dublin!.lat).toBeCloseTo(53.35, 0);
			expect(dublin!.lng).toBeCloseTo(-6.26, 0);
		});

		it('uses lowercase keys for case-insensitive lookup', async () => {
			const { COMMON_PLACES } = await import('$lib/geo/common-places.js');
			for (const key of COMMON_PLACES.keys()) {
				expect(key).toBe(key.toLowerCase());
			}
		});

		it('contains entries for major US cities', async () => {
			const { COMMON_PLACES } = await import('$lib/geo/common-places.js');
			expect(COMMON_PLACES.has('new york, new york, usa')).toBe(true);
			expect(COMMON_PLACES.has('salt lake city, utah, usa')).toBe(true);
		});

		it('contains entries for major European cities', async () => {
			const { COMMON_PLACES } = await import('$lib/geo/common-places.js');
			expect(COMMON_PLACES.has('hamburg, germany')).toBe(true);
			expect(COMMON_PLACES.has('paris, france')).toBe(true);
		});
	});

	describe('lookupCommonPlace', () => {
		it('returns coordinates for a known common place', async () => {
			const { lookupCommonPlace } = await import('$lib/geo/geocoder.js');
			const result = lookupCommonPlace('London, England');
			expect(result).not.toBeNull();
			expect(result!.latitude).toBeCloseTo(51.51, 0);
			expect(result!.longitude).toBeCloseTo(-0.13, 0);
			expect(result!.source).toBe('common-places');
		});

		it('normalizes input to lowercase and trims whitespace', async () => {
			const { lookupCommonPlace } = await import('$lib/geo/geocoder.js');
			const result = lookupCommonPlace('  LONDON, ENGLAND  ');
			expect(result).not.toBeNull();
			expect(result!.latitude).toBeCloseTo(51.51, 0);
		});

		it('returns null for an unknown place', async () => {
			const { lookupCommonPlace } = await import('$lib/geo/geocoder.js');
			const result = lookupCommonPlace('Smalltown, Nowhereland');
			expect(result).toBeNull();
		});
	});

	describe('geocodeLocation', () => {
		it('returns cached result when location exists in geocache', async () => {
			const { geocodeLocation } = await import('$lib/geo/geocoder.js');
			const cached: GeoCache = {
				place: 'Liverpool, England',
				latitude: 53.41,
				longitude: -2.98,
				source: 'mapbox',
				timestamp: Date.now()
			};
			await db.geocache.put(cached);

			const result = await geocodeLocation('Liverpool, England', { mapboxToken: 'fake-token' });
			expect(result).not.toBeNull();
			expect(result!.latitude).toBeCloseTo(53.41);
			expect(result!.longitude).toBeCloseTo(-2.98);
			expect(result!.source).toBe('mapbox');
		});

		it('falls back to common places when not in cache', async () => {
			const { geocodeLocation } = await import('$lib/geo/geocoder.js');
			const result = await geocodeLocation('London, England', { mapboxToken: 'fake-token' });
			expect(result).not.toBeNull();
			expect(result!.source).toBe('common-places');
			expect(result!.latitude).toBeCloseTo(51.51, 0);
		});

		it('stores common places result in geocache for future lookups', async () => {
			const { geocodeLocation } = await import('$lib/geo/geocoder.js');
			await geocodeLocation('London, England', { mapboxToken: 'fake-token' });
			const cached = await db.geocache.get('London, England');
			expect(cached).toBeDefined();
			expect(cached!.source).toBe('common-places');
		});

		it('calls Mapbox API when location not in cache or common places', async () => {
			const { geocodeLocation } = await import('$lib/geo/geocoder.js');

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						features: [
							{
								center: [-2.98, 53.41],
								relevance: 0.9,
								place_name: 'Liverpool, England'
							}
						]
					})
			});
			vi.stubGlobal('fetch', mockFetch);

			const result = await geocodeLocation('Unusual Place, England', {
				mapboxToken: 'test-token'
			});

			expect(mockFetch).toHaveBeenCalledOnce();
			expect(mockFetch.mock.calls[0][0]).toContain('api.mapbox.com');
			expect(mockFetch.mock.calls[0][0]).toContain('test-token');
			expect(result).not.toBeNull();
			expect(result!.latitude).toBeCloseTo(53.41);
			expect(result!.longitude).toBeCloseTo(-2.98);

			vi.unstubAllGlobals();
		});

		it('maps Mapbox relevance > 0.8 to high confidence source tag', async () => {
			const { geocodeLocation } = await import('$lib/geo/geocoder.js');

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () =>
						Promise.resolve({
							features: [{ center: [10, 50], relevance: 0.95, place_name: 'Test' }]
						})
				})
			);

			const result = await geocodeLocation('Some Village, Germany', {
				mapboxToken: 'test-token'
			});
			expect(result!.source).toBe('mapbox');

			vi.unstubAllGlobals();
		});

		it('falls back to GeoNames when Mapbox returns no results', async () => {
			const { geocodeLocation } = await import('$lib/geo/geocoder.js');

			vi.stubGlobal(
				'fetch',
				vi.fn().mockImplementation((url: string) => {
					if (url.includes('mapbox.com')) {
						return Promise.resolve({
							ok: true,
							json: () => Promise.resolve({ features: [] })
						});
					}
					if (url.includes('geonames.org')) {
						return Promise.resolve({
							ok: true,
							json: () =>
								Promise.resolve({
									geonames: [{ lat: '48.78', lng: '9.18', name: 'Württemberg' }]
								})
						});
					}
					return Promise.resolve({ ok: false });
				})
			);

			const result = await geocodeLocation('Württemberg, Germany', {
				mapboxToken: 'test-token'
			});
			expect(result).not.toBeNull();
			expect(result!.source).toBe('geonames');
			expect(result!.latitude).toBeCloseTo(48.78, 0);

			vi.unstubAllGlobals();
		});

		it('returns null when all geocoding sources fail', async () => {
			const { geocodeLocation } = await import('$lib/geo/geocoder.js');

			vi.stubGlobal(
				'fetch',
				vi.fn().mockImplementation((url: string) => {
					if (url.includes('mapbox.com')) {
						return Promise.resolve({
							ok: true,
							json: () => Promise.resolve({ features: [] })
						});
					}
					if (url.includes('geonames.org')) {
						return Promise.resolve({
							ok: true,
							json: () => Promise.resolve({ geonames: [] })
						});
					}
					return Promise.resolve({ ok: false });
				})
			);

			const result = await geocodeLocation('Completely Unknown Place', {
				mapboxToken: 'test-token'
			});
			expect(result).toBeNull();

			vi.unstubAllGlobals();
		});
	});

	describe('searchGeoNames', () => {
		it('returns coordinates for a valid place name', async () => {
			const { searchGeoNames } = await import('$lib/geo/geonames.js');

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () =>
						Promise.resolve({
							geonames: [{ lat: '48.78', lng: '9.18', name: 'Stuttgart' }]
						})
				})
			);

			const result = await searchGeoNames('Stuttgart, Germany');
			expect(result).not.toBeNull();
			expect(result!.lat).toBeCloseTo(48.78, 0);
			expect(result!.lng).toBeCloseTo(9.18, 0);
			expect(result!.name).toBe('Stuttgart');

			vi.unstubAllGlobals();
		});

		it('queries geonames.org API with correct parameters', async () => {
			const { searchGeoNames } = await import('$lib/geo/geonames.js');

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ geonames: [] })
			});
			vi.stubGlobal('fetch', mockFetch);

			await searchGeoNames('Test Place');
			expect(mockFetch).toHaveBeenCalledOnce();
			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).toContain('secure.geonames.org/searchJSON');
			expect(url).toContain('maxRows=1');

			vi.unstubAllGlobals();
		});

		it('returns null when API returns empty results', async () => {
			const { searchGeoNames } = await import('$lib/geo/geonames.js');

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({ geonames: [] })
				})
			);

			const result = await searchGeoNames('Nonexistent Place');
			expect(result).toBeNull();

			vi.unstubAllGlobals();
		});

		it('returns null on network error without throwing', async () => {
			const { searchGeoNames } = await import('$lib/geo/geonames.js');

			vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

			const result = await searchGeoNames('Some Place');
			expect(result).toBeNull();

			vi.unstubAllGlobals();
		});
	});

	describe('geocodeBatch', () => {
		it('geocodes multiple locations and returns a Map of results', async () => {
			const { geocodeBatch } = await import('$lib/geo/geocoder.js');

			const results = await geocodeBatch(['London, England', 'Dublin, Ireland'], {
				mapboxToken: 'fake-token'
			});

			expect(results).toBeInstanceOf(Map);
			expect(results.size).toBe(2);
			expect(results.get('London, England')).toBeDefined();
			expect(results.get('Dublin, Ireland')).toBeDefined();
		});

		it('invokes progress callback with resolved count and current location', async () => {
			const { geocodeBatch } = await import('$lib/geo/geocoder.js');
			const progressCalls: Array<{ resolved: number; total: number; currentLocation: string }> =
				[];

			await geocodeBatch(['London, England', 'Dublin, Ireland'], {
				mapboxToken: 'fake-token',
				onProgress: (resolved, total, currentLocation) => {
					progressCalls.push({ resolved, total, currentLocation });
				}
			});

			expect(progressCalls.length).toBeGreaterThanOrEqual(2);
			expect(progressCalls[progressCalls.length - 1].resolved).toBe(2);
			expect(progressCalls[progressCalls.length - 1].total).toBe(2);
		});

		it('respects concurrency limit', async () => {
			const { geocodeBatch } = await import('$lib/geo/geocoder.js');

			let maxConcurrent = 0;
			let currentConcurrent = 0;

			vi.stubGlobal(
				'fetch',
				vi.fn().mockImplementation(() => {
					currentConcurrent++;
					if (currentConcurrent > maxConcurrent) maxConcurrent = currentConcurrent;
					return new Promise((resolve) => {
						setTimeout(() => {
							currentConcurrent--;
							resolve({
								ok: true,
								json: () =>
									Promise.resolve({
										features: [{ center: [0, 0], relevance: 0.9, place_name: 'Test' }]
									})
							});
						}, 10);
					});
				})
			);

			// Use locations not in common places to force API calls
			const locations = Array.from({ length: 10 }, (_, i) => `Unknown Village ${i}, Farland`);
			await geocodeBatch(locations, { mapboxToken: 'test-token', concurrency: 3 });

			expect(maxConcurrent).toBeLessThanOrEqual(3);

			vi.unstubAllGlobals();
		});

		it('returns partial results when some locations fail', async () => {
			const { geocodeBatch } = await import('$lib/geo/geocoder.js');

			vi.stubGlobal(
				'fetch',
				vi.fn().mockImplementation((url: string) => {
					if (url.includes('mapbox.com')) {
						return Promise.resolve({
							ok: true,
							json: () => Promise.resolve({ features: [] })
						});
					}
					if (url.includes('geonames.org')) {
						return Promise.resolve({
							ok: true,
							json: () => Promise.resolve({ geonames: [] })
						});
					}
					return Promise.resolve({ ok: false });
				})
			);

			const results = await geocodeBatch(
				['London, England', 'Completely Unknown Place 12345'],
				{ mapboxToken: 'test-token' }
			);

			// London should succeed via common places, unknown should fail
			expect(results.has('London, England')).toBe(true);
			expect(results.has('Completely Unknown Place 12345')).toBe(false);

			vi.unstubAllGlobals();
		});

		it('defaults concurrency to GEOCODE_CONCURRENCY constant', async () => {
			const { geocodeBatch } = await import('$lib/geo/geocoder.js');
			const { GEOCODE_CONCURRENCY } = await import('$lib/constants.js');

			// This test verifies the default is used by checking the function accepts
			// locations without explicit concurrency and processes them
			const results = await geocodeBatch(['London, England'], {
				mapboxToken: 'fake-token'
			});

			expect(results.size).toBe(1);
			expect(GEOCODE_CONCURRENCY).toBe(5);
		});
	});
});
