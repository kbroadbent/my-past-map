import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

function fileExists(relativePath: string): boolean {
  return existsSync(resolve(ROOT, relativePath));
}

describe('Project Scaffolding', () => {
  describe('SvelteKit project structure', () => {
    it('has package.json with sveltekit dependency', () => {
      const pkg = JSON.parse(readFile('package.json'));
      expect(pkg.devDependencies).toHaveProperty('@sveltejs/kit');
    });

    it('has svelte.config.js', () => {
      expect(fileExists('svelte.config.js')).toBe(true);
    });

    it('has vite.config.ts', () => {
      expect(fileExists('vite.config.ts')).toBe(true);
    });

    it('has tsconfig.json', () => {
      expect(fileExists('tsconfig.json')).toBe(true);
    });

    it('has src/app.html', () => {
      expect(fileExists('src/app.html')).toBe(true);
    });
  });

  describe('Core dependencies', () => {
    it('has mapbox-gl as a runtime dependency', () => {
      const pkg = JSON.parse(readFile('package.json'));
      expect(pkg.dependencies).toHaveProperty('mapbox-gl');
    });

    it('has dexie as a runtime dependency', () => {
      const pkg = JSON.parse(readFile('package.json'));
      expect(pkg.dependencies).toHaveProperty('dexie');
    });

    it('has read-gedcom as a runtime dependency', () => {
      const pkg = JSON.parse(readFile('package.json'));
      expect(pkg.dependencies).toHaveProperty('read-gedcom');
    });

    it('has vitest as a dev dependency', () => {
      const pkg = JSON.parse(readFile('package.json'));
      expect(pkg.devDependencies).toHaveProperty('vitest');
    });

    it('has @testing-library/svelte as a dev dependency', () => {
      const pkg = JSON.parse(readFile('package.json'));
      expect(pkg.devDependencies).toHaveProperty('@testing-library/svelte');
    });

    it('has jsdom as a dev dependency', () => {
      const pkg = JSON.parse(readFile('package.json'));
      expect(pkg.devDependencies).toHaveProperty('jsdom');
    });
  });

  describe('Static adapter configuration', () => {
    it('has @sveltejs/adapter-static as a dev dependency', () => {
      const pkg = JSON.parse(readFile('package.json'));
      expect(pkg.devDependencies).toHaveProperty('@sveltejs/adapter-static');
    });

    it('configures static adapter in svelte.config.js', () => {
      const config = readFile('svelte.config.js');
      expect(config).toContain('adapter-static');
    });

    it('sets fallback to index.html for SPA mode', () => {
      const config = readFile('svelte.config.js');
      expect(config).toContain("fallback: 'index.html'");
    });
  });

  describe('Vitest configuration', () => {
    it('includes tests/unit in test config', () => {
      const config = readFile('vite.config.ts');
      expect(config).toContain('tests/unit');
    });

    it('uses jsdom environment', () => {
      const config = readFile('vite.config.ts');
      expect(config).toContain('jsdom');
    });
  });

  describe('Burnished Gold theme tokens', () => {
    it('has src/app.css', () => {
      expect(fileExists('src/app.css')).toBe(true);
    });

    it('defines landing page color tokens', () => {
      const css = readFile('src/app.css');
      expect(css).toContain('--color-parchment-light: #faf4e8');
      expect(css).toContain('--color-parchment-dark: #efe3c8');
      expect(css).toContain('--color-gold: #b8860b');
      expect(css).toContain('--color-brown-dark: #2a2118');
    });

    it('defines map view color tokens', () => {
      const css = readFile('src/app.css');
      expect(css).toContain('--color-map-bg: #1e1a14');
      expect(css).toContain('--color-map-panel: rgba(30, 26, 20, 0.95)');
      expect(css).toContain('--color-map-text-primary: #d4c4a0');
    });

    it('defines marker color tokens', () => {
      const css = readFile('src/app.css');
      expect(css).toContain('--color-birth: #e8a84c');
      expect(css).toContain('--color-death: #5a8f6a');
      expect(css).toContain('--color-marriage: #c75643');
      expect(css).toContain('--color-immigration: #4a9a8a');
      expect(css).toContain('--color-military: #6b7c3f');
      expect(css).toContain('--color-other: #9a7b5a');
    });

    it('defines typography tokens', () => {
      const css = readFile('src/app.css');
      expect(css).toContain("--font-heading: Georgia");
      expect(css).toContain('--font-body: system-ui');
    });

    it('applies border-box sizing globally', () => {
      const css = readFile('src/app.css');
      expect(css).toContain('box-sizing: border-box');
    });
  });

  describe('Security headers in vercel.json', () => {
    it('has vercel.json', () => {
      expect(fileExists('vercel.json')).toBe(true);
    });

    it('sets X-Content-Type-Options to nosniff', () => {
      const config = JSON.parse(readFile('vercel.json'));
      const headers = config.headers?.[0]?.headers;
      expect(headers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'X-Content-Type-Options', value: 'nosniff' })
        ])
      );
    });

    it('sets X-Frame-Options to DENY', () => {
      const config = JSON.parse(readFile('vercel.json'));
      const headers = config.headers?.[0]?.headers;
      expect(headers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'X-Frame-Options', value: 'DENY' })
        ])
      );
    });

    it('sets Referrer-Policy to strict-origin-when-cross-origin', () => {
      const config = JSON.parse(readFile('vercel.json'));
      const headers = config.headers?.[0]?.headers;
      expect(headers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' })
        ])
      );
    });

    it('sets Permissions-Policy to deny geolocation, camera, microphone', () => {
      const config = JSON.parse(readFile('vercel.json'));
      const headers = config.headers?.[0]?.headers;
      expect(headers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'Permissions-Policy',
            value: 'geolocation=(), camera=(), microphone=()'
          })
        ])
      );
    });

    it('applies headers to all routes', () => {
      const config = JSON.parse(readFile('vercel.json'));
      expect(config.headers?.[0]?.source).toBe('/(.*)');
    });
  });

  describe('Root layout with skip links', () => {
    it('has +layout.svelte', () => {
      expect(fileExists('src/routes/+layout.svelte')).toBe(true);
    });

    it('contains skip link targeting main-content', () => {
      const layout = readFile('src/routes/+layout.svelte');
      expect(layout).toContain('href="#main-content"');
      expect(layout).toContain('Skip to main content');
    });

    it('has skip-link styling with absolute positioning', () => {
      const layout = readFile('src/routes/+layout.svelte');
      expect(layout).toContain('.skip-link');
      expect(layout).toContain('position: absolute');
    });

    it('makes skip link visible on focus', () => {
      const layout = readFile('src/routes/+layout.svelte');
      expect(layout).toContain('.skip-link:focus');
    });
  });

  describe('Landing page placeholder', () => {
    it('has +page.svelte', () => {
      expect(fileExists('src/routes/+page.svelte')).toBe(true);
    });

    it('has main element with id main-content', () => {
      const page = readFile('src/routes/+page.svelte');
      expect(page).toContain('id="main-content"');
    });

    it('displays app title', () => {
      const page = readFile('src/routes/+page.svelte');
      expect(page).toContain('My Past Map');
    });
  });
});
