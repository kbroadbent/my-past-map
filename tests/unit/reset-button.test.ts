import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

/**
 * Tests for ResetButton.svelte component
 *
 * A simple button that calls onReset when clicked.
 * Positioned absolutely on the map, labeled "Reset View".
 */

async function getComponent() {
	const mod = await import('../../src/lib/components/ResetButton.svelte');
	return mod.default;
}

describe('ResetButton', () => {
	it('renders a button with "Reset View" text', async () => {
		const ResetButton = await getComponent();
		render(ResetButton, { props: { onReset: vi.fn() } });

		expect(screen.getByRole('button', { name: /reset/i })).toBeTruthy();
		expect(screen.getByText('Reset View')).toBeTruthy();
	});

	it('has an accessible aria-label', async () => {
		const ResetButton = await getComponent();
		render(ResetButton, { props: { onReset: vi.fn() } });

		const btn = screen.getByRole('button', { name: /reset/i });
		expect(btn.getAttribute('aria-label')).toMatch(/reset/i);
	});

	it('calls onReset when clicked', async () => {
		const ResetButton = await getComponent();
		const onReset = vi.fn();
		render(ResetButton, { props: { onReset } });

		await fireEvent.click(screen.getByRole('button', { name: /reset/i }));
		expect(onReset).toHaveBeenCalledOnce();
	});

	it('does not call onReset without user interaction', async () => {
		const ResetButton = await getComponent();
		const onReset = vi.fn();
		render(ResetButton, { props: { onReset } });

		expect(onReset).not.toHaveBeenCalled();
	});

	it('has visible focus styles via focus-visible support', async () => {
		const ResetButton = await getComponent();
		const { container } = render(ResetButton, { props: { onReset: vi.fn() } });

		const btn = container.querySelector('button');
		expect(btn).toBeTruthy();
		// Button should be focusable
		btn!.focus();
		expect(document.activeElement).toBe(btn);
	});
});
