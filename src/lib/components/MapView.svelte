<script lang="ts">
	import mapboxgl from 'mapbox-gl';
	import { onMount } from 'svelte';
	import { loadMarkerIcons } from '$lib/map/icons.js';

	interface LifeEvent {
		personId: string;
		personName: string;
		type: string;
		year: number;
		lng: number;
		lat: number;
		place: string;
	}

	interface Props {
		geojson: GeoJSON.FeatureCollection;
		currentGeneration?: number;
		maxGeneration?: number;
		onMarkerClick?: (feature: any) => void;
	}

	let props: Props = $props();
	let geojson = $derived(props.geojson);
	let currentGeneration = $derived(props.currentGeneration ?? 0);
	let maxGeneration = $derived(props.maxGeneration ?? 5);
	let onMarkerClick = $derived(props.onMarkerClick);

	let containerEl: HTMLDivElement;
	let map: mapboxgl.Map;
	let sourceReady = $state(false);
	let animationId: number | null = null;

	onMount(() => {
		mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

		map = new mapboxgl.Map({
			container: containerEl,
			style: 'mapbox://styles/mapbox/dark-v11',
			center: [0, 20],
			zoom: 2
		});

		map.on('load', async () => {
			await loadMarkerIcons(map);

			map.addSource('ancestors', {
				type: 'geojson',
				data: geojson
			});

			// Life path lines (initially empty)
			map.addSource('life-paths', {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: [] }
			});

			// Animated dots (initially empty)
			map.addSource('animated-dots', {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: [] }
			});

			// Life path line layer
			map.addLayer({
				id: 'life-path-lines',
				type: 'line',
				source: 'life-paths',
				paint: {
					'line-color': ['get', 'color'],
					'line-width': 2,
					'line-opacity': 0.7
				},
				layout: {
					'line-cap': 'round',
					'line-join': 'round'
				}
			});

			// Animated dot layer
			map.addLayer({
				id: 'animated-dots',
				type: 'circle',
				source: 'animated-dots',
				paint: {
					'circle-color': '#ffffff',
					'circle-radius': 6,
					'circle-stroke-width': 2,
					'circle-stroke-color': ['get', 'color']
				}
			});

			// Individual markers — generation-colored
			map.addLayer({
				id: 'ancestor-markers',
				type: 'circle',
				source: 'ancestors',
				paint: {
					'circle-color': buildGenerationColor(currentGeneration),
					'circle-radius': buildGenerationRadius(currentGeneration),
					'circle-opacity': buildGenerationOpacity(currentGeneration),
					'circle-stroke-width': buildGenerationStroke(currentGeneration),
					'circle-stroke-color': '#faf4e8',
					'circle-stroke-opacity': buildGenerationOpacity(currentGeneration)
				}
			});

			// Name labels for current generation
			map.addLayer({
				id: 'ancestor-labels',
				type: 'symbol',
				source: 'ancestors',
				filter: ['==', ['get', 'generation'], currentGeneration],
				layout: {
					'text-field': ['get', 'personName'],
					'text-size': 11,
					'text-offset': [0, 1.5],
					'text-anchor': 'top',
					'text-allow-overlap': false
				},
				paint: {
					'text-color': '#faf4e8',
					'text-halo-color': 'rgba(30, 26, 20, 0.9)',
					'text-halo-width': 1.5
				}
			});

			sourceReady = true;

			// Hover popup
			const popup = new mapboxgl.Popup({
				closeButton: false,
				closeOnClick: false,
				className: 'ancestor-popup',
				offset: 14
			});

			map.on('mouseenter', 'ancestor-markers', (e) => {
				map.getCanvas().style.cursor = 'pointer';
				if (!e.features || e.features.length === 0) return;
				const f = e.features[0];
				const props = f.properties!;
				const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
				const eventLabel = (props.type as string).charAt(0).toUpperCase() + (props.type as string).slice(1);
				const year = props.year ? ` (${props.year})` : '';
				const location = props.locationText ? `<div style="opacity:0.7;margin-top:2px">${props.locationText}</div>` : '';
				popup
					.setLngLat(coords)
					.setHTML(`<strong>${props.personName}</strong><div>${eventLabel}${year}</div>${location}`)
					.addTo(map);
			});

			map.on('mouseleave', 'ancestor-markers', () => {
				map.getCanvas().style.cursor = '';
				popup.remove();
			});

			map.on('click', 'ancestor-markers', (e) => {
				if (e.features && e.features.length > 0 && onMarkerClick) {
					onMarkerClick(e.features[0]);
				}
			});
		});

		return () => {
			stopAnimation();
			map.remove();
		};
	});

	// Generation styling expressions
	function buildGenerationColor(gen: number): mapboxgl.Expression {
		return [
			'case',
			['==', ['get', 'generation'], gen], '#f0c050',
			['<', ['get', 'generation'], gen], '#e8a84c',
			'#5ab8a0'
		] as any;
	}

	function buildGenerationOpacity(gen: number): mapboxgl.Expression {
		return [
			'max', 0.15,
			['-', 1.0,
				['*', 0.15,
					['abs', ['-', ['get', 'generation'], gen]]
				]
			]
		] as any;
	}

	function buildGenerationRadius(gen: number): mapboxgl.Expression {
		return [
			'case',
			['==', ['get', 'generation'], gen], 12,
			['<=', ['abs', ['-', ['get', 'generation'], gen]], 1], 6,
			['<=', ['abs', ['-', ['get', 'generation'], gen]], 2], 4,
			3
		] as any;
	}

	function buildGenerationStroke(gen: number): mapboxgl.Expression {
		return [
			'case',
			['==', ['get', 'generation'], gen], 2.5,
			1
		] as any;
	}

	// Update styling when generation changes
	$effect(() => {
		if (!sourceReady || !map) return;

		map.setPaintProperty('ancestor-markers', 'circle-color', buildGenerationColor(currentGeneration));
		map.setPaintProperty('ancestor-markers', 'circle-opacity', buildGenerationOpacity(currentGeneration));
		map.setPaintProperty('ancestor-markers', 'circle-radius', buildGenerationRadius(currentGeneration));
		map.setPaintProperty('ancestor-markers', 'circle-stroke-width', buildGenerationStroke(currentGeneration));
		map.setPaintProperty('ancestor-markers', 'circle-stroke-opacity', buildGenerationOpacity(currentGeneration));

		map.setFilter('ancestor-labels', ['==', ['get', 'generation'], currentGeneration]);
	});

	// Update source data when geojson changes
	$effect(() => {
		if (sourceReady && map && geojson) {
			const source = map.getSource('ancestors') as mapboxgl.GeoJSONSource;
			if (source) {
				source.setData(geojson);
			}
		}
	});

	// ---- Animation ----

	function stopAnimation() {
		if (animationId) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
		// Clear animation layers
		if (map && sourceReady) {
			(map.getSource('life-paths') as mapboxgl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
			(map.getSource('animated-dots') as mapboxgl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
		}
	}

	// Assign a consistent color to each person
	const PERSON_COLORS = [
		'#e8a84c', '#c75643', '#4a9a8a', '#5a8f6a', '#b8860b',
		'#d4956a', '#8fbc6a', '#c9a44a', '#e07040', '#4a90a8',
		'#7ab55c', '#b388ff', '#5bc0be', '#fca311', '#ff6bcb'
	];

	export function playGeneration(lifeEvents: LifeEvent[], onComplete?: () => void) {
		stopAnimation();
		if (!map || !sourceReady || lifeEvents.length === 0) return;

		// Group events by person, sorted by year
		const byPerson = new Map<string, LifeEvent[]>();
		for (const evt of lifeEvents) {
			const list = byPerson.get(evt.personId) ?? [];
			list.push(evt);
			byPerson.set(evt.personId, list);
		}
		for (const [, events] of byPerson) {
			events.sort((a, b) => a.year - b.year);
		}

		// Build a timeline of all events across all people, sorted by year
		const allEvents = [...lifeEvents].sort((a, b) => a.year - b.year);
		if (allEvents.length === 0) return;

		const minYear = allEvents[0].year;
		const maxYear = allEvents[allEvents.length - 1].year;
		const yearRange = Math.max(maxYear - minYear, 1);

		// Assign colors to people
		const personIds = [...byPerson.keys()];
		const personColor = new Map<string, string>();
		personIds.forEach((id, i) => {
			personColor.set(id, PERSON_COLORS[i % PERSON_COLORS.length]);
		});

		// Animation state
		const DURATION_MS = Math.min(yearRange * 40, 15000); // ~40ms per year, max 15 seconds
		let startTime: number | null = null;

		function animate(timestamp: number) {
			if (!startTime) startTime = timestamp;
			const elapsed = timestamp - startTime;
			const progress = Math.min(elapsed / DURATION_MS, 1);
			const currentYear = minYear + progress * yearRange;

			// Build line features: for each person, draw a line through events up to currentYear
			const lineFeatures: GeoJSON.Feature[] = [];
			const dotFeatures: GeoJSON.Feature[] = [];

			for (const [personId, events] of byPerson) {
				const color = personColor.get(personId) ?? '#ffffff';
				const visibleEvents = events.filter(e => e.year <= currentYear);

				if (visibleEvents.length >= 2) {
					// Draw line through all visible event locations
					const coordinates = visibleEvents.map(e => [e.lng, e.lat]);
					lineFeatures.push({
						type: 'Feature',
						geometry: {
							type: 'LineString',
							coordinates
						},
						properties: { personId, color }
					});
				}

				if (visibleEvents.length > 0) {
					// Place animated dot at the most recent event location
					const lastEvent = visibleEvents[visibleEvents.length - 1];

					// If between events, interpolate position
					const nextEvent = events.find(e => e.year > currentYear);
					let dotLng = lastEvent.lng;
					let dotLat = lastEvent.lat;

					if (nextEvent) {
						const segmentProgress = (currentYear - lastEvent.year) / (nextEvent.year - lastEvent.year);
						dotLng = lastEvent.lng + (nextEvent.lng - lastEvent.lng) * segmentProgress;
						dotLat = lastEvent.lat + (nextEvent.lat - lastEvent.lat) * segmentProgress;
					}

					dotFeatures.push({
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: [dotLng, dotLat]
						},
						properties: {
							personId,
							personName: lastEvent.personName,
							color,
							currentEvent: lastEvent.type,
							year: Math.round(currentYear)
						}
					});
				}
			}

			(map.getSource('life-paths') as mapboxgl.GeoJSONSource).setData({
				type: 'FeatureCollection',
				features: lineFeatures
			});

			(map.getSource('animated-dots') as mapboxgl.GeoJSONSource).setData({
				type: 'FeatureCollection',
				features: dotFeatures
			});

			if (progress < 1) {
				animationId = requestAnimationFrame(animate);
			} else {
				animationId = null;
				onComplete?.();
			}
		}

		animationId = requestAnimationFrame(animate);
	}

	export function stopPlayback() {
		stopAnimation();
	}

	export function fitToData() {
		if (!geojson.features.length || !map) return;
		const bounds = new mapboxgl.LngLatBounds();
		for (const feature of geojson.features) {
			if (feature.geometry.type === 'Point') {
				bounds.extend(feature.geometry.coordinates as [number, number]);
			}
		}
		map.fitBounds(bounds.toArray() as [[number, number], [number, number]], { padding: 80 });
	}

	export function fitToGeneration(gen: number) {
		if (!map || !geojson.features.length) return;
		const genFeatures = geojson.features.filter(
			(f) => f.properties && (f.properties as any).generation === gen
		);
		if (genFeatures.length === 0) return;
		const bounds = new mapboxgl.LngLatBounds();
		for (const feature of genFeatures) {
			if (feature.geometry.type === 'Point') {
				bounds.extend(feature.geometry.coordinates as [number, number]);
			}
		}
		map.fitBounds(bounds.toArray() as [[number, number], [number, number]], { padding: 80 });
	}

	export function setFilter(filter: any[]) {
		if (!map || !sourceReady) return;
		map.setFilter('ancestor-markers', filter);
	}

	export function getMap() { return map; }
</script>

<div class="map-container" aria-label="Ancestor map showing life event locations" bind:this={containerEl}></div>

<style>
	.map-container {
		width: 100%;
		height: 100%;
		position: absolute;
		inset: 0;
	}
</style>
