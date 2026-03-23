import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import '@testing-library/svelte/vitest';

afterEach(() => {
	cleanup();
});
