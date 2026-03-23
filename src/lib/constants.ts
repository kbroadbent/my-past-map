import type { EventTypeConfig } from './types.js';

export const EVENT_TYPES: Record<string, EventTypeConfig> = {
	birth: { label: 'Birth', color: '#e8a84c', icon: 'star' },
	death: { label: 'Death', color: '#5a8f6a', icon: 'cross' },
	marriage: { label: 'Marriage', color: '#c75643', icon: 'ring' },
	burial: { label: 'Burial', color: '#7a6e5d', icon: 'circle' },
	immigration: { label: 'Immigration', color: '#4a7fb5', icon: 'arrow' },
	emigration: { label: 'Emigration', color: '#6b4e9b', icon: 'arrow' },
	military: { label: 'Military', color: '#8b4513', icon: 'shield' },
	christening: { label: 'Christening', color: '#d4a574', icon: 'star' },
	census: { label: 'Census', color: '#708090', icon: 'circle' },
	residence: { label: 'Residence', color: '#2e8b57', icon: 'circle' },
	other: { label: 'Other', color: '#999999', icon: 'circle' }
};

export const MAX_GENERATIONS = 12;
export const DEFAULT_GENERATIONS = 5;

export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const GEOCODE_CONCURRENCY = 5;
export const GEOCODE_BATCH_SIZE = 50;
