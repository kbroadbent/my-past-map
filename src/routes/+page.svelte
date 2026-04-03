<script lang="ts">
	import UploadZone from '$lib/components/UploadZone.svelte';
	import ParseProgress from '$lib/components/ParseProgress.svelte';
	import GenerationPicker from '$lib/components/GenerationPicker.svelte';
	import DataManager from '$lib/components/DataManager.svelte';
	import { db, hasData, getCachedTreeSummary } from '$lib/db';
	import { readGedcom } from 'read-gedcom';
	import { transformGedcom } from '$lib/gedcom/transform';
	import { getTree } from '$lib/stores/tree.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { Person, Event, Family } from '$lib/types';

	let phase: 'upload' | 'parsing' | 'pickGen' | 'map' | 'returning' = $state('upload');
	let parsePercent = $state(0);
	let parseMessage = $state('');
	let parseError = $state<string | null>(null);
	let totalPeople = $state(0);
	let personCount = $state(0);
	let eventCount = $state(0);

	const tree = getTree();

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

	async function handleFileSelected(file: File) {
		phase = 'parsing';
		parseMessage = 'Reading file...';
		parsePercent = 10;
		parseError = null;

		try {
			const buffer = await file.arrayBuffer();
			parseMessage = 'Parsing GEDCOM...';
			parsePercent = 30;

			const gedcom = readGedcom(buffer);
			parseMessage = 'Building family tree...';
			parsePercent = 60;

			// Find the first individual to use as root
			const individuals = gedcom.getIndividualRecord();
			const firstIndi = individuals.arraySelect()[0];
			if (!firstIndi) {
				parseError = 'No individuals found in this GEDCOM file.';
				phase = 'upload';
				return;
			}
			const rootId = firstIndi.pointer()[0];

			const result = transformGedcom(gedcom, rootId);

			// Debug: log generation distribution
			const genCounts = new Map<number, number>();
			for (const p of result.people) {
				genCounts.set(p.generation, (genCounts.get(p.generation) ?? 0) + 1);
			}
			console.log('Root person:', rootId, result.people.find(p => p.id === rootId)?.name);
			console.log('Generation distribution:', Object.fromEntries([...genCounts.entries()].sort((a, b) => a[0] - b[0])));
			console.log('Total people:', result.people.length);
			console.log('People with gen -1 (unreachable):', result.people.filter(p => p.generation === -1).length);

			parseMessage = 'Saving to browser...';
			parsePercent = 80;

			// Map transform output to db types
			const dbPeople: Person[] = result.people.map((p) => ({
				id: p.id,
				name: p.name,
				sex: (p.gender === 'M' ? 'M' : p.gender === 'F' ? 'F' : 'U') as 'M' | 'F' | 'U',
				generation: p.generation
			}));

			const dbEvents: Event[] = result.events.map((e) => ({
				id: e.id,
				personId: e.personId,
				type: e.type,
				date: e.date?.raw,
				place: e.locationText,
				year: e.date?.year
			}));

			const dbFamilies: Family[] = result.families.map((f) => ({
				id: f.id,
				husbandId: f.spouse1Id,
				wifeId: f.spouse2Id,
				childIds: f.childIds
			}));

			// Save to IndexedDB
			await db.people.bulkPut(dbPeople);
			await db.events.bulkPut(dbEvents);
			await db.families.bulkPut(dbFamilies);

			// Load into store
			tree.load({ people: dbPeople, events: dbEvents, families: dbFamilies });

			totalPeople = dbPeople.length;
			parsePercent = 100;
			parseMessage = 'Done!';

			// Brief pause to show 100%, then move to generation picker
			setTimeout(() => {
				phase = 'pickGen';
			}, 500);
		} catch (err) {
			console.error('GEDCOM parse error:', err);
			parseError = err instanceof Error ? err.message : 'Failed to parse file';
			phase = 'upload';
		}
	}

	function handleConfirm(generations: number) {
		goto(`/map?gen=${generations}`);
	}

	async function loadPrevious() {
		// Load from IndexedDB into tree store
		const people = await db.people.toArray();
		const events = await db.events.toArray();
		const families = await db.families.toArray();
		tree.load({ people, events, families });
		goto('/map?gen=5');
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

<main id="main-content" class="landing">
	<nav class="nav">
		<span class="logo">My Past Map</span>
	</nav>

	<div class="hero">
		<h1>See where your ancestors lived,<br>traveled, and called home.</h1>
		<p class="tagline">Upload your family tree and watch your heritage come alive on an interactive map. Travel through time, generation by generation.</p>
	</div>

	{#if phase === 'returning'}
		<section class="return-visit">
			<div class="return-card">
				<p class="return-greeting">Welcome back!</p>
				<p class="return-stats">{personCount} people and {eventCount} events saved</p>
				<div class="return-actions">
					<button class="btn-primary" onclick={loadPrevious}>Load previous tree</button>
					<button class="btn-secondary" onclick={uploadNew}>Upload new file</button>
				</div>
				<DataManager onDataCleared={handleDataCleared} />
			</div>
		</section>
	{/if}

	{#if phase === 'upload'}
		<UploadZone onFileSelected={handleFileSelected} error={parseError ?? ''} />
	{/if}

	{#if phase === 'parsing'}
		<ParseProgress percent={parsePercent} message={parseMessage} />
	{/if}

	{#if phase === 'pickGen'}
		<GenerationPicker {totalPeople} onConfirm={handleConfirm} />
	{/if}

	<div class="export-help">
		<p class="export-intro">Export a GEDCOM file from FamilySearch, Ancestry, or your genealogy software.</p>
		<details>
			<summary>Show detailed export steps</summary>
			<div class="export-details">
				<p><strong>FamilySearch:</strong> Tree &rarr; Settings &rarr; Export Tree</p>
				<p><strong>Ancestry:</strong> Trees &rarr; Export Tree &rarr; GEDCOM</p>
				<p><strong>MyHeritage:</strong> Family Tree &rarr; Export to GEDCOM</p>
				<p><strong>Gramps:</strong> Family Trees &rarr; Export &rarr; GEDCOM</p>
			</div>
		</details>
	</div>

	<div class="trust-badges">
		<div class="badge">
			<span class="badge-icon" aria-hidden="true">&#x1f512;</span>
			<span>Your data stays<br>in your browser</span>
		</div>
		<div class="badge">
			<span class="badge-icon" aria-hidden="true">&#x26a1;</span>
			<span>No account<br>required</span>
		</div>
		<div class="badge">
			<span class="badge-icon" aria-hidden="true">&#x1f30d;</span>
			<span>Works with any<br>genealogy platform</span>
		</div>
	</div>
</main>

<style>
	.landing {
		min-height: 100vh;
		background: linear-gradient(180deg, var(--color-parchment-light) 0%, var(--color-parchment-dark) 100%);
	}

	.nav {
		display: flex;
		align-items: center;
		padding: 16px 32px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.05);
	}

	.logo {
		font-family: var(--font-heading);
		font-size: 20px;
		font-weight: 700;
		color: var(--color-brown-dark);
		letter-spacing: -0.5px;
	}

	.hero {
		text-align: center;
		padding: 80px 40px 48px;
	}

	h1 {
		font-family: var(--font-heading);
		color: var(--color-brown-dark);
		font-size: clamp(28px, 5vw, 40px);
		font-weight: 700;
		line-height: 1.25;
		margin: 0;
	}

	.tagline {
		color: #5c4a32;
		font-size: 17px;
		margin-top: 16px;
		max-width: 520px;
		margin-left: auto;
		margin-right: auto;
		line-height: 1.6;
	}

	.export-help {
		max-width: 480px;
		margin: 32px auto 0;
		padding: 0 20px;
		text-align: center;
	}

	.export-intro {
		color: #5c4a32;
		font-size: 14px;
		margin: 0;
	}

	details {
		margin-top: 8px;
	}

	summary {
		color: var(--color-gold);
		font-size: 14px;
		cursor: pointer;
		font-weight: 500;
	}

	.export-details {
		margin-top: 12px;
		padding: 16px;
		background: rgba(255, 255, 255, 0.4);
		border-radius: 8px;
		line-height: 2;
		font-size: 14px;
		color: #5c4a32;
		text-align: left;
	}

	.export-details p {
		margin: 0;
	}

	.trust-badges {
		display: flex;
		justify-content: center;
		gap: 40px;
		margin-top: 48px;
		padding-bottom: 48px;
	}

	.badge {
		text-align: center;
		color: #6b5a48;
		font-size: 12px;
		line-height: 1.5;
	}

	.badge-icon {
		font-size: 24px;
		display: block;
		margin-bottom: 6px;
	}

	.return-visit {
		display: flex;
		justify-content: center;
		padding: 0 20px;
	}

	.return-card {
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid rgba(184, 134, 11, 0.2);
		border-radius: 12px;
		padding: 32px 40px;
		text-align: center;
		max-width: 400px;
	}

	.return-greeting {
		font-family: var(--font-heading);
		font-size: 20px;
		color: var(--color-brown-dark);
		font-weight: 600;
		margin: 0;
	}

	.return-stats {
		color: #5c4a32;
		font-size: 14px;
		margin-top: 8px;
	}

	.return-actions {
		display: flex;
		gap: 12px;
		justify-content: center;
		margin-top: 20px;
	}

	.btn-primary {
		background: var(--color-gold);
		color: white;
		border: none;
		padding: 10px 24px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-primary:hover {
		filter: brightness(1.1);
	}

	.btn-secondary {
		background: transparent;
		color: var(--color-gold);
		border: 1px solid var(--color-gold);
		padding: 10px 24px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-secondary:hover {
		background: rgba(184, 134, 11, 0.05);
	}
</style>
