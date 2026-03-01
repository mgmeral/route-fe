export interface LatLng {
  lat: number;
  lng: number;
}

const geocodeCache = new Map<string, LatLng>();
const inflightRequests = new Map<string, Promise<LatLng | null>>();

const isAirportCode = (code: string) => /^[A-Z]{3}$/.test(code);

/**
 * Build a search query string from location fields.
 * Combines name, city, and country when available for better results.
 * For 3-letter airport codes, appends "airport" to reduce ambiguity.
 */
export const buildGeoQuery = (
  name: string,
  code?: string,
  city?: string,
  country?: string,
): string => {
  const parts: string[] = [];

  if (name) parts.push(name);

  if (code && isAirportCode(code.toUpperCase())) {
    // Include explicit "airport" hint for IATA codes
    if (!name.toLowerCase().includes('airport')) {
      parts.push(`${code.toUpperCase()} airport`);
    }
  }

  if (city && city.toLowerCase() !== name.toLowerCase()) {
    parts.push(city);
  }
  if (country) {
    parts.push(country);
  }
  return parts.join(', ').trim();
};

/**
 * Geocode a query string using OpenStreetMap Nominatim.
 * Results are cached in memory so repeated calls don't re-query.
 * Concurrent duplicate requests are deduplicated.
 */
export const geocode = async (
  query: string,
  signal?: AbortSignal,
): Promise<LatLng | null> => {
  const key = query.trim().toLowerCase();
  if (!key) return null;

  // Return from cache if available
  const cached = geocodeCache.get(key);
  if (cached) return cached;

  // Deduplicate in-flight requests for the same query
  const inflight = inflightRequests.get(key);
  if (inflight) return inflight;

  const request = (async (): Promise<LatLng | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        signal,
        headers: { 'Accept-Language': 'en' },
      });

      if (!response.ok) {
        return null;
      }

      const data: Array<{ lat: string; lon: string }> = await response.json();
      if (data.length === 0) {
        return null;
      }

      const result: LatLng = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };

      geocodeCache.set(key, result);
      return result;
    } catch {
      return null;
    } finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, request);
  return request;
};

/** Small delay helper for rate-limiting. */
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface GeocodedStop {
  query: string;
  label: string;
  coords: LatLng | null;
}

/**
 * Geocode an ordered list of stops sequentially with a small delay between
 * calls to respect Nominatim rate limits. Reports progress via callback.
 * Skips delay for cache hits.
 * If a stop has a fallbackQuery and the primary query fails, retries with it.
 */
export const geocodeSequential = async (
  stops: { query: string; label: string; fallbackQuery?: string }[],
  signal: AbortSignal,
  onProgress?: (completed: number, total: number) => void,
): Promise<GeocodedStop[]> => {
  const results: GeocodedStop[] = [];

  for (let i = 0; i < stops.length; i++) {
    if (signal.aborted) break;

    const { query, label, fallbackQuery } = stops[i];
    const key = query.trim().toLowerCase();
    const isCached = geocodeCache.has(key);

    let coords = await geocode(query, signal);

    // If primary query failed and there is a fallback, try it
    if (!coords && fallbackQuery) {
      if (!isCached) await delay(300);
      coords = await geocode(fallbackQuery, signal);
    }

    results.push({ query, label, coords });

    onProgress?.(i + 1, stops.length);

    // Rate-limit: 300ms gap between actual network requests
    if (!isCached && i < stops.length - 1) {
      await delay(300);
    }
  }

  return results;
};

/**
 * Build a Google Maps search URL for a location query.
 */
export const googleMapsSearchUrl = (query: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/**
 * Build a Google Maps directions URL with optional waypoints.
 * Accepts LatLng or string for each point.
 */
export const googleMapsDirectionsUrl = (
  origin: string | LatLng,
  destination: string | LatLng,
  waypoints?: (string | LatLng)[],
): string => {
  const fmt = (p: string | LatLng) =>
    typeof p === 'string' ? p : `${p.lat},${p.lng}`;

  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(fmt(origin))}&destination=${encodeURIComponent(fmt(destination))}`;

  if (waypoints && waypoints.length > 0) {
    const wp = waypoints.map((w) => encodeURIComponent(fmt(w))).join('|');
    url += `&waypoints=${wp}`;
  }

  return url;
};

