import { EVENT_TYPES } from '../constants.js';

const ICON_SVGS: Record<string, string> = {
	star: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" fill="{{COLOR}}"/></svg>',
	cross: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M9,2h6v7h7v6h-7v7h-6v-7h-7v-6h7z" fill="{{COLOR}}"/></svg>',
	ring: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="{{COLOR}}" stroke-width="3"/></svg>',
	arrow: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><polygon points="12,2 22,12 16,12 16,22 8,22 8,12 2,12" fill="{{COLOR}}"/></svg>',
	shield: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12,2 L4,6 V12 C4,17 12,22 12,22 C12,22 20,17 20,12 V6 Z" fill="{{COLOR}}"/></svg>',
	circle: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="{{COLOR}}"/></svg>'
};

interface MapLike {
	hasImage(name: string): boolean;
	addImage(name: string, image: unknown): void;
}

export async function loadMarkerIcons(map: MapLike): Promise<void> {
	for (const [type, config] of Object.entries(EVENT_TYPES)) {
		const name = `marker-${type}`;
		if (map.hasImage(name)) continue;

		const svgTemplate = ICON_SVGS[config.icon] ?? ICON_SVGS.circle;
		const svg = svgTemplate.replace(/\{\{COLOR\}\}/g, config.color);

		if (typeof Image !== 'undefined') {
			const img = new Image(24, 24);
			img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
			map.addImage(name, img);
		} else {
			map.addImage(name, { svg, width: 24, height: 24 });
		}
	}
}
