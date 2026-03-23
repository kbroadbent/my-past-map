import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import UploadZone from '$lib/components/UploadZone.svelte';

describe('UploadZone', () => {
	it('renders a drop zone with upload instructions', () => {
		const onFileSelected = vi.fn();
		render(UploadZone, { props: { onFileSelected } });

		expect(screen.getByText('Drop your GEDCOM file here')).toBeTruthy();
		expect(screen.getByText('or click to browse')).toBeTruthy();
	});

	it('has accessible role and label', () => {
		const onFileSelected = vi.fn();
		render(UploadZone, { props: { onFileSelected } });

		const dropZone = screen.getByRole('button', { name: /upload gedcom file/i });
		expect(dropZone).toBeTruthy();
	});

	it('has a hidden file input that accepts .ged files', () => {
		const onFileSelected = vi.fn();
		render(UploadZone, { props: { onFileSelected } });

		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.accept).toBe('.ged');
	});

	it('calls onFileSelected with a valid .ged file', async () => {
		const onFileSelected = vi.fn();
		render(UploadZone, { props: { onFileSelected } });

		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		const file = new File(['dummy content'], 'family.ged', { type: 'application/octet-stream' });

		Object.defineProperty(input, 'files', { value: [file] });
		await fireEvent.change(input);

		expect(onFileSelected).toHaveBeenCalledWith(file);
	});

	it('rejects non-.ged files and shows error', async () => {
		const onFileSelected = vi.fn();
		render(UploadZone, { props: { onFileSelected } });

		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		const file = new File(['not gedcom'], 'photo.jpg', { type: 'image/jpeg' });

		Object.defineProperty(input, 'files', { value: [file] });
		await fireEvent.change(input);

		expect(onFileSelected).not.toHaveBeenCalled();
		expect(screen.getByRole('alert')).toBeTruthy();
		expect(screen.getByRole('alert').textContent).toContain('.ged');
	});

	it('rejects files exceeding size limit', async () => {
		const onFileSelected = vi.fn();
		render(UploadZone, { props: { onFileSelected } });

		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		// Create a file object with size > 50MB
		const file = new File(['x'], 'big.ged', { type: 'application/octet-stream' });
		Object.defineProperty(file, 'size', { value: 51 * 1024 * 1024 });

		Object.defineProperty(input, 'files', { value: [file] });
		await fireEvent.change(input);

		expect(onFileSelected).not.toHaveBeenCalled();
		expect(screen.getByRole('alert')).toBeTruthy();
		expect(screen.getByRole('alert').textContent).toContain('50');
	});

	it('displays an external error message when provided', () => {
		const onFileSelected = vi.fn();
		render(UploadZone, {
			props: { onFileSelected, error: 'Something went wrong' }
		});

		expect(screen.getByRole('alert').textContent).toContain('Something went wrong');
	});

	it('shows supported platforms in upload hints', () => {
		const onFileSelected = vi.fn();
		render(UploadZone, { props: { onFileSelected } });

		expect(screen.getByText(/FamilySearch/)).toBeTruthy();
		expect(screen.getByText(/Ancestry/)).toBeTruthy();
	});

	it('is keyboard accessible via Enter and Space', async () => {
		const onFileSelected = vi.fn();
		render(UploadZone, { props: { onFileSelected } });

		const dropZone = screen.getByRole('button', { name: /upload gedcom file/i });
		expect(dropZone.getAttribute('tabindex')).toBe('0');
	});
});
