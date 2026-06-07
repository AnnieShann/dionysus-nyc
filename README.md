# Dionysus 
### Real-time NYC discovery — find what's alive in the city right now

> SpacetimeDB Launchpad Hackathon · NYC Tech Week · June 2026

**Live demo:** [nyc-pulse-two.vercel.app](https://nyc-pulse-two.vercel.app)

---

## What it is

Dionysus is a real-time NYC map app powered entirely by word of mouth. Every pin on the map reflects what people are saying *right now* — not Yelp reviews from six months ago. Users drop live vibes, report wait times, confirm what's still accurate, and plan itineraries together. The whole thing is collaborative, live, and built on SpacetimeDB.

Think Waze, but for finding out where to go on a Friday night in New York.

---

## The problem it solves

Google Maps tells you a restaurant has 4.2 stars. It does not tell you the line is currently 45 minutes, the DJ just started, or the place is completely empty on a Tuesday. Dionysus fills that gap with community-sourced real-time intelligence — the kind of information that only exists in a text message from a friend who's already there.

---

## Why SpacetimeDB

Every feature in Dionysus requires live shared state between users:

- A vibe post from one user needs to appear on every other user's map immediately
- Wait time reports need to update pins in real time without anyone refreshing
- "Still accurate" confirmations need to be atomic — no double-confirming
- User presence (online/offline) needs to propagate instantly

SpacetimeDB makes all of this trivial. There is no separate backend server. No WebSocket boilerplate. No polling. Every reducer call is a transaction that commits atomically and pushes diffs to all subscribed clients automatically. What would normally require a custom Node server + PostgreSQL + Socket.io is replaced by a single TypeScript module.

---

## Features

**Live map**
- Real-time venue pins across NYC, colored by current activity level
- Four heat states: Packed  / Filling / Chill / Dead  — set by community reports
- Heat score (0–100) per venue computed from recency, confirmations, and wait times
- Activity sparkline per venue showing report history at a glance
- Category filters: Food, Drinks, Music, Museums, Parks, Nightlife, Transit, Shopping, Landmarks
- Hot Now ranking — top venues sorted by live heat score
- Live feed — all recent reports across the city, newest first, confirmed reports float up

**Vibe reports**
- Submit a busyness report for any venue with an optional text note (max 140 chars)
- Reports appear on the map instantly for all connected users
- "Still accurate" confirmations — tap to confirm a report is current; idempotent per identity
- Wait time reports — community-sourced minutes, newest replaces older, auto-expires after 60 min

**Plan my night — AI itinerary builder**
- Natural language input: "chill dinner then jazz, West Village"
- LLM (`api/plan.ts`) sequences a multi-stop night using live SpacetimeDB vibe data
- Returns a ranked itinerary with venue names, suggested times, and reasoning
- Accept plan or regenerate with one tap
- Built with `isPlanQuery`, `validatePlan`, `buildFallbackPlan` helpers in `src/lib/plan.ts`

**Vibe Circle — "Your Dionysus"**
- Radial social graph showing your friends and your vibe compatibility with each
- Compatibility score computed via Jaccard similarity + busyness blend (`src/lib/vibeMatch.ts`)
- LLM-generated "why you match" phrasing per connection (`api/match.ts`)
- Seeded with demo friend users and histories via `seedFriends` reducer
- Rendered as an interactive graph with expand modal and callout (`src/components/VibeGraph.tsx`)

**NYC Wrapped — "Your NYC, Wrapped"**
- Personalized stats card generated from your activity: places explored, miles traced, crowd exposure
- Deterministic archetype assignment (e.g. "Culture Vulture") based on your category patterns
- Rhythm score (morning/afternoon/night person), percentile ranking vs. other users
- LLM-generated caption phrasing (`api/wrapped.ts`)
- Shareable card UI with count-up animations (`src/components/Wrapped.tsx`)

**User system**
- Automatic identity via SpacetimeDB — no login required
- Custom display handles (set once, remembered across sessions)
- Online/offline presence tracked via connect/disconnect lifecycle hooks

**UI**
- Draggable bottom sheet with two snap points — collapse to peek, drag up to expand
- Mobile-first, optimized for iPhone viewport
- Dark glassmorphism design system with CSS custom properties
- Animated number transitions, breathing pulse indicators, feed-enter animations

---

## Data model

All state lives in SpacetimeDB. There is no other database.

### Tables

**`spot`** — Fixed venues seeded on first publish. 25 real locations within ~1 mile of Herald Square.
```
id (u64, PK, autoInc) · name · latitude · longitude · category
```

**`report`** — A busyness report from a user about a spot.
```
id (u64, PK, autoInc) · spotId (indexed) · reporter (identity) · status · note (optional) · createdAt (indexed)
```
Status must be one of: `packed` · `filling` · `chill` · `dead` — validated server-side in the reducer.

**`user`** — One row per identity that has ever connected.
```
identity (PK) · handle · online (bool)
```

**`confirmation`** — "Still accurate" confirmations. One per identity per report — idempotent.
```
id (u64, PK, autoInc) · reportId (indexed) · confirmer (identity) · createdAt
```

**`wait_time`** — Current wait time for a spot. One row per spot; newest replaces older.
```
spotId (PK, one per spot) · minutes · reporter (identity) · createdAt
```

### Reducers

| Reducer | What it does |
|---|---|
| `submitReport` | Validates status, checks spot exists, inserts a report |
| `setHandle` | Sets the caller's display name (trimmed, max 24 chars) |
| `confirmReport` | Idempotent confirmation — no-ops if already confirmed by this identity |
| `reportWait` | Upserts wait time for a spot — updates if row exists, inserts if not |
| `seedFriends` | Seeds demo friend users and vibe histories for Vibe Circle |

### Lifecycle hooks

| Hook | What it does |
|---|---|
| `init` | Seeds 25 NYC venues on first publish |
| `onConnect` | Creates user row or flips existing user online |
| `onDisconnect` | Flips user offline |

---

## Architecture

Each major feature follows the same pattern: a **lib** (pure logic) + a **component** (UI) + an **api** function (optional LLM) + wiring in `App.tsx`.

| Feature | Logic | UI | LLM |
|---|---|---|---|
| Core map + vibes | `pulse.ts` | `pulse-ui.tsx`, `MapView.tsx` | — |
| Plan my night | `src/lib/plan.ts` | `Screens.tsx` (ChatPanel) | `api/plan.ts` |
| Vibe Circle | `src/lib/vibeMatch.ts` | `VibeGraph.tsx` | `api/match.ts` |
| NYC Wrapped | `src/lib/wrapped.ts` | `Wrapped.tsx` | `api/wrapped.ts` |

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend + database | SpacetimeDB (TypeScript module) |
| Frontend | React + TypeScript |
| Styling | Tailwind CSS + CSS custom properties |
| Map | react-leaflet |
| LLM | OpenRouter (Claude via `api/plan.ts`, `api/match.ts`, `api/wrapped.ts`) |
| Deployment | Vercel |

---

## Project structure

```
nyc-pulse/
├── spacetimedb/
│   └── src/
│       └── index.ts              # All tables, reducers, seed data
├── api/
│   ├── plan.ts                   # LLM night sequencer (Plan my night)
│   ├── match.ts                  # LLM "why you match" phrasing (Vibe Circle)
│   └── wrapped.ts                # LLM caption phrasing (NYC Wrapped)
├── src/
│   ├── components/
│   │   ├── BottomSheet.tsx       # Draggable two-snap-point sheet
│   │   ├── pulse-ui.tsx          # Core UI primitives
│   │   ├── VibeGraph.tsx         # Vibe Circle radial graph
│   │   ├── Wrapped.tsx           # NYC Wrapped card
│   │   └── Screens.tsx           # Profile screen + ChatPanel
│   ├── lib/
│   │   ├── plan.ts               # Plan helpers + fallback builder
│   │   ├── vibeMatch.ts          # Jaccard + busyness match scoring
│   │   ├── wrapped.ts            # Deterministic stats + archetype
│   │   ├── useAnimatedNumber.ts  # Smooth number transitions
│   │   └── useMediaQuery.ts      # Responsive layout hook
│   ├── App.tsx                   # Root — wires all features together
│   ├── MapView.tsx               # Leaflet map + pin rendering
│   ├── pulse.ts                  # Heat scores, feed sorting, helpers
│   └── module_bindings/          # Auto-generated from SpacetimeDB module
├── index.html
├── package.json
└── vite.config.ts
```

---

## Running locally

### Prerequisites
- Node.js 18+
- SpacetimeDB CLI — [install here](https://spacetimedb.com/install)

### Setup

```bash
# Clone the repo
git clone https://github.com/AnnieShann/nyc-pulse.git
cd nyc-pulse

# Install dependencies
npm install

# Start SpacetimeDB locally and publish the module
cd spacetimedb
spacetime start
spacetime publish nyc-pulse

# Generate TypeScript bindings
spacetime generate --lang typescript --out-dir ../src/module_bindings

# Start the frontend
cd ..
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Environment variables

Create a `.env.local` file:
```
VITE_SPACETIMEDB_HOST=localhost:3000
VITE_SPACETIMEDB_DB_NAME=nyc-pulse
VITE_OPENROUTER_API_KEY=sk-or-xxxxxxxxxx
```

---

## Seed data

On first publish, the `init` lifecycle hook seeds 25 real NYC venues within ~1 mile of Herald Square, including Times Square, Bryant Park, Madison Square Garden, Chelsea Market, The High Line, Union Square, Grand Central Terminal, and Koreatown. The `seedFriends` reducer populates demo friend users and vibe histories for the Vibe Circle feature. No manual seeding step needed.

---

## Team

Built at the SpacetimeDB Launchpad Hackathon during NYC Tech Week, June 2026.

| Name | Role |
|---|---|
| Masha Zaitsev | Design + Frontend |
| Shubham Kumar | SpacetimeDB backend |
| Annie Shan | Frontend integration |
| Daniel Henk, Masha Zaitsev | AI + data |

---

## How SpacetimeDB is used

SpacetimeDB is not an add-on — it **is** the backend. Every interaction in the app flows through a reducer:

- User opens app → `onConnect` fires, user row created or updated
- User submits a vibe → `submitReport` validates and commits atomically
- Another user's map → receives the new report via subscription push, no refresh needed
- User taps "Still accurate" → `confirmReport` checks for duplicates and inserts idempotently
- User reports a wait → `reportWait` upserts so there's always exactly one current wait per venue
- Vibe Circle loads → `vibeMatch.ts` computes Jaccard similarity across shared SpacetimeDB report history
- NYC Wrapped opens → `wrapped.ts` computes deterministic stats from the user's full report history in SpacetimeDB

The frontend subscribes to all five tables on connect. SpacetimeDB handles diffing and pushing — the React components just read from the live table cache via the generated hooks. The LLM features in `api/` are stateless serverless functions that read from SpacetimeDB data passed as context — they enhance the experience but are never in the critical path.
