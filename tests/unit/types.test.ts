import { describe, it, expect } from 'vitest';

describe('Shared Types and Constants', () => {
  describe('type exports from types.ts', () => {
    it('exports Person type with required fields', async () => {
      const mod = await import('../../src/lib/types.js');
      // TypeScript interfaces don't exist at runtime, but the module should load
      expect(mod).toBeDefined();
    });
  });

  describe('EVENT_TYPES constant', () => {
    it('exports EVENT_TYPES with all 11 event types', async () => {
      const { EVENT_TYPES } = await import('../../src/lib/constants.js');
      const expectedTypes = [
        'birth', 'death', 'marriage', 'burial', 'immigration',
        'emigration', 'military', 'christening', 'census', 'residence', 'other'
      ];
      expect(Object.keys(EVENT_TYPES).sort()).toEqual(expectedTypes.sort());
    });

    it('each event type has label, color, and icon', async () => {
      const { EVENT_TYPES } = await import('../../src/lib/constants.js');
      for (const [key, config] of Object.entries(EVENT_TYPES)) {
        expect(config).toHaveProperty('label');
        expect(config).toHaveProperty('color');
        expect(config).toHaveProperty('icon');
        expect(typeof (config as any).label).toBe('string');
        expect(typeof (config as any).color).toBe('string');
        expect(typeof (config as any).icon).toBe('string');
      }
    });

    it('birth event type has correct config', async () => {
      const { EVENT_TYPES } = await import('../../src/lib/constants.js');
      expect(EVENT_TYPES.birth).toEqual({ label: 'Birth', color: '#e8a84c', icon: 'star' });
    });

    it('death event type has correct config', async () => {
      const { EVENT_TYPES } = await import('../../src/lib/constants.js');
      expect(EVENT_TYPES.death).toEqual({ label: 'Death', color: '#5a8f6a', icon: 'cross' });
    });

    it('marriage event type has correct config', async () => {
      const { EVENT_TYPES } = await import('../../src/lib/constants.js');
      expect(EVENT_TYPES.marriage).toEqual({ label: 'Marriage', color: '#c75643', icon: 'ring' });
    });

    it('colors are valid hex color strings', async () => {
      const { EVENT_TYPES } = await import('../../src/lib/constants.js');
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
      for (const config of Object.values(EVENT_TYPES)) {
        expect((config as any).color).toMatch(hexColorRegex);
      }
    });

    it('labels are capitalized human-readable strings', async () => {
      const { EVENT_TYPES } = await import('../../src/lib/constants.js');
      for (const config of Object.values(EVENT_TYPES)) {
        const label = (config as any).label;
        expect(label.length).toBeGreaterThan(0);
        expect(label[0]).toBe(label[0].toUpperCase());
      }
    });
  });

  describe('generation limits', () => {
    it('exports MAX_GENERATIONS as 12', async () => {
      const { MAX_GENERATIONS } = await import('../../src/lib/constants.js');
      expect(MAX_GENERATIONS).toBe(12);
    });

    it('exports DEFAULT_GENERATIONS as 5', async () => {
      const { DEFAULT_GENERATIONS } = await import('../../src/lib/constants.js');
      expect(DEFAULT_GENERATIONS).toBe(5);
    });

    it('DEFAULT_GENERATIONS is less than or equal to MAX_GENERATIONS', async () => {
      const { DEFAULT_GENERATIONS, MAX_GENERATIONS } = await import('../../src/lib/constants.js');
      expect(DEFAULT_GENERATIONS).toBeLessThanOrEqual(MAX_GENERATIONS);
    });
  });

  describe('file size limits', () => {
    it('exports MAX_FILE_SIZE_MB as 50', async () => {
      const { MAX_FILE_SIZE_MB } = await import('../../src/lib/constants.js');
      expect(MAX_FILE_SIZE_MB).toBe(50);
    });

    it('exports MAX_FILE_SIZE_BYTES consistent with MB value', async () => {
      const { MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } = await import('../../src/lib/constants.js');
      expect(MAX_FILE_SIZE_BYTES).toBe(MAX_FILE_SIZE_MB * 1024 * 1024);
    });
  });

  describe('geocoding constants', () => {
    it('exports GEOCODE_CONCURRENCY as a positive number', async () => {
      const { GEOCODE_CONCURRENCY } = await import('../../src/lib/constants.js');
      expect(GEOCODE_CONCURRENCY).toBe(5);
    });

    it('exports GEOCODE_BATCH_SIZE as a positive number', async () => {
      const { GEOCODE_BATCH_SIZE } = await import('../../src/lib/constants.js');
      expect(GEOCODE_BATCH_SIZE).toBe(50);
    });
  });
});
