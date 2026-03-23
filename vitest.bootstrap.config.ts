import { defineConfig } from 'vitest/config';

// Temporary bootstrap config for running scaffolding tests before the full
// SvelteKit project is set up. The implementer should delete this file after
// Task 1 is complete and vite.config.ts is in place.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
