import type { VercelRequest, VercelResponse } from '@vercel/node';

// Same OpenRouter setup as api/recommend.ts.
const MODEL = 'anthropic/claude-3.5-haiku';

const SYSTEM =
  'You write witty, upbeat one-liners for a "Your NYC, Wrapped" card in a nightlife app ' +
  'called Dionysus. You are GIVEN the real numbers — never invent or change them, only phrase ' +
  'them. Keep it playful, positive, and short. Return ONLY JSON: ' +
  '{ "headline": string, "archetypeBlurb": string, "peopleAnchor": string, "distanceAnchor": string }. ' +
  'headline: a punchy subtitle about how many people they have been around. ' +
  'archetypeBlurb: one sentence about their archetype. ' +
  'peopleAnchor/distanceAnchor: fun real-world comparisons for the people and distance numbers. ' +
  'Each field under ~90 characters.';

type Out = {
  headline: string;
  archetypeBlurb: string;
  peopleAnchor: string;
  distanceAnchor: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ copy: null, source: 'fallback', error: 'method not allowed' });
    return;
  }
  const key = process.env.OPENROUTER_API_KEY;
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const stats = body?.stats;
  if (!key || !stats) {
    res.status(200).json({ copy: null, source: 'fallback' });
    return;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nyc-pulse-two.vercel.app',
        'X-Title': 'NYC Pulse',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.8,
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Stats (JSON):\n${JSON.stringify(stats)}` },
        ],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      res.status(200).json({ copy: null, source: 'fallback', error: `openrouter ${r.status}` });
      return;
    }
    const data = await r.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const copy = parseCopy(content);
    res.status(200).json({ copy, source: copy ? 'llm' : 'fallback' });
  } catch (e) {
    res.status(200).json({ copy: null, source: 'fallback', error: String(e) });
  }
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function parseCopy(text: string): Out | null {
  try {
    let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start < 0 || end < 0) return null;
    const o = JSON.parse(t.slice(start, end + 1));
    const str = (v: any, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '');
    const out: Out = {
      headline: str(o.headline),
      archetypeBlurb: str(o.archetypeBlurb),
      peopleAnchor: str(o.peopleAnchor),
      distanceAnchor: str(o.distanceAnchor),
    };
    return out.headline || out.archetypeBlurb ? out : null;
  } catch {
    return null;
  }
}
