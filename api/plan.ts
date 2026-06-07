import type { VercelRequest, VercelResponse } from '@vercel/node';

// Same OpenRouter setup as api/recommend.ts.
const MODEL = 'anthropic/claude-3.5-haiku';

const SYSTEM =
  'Plan a coherent night out from ONLY the candidate spots provided. Pick 3-4 that form a ' +
  'sequence (e.g. dinner → drinks → late spot), in order, each with a rough suggested time and ' +
  'a one-line reason. Factor in the current time, keep stops reasonably close together, and ' +
  'avoid overcrowded / long-wait spots unless the user asked for packed. ' +
  'Return ONLY JSON: { "stops": [{ "spotId": string, "time": string, "reason": string }] }. ' +
  'Use only spotIds from the provided list — never invent a place.';

type Stop = { spotId: string; time: string; reason: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ stops: null, source: 'fallback', error: 'method not allowed' });
    return;
  }
  const key = process.env.OPENROUTER_API_KEY;
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const query = String(body?.query ?? '').slice(0, 500).trim();
  const now = String(body?.now ?? '').slice(0, 40);
  const candidates = Array.isArray(body?.candidates) ? body.candidates.slice(0, 15) : [];

  if (!key || candidates.length === 0) {
    res.status(200).json({ stops: null, source: 'fallback' });
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
        temperature: 0.6,
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Request: "${query || 'plan my night'}"\nCurrent time: ${now}\nCandidate spots (JSON):\n${JSON.stringify(candidates)}`,
          },
        ],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      res.status(200).json({ stops: null, source: 'fallback', error: `openrouter ${r.status}` });
      return;
    }
    const data = await r.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const stops = parseStops(content);
    res.status(200).json({ stops, source: stops ? 'llm' : 'fallback' });
  } catch (e) {
    res.status(200).json({ stops: null, source: 'fallback', error: String(e) });
  }
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function parseStops(text: string): Stop[] | null {
  try {
    let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start < 0 || end < 0) return null;
    const o = JSON.parse(t.slice(start, end + 1));
    if (!Array.isArray(o.stops)) return null;
    const out: Stop[] = [];
    for (const s of o.stops) {
      const spotId = s?.spotId != null ? String(s.spotId) : '';
      if (!spotId) continue;
      out.push({
        spotId,
        time: typeof s.time === 'string' ? s.time.slice(0, 20) : '',
        reason: typeof s.reason === 'string' ? s.reason.slice(0, 120) : '',
      });
      if (out.length >= 4) break;
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}
