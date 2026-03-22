# My Past Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static Svelte SPA that lets users upload GEDCOM genealogy files and visualize ancestors on an interactive Mapbox GL map with bidirectional time-travel controls.

**Architecture:** Pure frontend SvelteKit app with static adapter (no backend). GEDCOM files are parsed client-side in a web worker using `read-gedcom`. Locations are geocoded via Mapbox and GeoNames APIs and cached in IndexedDB via Dexie.js. Map rendering uses a single GeoJSON source with GPU-side Mapbox filter expressions for timeline and event-type filtering.

**Tech Stack:** SvelteKit (static adapter), Mapbox GL JS, Dexie.js, read-gedcom, Vitest, Playwright, Vercel

**Spec:** `docs/superpowers/specs/2026-03-21-my-past-map-design.md`

---

## File Structure

```
my-past-map/
├── src/
│   ├── app.html                          # SvelteKit shell with CSP meta tag
│   ├── app.css                           # Global styles, Burnished Gold theme tokens
│   ├── routes/
│   │   ├── +layout.svelte                # Root layout (skip links, landmarks)
│   │   ├── +page.svelte                  # Landing page (hero, upload zone)
│   │   └── map/
│   │       └── +page.svelte              # Map view (orchestrates all map components)
│   ├── lib/
│   │   ├── types.ts                      # Shared types: Person, Event, Family, GeoCache
│   │   ├── constants.ts                  # Event type config (colors, icons, labels)
│   │   ├── stores/
│   │   │   ├── tree.svelte.ts            # Tree data store (people, events, families, index)
│   │   │   ├── timeline.svelte.ts        # Timeline state (currentYear, playing, direction)
│   │   │   └── filters.svelte.ts         # Active event type filters
│   │   ├── gedcom/
│   │   │   ├── parser.ts                 # Web worker manager (post file, receive chunks)
│   │   │   ├── worker.ts                 # Web worker: parse GEDCOM, stream results
│   │   │   └── transform.ts             # Transform read-gedcom output → our types
│   │   ├── geo/
│   │   │   ├── geocoder.ts              # Geocoding pipeline (dedup, cache, batch, fallback)
│   │   │   ├── common-places.ts         # Embedded dictionary of ~500 common place names
│   │   │   └── geonames.ts              # GeoNames API client (fallback geocoder)
│   │   ├── db/
│   │   │   └── index.ts                 # Dexie database schema (people, events, families, geocache)
│   │   ├── map/
│   │   │   ├── source.ts                # Build GeoJSON from events, manage Mapbox source
│   │   │   └── icons.ts                 # Load/register custom marker icons with Mapbox
│   │   └── components/
│   │       ├── UploadZone.svelte         # Drag-and-drop + click-to-browse file upload
│   │       ├── ParseProgress.svelte      # Parsing progress display
│   │       ├── GenerationPicker.svelte   # Slider for generation count
│   │       ├── GeocodingProgress.svelte  # Live geocoding feed + progress
│   │       ├── MapView.svelte            # Mapbox GL map container
│   │       ├── EventFilters.svelte       # Event type checkbox toggles
│   │       ├── TimelineScrubber.svelte   # Play/pause, scrubber, gen steps, direction
│   │       ├── PersonPanel.svelte        # Person detail slide-out panel
│   │       ├── ListView.svelte           # Accessible table alternative to map
│   │       └── ResetButton.svelte        # Reset view to defaults
├── static/
│   │── icons/                            # SVG marker icons (star, cross, ring, arrow, shield, circle)
├── tests/
│   ├── unit/
│   │   ├── transform.test.ts            # GEDCOM → our types transformation
│   │   ├── geocoder.test.ts             # Geocoding pipeline logic
│   │   ├── source.test.ts               # GeoJSON building
│   │   ├── timeline.test.ts             # Timeline store, binary search, delta computation
│   │   └── filters.test.ts              # Filter state management
│   └── e2e/
│       ├── upload.test.ts               # Upload flow e2e
│       └── map.test.ts                  # Map interaction e2e
├── test-fixtures/
│   └── sample.ged                       # Small GEDCOM file for testing
├── vercel.json                          # Security headers, redirects
├── svelte.config.js
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/app.css`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `vercel.json`

- [ ] **Step 1: Scaffold SvelteKit project**

```bash
cd /Users/kent/Development/my-past-map
npx sv create . --template minimal --types ts --no-add-ons --no-install
```

If prompted, accept overwriting existing files (only `.gitignore` and potentially empty dirs).

- [ ] **Step 2: Install dependencies**

```bash
npm install mapbox-gl dexie read-gedcom
npm install -D @types/mapbox-gl vitest @testing-library/svelte jsdom
```

- [ ] **Step 3: Configure static adapter**

```bash
npm install -D @sveltejs/adapter-static
```

Edit `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html'
    })
  }
};
```

- [ ] **Step 4: Configure Vitest**

Edit `vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'jsdom'
  }
});
```

- [ ] **Step 5: Add Burnished Gold theme tokens to `src/app.css`**

```css
:root {
  /* Landing page */
  --color-parchment-light: #faf4e8;
  --color-parchment-dark: #efe3c8;
  --color-gold: #b8860b;
  --color-brown-dark: #2a2118;
  --color-brown-body: #5c4a32;
  --color-brown-secondary: #6b5a48;

  /* Map view */
  --color-map-bg: #1e1a14;
  --color-map-panel: rgba(30, 26, 20, 0.95);
  --color-map-text-primary: #d4c4a0;
  --color-map-text-secondary: #a08b6d;

  /* Marker colors */
  --color-birth: #e8a84c;
  --color-death: #5a8f6a;
  --color-marriage: #c75643;
  --color-immigration: #4a9a8a;
  --color-military: #6b7c3f;
  --color-other: #9a7b5a;

  /* Typography */
  --font-heading: Georgia, 'Times New Roman', serif;
  --font-body: system-ui, -apple-system, sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
}

body {
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 6: Add security headers to `vercel.json`**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "geolocation=(), camera=(), microphone=()" }
      ]
    }
  ]
}
```

- [ ] **Step 7: Set up root layout with skip links**

Edit `src/routes/+layout.svelte`:

```svelte
<script>
  let { children } = $props();
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

{@render children()}

<style>
  .skip-link {
    position: absolute;
    top: -100%;
    left: 0;
    padding: 8px 16px;
    background: var(--color-gold);
    color: var(--color-brown-dark);
    z-index: 9999;
    font-weight: 600;
  }
  .skip-link:focus {
    top: 0;
  }
</style>
```

- [ ] **Step 8: Add placeholder landing page**

Edit `src/routes/+page.svelte`:

```svelte
<main id="main-content">
  <h1>My Past Map</h1>
  <p>Coming soon.</p>
</main>
```

- [ ] **Step 9: Verify it builds and runs**

```bash
npm run dev -- --open
```

Expected: SvelteKit dev server starts, page shows "My Past Map / Coming soon."

```bash
npm run build
```

Expected: Build succeeds, output in `build/` directory.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold SvelteKit project with static adapter and theme tokens"
```

---

## Task 2: Shared Types and Constants

**Files:**
- Create: `src/lib/types.ts`, `src/lib/constants.ts`
- Test: `tests/unit/types.test.ts`

- [ ] **Step 1: Write type definitions**

Create `src/lib/types.ts`:

```ts
export interface Person {
  id: string;
  name: string;
  gender: 'M' | 'F' | 'Unknown';
  generation: number;
  parentFamilyId: string | null;
  spouseFamilyIds: string[];
}

export interface GedcomEvent {
  id: string;
  personId: string;
  type: EventType;
  date: EventDate | null;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
}

export interface EventDate {
  year: number;
  month: number | null;
  day: number | null;
  original: string;
}

export interface Family {
  id: string;
  spouse1Id: string | null;
  spouse2Id: string | null;
  childIds: string[];
}

export interface GeoCache {
  locationString: string;
  lat: number;
  lng: number;
  confidence: 'high' | 'medium' | 'low';
}

export type EventType =
  | 'birth'
  | 'death'
  | 'marriage'
  | 'burial'
  | 'immigration'
  | 'emigration'
  | 'military'
  | 'christening'
  | 'census'
  | 'residence'
  | 'other';

export interface TimelineIndex {
  sortedEvents: { year: number; eventIndex: number }[];
  generationBoundaries: Map<number, { minYear: number; maxYear: number }>;
  personSummary: Map<string, { name: string; birthYear: number | null; deathYear: number | null }>;
}

export interface TreeData {
  people: Person[];
  events: GedcomEvent[];
  families: Family[];
  index: TimelineIndex;
}
```

- [ ] **Step 2: Write event type constants**

Create `src/lib/constants.ts`:

```ts
import type { EventType } from './types.js';

export interface EventTypeConfig {
  label: string;
  color: string;
  icon: string;
}

export const EVENT_TYPES: Record<EventType, EventTypeConfig> = {
  birth: { label: 'Birth', color: '#e8a84c', icon: 'star' },
  death: { label: 'Death', color: '#5a8f6a', icon: 'cross' },
  marriage: { label: 'Marriage', color: '#c75643', icon: 'ring' },
  burial: { label: 'Burial', color: '#7a6e5a', icon: 'cross' },
  immigration: { label: 'Immigration', color: '#4a9a8a', icon: 'arrow' },
  emigration: { label: 'Emigration', color: '#4a9a8a', icon: 'arrow' },
  military: { label: 'Military', color: '#6b7c3f', icon: 'shield' },
  christening: { label: 'Christening', color: '#9a7b5a', icon: 'circle' },
  census: { label: 'Census', color: '#9a7b5a', icon: 'circle' },
  residence: { label: 'Residence', color: '#9a7b5a', icon: 'circle' },
  other: { label: 'Other', color: '#9a7b5a', icon: 'circle' }
};

export const MAX_GENERATIONS = 12;
export const DEFAULT_GENERATIONS = 5;
export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const GEOCODE_CONCURRENCY = 5;
export const GEOCODE_BATCH_SIZE = 50;
```

- [ ] **Step 3: Write a basic test to verify types compile**

Create `tests/unit/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Person, GedcomEvent, Family, GeoCache, TreeData } from '$lib/types';
import { EVENT_TYPES, MAX_GENERATIONS, DEFAULT_GENERATIONS } from '$lib/constants';

describe('constants', () => {
  it('EVENT_TYPES has all expected event types', () => {
    expect(EVENT_TYPES.birth.label).toBe('Birth');
    expect(EVENT_TYPES.death.label).toBe('Death');
    expect(EVENT_TYPES.marriage.label).toBe('Marriage');
  });

  it('generation limits are sane', () => {
    expect(DEFAULT_GENERATIONS).toBeLessThanOrEqual(MAX_GENERATIONS);
    expect(MAX_GENERATIONS).toBeLessThanOrEqual(12);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/unit/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts tests/unit/types.test.ts
git commit -m "feat: add shared types and event type constants"
```

---

## Task 3: IndexedDB Database Layer

**Files:**
- Create: `src/lib/db/index.ts`
- Test: `tests/unit/db.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/db.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/db';

// Dexie provides fake-indexeddb in jsdom automatically
describe('database', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('stores and retrieves a person', async () => {
    await db.people.add({
      id: '@I1@',
      name: 'John Smith',
      gender: 'M',
      generation: 0,
      parentFamilyId: null,
      spouseFamilyIds: []
    });
    const person = await db.people.get('@I1@');
    expect(person?.name).toBe('John Smith');
  });

  it('stores and retrieves geocache entries', async () => {
    await db.geocache.add({
      locationString: 'Liverpool, England',
      lat: 53.41,
      lng: -2.98,
      confidence: 'high'
    });
    const cached = await db.geocache.get('Liverpool, England');
    expect(cached?.lat).toBeCloseTo(53.41);
  });

  it('bulk puts geocache entries', async () => {
    const entries = [
      { locationString: 'London, England', lat: 51.51, lng: -0.13, confidence: 'high' as const },
      { locationString: 'Dublin, Ireland', lat: 53.35, lng: -6.26, confidence: 'high' as const }
    ];
    await db.geocache.bulkPut(entries);
    const count = await db.geocache.count();
    expect(count).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/db.test.ts
```

Expected: FAIL — `$lib/db` doesn't exist.

- [ ] **Step 3: Install fake-indexeddb for testing**

```bash
npm install -D fake-indexeddb
```

Add to `vite.config.ts` test setup:

```ts
test: {
  include: ['tests/unit/**/*.test.ts'],
  environment: 'jsdom',
  setupFiles: ['./tests/setup.ts']
}
```

Create `tests/setup.ts`:

```ts
import 'fake-indexeddb/auto';
```

- [ ] **Step 4: Write the implementation**

Create `src/lib/db/index.ts`:

```ts
import Dexie, { type EntityTable } from 'dexie';
import type { Person, GedcomEvent, Family, GeoCache } from '$lib/types.js';

const db = new Dexie('MyPastMap') as Dexie & {
  people: EntityTable<Person, 'id'>;
  events: EntityTable<GedcomEvent, 'id'>;
  families: EntityTable<Family, 'id'>;
  geocache: EntityTable<GeoCache, 'locationString'>;
};

db.version(1).stores({
  people: 'id, name, generation',
  events: 'id, personId, type, [personId+type]',
  families: 'id',
  geocache: 'locationString'
});

export { db };
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/unit/db.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/index.ts tests/unit/db.test.ts tests/setup.ts vite.config.ts
git commit -m "feat: add IndexedDB database layer with Dexie"
```

---

## Task 4: GEDCOM Parser (Web Worker + Transform)

**Files:**
- Create: `src/lib/gedcom/transform.ts`, `src/lib/gedcom/worker.ts`, `src/lib/gedcom/parser.ts`
- Create: `test-fixtures/sample.ged`
- Test: `tests/unit/transform.test.ts`

- [ ] **Step 1: Create a test fixture GEDCOM file**

Create `test-fixtures/sample.ged`:

```
0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
1 BIRT
2 DATE 15 MAR 1950
2 PLAC Salt Lake City, Utah, USA
1 DEAT
2 DATE 10 JAN 2020
2 PLAC Provo, Utah, USA
1 FAMS @F1@
0 @I2@ INDI
1 NAME Mary /Jones/
1 SEX F
1 BIRT
2 DATE 22 JUN 1952
2 PLAC Liverpool, Lancashire, England
1 FAMS @F1@
0 @I3@ INDI
1 NAME Robert /Smith/
1 SEX M
1 BIRT
2 DATE 5 APR 1920
2 PLAC Boston, Massachusetts, USA
1 DEAT
2 DATE 3 NOV 1998
2 PLAC Boston, Massachusetts, USA
1 FAMS @F2@
1 FAMC @F2@
0 @I4@ INDI
1 NAME Margaret /Williams/
1 SEX F
1 BIRT
2 DATE 12 MAR 1921
2 PLAC Liverpool, Lancashire, England
1 DEAT
2 DATE 3 NOV 1998
2 PLAC Boston, Massachusetts, USA
1 IMMI
2 DATE 1946
2 PLAC New York, USA
1 FAMS @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I5@
0 @F2@ FAM
1 HUSB @I3@
1 WIFE @I4@
1 CHIL @I1@
0 @I5@ INDI
1 NAME Sarah /Smith/
1 SEX F
1 BIRT
2 DATE 1 DEC 1980
2 PLAC Provo, Utah, USA
0 TRLR
```

- [ ] **Step 2: Write the failing transform test**

Create `tests/unit/transform.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readGedcom } from 'read-gedcom';
import { transformGedcom } from '$lib/gedcom/transform';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('transformGedcom', () => {
  const gedcomBuffer = readFileSync(resolve(__dirname, '../../test-fixtures/sample.ged'));
  const parsed = readGedcom(gedcomBuffer);

  it('extracts all individuals', () => {
    const result = transformGedcom(parsed, '@I5@');
    expect(result.people).toHaveLength(5);
  });

  it('sets generation 0 for the root person', () => {
    const result = transformGedcom(parsed, '@I5@');
    const root = result.people.find(p => p.id === '@I5@');
    expect(root?.generation).toBe(0);
  });

  it('sets correct generation for parents', () => {
    const result = transformGedcom(parsed, '@I5@');
    const father = result.people.find(p => p.id === '@I1@');
    expect(father?.generation).toBe(1);
  });

  it('sets correct generation for grandparents', () => {
    const result = transformGedcom(parsed, '@I5@');
    const grandfather = result.people.find(p => p.id === '@I3@');
    expect(grandfather?.generation).toBe(2);
  });

  it('extracts birth events with dates and locations', () => {
    const result = transformGedcom(parsed, '@I5@');
    const birthEvents = result.events.filter(e => e.type === 'birth');
    expect(birthEvents.length).toBeGreaterThanOrEqual(5);
    const johnBirth = birthEvents.find(e => e.personId === '@I1@');
    expect(johnBirth?.date?.year).toBe(1950);
    expect(johnBirth?.locationText).toBe('Salt Lake City, Utah, USA');
  });

  it('extracts immigration events', () => {
    const result = transformGedcom(parsed, '@I5@');
    const immigrationEvents = result.events.filter(e => e.type === 'immigration');
    expect(immigrationEvents).toHaveLength(1);
    expect(immigrationEvents[0].personId).toBe('@I4@');
    expect(immigrationEvents[0].date?.year).toBe(1946);
  });

  it('extracts families with spouse and child links', () => {
    const result = transformGedcom(parsed, '@I5@');
    const f1 = result.families.find(f => f.id === '@F1@');
    expect(f1?.spouse1Id).toBe('@I1@');
    expect(f1?.spouse2Id).toBe('@I2@');
    expect(f1?.childIds).toContain('@I5@');
  });

  it('builds a time-sorted index', () => {
    const result = transformGedcom(parsed, '@I5@');
    const years = result.index.sortedEvents.map(e => e.year);
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
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/unit/transform.test.ts
```

Expected: FAIL — `$lib/gedcom/transform` doesn't exist.

- [ ] **Step 4: Write the transform implementation**

Create `src/lib/gedcom/transform.ts`:

```ts
import type { Person, GedcomEvent, Family, EventDate, EventType, TreeData, TimelineIndex } from '$lib/types.js';

const GEDCOM_EVENT_MAP: Record<string, EventType> = {
  BIRT: 'birth',
  DEAT: 'death',
  MARR: 'marriage',
  BURI: 'burial',
  IMMI: 'immigration',
  EMIG: 'emigration',
  _MILT: 'military',
  MILI: 'military',
  CHR: 'christening',
  CENS: 'census',
  RESI: 'residence'
};

export function transformGedcom(parsed: any, rootPersonId: string): TreeData {
  const people: Person[] = [];
  const events: GedcomEvent[] = [];
  const families: Family[] = [];
  const generationMap = new Map<string, number>();

  // Extract families first so we can compute generations
  const familyRecords = parsed.getFamilyRecord();
  for (const fam of familyRecords.arraySelect()) {
    const id = fam.pointer()[0];
    const husbPointers = fam.getHusband().valueAsPointer();
    const wifePointers = fam.getWife().valueAsPointer();
    const childPointers = fam.getChild().valueAsPointer();

    families.push({
      id,
      spouse1Id: husbPointers.length > 0 ? husbPointers[0] : null,
      spouse2Id: wifePointers.length > 0 ? wifePointers[0] : null,
      childIds: [...childPointers]
    });
  }

  // BFS to compute generations from root person
  computeGenerations(rootPersonId, families, generationMap);

  // Extract individuals
  const indiRecords = parsed.getIndividualRecord();
  let eventCounter = 0;
  for (const indi of indiRecords.arraySelect()) {
    const id = indi.pointer()[0];
    const nameRecords = indi.getName().valueAsParts();
    const name = nameRecords.length > 0
      ? [nameRecords[0][0], nameRecords[0][1]].filter(Boolean).join(' ').trim()
      : 'Unknown';
    const sexValues = indi.getSex().value();
    const gender = sexValues.length > 0
      ? (sexValues[0] === 'M' ? 'M' : sexValues[0] === 'F' ? 'F' : 'Unknown')
      : 'Unknown';

    const famcPointers = indi.getFamilyAsChild().valueAsPointer();
    const famsPointers = indi.getFamilyAsSpouse().valueAsPointer();

    people.push({
      id,
      name,
      gender: gender as 'M' | 'F' | 'Unknown',
      generation: generationMap.get(id) ?? -1,
      parentFamilyId: famcPointers.length > 0 ? famcPointers[0] : null,
      spouseFamilyIds: [...famsPointers]
    });

    // Extract events for this individual
    for (const [gedcomTag, eventType] of Object.entries(GEDCOM_EVENT_MAP)) {
      const eventNodes = indi.get(gedcomTag);
      if (!eventNodes || eventNodes.length === 0) continue;
      for (const eventNode of eventNodes.arraySelect()) {
        const dateValue = eventNode.getDate();
        const placeValue = eventNode.getPlace();
        const dateText = dateValue.value();
        const placeText = placeValue.value();

        events.push({
          id: `E${++eventCounter}`,
          personId: id,
          type: eventType,
          date: dateText.length > 0 ? parseDate(dateText[0]) : null,
          locationText: placeText.length > 0 ? placeText[0] : null,
          lat: null,
          lng: null
        });
      }
    }
  }

  const index = buildTimelineIndex(people, events);

  return { people, events, families, index };
}

function computeGenerations(
  rootId: string,
  families: Family[],
  generationMap: Map<string, number>
): void {
  const childToFamily = new Map<string, string>();
  const familyById = new Map<string, Family>();

  for (const fam of families) {
    familyById.set(fam.id, fam);
    for (const childId of fam.childIds) {
      childToFamily.set(childId, fam.id);
    }
  }

  const queue: { id: string; gen: number }[] = [{ id: rootId, gen: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    generationMap.set(id, gen);

    const famId = childToFamily.get(id);
    if (famId) {
      const family = familyById.get(famId);
      if (family) {
        if (family.spouse1Id && !visited.has(family.spouse1Id)) {
          queue.push({ id: family.spouse1Id, gen: gen + 1 });
        }
        if (family.spouse2Id && !visited.has(family.spouse2Id)) {
          queue.push({ id: family.spouse2Id, gen: gen + 1 });
        }
      }
    }
  }
}

function parseDate(dateStr: string): EventDate {
  const parts = dateStr.trim().split(/\s+/);
  const months: Record<string, number> = {
    JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
    JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
  };

  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  // Try parsing from right: year is always last
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i].toUpperCase();
    if (year === null && /^\d{3,4}$/.test(p)) {
      year = parseInt(p);
    } else if (month === null && months[p]) {
      month = months[p];
    } else if (day === null && /^\d{1,2}$/.test(p)) {
      day = parseInt(p);
    }
  }

  return {
    year: year ?? 0,
    month,
    day,
    original: dateStr
  };
}

function buildTimelineIndex(people: Person[], events: GedcomEvent[]): TimelineIndex {
  const sortedEvents: { year: number; eventIndex: number }[] = [];
  const generationBoundaries = new Map<number, { minYear: number; maxYear: number }>();
  const personSummary = new Map<string, { name: string; birthYear: number | null; deathYear: number | null }>();

  // Build sorted events
  events.forEach((event, i) => {
    if (event.date && event.date.year > 0) {
      sortedEvents.push({ year: event.date.year, eventIndex: i });
    }
  });
  sortedEvents.sort((a, b) => a.year - b.year);

  // Build person summaries
  for (const person of people) {
    const birthEvent = events.find(e => e.personId === person.id && e.type === 'birth');
    const deathEvent = events.find(e => e.personId === person.id && e.type === 'death');
    personSummary.set(person.id, {
      name: person.name,
      birthYear: birthEvent?.date?.year ?? null,
      deathYear: deathEvent?.date?.year ?? null
    });
  }

  // Build generation boundaries
  for (const person of people) {
    if (person.generation < 0) continue;
    const personEvents = events.filter(e => e.personId === person.id && e.date && e.date.year > 0);
    for (const event of personEvents) {
      const year = event.date!.year;
      const existing = generationBoundaries.get(person.generation);
      if (existing) {
        existing.minYear = Math.min(existing.minYear, year);
        existing.maxYear = Math.max(existing.maxYear, year);
      } else {
        generationBoundaries.set(person.generation, { minYear: year, maxYear: year });
      }
    }
  }

  return { sortedEvents, generationBoundaries, personSummary };
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/unit/transform.test.ts
```

Expected: PASS

- [ ] **Step 6: Write the web worker**

Create `src/lib/gedcom/worker.ts`:

```ts
import { readGedcom } from 'read-gedcom';
import { transformGedcom } from './transform.js';

self.onmessage = async (event: MessageEvent) => {
  const { buffer, rootPersonId } = event.data;

  try {
    self.postMessage({ type: 'progress', percent: 10, message: 'Parsing GEDCOM...' });

    const parsed = readGedcom(buffer);

    self.postMessage({ type: 'progress', percent: 50, message: 'Transforming data...' });

    const treeData = transformGedcom(parsed, rootPersonId);

    self.postMessage({ type: 'progress', percent: 90, message: 'Finalizing...' });
    self.postMessage({ type: 'complete', data: treeData });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to parse GEDCOM file'
    });
  }
};
```

- [ ] **Step 7: Write the worker manager**

Create `src/lib/gedcom/parser.ts`:

```ts
import type { TreeData } from '$lib/types.js';

export interface ParseProgress {
  percent: number;
  message: string;
}

export function parseGedcomFile(
  file: File,
  rootPersonId: string,
  onProgress?: (progress: ParseProgress) => void
): Promise<TreeData> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (event: MessageEvent) => {
      const { type, data, message, percent } = event.data;

      if (type === 'progress') {
        onProgress?.({ percent, message });
      } else if (type === 'complete') {
        worker.terminate();
        resolve(data as TreeData);
      } else if (type === 'error') {
        worker.terminate();
        reject(new Error(message));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(new Error('Worker error: ' + error.message));
    };

    file.arrayBuffer().then((buffer) => {
      worker.postMessage({ buffer, rootPersonId }, [buffer]);
    });
  });
}
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/gedcom/ tests/unit/transform.test.ts test-fixtures/sample.ged
git commit -m "feat: add GEDCOM parser with web worker and transform layer"
```

---

## Task 5: Geocoding Pipeline

**Files:**
- Create: `src/lib/geo/geocoder.ts`, `src/lib/geo/common-places.ts`, `src/lib/geo/geonames.ts`
- Test: `tests/unit/geocoder.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/geocoder.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deduplicateLocations, geocodeLocation } from '$lib/geo/geocoder';
import type { GedcomEvent } from '$lib/types';

describe('deduplicateLocations', () => {
  it('returns unique location strings', () => {
    const events: Pick<GedcomEvent, 'locationText'>[] = [
      { locationText: 'London, England' },
      { locationText: 'London, England' },
      { locationText: 'Dublin, Ireland' },
      { locationText: null }
    ];
    const unique = deduplicateLocations(events as GedcomEvent[]);
    expect(unique).toEqual(['London, England', 'Dublin, Ireland']);
  });
});

describe('geocodeLocation', () => {
  it('returns result from common places dictionary', async () => {
    const result = await geocodeLocation('London, England', {
      checkCache: async () => null,
      mapboxToken: 'test'
    });
    expect(result).toBeDefined();
    expect(result!.confidence).toBe('high');
    expect(result!.lat).toBeCloseTo(51.51, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/geocoder.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create common places dictionary**

Create `src/lib/geo/common-places.ts`:

```ts
export interface PlaceEntry {
  lat: number;
  lng: number;
}

// Top ~100 most common ancestral locations in GEDCOM files
// Expand to ~500 during implementation based on frequency analysis
export const COMMON_PLACES: Record<string, PlaceEntry> = {
  'london, england': { lat: 51.5074, lng: -0.1278 },
  'dublin, ireland': { lat: 53.3498, lng: -6.2603 },
  'liverpool, england': { lat: 53.4084, lng: -2.9916 },
  'new york, usa': { lat: 40.7128, lng: -74.0060 },
  'new york, new york, usa': { lat: 40.7128, lng: -74.0060 },
  'boston, massachusetts, usa': { lat: 42.3601, lng: -71.0589 },
  'salt lake city, utah, usa': { lat: 40.7608, lng: -111.8910 },
  'provo, utah, usa': { lat: 40.2338, lng: -111.6585 },
  'chicago, illinois, usa': { lat: 41.8781, lng: -87.6298 },
  'philadelphia, pennsylvania, usa': { lat: 39.9526, lng: -75.1652 },
  'hamburg, germany': { lat: 53.5511, lng: 9.9937 },
  'berlin, germany': { lat: 52.5200, lng: 13.4050 },
  'paris, france': { lat: 48.8566, lng: 2.3522 },
  'amsterdam, netherlands': { lat: 52.3676, lng: 4.9041 },
  'stockholm, sweden': { lat: 59.3293, lng: 18.0686 },
  'copenhagen, denmark': { lat: 55.6761, lng: 12.5683 },
  'oslo, norway': { lat: 59.9139, lng: 10.7522 },
  'edinburgh, scotland': { lat: 55.9533, lng: -3.1883 },
  'glasgow, scotland': { lat: 55.8642, lng: -4.2518 },
  'rome, italy': { lat: 41.9028, lng: 12.4964 },
  'naples, italy': { lat: 40.8518, lng: 14.2681 },
  'mexico city, mexico': { lat: 19.4326, lng: -99.1332 },
  'tokyo, japan': { lat: 35.6762, lng: 139.6503 },
  'beijing, china': { lat: 39.9042, lng: 116.4074 },
  'sydney, australia': { lat: -33.8688, lng: 151.2093 },
  'toronto, ontario, canada': { lat: 43.6532, lng: -79.3832 },
  'liverpool, lancashire, england': { lat: 53.4084, lng: -2.9916 },
  'manchester, england': { lat: 53.4808, lng: -2.2426 },
  'birmingham, england': { lat: 52.4862, lng: -1.8904 },
  'leeds, england': { lat: 53.8008, lng: -1.5491 },
  'bristol, england': { lat: 51.4545, lng: -2.5879 },
  'cardiff, wales': { lat: 51.4816, lng: -3.1791 },
  'belfast, ireland': { lat: 54.5973, lng: -5.9301 },
  'cork, ireland': { lat: 51.8985, lng: -8.4756 }
};

export function lookupCommonPlace(locationText: string): PlaceEntry | null {
  const normalized = locationText.toLowerCase().trim();
  return COMMON_PLACES[normalized] ?? null;
}
```

- [ ] **Step 4: Create GeoNames client**

Create `src/lib/geo/geonames.ts`:

```ts
export interface GeoNamesResult {
  lat: number;
  lng: number;
  name: string;
}

const GEONAMES_BASE = 'https://secure.geonames.org';

export async function searchGeoNames(
  query: string,
  username: string = 'demo'
): Promise<GeoNamesResult | null> {
  try {
    const params = new URLSearchParams({
      q: query,
      maxRows: '1',
      username,
      type: 'json'
    });
    const response = await fetch(`${GEONAMES_BASE}/searchJSON?${params}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.geonames && data.geonames.length > 0) {
      const result = data.geonames[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lng),
        name: result.name
      };
    }
    return null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Write the geocoder**

Create `src/lib/geo/geocoder.ts`:

```ts
import type { GedcomEvent, GeoCache } from '$lib/types.js';
import { lookupCommonPlace } from './common-places.js';

export interface GeocoderOptions {
  checkCache: (location: string) => Promise<GeoCache | null>;
  mapboxToken: string;
  onProgress?: (resolved: number, total: number, current: string) => void;
}

export function deduplicateLocations(events: GedcomEvent[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const event of events) {
    if (event.locationText && !seen.has(event.locationText)) {
      seen.add(event.locationText);
      unique.push(event.locationText);
    }
  }
  return unique;
}

export async function geocodeLocation(
  location: string,
  options: Pick<GeocoderOptions, 'checkCache' | 'mapboxToken'>
): Promise<GeoCache | null> {
  // 1. Check cache
  const cached = await options.checkCache(location);
  if (cached) return cached;

  // 2. Check common places dictionary
  const common = lookupCommonPlace(location);
  if (common) {
    return {
      locationString: location,
      lat: common.lat,
      lng: common.lng,
      confidence: 'high'
    };
  }

  // 3. Mapbox geocoding
  try {
    const encoded = encodeURIComponent(location);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${options.mapboxToken}&limit=1`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const relevance = data.features[0].relevance;
        return {
          locationString: location,
          lat,
          lng,
          confidence: relevance > 0.8 ? 'high' : relevance > 0.5 ? 'medium' : 'low'
        };
      }
    }
  } catch {
    // Fall through to GeoNames
  }

  // 4. GeoNames fallback — imported dynamically to avoid loading when not needed
  try {
    const { searchGeoNames } = await import('./geonames.js');
    const result = await searchGeoNames(location);
    if (result) {
      return {
        locationString: location,
        lat: result.lat,
        lng: result.lng,
        confidence: 'medium'
      };
    }
  } catch {
    // Give up
  }

  return null;
}

export async function geocodeBatch(
  locations: string[],
  options: GeocoderOptions,
  concurrency: number = 5
): Promise<Map<string, GeoCache>> {
  const results = new Map<string, GeoCache>();
  let resolved = 0;

  // Process in batches
  for (let i = 0; i < locations.length; i += concurrency) {
    const batch = locations.slice(i, i + concurrency);
    const promises = batch.map(async (location) => {
      const result = await geocodeLocation(location, options);
      resolved++;
      options.onProgress?.(resolved, locations.length, location);
      if (result) {
        results.set(location, result);
      }
    });
    await Promise.all(promises);
  }

  return results;
}
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run tests/unit/geocoder.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/geo/ tests/unit/geocoder.test.ts
git commit -m "feat: add geocoding pipeline with common places dictionary and batch support"
```

---

## Task 6: Svelte Stores (Tree, Timeline, Filters)

**Files:**
- Create: `src/lib/stores/tree.svelte.ts`, `src/lib/stores/timeline.svelte.ts`, `src/lib/stores/filters.svelte.ts`
- Test: `tests/unit/timeline.test.ts`, `tests/unit/filters.test.ts`

- [ ] **Step 1: Write the failing timeline test**

Create `tests/unit/timeline.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { findVisibleEventRange, computeDelta } from '$lib/stores/timeline.svelte';

describe('findVisibleEventRange', () => {
  const sorted = [
    { year: 1800, eventIndex: 0 },
    { year: 1850, eventIndex: 1 },
    { year: 1900, eventIndex: 2 },
    { year: 1950, eventIndex: 3 },
    { year: 2000, eventIndex: 4 }
  ];

  it('returns all events up to current year', () => {
    const end = findVisibleEventRange(sorted, 1900);
    expect(end).toBe(3); // indices 0, 1, 2 are visible
  });

  it('returns 0 for year before all events', () => {
    const end = findVisibleEventRange(sorted, 1799);
    expect(end).toBe(0);
  });

  it('returns all for year after all events', () => {
    const end = findVisibleEventRange(sorted, 2001);
    expect(end).toBe(5);
  });
});

describe('computeDelta', () => {
  it('returns events entering the range when moving forward', () => {
    const sorted = [
      { year: 1800, eventIndex: 0 },
      { year: 1850, eventIndex: 1 },
      { year: 1900, eventIndex: 2 }
    ];
    const delta = computeDelta(sorted, 1800, 1860);
    expect(delta.entering).toEqual([1]); // eventIndex 1 enters
    expect(delta.leaving).toEqual([]);
  });

  it('returns events leaving the range when moving backward', () => {
    const sorted = [
      { year: 1800, eventIndex: 0 },
      { year: 1850, eventIndex: 1 },
      { year: 1900, eventIndex: 2 }
    ];
    const delta = computeDelta(sorted, 1900, 1840);
    expect(delta.entering).toEqual([]);
    expect(delta.leaving).toEqual([2, 1]); // eventIndices 2 and 1 leave
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/timeline.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write the timeline store**

Create `src/lib/stores/timeline.svelte.ts`:

```ts
export function findVisibleEventRange(
  sorted: { year: number; eventIndex: number }[],
  currentYear: number
): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (sorted[mid].year <= currentYear) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

export function computeDelta(
  sorted: { year: number; eventIndex: number }[],
  prevYear: number,
  currentYear: number
): { entering: number[]; leaving: number[] } {
  const prevEnd = findVisibleEventRange(sorted, prevYear);
  const currEnd = findVisibleEventRange(sorted, currentYear);

  const entering: number[] = [];
  const leaving: number[] = [];

  if (currentYear > prevYear) {
    for (let i = prevEnd; i < currEnd; i++) {
      entering.push(sorted[i].eventIndex);
    }
  } else {
    for (let i = prevEnd - 1; i >= currEnd; i--) {
      leaving.push(sorted[i].eventIndex);
    }
  }

  return { entering, leaving };
}

// Reactive timeline state
let currentYear = $state(2026);
let isPlaying = $state(false);
let direction = $state<'forward' | 'backward'>('backward');
let minYear = $state(1700);
let maxYear = $state(2026);

export function getTimeline() {
  return {
    get currentYear() { return currentYear; },
    set currentYear(v: number) { currentYear = v; },
    get isPlaying() { return isPlaying; },
    set isPlaying(v: boolean) { isPlaying = v; },
    get direction() { return direction; },
    set direction(v: 'forward' | 'backward') { direction = v; },
    get minYear() { return minYear; },
    set minYear(v: number) { minYear = v; },
    get maxYear() { return maxYear; },
    set maxYear(v: number) { maxYear = v; },

    toggleDirection() {
      direction = direction === 'forward' ? 'backward' : 'forward';
    },

    togglePlay() {
      isPlaying = !isPlaying;
    },

    reset() {
      currentYear = maxYear;
      isPlaying = false;
      direction = 'backward';
    }
  };
}
```

- [ ] **Step 4: Run timeline tests**

```bash
npx vitest run tests/unit/timeline.test.ts
```

Expected: PASS

- [ ] **Step 5: Write filter store**

Create `src/lib/stores/filters.svelte.ts`:

```ts
import type { EventType } from '$lib/types.js';
import { EVENT_TYPES } from '$lib/constants.js';

let activeFilters = $state<Set<EventType>>(new Set(Object.keys(EVENT_TYPES) as EventType[]));

export function getFilters() {
  return {
    get active(): Set<EventType> { return activeFilters; },

    isActive(type: EventType): boolean {
      return activeFilters.has(type);
    },

    toggle(type: EventType) {
      const next = new Set(activeFilters);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      activeFilters = next;
    },

    enableAll() {
      activeFilters = new Set(Object.keys(EVENT_TYPES) as EventType[]);
    },

    getActiveTypes(): EventType[] {
      return [...activeFilters];
    }
  };
}
```

- [ ] **Step 6: Write tree store**

Create `src/lib/stores/tree.svelte.ts`:

```ts
import type { TreeData, Person, GedcomEvent, Family } from '$lib/types.js';

let treeData = $state<TreeData | null>(null);
let isLoaded = $state(false);

export function getTree() {
  return {
    get data() { return treeData; },
    get isLoaded() { return isLoaded; },

    load(data: TreeData) {
      treeData = data;
      isLoaded = true;
    },

    clear() {
      treeData = null;
      isLoaded = false;
    },

    getPerson(id: string): Person | undefined {
      return treeData?.people.find(p => p.id === id);
    },

    getPersonEvents(personId: string): GedcomEvent[] {
      return treeData?.events.filter(e => e.personId === personId) ?? [];
    },

    getFamily(id: string): Family | undefined {
      return treeData?.families.find(f => f.id === id);
    },

    getEventsByGeneration(maxGen: number): GedcomEvent[] {
      if (!treeData) return [];
      const personIds = new Set(
        treeData.people.filter(p => p.generation >= 0 && p.generation <= maxGen).map(p => p.id)
      );
      return treeData.events.filter(e => personIds.has(e.personId));
    }
  };
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/stores/ tests/unit/timeline.test.ts
git commit -m "feat: add tree, timeline, and filter stores with binary search indexing"
```

---

## Task 7: Map GeoJSON Source Builder

**Files:**
- Create: `src/lib/map/source.ts`, `src/lib/map/icons.ts`
- Test: `tests/unit/source.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/source.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildGeoJSON } from '$lib/map/source';
import type { GedcomEvent, Person } from '$lib/types';

describe('buildGeoJSON', () => {
  const people: Person[] = [
    { id: '@I1@', name: 'John', gender: 'M', generation: 0, parentFamilyId: null, spouseFamilyIds: [] }
  ];
  const events: GedcomEvent[] = [
    {
      id: 'E1', personId: '@I1@', type: 'birth',
      date: { year: 1950, month: 3, day: 15, original: '15 MAR 1950' },
      locationText: 'Salt Lake City', lat: 40.76, lng: -111.89
    },
    {
      id: 'E2', personId: '@I1@', type: 'death',
      date: { year: 2020, month: 1, day: 10, original: '10 JAN 2020' },
      locationText: 'Provo', lat: 40.23, lng: -111.66
    },
    {
      id: 'E3', personId: '@I1@', type: 'birth',
      date: { year: 1950, month: 3, day: 15, original: '15 MAR 1950' },
      locationText: 'Unknown', lat: null, lng: null
    }
  ];

  it('builds valid GeoJSON with only geocoded events', () => {
    const geojson = buildGeoJSON(events, people);
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(2); // skips null lat/lng
  });

  it('includes event type and year in properties', () => {
    const geojson = buildGeoJSON(events, people);
    const feature = geojson.features[0];
    expect(feature.properties.type).toBe('birth');
    expect(feature.properties.year).toBe(1950);
    expect(feature.properties.personName).toBe('John');
  });

  it('includes generation in properties', () => {
    const geojson = buildGeoJSON(events, people);
    expect(geojson.features[0].properties.generation).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/source.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write the implementation**

Create `src/lib/map/source.ts`:

```ts
import type { GedcomEvent, Person } from '$lib/types.js';

export interface MapFeatureProperties {
  eventId: string;
  personId: string;
  personName: string;
  type: string;
  year: number;
  generation: number;
  locationText: string;
  confidence: string;
  hasDate: boolean;
}

export function buildGeoJSON(
  events: GedcomEvent[],
  people: Person[]
): GeoJSON.FeatureCollection {
  const personMap = new Map(people.map(p => [p.id, p]));

  const features: GeoJSON.Feature[] = [];

  for (const event of events) {
    if (event.lat === null || event.lng === null) continue;

    const person = personMap.get(event.personId);
    if (!person) continue;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [event.lng, event.lat]
      },
      properties: {
        eventId: event.id,
        personId: event.personId,
        personName: person.name,
        type: event.type,
        year: event.date?.year ?? 0,
        generation: person.generation,
        locationText: event.locationText ?? '',
        confidence: 'high',
        hasDate: event.date !== null && event.date.year > 0
      }
    });
  }

  return { type: 'FeatureCollection', features };
}
```

- [ ] **Step 4: Create marker icon registration**

Create `src/lib/map/icons.ts`:

```ts
import type mapboxgl from 'mapbox-gl';
import { EVENT_TYPES } from '$lib/constants.js';

const ICON_SVGS: Record<string, string> = {
  star: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill="currentColor"/></svg>',
  cross: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  ring: '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  shield: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 2L4 6v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V6l-8-4z" fill="currentColor"/></svg>',
  circle: '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>'
};

export async function loadMarkerIcons(map: mapboxgl.Map): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d')!;

  for (const [eventType, config] of Object.entries(EVENT_TYPES)) {
    const svgStr = ICON_SVGS[config.icon];
    if (!svgStr) continue;

    const coloredSvg = svgStr.replace(/currentColor/g, config.color);
    const blob = new Blob([coloredSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    await new Promise<void>((resolve) => {
      const img = new Image(24, 24);
      img.onload = () => {
        ctx.clearRect(0, 0, 24, 24);
        ctx.drawImage(img, 0, 0, 24, 24);
        const imageData = ctx.getImageData(0, 0, 24, 24);
        if (!map.hasImage(`marker-${eventType}`)) {
          map.addImage(`marker-${eventType}`, imageData);
        }
        URL.revokeObjectURL(url);
        resolve();
      };
      img.src = url;
    });
  }
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/unit/source.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/map/ tests/unit/source.test.ts
git commit -m "feat: add GeoJSON source builder and marker icon registration"
```

---

## Task 8: Landing Page with Upload Zone

**Files:**
- Create: `src/lib/components/UploadZone.svelte`, `src/lib/components/ParseProgress.svelte`, `src/lib/components/GenerationPicker.svelte`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Create the UploadZone component**

Create `src/lib/components/UploadZone.svelte`:

```svelte
<script lang="ts">
  import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '$lib/constants.js';

  interface Props {
    onFileSelected: (file: File) => void;
    error?: string | null;
  }

  let { onFileSelected, error = null }: Props = $props();
  let isDragging = $state(false);
  let fileInput: HTMLInputElement;

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) validateAndEmit(file);
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) validateAndEmit(file);
  }

  function validateAndEmit(file: File) {
    if (!file.name.toLowerCase().endsWith('.ged')) {
      error = "This doesn't appear to be a valid GEDCOM file. Please select a .ged file.";
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      error = `File exceeds ${MAX_FILE_SIZE_MB} MB limit. Try exporting fewer generations.`;
      return;
    }
    error = null;
    onFileSelected(file);
  }
</script>

<div
  class="upload-zone"
  class:dragging={isDragging}
  role="button"
  tabindex="0"
  aria-label="Upload GEDCOM file"
  ondragover={(e) => { e.preventDefault(); isDragging = true; }}
  ondragleave={() => isDragging = false}
  ondrop={handleDrop}
  onclick={() => fileInput.click()}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } }}
>
  <input
    bind:this={fileInput}
    type="file"
    accept=".ged"
    onchange={handleFileChange}
    class="visually-hidden"
    aria-hidden="true"
  />
  <div class="upload-icon" aria-hidden="true">📂</div>
  <div class="upload-text">Drop your GEDCOM file here</div>
  <div class="upload-hint">or click to browse</div>
  <div class="upload-formats">.ged files from FamilySearch, Ancestry, MyHeritage, Gramps, etc.</div>
</div>

{#if error}
  <div class="error" role="alert">{error}</div>
{/if}

<style>
  .upload-zone {
    border: 2px dashed var(--color-gold);
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    background: rgba(184, 134, 11, 0.05);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    max-width: 480px;
    margin: 0 auto;
  }
  .upload-zone:hover, .upload-zone.dragging {
    border-color: var(--color-gold);
    background: rgba(184, 134, 11, 0.1);
  }
  .upload-zone:focus-visible {
    outline: 2px solid var(--color-gold);
    outline-offset: 2px;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
  .upload-icon { font-size: 40px; margin-bottom: 12px; }
  .upload-text { color: var(--color-brown-dark); font-size: 16px; font-weight: 500; }
  .upload-hint { color: var(--color-brown-secondary); font-size: 13px; margin-top: 8px; }
  .upload-formats { color: var(--color-brown-secondary); font-size: 11px; margin-top: 16px; }
  .error {
    color: #c75643;
    font-size: 14px;
    margin-top: 12px;
    text-align: center;
    font-weight: 500;
  }
</style>
```

- [ ] **Step 2: Create ParseProgress component**

Create `src/lib/components/ParseProgress.svelte`:

```svelte
<script lang="ts">
  interface Props {
    percent: number;
    message: string;
  }

  let { percent, message }: Props = $props();
</script>

<div class="parse-progress" role="status" aria-live="polite">
  <div class="message">{message}</div>
  <div class="bar-container">
    <div class="bar" style="width: {percent}%"></div>
  </div>
  <div class="percent">{Math.round(percent)}%</div>
</div>

<style>
  .parse-progress { text-align: center; max-width: 400px; margin: 24px auto; }
  .message { color: var(--color-brown-body); font-size: 14px; margin-bottom: 8px; }
  .bar-container {
    height: 6px;
    background: var(--color-parchment-dark);
    border-radius: 3px;
    overflow: hidden;
  }
  .bar {
    height: 100%;
    background: var(--color-gold);
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  .percent { color: var(--color-brown-secondary); font-size: 12px; margin-top: 4px; }
</style>
```

- [ ] **Step 3: Create GenerationPicker component**

Create `src/lib/components/GenerationPicker.svelte`:

```svelte
<script lang="ts">
  import { MAX_GENERATIONS, DEFAULT_GENERATIONS } from '$lib/constants.js';

  interface Props {
    totalPeople: number;
    onConfirm: (generations: number) => void;
  }

  let { totalPeople, onConfirm }: Props = $props();
  let generations = $state(DEFAULT_GENERATIONS);

  // Compute how many people are available at each gen depth
  // (this is a placeholder — actual counts come from tree data)
</script>

<div class="gen-picker">
  <h2>How many generations?</h2>
  <p class="subtitle">Your file contains {totalPeople} people</p>

  <label for="gen-slider" class="slider-label">
    Generations: <strong>{generations}</strong>
  </label>
  <input
    id="gen-slider"
    type="range"
    min="1"
    max={MAX_GENERATIONS}
    bind:value={generations}
    aria-valuetext="{generations} generations"
  />

  {#if generations >= 8}
    <p class="sparsity-note">
      Deeper generations may have sparse data — not all branches will be complete.
    </p>
  {/if}

  <button class="confirm-btn" onclick={() => onConfirm(generations)}>
    Show on Map
  </button>
</div>

<style>
  .gen-picker { text-align: center; max-width: 400px; margin: 40px auto; }
  h2 { font-family: var(--font-heading); color: var(--color-brown-dark); }
  .subtitle { color: var(--color-brown-secondary); margin-top: 8px; }
  .slider-label { display: block; margin-top: 24px; color: var(--color-brown-body); }
  input[type="range"] { width: 100%; margin-top: 8px; accent-color: var(--color-gold); }
  .sparsity-note {
    color: var(--color-gold);
    font-size: 13px;
    margin-top: 12px;
    font-style: italic;
  }
  .confirm-btn {
    margin-top: 24px;
    background: var(--color-gold);
    color: white;
    border: none;
    padding: 12px 32px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
  }
  .confirm-btn:hover { filter: brightness(1.1); }
  .confirm-btn:focus-visible { outline: 2px solid var(--color-brown-dark); outline-offset: 2px; }
</style>
```

- [ ] **Step 4: Build the landing page**

Edit `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import UploadZone from '$lib/components/UploadZone.svelte';
  import ParseProgress from '$lib/components/ParseProgress.svelte';
  import GenerationPicker from '$lib/components/GenerationPicker.svelte';
  import { parseGedcomFile, type ParseProgress as ParseProgressType } from '$lib/gedcom/parser.js';
  import { goto } from '$app/navigation';
  import { getTree } from '$lib/stores/tree.svelte.js';
  import { db } from '$lib/db/index.js';

  type Phase = 'upload' | 'parsing' | 'pickGen' | 'geocoding';

  let phase = $state<Phase>('upload');
  let parseProgress = $state<ParseProgressType>({ percent: 0, message: '' });
  let uploadError = $state<string | null>(null);
  let totalPeople = $state(0);

  const tree = getTree();

  async function handleFile(file: File) {
    phase = 'parsing';

    try {
      // Use first individual as root for now — user could pick later
      const data = await parseGedcomFile(file, '', (progress) => {
        parseProgress = progress;
      });

      // If no rootPersonId was specified, pick the first person with generation info
      // The transform will assign generation -1 to people not reachable from root
      // For now, re-parse with the first individual as root
      const rootId = data.people[0]?.id ?? '';
      const finalData = await parseGedcomFile(file, rootId, (progress) => {
        parseProgress = progress;
      });

      tree.load(finalData);
      totalPeople = finalData.people.length;

      // Cache in IndexedDB
      await db.people.bulkPut(finalData.people);
      await db.events.bulkPut(finalData.events);
      await db.families.bulkPut(finalData.families);

      phase = 'pickGen';
    } catch (e) {
      uploadError = e instanceof Error ? e.message : 'Failed to parse file';
      phase = 'upload';
    }
  }

  function handleGenerationConfirm(generations: number) {
    goto(`/map?gen=${generations}`);
  }
</script>

<main id="main-content" class="landing">
  <header class="landing-header">
    <nav>
      <span class="logo">🗺️ My Past Map</span>
    </nav>
  </header>

  <div class="hero">
    <h1>See where your ancestors lived,<br>traveled, and called home.</h1>
    <p class="tagline">Upload your family tree and watch your heritage come alive on an interactive map. Travel through time, generation by generation.</p>
  </div>

  {#if phase === 'upload'}
    <UploadZone onFileSelected={handleFile} error={uploadError} />

    <div class="export-help">
      <p class="export-intro">Export a GEDCOM file from FamilySearch, Ancestry, or your genealogy software.</p>
      <details>
        <summary>Show detailed export steps</summary>
        <div class="export-details">
          <p><strong>FamilySearch:</strong> Tree → Settings → Export Tree</p>
          <p><strong>Ancestry:</strong> Trees → Export Tree → GEDCOM</p>
          <p><strong>MyHeritage:</strong> Family Tree → Export to GEDCOM</p>
          <p><strong>Gramps:</strong> Family Trees → Export → GEDCOM</p>
        </div>
      </details>
    </div>

    <div class="trust-badges">
      <div class="badge">
        <span class="badge-icon" aria-hidden="true">🔒</span>
        <span>Your data stays<br>in your browser</span>
      </div>
      <div class="badge">
        <span class="badge-icon" aria-hidden="true">⚡</span>
        <span>No account<br>required</span>
      </div>
      <div class="badge">
        <span class="badge-icon" aria-hidden="true">🌐</span>
        <span>Works with any<br>genealogy platform</span>
      </div>
    </div>
  {:else if phase === 'parsing'}
    <ParseProgress percent={parseProgress.percent} message={parseProgress.message} />
  {:else if phase === 'pickGen'}
    <GenerationPicker {totalPeople} onConfirm={handleGenerationConfirm} />
  {/if}
</main>

<style>
  .landing {
    min-height: 100vh;
    background: linear-gradient(180deg, var(--color-parchment-light) 0%, var(--color-parchment-dark) 100%);
  }
  .landing-header nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 32px;
    border-bottom: 1px solid rgba(0,0,0,0.05);
  }
  .logo {
    font-family: var(--font-heading);
    font-size: 18px;
    font-weight: 700;
    color: var(--color-brown-dark);
  }
  .hero {
    text-align: center;
    padding: 60px 40px 40px;
  }
  h1 {
    font-family: var(--font-heading);
    color: var(--color-brown-dark);
    font-size: 36px;
    font-weight: 700;
    line-height: 1.2;
  }
  .tagline {
    color: var(--color-brown-body);
    font-size: 16px;
    margin-top: 16px;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }
  .export-help {
    max-width: 480px;
    margin: 24px auto 0;
    padding: 0 20px;
  }
  .export-intro {
    color: var(--color-brown-body);
    font-size: 13px;
    text-align: center;
  }
  details {
    margin-top: 8px;
  }
  summary {
    color: var(--color-gold);
    font-size: 13px;
    cursor: pointer;
    text-align: center;
  }
  .export-details {
    margin-top: 12px;
    padding: 12px;
    background: rgba(255,255,255,0.4);
    border-radius: 8px;
    line-height: 1.8;
    font-size: 13px;
    color: var(--color-brown-body);
  }
  .trust-badges {
    display: flex;
    justify-content: center;
    gap: 32px;
    margin-top: 40px;
    padding-bottom: 40px;
  }
  .badge {
    text-align: center;
    color: var(--color-brown-secondary);
    font-size: 11px;
    line-height: 1.4;
  }
  .badge-icon { font-size: 20px; display: block; margin-bottom: 4px; }
</style>
```

- [ ] **Step 5: Verify landing page renders**

```bash
npm run dev
```

Expected: Landing page shows with hero text, upload zone, export instructions, and trust badges.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/UploadZone.svelte src/lib/components/ParseProgress.svelte src/lib/components/GenerationPicker.svelte src/routes/+page.svelte
git commit -m "feat: add landing page with upload zone, parse progress, and generation picker"
```

---

## Task 9: Map View Page (Mapbox + GeoJSON Source)

**Files:**
- Create: `src/routes/map/+page.svelte`, `src/lib/components/MapView.svelte`, `src/lib/components/GeocodingProgress.svelte`

- [ ] **Step 1: Create GeocodingProgress component**

Create `src/lib/components/GeocodingProgress.svelte`:

```svelte
<script lang="ts">
  interface Props {
    resolved: number;
    total: number;
    currentLocation: string;
  }

  let { resolved, total, currentLocation }: Props = $props();
</script>

<div class="geocoding-progress" role="status" aria-live="polite">
  <div class="header">Geocoding locations... {resolved}/{total}</div>
  <div class="bar-container">
    <div class="bar" style="width: {total > 0 ? (resolved / total) * 100 : 0}%"></div>
  </div>
  <div class="current" aria-live="polite">Resolving '{currentLocation}'...</div>
</div>

<style>
  .geocoding-progress {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--color-map-panel);
    padding: 24px 32px;
    border-radius: 12px;
    text-align: center;
    z-index: 10;
    min-width: 300px;
  }
  .header { color: var(--color-map-text-primary); font-size: 16px; font-weight: 600; }
  .bar-container {
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    margin: 12px 0;
    overflow: hidden;
  }
  .bar { height: 100%; background: var(--color-gold); border-radius: 2px; transition: width 0.3s; }
  .current { color: var(--color-map-text-secondary); font-size: 12px; }
</style>
```

- [ ] **Step 2: Create MapView component**

Create `src/lib/components/MapView.svelte`:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import { loadMarkerIcons } from '$lib/map/icons.js';
  import 'mapbox-gl/dist/mapbox-gl.css';

  interface Props {
    geojson: GeoJSON.FeatureCollection;
    onMarkerClick?: (personId: string) => void;
  }

  let { geojson, onMarkerClick }: Props = $props();
  let container: HTMLDivElement;
  let map: mapboxgl.Map | null = null;

  onMount(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

    map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 30],
      zoom: 2
    });

    map.on('load', async () => {
      if (!map) return;

      await loadMarkerIcons(map);

      map.addSource('ancestors', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14
      });

      // Cluster layer
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'ancestors',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#b8860b',
          'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 25],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#faf4e8'
        }
      });

      // Cluster count label
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'ancestors',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12
        },
        paint: { 'text-color': '#faf4e8' }
      });

      // Individual markers
      map.addLayer({
        id: 'ancestor-markers',
        type: 'symbol',
        source: 'ancestors',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['concat', 'marker-', ['get', 'type']],
          'icon-size': [
            'interpolate', ['linear'], ['get', 'generation'],
            0, 1.0,
            12, 0.4
          ],
          'icon-allow-overlap': true
        }
      });

      // Click handler for markers
      map.on('click', 'ancestor-markers', (e) => {
        if (e.features && e.features.length > 0) {
          const personId = e.features[0].properties?.personId;
          if (personId) onMarkerClick?.(personId);
        }
      });

      // Click handler for clusters — zoom in
      map.on('click', 'clusters', (e) => {
        const features = map!.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (features.length > 0) {
          const clusterId = features[0].properties?.cluster_id;
          (map!.getSource('ancestors') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
            clusterId,
            (err, zoom) => {
              if (!err && map) {
                map.easeTo({
                  center: (features[0].geometry as any).coordinates,
                  zoom: zoom!
                });
              }
            }
          );
        }
      });

      // Cursor changes
      map.on('mouseenter', 'ancestor-markers', () => { map!.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'ancestor-markers', () => { map!.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'clusters', () => { map!.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', () => { map!.getCanvas().style.cursor = ''; });
    });
  });

  // Update source when geojson changes
  $effect(() => {
    if (map && map.isStyleLoaded() && map.getSource('ancestors')) {
      (map.getSource('ancestors') as mapboxgl.GeoJSONSource).setData(geojson);
    }
  });

  onDestroy(() => {
    map?.remove();
  });

  export function fitToData() {
    if (!map || geojson.features.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    for (const feature of geojson.features) {
      const coords = (feature.geometry as any).coordinates;
      bounds.extend(coords);
    }
    map.fitBounds(bounds, { padding: 50 });
  }

  export function setFilter(filter: any[]) {
    if (!map || !map.isStyleLoaded()) return;
    map.setFilter('ancestor-markers', filter);
  }

  export function getMap() { return map; }
</script>

<div bind:this={container} class="map-container" aria-label="Ancestor map showing life event locations">
</div>

<style>
  .map-container {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
  }
</style>
```

- [ ] **Step 3: Create the map page**

Create `src/routes/map/+page.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import MapView from '$lib/components/MapView.svelte';
  import GeocodingProgress from '$lib/components/GeocodingProgress.svelte';
  import { getTree } from '$lib/stores/tree.svelte.js';
  import { buildGeoJSON } from '$lib/map/source.js';
  import { deduplicateLocations, geocodeBatch } from '$lib/geo/geocoder.js';
  import { db } from '$lib/db/index.js';
  import { onMount } from 'svelte';
  import type { GeoCache } from '$lib/types.js';

  const tree = getTree();

  let maxGen = $state(5);
  let isGeocoding = $state(true);
  let geocodeResolved = $state(0);
  let geocodeTotal = $state(0);
  let geocodeCurrent = $state('');
  let geojson = $state<GeoJSON.FeatureCollection>({ type: 'FeatureCollection', features: [] });
  let selectedPersonId = $state<string | null>(null);
  let mapView: MapView;

  onMount(async () => {
    const genParam = $page.url.searchParams.get('gen');
    if (genParam) maxGen = parseInt(genParam) || 5;

    if (!tree.isLoaded) {
      goto('/');
      return;
    }

    // Get events for selected generations
    const events = tree.getEventsByGeneration(maxGen);
    const locations = deduplicateLocations(events);
    geocodeTotal = locations.length;

    // Geocode
    const token = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
    const results = await geocodeBatch(locations, {
      checkCache: async (loc) => {
        const cached = await db.geocache.get(loc);
        return cached ?? null;
      },
      mapboxToken: token,
      onProgress: (resolved, total, current) => {
        geocodeResolved = resolved;
        geocodeCurrent = current;
      }
    });

    // Cache results
    const cacheEntries: GeoCache[] = [...results.values()];
    if (cacheEntries.length > 0) {
      await db.geocache.bulkPut(cacheEntries);
    }

    // Apply geocoded coordinates to events
    for (const event of events) {
      if (event.locationText) {
        const cached = results.get(event.locationText);
        if (cached) {
          event.lat = cached.lat;
          event.lng = cached.lng;
        }
      }
    }

    isGeocoding = false;
    geojson = buildGeoJSON(events, tree.data!.people);

    // Fit map to data after a tick
    requestAnimationFrame(() => mapView?.fitToData());
  });
</script>

<div class="map-page">
  <MapView bind:this={mapView} {geojson} onMarkerClick={(id) => selectedPersonId = id} />

  {#if isGeocoding}
    <GeocodingProgress resolved={geocodeResolved} total={geocodeTotal} currentLocation={geocodeCurrent} />
  {/if}
</div>

<style>
  .map-page {
    width: 100vw;
    height: 100vh;
    position: relative;
    background: var(--color-map-bg);
  }
</style>
```

- [ ] **Step 4: Add VITE_MAPBOX_TOKEN to `.env` template**

Create `.env.example`:

```
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

Add `.env` to `.gitignore` if not already there.

- [ ] **Step 5: Verify map page loads (requires Mapbox token)**

Create `.env` with your Mapbox token, run `npm run dev`, upload the test fixture, pick generations, and verify the map appears.

- [ ] **Step 6: Commit**

```bash
git add src/routes/map/ src/lib/components/MapView.svelte src/lib/components/GeocodingProgress.svelte .env.example
git commit -m "feat: add map view page with geocoding pipeline and Mapbox integration"
```

---

## Task 10: Event Filters Component

**Files:**
- Create: `src/lib/components/EventFilters.svelte`

- [ ] **Step 1: Create the EventFilters component**

Create `src/lib/components/EventFilters.svelte`:

```svelte
<script lang="ts">
  import { EVENT_TYPES } from '$lib/constants.js';
  import { getFilters } from '$lib/stores/filters.svelte.js';
  import type { EventType } from '$lib/types.js';

  interface Props {
    eventCounts: Record<string, number>;
    onFilterChange: (activeTypes: EventType[]) => void;
  }

  let { eventCounts, onFilterChange }: Props = $props();
  const filters = getFilters();

  function handleToggle(type: EventType) {
    filters.toggle(type);
    onFilterChange(filters.getActiveTypes());
  }

  // Only show event types that exist in the data
  let visibleTypes = $derived(
    (Object.keys(EVENT_TYPES) as EventType[]).filter(t => (eventCounts[t] ?? 0) > 0)
  );
</script>

<div class="event-filters" role="group" aria-label="Event type filters">
  <div class="filter-header">Show Events</div>
  {#each visibleTypes as type}
    <label class="filter-item" class:inactive={!filters.isActive(type)}>
      <input
        type="checkbox"
        checked={filters.isActive(type)}
        onchange={() => handleToggle(type)}
        class="visually-hidden"
      />
      <span class="dot" style="background: {EVENT_TYPES[type].color}" aria-hidden="true"></span>
      <span class="label">{EVENT_TYPES[type].label}</span>
      <span class="count">({eventCounts[type] ?? 0})</span>
    </label>
  {/each}
</div>

<style>
  .event-filters {
    position: absolute;
    top: 12px;
    left: 12px;
    background: var(--color-map-panel);
    border-radius: 8px;
    padding: 12px;
    font-size: 12px;
    border: 1px solid rgba(255,255,255,0.1);
    z-index: 5;
  }
  .filter-header {
    color: var(--color-map-text-secondary);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .filter-item {
    display: flex;
    align-items: center;
    color: var(--color-map-text-primary);
    margin-bottom: 6px;
    cursor: pointer;
    gap: 8px;
  }
  .filter-item.inactive { opacity: 0.4; }
  .visually-hidden {
    position: absolute;
    width: 1px; height: 1px;
    overflow: hidden;
    clip: rect(0,0,0,0);
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .count { color: var(--color-map-text-secondary); font-size: 11px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/EventFilters.svelte
git commit -m "feat: add event type filter toggles with counts"
```

---

## Task 11: Timeline Scrubber Component

**Files:**
- Create: `src/lib/components/TimelineScrubber.svelte`

- [ ] **Step 1: Create the TimelineScrubber component**

Create `src/lib/components/TimelineScrubber.svelte`:

```svelte
<script lang="ts">
  import { getTimeline } from '$lib/stores/timeline.svelte.js';
  import type { TimelineIndex } from '$lib/types.js';

  interface Props {
    index: TimelineIndex;
    onYearChange: (year: number) => void;
  }

  let { index, onYearChange }: Props = $props();
  const timeline = getTimeline();

  // Set bounds from index
  $effect(() => {
    if (index.sortedEvents.length > 0) {
      timeline.minYear = index.sortedEvents[0].year;
      timeline.maxYear = index.sortedEvents[index.sortedEvents.length - 1].year;
      timeline.currentYear = timeline.maxYear;
    }
  });

  // Animation loop
  let animationId: number | null = null;

  $effect(() => {
    if (timeline.isPlaying) {
      const step = timeline.direction === 'forward' ? 1 : -1;
      let lastTime = 0;
      const animate = (time: number) => {
        if (time - lastTime > 50) { // ~20fps for year updates
          lastTime = time;
          const nextYear = timeline.currentYear + step;
          if (nextYear < timeline.minYear || nextYear > timeline.maxYear) {
            timeline.isPlaying = false;
            return;
          }
          timeline.currentYear = nextYear;
          onYearChange(nextYear);
        }
        if (timeline.isPlaying) {
          animationId = requestAnimationFrame(animate);
        }
      };
      animationId = requestAnimationFrame(animate);
    } else if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  });

  function handleScrub(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value);
    timeline.currentYear = value;
    onYearChange(value);
  }

  function stepGeneration(direction: 'prev' | 'next') {
    const gens = [...index.generationBoundaries.entries()].sort((a, b) => a[0] - b[0]);
    const currentGen = gens.find(([, bounds]) =>
      timeline.currentYear >= bounds.minYear && timeline.currentYear <= bounds.maxYear
    );
    const currentIdx = currentGen ? gens.findIndex(([g]) => g === currentGen[0]) : 0;

    let targetIdx: number;
    if (direction === 'prev') {
      targetIdx = Math.min(currentIdx + 1, gens.length - 1); // older = higher gen number
    } else {
      targetIdx = Math.max(currentIdx - 1, 0); // newer = lower gen number
    }

    const [, bounds] = gens[targetIdx];
    timeline.currentYear = direction === 'prev' ? bounds.minYear : bounds.maxYear;
    onYearChange(timeline.currentYear);
  }

  // Generation tick mark positions
  let genTicks = $derived(() => {
    const range = timeline.maxYear - timeline.minYear;
    if (range <= 0) return [];
    return [...index.generationBoundaries.entries()].map(([gen, bounds]) => ({
      gen,
      position: ((bounds.minYear - timeline.minYear) / range) * 100
    }));
  });
</script>

<section class="timeline-scrubber" aria-label="Timeline controls">
  <div class="controls-row">
    <button
      class="play-btn"
      onclick={() => timeline.togglePlay()}
      aria-label={timeline.isPlaying ? 'Pause timeline' : 'Play timeline'}
    >
      {timeline.isPlaying ? '⏸' : '▶'}
    </button>

    <button
      class="direction-btn"
      onclick={() => timeline.toggleDirection()}
      aria-label="Playback direction: {timeline.direction}"
    >
      {timeline.direction === 'forward' ? '→' : '←'}
    </button>

    <div class="year-display" aria-live="polite">{timeline.currentYear}</div>

    <div class="scrubber-container">
      <input
        type="range"
        min={timeline.minYear}
        max={timeline.maxYear}
        value={timeline.currentYear}
        oninput={handleScrub}
        aria-label="Timeline year"
        aria-valuetext="Year {timeline.currentYear}"
      />
    </div>

    <div class="year-end">{timeline.maxYear}</div>
  </div>

  <div class="gen-controls">
    <button
      class="gen-btn"
      onclick={() => stepGeneration('prev')}
      aria-label="Previous generation (further back in time)"
    >
      ⏪ Gen
    </button>
    <button
      class="gen-btn"
      onclick={() => stepGeneration('next')}
      aria-label="Next generation (closer to present)"
    >
      Gen ⏩
    </button>
  </div>
</section>

<style>
  .timeline-scrubber {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--color-map-panel);
    border-top: 1px solid rgba(255,255,255,0.1);
    padding: 12px 20px;
    z-index: 5;
  }
  .controls-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .play-btn, .direction-btn {
    background: var(--color-gold);
    border: none;
    color: var(--color-map-bg);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .play-btn:focus-visible, .direction-btn:focus-visible {
    outline: 2px solid var(--color-map-text-primary);
    outline-offset: 2px;
  }
  .direction-btn {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
  .year-display {
    color: var(--color-map-text-primary);
    font-size: 20px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    min-width: 50px;
  }
  .scrubber-container { flex: 1; }
  .scrubber-container input[type="range"] {
    width: 100%;
    accent-color: var(--color-gold);
  }
  .year-end { color: var(--color-map-text-secondary); font-size: 12px; }
  .gen-controls {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-top: 8px;
  }
  .gen-btn {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.15);
    color: var(--color-map-text-primary);
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
  }
  .gen-btn:focus-visible {
    outline: 2px solid var(--color-gold);
    outline-offset: 2px;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/TimelineScrubber.svelte
git commit -m "feat: add timeline scrubber with bidirectional playback and generation stepping"
```

---

## Task 12: Person Detail Panel

**Files:**
- Create: `src/lib/components/PersonPanel.svelte`

- [ ] **Step 1: Create the PersonPanel component**

Create `src/lib/components/PersonPanel.svelte`:

```svelte
<script lang="ts">
  import { getTree } from '$lib/stores/tree.svelte.js';
  import { EVENT_TYPES } from '$lib/constants.js';
  import type { Person, GedcomEvent, Family } from '$lib/types.js';

  interface Props {
    personId: string | null;
    onClose: () => void;
    onNavigate: (personId: string) => void;
  }

  let { personId, onClose, onNavigate }: Props = $props();
  const tree = getTree();

  let person = $derived(personId ? tree.getPerson(personId) : null);
  let events = $derived(personId ? tree.getPersonEvents(personId) : []);
  let sortedEvents = $derived(
    [...events].sort((a, b) => (a.date?.year ?? 0) - (b.date?.year ?? 0))
  );

  // Family links
  let parentFamily = $derived(person?.parentFamilyId ? tree.getFamily(person.parentFamilyId) : null);
  let spouseFamilies = $derived(
    person?.spouseFamilyIds.map(id => tree.getFamily(id)).filter(Boolean) as Family[] ?? []
  );

  function getRelationLabel(gen: number): string {
    const labels: Record<number, string> = {
      0: 'You', 1: 'Parent', 2: 'Grandparent', 3: 'Great-Grandparent'
    };
    if (gen <= 3) return labels[gen];
    return `${'Great-'.repeat(gen - 2)}Grandparent`;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  let panelEl: HTMLElement;

  $effect(() => {
    if (personId && panelEl) {
      panelEl.focus();
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if person}
  <aside
    bind:this={panelEl}
    class="person-panel"
    tabindex="-1"
    aria-label="Person details: {person.name}"
  >
    <button class="close-btn" onclick={onClose} aria-label="Close person details">✕</button>

    <div class="person-header">
      <h2>{person.name}</h2>
      <div class="generation-label">Generation {person.generation} · {getRelationLabel(person.generation)}</div>
    </div>

    <div class="events-section">
      <h3>Life Events</h3>
      {#each sortedEvents as event}
        <div class="event-item">
          <span
            class="event-dot"
            style="background: {EVENT_TYPES[event.type]?.color ?? '#9a7b5a'}"
            aria-hidden="true"
          ></span>
          <div class="event-details">
            <div class="event-type">{EVENT_TYPES[event.type]?.label ?? event.type}</div>
            <div class="event-meta">
              {#if event.date}{event.date.original}{/if}
              {#if event.date && event.locationText} · {/if}
              {#if event.locationText}{event.locationText}{/if}
            </div>
          </div>
        </div>
      {/each}
    </div>

    {#if parentFamily}
      <div class="family-section">
        <h3>Parents</h3>
        {#if parentFamily.spouse1Id}
          {@const parent1 = tree.getPerson(parentFamily.spouse1Id)}
          {#if parent1}
            <button class="family-link" onclick={() => onNavigate(parent1.id)}>{parent1.name}</button>
          {/if}
        {/if}
        {#if parentFamily.spouse2Id}
          {@const parent2 = tree.getPerson(parentFamily.spouse2Id)}
          {#if parent2}
            <button class="family-link" onclick={() => onNavigate(parent2.id)}>{parent2.name}</button>
          {/if}
        {/if}
      </div>
    {/if}

    {#each spouseFamilies as family}
      <div class="family-section">
        <h3>Family</h3>
        {#if family.spouse1Id && family.spouse1Id !== personId}
          {@const spouse = tree.getPerson(family.spouse1Id)}
          {#if spouse}
            <div class="family-role">Spouse:</div>
            <button class="family-link" onclick={() => onNavigate(spouse.id)}>{spouse.name}</button>
          {/if}
        {/if}
        {#if family.spouse2Id && family.spouse2Id !== personId}
          {@const spouse = tree.getPerson(family.spouse2Id)}
          {#if spouse}
            <div class="family-role">Spouse:</div>
            <button class="family-link" onclick={() => onNavigate(spouse.id)}>{spouse.name}</button>
          {/if}
        {/if}
        {#if family.childIds.length > 0}
          <div class="family-role">Children:</div>
          {#each family.childIds as childId}
            {@const child = tree.getPerson(childId)}
            {#if child}
              <button class="family-link" onclick={() => onNavigate(child.id)}>{child.name}</button>
            {/if}
          {/each}
        {/if}
      </div>
    {/each}
  </aside>
{/if}

<style>
  .person-panel {
    position: absolute;
    top: 0;
    right: 0;
    width: 300px;
    height: 100%;
    background: var(--color-map-panel);
    border-left: 1px solid rgba(255,255,255,0.1);
    padding: 16px;
    overflow-y: auto;
    z-index: 10;
    outline: none;
  }
  .close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    color: var(--color-map-text-secondary);
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
  }
  .close-btn:focus-visible { outline: 2px solid var(--color-gold); }
  .person-header { margin-bottom: 20px; }
  h2 { color: var(--color-map-text-primary); font-size: 18px; font-weight: 600; font-family: var(--font-heading); }
  .generation-label { color: var(--color-map-text-secondary); font-size: 13px; margin-top: 4px; }
  h3 {
    color: var(--color-gold);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
    margin-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 12px;
  }
  .event-item { display: flex; align-items: start; margin-bottom: 12px; gap: 10px; }
  .event-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
  .event-type { color: var(--color-map-text-primary); font-size: 13px; }
  .event-meta { color: var(--color-map-text-secondary); font-size: 12px; margin-top: 2px; }
  .family-role { color: var(--color-map-text-secondary); font-size: 11px; margin-bottom: 4px; }
  .family-link {
    display: block;
    background: none;
    border: none;
    color: var(--color-gold);
    font-size: 13px;
    cursor: pointer;
    padding: 2px 0;
    text-align: left;
  }
  .family-link:hover { text-decoration: underline; }
  .family-link:focus-visible { outline: 2px solid var(--color-gold); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/PersonPanel.svelte
git commit -m "feat: add person detail panel with family navigation links"
```

---

## Task 13: Wire Everything Together on Map Page

**Files:**
- Modify: `src/routes/map/+page.svelte`
- Create: `src/lib/components/ResetButton.svelte`

- [ ] **Step 1: Create ResetButton component**

Create `src/lib/components/ResetButton.svelte`:

```svelte
<script lang="ts">
  interface Props {
    onReset: () => void;
  }

  let { onReset }: Props = $props();
</script>

<button class="reset-btn" onclick={onReset} aria-label="Reset map view to defaults">
  Reset View
</button>

<style>
  .reset-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    background: var(--color-map-panel);
    border: 1px solid rgba(255,255,255,0.15);
    color: var(--color-map-text-primary);
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    z-index: 5;
  }
  .reset-btn:hover { background: rgba(50, 44, 34, 0.95); }
  .reset-btn:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 2px; }
</style>
```

- [ ] **Step 2: Update map page to include all components**

Update `src/routes/map/+page.svelte` to import and wire EventFilters, TimelineScrubber, PersonPanel, and ResetButton. Connect timeline year changes to Mapbox filter expressions. Connect event filter changes to Mapbox filter expressions. Connect person panel open/close to marker clicks. Connect reset to fitToData + clear filters + reset timeline.

The key integration is building a combined Mapbox filter expression from both the timeline state and the active event type filters:

```ts
function buildMapFilter(year: number, activeTypes: EventType[]): any[] {
  return [
    'all',
    ['<=', ['get', 'year'], year],
    ['in', ['get', 'type'], ['literal', activeTypes]]
  ];
}
```

Apply this filter via `mapView.setFilter(filter)` whenever timeline year or event filters change.

- [ ] **Step 3: Verify full flow works**

```bash
npm run dev
```

Test: Upload sample.ged → Pick generations → Map with markers, timeline, filters, person panel all working.

- [ ] **Step 4: Commit**

```bash
git add src/routes/map/+page.svelte src/lib/components/ResetButton.svelte
git commit -m "feat: wire map page with filters, timeline, person panel, and reset button"
```

---

## Task 14: List View (Accessible Alternative)

**Files:**
- Create: `src/lib/components/ListView.svelte`

- [ ] **Step 1: Create the ListView component**

Create `src/lib/components/ListView.svelte`:

```svelte
<script lang="ts">
  import { getTree } from '$lib/stores/tree.svelte.js';
  import { EVENT_TYPES } from '$lib/constants.js';
  import type { Person } from '$lib/types.js';

  interface Props {
    maxGeneration: number;
    onPersonClick: (personId: string) => void;
  }

  let { maxGeneration, onPersonClick }: Props = $props();
  const tree = getTree();

  let sortField = $state<'name' | 'generation' | 'birthYear'>('generation');
  let sortAsc = $state(true);

  let people = $derived(() => {
    if (!tree.data) return [];
    let filtered = tree.data.people.filter(p => p.generation >= 0 && p.generation <= maxGeneration);

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'generation') cmp = a.generation - b.generation;
      else {
        const aBirth = tree.data!.index.personSummary.get(a.id)?.birthYear ?? 0;
        const bBirth = tree.data!.index.personSummary.get(b.id)?.birthYear ?? 0;
        cmp = aBirth - bBirth;
      }
      return sortAsc ? cmp : -cmp;
    });

    return filtered;
  });

  function toggleSort(field: typeof sortField) {
    if (sortField === field) sortAsc = !sortAsc;
    else { sortField = field; sortAsc = true; }
  }

  function getBirthDeath(personId: string) {
    const summary = tree.data?.index.personSummary.get(personId);
    return {
      birth: summary?.birthYear ?? '—',
      death: summary?.deathYear ?? '—'
    };
  }
</script>

<div class="list-view">
  <table>
    <thead>
      <tr>
        <th>
          <button onclick={() => toggleSort('name')} aria-label="Sort by name">
            Name {sortField === 'name' ? (sortAsc ? '↑' : '↓') : ''}
          </button>
        </th>
        <th>
          <button onclick={() => toggleSort('generation')} aria-label="Sort by generation">
            Gen {sortField === 'generation' ? (sortAsc ? '↑' : '↓') : ''}
          </button>
        </th>
        <th>
          <button onclick={() => toggleSort('birthYear')} aria-label="Sort by birth year">
            Born {sortField === 'birthYear' ? (sortAsc ? '↑' : '↓') : ''}
          </button>
        </th>
        <th>Died</th>
      </tr>
    </thead>
    <tbody>
      {#each people() as person}
        {@const bd = getBirthDeath(person.id)}
        <tr>
          <td>
            <button class="person-link" onclick={() => onPersonClick(person.id)}>
              {person.name}
            </button>
          </td>
          <td>{person.generation}</td>
          <td>{bd.birth}</td>
          <td>{bd.death}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .list-view {
    position: absolute;
    inset: 0;
    background: var(--color-map-bg);
    overflow-y: auto;
    padding: 16px;
    z-index: 20;
  }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    padding: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    color: var(--color-map-text-secondary);
    font-size: 12px;
  }
  th button {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: inherit;
    font-weight: 600;
  }
  td {
    padding: 8px;
    color: var(--color-map-text-primary);
    font-size: 13px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .person-link {
    background: none;
    border: none;
    color: var(--color-gold);
    cursor: pointer;
    font-size: 13px;
    text-align: left;
    padding: 0;
  }
  .person-link:hover { text-decoration: underline; }
</style>
```

- [ ] **Step 2: Add view toggle to map page**

Add a "Map / List" toggle button to `src/routes/map/+page.svelte` that shows/hides the ListView.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/ListView.svelte src/routes/map/+page.svelte
git commit -m "feat: add accessible list view as alternative to map"
```

---

## Task 15: Return Visit + Data Management

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add return visit check to landing page**

Update `src/routes/+page.svelte` to check IndexedDB on mount for existing data. If found, show: "Welcome back! Load your saved tree (N people) or upload a new file." with Load and Delete buttons.

- [ ] **Step 2: Add delete functionality**

The Delete button calls `db.delete()` to wipe IndexedDB, then resets the UI to the upload phase.

- [ ] **Step 3: Verify return visit flow**

Upload a file, navigate to map, close tab, reopen — should see the "Welcome back" prompt.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add return visit detection and data management"
```

---

## Task 16: Build Verification and Deploy Config

**Files:**
- Modify: `vercel.json`, `package.json`

- [ ] **Step 1: Verify full build**

```bash
npm run build
```

Expected: Clean build, output in `build/`.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: Preview the production build**

```bash
npx vite preview
```

Expected: App loads, full flow works.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: verify build and fix any issues"
```

---

## Summary

| Task | What it builds | Key files |
|------|---------------|-----------|
| 1 | Project scaffolding | svelte.config.js, app.css, vercel.json |
| 2 | Types & constants | types.ts, constants.ts |
| 3 | IndexedDB layer | db/index.ts |
| 4 | GEDCOM parser | gedcom/transform.ts, worker.ts, parser.ts |
| 5 | Geocoding pipeline | geo/geocoder.ts, common-places.ts, geonames.ts |
| 6 | Svelte stores | stores/tree, timeline, filters |
| 7 | Map GeoJSON source | map/source.ts, icons.ts |
| 8 | Landing page + upload | UploadZone, ParseProgress, GenerationPicker |
| 9 | Map view page | MapView, GeocodingProgress |
| 10 | Event filters | EventFilters.svelte |
| 11 | Timeline scrubber | TimelineScrubber.svelte |
| 12 | Person panel | PersonPanel.svelte |
| 13 | Wire everything | map/+page.svelte integration |
| 14 | List view | ListView.svelte |
| 15 | Return visits | Data management on landing |
| 16 | Build verification | Final build + test pass |
