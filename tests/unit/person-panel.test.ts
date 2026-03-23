import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PersonPanel from '$lib/components/PersonPanel.svelte';
import { getTree } from '$lib/stores/tree.svelte';

const sampleTreeData = {
	people: [
		{ id: '@I1@', name: 'John Smith', givenName: 'John', surname: 'Smith', sex: 'M' as const, birthDate: '1 Jan 1980', generation: 0 },
		{ id: '@I2@', name: 'Jane Doe', givenName: 'Jane', surname: 'Doe', sex: 'F' as const, birthDate: '15 Mar 1982', generation: 0 },
		{ id: '@I3@', name: 'Robert Smith', givenName: 'Robert', surname: 'Smith', sex: 'M' as const, birthDate: '5 Jun 1950', generation: 1 },
		{ id: '@I4@', name: 'Mary Johnson', givenName: 'Mary', surname: 'Johnson', sex: 'F' as const, birthDate: '20 Sep 1952', generation: 1 },
		{ id: '@I5@', name: 'Alice Smith', givenName: 'Alice', surname: 'Smith', sex: 'F' as const, generation: 0 },
		{ id: '@I6@', name: 'William Smith', givenName: 'William', surname: 'Smith', sex: 'M' as const, generation: 2 }
	],
	events: [
		{ id: 'E1', personId: '@I1@', type: 'birth', date: '1 Jan 1980', year: 1980, place: 'London, England' },
		{ id: 'E2', personId: '@I1@', type: 'marriage', date: '15 Jun 2005', year: 2005, place: 'Paris, France' },
		{ id: 'E3', personId: '@I1@', type: 'residence', date: '2010', year: 2010, place: 'New York, USA' },
		{ id: 'E4', personId: '@I3@', type: 'birth', date: '5 Jun 1950', year: 1950, place: 'Berlin, Germany' },
		{ id: 'E5', personId: '@I3@', type: 'death', date: '12 Nov 2020', year: 2020, place: 'London, England' },
		{ id: 'E6', personId: '@I4@', type: 'birth', date: '20 Sep 1952', year: 1952 },
		{ id: 'E7', personId: '@I6@', type: 'birth', year: 1920, place: 'Dublin, Ireland' }
	],
	families: [
		{ id: '@F1@', husbandId: '@I3@', wifeId: '@I4@', childIds: ['@I1@', '@I5@'] },
		{ id: '@F2@', husbandId: '@I1@', wifeId: '@I2@', childIds: [] }
	]
};

function setupTree() {
	const tree = getTree();
	tree.load(sampleTreeData);
	return tree;
}

describe('PersonPanel', () => {
	let onClose: ReturnType<typeof vi.fn>;
	let onNavigate: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		onClose = vi.fn();
		onNavigate = vi.fn();
		setupTree();
	});

	describe('rendering', () => {
		it('renders nothing when personId is null', () => {
			const { container } = render(PersonPanel, {
				props: { personId: null, onClose, onNavigate }
			});
			expect(container.querySelector('aside')).toBeNull();
		});

		it('displays person name in the header', () => {
			const { getByText } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			expect(getByText('John Smith')).toBeTruthy();
		});

		it('displays generation number', () => {
			const { getByText } = render(PersonPanel, {
				props: { personId: '@I3@', onClose, onNavigate }
			});
			expect(getByText(/Generation 1/)).toBeTruthy();
		});

		it('uses an aside element for the panel', () => {
			const { container } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			expect(container.querySelector('aside')).not.toBeNull();
		});
	});

	describe('life events', () => {
		it('displays all life events for the person', () => {
			const { getByText } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			expect(getByText(/Birth/)).toBeTruthy();
			expect(getByText(/Marriage/)).toBeTruthy();
			expect(getByText(/Residence/)).toBeTruthy();
		});

		it('shows event dates', () => {
			const { getByText } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			expect(getByText(/1 Jan 1980/)).toBeTruthy();
			expect(getByText(/15 Jun 2005/)).toBeTruthy();
		});

		it('shows event places', () => {
			const { getByText } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			expect(getByText(/London, England/)).toBeTruthy();
			expect(getByText(/Paris, France/)).toBeTruthy();
		});

		it('displays events sorted chronologically by year', () => {
			const { container } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			const eventElements = container.querySelectorAll('[data-testid^="event-"]');
			const years = Array.from(eventElements).map(
				(el) => Number(el.getAttribute('data-year'))
			);
			expect(years).toEqual([...years].sort((a, b) => a - b));
			expect(years.length).toBe(3);
		});

		it('handles person with no events', () => {
			const { container, queryByText } = render(PersonPanel, {
				props: { personId: '@I5@', onClose, onNavigate }
			});
			expect(container.querySelector('aside')).not.toBeNull();
			expect(queryByText('Alice Smith')).toBeTruthy();
		});

		it('shows event without a place gracefully', () => {
			const { getByText } = render(PersonPanel, {
				props: { personId: '@I4@', onClose, onNavigate }
			});
			// Mary Johnson has a birth event with no place
			expect(getByText(/Birth/)).toBeTruthy();
		});
	});

	describe('family navigation', () => {
		it('shows parent links when person has parents', () => {
			const { getByText } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			// John Smith's parents are Robert Smith and Mary Johnson (family @F1@)
			expect(getByText('Robert Smith')).toBeTruthy();
			expect(getByText('Mary Johnson')).toBeTruthy();
		});

		it('calls onNavigate when a parent link is clicked', async () => {
			const { getByText } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			await fireEvent.click(getByText('Robert Smith'));
			expect(onNavigate).toHaveBeenCalledWith('@I3@');
		});

		it('shows spouse links when person has a spouse', () => {
			const { getByText } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			// John Smith is married to Jane Doe (family @F2@)
			expect(getByText('Jane Doe')).toBeTruthy();
		});

		it('calls onNavigate when a spouse link is clicked', async () => {
			const { getByText } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			await fireEvent.click(getByText('Jane Doe'));
			expect(onNavigate).toHaveBeenCalledWith('@I2@');
		});

		it('shows children links when person has children', () => {
			const { getByText } = render(PersonPanel, {
				props: { personId: '@I3@', onClose, onNavigate }
			});
			// Robert Smith's children are John Smith and Alice Smith
			expect(getByText('John Smith')).toBeTruthy();
			expect(getByText('Alice Smith')).toBeTruthy();
		});

		it('calls onNavigate when a child link is clicked', async () => {
			const { getByText } = render(PersonPanel, {
				props: { personId: '@I3@', onClose, onNavigate }
			});
			await fireEvent.click(getByText('John Smith'));
			expect(onNavigate).toHaveBeenCalledWith('@I1@');
		});

		it('does not show parents section when person has no parent family', () => {
			const { queryByText } = render(PersonPanel, {
				props: { personId: '@I6@', onClose, onNavigate }
			});
			// William Smith has no parent family
			expect(queryByText(/Parents/i)).toBeNull();
		});

		it('does not show spouse section when person has no spouse family', () => {
			const { queryByText } = render(PersonPanel, {
				props: { personId: '@I6@', onClose, onNavigate }
			});
			expect(queryByText(/Spouse/i)).toBeNull();
		});
	});

	describe('close behavior', () => {
		it('has a close button with aria-label', () => {
			const { container } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			const closeBtn = container.querySelector('button[aria-label="Close panel"]');
			expect(closeBtn).not.toBeNull();
		});

		it('calls onClose when close button is clicked', async () => {
			const { container } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			const closeBtn = container.querySelector('button[aria-label="Close panel"]')!;
			await fireEvent.click(closeBtn);
			expect(onClose).toHaveBeenCalledOnce();
		});

		it('calls onClose when Escape key is pressed', async () => {
			const { container } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			const aside = container.querySelector('aside')!;
			await fireEvent.keyDown(aside, { key: 'Escape' });
			expect(onClose).toHaveBeenCalledOnce();
		});
	});

	describe('focus management', () => {
		it('panel receives focus when opened', () => {
			const { container } = render(PersonPanel, {
				props: { personId: '@I1@', onClose, onNavigate }
			});
			const aside = container.querySelector('aside');
			expect(aside).not.toBeNull();
			expect(aside!.getAttribute('tabindex')).toBe('-1');
		});
	});
});
