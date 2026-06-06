// Shared constants + pure helpers for NYC Pulse.
// Colors/glows/tints match the NYC Pulse design system exactly.
import type { Timestamp } from 'spacetimedb';
import type { Report, Spot, User } from './module_bindings/types';

export type Status = 'packed' | 'filling' | 'chill' | 'dead';
export const STATUSES: Status[] = ['packed', 'filling', 'chill', 'dead'];

// Exact status colors + subtle glows + tints (must match the live app).
export const STATUS_META: Record<
  Status,
  { label: string; color: string; rgb: [number, number, number]; glow: string; tint: string; blurb: string }
> = {
  packed: {
    label: 'Packed',
    color: '#ff4d4f',
    rgb: [255, 77, 79],
    glow: '0 0 15px rgba(255,77,79,0.40)',
    tint: 'rgba(255,77,79,0.14)',
    blurb: 'slammed',
  },
  filling: {
    label: 'Filling',
    color: '#ffa52c',
    rgb: [255, 165, 44],
    glow: '0 0 15px rgba(255,165,44,0.36)',
    tint: 'rgba(255,165,44,0.14)',
    blurb: 'picking up',
  },
  chill: {
    label: 'Chill',
    color: '#27e08a',
    rgb: [39, 224, 138],
    glow: '0 0 15px rgba(39,224,138,0.36)',
    tint: 'rgba(39,224,138,0.14)',
    blurb: 'room to breathe',
  },
  dead: {
    label: 'Dead',
    color: '#6c7bff',
    rgb: [108, 123, 255],
    glow: '0 0 15px rgba(108,123,255,0.36)',
    tint: 'rgba(108,123,255,0.14)',
    blurb: 'ghost town',
  },
};

// No data / report aged out.
export const NO_DATA_COLOR = '#565663';
export const NO_DATA_RGB: [number, number, number] = [86, 86, 99];
export const NO_DATA_TINT = 'rgba(86,86,99,0.16)';

// A spot's pin reflects its most recent report only if fresh; else "No data".
export const STALE_MS = 60 * 60 * 1000; // 60 min
export const HOT_WINDOW_MS = 30 * 60 * 1000; // "last 30 min"
export const BURST_MS = 12 * 1000; // pin "land" burst window
export const HOT_RING_MIN = 2; // reports in window for a pin to emit the hot ring

export function tsToMs(ts: Timestamp): number {
  return Number(ts.microsSinceUnixEpoch / 1000n);
}

// Relative time: "now", "40s", "4m", "2h", "1d". Monospace in the UI.
export function formatAge(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  if (s < 10) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Counts get thousands separators ("1,284").
export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

// Handles render lowercase with a leading @.
export function atHandle(handle: string): string {
  return '@' + handle.replace(/^@/, '').toLowerCase();
}

export function latestReportBySpot(reports: readonly Report[]): Map<bigint, Report> {
  const out = new Map<bigint, Report>();
  for (const r of reports) {
    const cur = out.get(r.spotId);
    if (!cur || tsToMs(r.createdAt) > tsToMs(cur.createdAt)) out.set(r.spotId, r);
  }
  return out;
}

export function colorForSpot(latest: Report | undefined, now: number): string {
  if (!latest) return NO_DATA_COLOR;
  if (now - tsToMs(latest.createdAt) > STALE_MS) return NO_DATA_COLOR;
  return STATUS_META[latest.status as Status]?.color ?? NO_DATA_COLOR;
}

// "Hot Now": spots ranked by report count within the last 30 minutes.
export function hotSpots(
  reports: readonly Report[],
  spotsById: Map<bigint, Spot>,
  now: number
): Array<{ spot: Spot; count: number; latest: Report }> {
  const counts = new Map<bigint, { count: number; latest: Report }>();
  for (const r of reports) {
    if (now - tsToMs(r.createdAt) > HOT_WINDOW_MS) continue;
    const e = counts.get(r.spotId);
    if (!e) counts.set(r.spotId, { count: 1, latest: r });
    else {
      e.count += 1;
      if (tsToMs(r.createdAt) > tsToMs(e.latest.createdAt)) e.latest = r;
    }
  }
  const rows: Array<{ spot: Spot; count: number; latest: Report }> = [];
  for (const [spotId, e] of counts) {
    const spot = spotsById.get(spotId);
    if (spot) rows.push({ spot, count: e.count, latest: e.latest });
  }
  rows.sort(
    (a, b) => b.count - a.count || tsToMs(b.latest.createdAt) - tsToMs(a.latest.createdAt)
  );
  return rows;
}

export function handleFor(users: readonly User[]): (idHex: string) => string {
  const byHex = new Map<string, string>();
  for (const u of users) byHex.set(u.identity.toHexString(), u.handle);
  return (idHex: string) => byHex.get(idHex) ?? `anon-${idHex.slice(0, 4)}`;
}

// ---------------------------------------------------------------------------
// Heat score (F2): a 0–100 intensity per spot from its recent reports.
// More reports + more recent = hotter. Recency-weighted over the last 60 min,
// then saturated so a handful of fresh reports approaches 100.
// ---------------------------------------------------------------------------
export const HEAT_WINDOW_MS = 60 * 60 * 1000; // reports older than this don't count
const HEAT_SCALE = 3.2; // saturation constant

export function heatScoresBySpot(reports: readonly Report[], now: number): Map<bigint, number> {
  const raw = new Map<bigint, number>();
  for (const r of reports) {
    const age = now - tsToMs(r.createdAt);
    if (age < 0 || age > HEAT_WINDOW_MS) continue;
    const w = Math.pow(1 - age / HEAT_WINDOW_MS, 1.4); // recent reports weigh more
    raw.set(r.spotId, (raw.get(r.spotId) ?? 0) + w);
  }
  const out = new Map<bigint, number>();
  for (const [id, sum] of raw) {
    out.set(id, Math.round(100 * (1 - Math.exp(-sum / HEAT_SCALE))));
  }
  return out;
}

// Heat number color: red when scorching, amber when warm, muted when cool.
export function heatColor(score: number): string {
  if (score >= 66) return '#ff4d4f';
  if (score >= 33) return '#ffa52c';
  return '#9a9aa8';
}

// Per-pin visual params derived from heat (size of dot, halo, glow strength).
export function pinVisual(
  rgb: [number, number, number],
  heat: number,
  hasData: boolean
): { core: number; aura: number; auraOpacity: number; glow: string } {
  const [r, g, b] = rgb;
  if (!hasData) {
    return { core: 14, aura: 0, auraOpacity: 0, glow: 'none' };
  }
  const core = Math.round(15 + heat * 9); // 15 -> 24px
  const aura = Math.round(28 + heat * 56); // 28 -> 84px bloom
  const auraOpacity = +(0.1 + heat * 0.3).toFixed(3);
  const blur = Math.round(8 + heat * 22);
  const spread = Math.round(1 + heat * 5);
  const alpha = +(0.3 + heat * 0.35).toFixed(2);
  const glow = `0 0 ${blur}px ${spread}px rgba(${r},${g},${b},${alpha})`;
  return { core, aura, auraOpacity, glow };
}
