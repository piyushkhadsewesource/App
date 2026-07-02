// ─────────────────────────────────────────────────────────────────────────
// Geography for The Compass Rose. City-level only, by design: each partner
// shares a *city*, never a live GPS position — enough for a needle and a
// distance, nothing that tracks anyone.
// ─────────────────────────────────────────────────────────────────────────

const R_EARTH_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance between two coordinates, in km. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial great-circle bearing from point 1 toward point 2, 0–360° from north. */
export function initialBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = rad(lat1);
  const φ2 = rad(lat2);
  const Δλ = rad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

export interface GeocodedCity {
  name: string; // "Mumbai, India"
  lat: number;
  lon: number;
}

/** 16-wind compass label for a bearing, e.g. 319° → "NW". */
export function cardinal16(bearing: number): string {
  const winds = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return winds[Math.round((((bearing % 360) + 360) % 360) / 22.5) % 16];
}

/**
 * Coarse city name for a coordinate via BigDataCloud's free keyless
 * reverse-geocoder (CORS-friendly, works on native and web). Null on any
 * failure — callers fall back to a generic label rather than erroring.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    if (!res.ok) return null;
    const json: any = await res.json();
    const city = json?.city || json?.locality || json?.principalSubdivision;
    if (!city) return null;
    const label = [city, json?.countryName].filter(Boolean).join(', ');
    return String(label).slice(0, 80);
  } catch {
    return null;
  }
}

/**
 * Resolve a typed city name via Open-Meteo's free geocoding API (no key,
 * CORS-friendly, works on native and web). Returns null on any failure —
 * network trouble should read as "couldn't find it", never crash.
 */
export async function geocodeCity(query: string): Promise<GeocodedCity | null> {
  const q = query.trim();
  if (q.length < 2) return null;
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`,
    );
    if (!res.ok) return null;
    const json: any = await res.json();
    const hit = json?.results?.[0];
    if (!hit || typeof hit.latitude !== 'number' || typeof hit.longitude !== 'number') return null;
    const label = [hit.name, hit.country].filter(Boolean).join(', ');
    return { name: label.slice(0, 80), lat: hit.latitude, lon: hit.longitude };
  } catch {
    return null;
  }
}
