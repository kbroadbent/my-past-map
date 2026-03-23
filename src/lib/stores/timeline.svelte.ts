interface TimelineEntry {
	year: number;
	eventIndex: number;
}

export function getTimeline() {
	let _minYear = $state(0);
	let _maxYear = $state(0);
	let _currentYear = $state(0);
	let _isPlaying = $state(false);
	let _direction = $state<'forward' | 'backward'>('backward');

	function setRange(min: number, max: number) {
		_minYear = min;
		_maxYear = max;
		_currentYear = max;
	}

	function setYear(year: number) {
		_currentYear = Math.max(_minYear, Math.min(_maxYear, year));
	}

	function togglePlay() {
		_isPlaying = !_isPlaying;
	}

	function toggleDirection() {
		_direction = _direction === 'backward' ? 'forward' : 'backward';
	}

	function reset() {
		_currentYear = _maxYear;
		_isPlaying = false;
		_direction = 'backward';
	}

	return {
		get minYear() { return _minYear; },
		get maxYear() { return _maxYear; },
		get currentYear() { return _currentYear; },
		get isPlaying() { return _isPlaying; },
		get direction() { return _direction; },
		setRange,
		setYear,
		togglePlay,
		toggleDirection,
		reset
	};
}

/**
 * Binary search to find the count of visible events up to (and including) the given year.
 */
export function findVisibleEventRange(sorted: TimelineEntry[], year: number): number {
	if (sorted.length === 0) return 0;

	let lo = 0;
	let hi = sorted.length;

	while (lo < hi) {
		const mid = (lo + hi) >>> 1;
		if (sorted[mid].year <= year) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}

	return lo;
}

/**
 * Compute which events enter and leave the visible range when moving from oldYear to newYear.
 */
export function computeDelta(
	sorted: TimelineEntry[],
	oldYear: number,
	newYear: number
): { entering: number[]; leaving: number[] } {
	const oldEnd = findVisibleEventRange(sorted, oldYear);
	const newEnd = findVisibleEventRange(sorted, newYear);

	if (oldEnd === newEnd) {
		return { entering: [], leaving: [] };
	}

	if (newEnd > oldEnd) {
		// Moving forward — events enter
		const entering = sorted.slice(oldEnd, newEnd).map((e) => e.eventIndex);
		return { entering, leaving: [] };
	}

	// Moving backward — events leave
	const leaving = sorted
		.slice(newEnd, oldEnd)
		.map((e) => e.eventIndex)
		.reverse();
	return { entering: [], leaving };
}
