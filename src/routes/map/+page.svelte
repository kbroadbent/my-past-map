<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import MapView from '$lib/components/MapView.svelte';
	import GeocodingProgress from '$lib/components/GeocodingProgress.svelte';
	import EventFilters from '$lib/components/EventFilters.svelte';
	import { buildGeoJSON, buildFilterExpression } from '$lib/map/source.js';
	import { getTree } from '$lib/stores/tree.svelte.js';
	import { getFilters } from '$lib/stores/filters.svelte.js';

	const tree = getTree();
	const filters = getFilters();

	let geocoding = $state(false);
	let geocodeResolved = $state(0);
	let geocodeTotal = $state(0);
	let geocodeCurrentLocation = $state('');
	let geojson: GeoJSON.FeatureCollection = $state({ type: 'FeatureCollection', features: [] });
	let eventCounts: Record<string, number> = $state({});
	let mapView: MapView;

	let gen = $derived(Number($page.url.searchParams.get('gen') ?? '4'));

	onMount(() => {
		if (!tree.isLoaded) {
			goto('/');
			return;
		}

		startGeocoding();
	});

	async function startGeocoding() {
		const data = tree.data;
		if (!data) return;

		const events = tree.getEventsByGeneration(gen);
		const people = data.people;

		geocoding = true;
		geocodeTotal = events.length;
		geocodeResolved = 0;

		// Build GeoJSON from events that already have coordinates
		geojson = buildGeoJSON(events, people);

		// Count events by type
		const counts: Record<string, number> = {};
		for (const e of events) {
			counts[e.type] = (counts[e.type] ?? 0) + 1;
		}
		eventCounts = counts;

		geocoding = false;

		fitToData();
	}

	function fitToData() {
		mapView?.fitToData();
	}

	function onMarkerClick(feature: any) {
		// Handle marker click
	}

	function handleFilterChange(activeTypes: string[]) {
		const expr = buildFilterExpression(activeTypes);
		mapView?.setFilter?.(expr);
	}
</script>

<div class="map-page" style="width: 100vw; height: 100vh; position: relative;">
	<MapView bind:this={mapView} {geojson} {onMarkerClick} />

	<EventFilters {eventCounts} onFilterChange={handleFilterChange} />

	{#if geocoding}
		<GeocodingProgress resolved={geocodeResolved} total={geocodeTotal} currentLocation={geocodeCurrentLocation} />
	{/if}
</div>
