# My Past Map — Design Spec

## Overview

My Past Map is a web application that lets users upload a GEDCOM genealogy file and visualize their ancestors on an interactive map with time-travel controls. Users can scrub through time, step by generation, toggle life event types, and explore their family history geographically.

**Target audience:** Hobby genealogists who already maintain a family tree in FamilySearch, Ancestry, MyHeritage, Gramps, or similar platforms.

**Key value proposition:** A new way to experience genealogy data — not as a tree diagram, but as a living map that shows where your ancestors were born, married, lived, and died across time and place.

## Goals

- Let users see their ancestry geographically, across time
- Support all major genealogy platforms via GEDCOM file upload
- Keep user data private — everything runs in the browser, no backend
- Provide smooth, animated time-travel through generations
- Handle large trees (up to 10-12 generations) without performance degradation

## Non-Goals

- Not a genealogy research tool (no editing, no source citations)
- No FamilySearch API integration (GEDCOM upload only)
- No user accounts or server-side data storage
- No LLM-powered geocoding (v1 — may add later via serverless function)
- No mobile-native app (responsive web only)

## Tech Stack

- **Svelte/SvelteKit** — Frontend framework, static SPA adapter (no server)
- **Mapbox GL JS** — WebGL-based interactive map rendering
- **Dexie.js** — IndexedDB wrapper for client-side caching
- **GEDCOM parser** — Client-side JS library for parsing `.ged` files
- **Vercel** — Static hosting with custom domain support
- **GeoNames** — Fallback geocoding for historical place names

## Architecture

```
┌───────────────────────────────────────────────────┐
│                  Svelte SPA (Browser)              │
│                                                    │
│  ┌──────────┐ ┌───────────┐ ┌──────────────────┐ │
│  │ Landing  │ │ Map View  │ │ Person Detail    │ │
│  │ Page     │ │ (Mapbox)  │ │ Panel            │ │
│  └──────────┘ └───────────┘ └──────────────────┘ │
│  ┌──────────────────────────────────────────────┐ │
│  │ Timeline Scrubber + Generation Steps +       │ │
│  │ Event Type Filters                           │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌────────────────┐  ┌─────────────────────────┐  │
│  │ GEDCOM Parser  │  │ IndexedDB Cache         │  │
│  │ (web worker)   │  │ • Parsed tree data      │  │
│  └────────────────┘  │ • Geocoded coordinates  │  │
│                      └─────────────────────────┘  │
│                                                    │
└──────────────────────────────────────────────────-─┘
           │ HTTPS (map tiles + geocoding only)
┌──────────┴──────────┐
│ Mapbox APIs         │
│ • Map tiles         │
│ • Geocoding         │
└─────────────────────┘
```

Everything runs in the browser. The only external services are Mapbox (map tiles + geocoding) and GeoNames (historical place name resolution). User data never leaves the browser except for location strings sent to geocoding APIs.

## Data Model

### Person
| Field | Type | Description |
|-------|------|-------------|
| id | string | GEDCOM individual ID (e.g., `@I123@`) |
| name | string | Full name |
| gender | string | M / F / Unknown |
| generation | number | 0 = user, 1 = parents, 2 = grandparents, etc. |
| parentFamilyId | string | Family they are a child in |
| spouseFamilyIds | string[] | Families they are a spouse in |

### Event
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique event ID |
| personId | string | Which person this event belongs to |
| type | string | birth, death, marriage, burial, immigration, etc. |
| date | object | Parsed date (year at minimum, full date if available) |
| locationText | string | Raw location string from GEDCOM |
| lat | number | Geocoded latitude (null until geocoded) |
| lng | number | Geocoded longitude (null until geocoded) |

### Family
| Field | Type | Description |
|-------|------|-------------|
| id | string | GEDCOM family ID (e.g., `@F45@`) |
| spouse1Id | string | First spouse |
| spouse2Id | string | Second spouse |
| childIds | string[] | Children in this family |

### GeoCache
| Field | Type | Description |
|-------|------|-------------|
| locationString | string | Raw location text (primary key) |
| lat | number | Geocoded latitude |
| lng | number | Geocoded longitude |
| confidence | string | high / medium / low — how confident the geocoding match is |

### In-Memory Index (Performance)

A lightweight in-memory index is built at parse time for fast timeline operations:

- **Time-sorted event array** — All events sorted by date, enabling binary search for the visible time window
- **Generation boundary years** — Pre-computed first/last event year per generation for O(1) generation stepping
- **Person summary map** — `Map<id, {name, birthYear, deathYear}>` for quick lookups without hitting IndexedDB

Full person records (notes, sources, all relationships) are stored in IndexedDB and loaded on demand when the person detail panel opens.

## User Flow

### 1. Landing Page

A warm parchment-toned landing page with:
- Hero text: "See where your ancestors lived, traveled, and called home."
- Drag-and-drop upload zone (also click-to-browse via hidden file input)
- One-line context visible by default: "Export a GEDCOM file from FamilySearch, Ancestry, or your genealogy software"
- Expandable detailed per-platform export instructions
- Trust badges: "Your data stays in your browser" / "No account required" / "Works with any genealogy platform"

### 2. Upload & Parse

- Validate file: check `.ged` extension and `0 HEAD` header. Enforce max file size (50 MB). Show clear error for invalid files.
- Parse in a **web worker** (always, not just for large files). Stream results back in chunks (per-family or per-100 people) so the UI can show progress.
- Use `Transferable` objects when posting results back to avoid cloning overhead.
- Display progress: "Parsing your family tree... 45%"

### 3. Generation Picker

- Slider: "How many generations to display?" Default 5, max 10-12 (capped).
- Instant filtering since data is already parsed.
- At selections of 8+, show inline note: "You have data for N of M possible ancestors at this depth" to set expectations about data sparsity.
- Use native `<input type="range">` with proper `<label>` and `aria-valuetext`.

### 4. Geocoding

Pipeline:
1. Deduplicate location strings across all events
2. Check IndexedDB cache for previously geocoded locations
3. Check embedded dictionary of ~500 most common ancestral place names (London, Dublin, Hamburg, etc.)
4. Send uncached locations to Mapbox Geocoding API (batch with 5-10 concurrent requests, respecting 600/min rate limit)
5. Fall back to GeoNames for historical place names that Mapbox can't resolve
6. Persist results to IndexedDB immediately per-location (batch writes via `bulkPut()`)

Progress display: Show live feed of what's being resolved — "Resolving 'Württemberg, Germany'... found" — with progress count and estimated time remaining.

Map renders incrementally as locations resolve — no need to wait for all geocoding to complete.

Failures are flagged with confidence: low and the raw location text is preserved.

### 5. Map View

Full-screen Mapbox GL map. This is where users spend most of their time.

#### Map Rendering (Performance-Critical)

- Use a **single GeoJSON source** with circle/symbol layers — NOT individual `mapboxgl.Marker` DOM elements. This renders via WebGL with no DOM overhead and scales to tens of thousands of features.
- Use **Mapbox `filter` expressions** for both timeline filtering (`['<=', ['get', 'year'], currentYear]`) and event-type toggles (`['in', ['get', 'type'], ['literal', ['birth', 'death']]]`). Filters execute on the GPU.
- Enable **marker clustering** with `clusterRadius: 50` and `clusterMaxZoom: 14`. Cluster labels show count.

#### Markers

- **Color AND shape/icon** per event type — not color alone (accessibility requirement for color-blind users):
  - Birth: gold, star icon
  - Death: slate/gray, cross icon
  - Marriage: warm rose/pink, ring icon
  - Immigration/Emigration: teal, arrow icon
  - Military: olive, shield icon
  - Other events: amber, circle icon
- Marker size decreases for older generations
- "Uncertain location" markers use a dashed outline with a question mark indicator
- Undated events: markers remain always visible at reduced opacity with a notice: "N ancestors without dates are always shown"

#### Event Filters (top-left overlay)

- Native `<input type="checkbox">` elements (can be visually styled)
- Show event counts: "Birth (312)" / "Death (287)"
- Only shows event types present in the uploaded data
- Toggling updates Mapbox layer filters (GPU-side, near-instant)

#### Person Detail Panel (right side slide-out)

- Opens on marker click. Shows:
  - Name, generation number, relationship label (e.g., "Generation 3 · Great-Grandmother")
  - All life events in chronological order, each with colored icon, event type, date, and location
  - **Family navigation links**: clickable names for spouse(s), parents, and children. Clicking re-centers the map and opens their panel.
- Close button with `aria-label="Close person details"`, also closes on Escape key
- Focus management: focus moves to panel heading on open, returns to triggering marker on close
- Full person record loaded from IndexedDB on demand (not kept in memory for all people)

#### Timeline Scrubber (bottom bar)

- **Play/pause button** — Uses `requestAnimationFrame` for smooth animation (not `setInterval`). `aria-label` toggles between "Play timeline" / "Pause timeline".
- **Draggable scrubber** — Native `<input type="range">` or `role="slider"` with full ARIA attributes (`aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext` showing the year). Arrow keys for keyboard control.
- **Year display** — Large, prominent current year indicator
- **Generation tick marks** — Visual markers on the scrubber showing generation boundaries. Use `aria-label` (not `title` attribute).
- **Generation step buttons** — "Previous Generation" / "Next Generation" with `aria-label`. Jumps the scrubber to the pre-computed generation boundary year and fits the map to those ancestors' locations.
- **"Jump to Generation" dropdown** — Select a specific generation number, animates the timeline and map.
- **Animation performance**: Pre-sorted event array + binary search. Compute only the delta (events entering/leaving the visible range) per frame. Throttle source updates if needed. Periodically announce current year via `aria-live` during playback (every ~10 years or at generation boundaries).

#### Reset View Button

Persistent button in a fixed position. Resets: map bounds to fit all data, timeline to present, all filters enabled, detail panel closed.

### 6. List View (Accessible Alternative)

Toggle between "Map view" and "List view". List view shows a table/list of all ancestors with columns for name, generation, birth date/location, death date/location, and other events. Sortable and filterable. Provides equivalent access to the genealogy data for screen reader users.

### 7. Return Visits

If IndexedDB contains a cached tree, offer: "Welcome back! Load your saved tree (Smith Family, 2,847 people) or upload a new file."

**Data management area**: Show stored tree name, people count, upload date, storage usage. "Delete my data" button that wipes the IndexedDB database.

## Visual Style — Burnished Gold

### Landing Page
- Background: warm parchment gradient (`#faf4e8` → `#efe3c8`)
- Primary accent: dark gold (`#b8860b`)
- Headings: serif font (Georgia), dark brown (`#2a2118`)
- Body text: `#5c4a32` minimum (must meet 4.5:1 contrast ratio against parchment)
- Secondary text: `#6b5a48` minimum

### Map View
- Background: dark warm brown (`#1e1a14`)
- Panel/overlay backgrounds: `rgba(30, 26, 20, 0.95)`
- Text on dark: `#d4c4a0` for primary, `#a08b6d` minimum for secondary (must meet 4.5:1)
- Scrubber accent: dark gold (`#b8860b`)
- All text colors must be verified against WCAG AA 4.5:1 for normal text, 3:1 for large text

### Marker Colors
- Birth: gold (`#e8a84c`)
- Death: muted sage (`#5a8f6a`)
- Marriage: deep rose (`#c75643`)
- Immigration: teal
- Other: warm brown (`#9a7b5a`)

## Security

### Mapbox Token
- Token is embedded in the client bundle (unavoidable for static SPA)
- **Mitigations**: Lock token to production domain(s) via Mapbox URL restrictions. Create separate unrestricted token for local dev only. Set usage alerts and hard spending caps on Mapbox account. Grant minimum scopes (tiles, read, fonts, geocoding only).

### Input Sanitization
- Treat all GEDCOM-parsed strings as untrusted
- Use Svelte's default `{value}` text interpolation (auto-escapes HTML)
- Never use `{@html}` with GEDCOM-derived data
- Validate file structure: check for `0 HEAD` header, enforce 50 MB size limit, set parser recursion/depth limits

### Privacy
- Display privacy notice informing users that location strings are sent to Mapbox and GeoNames for geocoding
- Consider stripping house numbers/exact addresses before geocoding (send city/region/country only)
- Cache geocoding aggressively to minimize API calls with user data

### HTTP Security Headers (Vercel config)
- Content Security Policy: `default-src 'self'; script-src 'self'; connect-src 'self' https://api.mapbox.com https://*.tiles.mapbox.com https://api.geonames.org; img-src 'self' blob: data: https://*.mapbox.com;`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), camera=(), microphone=()`
- Subresource Integrity (SRI) for any CDN-loaded resources

## Accessibility (WCAG 2.1 AA)

### Semantic Structure
- Landmark regions: `<header>`, `<nav>`, `<main>`, `<aside>` (person panel), labeled `<section>` for timeline
- Proper heading hierarchy
- Skip links: "Skip to main content", "Skip to timeline controls"

### Interactive Controls
- All controls use native HTML elements or proper ARIA roles
- File upload: hidden `<input type="file">` with visible `<label>` and `role="button"` on drop zone
- Filter toggles: native `<input type="checkbox">`
- Timeline: native `<input type="range">` or `role="slider"` with full ARIA
- Buttons: proper `aria-label` on all icon-only buttons

### Dynamic Content
- `aria-live="polite"` regions for parsing progress, geocoding progress
- `role="alert"` for error messages
- Focus management on view transitions (landing → map, panel open/close)
- Escape key closes person detail panel

### Color & Contrast
- No information conveyed by color alone (shapes/icons supplement colors)
- All text meets 4.5:1 contrast ratio (normal text) or 3:1 (large text)
- Emojis used as icons replaced with SVG icons with controlled `aria-label` or `aria-hidden`

### Map Accessibility
- Map container has `aria-label` describing its purpose
- Markers are keyboard-focusable with accessible names
- List view provides equivalent non-visual access to all data
- Cluster expansion is keyboard-operable

## Performance Considerations

### Rendering
- Single GeoJSON source with Mapbox layers (not DOM markers)
- GPU-side filtering via Mapbox expressions
- Clustering with `clusterRadius: 50`, `clusterMaxZoom: 14`
- Lazy-load Mapbox GL JS after landing page renders (~230KB gzipped)

### Timeline Animation
- Pre-sorted event array with binary search for visible window
- Delta computation per frame (only events entering/leaving)
- `requestAnimationFrame` with frame budgeting (bail if >12ms elapsed)
- Throttle source updates to ~20-30fps if needed

### Data Management
- Lightweight in-memory index (~5MB for 8,000 people)
- Full records in IndexedDB, loaded on demand
- Batch IndexedDB writes via `bulkPut()` during geocoding
- Embedded dictionary of ~500 common place names to avoid API calls

### Parsing
- Always in web worker (not optional for large files)
- Stream results back in chunks via `Transferable` objects
- Progressive UI updates during parse

### GeoNames CORS
- GeoNames API may lack CORS headers. If so, proxy through a Vercel edge function (single lightweight function, not a full backend). Test during implementation and add if needed.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid file | Clear error: "This doesn't appear to be a valid GEDCOM file." with `role="alert"` |
| File too large | "File exceeds 50 MB limit. Try exporting fewer generations." |
| No location data | People shown in list/panel but not on map. Notice: "N ancestors had no location data." |
| No date data | Markers visible at reduced opacity, excluded from timeline animation. Notice shown. |
| Geocoding failure | "Uncertain location" marker style (dashed outline + question mark). Raw text visible in tooltip. |
| Browser storage full | Graceful degradation — app works, re-geocodes next visit. Warning shown. |
| Mapbox tile load failure (offline) | "Map tiles unavailable offline. Your ancestor data is still saved." |

## Deployment

- **Platform**: Vercel (free tier)
- **Build**: `npm run build` produces static HTML/JS/CSS via SvelteKit static adapter
- **Auto-deploy**: Connected to GitHub repo, deploys on push
- **Custom domain**: DNS CNAME to Vercel, automatic SSL
- **Environment variable**: `MAPBOX_ACCESS_TOKEN` (set in Vercel dashboard, baked into build)

## Open Questions

1. Which GEDCOM JS parser library to use? (evaluate `gedcom.js`, `parse-gedcom`, `gedcom-js-parser` during implementation)
2. Exact Mapbox map style — default streets, satellite, or a custom vintage-toned style?
3. GeoNames CORS behavior — test during implementation, add Vercel edge proxy if needed
4. Embedded place-name dictionary — source and size to be determined during implementation
