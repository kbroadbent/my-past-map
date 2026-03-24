<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import MapView from '$lib/components/MapView.svelte';
	import GeocodingProgress from '$lib/components/GeocodingProgress.svelte';
	import EventFilters from '$lib/components/EventFilters.svelte';
	import TimelineScrubber from '$lib/components/TimelineScrubber.svelte';
	import PersonPanel from '$lib/components/PersonPanel.svelte';
	import ResetButton from '$lib/components/ResetButton.svelte';
	import { buildGeoJSON, buildFilterExpression, buildCombinedFilter } from '$lib/map/source.js';
	import { getTree } from '$lib/stores/tree.svelte.js';
	import { getFilters } from '$lib/stores/filters.svelte.js';
	import { getTimeline } from '$lib/stores/timeline.svelte.js';

	const tree = getTree();
	const filters = getFilters();
	const timeline = getTimeline();

	let geocoding = $state(false);
	let geocodeResolved = $state(0);
	let geocodeTotal = $state(0);
	let geocodeCurrentLocation = $state('');
	let geojson: GeoJSON.FeatureCollection = $state({ type: 'FeatureCollection', features: [] });
	let eventCounts: Record<string, number> = $state({});
	let mapView: MapView;
	let selectedPerson = $state<string | null>(null);
	let activeTypes = $state<string[]>([]);
	let currentYear = $state<number>(9999);

	let timelineIndex = $state({
		sortedEvents: [] as Array<{ year: number; eventIndex: number }>,
		generationBoundaries: new Map<number, { minYear: number; maxYear: number }>()
	});

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
		selectedPerson = feature?.properties?.personId ?? null;
	}

	function handleFilterChange(types: string[]) {
		activeTypes = types;
		const expr = buildCombinedFilter(currentYear, activeTypes);
		mapView?.setFilter?.(expr);
	}

	function handleYearChange(year: number) {
		currentYear = year;
		const expr = buildCombinedFilter(currentYear, activeTypes);
		mapView?.setFilter?.(expr);
	}

	function handleClose() {
		selectedPerson = null;
	}

	function handleNavigate(id: string) {
		selectedPerson = id;
	}

	function handleReset() {
		filters.enableAll();
		timeline.reset();
		fitToData();
	}
</script>

<div class="map-page" style="width: 100vw; height: 100vh; position: relative;">
	<MapView bind:this={mapView} {geojson} {onMarkerClick} />

	<EventFilters {eventCounts} onFilterChange={handleFilterChange} />

	<TimelineScrubber index={timelineIndex} onYearChange={handleYearChange} />

	<PersonPanel personId={selectedPerson} onClose={handleClose} onNavigate={handleNavigate} />

	<ResetButton onReset={handleReset} />

	{#if geocoding}
		<GeocodingProgress resolved={geocodeResolved} total={geocodeTotal} currentLocation={geocodeCurrentLocation} />
	{/if}
</div>
