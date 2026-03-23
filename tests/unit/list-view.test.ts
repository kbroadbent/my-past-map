import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

const samplePeople = [
	{
		id: '@I1@',
		name: 'John Smith',
		givenName: 'John',
		surname: 'Smith',
		sex: 'M' as const,
		birthDate: '1 JAN 1980',
		generation: 0
	},
	{
		id: '@I2@',
		name: 'Jane Doe',
		givenName: 'Jane',
		surname: 'Doe',
		sex: 'F' as const,
		birthDate: '15 MAR 1955',
		generation: 1
	},
	{
		id: '@I3@',
		name: 'Robert Johnson',
		givenName: 'Robert',
		surname: 'Johnson',
		sex: 'M' as const,
		birthDate: '22 JUL 1920',
		generation: 2
	},
	{
		id: '@I4@',
		name: 'Mary Williams',
		givenName: 'Mary',
		surname: 'Williams',
		sex: 'F' as const,
		generation: 1
	}
];

const sampleEvents = [
	{ id: 'E1', personId: '@I1@', type: 'birth', year: 1980, place: 'London' },
	{ id: 'E2', personId: '@I2@', type: 'birth', year: 1955, place: 'Paris' },
	{ id: 'E3', personId: '@I3@', type: 'birth', year: 1920, place: 'Dublin' }
];

describe('ListView component', () => {
	async function importAndRender(props = {}) {
		const { default: ListView } = await import('$lib/components/ListView.svelte');
		return render(ListView, {
			props: {
				people: samplePeople,
				events: sampleEvents,
				...props
			}
		});
	}

	describe('table structure', () => {
		it('renders a table element with proper role', async () => {
			await importAndRender();
			const table = screen.getByRole('table');
			expect(table).toBeDefined();
		});

		it('renders column headers for name, generation, and birth year', async () => {
			await importAndRender();
			expect(screen.getByRole('columnheader', { name: /name/i })).toBeDefined();
			expect(screen.getByRole('columnheader', { name: /generation/i })).toBeDefined();
			expect(screen.getByRole('columnheader', { name: /birth year/i })).toBeDefined();
		});

		it('renders a row for each person', async () => {
			await importAndRender();
			const rows = screen.getAllByRole('row');
			// 1 header row + 4 data rows
			expect(rows.length).toBe(5);
		});

		it('displays person name in each row', async () => {
			await importAndRender();
			expect(screen.getByText('John Smith')).toBeDefined();
			expect(screen.getByText('Jane Doe')).toBeDefined();
			expect(screen.getByText('Robert Johnson')).toBeDefined();
			expect(screen.getByText('Mary Williams')).toBeDefined();
		});

		it('displays generation number for each person', async () => {
			await importAndRender();
			const rows = screen.getAllByRole('row');
			// Check that generation values appear in data rows
			const cells = screen.getAllByRole('cell');
			const cellTexts = cells.map((c) => c.textContent);
			expect(cellTexts).toContain('0');
			expect(cellTexts).toContain('1');
			expect(cellTexts).toContain('2');
		});

		it('displays birth year derived from events', async () => {
			await importAndRender();
			const cells = screen.getAllByRole('cell');
			const cellTexts = cells.map((c) => c.textContent);
			expect(cellTexts).toContain('1980');
			expect(cellTexts).toContain('1955');
			expect(cellTexts).toContain('1920');
		});

		it('displays dash or empty for person with no birth event', async () => {
			await importAndRender();
			// Mary Williams (@I4@) has no birth event
			const rows = screen.getAllByRole('row');
			const maryRow = rows.find((r) => r.textContent?.includes('Mary Williams'));
			expect(maryRow).toBeDefined();
			// Birth year cell should contain a dash or be empty
			const cells = maryRow!.querySelectorAll('td');
			const birthYearCell = cells[cells.length - 1];
			expect(birthYearCell.textContent?.trim()).toMatch(/^(-|—|)$/);
		});
	});

	describe('empty state', () => {
		it('shows empty message when people array is empty', async () => {
			await importAndRender({ people: [], events: [] });
			expect(screen.queryByRole('table')).toBeNull();
			expect(screen.getByText(/no people/i)).toBeDefined();
		});
	});

	describe('sorting by name', () => {
		it('sorts ascending by name when name header is clicked', async () => {
			const user = userEvent.setup();
			await importAndRender();

			const nameHeader = screen.getByRole('columnheader', { name: /name/i });
			await user.click(nameHeader);

			const rows = screen.getAllByRole('row').slice(1); // skip header
			const names = rows.map((r) => r.querySelectorAll('td')[0]?.textContent?.trim());
			expect(names).toEqual(['Jane Doe', 'John Smith', 'Mary Williams', 'Robert Johnson']);
		});

		it('sorts descending by name when name header is clicked twice', async () => {
			const user = userEvent.setup();
			await importAndRender();

			const nameHeader = screen.getByRole('columnheader', { name: /name/i });
			await user.click(nameHeader);
			await user.click(nameHeader);

			const rows = screen.getAllByRole('row').slice(1);
			const names = rows.map((r) => r.querySelectorAll('td')[0]?.textContent?.trim());
			expect(names).toEqual(['Robert Johnson', 'Mary Williams', 'John Smith', 'Jane Doe']);
		});
	});

	describe('sorting by generation', () => {
		it('sorts ascending by generation when generation header is clicked', async () => {
			const user = userEvent.setup();
			await importAndRender();

			const genHeader = screen.getByRole('columnheader', { name: /generation/i });
			await user.click(genHeader);

			const rows = screen.getAllByRole('row').slice(1);
			const gens = rows.map((r) => r.querySelectorAll('td')[1]?.textContent?.trim());
			expect(gens).toEqual(['0', '1', '1', '2']);
		});

		it('sorts descending by generation when generation header is clicked twice', async () => {
			const user = userEvent.setup();
			await importAndRender();

			const genHeader = screen.getByRole('columnheader', { name: /generation/i });
			await user.click(genHeader);
			await user.click(genHeader);

			const rows = screen.getAllByRole('row').slice(1);
			const gens = rows.map((r) => r.querySelectorAll('td')[1]?.textContent?.trim());
			expect(gens).toEqual(['2', '1', '1', '0']);
		});
	});

	describe('sorting by birth year', () => {
		it('sorts ascending by birth year when birth year header is clicked', async () => {
			const user = userEvent.setup();
			await importAndRender();

			const yearHeader = screen.getByRole('columnheader', { name: /birth year/i });
			await user.click(yearHeader);

			const rows = screen.getAllByRole('row').slice(1);
			const years = rows.map((r) => {
				const cells = r.querySelectorAll('td');
				return cells[cells.length - 1]?.textContent?.trim();
			});
			// People without birth year sorted to end
			expect(years[0]).toBe('1920');
			expect(years[1]).toBe('1955');
			expect(years[2]).toBe('1980');
		});

		it('sorts descending by birth year when birth year header is clicked twice', async () => {
			const user = userEvent.setup();
			await importAndRender();

			const yearHeader = screen.getByRole('columnheader', { name: /birth year/i });
			await user.click(yearHeader);
			await user.click(yearHeader);

			const rows = screen.getAllByRole('row').slice(1);
			const years = rows.map((r) => {
				const cells = r.querySelectorAll('td');
				return cells[cells.length - 1]?.textContent?.trim();
			});
			expect(years[0]).toBe('1980');
			expect(years[1]).toBe('1955');
			expect(years[2]).toBe('1920');
		});
	});

	describe('accessibility', () => {
		it('column headers have aria-sort attribute', async () => {
			await importAndRender();
			const headers = screen.getAllByRole('columnheader');
			headers.forEach((header) => {
				expect(header.getAttribute('aria-sort')).toBeDefined();
			});
		});

		it('updates aria-sort to ascending on active sort column', async () => {
			const user = userEvent.setup();
			await importAndRender();

			const nameHeader = screen.getByRole('columnheader', { name: /name/i });
			await user.click(nameHeader);

			expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
		});

		it('updates aria-sort to descending on second click', async () => {
			const user = userEvent.setup();
			await importAndRender();

			const nameHeader = screen.getByRole('columnheader', { name: /name/i });
			await user.click(nameHeader);
			await user.click(nameHeader);

			expect(nameHeader.getAttribute('aria-sort')).toBe('descending');
		});

		it('column headers are clickable buttons for keyboard accessibility', async () => {
			await importAndRender();
			const headers = screen.getAllByRole('columnheader');
			headers.forEach((header) => {
				const button = header.querySelector('button');
				expect(button).not.toBeNull();
			});
		});
	});
});
