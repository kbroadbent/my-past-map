import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ParseProgress from '$lib/components/ParseProgress.svelte';

describe('ParseProgress', () => {
	it('displays the progress message', () => {
		render(ParseProgress, { props: { percent: 50, message: 'Parsing individuals...' } });

		expect(screen.getByText('Parsing individuals...')).toBeTruthy();
	});

	it('displays the percentage as a rounded integer', () => {
		render(ParseProgress, { props: { percent: 33.7, message: 'Loading...' } });

		expect(screen.getByText('34%')).toBeTruthy();
	});

	it('has a progress bar with correct width style', () => {
		const { container } = render(ParseProgress, {
			props: { percent: 75, message: 'Processing...' }
		});

		const bar = container.querySelector('.bar') as HTMLElement;
		expect(bar).toBeTruthy();
		expect(bar.style.width).toBe('75%');
	});

	it('has role=status for live region announcements', () => {
		render(ParseProgress, { props: { percent: 0, message: 'Starting...' } });

		const statusRegion = screen.getByRole('status');
		expect(statusRegion).toBeTruthy();
	});

	it('has aria-live=polite for screen reader updates', () => {
		render(ParseProgress, { props: { percent: 0, message: 'Starting...' } });

		const statusRegion = screen.getByRole('status');
		expect(statusRegion.getAttribute('aria-live')).toBe('polite');
	});

	it('shows 0% at the start', () => {
		render(ParseProgress, { props: { percent: 0, message: 'Initializing...' } });

		expect(screen.getByText('0%')).toBeTruthy();
	});

	it('shows 100% when complete', () => {
		render(ParseProgress, { props: { percent: 100, message: 'Complete!' } });

		expect(screen.getByText('100%')).toBeTruthy();
	});
});
