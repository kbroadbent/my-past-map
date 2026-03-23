<script lang="ts">
	import mapboxgl from 'mapbox-gl';
	import { onMount } from 'svelte';
	import { loadMarkerIcons } from '$lib/map/icons.js';

	let { geojson, onMarkerClick }: { geojson: GeoJSON.FeatureCollection; onMarkerClick?: (feature: any) => void } = $props();

	let containerEl: HTMLDivElement;
	let map: mapboxgl.Map;

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
				data: geojson,
				cluster: true,
				clusterMaxZoom: 14,
				clusterRadius: 50
			});

			map.addLayer({
				id: 'clusters',
				type: 'circle',
				source: 'ancestors',
				filter: ['has', 'point_count'],
				paint: {
					'circle-color': '#51bbd6',
					'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40]
				}
			});

			map.addLayer({
				id: 'cluster-count',
				type: 'symbol',
				source: 'ancestors',
				filter: ['has', 'point_count'],
				layout: {
					'text-field': '{point_count_abbreviated}',
					'text-size': 12
				}
			});

			map.addLayer({
				id: 'ancestor-markers',
				type: 'symbol',
				source: 'ancestors',
				filter: ['!', ['has', 'point_count']],
				layout: {
					'icon-image': ['concat', 'marker-', ['get', 'type']],
					'icon-size': 1,
					'icon-allow-overlap': true
				}
			});

			map.on('click', 'ancestor-markers', (e) => {
				if (e.features && e.features.length > 0 && onMarkerClick) {
					onMarkerClick(e.features[0]);
				}
			});

			map.on('click', 'clusters', (e) => {
				const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
				if (features.length > 0) {
					const clusterId = features[0].properties?.cluster_id;
					const source = map.getSource('ancestors') as mapboxgl.GeoJSONSource;
					if (source && clusterId != null) {
						(source as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
							if (!err && features[0].geometry.type === 'Point') {
								map.easeTo({
									center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
									zoom
								});
							}
						});
					}
				}
			});

			map.on('mouseenter', 'ancestor-markers', () => {
				map.getCanvas().style.cursor = 'pointer';
			});

			map.on('mouseleave', 'ancestor-markers', () => {
				map.getCanvas().style.cursor = '';
			});
		});

		return () => {
			map.remove();
		};
	});

	export function fitToData() {
		if (!geojson.features.length) return;
		const bounds = new mapboxgl.LngLatBounds();
		for (const feature of geojson.features) {
			if (feature.geometry.type === 'Point') {
				bounds.extend(feature.geometry.coordinates as [number, number]);
			}
		}
		map.fitBounds(bounds.toArray() as [[number, number], [number, number]], { padding: 50 });
	}

	export function setFilter(filter: any[]) {
		map.setFilter('ancestor-markers', filter);
	}

	export function getMap() {
		return map;
	}
</script>

<div class="map-container" aria-label="Ancestor map" bind:this={containerEl}></div>

<style>
	.map-container {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
	}
</style>
