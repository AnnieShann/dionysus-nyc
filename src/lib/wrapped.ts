// "Your NYC, Wrapped" — deterministic, read-only stats computed from real
// SpacetimeDB data (the user's reports/vibes + the spots they touched). The LLM
// (api/wrapped.ts) may later re-phrase these, but never changes the numbers.
import { STATUS_VALUE, type Status } from '../pulse';
import { haversineMeters } from './recommend';

// Rough concurrent headcounts per logged busyness — tune freely.
export const CROWD: Record<Status, number> = {
  dead: 10,
  chill: 40,
  filling: 120,
  packed: 300,
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export type WrappedInput = {
  // the caller's own reports
  myReports: { spotId: bigint; status: Status; at: number }[];
  spotsById: Map<bigint, { latitude: number; longitude: number; name: string; category: string }>;
  // all reports (for the percentile) keyed by reporter hex
  allReports: { reporterHex: string; spotId: bigint }[];
  myHex: string;
};

export type WrappedStats = {
  places: number;
  people: number;
  peopleAnchor: string;
  distanceMi: number;
  distanceAnchor: string;
  archetype: string;
  archetypeBlurb: string;
  topCategory: string;
  avgBusy: number; // 0..100
  rhythm: string;
  percentile: number | null;
  headline: string;
  lowData: boolean;
};

function peopleAnchorFor(n: number): string {
  if (n >= 6000) return `≈ ${(n / 6000).toFixed(1)} sold-out Radio City Music Halls`;
  if (n >= 1000) return `≈ ${(n / 1000).toFixed(1)}k people — a small festival`;
  if (n >= 200) return `≈ ${Math.round(n / 200)} rush-hour subway cars`;
  if (n > 0) return `≈ a packed corner bar`;
  return `your crew, so far`;
}

function distanceAnchorFor(mi: number): string {
  if (mi >= 26.2) return `≈ ${(mi / 26.2).toFixed(1)} marathons`;
  if (mi >= 13.4) return `Manhattan end-to-end ${(mi / 13.4).toFixed(1)}×`;
  if (mi >= 1) return `${mi.toFixed(1)} mi on foot`;
  if (mi > 0) return `a few blocks — just warming up`;
  return `one great spot at a time`;
}

function archetypeFor(avgBusy: number, topCategory: string): { name: string; blurb: string } {
  if (avgBusy >= 70)
    return { name: 'Crowd Surfer', blurb: 'You chase the packed, buzzing rooms — the louder the better.' };
  if (avgBusy > 0 && avgBusy <= 32)
    return { name: 'Hidden-Gem Hunter', blurb: 'You seek out the quiet spots before everyone else finds them.' };
  const cat = topCategory.toLowerCase();
  if (cat === 'nightlife') return { name: 'Night Owl', blurb: 'The city gets better after dark, and you know it.' };
  if (cat === 'museum' || cat === 'landmark')
    return { name: 'Culture Vulture', blurb: 'Galleries, landmarks, and a sharp eye for the city’s stories.' };
  if (cat === 'park') return { name: 'Fresh-Air Forager', blurb: 'Green space and golden hour are your natural habitat.' };
  if (cat === 'shopping') return { name: 'Retail Therapist', blurb: 'You treat the city like one big, stylish marketplace.' };
  if (cat === 'food') return { name: 'Flavor Chaser', blurb: 'You map the city one great meal at a time.' };
  return { name: 'City Wanderer', blurb: 'A little bit of everything — you take the whole city in.' };
}

export function computeWrapped(input: WrappedInput): WrappedStats {
  const { myReports, spotsById, allReports, myHex } = input;

  // Distinct visited spots (with the user's latest logged status at each).
  const bySpot = new Map<bigint, { status: Status; firstAt: number }>();
  for (const r of myReports) {
    const cur = bySpot.get(r.spotId);
    if (!cur) bySpot.set(r.spotId, { status: r.status, firstAt: r.at });
    else {
      if (r.at < cur.firstAt) cur.firstAt = r.at;
      // keep the most recent status as "the vibe they logged"
      cur.status = r.status;
    }
  }
  const places = bySpot.size;

  // People you've been around — sum crowd estimate per visit.
  let people = 0;
  let busySum = 0;
  const catCount = new Map<string, number>();
  for (const [spotId, v] of bySpot) {
    people += CROWD[v.status] ?? 0;
    busySum += STATUS_VALUE[v.status] ?? 0;
    const sp = spotsById.get(spotId);
    if (sp) catCount.set(sp.category, (catCount.get(sp.category) ?? 0) + 1);
  }
  const avgBusy = places ? Math.round(busySum / places) : 0;

  // Distance traced — visited spots in visit order.
  const ordered = [...bySpot.entries()].sort((a, b) => a[1].firstAt - b[1].firstAt);
  let meters = 0;
  for (let i = 1; i < ordered.length; i++) {
    const a = spotsById.get(ordered[i - 1][0]);
    const b = spotsById.get(ordered[i][0]);
    if (a && b) meters += haversineMeters([a.latitude, a.longitude], [b.latitude, b.longitude]);
  }
  const distanceMi = meters / 1609.34;

  // Top category.
  let topCategory = 'spots';
  let topN = 0;
  for (const [c, n] of catCount) if (n > topN) ((topN = n), (topCategory = c));

  const { name: archetype, blurb: archetypeBlurb } = archetypeFor(avgBusy, topCategory);

  // Rhythm — most common day + part of day from report timestamps.
  const dayCount = new Array(7).fill(0);
  const hourCount = new Array(24).fill(0);
  for (const r of myReports) {
    const d = new Date(r.at);
    dayCount[d.getDay()]++;
    hourCount[d.getHours()]++;
  }
  let topDay = 0;
  for (let i = 0; i < 7; i++) if (dayCount[i] > dayCount[topDay]) topDay = i;
  let topHour = 0;
  for (let i = 0; i < 24; i++) if (hourCount[i] > hourCount[topHour]) topHour = i;
  const part = topHour < 5 ? 'late-night' : topHour < 12 ? 'morning' : topHour < 17 ? 'afternoon' : topHour < 21 ? 'evening' : 'night';
  const rhythm = myReports.length ? `${DAYS[topDay]} ${part}` : 'just getting started';

  // Percentile — only if enough other users have reported.
  const spotsByUser = new Map<string, Set<bigint>>();
  for (const r of allReports) {
    let s = spotsByUser.get(r.reporterHex);
    if (!s) spotsByUser.set(r.reporterHex, (s = new Set()));
    s.add(r.spotId);
  }
  let percentile: number | null = null;
  const counts = [...spotsByUser.entries()].map(([hex, s]) => ({ hex, n: s.size }));
  if (counts.length >= 5) {
    const mine = spotsByUser.get(myHex)?.size ?? 0;
    const fewer = counts.filter(c => c.hex !== myHex && c.n < mine).length;
    const others = counts.length - 1;
    if (others > 0) percentile = Math.round((fewer / others) * 100);
  }

  const lowData = places < 5;
  const headline = peopleAnchorFor(people);

  return {
    places,
    people,
    peopleAnchor: peopleAnchorFor(people),
    distanceMi,
    distanceAnchor: distanceAnchorFor(distanceMi),
    archetype,
    archetypeBlurb,
    topCategory,
    avgBusy,
    rhythm,
    percentile,
    headline,
    lowData,
  };
}
