interface TimelineEntry {
	year: number;
	eventIndex: number;
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
