import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TimelineScrubber from '$lib/components/TimelineScrubber.svelte';

const baseIndex = {
	sortedEvents: [
		{ year: 1800, eventIndex: 0 },
		{ year: 1850, eventIndex: 1 },
		{ year: 1900, eventIndex: 2 },
		{ year: 1950, eventIndex: 3 },
		{ year: 2000, eventIndex: 4 }
	],
	generationBoundaries: new Map([
		[1, { minYear: 1950, maxYear: 2000 }],
		[2, { minYear: 1900, maxYear: 1950 }],
		[3, { minYear: 1800, maxYear: 1900 }]
	])
};

describe('TimelineScrubber', () => {
	let onYearChange: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		onYearChange = vi.fn();
	});

	it('renders a play/pause button', () => {
		render(TimelineScrubber, { props: { index: baseIndex, onYearChange } });
		const btn = screen.getByRole('button', { name: /play/i });
		expect(btn).toBeTruthy();
	});

	it('play button aria-label shows Play when paused', () => {
		render(TimelineScrubber, { props: { index: baseIndex, onYearChange } });
		const btn = screen.getByRole('button', { name: /play/i });
		expect(btn.getAttribute('aria-label')).toMatch(/play/i);
	});

	it('play button aria-label changes to Pause when playing', async () => {
		render(TimelineScrubber, { props: { index: baseIndex, onYearChange } });
		const btn = screen.getByRole('button', { name: /play/i });
		await fireEvent.click(btn);
		const pauseBtn = screen.getByRole('button', { name: /pause/i });
		expect(pauseBtn).toBeTruthy();
	});

	it('renders a direction toggle button', () => {
		render(TimelineScrubber, { props: { index: baseIndex, onYearChange } });
		const btn = screen.getByRole('button', { name: /direction|forward|backward/i });
		expect(btn).toBeTruthy();
	});

	it('renders a year display with aria-live polite', () => {
		render(TimelineScrubber, { props: { index: baseIndex, onYearChange } });
		const yearDisplay = screen.getByText(/\d{4}/);
		expect(yearDisplay).toBeTruthy();
		expect(yearDisplay.getAttribute('aria-live')).toBe('polite');
	});

	it('renders a range slider', () => {
		render(TimelineScrubber, { props: { index: baseIndex, onYearChange } });
		const slider = screen.getByRole('slider');
		expect(slider).toBeTruthy();
	});

	it('range slider min and max match data bounds', () => {
		render(TimelineScrubber, { props: { index: baseIndex, onYearChange } });
		const slider = screen.getByRole('slider');
		expect(slider.getAttribute('min')).toBe('1800');
		expect(slider.getAttribute('max')).toBe('2000');
	});

	it('range slider aria-label includes year', () => {
		render(TimelineScrubber, { props: { index: baseIndex, onYearChange } });
		const slider = screen.getByRole('slider');
		expect(slider.getAttribute('aria-label')).toMatch(/year/i);
	});

	it('calls onYearChange when slider value changes', async () => {
		render(TimelineScrubber, { props: { index: baseIndex, onYearChange } });
		const slider = screen.getByRole('slider');
		await fireEvent.input(slider, { target: { value: '1900' } });
		expect(onYearChange).toHaveBeenCalledWith(1900);
	});

	it('renders generation step buttons', () => {
		render(TimelineScrubber, { props: { index: baseIndex, onYearChange } });
		const prevGen = screen.getByRole('button', { name: /previous gen/i });
		const nextGen = screen.getByRole('button', { name: /next gen/i });
		expect(prevGen).toBeTruthy();
		expect(nextGen).toBeTruthy();
	});

	it('next gen button jumps to next generation boundary year', async () => {
		render(TimelineScrubber, { props: { index: baseIndex, onYearChange } });
		const nextGen = screen.getByRole('button', { name: /next gen/i });
		await fireEvent.click(nextGen);
		expect(onYearChange).toHaveBeenCalled();
	});

	it('previous gen button jumps to previous generation boundary year', async () => {
		render(TimelineScrubber, { props: { index: baseIndex, onYearChange } });
		const prevGen = screen.getByRole('button', { name: /previous gen/i });
		await fireEvent.click(prevGen);
		expect(onYearChange).toHaveBeenCalled();
	});

	it('displays the current year from maxYear initially', () => {
		render(TimelineScrubber, { props: { index: baseIndex, onYearChange } });
		expect(screen.getByText('2000')).toBeTruthy();
	});

	it('handles empty sortedEvents gracefully', () => {
		const emptyIndex = {
			sortedEvents: [],
			generationBoundaries: new Map()
		};
		render(TimelineScrubber, { props: { index: emptyIndex, onYearChange } });
		// Should render without throwing
		const slider = screen.queryByRole('slider');
		expect(slider).toBeTruthy();
	});
});
