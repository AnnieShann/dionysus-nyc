// "Plan my night" — turns ranked real candidates into a sequenced itinerary.
// The LLM (api/plan.ts) orders them; this module validates its output against the
// real candidate set and provides a deterministic fallback so a plan ALWAYS exists.
import type { Candidate } from './recommend';

export type PlanStop = {
  spotId: bigint;
  name: string;
  category: string;
  busyness: number | null;
  waitMinutes: number | null;
  time: string;
  reason: string;
};
export type NightPlan = { stops: PlanStop[] };

// Itinerary-style queries default to a plan instead of loose cards.
export function isPlanQuery(q: string): boolean {
  return /\b(plan|night out|itinerary|crawl|all night|where should we|map out|whole night|evening out)\b/i.test(q);
}

export function minutesToLabel(mins: number): string {
  let m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm.toString().padStart(2, '0')} ${period}`;
}

const ROLE_REASON: Record<string, string> = {
  dinner: 'Start with dinner',
  drinks: 'Grab drinks',
  late: 'Keep it going late',
  dessert: 'Sweet finish',
};

// Deterministic fallback: complementary roles, ordered, spaced ~2h from now.
export function buildFallbackPlan(ranked: Candidate[], nowMin: number, max = 4): PlanStop[] {
  const picks: { c: Candidate; role: string }[] = [];
  const used = new Set<bigint>();
  const take = (role: string, pred: (c: Candidate) => boolean) => {
    if (picks.length >= max) return;
    const c = ranked.find(x => !used.has(x.id) && pred(x));
    if (c) {
      used.add(c.id);
      picks.push({ c, role });
    }
  };
  take('dinner', c => c.category.toLowerCase() === 'food');
  take('drinks', c => c.category.toLowerCase() === 'nightlife');
  take('late', c => c.category.toLowerCase() === 'nightlife');
  take('late', c => ['landmark', 'venue', 'park'].includes(c.category.toLowerCase()));
  // backfill from the top of the ranking if we still have room
  for (const c of ranked) {
    if (picks.length >= 3) break;
    if (!used.has(c.id)) {
      used.add(c.id);
      picks.push({ c, role: 'other' });
    }
  }

  let start = Math.ceil(Math.max(nowMin, 18 * 60) / 30) * 30; // round up to next :30, not before 6pm
  return picks.map(({ c, role }, i) => ({
    spotId: c.id,
    name: c.name,
    category: c.category,
    busyness: c.busyness,
    waitMinutes: c.waitMinutes,
    time: minutesToLabel(start + i * 120),
    reason: ROLE_REASON[role] ?? 'Worth a stop',
  }));
}

// Validate LLM stops against the real candidate set (by spotId string); drop misses.
export function validatePlan(
  llmStops: { spotId: string; time: string; reason: string }[],
  candidates: Candidate[]
): PlanStop[] {
  const byId = new Map<string, Candidate>();
  for (const c of candidates) byId.set(c.id.toString(), c);
  const out: PlanStop[] = [];
  const seen = new Set<string>();
  for (const s of llmStops) {
    const c = byId.get(s.spotId);
    if (!c || seen.has(s.spotId)) continue;
    seen.add(s.spotId);
    out.push({
      spotId: c.id,
      name: c.name,
      category: c.category,
      busyness: c.busyness,
      waitMinutes: c.waitMinutes,
      time: s.time || '',
      reason: s.reason || '',
    });
  }
  return out;
}
