export async function searchGeoNames(
	query: string
): Promise<{ lat: number; lng: number; name: string } | null> {
	try {
		const params = new URLSearchParams({
			q: query,
			maxRows: '1',
			username: 'demo',
			type: 'json'
		});
		const url = `https://secure.geonames.org/searchJSON?${params}`;
		const response = await fetch(url);
		if (!response.ok) return null;
		const data = await response.json();
		if (!data.geonames || data.geonames.length === 0) return null;
		const result = data.geonames[0];
		return {
			lat: parseFloat(result.lat),
			lng: parseFloat(result.lng),
			name: result.name
		};
	} catch {
		return null;
	}
}
