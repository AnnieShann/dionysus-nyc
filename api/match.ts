import type { VercelRequest, VercelResponse } from '@vercel/node';

// Same OpenRouter setup as api/recommend.ts / api/wrapped.ts.
const MODEL = 'anthropic/claude-3.5-haiku';

const SYSTEM =
  'You write ONE short, warm sentence explaining why two people in a NYC nightlife app ' +
  '(Dionysus) are a vibe match. You are GIVEN the shared data — only phrase it, never invent ' +
  'places or facts. Keep it under ~90 characters, upbeat and specific. ' +
  'Return ONLY JSON: { "line": string }.';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ line: null, source: 'fallback' });
    return;
  }
  const key = process.env.OPENROUTER_API_KEY;
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const match = body?.match;
  if (!key || !match) {
    res.status(200).json({ line: null, source: 'fallback' });
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
        temperature: 0.7,
        max_tokens: 120,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Match data (JSON):\n${JSON.stringify(match)}` },
        ],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      res.status(200).json({ line: null, source: 'fallback', error: `openrouter ${r.status}` });
      return;
    }
    const data = await r.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const line = parseLine(content);
    res.status(200).json({ line, source: line ? 'llm' : 'fallback' });
  } catch (e) {
    res.status(200).json({ line: null, source: 'fallback', error: String(e) });
  }
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
function parseLine(text: string): string | null {
  try {
    let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start < 0 || end < 0) return null;
    const o = JSON.parse(t.slice(start, end + 1));
    return typeof o.line === 'string' && o.line.trim() ? o.line.slice(0, 140) : null;
  } catch {
    return null;
  }
}
