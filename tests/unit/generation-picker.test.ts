import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import GenerationPicker from '$lib/components/GenerationPicker.svelte';

describe('GenerationPicker', () => {
	it('displays the total people count', () => {
		const onConfirm = vi.fn();
		render(GenerationPicker, { props: { totalPeople: 142, onConfirm } });

		expect(screen.getByText(/142/)).toBeTruthy();
	});

	it('shows a heading asking about generations', () => {
		const onConfirm = vi.fn();
		render(GenerationPicker, { props: { totalPeople: 50, onConfirm } });

		expect(screen.getByRole('heading', { name: /generations/i })).toBeTruthy();
	});

	it('has a range slider with min=1 and max=12', () => {
		const onConfirm = vi.fn();
		render(GenerationPicker, { props: { totalPeople: 50, onConfirm } });

		const slider = screen.getByRole('slider') as HTMLInputElement;
		expect(slider).toBeTruthy();
		expect(slider.min).toBe('1');
		expect(slider.max).toBe('12');
	});

	it('defaults the slider to 5 generations', () => {
		const onConfirm = vi.fn();
		render(GenerationPicker, { props: { totalPeople: 50, onConfirm } });

		const slider = screen.getByRole('slider') as HTMLInputElement;
		expect(slider.value).toBe('5');
	});

	it('has a confirm button labeled "Show on Map"', () => {
		const onConfirm = vi.fn();
		render(GenerationPicker, { props: { totalPeople: 50, onConfirm } });

		expect(screen.getByRole('button', { name: /show on map/i })).toBeTruthy();
	});

	it('calls onConfirm with the selected generation count when button clicked', async () => {
		const onConfirm = vi.fn();
		render(GenerationPicker, { props: { totalPeople: 50, onConfirm } });

		const button = screen.getByRole('button', { name: /show on map/i });
		await fireEvent.click(button);

		// Default is 5 generations
		expect(onConfirm).toHaveBeenCalledWith(5);
	});

	it('shows sparsity warning when generations >= 8', async () => {
		const onConfirm = vi.fn();
		render(GenerationPicker, { props: { totalPeople: 50, onConfirm } });

		const slider = screen.getByRole('slider') as HTMLInputElement;
		await fireEvent.input(slider, { target: { value: '8' } });

		expect(screen.getByText(/sparse/i)).toBeTruthy();
	});

	it('does not show sparsity warning when generations < 8', () => {
		const onConfirm = vi.fn();
		render(GenerationPicker, { props: { totalPeople: 50, onConfirm } });

		expect(screen.queryByText(/sparse/i)).toBeNull();
	});

	it('has accessible slider with aria-valuetext', () => {
		const onConfirm = vi.fn();
		render(GenerationPicker, { props: { totalPeople: 50, onConfirm } });

		const slider = screen.getByRole('slider');
		expect(slider.getAttribute('aria-valuetext')).toContain('generations');
	});
});
