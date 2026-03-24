import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Tests for wiring everything together on the map page.
 *
 * Task 13 integrates:
 * - EventFilters (already present)
 * - TimelineScrubber (new)
 * - PersonPanel (new — opens on marker click)
 * - ResetButton (new — resets filters, timeline, and map view)
 * - Combined Mapbox filter expressions (year + type)
 *
 * These are structural/integration tests verifying the map page
 * imports and wires all components correctly.
 */

const mapPagePath = resolve(__dirname, '../../src/routes/map/+page.svelte');
const resetButtonPath = resolve(__dirname, '../../src/lib/components/ResetButton.svelte');

function readMapPage(): string {
	return readFileSync(mapPagePath, 'utf-8');
}

describe('Map page component wiring', () => {
	describe('TimelineScrubber integration', () => {
		it('imports TimelineScrubber component', () => {
			const content = readMapPage();
			expect(content).toContain('TimelineScrubber');
		});

		it('imports or uses the timeline store', () => {
			const content = readMapPage();
			expect(content).toMatch(/timeline|getTimeline/);
		});

		it('renders TimelineScrubber in the template', () => {
			const content = readMapPage();
			// Should have <TimelineScrubber in the template section
			const templateSection = content.split('</script>').slice(1).join('');
			expect(templateSection).toContain('TimelineScrubber');
		});

		it('wires onYearChange from TimelineScrubber to update the map filter', () => {
			const content = readMapPage();
			// Should have a handler that responds to year changes
			expect(content).toMatch(/onYearChange|yearChange|handleYearChange/i);
		});
	});

	describe('PersonPanel integration', () => {
		it('imports PersonPanel component', () => {
			const content = readMapPage();
			expect(content).toContain('PersonPanel');
		});

		it('renders PersonPanel in the template', () => {
			const content = readMapPage();
			const templateSection = content.split('</script>').slice(1).join('');
			expect(templateSection).toContain('PersonPanel');
		});

		it('tracks selected person state for the panel', () => {
			const content = readMapPage();
			// Should have state for tracking which person is selected
			expect(content).toMatch(/selectedPerson|activePerson|personId/);
		});

		it('wires onMarkerClick to open PersonPanel with the clicked person', () => {
			const content = readMapPage();
			// onMarkerClick should set a person ID (not be an empty stub)
			const onMarkerClickMatch = content.match(/function\s+onMarkerClick[\s\S]*?\{([\s\S]*?)\}/);
			expect(onMarkerClickMatch).not.toBeNull();
			// The body should not be empty or just a comment
			const body = onMarkerClickMatch![1].replace(/\/\/.*$/gm, '').trim();
			expect(body.length).toBeGreaterThan(0);
		});

		it('wires PersonPanel onClose to clear the selected person', () => {
			const content = readMapPage();
			// Should have a close handler that clears the selected person
			expect(content).toMatch(/onClose|handleClose|closePanel/);
		});

		it('wires PersonPanel onNavigate to change selected person', () => {
			const content = readMapPage();
			// Should have a navigate handler
			expect(content).toMatch(/onNavigate|handleNavigate/);
		});
	});

	describe('ResetButton integration', () => {
		it('ResetButton component file exists', () => {
			const { existsSync } = require('fs');
			expect(existsSync(resetButtonPath)).toBe(true);
		});

		it('imports ResetButton component', () => {
			const content = readMapPage();
			expect(content).toContain('ResetButton');
		});

		it('renders ResetButton in the template', () => {
			const content = readMapPage();
			const templateSection = content.split('</script>').slice(1).join('');
			expect(templateSection).toContain('ResetButton');
		});

		it('wires onReset to reset filters, timeline, and map view', () => {
			const content = readMapPage();
			// Should have a reset handler that touches filters AND timeline AND fitToData
			expect(content).toMatch(/onReset|handleReset/);
			// The reset handler should call enableAll or similar filter reset
			expect(content).toMatch(/enableAll|resetFilters/i);
			// The reset handler should reset the timeline
			expect(content).toMatch(/timeline.*reset|reset.*timeline/is);
			// The reset handler should re-fit the map
			expect(content).toContain('fitToData');
		});
	});

	describe('Combined filter expressions', () => {
		it('imports buildCombinedFilter from source.ts', () => {
			const content = readMapPage();
			expect(content).toContain('buildCombinedFilter');
		});

		it('applies combined filter when event type filters change', () => {
			const content = readMapPage();
			// handleFilterChange should use buildCombinedFilter, not just buildFilterExpression
			const handler = content.match(/function\s+handleFilterChange[\s\S]*?\{([\s\S]*?)\}/);
			if (handler) {
				expect(handler[1]).toMatch(/buildCombinedFilter|combined/i);
			} else {
				// If using a different name, the combined filter should still be used on filter change
				expect(content).toMatch(/buildCombinedFilter/);
			}
		});

		it('applies combined filter when timeline year changes', () => {
			const content = readMapPage();
			// Year change handler should also call setFilter with combined expression
			expect(content).toMatch(/setFilter/);
			// Should reference both year and active types when building filter
			expect(content).toMatch(/buildCombinedFilter/);
		});
	});

	describe('Full page layout', () => {
		it('map page has all five components in template', () => {
			const content = readMapPage();
			const templateSection = content.split('</script>').slice(1).join('');

			expect(templateSection).toContain('MapView');
			expect(templateSection).toContain('EventFilters');
			expect(templateSection).toContain('TimelineScrubber');
			expect(templateSection).toContain('PersonPanel');
			expect(templateSection).toContain('ResetButton');
		});

		it('maintains full-viewport layout', () => {
			const content = readMapPage();
			expect(content).toMatch(/100vw/);
			expect(content).toMatch(/100vh/);
		});
	});
});
