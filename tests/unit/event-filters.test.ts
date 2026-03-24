import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

/**
 * Tests for EventFilters.svelte component
 *
 * The component receives eventCounts (Record<string, number>) and
 * onFilterChange callback, renders checkbox toggles for each event
 * type that has data, and wires to the filters store and Mapbox
 * filter expressions.
 */

async function getComponent() {
	const mod = await import('../../src/lib/components/EventFilters.svelte');
	return mod.default;
}

async function getBuildFilterExpression() {
	const mod = await import('../../src/lib/map/source.js');
	return mod.buildFilterExpression;
}

const sampleCounts: Record<string, number> = {
	birth: 42,
	death: 38,
	marriage: 15,
	burial: 7,
	immigration: 3
};

describe('EventFilters component', () => {
	it('renders a checkbox for each event type with count > 0', async () => {
		const EventFilters = await getComponent();
		render(EventFilters, { props: { eventCounts: sampleCounts, onFilterChange: vi.fn() } });

		const checkboxes = screen.getAllByRole('checkbox');
		expect(checkboxes).toHaveLength(Object.keys(sampleCounts).length);
	});

	it('does not render checkboxes for event types with zero or missing counts', async () => {
		const EventFilters = await getComponent();
		const counts = { birth: 5, death: 0 };
		render(EventFilters, { props: { eventCounts: counts, onFilterChange: vi.fn() } });

		const checkboxes = screen.getAllByRole('checkbox');
		expect(checkboxes).toHaveLength(1);
	});

	it('displays the event type label from EVENT_TYPES constants', async () => {
		const EventFilters = await getComponent();
		render(EventFilters, { props: { eventCounts: { birth: 10 }, onFilterChange: vi.fn() } });

		expect(screen.getByText('Birth')).toBeDefined();
	});

	it('displays the event count next to each label', async () => {
		const EventFilters = await getComponent();
		render(EventFilters, { props: { eventCounts: { birth: 42 }, onFilterChange: vi.fn() } });

		expect(screen.getByText('(42)')).toBeDefined();
	});

	it('all checkboxes are checked initially', async () => {
		const EventFilters = await getComponent();
		render(EventFilters, { props: { eventCounts: sampleCounts, onFilterChange: vi.fn() } });

		const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
		for (const cb of checkboxes) {
			expect(cb.checked).toBe(true);
		}
	});

	it('unchecks a checkbox when clicked', async () => {
		const EventFilters = await getComponent();
		render(EventFilters, { props: { eventCounts: { birth: 10 }, onFilterChange: vi.fn() } });

		const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
		await fireEvent.click(checkbox);
		expect(checkbox.checked).toBe(false);
	});

	it('calls onFilterChange with active types when a checkbox is toggled', async () => {
		const EventFilters = await getComponent();
		const onFilterChange = vi.fn();
		render(EventFilters, { props: { eventCounts: { birth: 10, death: 5 }, onFilterChange } });

		// Uncheck birth
		const birthCheckbox = screen.getByRole('checkbox', { name: /birth/i });
		await fireEvent.click(birthCheckbox);

		expect(onFilterChange).toHaveBeenCalled();
		// The callback should receive the list of still-active types
		const lastCall = onFilterChange.mock.calls[onFilterChange.mock.calls.length - 1];
		const activeTypes: string[] = lastCall[0];
		expect(activeTypes).not.toContain('birth');
	});

	it('re-checks a checkbox when clicked twice', async () => {
		const EventFilters = await getComponent();
		render(EventFilters, { props: { eventCounts: { birth: 10 }, onFilterChange: vi.fn() } });

		const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
		await fireEvent.click(checkbox);
		expect(checkbox.checked).toBe(false);
		await fireEvent.click(checkbox);
		expect(checkbox.checked).toBe(true);
	});

	it('has a group role with accessible label', async () => {
		const EventFilters = await getComponent();
		render(EventFilters, { props: { eventCounts: sampleCounts, onFilterChange: vi.fn() } });

		const group = screen.getByRole('group');
		expect(group).toBeDefined();
		expect(group.getAttribute('aria-label')).toBeTruthy();
	});

	it('renders a header with "Show Events" text', async () => {
		const EventFilters = await getComponent();
		render(EventFilters, { props: { eventCounts: sampleCounts, onFilterChange: vi.fn() } });

		expect(screen.getByText('Show Events')).toBeDefined();
	});

	it('shows a colored indicator matching the event type color', async () => {
		const EventFilters = await getComponent();
		const { container } = render(EventFilters, {
			props: { eventCounts: { birth: 10 }, onFilterChange: vi.fn() }
		});

		// The birth event type color is #e8a84c - look for an element styled with it
		const dot = container.querySelector('[style*="#e8a84c"]') ||
			container.querySelector('[style*="rgb(232, 168, 76)"]');
		expect(dot).not.toBeNull();
	});

	it('applies reduced opacity to unchecked filter items', async () => {
		const EventFilters = await getComponent();
		const { container } = render(EventFilters, {
			props: { eventCounts: { birth: 10 }, onFilterChange: vi.fn() }
		});

		const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
		await fireEvent.click(checkbox);

		// Look for opacity style on the filter item or its parent
		const item = checkbox.closest('[style*="opacity"]') || checkbox.parentElement;
		const style = item?.getAttribute('style') ?? '';
		expect(style).toContain('0.4');
	});

	it('renders only event types present in eventCounts, not all EVENT_TYPES', async () => {
		const EventFilters = await getComponent();
		render(EventFilters, { props: { eventCounts: { birth: 5 }, onFilterChange: vi.fn() } });

		// Should not render types not in eventCounts
		expect(screen.queryByText('Death')).toBeNull();
		expect(screen.queryByText('Marriage')).toBeNull();
		expect(screen.queryByText('Census')).toBeNull();
	});

	it('handles empty eventCounts gracefully', async () => {
		const EventFilters = await getComponent();
		render(EventFilters, { props: { eventCounts: {}, onFilterChange: vi.fn() } });

		const checkboxes = screen.queryAllByRole('checkbox');
		expect(checkboxes).toHaveLength(0);
	});

	it('each checkbox has an accessible name containing the event type label', async () => {
		const EventFilters = await getComponent();
		render(EventFilters, { props: { eventCounts: { birth: 10, death: 5 }, onFilterChange: vi.fn() } });

		expect(screen.getByRole('checkbox', { name: /birth/i })).toBeDefined();
		expect(screen.getByRole('checkbox', { name: /death/i })).toBeDefined();
	});

	it('calls onFilterChange with all types when no checkboxes are toggled', async () => {
		const EventFilters = await getComponent();
		const onFilterChange = vi.fn();
		render(EventFilters, { props: { eventCounts: { birth: 10, death: 5, marriage: 3 }, onFilterChange } });

		// Toggle birth off then back on — last call should contain all three types
		const birthCheckbox = screen.getByRole('checkbox', { name: /birth/i });
		await fireEvent.click(birthCheckbox);
		await fireEvent.click(birthCheckbox);

		const lastCall = onFilterChange.mock.calls[onFilterChange.mock.calls.length - 1];
		const activeTypes: string[] = lastCall[0];
		expect(activeTypes).toContain('birth');
		expect(activeTypes).toContain('death');
		expect(activeTypes).toContain('marriage');
	});

	it('calls onFilterChange excluding multiple toggled-off types', async () => {
		const EventFilters = await getComponent();
		const onFilterChange = vi.fn();
		render(EventFilters, {
			props: { eventCounts: { birth: 10, death: 5, marriage: 3 }, onFilterChange }
		});

		await fireEvent.click(screen.getByRole('checkbox', { name: /birth/i }));
		await fireEvent.click(screen.getByRole('checkbox', { name: /marriage/i }));

		const lastCall = onFilterChange.mock.calls[onFilterChange.mock.calls.length - 1];
		const activeTypes: string[] = lastCall[0];
		expect(activeTypes).not.toContain('birth');
		expect(activeTypes).not.toContain('marriage');
		expect(activeTypes).toContain('death');
	});
});

describe('buildFilterExpression', () => {
	it('exports buildFilterExpression as a function', async () => {
		const buildFilterExpression = await getBuildFilterExpression();
		expect(typeof buildFilterExpression).toBe('function');
	});

	it('returns a Mapbox "in" filter expression for given active types', async () => {
		const buildFilterExpression = await getBuildFilterExpression();
		const expr = buildFilterExpression(['birth', 'death']);

		// Mapbox GL filter: ["in", "type", "birth", "death"]
		// or ["match", ["get", "type"], [...], true, false]
		// Either way, the expression must be an array starting with a Mapbox operator
		expect(Array.isArray(expr)).toBe(true);
		expect(expr.length).toBeGreaterThanOrEqual(2);
	});

	it('produces a filter that includes the "type" property field', async () => {
		const buildFilterExpression = await getBuildFilterExpression();
		const expr = buildFilterExpression(['birth', 'death', 'marriage']);

		// The expression should reference the "type" property
		const flat = JSON.stringify(expr);
		expect(flat).toContain('type');
	});

	it('includes all provided active types in the expression', async () => {
		const buildFilterExpression = await getBuildFilterExpression();
		const activeTypes = ['birth', 'death', 'marriage'];
		const expr = buildFilterExpression(activeTypes);

		const flat = JSON.stringify(expr);
		for (const t of activeTypes) {
			expect(flat).toContain(t);
		}
	});

	it('returns a filter that excludes types not in the active list', async () => {
		const buildFilterExpression = await getBuildFilterExpression();
		const expr = buildFilterExpression(['birth']);

		const flat = JSON.stringify(expr);
		expect(flat).toContain('birth');
		expect(flat).not.toContain('death');
		expect(flat).not.toContain('marriage');
	});

	it('handles a single active type', async () => {
		const buildFilterExpression = await getBuildFilterExpression();
		const expr = buildFilterExpression(['census']);

		expect(Array.isArray(expr)).toBe(true);
		const flat = JSON.stringify(expr);
		expect(flat).toContain('census');
	});

	it('handles all event types active', async () => {
		const buildFilterExpression = await getBuildFilterExpression();
		const allTypes = [
			'birth', 'death', 'marriage', 'burial', 'immigration',
			'emigration', 'military', 'christening', 'census', 'residence', 'other'
		];
		const expr = buildFilterExpression(allTypes);

		expect(Array.isArray(expr)).toBe(true);
		const flat = JSON.stringify(expr);
		for (const t of allTypes) {
			expect(flat).toContain(t);
		}
	});

	it('handles empty active types array', async () => {
		const buildFilterExpression = await getBuildFilterExpression();
		const expr = buildFilterExpression([]);

		// Should still return a valid Mapbox filter expression (that matches nothing)
		expect(Array.isArray(expr)).toBe(true);
	});
});

describe('Map page EventFilters integration', () => {
	const mapPagePath = '../../src/routes/map/+page.svelte';

	async function readMapPage() {
		const { readFileSync } = await import('fs');
		const { resolve } = await import('path');
		return readFileSync(resolve(__dirname, mapPagePath), 'utf-8');
	}

	it('map page imports EventFilters component', async () => {
		const content = await readMapPage();
		expect(content).toContain('EventFilters');
	});

	it('map page imports or uses the filters store', async () => {
		const content = await readMapPage();
		expect(content).toMatch(/filters|getFilters/);
	});

	it('map page wires onFilterChange to setFilter or filter update', async () => {
		const content = await readMapPage();
		// Should have a handler that calls setFilter or builds a filter expression
		expect(content).toMatch(/setFilter|buildFilterExpression|filterChange/i);
	});

	it('map page renders EventFilters with eventCounts prop', async () => {
		const content = await readMapPage();
		expect(content).toContain('eventCounts');
	});
});
