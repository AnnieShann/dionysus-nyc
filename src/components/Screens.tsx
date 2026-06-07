import { useState, type CSSProperties } from 'react';
import { ArrowUp, Bookmark, Check, Loader2, Map as MapIcon, Plus, Settings, User, X } from 'lucide-react';
import { Segmented, SearchResults, type SearchItem } from './pulse-ui';
import { atHandle, formatAge, NO_DATA_COLOR, STATUS_META, type Status } from '../pulse';

export type Tab = 'explore' | 'itinerary' | 'profile';

/* Bottom tab bar (Explore / Itinerary / Profile). */
export function NavBar({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const items: Array<{ k: Tab; label: string; Icon: typeof MapIcon }> = [
    { k: 'explore', label: 'Explore', Icon: MapIcon },
    { k: 'itinerary', label: 'Itinerary', Icon: Bookmark },
    { k: 'profile', label: 'Profile', Icon: User },
  ];
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-[1600] flex items-center justify-around"
      style={{
        height: 'calc(64px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(255,255,255,0.92)',
        borderTop: '1px solid var(--line-1)',
        backdropFilter: 'blur(var(--blur-control))',
        WebkitBackdropFilter: 'blur(var(--blur-control))',
      }}
    >
      {items.map(({ k, label, Icon }) => {
        const on = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className="press"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: on ? 'var(--fg-1)' : 'var(--fg-3)',
              padding: '6px 18px',
            }}
          >
            <Icon size={22} strokeWidth={on ? 2.4 : 2} />
            <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* Tourist / Local pill toggle (visual for now). */
export function TouristToggle({
  value,
  onChange,
}: {
  value: 'tourist' | 'local';
  onChange: (v: 'tourist' | 'local') => void;
}) {
  return (
    <div
      className="pointer-events-auto"
      style={{
        display: 'inline-flex',
        padding: 4,
        borderRadius: 'var(--radius-pill)',
        background: 'var(--glass-surface)',
        border: '1px solid var(--line-2)',
        backdropFilter: 'blur(var(--blur-control))',
        WebkitBackdropFilter: 'blur(var(--blur-control))',
      }}
    >
      {(['tourist', 'local'] as const).map(k => {
        const on = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className="press"
            style={{
              height: 32,
              padding: '0 16px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'capitalize',
              color: on ? 'var(--fg-on-accent)' : 'var(--fg-2)',
              background: on ? 'var(--accent-ink)' : 'transparent',
            }}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}

/* A recommendation card (view model built in App). */
export type RecCard = {
  id: bigint;
  name: string;
  category: string;
  priceLabel: string;
  busyness: number | null;
  busynessLabel: string | null;
  color: string;
  distance: string;
  waitMinutes: number | null;
  thumb: string | null;
};

function pillBtn(active: boolean): CSSProperties {
  return {
    flex: 1,
    height: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    border: '1px solid var(--line-2)',
    background: active ? 'var(--pulse-tint)' : 'var(--ink-700)',
    color: active ? 'var(--pulse)' : 'var(--fg-1)',
  };
}

function RecCardView({
  c,
  saved,
  added,
  onPick,
  onAddTrip,
  onSave,
}: {
  c: RecCard;
  saved: boolean;
  added: boolean;
  onPick: () => void;
  onAddTrip: () => void;
  onSave: () => void;
}) {
  return (
    <div
      style={{
        scrollSnapAlign: 'start',
        flex: '0 0 244px',
        background: 'var(--ink-700)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--line-1)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <button
        type="button"
        onClick={onPick}
        style={{
          position: 'relative',
          height: 104,
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          background: c.thumb
            ? '#000'
            : 'linear-gradient(135deg, var(--ink-500), var(--ink-600))',
        }}
      >
        {c.thumb && (
          <img src={c.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            background: 'rgba(255,255,255,0.92)',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: c.color }} />
          <span style={{ color: c.busyness != null ? c.color : NO_DATA_COLOR }}>
            {c.busyness != null ? `${c.busyness}` : '—'}
          </span>
          {c.busynessLabel && <span style={{ color: 'var(--fg-2)' }}>{c.busynessLabel}</span>}
        </span>
      </button>

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          onClick={onPick}
          style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--fg-1)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {c.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', textTransform: 'capitalize' }}>
            {c.category}
            {c.priceLabel ? ` · ${c.priceLabel}` : ''} · {c.distance}
            {c.waitMinutes != null ? ` · ~${c.waitMinutes}m wait` : ''}
          </div>
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={pillBtn(added)} onClick={onAddTrip}>
            {added ? <Check size={14} /> : <Plus size={14} />}
            {added ? 'Added' : 'Add to trip'}
          </button>
          <button
            type="button"
            style={pillBtn(saved)}
            onClick={onSave}
            aria-label={saved ? 'Saved' : 'Save spot'}
          >
            <Bookmark size={14} fill={saved ? 'var(--pulse)' : 'none'} />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Bottom chatbox — type a request, get a swipeable carousel of recommended spots. */
export function ChatPanel({
  loading,
  recs,
  savedIds,
  tripIds,
  onSubmit,
  onClear,
  onPick,
  onAddTrip,
  onSave,
}: {
  loading: boolean;
  recs: RecCard[];
  savedIds: Set<bigint>;
  tripIds: Set<bigint>;
  onSubmit: (q: string) => void;
  onClear: () => void;
  onPick: (id: bigint) => void;
  onAddTrip: (id: bigint) => void;
  onSave: (id: bigint) => void;
}) {
  const [text, setText] = useState('');
  const submit = () => {
    const q = text.trim();
    if (q && !loading) onSubmit(q);
  };
  return (
    <div
      className="absolute inset-x-0 z-[1500] px-3"
      style={{ bottom: 'calc(64px + env(safe-area-inset-bottom) + 10px)' }}
    >
      {recs.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div className="flex items-center justify-between" style={{ padding: '0 4px 6px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>Top picks</span>
            <button
              type="button"
              onClick={onClear}
              className="press"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'var(--glass-raised)',
                border: '1px solid var(--line-2)',
                borderRadius: 'var(--radius-pill)',
                padding: '3px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--fg-2)',
                cursor: 'pointer',
                backdropFilter: 'blur(var(--blur-control))',
              }}
            >
              Clear <X size={12} />
            </button>
          </div>
          <div
            className="no-scrollbar"
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              paddingBottom: 4,
            }}
          >
            {recs.map(c => (
              <RecCardView
                key={c.id.toString()}
                c={c}
                saved={savedIds.has(c.id)}
                added={tripIds.has(c.id)}
                onPick={() => onPick(c.id)}
                onAddTrip={() => onAddTrip(c.id)}
                onSave={() => onSave(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          borderRadius: 'var(--radius-xl)',
          background: 'var(--glass-surface)',
          border: '1px solid var(--line-1)',
          boxShadow: 'var(--shadow-pop)',
          backdropFilter: 'blur(var(--blur-sheet))',
          WebkitBackdropFilter: 'blur(var(--blur-sheet))',
          padding: 14,
        }}
      >
        <div style={{ fontSize: 14, color: 'var(--fg-2)', marginBottom: 8 }}>
          What would you like to do today?
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 44,
            padding: '0 6px 0 14px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--ink-600)',
            border: '1px solid var(--line-1)',
          }}
        >
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="A cozy evening with live jazz nearby…"
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'var(--fg-1)',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={loading || !text.trim()}
            aria-label="Send"
            className="grid place-items-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              flexShrink: 0,
              border: 'none',
              cursor: loading || !text.trim() ? 'default' : 'pointer',
              background: text.trim() && !loading ? 'var(--accent-ink)' : 'var(--ink-400)',
              color: '#fff',
            }}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <ArrowUp size={16} strokeWidth={2.4} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Itinerary tab — placeholder (built in a later step). */
export function ItineraryScreen() {
  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: 'var(--ink-900)', padding: '32px 20px 96px' }}
    >
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
        My Trips
      </h1>
      <div
        style={{
          marginTop: 24,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--ink-700)',
          border: '1px dashed var(--line-2)',
          boxShadow: 'var(--shadow-card)',
          padding: '40px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 14px',
            borderRadius: 999,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--ink-600)',
            color: 'var(--fg-3)',
          }}
        >
          <Bookmark size={26} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-1)' }}>No trips yet</div>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5 }}>
          Plan a night out and add stops from the map. The itinerary builder is coming soon.
        </p>
      </div>
    </div>
  );
}

const statCol: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 };

export type ActivityItem = { id: string; spotName: string; note: string; ageMs: number; status: Status };

/* Profile tab — minimal: avatar, handle, neighborhood, Following/Followers (no Posts). */
export function ProfileScreen({
  handle,
  avatar,
  neighborhood,
  activity,
  savedItems,
  savedPublic,
  onPick,
  onTogglePublic,
  onEdit,
}: {
  handle: string;
  avatar: string;
  neighborhood: string;
  activity: ActivityItem[];
  savedItems: SearchItem[];
  savedPublic: boolean;
  onPick: (id: bigint) => void;
  onTogglePublic: () => void;
  onEdit: () => void;
}) {
  const [tab, setTab] = useState<'activity' | 'saved'>('activity');
  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: 'var(--ink-900)', padding: '28px 20px 96px' }}
    >
      <div className="flex items-center justify-between">
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
          Profile
        </h1>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit profile"
          className="press grid place-items-center"
          style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--ink-700)', border: '1px solid var(--line-1)', color: 'var(--fg-2)' }}
        >
          <Settings size={18} />
        </button>
      </div>

      <div className="flex flex-col items-center" style={{ gap: 8, marginTop: 18 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 999,
            overflow: 'hidden',
            border: '3px solid var(--pulse)',
            background: avatar ? 'transparent' : 'linear-gradient(135deg, var(--pulse-dim), var(--status-dead))',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {avatar ? (
            <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User size={40} color="#fff" />
          )}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--fg-1)' }}>{atHandle(handle)}</div>
        {neighborhood && (
          <span
            style={{
              fontSize: 12,
              color: 'var(--fg-2)',
              background: 'var(--ink-600)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px 12px',
            }}
          >
            {neighborhood}
          </span>
        )}
      </div>

      {/* Following / Followers only (no Posts) */}
      <div
        className="flex"
        style={{
          marginTop: 18,
          background: 'var(--ink-700)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--line-1)',
          boxShadow: 'var(--shadow-card)',
          padding: '16px 0',
        }}
      >
        <div style={{ ...statCol, flex: 1 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg-1)' }}>0</span>
          <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Following</span>
        </div>
        <div style={{ width: 1, background: 'var(--line-1)' }} />
        <div style={{ ...statCol, flex: 1 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg-1)' }}>0</span>
          <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Followers</span>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { k: 'activity', label: 'Activity' },
            { k: 'saved', label: 'Saved' },
          ]}
        />
      </div>

      {tab === 'activity' ? (
        <div className="flex flex-col" style={{ gap: 10, marginTop: 14 }}>
          {activity.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--fg-3)', padding: '8px 2px' }}>
              No activity yet — drop a vibe on a spot.
            </p>
          ) : (
            activity.map(a => (
              <div
                key={a.id}
                style={{
                  background: 'var(--ink-700)',
                  border: '1px solid var(--line-1)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-card)',
                  padding: '12px 14px',
                }}
              >
                <div className="flex items-center" style={{ gap: 8 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: STATUS_META[a.status].color,
                      background: STATUS_META[a.status].tint,
                      borderRadius: 'var(--radius-pill)',
                      padding: '2px 9px',
                    }}
                  >
                    {a.spotName}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>Left a vibe</span>
                </div>
                {a.note && (
                  <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--fg-1)', lineHeight: 1.4 }}>{a.note}</p>
                )}
                <span style={{ display: 'block', marginTop: 8, fontSize: 12, color: 'var(--fg-3)' }}>
                  {formatAge(a.ageMs)} ago
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 10, marginTop: 14 }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>
              {savedItems.length} saved
            </span>
            <button
              type="button"
              className="press"
              onClick={onTogglePublic}
              style={{
                height: 30,
                padding: '0 12px',
                borderRadius: 'var(--radius-pill)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: savedPublic ? 'var(--pulse-tint)' : 'var(--ink-600)',
                border: `1px solid ${savedPublic ? 'var(--line-pulse)' : 'var(--line-1)'}`,
                color: savedPublic ? 'var(--pulse)' : 'var(--fg-2)',
              }}
            >
              {savedPublic ? 'Public' : 'Make public'}
            </button>
          </div>
          {savedItems.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--fg-3)', padding: '8px 2px' }}>
              No saved spots yet. Tap the bookmark on a spot.
            </p>
          ) : (
            <SearchResults items={savedItems} onPick={onPick} />
          )}
        </div>
      )}
    </div>
  );
}
