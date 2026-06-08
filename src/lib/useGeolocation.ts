import { useEffect, useState } from 'react';

// Herald Square fallback so the demo never breaks if permission is denied.
export const HERALD_SQUARE: [number, number] = [40.7484, -73.9879];

export type UserLocation = { coords: [number, number]; isReal: boolean };

// Requests browser geolocation once; falls back to Herald Square. Coords are
// exposed for later distance use; they are NOT broadcast anywhere.
export function useGeolocation(): UserLocation {
  const [loc, setLoc] = useState<UserLocation>({ coords: HERALD_SQUARE, isReal: false });
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setLoc({ coords: [pos.coords.latitude, pos.coords.longitude], isReal: true }),
      () => {
        /* denied/unavailable — keep the Herald Square fallback */
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);
  return loc;
}
