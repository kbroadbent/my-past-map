import { EVENT_TYPES } from '../constants.js';

export function getFilters() {
	const allTypes = Object.keys(EVENT_TYPES);
	let active: Record<string, boolean> = $state(Object.fromEntries(allTypes.map((t) => [t, true])));

	function getActiveTypes(): string[] {
		return allTypes.filter((t) => active[t]);
	}

	function isActive(type: string): boolean {
		return active[type] ?? false;
	}

	function toggle(type: string) {
		active[type] = !active[type];
	}

	function enableAll() {
		for (const t of allTypes) {
			active[t] = true;
		}
	}

	return {
		getActiveTypes,
		isActive,
		toggle,
		enableAll
	};
}
