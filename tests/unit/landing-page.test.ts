import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readFile(relativePath: string): string {
	return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

function fileExists(relativePath: string): boolean {
	return existsSync(resolve(ROOT, relativePath));
}

describe('Landing page structure', () => {
	describe('Component files exist', () => {
		it('has UploadZone component', () => {
			expect(fileExists('src/lib/components/UploadZone.svelte')).toBe(true);
		});

		it('has ParseProgress component', () => {
			expect(fileExists('src/lib/components/ParseProgress.svelte')).toBe(true);
		});

		it('has GenerationPicker component', () => {
			expect(fileExists('src/lib/components/GenerationPicker.svelte')).toBe(true);
		});
	});

	describe('+page.svelte landing page', () => {
		it('imports UploadZone component', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain("import UploadZone from '$lib/components/UploadZone.svelte'");
		});

		it('imports ParseProgress component', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain("import ParseProgress from '$lib/components/ParseProgress.svelte'");
		});

		it('imports GenerationPicker component', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain("import GenerationPicker from '$lib/components/GenerationPicker.svelte'");
		});

		it('has a hero section with tagline', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain('ancestors');
		});

		it('has phase-based rendering with upload phase', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain("phase === 'upload'");
		});

		it('has phase-based rendering with parsing phase', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain("phase === 'parsing'");
		});

		it('has phase-based rendering with generation picker phase', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain("phase === 'pickGen'");
		});

		it('has trust badges for privacy and accessibility', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain('Your data stays');
			expect(page).toContain('No account');
		});

		it('has export help section with platform instructions', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain('FamilySearch');
			expect(page).toContain('Ancestry');
			expect(page).toContain('MyHeritage');
			expect(page).toContain('Gramps');
		});

		it('applies Burnished Gold theme with landing class', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain('class="landing"');
		});

		it('uses parchment gradient background', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain('--color-parchment-light');
			expect(page).toContain('--color-parchment-dark');
		});

		it('retains main-content id for skip link', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain('id="main-content"');
		});
	});
});
