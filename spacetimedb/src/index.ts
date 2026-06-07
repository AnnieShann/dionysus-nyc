import { schema, table, t, SenderError } from 'spacetimedb/server';

// ---------------------------------------------------------------------------
// NYC Pulse — a live map of how busy places around Herald Square are right now.
//
// status is stored as a plain validated string (one of STATUSES below) rather
// than a t.enum, because STDB enums generate tagged-union types on the client
// ({ tag: 'packed' }) which make the pin-coloring logic clunky. We validate the
// value server-side instead, which is just as safe.
// ---------------------------------------------------------------------------

// NOTE: not exported — the STDB module loader treats every runtime named export
// as a reducer/lifecycle/view. The client defines its own copy of this list.
const STATUSES = ['packed', 'filling', 'chill', 'dead'] as const;

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

// A fixed place on the map (seeded once in `init`).
const spot = table(
  { name: 'spot', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    name: t.string(),
    latitude: t.f64(),
    longitude: t.f64(),
    category: t.string(),
  }
);

// A single "how busy is it" report from a user about a spot.
const report = table(
  { name: 'report', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    spotId: t.u64().index('btree'), // look up / group reports by spot
    reporter: t.identity(), // ctx.sender of the submitter
    status: t.string(), // one of STATUSES
    note: t.option(t.string()), // optional free-text note
    createdAt: t.timestamp().index('btree'), // server time of the report
  }
);

// Presence + identity. One row per identity that has ever connected.
const user = table(
  { name: 'user', public: true },
  {
    identity: t.identity().primaryKey(),
    handle: t.string(),
    online: t.bool(),
  }
);

// F8 — "Still accurate" confirmations of a report. One per identity per report.
const confirmation = table(
  { name: 'confirmation', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    reportId: t.u64().index('btree'), // which report is being confirmed
    confirmer: t.identity(),
    createdAt: t.timestamp(),
  }
);

// F9 — current wait time for a spot. One row per spot; newest replaces older.
// Auto-expires after 60 min (clients ignore rows older than that).
const waitTime = table(
  { name: 'wait_time', public: true },
  {
    spotId: t.u64().primaryKey(), // one current wait per spot
    minutes: t.u32(),
    reporter: t.identity(),
    createdAt: t.timestamp(),
  }
);

// User-dropped photo of a spot (captured live from the camera). Stored as a
// resized JPEG data URL; meant to be recent (clients surface the newest).
const photo = table(
  { name: 'photo', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    spotId: t.u64().index('btree'),
    photographer: t.identity(),
    data: t.string(), // resized JPEG data URL
    createdAt: t.timestamp().index('btree'),
  }
);

// User profile (lightweight): email/bio/avatar live here; the display name stays
// on `user.handle`. onboarded gates the first-run onboarding screen.
const profile = table(
  { name: 'profile', public: true },
  {
    identity: t.identity().primaryKey(),
    email: t.string(),
    bio: t.string(),
    avatar: t.string(), // resized data URL or ''
    savedPublic: t.bool(), // is this user's saved list public
    onboarded: t.bool(),
  }
);

// A user's saved/favorite spot.
const savedSpot = table(
  { name: 'saved_spot', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    owner: t.identity().index('btree'),
    spotId: t.u64().index('btree'),
    createdAt: t.timestamp(),
  }
);

// A user's trip (itinerary). The most-recently-created one is the "active" trip.
const trip = table(
  { name: 'trip', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    owner: t.identity().index('btree'),
    name: t.string(),
    createdAt: t.timestamp(),
  }
);

// A stop on a trip (a spot added to the itinerary).
const tripStop = table(
  { name: 'trip_stop', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    tripId: t.u64().index('btree'),
    owner: t.identity().index('btree'),
    spotId: t.u64(),
    createdAt: t.timestamp(),
  }
);

// Trips the user has saved to their past-itinerary history (archived).
const archivedTrip = table(
  { name: 'archived_trip', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    tripId: t.u64().index('btree'),
    owner: t.identity().index('btree'),
    createdAt: t.timestamp(),
  }
);

// A named wishlist / collection of spots (e.g. "Jazz Bars").
const wishlist = table(
  { name: 'wishlist', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    owner: t.identity().index('btree'),
    name: t.string(),
    color: t.string(), // bubble tint
    createdAt: t.timestamp(),
  }
);

// A spot inside a wishlist.
const wishlistItem = table(
  { name: 'wishlist_item', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    wishlistId: t.u64().index('btree'),
    owner: t.identity().index('btree'),
    spotId: t.u64(),
    createdAt: t.timestamp(),
  }
);

// Extra (private-ish) profile fields: phone + gender/pronouns.
const profileExtra = table(
  { name: 'profile_extra', public: true },
  {
    identity: t.identity().primaryKey(),
    phone: t.string(),
    gender: t.string(),
    location: t.string().default(''),
  }
);

const spacetimedb = schema({
  spot,
  report,
  user,
  confirmation,
  waitTime,
  photo,
  profile,
  savedSpot,
  trip,
  tripStop,
  archivedTrip,
  wishlist,
  wishlistItem,
  profileExtra,
});
export default spacetimedb;

// ---------------------------------------------------------------------------
// Seed data — ~25 real places within ~1 mile of Herald Square (40.7484, -73.9879)
// ---------------------------------------------------------------------------

type Seed = { name: string; latitude: number; longitude: number; category: string };

const SEED_SPOTS: Seed[] = [
  { name: 'Macy\'s Herald Square', latitude: 40.7509, longitude: -73.989, category: 'shopping' },
  { name: 'Empire State Building', latitude: 40.7484, longitude: -73.9857, category: 'landmark' },
  { name: 'Koreatown (32nd St)', latitude: 40.7476, longitude: -73.9866, category: 'nightlife' },
  { name: 'Madison Square Garden', latitude: 40.7505, longitude: -73.9934, category: 'venue' },
  { name: 'Penn Station', latitude: 40.7506, longitude: -73.9935, category: 'transit' },
  { name: 'Bryant Park', latitude: 40.7536, longitude: -73.9832, category: 'park' },
  { name: 'NY Public Library', latitude: 40.7532, longitude: -73.9822, category: 'landmark' },
  { name: 'Times Square', latitude: 40.758, longitude: -73.9855, category: 'landmark' },
  { name: 'Madison Square Park', latitude: 40.7423, longitude: -73.9879, category: 'park' },
  { name: 'Eataly NYC Flatiron', latitude: 40.7421, longitude: -73.9897, category: 'food' },
  { name: 'Flatiron Building', latitude: 40.7411, longitude: -73.9897, category: 'landmark' },
  { name: 'Shake Shack (Madison Sq)', latitude: 40.7417, longitude: -73.9882, category: 'food' },
  { name: 'The Morgan Library', latitude: 40.7491, longitude: -73.9815, category: 'museum' },
  { name: 'Greeley Square', latitude: 40.7484, longitude: -73.9883, category: 'park' },
  { name: 'Manhattan Mall', latitude: 40.7497, longitude: -73.9889, category: 'shopping' },
  { name: 'The Pennsy Food Hall', latitude: 40.7505, longitude: -73.992, category: 'food' },
  { name: 'Ace Hotel Lobby', latitude: 40.7459, longitude: -73.9886, category: 'nightlife' },
  { name: 'Grand Central Terminal', latitude: 40.7527, longitude: -73.9772, category: 'transit' },
  { name: 'Rockefeller Center', latitude: 40.7587, longitude: -73.9787, category: 'landmark' },
  { name: 'St. Patrick’s Cathedral', latitude: 40.7585, longitude: -73.976, category: 'landmark' },
  { name: 'Union Square', latitude: 40.7359, longitude: -73.9911, category: 'park' },
  { name: 'Chelsea Market', latitude: 40.7424, longitude: -74.0061, category: 'food' },
  { name: 'Hudson Yards (Vessel)', latitude: 40.7538, longitude: -74.0021, category: 'shopping' },
  { name: 'The High Line (W 14th)', latitude: 40.748, longitude: -74.0048, category: 'park' },
  { name: 'Korilla / K-Town BBQ Row', latitude: 40.7472, longitude: -73.9862, category: 'food' },
  { name: 'Jongro BBQ', latitude: 40.7475, longitude: -73.9869, category: 'food' },
  { name: 'Kang Ho Dong Baekjeong', latitude: 40.7472, longitude: -73.9849, category: 'food' },
  { name: 'BCD Tofu House', latitude: 40.7474, longitude: -73.9861, category: 'food' },
  { name: 'Cho Dang Gol', latitude: 40.7515, longitude: -73.9882, category: 'food' },
  { name: 'Her Name Is Han', latitude: 40.7458, longitude: -73.9836, category: 'food' },
  { name: 'miss KOREA BBQ', latitude: 40.7475, longitude: -73.9863, category: 'food' },
  { name: 'New Wonjo', latitude: 40.7476, longitude: -73.9871, category: 'food' },
  { name: 'Gaonnuri', latitude: 40.748, longitude: -73.9881, category: 'food' },
  { name: 'Pocha 32', latitude: 40.7475, longitude: -73.9866, category: 'nightlife' },
  { name: 'Woorijip', latitude: 40.7475, longitude: -73.9863, category: 'food' },
  { name: 'Mandoo Bar', latitude: 40.7474, longitude: -73.9858, category: 'food' },
  { name: 'Dons Bogam', latitude: 40.7472, longitude: -73.9837, category: 'food' },
  { name: 'Hangawi', latitude: 40.7472, longitude: -73.9842, category: 'food' },
  { name: 'Kunjip', latitude: 40.7474, longitude: -73.9862, category: 'food' },
  { name: 'Hojokban', latitude: 40.7474, longitude: -73.9861, category: 'food' },
  { name: 'Soju Haus', latitude: 40.747, longitude: -73.9856, category: 'nightlife' },
  { name: 'Joo Ok', latitude: 40.7475, longitude: -73.9869, category: 'food' },
  { name: 'Turntable Chicken Jazz', latitude: 40.7483, longitude: -73.9874, category: 'food' },
  { name: 'Little Ned', latitude: 40.7441, longitude: -73.9845, category: 'nightlife' },
  { name: 'Patent Pending', latitude: 40.7448, longitude: -73.9893, category: 'nightlife' },
  { name: 'The Ivory Peacock', latitude: 40.746, longitude: -73.9889, category: 'nightlife' },
  { name: 'Nubeluz by Jose Andres', latitude: 40.7452, longitude: -73.9885, category: 'nightlife' },
  { name: 'Brass', latitude: 40.7445, longitude: -73.9886, category: 'food' },
  { name: 'Koloman', latitude: 40.7457, longitude: -73.9882, category: 'food' },
  { name: 'Oscar Wilde', latitude: 40.7447, longitude: -73.9886, category: 'nightlife' },
  { name: 'Swingers NoMad', latitude: 40.7459, longitude: -73.9884, category: 'nightlife' },
  { name: 'The Portrait Bar', latitude: 40.7449, longitude: -73.9874, category: 'nightlife' },
  { name: 'K32 Rooftop Bar', latitude: 40.7476, longitude: -73.9869, category: 'nightlife' },
  { name: 'Mustang Harry\'s', latitude: 40.7487, longitude: -73.9912, category: 'nightlife' },
  { name: 'The Liberty NYC', latitude: 40.751, longitude: -73.9874, category: 'nightlife' },
  { name: 'The Ragtrader', latitude: 40.7515, longitude: -73.9882, category: 'food' },
  { name: 'Stout NYC', latitude: 40.7497, longitude: -73.9901, category: 'nightlife' },
  { name: 'Grace Street Coffee & Desserts', latitude: 40.7475, longitude: -73.9866, category: 'food' },
  { name: 'Angelina Bakery Herald Square', latitude: 40.749, longitude: -73.9879, category: 'food' },
  { name: 'Tous Les Jours', latitude: 40.7474, longitude: -73.9859, category: 'food' },
  { name: 'Paris Baguette', latitude: 40.7474, longitude: -73.986, category: 'food' },
  { name: 'Zaro\'s Family Bakery (Macy\'s)', latitude: 40.7507, longitude: -73.9893, category: 'food' },
  { name: 'Carvel (Macy\'s Herald Square)', latitude: 40.7507, longitude: -73.9892, category: 'food' },
  { name: 'NY Bakery and Desserts', latitude: 40.7458, longitude: -73.9889, category: 'food' },
  { name: 'Maman', latitude: 40.7398, longitude: -73.9905, category: 'food' },
  { name: 'Keens Steakhouse', latitude: 40.7515, longitude: -73.9884, category: 'food' },
  { name: 'Stella 34 Trattoria', latitude: 40.7509, longitude: -73.989, category: 'food' },
  { name: 'The Smith NoMad', latitude: 40.7443, longitude: -73.9889, category: 'food' },
  { name: 'Friedman\'s Herald Square', latitude: 40.7489, longitude: -73.9901, category: 'food' },
  { name: 'Ai Fiori', latitude: 40.751, longitude: -73.9839, category: 'food' },
  { name: 'Wolfgang\'s Steakhouse (Park Ave)', latitude: 40.7459, longitude: -73.9799, category: 'food' },
  { name: 'Hill Country Barbecue Market', latitude: 40.7443, longitude: -73.9905, category: 'food' },
  { name: 'Marta', latitude: 40.7449, longitude: -73.9836, category: 'food' },
  { name: 'Scarpetta', latitude: 40.7449, longitude: -73.9847, category: 'food' },
  { name: 'La Pecora Bianca NoMad', latitude: 40.744, longitude: -73.989, category: 'food' },
  { name: 'Zaytinya by Jose Andres', latitude: 40.7445, longitude: -73.9886, category: 'food' },
  { name: 'The Clocktower', latitude: 40.7416, longitude: -73.9874, category: 'food' },
  { name: 'Eleven Madison Park', latitude: 40.7416, longitude: -73.9871, category: 'food' },
];

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

export const init = spacetimedb.init(ctx => {
  // Seed the fixed set of spots exactly once, on first publish.
  for (const s of SEED_SPOTS) {
    ctx.db.spot.insert({
      id: 0n, // autoInc assigns the real id
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      category: s.category,
    });
  }
});

// Idempotently add any seed spots missing from an already-initialized DB
// (so we can grow the spot list without wiping data). Client: reducers.ensureSpots
export const ensureSpots = spacetimedb.reducer(ctx => {
  const have = new Set<string>();
  for (const s of ctx.db.spot.iter()) have.add(s.name);
  for (const s of SEED_SPOTS) {
    if (!have.has(s.name)) {
      ctx.db.spot.insert({
        id: 0n,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        category: s.category,
      });
    }
  }
});

export const onConnect = spacetimedb.clientConnected(ctx => {
  const existing = ctx.db.user.identity.find(ctx.sender);
  if (existing) {
    // Returning user — flip them back online, keep their handle.
    ctx.db.user.identity.update({ ...existing, online: true });
  } else {
    // New identity — give them a throwaway handle they can change later.
    const suffix = ctx.random.integerInRange(1000, 9999);
    ctx.db.user.insert({
      identity: ctx.sender,
      handle: `anon-${suffix}`,
      online: true,
    });
  }
});

export const onDisconnect = spacetimedb.clientDisconnected(ctx => {
  const existing = ctx.db.user.identity.find(ctx.sender);
  if (existing) {
    ctx.db.user.identity.update({ ...existing, online: false });
  }
});

// ---------------------------------------------------------------------------
// Reducers
// ---------------------------------------------------------------------------

// Submit a busyness report for a spot. Client name: reducers.submitReport
export const submitReport = spacetimedb.reducer(
  { spotId: t.u64(), status: t.string(), note: t.string() },
  (ctx, { spotId, status, note }) => {
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
      throw new SenderError(
        `invalid status "${status}"; must be one of ${STATUSES.join(', ')}`
      );
    }
    if (!ctx.db.spot.id.find(spotId)) {
      throw new SenderError(`no spot with id ${spotId}`);
    }

    const trimmed = note.trim();
    ctx.db.report.insert({
      id: 0n,
      spotId,
      reporter: ctx.sender,
      status,
      note: trimmed.length > 0 ? trimmed.slice(0, 140) : undefined,
      createdAt: ctx.timestamp,
    });
  }
);

// Delete one of the caller's own vibes/reports. Client: reducers.deleteReport
export const deleteReport = spacetimedb.reducer(
  { reportId: t.u64() },
  (ctx, { reportId }) => {
    const r = ctx.db.report.id.find(reportId);
    if (r && r.reporter.equals(ctx.sender)) {
      ctx.db.report.id.delete(reportId);
    }
  }
);

// Set the caller's display handle. Client name: reducers.setHandle
export const setHandle = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    const handle = name.trim().slice(0, 24);
    if (handle.length === 0) {
      throw new SenderError('handle cannot be empty');
    }
    const existing = ctx.db.user.identity.find(ctx.sender);
    if (existing) {
      ctx.db.user.identity.update({ ...existing, handle });
    } else {
      // Reducer can be called before the connect handler in rare races — be safe.
      ctx.db.user.insert({ identity: ctx.sender, handle, online: true });
    }
  }
);

// F8 — toggle "still accurate" for a report (one vote per identity).
// Client name: reducers.confirmReport
export const confirmReport = spacetimedb.reducer(
  { reportId: t.u64() },
  (ctx, { reportId }) => {
    if (!ctx.db.report.id.find(reportId)) {
      throw new SenderError(`no report with id ${reportId}`);
    }
    // Toggle: remove the caller's existing confirmation, else add one.
    for (const c of ctx.db.confirmation.reportId.filter(reportId)) {
      if (c.confirmer.equals(ctx.sender)) {
        ctx.db.confirmation.id.delete(c.id);
        return;
      }
    }
    ctx.db.confirmation.insert({
      id: 0n,
      reportId,
      confirmer: ctx.sender,
      createdAt: ctx.timestamp,
    });
  }
);

// F9 — report a wait time (minutes) for a spot; newest replaces older.
// Client name: reducers.reportWait
export const reportWait = spacetimedb.reducer(
  { spotId: t.u64(), minutes: t.u32() },
  (ctx, { spotId, minutes }) => {
    if (!ctx.db.spot.id.find(spotId)) {
      throw new SenderError(`no spot with id ${spotId}`);
    }
    if (minutes > 600) {
      throw new SenderError('wait time too large');
    }
    const existing = ctx.db.waitTime.spotId.find(spotId);
    if (existing) {
      ctx.db.waitTime.spotId.update({
        spotId,
        minutes,
        reporter: ctx.sender,
        createdAt: ctx.timestamp,
      });
    } else {
      ctx.db.waitTime.insert({
        spotId,
        minutes,
        reporter: ctx.sender,
        createdAt: ctx.timestamp,
      });
    }
  }
);

// Delete the caller's own wait report for a spot. Client: reducers.deleteWait
export const deleteWait = spacetimedb.reducer(
  { spotId: t.u64() },
  (ctx, { spotId }) => {
    const w = ctx.db.waitTime.spotId.find(spotId);
    if (w && w.reporter.equals(ctx.sender)) {
      ctx.db.waitTime.spotId.delete(spotId);
    }
  }
);

// Onboard / edit profile: sets display name (user.handle) + email/bio/avatar.
// Client name: reducers.setProfile
export const setProfile = spacetimedb.reducer(
  { name: t.string(), email: t.string(), bio: t.string(), avatar: t.string() },
  (ctx, { name, email, bio, avatar }) => {
    if (avatar.length > 400_000) {
      throw new SenderError('avatar too large');
    }
    const handle = name.trim().slice(0, 24) || `anon-${ctx.random.integerInRange(1000, 9999)}`;
    const u = ctx.db.user.identity.find(ctx.sender);
    if (u) ctx.db.user.identity.update({ ...u, handle });
    else ctx.db.user.insert({ identity: ctx.sender, handle, online: true });

    const p = ctx.db.profile.identity.find(ctx.sender);
    const next = {
      email: email.trim().slice(0, 120),
      bio: bio.trim().slice(0, 200),
      avatar,
    };
    if (p) ctx.db.profile.identity.update({ ...p, ...next });
    else
      ctx.db.profile.insert({
        identity: ctx.sender,
        ...next,
        savedPublic: false,
        onboarded: true,
      });
  }
);

// Toggle whether the caller's saved list is public. Client: reducers.setSavedPublic
export const setSavedPublic = spacetimedb.reducer(
  { isPublic: t.bool() },
  (ctx, { isPublic }) => {
    const p = ctx.db.profile.identity.find(ctx.sender);
    if (p) ctx.db.profile.identity.update({ ...p, savedPublic: isPublic });
    else
      ctx.db.profile.insert({
        identity: ctx.sender,
        email: '',
        bio: '',
        avatar: '',
        savedPublic: isPublic,
        onboarded: false,
      });
  }
);

// Save/unsave a spot (toggle). Client: reducers.toggleSaved
export const toggleSaved = spacetimedb.reducer(
  { spotId: t.u64() },
  (ctx, { spotId }) => {
    if (!ctx.db.spot.id.find(spotId)) {
      throw new SenderError(`no spot with id ${spotId}`);
    }
    for (const s of ctx.db.savedSpot.spotId.filter(spotId)) {
      if (s.owner.equals(ctx.sender)) {
        ctx.db.savedSpot.id.delete(s.id);
        return;
      }
    }
    ctx.db.savedSpot.insert({ id: 0n, owner: ctx.sender, spotId, createdAt: ctx.timestamp });
  }
);

// Save phone + gender/pronouns. Client: reducers.setContact
export const setContact = spacetimedb.reducer(
  { phone: t.string(), gender: t.string(), location: t.string() },
  (ctx, { phone, gender, location }) => {
    const existing = ctx.db.profileExtra.identity.find(ctx.sender);
    if (existing) ctx.db.profileExtra.identity.update({ ...existing, phone, gender, location });
    else ctx.db.profileExtra.insert({ identity: ctx.sender, phone, gender, location });
  }
);

// Add a spot to the user's active (most recent) trip; creates one on first use.
// Client: reducers.addToTrip
export const addToTrip = spacetimedb.reducer(
  { spotId: t.u64() },
  (ctx, { spotId }) => {
    if (!ctx.db.spot.id.find(spotId)) {
      throw new SenderError(`no spot with id ${spotId}`);
    }
    // The live itinerary is the newest trip that has NOT been archived to history.
    const archived = new Set<bigint>();
    for (const a of ctx.db.archivedTrip.owner.filter(ctx.sender)) archived.add(a.tripId);
    let active = undefined;
    for (const tr of ctx.db.trip.owner.filter(ctx.sender)) {
      if (archived.has(tr.id)) continue;
      if (!active || tr.createdAt.microsSinceUnixEpoch > active.createdAt.microsSinceUnixEpoch) {
        active = tr;
      }
    }
    if (!active) {
      active = ctx.db.trip.insert({
        id: 0n,
        owner: ctx.sender,
        name: 'My Trip',
        createdAt: ctx.timestamp,
      });
    }
    for (const s of ctx.db.tripStop.tripId.filter(active.id)) {
      if (s.spotId === spotId) return; // already on the trip
    }
    ctx.db.tripStop.insert({
      id: 0n,
      tripId: active.id,
      owner: ctx.sender,
      spotId,
      createdAt: ctx.timestamp,
    });
  }
);

// Remove a stop from a trip (only the owner). Client: reducers.removeTripStop
export const removeTripStop = spacetimedb.reducer(
  { stopId: t.u64() },
  (ctx, { stopId }) => {
    const stop = ctx.db.tripStop.id.find(stopId);
    if (stop && stop.owner.equals(ctx.sender)) {
      ctx.db.tripStop.id.delete(stopId);
    }
  }
);

// Reorder a trip's stops (drag-to-reorder). Re-inserts in the given order so the
// new sort is persisted (client sorts by createdAt, then id). Client: reducers.reorderTripStops
export const reorderTripStops = spacetimedb.reducer(
  { orderedStopIds: t.array(t.u64()) },
  (ctx, { orderedStopIds }) => {
    const ordered: { spotId: bigint; tripId: bigint }[] = [];
    for (const id of orderedStopIds) {
      const s = ctx.db.tripStop.id.find(id);
      if (s && s.owner.equals(ctx.sender)) ordered.push({ spotId: s.spotId, tripId: s.tripId });
    }
    if (ordered.length === 0) return;
    for (const id of orderedStopIds) {
      const s = ctx.db.tripStop.id.find(id);
      if (s && s.owner.equals(ctx.sender)) ctx.db.tripStop.id.delete(id);
    }
    for (const o of ordered) {
      ctx.db.tripStop.insert({
        id: 0n,
        tripId: o.tripId,
        owner: ctx.sender,
        spotId: o.spotId,
        createdAt: ctx.timestamp,
      });
    }
  }
);

// Create a named wishlist. Client: reducers.createWishlist
export const createWishlist = spacetimedb.reducer(
  { name: t.string(), color: t.string() },
  (ctx, { name, color }) => {
    ctx.db.wishlist.insert({
      id: 0n,
      owner: ctx.sender,
      name,
      color,
      createdAt: ctx.timestamp,
    });
  }
);

// Rename one of the caller's wishlist categories. Client: reducers.renameWishlist
export const renameWishlist = spacetimedb.reducer(
  { wishlistId: t.u64(), name: t.string() },
  (ctx, { wishlistId, name }) => {
    const wl = ctx.db.wishlist.id.find(wishlistId);
    if (!wl || !wl.owner.equals(ctx.sender)) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    ctx.db.wishlist.id.update({ ...wl, name: trimmed });
  }
);

// Delete one of the caller's wishlist categories (and all its items).
// Client: reducers.deleteWishlist
export const deleteWishlist = spacetimedb.reducer(
  { wishlistId: t.u64() },
  (ctx, { wishlistId }) => {
    const wl = ctx.db.wishlist.id.find(wishlistId);
    if (!wl || !wl.owner.equals(ctx.sender)) return;
    for (const it of ctx.db.wishlistItem.wishlistId.filter(wishlistId)) {
      ctx.db.wishlistItem.id.delete(it.id);
    }
    ctx.db.wishlist.id.delete(wishlistId);
  }
);

// Create a wishlist AND drop a spot into it in one transaction (used by the
// favorite popover's "New category"). Client name: reducers.createWishlistWithSpot
export const createWishlistWithSpot = spacetimedb.reducer(
  { name: t.string(), color: t.string(), spotId: t.u64() },
  (ctx, { name, color, spotId }) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!ctx.db.spot.id.find(spotId)) {
      throw new SenderError(`no spot with id ${spotId}`);
    }
    const wl = ctx.db.wishlist.insert({
      id: 0n,
      owner: ctx.sender,
      name: trimmed,
      color,
      createdAt: ctx.timestamp,
    });
    ctx.db.wishlistItem.insert({
      id: 0n,
      wishlistId: wl.id,
      owner: ctx.sender,
      spotId,
      createdAt: ctx.timestamp,
    });
  }
);

// Add a spot to one of the caller's wishlists (dedup). Client: reducers.addToWishlist
export const addToWishlist = spacetimedb.reducer(
  { wishlistId: t.u64(), spotId: t.u64() },
  (ctx, { wishlistId, spotId }) => {
    const wl = ctx.db.wishlist.id.find(wishlistId);
    if (!wl || !wl.owner.equals(ctx.sender)) {
      throw new SenderError('not your wishlist');
    }
    if (!ctx.db.spot.id.find(spotId)) {
      throw new SenderError(`no spot with id ${spotId}`);
    }
    for (const it of ctx.db.wishlistItem.wishlistId.filter(wishlistId)) {
      if (it.spotId === spotId) return; // already in this wishlist
    }
    ctx.db.wishlistItem.insert({
      id: 0n,
      wishlistId,
      owner: ctx.sender,
      spotId,
      createdAt: ctx.timestamp,
    });
  }
);

// Remove a spot from a wishlist (only the owner). Client: reducers.removeWishlistItem
export const removeWishlistItem = spacetimedb.reducer(
  { itemId: t.u64() },
  (ctx, { itemId }) => {
    const it = ctx.db.wishlistItem.id.find(itemId);
    if (it && it.owner.equals(ctx.sender)) {
      ctx.db.wishlistItem.id.delete(itemId);
    }
  }
);

// Drop a freshly-captured photo of a spot. data is a resized JPEG data URL.
// Client name: reducers.addPhoto
export const addPhoto = spacetimedb.reducer(
  { spotId: t.u64(), data: t.string() },
  (ctx, { spotId, data }) => {
    if (!ctx.db.spot.id.find(spotId)) {
      throw new SenderError(`no spot with id ${spotId}`);
    }
    if (!data.startsWith('data:image/') || data.length < 100) {
      throw new SenderError('invalid image data');
    }
    if (data.length > 400_000) {
      throw new SenderError('image too large');
    }
    ctx.db.photo.insert({
      id: 0n,
      spotId,
      photographer: ctx.sender,
      data,
      createdAt: ctx.timestamp,
    });
  }
);

// Delete one of the caller's own photos. Client: reducers.deletePhoto
export const deletePhoto = spacetimedb.reducer(
  { photoId: t.u64() },
  (ctx, { photoId }) => {
    const ph = ctx.db.photo.id.find(photoId);
    if (ph && ph.photographer.equals(ctx.sender)) {
      ctx.db.photo.id.delete(photoId);
    }
  }
);

// Archive the caller's trip into past-itinerary history. Client: reducers.archiveTrip
export const archiveTrip = spacetimedb.reducer(
  { tripId: t.u64() },
  (ctx, { tripId }) => {
    const tr = ctx.db.trip.id.find(tripId);
    if (!tr || !tr.owner.equals(ctx.sender)) return;
    for (const a of ctx.db.archivedTrip.tripId.filter(tripId)) {
      if (a.owner.equals(ctx.sender)) return; // already archived
    }
    ctx.db.archivedTrip.insert({ id: 0n, tripId, owner: ctx.sender, createdAt: ctx.timestamp });
  }
);
