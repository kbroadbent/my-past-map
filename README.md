# My Past Map

A privacy-first genealogy visualization tool that transforms GEDCOM family tree files into an interactive, time-based map experience. See where your ancestors lived, traveled, married, and died — across generations and through time.

## Features

- **GEDCOM Upload** — Drag-and-drop `.ged` files from FamilySearch, Ancestry, MyHeritage, Gramps, etc. Parsed entirely in the browser.
- **Interactive Map** — Explore ancestor locations on a Mapbox GL map with markers color-coded by generation (up to 12 generations).
- **Life Path Animations** — Animate individual ancestors' journeys across their lifetime, drawing connection lines between life events.
- **Event Filtering** — Toggle event types (birth, death, marriage, burial, immigration, military, census, residence) to focus on what matters.
- **Generation Navigation** — Step through generations with a slider and see person counts per generation.
- **Person Details** — Click any marker to view names, relationships, and navigate to related family members.
- **Privacy-First** — All data stays in your browser's IndexedDB. No server uploads, no accounts, no tracking. Only location strings are sent to geocoding APIs.
- **Persistent Storage** — Return later and pick up where you left off, or upload a new tree.

## Tech Stack

- **Svelte 5** + **SvelteKit** (static adapter)
- **Mapbox GL JS** for map rendering and geocoding
- **Dexie.js** for IndexedDB client-side storage
- **read-gedcom** for GEDCOM parsing
- **TypeScript**, **Vite**, **Vitest**

## Getting Started

```bash
npm install
npm run dev
```

Create a `.env` file with your Mapbox token:

```
VITE_MAPBOX_TOKEN=your_token_here
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build static site |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |

## How It Works

1. Upload a GEDCOM file
2. Pick how many generations to display
3. Locations are geocoded (Mapbox → GeoNames fallback) and cached locally
4. Explore the map — filter events, scrub the timeline, play life path animations

## Deployment

Builds to a static site via `@sveltejs/adapter-static`. Deploy anywhere: Vercel, Netlify, GitHub Pages, etc.
