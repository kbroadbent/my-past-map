<script lang="ts">
	import UploadZone from '$lib/components/UploadZone.svelte';
	import ParseProgress from '$lib/components/ParseProgress.svelte';
	import GenerationPicker from '$lib/components/GenerationPicker.svelte';
	import DataManager from '$lib/components/DataManager.svelte';
	import { hasData, getCachedTreeSummary } from '$lib/db';
	import { onMount } from 'svelte';

	let phase: 'upload' | 'parsing' | 'pickGen' | 'map' | 'returning' = $state('upload');
	let parsePercent = $state(0);
	let parseMessage = $state('');
	let totalPeople = $state(0);
	let personCount = $state(0);
	let eventCount = $state(0);

	onMount(async () => {
		const cached = await hasData();
		if (cached) {
			const summary = await getCachedTreeSummary();
			if (summary) {
				personCount = summary.personCount;
				eventCount = summary.eventCount;
			}
			phase = 'returning';
		}
	});

	function handleFileSelected(file: File) {
		phase = 'parsing';
		parseMessage = 'Parsing...';
		// TODO: actual parsing logic
	}

	function handleConfirm(generations: number) {
		phase = 'map';
		// TODO: navigate to map view
	}

	function loadPrevious() {
		phase = 'map';
	}

	function uploadNew() {
		phase = 'upload';
	}

	function handleDataCleared() {
		phase = 'upload';
		personCount = 0;
		eventCount = 0;
	}
</script>

<main id="main-content" class="landing" style="background: linear-gradient(to bottom, var(--color-parchment-light), var(--color-parchment-dark));">
	<h1>My Past Map</h1>
	<p class="tagline">See where your ancestors lived, moved, and made history</p>

	{#if phase === 'returning'}
		<section class="return-visit">
			<p>Welcome back! You have {personCount} people and {eventCount} events cached.</p>
			<button onclick={loadPrevious}>Load previous tree</button>
			<button onclick={uploadNew}>Upload new file</button>
			<DataManager onDataCleared={handleDataCleared} />
		</section>
	{/if}

	{#if phase === 'upload'}
		<UploadZone onFileSelected={handleFileSelected} />
	{/if}

	{#if phase === 'parsing'}
		<ParseProgress percent={parsePercent} message={parseMessage} />
	{/if}

	{#if phase === 'pickGen'}
		<GenerationPicker {totalPeople} onConfirm={handleConfirm} />
	{/if}

	<section class="trust-badges">
		<p>Your data stays in your browser</p>
		<p>No account required</p>
	</section>

	<section class="export-help">
		<h2>How to export from your platform</h2>
		<ul>
			<li>FamilySearch: Settings &gt; Export</li>
			<li>Ancestry: Trees &gt; Export tree</li>
			<li>MyHeritage: Family site &gt; Export GEDCOM</li>
			<li>Gramps: Export &gt; GEDCOM</li>
		</ul>
	</section>
</main>
