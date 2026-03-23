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

describe('Return visit and data management', () => {
	describe('+page.svelte return visit flow', () => {
		it('checks IndexedDB for existing data on load', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain('hasData');
		});

		it('has a returning phase for cached data', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain("phase === 'returning'");
		});

		it('imports hasData from db module', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain('hasData');
			expect(page).toContain('$lib/db');
		});

		it('imports getCachedTreeSummary from db module', () => {
			const page = readFile('src/routes/+page.svelte');
			expect(page).toContain('getCachedTreeSummary');
		});

		it('offers option to reload cached tree', () => {
			const page = readFile('src/routes/+page.svelte');
			// Should have a button/action to load existing data
			expect(page).toMatch(/load.*previous|continue.*tree|reload.*data|use.*cached/i);
		});

		it('offers option to upload new file instead', () => {
			const page = readFile('src/routes/+page.svelte');
			// Should have a button/action to start fresh
			expect(page).toMatch(/upload.*new|start.*fresh|new.*file/i);
		});

		it('shows summary of cached data when returning', () => {
			const page = readFile('src/routes/+page.svelte');
			// Should display person count or tree summary
			expect(page).toContain('personCount');
		});
	});

	describe('DataManager component', () => {
		it('has DataManager component file', () => {
			expect(fileExists('src/lib/components/DataManager.svelte')).toBe(true);
		});

		it('has a delete data button', () => {
			expect(fileExists('src/lib/components/DataManager.svelte')).toBe(true);
			const component = readFile('src/lib/components/DataManager.svelte');
			expect(component).toMatch(/delete|clear|remove/i);
			expect(component).toMatch(/button/i);
		});

		it('imports clearAll from db module', () => {
			expect(fileExists('src/lib/components/DataManager.svelte')).toBe(true);
			const component = readFile('src/lib/components/DataManager.svelte');
			expect(component).toContain('clearAll');
		});

		it('has confirmation before deleting data', () => {
			expect(fileExists('src/lib/components/DataManager.svelte')).toBe(true);
			const component = readFile('src/lib/components/DataManager.svelte');
			// Should have a confirm step to prevent accidental deletion
			expect(component).toMatch(/confirm|are you sure|warning/i);
		});

		it('is accessible with proper button role', () => {
			expect(fileExists('src/lib/components/DataManager.svelte')).toBe(true);
			const component = readFile('src/lib/components/DataManager.svelte');
			expect(component).toContain('button');
		});
	});

	describe('db module exports', () => {
		it('exports hasData function', () => {
			const dbModule = readFile('src/lib/db.ts');
			expect(dbModule).toContain('export');
			expect(dbModule).toContain('hasData');
		});

		it('exports clearAll function', () => {
			const dbModule = readFile('src/lib/db.ts');
			expect(dbModule).toContain('export');
			expect(dbModule).toContain('clearAll');
		});

		it('exports getCachedTreeSummary function', () => {
			const dbModule = readFile('src/lib/db.ts');
			expect(dbModule).toContain('export');
			expect(dbModule).toContain('getCachedTreeSummary');
		});
	});
});
