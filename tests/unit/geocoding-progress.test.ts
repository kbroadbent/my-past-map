import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';

/**
 * Tests for GeocodingProgress.svelte component
 *
 * The component displays geocoding progress as a centered overlay:
 * resolved/total count, progress bar, and current location text.
 */

async function getComponent() {
	const mod = await import('../../src/lib/components/GeocodingProgress.svelte');
	return mod.default;
}

describe('GeocodingProgress component', () => {
	it('displays resolved and total counts', async () => {
		const GeocodingProgress = await getComponent();
		render(GeocodingProgress, {
			props: { resolved: 12, total: 50, currentLocation: 'London, England' }
		});

		expect(screen.getByText(/12\/50/)).toBeDefined();
	});

	it('displays "Geocoding locations..." header text', async () => {
		const GeocodingProgress = await getComponent();
		render(GeocodingProgress, {
			props: { resolved: 0, total: 10, currentLocation: '' }
		});

		expect(screen.getByText(/Geocoding locations/)).toBeDefined();
	});

	it('displays the current location being resolved', async () => {
		const GeocodingProgress = await getComponent();
		render(GeocodingProgress, {
			props: { resolved: 3, total: 20, currentLocation: 'Paris, France' }
		});

		expect(screen.getByText(/Paris, France/)).toBeDefined();
	});

	it('has a progress bar with correct width based on resolved/total', async () => {
		const GeocodingProgress = await getComponent();
		const { container } = render(GeocodingProgress, {
			props: { resolved: 25, total: 50, currentLocation: 'Berlin, Germany' }
		});

		const bar = container.querySelector('.bar') as HTMLElement;
		expect(bar).toBeTruthy();
		expect(bar.style.width).toBe('50%');
	});

	it('has role=status for live region announcements', async () => {
		const GeocodingProgress = await getComponent();
		render(GeocodingProgress, {
			props: { resolved: 0, total: 10, currentLocation: '' }
		});

		const statusRegion = screen.getByRole('status');
		expect(statusRegion).toBeTruthy();
	});

	it('has aria-live=polite for screen reader updates', async () => {
		const GeocodingProgress = await getComponent();
		render(GeocodingProgress, {
			props: { resolved: 0, total: 10, currentLocation: '' }
		});

		const statusRegion = screen.getByRole('status');
		expect(statusRegion.getAttribute('aria-live')).toBe('polite');
	});

	it('shows 0% progress bar width when no locations resolved', async () => {
		const GeocodingProgress = await getComponent();
		const { container } = render(GeocodingProgress, {
			props: { resolved: 0, total: 20, currentLocation: '' }
		});

		const bar = container.querySelector('.bar') as HTMLElement;
		expect(bar).toBeTruthy();
		expect(bar.style.width).toBe('0%');
	});

	it('shows 100% progress bar width when all locations resolved', async () => {
		const GeocodingProgress = await getComponent();
		const { container } = render(GeocodingProgress, {
			props: { resolved: 10, total: 10, currentLocation: '' }
		});

		const bar = container.querySelector('.bar') as HTMLElement;
		expect(bar).toBeTruthy();
		expect(bar.style.width).toBe('100%');
	});

	it('handles zero total gracefully without division by zero', async () => {
		const GeocodingProgress = await getComponent();
		const { container } = render(GeocodingProgress, {
			props: { resolved: 0, total: 0, currentLocation: '' }
		});

		const bar = container.querySelector('.bar') as HTMLElement;
		expect(bar).toBeTruthy();
		expect(bar.style.width).toBe('0%');
	});
});
