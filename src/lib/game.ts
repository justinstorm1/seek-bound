export const METERS_PER_MILE = 1609.344;
export const METERS_PER_FOOT = 0.3048;
export const STARTING_DELAY_MS = 6000;

/** Great-circle distance between two lat/lng points, in meters. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatClock(msRemaining: number): string {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} hr` : `${h} hr ${rem} min`;
}

export function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.round(seconds / 60);
  return `${m} min`;
}

/** Distance in miles → a "1,320 ft" / "0.75 mi" style label. */
export function formatRadius(meters: number): string {
  const miles = meters / METERS_PER_MILE;
  if (miles >= 0.25) return `${miles.toFixed(2)} mi`;
  return `${Math.round(meters / METERS_PER_FOOT)} ft`;
}

export function formatDistance(meters: number): string {
  if (meters < METERS_PER_MILE) return `${Math.round(meters / METERS_PER_FOOT)} ft`;
  return `${(meters / METERS_PER_MILE).toFixed(1)} mi`;
}

export function formatAgo(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return `${m}m ago`;
}

export type NumericOption = { label: string; value: number };

// Play-area diameter, in miles. Circle radius on the map is half of this.
export const DIAMETER_MIN_MILES = 0.1;
export const DIAMETER_MAX_MILES = 1;
export const DIAMETER_STEP_MILES = 0.05;
export const DIAMETER_DEFAULT_MILES = 0.5;

export const DURATION_OPTIONS: NumericOption[] = [
  { label: '15m', value: 15 * 60 },
  { label: '30m', value: 30 * 60 },
  { label: '45m', value: 45 * 60 },
  { label: '1h', value: 60 * 60 },
  { label: '1h30', value: 90 * 60 },
  { label: '2h', value: 120 * 60 },
];

export const PING_OPTIONS: NumericOption[] = [
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '2m', value: 120 },
  { label: '5m', value: 300 },
];

export const SEEKER_OPTIONS: NumericOption[] = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
];

export function roleLabel(role: string): string {
  if (role === 'hider') return 'Hider';
  if (role === 'seeker') return 'Seeker';
  return 'Waiting';
}
