// "Your Dionysus" vibe-match graph — deterministic, computed from real check-in
// data (reports). For the current user vs every other user we blend three
// signals into a 0-100 match %. Tune the weights here.
import { STATUS_VALUE, type Status } from '../pulse';

export const W_SPOTS = 0.5; // Jaccard overlap of visited spots
export const W_CATEGORIES = 0.3; // Jaccard overlap of frequented categories
export const W_BUSY = 0.2; // similarity in busyness preference

const PALETTE = ['#f3aab4', '#aeb6f2', '#f6d49b', '#a6e0d3', '#cdb8f0', '#f4b8d6', '#a9d8f0', '#f6c6a0'];

export type Friend = {
  id: string; // identity hex
  name: string;
  avatarUrl?: string;
  initials: string;
  color: string;
  matchPct: number;
  mutualCount: number;
  sharedCategories: string[];
  sharedSpots: string[];
};

type ReportLite = { reporterHex: string; spotId: bigint; status: Status };
type Agg = { spots: Set<bigint>; cats: Map<string, number>; busySum: number; busyN: number };

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function initialsOf(handle: string): string {
  const letters = handle.replace(/[^a-zA-Z]/g, '');
  return (letters.slice(0, 2) || '··').toUpperCase();
}
function nameOf(handle: string): string {
  const w = handle.replace(/^@/, '').split(/[_\s]/)[0] || handle;
  return w.charAt(0).toUpperCase() + w.slice(1);
}
function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export type VibeMatchResult = { friends: Friend[]; hasHistory: boolean };

export function computeVibeMatches(input: {
  myHex: string;
  reports: ReportLite[];
  spotsById: Map<bigint, { name: string; category: string }>;
  resolveHandle: (hex: string) => string;
  max?: number;
}): VibeMatchResult {
  const { myHex, reports, spotsById, resolveHandle, max = 6 } = input;

  const byUser = new Map<string, Agg>();
  for (const r of reports) {
    let a = byUser.get(r.reporterHex);
    if (!a) byUser.set(r.reporterHex, (a = { spots: new Set(), cats: new Map(), busySum: 0, busyN: 0 }));
    a.spots.add(r.spotId);
    const cat = spotsById.get(r.spotId)?.category;
    if (cat) a.cats.set(cat, (a.cats.get(cat) ?? 0) + 1);
    const v = STATUS_VALUE[r.status];
    if (v !== undefined) {
      a.busySum += v;
      a.busyN += 1;
    }
  }

  const me = byUser.get(myHex);
  const hasHistory = !!me && me.spots.size > 0;
  if (!hasHistory) return { friends: [], hasHistory: false };

  const myBusy = me!.busyN ? me!.busySum / me!.busyN : 0;
  const myCats = new Set(me!.cats.keys());

  const friends: Friend[] = [];
  for (const [hex, a] of byUser) {
    if (hex === myHex || a.spots.size === 0) continue;
    const jSpots = jaccard(me!.spots, a.spots);
    const jCats = jaccard(myCats, new Set(a.cats.keys()));
    const theirBusy = a.busyN ? a.busySum / a.busyN : 0;
    const busySim = 1 - Math.abs(myBusy - theirBusy) / 100;
    const score = W_SPOTS * jSpots + W_CATEGORIES * jCats + W_BUSY * busySim;
    const matchPct = Math.max(0, Math.min(100, Math.round(score * 100)));

    // mutual spots + shared categories/spot names
    const mutual: bigint[] = [];
    for (const s of a.spots) if (me!.spots.has(s)) mutual.push(s);
    const sharedCategories = [...a.cats.keys()]
      .filter(c => myCats.has(c))
      .sort((x, y) => (a.cats.get(y)! + (me!.cats.get(y) ?? 0)) - (a.cats.get(x)! + (me!.cats.get(x) ?? 0)))
      .slice(0, 3);
    const sharedSpots = mutual
      .map(id => spotsById.get(id)?.name)
      .filter((n): n is string => !!n)
      .slice(0, 3);

    const handle = resolveHandle(hex);
    friends.push({
      id: hex,
      name: nameOf(handle),
      initials: initialsOf(handle),
      color: PALETTE[hash(hex) % PALETTE.length],
      matchPct,
      mutualCount: mutual.length,
      sharedCategories,
      sharedSpots,
    });
  }

  friends.sort((a, b) => b.matchPct - a.matchPct || b.mutualCount - a.mutualCount);
  return { friends: friends.slice(0, max), hasHistory: true };
}

// Templated "why you match" — used as fallback when the LLM is off.
export function whyMatch(f: Friend): string {
  const cat = f.sharedCategories[0];
  const spot = f.sharedSpots[0];
  if (cat && spot) return `You both love ${cat} — like ${spot}.`;
  if (cat) return `You both gravitate toward ${cat} spots.`;
  if (spot) return `You've both been to ${spot}.`;
  if (f.mutualCount > 0) return `You share ${f.mutualCount} spot${f.mutualCount === 1 ? '' : 's'}.`;
  return `Similar taste in how you like the city.`;
}
