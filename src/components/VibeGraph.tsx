import { useEffect, useState, type CSSProperties } from 'react';
import { Sparkles, Users, Maximize2, X } from 'lucide-react';
import { whyMatch, type Friend, type VibeMatchResult } from '../lib/vibeMatch';

// Vivid mid-stops so each connector reads as a colorful gradient.
const VIVID = ['#ff4d4f', '#ff8a3d', '#ffc83d', '#27e08a', '#3ec5ff', '#6c7bff', '#b06bff', '#ff5db1'];

function Avatar({ initials, color, url, size }: { initials: string; color: string; url?: string; size: number }) {
  return (
    <span
      className="grid place-items-center"
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: url ? 'transparent' : color,
        border: `2px solid ${color}`,
        boxShadow: '0 2px 8px rgba(20,22,28,0.12)',
        overflow: 'hidden',
        color: '#3c3c44',
        fontSize: size * 0.34,
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </span>
  );
}

// The radial graph itself — rendered both compact (in the card) and large (modal).
function GraphCanvas({
  friends,
  me,
  selected,
  onSelect,
  ns,
  W,
  H,
  R,
  cardW,
  centerSize,
  friendAvatar,
}: {
  friends: Friend[];
  me: { initials: string; color: string; avatarUrl?: string };
  selected: string | null;
  onSelect: (id: string) => void;
  ns: string;
  W: number;
  H: number;
  R: number;
  cardW: number;
  centerSize: number;
  friendAvatar: number;
}) {
  const CX = W / 2;
  const CY = H / 2;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 30);
    return () => clearTimeout(t);
  }, []);

  const positions = friends.map((f, i) => {
    const ang = ((-90 + (i * 360) / friends.length) * Math.PI) / 180;
    return { f, i, x: CX + R * Math.cos(ang), y: CY + R * Math.sin(ang) };
  });

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: W, height: H, margin: '0 auto' }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <defs>
          {positions.map(({ f, i, x, y }) => (
            <linearGradient key={f.id} id={`${ns}-grad-${i}`} gradientUnits="userSpaceOnUse" x1={CX} y1={CY} x2={x} y2={y}>
              <stop offset="0%" stopColor="var(--pulse)" />
              <stop offset="55%" stopColor={VIVID[i % VIVID.length]} />
              <stop offset="100%" stopColor={f.color} />
            </linearGradient>
          ))}
        </defs>
        {positions.map(({ f, i, x, y }) => {
          const mx = (CX + x) / 2 + (y - CY) * 0.14;
          const my = (CY + y) / 2 - (x - CX) * 0.14;
          const on = selected === f.id;
          return (
            <path
              key={f.id}
              d={`M ${CX} ${CY} Q ${mx} ${my} ${x} ${y}`}
              fill="none"
              stroke={`url(#${ns}-grad-${i})`}
              strokeWidth={on ? 4 : 2.6}
              strokeLinecap="round"
              opacity={shown ? (on ? 1 : 0.85) : 0}
              style={{ transition: 'opacity .5s ease, stroke-width .2s' }}
            />
          );
        })}
      </svg>

      {/* match % chips on the curve midpoint */}
      {positions.map(({ f, x, y }) => {
        const mx = (CX + x) / 2 + (y - CY) * 0.14;
        const my = (CY + y) / 2 - (x - CX) * 0.14;
        const lx = 0.25 * CX + 0.5 * mx + 0.25 * x;
        const ly = 0.25 * CY + 0.5 * my + 0.25 * y;
        return (
          <div
            key={`pct-${f.id}`}
            style={{
              position: 'absolute',
              left: lx,
              top: ly,
              zIndex: 1,
              transform: 'translate(-50%,-50%)',
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--fg-1)',
              background: 'var(--ink-600)',
              border: '1px solid var(--line-1)',
              borderRadius: 999,
              padding: '1px 7px',
              pointerEvents: 'none',
            }}
          >
            {f.matchPct}%
          </div>
        );
      })}

      {/* ME */}
      <div style={{ position: 'absolute', left: CX, top: CY, zIndex: 2, transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
        <Avatar initials={me.initials} color="var(--pulse)" url={me.avatarUrl} size={centerSize} />
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-2)', marginTop: 2 }}>You</div>
      </div>

      {/* friends */}
      {positions.map(({ f, i, x, y }) => (
        <button
          key={f.id}
          type="button"
          onClick={e => {
            e.stopPropagation();
            onSelect(f.id);
          }}
          className="press"
          style={{
            position: 'absolute',
            left: x,
            top: y,
            zIndex: 3,
            width: cardW,
            transform: `translate(-50%,-50%) scale(${shown ? 1 : 0.6})`,
            opacity: shown ? 1 : 0,
            transition: `opacity .4s ease ${i * 0.05}s, transform .4s cubic-bezier(.2,.8,.2,1) ${i * 0.05}s`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            background: selected === f.id ? 'var(--pulse-tint)' : 'var(--ink-600)',
            border: `1px solid ${selected === f.id ? 'var(--line-pulse)' : 'var(--line-1)'}`,
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            padding: '8px 6px',
            cursor: 'pointer',
          }}
        >
          <Avatar initials={f.initials} color={f.color} url={f.avatarUrl} size={friendAvatar} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-1)', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {f.name}
          </span>
          <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>{f.mutualCount} mutual</span>
          <span style={{ width: '100%', height: 4, borderRadius: 999, background: 'var(--ink-400)', overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${f.matchPct}%`, background: 'var(--pulse)', borderRadius: 999 }} />
          </span>
        </button>
      ))}
    </div>
  );
}

function Callout({ sel, line }: { sel: Friend; line: string }) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        marginTop: 8,
        padding: '12px 14px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--pulse-tint)',
        border: '1px solid var(--line-pulse)',
      }}
    >
      <div className="flex items-center" style={{ gap: 8 }}>
        <Avatar initials={sel.initials} color={sel.color} url={sel.avatarUrl} size={28} />
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg-1)' }}>{sel.name}</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: 'var(--pulse)' }}>{sel.matchPct}% match</span>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.45 }}>{line}</p>
      {(sel.sharedCategories.length > 0 || sel.sharedSpots.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {sel.sharedCategories.map(c => (
            <span key={`c-${c}`} style={tag('var(--pulse)')}>{c}</span>
          ))}
          {sel.sharedSpots.map(s => (
            <span key={`s-${s}`} style={tag('var(--fg-2)')}>📍 {s}</span>
          ))}
        </div>
      )}
      <div className="flex items-center" style={{ gap: 5, marginTop: 8, fontSize: 12, color: 'var(--fg-3)' }}>
        <Users size={13} /> {sel.mutualCount} mutual {sel.mutualCount === 1 ? 'spot' : 'spots'}
      </div>
    </div>
  );
}

export function VibeGraph({
  result,
  me,
}: {
  result: VibeMatchResult;
  me: { initials: string; color: string; avatarUrl?: string };
}) {
  const { friends, hasHistory } = result;
  const [selected, setSelected] = useState<string | null>(null);
  const [lines, setLines] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);

  const sel = friends.find(f => f.id === selected) ?? null;

  // Phrase "why you match" via the LLM (optional); template shows instantly.
  useEffect(() => {
    if (!sel || lines[sel.id]) return;
    let alive = true;
    (async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 9000);
        const r = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            match: { name: sel.name, matchPct: sel.matchPct, sharedCategories: sel.sharedCategories, sharedSpots: sel.sharedSpots },
          }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (r.ok) {
          const data = await r.json();
          if (alive && data?.line) setLines(prev => ({ ...prev, [sel.id]: data.line }));
        }
      } catch {
        /* keep template */
      }
    })();
    return () => {
      alive = false;
    };
  }, [sel, lines]);

  const header = (
    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
      <span className="flex items-center" style={{ gap: 6 }}>
        <Sparkles size={14} color="var(--pulse)" />
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--pulse)' }}>
          Your Dionysus
        </span>
      </span>
    </div>
  );

  const card: CSSProperties = {
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--line-1)',
    background: 'var(--ink-700)',
    boxShadow: 'var(--shadow-card)',
    padding: 16,
  };

  if (!hasHistory || friends.length === 0) {
    return (
      <div style={card}>
        {header}
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg-1)' }}>Your vibe circle</div>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.45 }}>
          {!hasHistory
            ? 'Drop a few vibes around the city and your closest matches will appear here.'
            : 'No matches yet — invite friends to Dionysus to see your circle.'}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ ...card, cursor: 'pointer' }} onClick={() => setExpanded(true)}>
        {header}
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg-1)' }}>Your vibe circle</div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>Tap a friend · tap anywhere to expand</div>
          </div>
          <span className="grid place-items-center" style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--ink-600)', border: '1px solid var(--line-1)', color: 'var(--fg-2)' }}>
            <Maximize2 size={15} />
          </span>
        </div>

        <GraphCanvas
          friends={friends}
          me={me}
          selected={selected}
          onSelect={id => setSelected(s => (s === id ? null : id))}
          ns="c"
          W={330}
          H={364}
          R={124}
          cardW={78}
          centerSize={54}
          friendAvatar={34}
        />
        {sel && <Callout sel={sel} line={lines[sel.id] || whyMatch(sel)} />}
      </div>

      {/* full-screen expanded graph */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3000,
            background: 'var(--ink-900)',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 8px calc(env(safe-area-inset-bottom) + 16px)',
            overflowY: 'auto',
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <span className="flex items-center" style={{ gap: 6 }}>
              <Sparkles size={16} color="var(--pulse)" />
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg-1)' }}>Your vibe circle</span>
            </span>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setExpanded(false);
              }}
              aria-label="Close"
              className="press grid place-items-center"
              style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--ink-600)', border: '1px solid var(--line-1)', color: 'var(--fg-2)' }}
            >
              <X size={18} />
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <GraphCanvas
              friends={friends}
              me={me}
              selected={selected}
              onSelect={id => setSelected(s => (s === id ? null : id))}
              ns="m"
              W={384}
              H={600}
              R={150}
              cardW={78}
              centerSize={64}
              friendAvatar={42}
            />
            {sel && <Callout sel={sel} line={lines[sel.id] || whyMatch(sel)} />}
          </div>
        </div>
      )}
    </>
  );
}

function tag(color: string): CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 600,
    color,
    background: 'var(--ink-700)',
    border: '1px solid var(--line-1)',
    borderRadius: 'var(--radius-pill)',
    padding: '4px 10px',
    textTransform: 'capitalize',
  };
}
