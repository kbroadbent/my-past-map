import { describe, it, expect } from 'vitest';
import { getTimeline } from '$lib/stores/timeline.svelte';

describe('timeline store', () => {
	it('initializes with playback stopped', () => {
		const timeline = getTimeline();
		expect(timeline.isPlaying).toBe(false);
	});

	it('initializes with backward direction', () => {
		const timeline = getTimeline();
		expect(timeline.direction).toBe('backward');
	});

	it('setRange sets min and max year', () => {
		const timeline = getTimeline();
		timeline.setRange(1800, 2000);
		expect(timeline.minYear).toBe(1800);
		expect(timeline.maxYear).toBe(2000);
	});

	it('setRange sets currentYear to maxYear', () => {
		const timeline = getTimeline();
		timeline.setRange(1800, 2000);
		expect(timeline.currentYear).toBe(2000);
	});

	it('setYear updates currentYear', () => {
		const timeline = getTimeline();
		timeline.setRange(1800, 2000);
		timeline.setYear(1900);
		expect(timeline.currentYear).toBe(1900);
	});

	it('setYear clamps to minYear when below range', () => {
		const timeline = getTimeline();
		timeline.setRange(1800, 2000);
		timeline.setYear(1700);
		expect(timeline.currentYear).toBe(1800);
	});

	it('setYear clamps to maxYear when above range', () => {
		const timeline = getTimeline();
		timeline.setRange(1800, 2000);
		timeline.setYear(2100);
		expect(timeline.currentYear).toBe(2000);
	});

	it('togglePlay starts playback', () => {
		const timeline = getTimeline();
		timeline.setRange(1800, 2000);
		timeline.togglePlay();
		expect(timeline.isPlaying).toBe(true);
	});

	it('togglePlay stops playback when already playing', () => {
		const timeline = getTimeline();
		timeline.setRange(1800, 2000);
		timeline.togglePlay();
		timeline.togglePlay();
		expect(timeline.isPlaying).toBe(false);
	});

	it('toggleDirection switches from backward to forward', () => {
		const timeline = getTimeline();
		timeline.toggleDirection();
		expect(timeline.direction).toBe('forward');
	});

	it('toggleDirection switches from forward back to backward', () => {
		const timeline = getTimeline();
		timeline.toggleDirection();
		timeline.toggleDirection();
		expect(timeline.direction).toBe('backward');
	});

	it('reset restores currentYear to maxYear', () => {
		const timeline = getTimeline();
		timeline.setRange(1800, 2000);
		timeline.setYear(1900);
		timeline.reset();
		expect(timeline.currentYear).toBe(2000);
	});

	it('reset stops playback', () => {
		const timeline = getTimeline();
		timeline.setRange(1800, 2000);
		timeline.togglePlay();
		timeline.reset();
		expect(timeline.isPlaying).toBe(false);
	});

	it('reset sets direction to backward', () => {
		const timeline = getTimeline();
		timeline.toggleDirection();
		timeline.reset();
		expect(timeline.direction).toBe('backward');
	});
});
