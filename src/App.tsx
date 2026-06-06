import { useEffect, useMemo, useState } from 'react';
import { tables, reducers } from './module_bindings';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { Activity, Check, ChevronUp, Flame, Pencil, Radio, X, Zap } from 'lucide-react';
import type { Report, Spot } from './module_bindings/types';
import MapView from './MapView';
import BottomSheet from './components/BottomSheet';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { useMediaQuery } from './lib/useMediaQuery';
import {
  STATUSES,
  STATUS_META,
  NO_DATA_COLOR,
  formatAge,
  tsToMs,
  latestReportBySpot,
  hotSpots,
  handleFor,
  type Status,
} from './pulse';

function App() {
  const { isActive: connected, identity } = useSpacetimeDB();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // --- Live subscriptions (useTable auto-subscribes; rows update reactively). ---
  const [spots] = useTable(tables.spot);
  const [reports] = useTable(tables.report);
  const [users] = useTable(tables.user);
  const [onlineUsers] = useTable(tables.user.where(r => r.online.eq(true)));

  const submitReport = useReducer(reducers.submitReport);
  const setHandle = useReducer(reducers.setHandle);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [note, setNote] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  // --- Derived data ---
  const spotsById = useMemo(() => {
    const m = new Map<bigint, Spot>();
    for (const s of spots) m.set(s.id, s);
    return m;
  }, [spots]);
  const latestBySpot = useMemo(() => latestReportBySpot(reports), [reports]);
  const resolveHandle = useMemo(() => handleFor(users), [users]);
  const feed = useMemo(
    () => [...reports].sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt)).slice(0, 30),
    [reports]
  );
  const hot = useMemo(() => hotSpots(reports, spotsById, now), [reports, spotsById, now]);
  const myHandle = useMemo(() => {
    if (!identity) return null;
    const hex = identity.toHexString();
    return users.find(u => u.identity.toHexString() === hex)?.handle ?? null;
  }, [users, identity]);

  const selectedSpot = selectedId != null ? spotsById.get(selectedId) ?? null : null;

  useEffect(() => setNote(''), [selectedId]);

  const selectSpot = (id: bigint) => {
    setSelectedId(id);
    if (!isDesktop) setSheetOpen(true);
  };
  const onReport = (status: Status) => {
    if (selectedId == null) return;
    submitReport({ spotId: selectedId, status, note });
    setNote('');
  };

  if (!connected) {
    return (
      <div className="grid h-full place-items-center bg-ink-950 text-zinc-300">
        <div className="flex flex-col items-center gap-3">
          <PulseLogo />
          <p className="animate-pulse text-sm text-zinc-500">Connecting to the city…</p>
        </div>
      </div>
    );
  }

  const panel = (
    <PanelContent
      selectedSpot={selectedSpot}
      latest={selectedSpot ? latestBySpot.get(selectedSpot.id) : undefined}
      now={now}
      note={note}
      setNote={setNote}
      onReport={onReport}
      clearSelection={() => setSelectedId(null)}
      hot={hot}
      feed={feed}
      spotsById={spotsById}
      resolveHandle={resolveHandle}
      onPick={selectSpot}
    />
  );

  return (
    <div className="h-full w-full overflow-hidden bg-ink-950 md:flex">
      {/* Map column */}
      <div className="relative h-full w-full md:flex-1">
        <MapView
          spots={spots}
          latestBySpot={latestBySpot}
          now={now}
          selectedId={selectedId}
          selectedSpot={selectedSpot}
          onSelect={selectSpot}
          panOnSelect={!isDesktop}
        />

        {/* Floating top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1200] flex items-start justify-between gap-3 p-3">
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-ink-900/70 px-3 py-2 backdrop-blur-xl shadow-lg shadow-black/40">
            <PulseLogo small />
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <OnlinePill count={onlineUsers.length} />
            <HandleEditor current={myHandle} onSet={name => setHandle({ name })} />
          </div>
        </div>

        <Legend />
      </div>

      {/* Panel: sidebar on desktop, bottom sheet on mobile */}
      {isDesktop ? (
        <aside className="hidden h-full w-[380px] shrink-0 overflow-y-auto border-l border-white/8 bg-ink-900/60 p-3 backdrop-blur-xl md:block">
          <div className="flex flex-col gap-3">{panel}</div>
        </aside>
      ) : (
        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          peek={
            <Peek
              selectedSpot={selectedSpot}
              latest={selectedSpot ? latestBySpot.get(selectedSpot.id) : undefined}
              now={now}
              hotCount={hot.length}
              open={sheetOpen}
            />
          }
        >
          <div className="flex flex-col gap-3 pt-1">{panel}</div>
        </BottomSheet>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel content (shared by sidebar + sheet)                          */
/* ------------------------------------------------------------------ */

type PanelProps = {
  selectedSpot: Spot | null;
  latest: Report | undefined;
  now: number;
  note: string;
  setNote: (s: string) => void;
  onReport: (s: Status) => void;
  clearSelection: () => void;
  hot: Array<{ spot: Spot; count: number; latest: Report }>;
  feed: Report[];
  spotsById: Map<bigint, Spot>;
  resolveHandle: (idHex: string) => string;
  onPick: (id: bigint) => void;
};

function PanelContent(p: PanelProps) {
  return (
    <>
      <ReportCard
        spot={p.selectedSpot}
        latest={p.latest}
        now={p.now}
        note={p.note}
        setNote={p.setNote}
        onReport={p.onReport}
        onClose={p.clearSelection}
      />
      <HotNowCard hot={p.hot} now={p.now} onPick={p.onPick} />
      <FeedCard feed={p.feed} now={p.now} spotsById={p.spotsById} resolveHandle={p.resolveHandle} onPick={p.onPick} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

function PulseLogo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_2px] shadow-cyan-400/70" />
      </span>
      <span className={small ? 'text-sm font-extrabold tracking-tight' : 'text-2xl font-extrabold tracking-tight'}>
        NYC <span className="text-cyan-400">Pulse</span>
      </span>
    </div>
  );
}

function OnlinePill({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-xl">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      {count} online
    </div>
  );
}

function HandleEditor({ current, onSet }: { current: string | null; onSet: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  useEffect(() => setDraft(current ?? ''), [current]);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-900/70 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-xl hover:bg-white/10"
      >
        <Pencil className="h-3 w-3" />
        {current ?? '…'}
      </button>
    );
  }
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        const name = draft.trim();
        if (name) onSet(name);
        setEditing(false);
      }}
      className="flex items-center gap-1 rounded-full border border-white/10 bg-ink-900/90 p-1 backdrop-blur-xl"
    >
      <input
        autoFocus
        value={draft}
        maxLength={24}
        onChange={e => setDraft(e.target.value)}
        placeholder="handle"
        className="w-24 bg-transparent px-2 text-xs text-white outline-none placeholder:text-zinc-500"
      />
      <button type="submit" aria-label="Save handle" className="grid h-6 w-6 place-items-center rounded-full bg-cyan-500 text-ink-950">
        <Check className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

function Legend() {
  const items: Array<[string, string]> = [
    ...STATUSES.map(s => [STATUS_META[s].label, STATUS_META[s].color] as [string, string]),
    ['No data', NO_DATA_COLOR],
  ];
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[1200] hidden gap-3 rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2 backdrop-blur-xl sm:flex">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px 1px ${color}` }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}

function ReportCard({
  spot,
  latest,
  now,
  note,
  setNote,
  onReport,
  onClose,
}: {
  spot: Spot | null;
  latest: Report | undefined;
  now: number;
  note: string;
  setNote: (s: string) => void;
  onReport: (s: Status) => void;
  onClose: () => void;
}) {
  if (!spot) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-5 text-sm text-zinc-400">
          <Zap className="h-5 w-5 shrink-0 text-cyan-400" />
          Tap a pin on the map to report how busy it is right now.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="ring-1 ring-cyan-400/20">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{spot.name}</CardTitle>
          <div className="mt-0.5 text-xs capitalize text-zinc-500">{spot.category}</div>
        </div>
        <button onClick={onClose} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full text-zinc-400 hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="mb-3 text-xs text-zinc-400">
          {latest ? (
            <>
              Now{' '}
              <span className="font-semibold" style={{ color: STATUS_META[latest.status as Status]?.color }}>
                {STATUS_META[latest.status as Status]?.label ?? latest.status}
              </span>{' '}
              · {formatAge(now - tsToMs(latest.createdAt))} ago
            </>
          ) : (
            'No reports yet — set the first one.'
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => onReport(s)}
              title={STATUS_META[s].blurb}
              className="h-14 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-[0.97]"
              style={{
                background: `linear-gradient(135deg, ${STATUS_META[s].color}, color-mix(in srgb, ${STATUS_META[s].color} 70%, #000))`,
                boxShadow: `0 6px 18px -6px ${STATUS_META[s].color}`,
              }}
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
        <input
          value={note}
          maxLength={140}
          onChange={e => setNote(e.target.value)}
          placeholder="add a note (optional) — e.g. line out the door"
          className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-ink-800/80 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-400/40"
        />
      </CardContent>
    </Card>
  );
}

function HotNowCard({
  hot,
  now,
  onPick,
}: {
  hot: Array<{ spot: Spot; count: number; latest: Report }>;
  now: number;
  onPick: (id: bigint) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Flame className="h-4 w-4 text-orange-400" /> Hot now
        </CardTitle>
        <span className="text-[11px] text-zinc-500">last 30 min</span>
      </CardHeader>
      <CardContent>
        {hot.length === 0 ? (
          <p className="py-2 text-sm text-zinc-500">Quiet out there. Be the first to report.</p>
        ) : (
          <ol className="flex flex-col">
            {hot.slice(0, 8).map(({ spot, count, latest }, i) => (
              <li key={spot.id.toString()}>
                <button
                  onClick={() => onPick(spot.id)}
                  className="flex w-full items-center gap-3 rounded-lg py-2 text-left transition-colors hover:bg-white/5"
                >
                  <span className="w-4 text-center text-xs font-bold text-zinc-600">{i + 1}</span>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      background: STATUS_META[latest.status as Status]?.color,
                      boxShadow: `0 0 8px 1px ${STATUS_META[latest.status as Status]?.color}`,
                    }}
                  />
                  <span className="flex-1 truncate text-sm text-zinc-100">{spot.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-orange-300">
                    {count} {count === 1 ? 'report' : 'reports'}
                  </span>
                  <span className="shrink-0 text-[10px] text-zinc-600">{formatAge(now - tsToMs(latest.createdAt))}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function FeedCard({
  feed,
  now,
  spotsById,
  resolveHandle,
  onPick,
}: {
  feed: Report[];
  now: number;
  spotsById: Map<bigint, Spot>;
  resolveHandle: (idHex: string) => string;
  onPick: (id: bigint) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Radio className="h-4 w-4 text-cyan-400" /> Live feed
        </CardTitle>
        <Activity className="h-3.5 w-3.5 text-zinc-600" />
      </CardHeader>
      <CardContent>
        {feed.length === 0 ? (
          <p className="py-2 text-sm text-zinc-500">No reports yet. Tap a pin to add one.</p>
        ) : (
          <ul className="flex flex-col">
            {feed.map(r => {
              const spot = spotsById.get(r.spotId);
              const meta = STATUS_META[r.status as Status];
              return (
                <li key={r.id.toString()}>
                  <button
                    onClick={() => spot && onPick(spot.id)}
                    className="flex w-full items-start gap-2.5 rounded-lg py-2 text-left transition-colors hover:bg-white/5"
                  >
                    <Badge color={meta?.color} className="mt-0.5 shrink-0">
                      {meta?.label ?? r.status}
                    </Badge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-100">
                        {spot?.name ?? 'Unknown spot'}
                        {r.note ? <span className="font-normal text-zinc-400"> · “{r.note}”</span> : null}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {resolveHandle(r.reporter.toHexString())} · {formatAge(now - tsToMs(r.createdAt))} ago
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* Mobile sheet peek row */
function Peek({
  selectedSpot,
  latest,
  now,
  hotCount,
  open,
}: {
  selectedSpot: Spot | null;
  latest: Report | undefined;
  now: number;
  hotCount: number;
  open: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {selectedSpot ? (
        <>
          <span className="truncate text-sm font-semibold text-white">{selectedSpot.name}</span>
          {latest ? (
            <Badge color={STATUS_META[latest.status as Status]?.color} className="shrink-0">
              {STATUS_META[latest.status as Status]?.label} · {formatAge(now - tsToMs(latest.createdAt))}
            </Badge>
          ) : (
            <span className="shrink-0 text-xs text-zinc-500">tap to report</span>
          )}
        </>
      ) : (
        <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
          <Flame className="h-4 w-4 text-orange-400" />
          {hotCount > 0 ? `${hotCount} spots active` : 'Explore the city'}
        </span>
      )}
      <ChevronUp
        className={`ml-auto h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </div>
  );
}

export default App;
