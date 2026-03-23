export interface Person {
	id: string;
	name: string;
	givenName?: string;
	surname?: string;
	sex?: 'M' | 'F' | 'U';
	birthDate?: string;
	deathDate?: string;
	generation?: number;
}

export interface Event {
	id: string;
	personId: string;
	type: string;
	date?: string;
	place?: string;
	latitude?: number;
	longitude?: number;
	year?: number;
}

export interface Family {
	id: string;
	husbandId?: string;
	wifeId?: string;
	childIds: string[];
}

export interface GeoCache {
	place: string;
	latitude: number;
	longitude: number;
	source: string;
	timestamp: number;
}

export interface EventTypeConfig {
	label: string;
	color: string;
	icon: string;
}
