<script lang="ts">
	interface Props {
		index: {
			sortedEvents: Array<{ year: number; eventIndex: number }>;
			generationBoundaries: Map<number, { minYear: number; maxYear: number }>;
		};
		onYearChange: (year: number) => void;
	}

	let { index, onYearChange }: Props = $props();

	let isPlaying = $state(false);
	let direction = $state<'forward' | 'backward'>('forward');

	let minYear = $derived(
		index.sortedEvents.length > 0 ? index.sortedEvents[0].year : 0
	);
	let maxYear = $derived(
		index.sortedEvents.length > 0 ? index.sortedEvents[index.sortedEvents.length - 1].year : 0
	);
	let currentYear = $state<number | null>(null);
	let displayYear = $derived(currentYear ?? maxYear);

	let sortedGenKeys = $derived(
		[...index.generationBoundaries.keys()].sort((a, b) => a - b)
	);

	function handlePlayPause() {
		isPlaying = !isPlaying;
	}

	function handleDirectionToggle() {
		direction = direction === 'forward' ? 'backward' : 'forward';
	}

	function handleSliderInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const year = Number(target.value);
		currentYear = year;
		onYearChange(year);
	}

	function handleNextGen() {
		const year = displayYear;
		for (const key of sortedGenKeys) {
			const boundary = index.generationBoundaries.get(key)!;
			if (boundary.minYear > year) {
				currentYear = boundary.minYear;
				onYearChange(boundary.minYear);
				return;
			}
		}
		currentYear = maxYear;
		onYearChange(maxYear);
	}

	function handlePrevGen() {
		const year = displayYear;
		for (let i = sortedGenKeys.length - 1; i >= 0; i--) {
			const boundary = index.generationBoundaries.get(sortedGenKeys[i])!;
			if (boundary.maxYear < year) {
				currentYear = boundary.maxYear;
				onYearChange(boundary.maxYear);
				return;
			}
		}
		currentYear = minYear;
		onYearChange(minYear);
	}
</script>

<section class="timeline-scrubber" aria-label="Timeline controls">
	<div class="controls-row">
		<button
			class="play-btn"
			onclick={handlePlayPause}
			aria-label={isPlaying ? 'Pause timeline' : 'Play timeline'}
		>
			{isPlaying ? '⏸' : '▶'}
		</button>

		<button
			class="direction-btn"
			onclick={handleDirectionToggle}
			aria-label="Playback direction: {direction}"
		>
			{direction === 'forward' ? '→' : '←'}
		</button>

		<div class="year-display" aria-live="polite">{displayYear}</div>

		<div class="scrubber-container">
			<input
				type="range"
				min={minYear}
				max={maxYear}
				value={displayYear}
				oninput={handleSliderInput}
				aria-label="Timeline year"
				aria-valuetext="Year {displayYear}"
			/>
		</div>

		<div class="year-end">{maxYear}</div>
	</div>

	<div class="gen-controls">
		<button class="gen-btn" onclick={handlePrevGen} aria-label="Previous generation">
			⏪ Gen
		</button>
		<button class="gen-btn" onclick={handleNextGen} aria-label="Next generation">
			Gen ⏩
		</button>
	</div>
</section>

<style>
	.timeline-scrubber {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--color-map-panel);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding: 12px 20px;
		z-index: 5;
	}

	.controls-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.play-btn,
	.direction-btn {
		background: var(--color-gold);
		border: none;
		color: var(--color-map-bg);
		width: 32px;
		height: 32px;
		border-radius: 50%;
		cursor: pointer;
		font-size: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.play-btn:focus-visible,
	.direction-btn:focus-visible {
		outline: 2px solid var(--color-map-text-primary);
		outline-offset: 2px;
	}

	.direction-btn {
		width: 28px;
		height: 28px;
		font-size: 12px;
	}

	.year-display {
		color: var(--color-map-text-primary);
		font-size: 20px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		min-width: 50px;
	}

	.scrubber-container {
		flex: 1;
	}

	.scrubber-container input[type='range'] {
		width: 100%;
		accent-color: var(--color-gold);
	}

	.year-end {
		color: var(--color-map-text-primary);
		opacity: 0.5;
		font-size: 12px;
	}

	.gen-controls {
		display: flex;
		gap: 8px;
		justify-content: center;
		margin-top: 8px;
	}

	.gen-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: var(--color-map-text-primary);
		padding: 4px 12px;
		border-radius: 4px;
		font-size: 11px;
		cursor: pointer;
	}

	.gen-btn:focus-visible {
		outline: 2px solid var(--color-gold);
		outline-offset: 2px;
	}
</style>
