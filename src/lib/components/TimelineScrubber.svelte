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
		index.sortedEvents.length > 0
			? index.sortedEvents[0].year
			: 0
	);
	let maxYear = $derived(
		index.sortedEvents.length > 0
			? index.sortedEvents[index.sortedEvents.length - 1].year
			: 0
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
		// If no next, jump to max
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
		// If no prev, jump to min
		currentYear = minYear;
		onYearChange(minYear);
	}
</script>

<div class="timeline-scrubber">
	<button aria-label={isPlaying ? 'Pause' : 'Play'} onclick={handlePlayPause}>
		{isPlaying ? '⏸' : '▶'}
	</button>

	<button aria-label={direction === 'forward' ? 'Direction: Forward' : 'Direction: Backward'} onclick={handleDirectionToggle}>
		{direction === 'forward' ? '→' : '←'}
	</button>

	<button aria-label="Previous Gen" onclick={handlePrevGen}>⏮</button>

	<input
		type="range"
		min={minYear}
		max={maxYear}
		value={displayYear}
		aria-label="Timeline year"
		oninput={handleSliderInput}
	/>

	<button aria-label="Next Gen" onclick={handleNextGen}>⏭</button>

	<span aria-live="polite">{displayYear}</span>
</div>
