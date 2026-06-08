import { useEffect, useState, type CSSProperties } from 'react';
import { MapPin, Route, Share2, Sparkles, Users } from 'lucide-react';
import { useAnimatedNumber } from '../lib/useAnimatedNumber';
import { scoreToColor } from '../pulse';
import type { WrappedStats } from '../lib/wrapped';

// Optional LLM flavor (always falls back to the deterministic templated copy).
type Copy = { headline?: string; archetypeBlurb?: string; peopleAnchor?: string; distanceAnchor?: string };

export function WrappedCard({ stats }: { stats: WrappedStats }) {
  const [copy, setCopy] = useState<Copy | null>(null);
  const animPeople = Math.round(useAnimatedNumber(stats.people));

  // Ask the LLM to phrase the (already-true) numbers; ignore on any failure.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10_000);
        const r = await fetch('/api/wrapped', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stats }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (r.ok) {
          const data = await r.json();
          if (alive && data?.copy) setCopy(data.copy);
        }
      } catch {
        /* keep templated copy */
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.people, stats.places, stats.archetype]);

  const [copied, setCopied] = useState(false);
  const headline = copy?.headline || stats.headline;
  const blurb = copy?.archetypeBlurb || stats.archetypeBlurb;
  const peopleAnchor = copy?.peopleAnchor || stats.peopleAnchor;
  const distanceAnchor = copy?.distanceAnchor || stats.distanceAnchor;
  const heat = scoreToColor(stats.avgBusy || 50);

  const onShare = async () => {
    const text =
      `My NYC, Wrapped on Dionysus 🍷\n` +
      `• ${stats.places} places explored\n` +
      `• ~${stats.people.toLocaleString()} people I've been around (${peopleAnchor})\n` +
      `• ${stats.distanceMi.toFixed(1)} mi traced (${distanceAnchor})\n` +
      `• Vibe: ${stats.archetype}` +
      (stats.percentile != null ? `\n• More spots than ${stats.percentile}% of users` : '');
    try {
      if (navigator.share) await navigator.share({ title: 'My NYC, Wrapped', text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch {
      /* user dismissed */
    }
  };

  const statRow = (icon: React.ReactNode, label: React.ReactNode) => (
    <div className="flex items-center" style={{ gap: 10, fontSize: 14, color: 'var(--fg-2)' }}>
      <span className="grid place-items-center shrink-0" style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--ink-600)', color: 'var(--pulse)' }}>
        {icon}
      </span>
      <span style={{ minWidth: 0 }}>{label}</span>
    </div>
  );

  const card: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--line-1)',
    background: 'var(--ink-700)',
    boxShadow: 'var(--shadow-card)',
    padding: 18,
  };

  return (
    <div style={card}>
      {/* heat wash */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(120% 80% at 0% 0%, ${heat}22, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative' }}>
        <div className="flex items-center justify-between">
          <span
            className="flex items-center"
            style={{ gap: 6, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--pulse)' }}
          >
            <Sparkles size={14} /> Your NYC, Wrapped
          </span>
          <button
            type="button"
            onClick={onShare}
            aria-label="Share your Wrapped"
            className="press grid place-items-center"
            style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--ink-600)', border: '1px solid var(--line-1)', color: 'var(--fg-2)' }}
          >
            <Share2 size={15} />
          </button>
        </div>

        {stats.lowData && (
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--fg-3)' }}>
            Just getting started — {stats.places} {stats.places === 1 ? 'spot' : 'spots'} and counting.
          </div>
        )}

        {/* headline number */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', fontWeight: 600 }}>People you've been around</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--fg-1)' }}>
              {animPeople.toLocaleString()}
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--fg-2)' }}>{peopleAnchor}</div>
          {headline && headline !== peopleAnchor && (
            <div style={{ marginTop: 2, fontSize: 12, color: 'var(--fg-3)', fontStyle: 'italic' }}>{headline}</div>
          )}
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--fg-3)' }}>playful estimate from your logged vibes</div>
        </div>

        {/* archetype */}
        <div
          style={{
            marginTop: 14,
            padding: '12px 14px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--pulse-tint)',
            border: '1px solid var(--line-pulse)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--pulse)' }}>{stats.archetype}</div>
          <div style={{ marginTop: 2, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.4 }}>{blurb}</div>
        </div>

        {/* stat lines */}
        <div className="flex flex-col" style={{ gap: 10, marginTop: 14 }}>
          {statRow(<MapPin size={15} />, <><b style={{ color: 'var(--fg-1)' }}>{stats.places}</b> places explored</>)}
          {statRow(
            <Route size={15} />,
            <>
              <b style={{ color: 'var(--fg-1)' }}>{stats.distanceMi.toFixed(1)} mi</b> traced · {distanceAnchor}
            </>
          )}
          {statRow(<Sparkles size={15} />, <>You're a <b style={{ color: 'var(--fg-1)' }}>{stats.rhythm}</b> person</>)}
          {stats.percentile != null &&
            statRow(
              <Users size={15} />,
              <>
                More spots than <b style={{ color: 'var(--fg-1)' }}>{stats.percentile}%</b> of Dionysus users
              </>
            )}
        </div>

        {copied && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--pulse)', fontWeight: 600 }}>Copied to clipboard!</div>
        )}
      </div>
    </div>
  );
}
