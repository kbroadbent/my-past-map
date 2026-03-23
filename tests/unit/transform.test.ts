import { describe, it, expect } from 'vitest';
import { readGedcom } from 'read-gedcom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// The module under test — does not exist yet, so import will fail (RED phase)
import { transformGedcom } from '$lib/gedcom/transform';

describe('transformGedcom', () => {
  const gedcomBuffer = readFileSync(resolve(__dirname, '../../test-fixtures/sample.ged'));
  const parsed = readGedcom(gedcomBuffer);

  describe('person extraction', () => {
    it('extracts all individuals from the GEDCOM file', () => {
      const result = transformGedcom(parsed, '@I5@');
      expect(result.people).toHaveLength(5);
    });

    it('extracts person name from NAME record', () => {
      const result = transformGedcom(parsed, '@I5@');
      const john = result.people.find((p: any) => p.id === '@I1@');
      expect(john?.name).toBe('John Smith');
    });

    it('extracts person gender from SEX record', () => {
      const result = transformGedcom(parsed, '@I5@');
      const mary = result.people.find((p: any) => p.id === '@I2@');
      expect(mary?.gender).toBe('F');
    });
  });

  describe('generation computation via BFS', () => {
    it('sets generation 0 for the root person', () => {
      const result = transformGedcom(parsed, '@I5@');
      const root = result.people.find((p: any) => p.id === '@I5@');
      expect(root?.generation).toBe(0);
    });

    it('sets correct generation for parents', () => {
      const result = transformGedcom(parsed, '@I5@');
      const father = result.people.find((p: any) => p.id === '@I1@');
      expect(father?.generation).toBe(1);
    });

    it('sets correct generation for grandparents', () => {
      const result = transformGedcom(parsed, '@I5@');
      const grandfather = result.people.find((p: any) => p.id === '@I3@');
      expect(grandfather?.generation).toBe(2);
    });

    it('assigns generation to both spouses in a family', () => {
      const result = transformGedcom(parsed, '@I5@');
      const mother = result.people.find((p: any) => p.id === '@I2@');
      const father = result.people.find((p: any) => p.id === '@I1@');
      expect(mother?.generation).toBe(father?.generation);
    });
  });

  describe('event extraction', () => {
    it('extracts birth events with dates and locations', () => {
      const result = transformGedcom(parsed, '@I5@');
      const birthEvents = result.events.filter((e: any) => e.type === 'birth');
      expect(birthEvents.length).toBeGreaterThanOrEqual(5);
      const johnBirth = birthEvents.find((e: any) => e.personId === '@I1@');
      expect(johnBirth?.date?.year).toBe(1950);
      expect(johnBirth?.locationText).toBe('Salt Lake City, Utah, USA');
    });

    it('extracts death events', () => {
      const result = transformGedcom(parsed, '@I5@');
      const deathEvents = result.events.filter((e: any) => e.type === 'death');
      expect(deathEvents.length).toBeGreaterThanOrEqual(2);
    });

    it('extracts immigration events', () => {
      const result = transformGedcom(parsed, '@I5@');
      const immigrationEvents = result.events.filter((e: any) => e.type === 'immigration');
      expect(immigrationEvents).toHaveLength(1);
      expect(immigrationEvents[0].personId).toBe('@I4@');
      expect(immigrationEvents[0].date?.year).toBe(1946);
    });

    it('assigns unique ids to events', () => {
      const result = transformGedcom(parsed, '@I5@');
      const ids = result.events.map((e: any) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('family extraction', () => {
    it('extracts families with spouse and child links', () => {
      const result = transformGedcom(parsed, '@I5@');
      const f1 = result.families.find((f: any) => f.id === '@F1@');
      expect(f1?.spouse1Id).toBe('@I1@');
      expect(f1?.spouse2Id).toBe('@I2@');
      expect(f1?.childIds).toContain('@I5@');
    });

    it('extracts all families from the GEDCOM file', () => {
      const result = transformGedcom(parsed, '@I5@');
      expect(result.families).toHaveLength(2);
    });
  });

  describe('timeline index', () => {
    it('builds a time-sorted index', () => {
      const result = transformGedcom(parsed, '@I5@');
      const years = result.index.sortedEvents.map((e: any) => e.year);
      for (let i = 1; i < years.length; i++) {
        expect(years[i]).toBeGreaterThanOrEqual(years[i - 1]);
      }
    });

    it('builds generation boundaries', () => {
      const result = transformGedcom(parsed, '@I5@');
      const gen0 = result.index.generationBoundaries.get(0);
      expect(gen0).toBeDefined();
      expect(gen0!.minYear).toBe(1980);
    });

    it('only includes events with valid years in sorted index', () => {
      const result = transformGedcom(parsed, '@I5@');
      for (const event of result.index.sortedEvents) {
        expect(typeof event.year).toBe('number');
        expect(event.year).toBeGreaterThan(0);
      }
    });
  });
});
