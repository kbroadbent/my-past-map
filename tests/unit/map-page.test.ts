import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Tests for the map page (src/routes/map/+page.svelte)
 *
 * The map page orchestrates:
 * - Reading generation param from URL (?gen=N)
 * - Redirecting to / if tree is not loaded
 * - Geocoding events and showing GeocodingProgress overlay
 * - Rendering MapView with built GeoJSON
 * - Fitting map to data after geocoding completes
 */

const mapPagePath = resolve(__dirname, '../../src/routes/map/+page.svelte');
const mapViewPath = resolve(__dirname, '../../src/lib/components/MapView.svelte');
const geocodingProgressPath = resolve(__dirname, '../../src/lib/components/GeocodingProgress.svelte');
const envExamplePath = resolve(__dirname, '../../.env.example');

describe('Map page structure', () => {
	it('map page file exists at src/routes/map/+page.svelte', () => {
		expect(existsSync(mapPagePath)).toBe(true);
	});

	it('MapView component file exists', () => {
		expect(existsSync(mapViewPath)).toBe(true);
	});

	it('GeocodingProgress component file exists', () => {
		expect(existsSync(geocodingProgressPath)).toBe(true);
	});

	it('.env.example file exists with VITE_MAPBOX_TOKEN', () => {
		expect(existsSync(envExamplePath)).toBe(true);
		const content = readFileSync(envExamplePath, 'utf-8');
		expect(content).toContain('VITE_MAPBOX_TOKEN');
	});
});

describe('Map page imports and integration', () => {
	it('map page imports MapView component', () => {
		const content = readFileSync(mapPagePath, 'utf-8');
		expect(content).toContain('MapView');
	});

	it('map page imports GeocodingProgress component', () => {
		const content = readFileSync(mapPagePath, 'utf-8');
		expect(content).toContain('GeocodingProgress');
	});

	it('map page imports buildGeoJSON', () => {
		const content = readFileSync(mapPagePath, 'utf-8');
		expect(content).toContain('buildGeoJSON');
	});

	it('map page imports tree store', () => {
		const content = readFileSync(mapPagePath, 'utf-8');
		expect(content).toMatch(/tree/i);
	});

	it('map page reads generation parameter from URL', () => {
		const content = readFileSync(mapPagePath, 'utf-8');
		expect(content).toContain('gen');
	});

	it('map page checks tree.isLoaded and redirects if not loaded', () => {
		const content = readFileSync(mapPagePath, 'utf-8');
		expect(content).toContain('isLoaded');
		expect(content).toMatch(/goto|redirect/);
	});

	it('map page conditionally renders GeocodingProgress overlay', () => {
		const content = readFileSync(mapPagePath, 'utf-8');
		// Should have an {#if} block around GeocodingProgress
		expect(content).toContain('GeocodingProgress');
		expect(content).toMatch(/\{#if/);
	});

	it('map page has full-viewport layout', () => {
		const content = readFileSync(mapPagePath, 'utf-8');
		expect(content).toMatch(/100v[hw]/);
	});

	it('map page calls fitToData after geocoding', () => {
		const content = readFileSync(mapPagePath, 'utf-8');
		expect(content).toContain('fitToData');
	});

	it('map page handles onMarkerClick from MapView', () => {
		const content = readFileSync(mapPagePath, 'utf-8');
		expect(content).toContain('onMarkerClick');
	});
});
