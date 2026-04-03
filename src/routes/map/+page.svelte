<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import MapView from '$lib/components/MapView.svelte';
	import GeocodingProgress from '$lib/components/GeocodingProgress.svelte';
	import EventFilters from '$lib/components/EventFilters.svelte';
	import PersonPanel from '$lib/components/PersonPanel.svelte';
	import ResetButton from '$lib/components/ResetButton.svelte';
	import { buildGeoJSON } from '$lib/map/source.js';
	import { deduplicateLocations, geocodeBatch } from '$lib/geo/geocoder.js';
	import { getTree } from '$lib/stores/tree.svelte.js';
	import 'mapbox-gl/dist/mapbox-gl.css';

	const tree = getTree();

	let isGeocoding = $state(true);
	let geocodeResolved = $state(0);
	let geocodeTotal = $state(0);
	let geocodeCurrentLocation = $state('');
	let geojson: GeoJSON.FeatureCollection = $state({ type: 'FeatureCollection', features: [] });
	let eventCounts: Record<string, number> = $state({});
	let mapView: MapView;
	let selectedPerson = $state<string | null>(null);
	let currentGeneration = $state(0);
	let maxGeneration = $state(5);
	let availableGenerations = $state<number[]>([]);
	let isAnimating = $state(false);
	let animationYear = $state<number | null>(null);

	// Store geocoded event data for animation
	let geocodedEvents = $state<Array<{
		personId: string;
		personName: string;
		type: string;
		year: number;
		lng: number;
		lat: number;
		place: string;
		generation: number;
	}>>([]);

	let gen = $derived(Number($page.url.searchParams.get('gen') ?? '5'));

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
		maxGeneration = gen;

		// Find which generations actually have data
		const genSet = new Set<number>();
		for (const p of people) {
			if ((p.generation ?? -1) >= 0 && (p.generation ?? 0) <= gen) {
				genSet.add(p.generation ?? 0);
			}
		}
		availableGenerations = [...genSet].sort((a, b) => a - b);
		console.log('Map page - people count:', people.length);
		console.log('Map page - available generations:', availableGenerations);
		console.log('Map page - gen distribution:', Object.fromEntries([...genSet].map(g => [g, people.filter(p => (p.generation ?? -1) === g).length])));

		// Count events by type
		const counts: Record<string, number> = {};
		for (const e of events) {
			counts[e.type] = (counts[e.type] ?? 0) + 1;
		}
		eventCounts = counts;

		// Geocode
		const locations = deduplicateLocations(events);
		geocodeTotal = locations.length;
		isGeocoding = true;

		const token = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
		const geocoded = await geocodeBatch(locations, {
			mapboxToken: token,
			onProgress: (resolved, _total, current) => {
				geocodeResolved = resolved;
				geocodeCurrentLocation = current;
			}
		});

		isGeocoding = false;

		const mappedEvents = events.map((e) => {
			const coords = e.place ? geocoded.get(e.place) : null;
			return {
				id: e.id,
				personId: e.personId,
				type: e.type,
				date: e.year ? { year: e.year, original: e.date ?? '' } : undefined,
				locationText: e.place,
				lat: coords?.latitude ?? null,
				lng: coords?.longitude ?? null
			};
		});

		const mappedPeople = people.map((p) => ({
			id: p.id,
			name: p.name,
			generation: p.generation ?? 0
		}));

		geojson = buildGeoJSON(mappedEvents, mappedPeople);

		// Store geocoded events for animation
		geocodedEvents = mappedEvents
			.filter((e) => e.lat != null && e.lng != null && e.date?.year)
			.map((e) => {
				const person = mappedPeople.find((p) => p.id === e.personId);
				return {
					personId: e.personId,
					personName: person?.name ?? '',
					type: e.type,
					year: e.date!.year,
					lng: e.lng!,
					lat: e.lat!,
					place: e.locationText ?? '',
					generation: person?.generation ?? -1
				};
			});

		requestAnimationFrame(() => mapView?.fitToData());
	}

	function onMarkerClick(feature: any) {
		selectedPerson = feature?.properties?.personId ?? null;
	}

	function handleGenChange(newGen: number) {
		mapView?.stopPlayback();
		isAnimating = false;
		currentGeneration = newGen;
		mapView?.fitToGeneration(newGen);
	}

	function handleClose() {
		selectedPerson = null;
	}

	function handleNavigate(id: string) {
		selectedPerson = id;
	}

	function handlePlayGeneration() {
		if (isAnimating) {
			mapView?.stopPlayback();
			isAnimating = false;
			return;
		}

		const genEvents = geocodedEvents.filter((e) => e.generation === currentGeneration);
		if (genEvents.length === 0) return;

		isAnimating = true;
		mapView?.fitToGeneration(currentGeneration);

		mapView?.playGeneration(genEvents, () => {
			isAnimating = false;
		});
	}

	function handleReset() {
		mapView?.stopPlayback();
		isAnimating = false;
		currentGeneration = 0;
		mapView?.fitToData();
	}

	function generationLabel(gen: number): string {
		if (gen === 0) return 'You';
		if (gen === 1) return 'Parents';
		if (gen === 2) return 'Grandparents';
		if (gen === 3) return 'Great-Grandparents';
		return 'Great-'.repeat(gen - 2) + 'Grandparents';
	}

	// Count people in current generation
	let currentGenPeopleCount = $derived(
		tree.data?.people.filter((p) => (p.generation ?? -1) === currentGeneration).length ?? 0
	);
</script>

<div class="map-page">
	<MapView bind:this={mapView} {geojson} {currentGeneration} {maxGeneration} {onMarkerClick} />

	<EventFilters {eventCounts} onFilterChange={() => {}} />

	<!-- Generation navigator -->
	<div class="gen-navigator">
		<div class="gen-label">Generation {currentGeneration}</div>
		<div class="gen-name">{generationLabel(currentGeneration)}</div>
		<div class="gen-count">{currentGenPeopleCount} {currentGenPeopleCount === 1 ? 'person' : 'people'}</div>
		<button
			class="play-btn"
			onclick={handlePlayGeneration}
			aria-label={isAnimating ? 'Stop life path animation' : 'Play life paths for this generation'}
		>
			{isAnimating ? '⏹' : '▶'} {isAnimating ? 'Stop' : 'Play Life Paths'}
		</button>
		<div class="gen-controls">
			<button
				class="gen-btn"
				disabled={currentGeneration <= 0}
				onclick={() => handleGenChange(currentGeneration - 1)}
				aria-label="Younger generation"
			>
				&larr; Younger
			</button>
			<div class="gen-dots">
				{#each availableGenerations as g}
					<button
						class="gen-dot"
						class:active={g === currentGeneration}
						onclick={() => handleGenChange(g)}
						aria-label="Generation {g}: {generationLabel(g)}"
					></button>
				{/each}
			</div>
			<button
				class="gen-btn"
				disabled={currentGeneration >= maxGeneration}
				onclick={() => handleGenChange(currentGeneration + 1)}
				aria-label="Older generation"
			>
				Older &rarr;
			</button>
		</div>
	</div>

	<PersonPanel personId={selectedPerson} onClose={handleClose} onNavigate={handleNavigate} />

	<ResetButton onReset={handleReset} />

	{#if isGeocoding}
		<GeocodingProgress resolved={geocodeResolved} total={geocodeTotal} currentLocation={geocodeCurrentLocation} />
	{/if}
</div>

<style>
	.map-page {
		width: 100vw;
		height: 100vh;
		position: relative;
		background: var(--color-map-bg);
	}

	.gen-navigator {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--color-map-panel);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding: 14px 24px;
		z-index: 5;
		text-align: center;
	}

	.gen-label {
		color: var(--color-gold);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.gen-name {
		color: var(--color-map-text-primary);
		font-size: 20px;
		font-weight: 600;
		font-family: var(--font-heading);
		margin-top: 2px;
	}

	.gen-count {
		color: var(--color-map-text-primary);
		opacity: 0.5;
		font-size: 13px;
		margin-top: 2px;
	}

	.play-btn {
		background: var(--color-gold);
		color: white;
		border: none;
		padding: 8px 20px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		margin-top: 8px;
	}

	.play-btn:hover {
		filter: brightness(1.1);
	}

	.play-btn:focus-visible {
		outline: 2px solid var(--color-map-text-primary);
		outline-offset: 2px;
	}

	.gen-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		margin-top: 10px;
	}

	.gen-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: var(--color-map-text-primary);
		padding: 6px 16px;
		border-radius: 4px;
		font-size: 12px;
		cursor: pointer;
	}

	.gen-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.gen-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
	}

	.gen-dots {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.gen-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background: transparent;
		cursor: pointer;
		padding: 0;
		transition: all 0.2s;
	}

	.gen-dot.active {
		background: var(--color-gold);
		border-color: var(--color-gold);
		width: 12px;
		height: 12px;
	}

	.gen-dot:hover:not(.active) {
		border-color: rgba(255, 255, 255, 0.6);
	}
</style>
