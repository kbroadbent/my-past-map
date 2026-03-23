import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['tests/unit/**/*.test.ts'],
		environment: 'jsdom',
		setupFiles: ['./tests/setup.ts', '@testing-library/svelte/vitest']
	},
	resolve: {
		conditions: ['browser']
	}
});
