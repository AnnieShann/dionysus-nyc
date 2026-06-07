// Client-side ranking of OUR seeded spots from the LLM's parsed filters.
// The LLM never invents places — it only produces these filters.

export type Filters = {
  categories: string[];
  maxPrice: number | null;
  busyness: 'any' | 'chill' | 'lively' | 'packed' | null;
  maxDistanceMeters: number | null;
  keywords: string[];
};

export const EMPTY_FILTERS: Filters = {
  categories: [],
  maxPrice: null,
  busyness: null,
  maxDistanceMeters: null,
  keywords: [],
};

export type Candidate = {
  id: bigint;
  name: string;
  category: string;
  lat: number;
  lng: number;
  price: number | null; // 1–4 from "$" count
  tags: string[];
  blurb: string;
  busyness: number | null; // composite score 0–100, or null (no data)
  waitMinutes: number | null;
};

export type Ranked = Candidate & { distanceMeters: number };

// Haversine distance in meters.
export function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Soft scoring (never hard-empties): always ranks by busyness + proximity, with
// boosts when the LLM gave category / keyword / price / distance hints.
export function rankCandidates(
  cands: Candidate[],
  filters: Filters,
  user: [number, number],
  limit = 6
): Ranked[] {
  const scored = cands.map(c => {
    const distanceMeters = haversineMeters(user, [c.lat, c.lng]);
    let s = 0;

    // proximity — closer is better (reference ~2.5km)
    s += 2.5 * (1 - Math.min(distanceMeters / 2500, 1));

    // busyness
    const b = c.busyness != null ? c.busyness / 100 : null;
    if (filters.busyness && filters.busyness !== 'any' && b != null) {
      if (filters.busyness === 'chill') s += 2.5 * (1 - b);
      else if (filters.busyness === 'packed') s += 2.5 * b;
      else if (filters.busyness === 'lively') s += 2.5 * (1 - Math.abs(b - 0.7));
    } else if (b != null) {
      // default: a mild nudge toward livelier spots that actually have data
      s += 1.2 * b;
    }

    // category (loose match both ways)
    if (filters.categories.length) {
      const cat = c.category.toLowerCase();
      const hit = filters.categories.some(f => {
        const x = f.toLowerCase().trim();
        return x.length > 0 && (cat.includes(x) || x.includes(cat));
      });
      if (hit) s += 3;
    }

    // keywords across name/category/tags/blurb
    if (filters.keywords.length) {
      const hay = `${c.name} ${c.category} ${c.tags.join(' ')} ${c.blurb}`.toLowerCase();
      const hits = filters.keywords.filter(w => w.trim() && hay.includes(w.toLowerCase().trim())).length;
      s += Math.min(hits, 3) * 1.5;
    }

    // price
    if (filters.maxPrice != null && c.price != null) {
      s += c.price <= filters.maxPrice ? 0.8 : -2.5;
    }

    // distance ceiling (soft)
    if (filters.maxDistanceMeters != null) {
      s += distanceMeters <= filters.maxDistanceMeters ? 0.5 : -3;
    }

    return { ...c, distanceMeters, _score: s };
  });

  scored.sort((a, b2) => b2._score - a._score);
  return scored.slice(0, limit).map(({ _score, ...rest }) => rest);
}

// "$$" → 2, etc.
export function priceLevel(price: string | undefined): number | null {
  if (!price) return null;
  const n = (price.match(/\$/g) || []).length;
  return n > 0 ? n : null;
}

export function distanceLabel(m: number): string {
  if (m < 950) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1609).toFixed(1)} mi`;
}
