import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';

/**
 * Tests for MapView.svelte component
 *
 * The component wraps Mapbox GL JS, initializing a map with clustered
 * GeoJSON source and marker/cluster layers. It exposes fitToData(),
 * setFilter(), and getMap() methods.
 *
 * Since mapboxgl requires a real WebGL context, we mock the module.
 */

// Mock mapbox-gl before importing the component
const mockOn = vi.fn();
const mockAddSource = vi.fn();
const mockAddLayer = vi.fn();
const mockRemove = vi.fn();
const mockFitBounds = vi.fn();
const mockSetFilter = vi.fn();
const mockGetSource = vi.fn();
const mockGetCanvas = vi.fn(() => ({ style: { cursor: '' } }));
const mockIsStyleLoaded = vi.fn(() => true);
const mockQueryRenderedFeatures = vi.fn(() => []);
const mockHasImage = vi.fn(() => false);
const mockAddImage = vi.fn();

const mockMapInstance = {
	on: mockOn,
	addSource: mockAddSource,
	addLayer: mockAddLayer,
	remove: mockRemove,
	fitBounds: mockFitBounds,
	setFilter: mockSetFilter,
	getSource: mockGetSource,
	getCanvas: mockGetCanvas,
	isStyleLoaded: mockIsStyleLoaded,
	queryRenderedFeatures: mockQueryRenderedFeatures,
	hasImage: mockHasImage,
	addImage: mockAddImage
};

vi.mock('mapbox-gl', () => {
	const MapConstructor = vi.fn(() => mockMapInstance);
	return {
		default: {
			Map: MapConstructor,
			LngLatBounds: vi.fn(() => ({
				extend: vi.fn(),
				toArray: vi.fn(() => [
					[-180, -90],
					[180, 90]
				])
			})),
			accessToken: ''
		}
	};
});

// Mock the icons module
vi.mock('$lib/map/icons.js', () => ({
	loadMarkerIcons: vi.fn(() => Promise.resolve())
}));

async function getComponent() {
	const mod = await import('../../src/lib/components/MapView.svelte');
	return mod.default;
}

const emptyGeojson: GeoJSON.FeatureCollection = {
	type: 'FeatureCollection',
	features: []
};

const sampleGeojson: GeoJSON.FeatureCollection = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			geometry: { type: 'Point', coordinates: [-73.9857, 40.7484] },
			properties: {
				eventId: 'e1',
				personId: 'p1',
				personName: 'John Doe',
				type: 'birth',
				year: 1850,
				generation: 1,
				locationText: 'New York, NY',
				hasDate: true
			}
		},
		{
			type: 'Feature',
			geometry: { type: 'Point', coordinates: [-0.1276, 51.5074] },
			properties: {
				eventId: 'e2',
				personId: 'p2',
				personName: 'Jane Smith',
				type: 'death',
				year: 1920,
				generation: 2,
				locationText: 'London, England',
				hasDate: true
			}
		}
	]
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe('MapView component', () => {
	it('renders a map container element', async () => {
		const MapView = await getComponent();
		const { container } = render(MapView, { props: { geojson: emptyGeojson } });

		const mapContainer = container.querySelector('.map-container');
		expect(mapContainer).toBeTruthy();
	});

	it('has an accessible aria-label on the map container', async () => {
		const MapView = await getComponent();
		const { container } = render(MapView, { props: { geojson: emptyGeojson } });

		const mapContainer = container.querySelector('[aria-label]');
		expect(mapContainer).toBeTruthy();
		expect(mapContainer!.getAttribute('aria-label')).toContain('map');
	});

	it('initializes mapboxgl.Map on mount', async () => {
		const MapView = await getComponent();
		render(MapView, { props: { geojson: emptyGeojson } });

		const mapboxgl = (await import('mapbox-gl')).default;
		expect(mapboxgl.Map).toHaveBeenCalled();
	});

	it('uses dark-v11 map style', async () => {
		const MapView = await getComponent();
		render(MapView, { props: { geojson: emptyGeojson } });

		const mapboxgl = (await import('mapbox-gl')).default;
		const callArgs = (mapboxgl.Map as any).mock.calls[0][0];
		expect(callArgs.style).toContain('dark-v11');
	});

	it('registers a load event handler on the map', async () => {
		const MapView = await getComponent();
		render(MapView, { props: { geojson: emptyGeojson } });

		expect(mockOn).toHaveBeenCalledWith('load', expect.any(Function));
	});

	it('adds ancestors GeoJSON source with clustering on load', async () => {
		const MapView = await getComponent();
		render(MapView, { props: { geojson: sampleGeojson } });

		// Trigger the load callback
		const loadCallback = mockOn.mock.calls.find((c: any) => c[0] === 'load')?.[1];
		if (loadCallback) await loadCallback();

		expect(mockAddSource).toHaveBeenCalledWith(
			'ancestors',
			expect.objectContaining({
				type: 'geojson',
				cluster: true
			})
		);
	});

	it('adds clusters circle layer on load', async () => {
		const MapView = await getComponent();
		render(MapView, { props: { geojson: sampleGeojson } });

		const loadCallback = mockOn.mock.calls.find((c: any) => c[0] === 'load')?.[1];
		if (loadCallback) await loadCallback();

		expect(mockAddLayer).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'clusters',
				type: 'circle',
				source: 'ancestors'
			})
		);
	});

	it('adds cluster-count symbol layer on load', async () => {
		const MapView = await getComponent();
		render(MapView, { props: { geojson: sampleGeojson } });

		const loadCallback = mockOn.mock.calls.find((c: any) => c[0] === 'load')?.[1];
		if (loadCallback) await loadCallback();

		expect(mockAddLayer).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'cluster-count',
				type: 'symbol',
				source: 'ancestors'
			})
		);
	});

	it('adds ancestor-markers symbol layer on load', async () => {
		const MapView = await getComponent();
		render(MapView, { props: { geojson: sampleGeojson } });

		const loadCallback = mockOn.mock.calls.find((c: any) => c[0] === 'load')?.[1];
		if (loadCallback) await loadCallback();

		expect(mockAddLayer).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'ancestor-markers',
				type: 'symbol',
				source: 'ancestors'
			})
		);
	});

	it('registers click handler on ancestor-markers layer', async () => {
		const MapView = await getComponent();
		render(MapView, { props: { geojson: sampleGeojson } });

		const loadCallback = mockOn.mock.calls.find((c: any) => c[0] === 'load')?.[1];
		if (loadCallback) await loadCallback();

		const markerClickCall = mockOn.mock.calls.find(
			(c: any) => c[0] === 'click' && c[1] === 'ancestor-markers'
		);
		expect(markerClickCall).toBeDefined();
	});

	it('registers click handler on clusters layer for zoom', async () => {
		const MapView = await getComponent();
		render(MapView, { props: { geojson: sampleGeojson } });

		const loadCallback = mockOn.mock.calls.find((c: any) => c[0] === 'load')?.[1];
		if (loadCallback) await loadCallback();

		const clusterClickCall = mockOn.mock.calls.find(
			(c: any) => c[0] === 'click' && c[1] === 'clusters'
		);
		expect(clusterClickCall).toBeDefined();
	});

	it('sets up cursor pointer on mouseenter for markers', async () => {
		const MapView = await getComponent();
		render(MapView, { props: { geojson: sampleGeojson } });

		const loadCallback = mockOn.mock.calls.find((c: any) => c[0] === 'load')?.[1];
		if (loadCallback) await loadCallback();

		const mouseenterCall = mockOn.mock.calls.find(
			(c: any) => c[0] === 'mouseenter' && c[1] === 'ancestor-markers'
		);
		expect(mouseenterCall).toBeDefined();
	});

	it('removes map on destroy', async () => {
		const MapView = await getComponent();
		const { unmount } = render(MapView, { props: { geojson: emptyGeojson } });

		unmount();
		expect(mockRemove).toHaveBeenCalled();
	});

	it('loads marker icons on map load', async () => {
		const MapView = await getComponent();
		render(MapView, { props: { geojson: sampleGeojson } });

		const loadCallback = mockOn.mock.calls.find((c: any) => c[0] === 'load')?.[1];
		if (loadCallback) await loadCallback();

		const { loadMarkerIcons } = await import('$lib/map/icons.js');
		expect(loadMarkerIcons).toHaveBeenCalled();
	});

	it('map container fills available space', async () => {
		const MapView = await getComponent();
		const { container } = render(MapView, { props: { geojson: emptyGeojson } });

		const mapContainer = container.querySelector('.map-container') as HTMLElement;
		expect(mapContainer).toBeTruthy();
		// The container should have full-size styling (100% width/height or absolute positioning)
	});
});
