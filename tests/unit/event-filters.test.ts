import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

/**
 * Tests for EventFilters.svelte component
 *
 * The component receives eventCounts (Record<string, number>) and
 * onFilterChange callback, renders checkbox toggles for each event
 * type that has data, and wires to the filters store.
 */

async function getComponent() {
	const mod = await import('../../src/lib/components/EventFilters.svelte');
	return mod.default;
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
});
