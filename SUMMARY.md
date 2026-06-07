# Dionysus
### The live pulse of New York City

**Hackathon:** SpacetimeDB Launchpad · NYC Tech Week · June 2026
**Demo:** [nyc-pulse-two.vercel.app](https://nyc-pulse-two.vercel.app)

---

## The problem

You're in New York on a Friday night. You open Google Maps. It tells you a bar has 4.3 stars and closes at 2am. It does not tell you the line is currently 45 minutes. It does not tell you the DJ just started. It does not tell you the place is completely dead tonight and not worth the Uber.

That information exists — it's just trapped in text messages between friends who are already there.

---

## What we built

Dionysus is a real-time NYC discovery app powered entirely by word of mouth.

Open the app and see a live heatmap of the city. Hot venues glow. Quiet ones fade. Tap any pin and see what people are saying *right now* — not reviews from six months ago. Post a vibe in 10 seconds. Report a wait time. Let the AI plan your whole night based on what's actually alive right now, not what was good last month.

It's the difference between knowing a place has good reviews and knowing it's electric tonight.

---

## The features

**Live map** — Venue pins colored and sized by real-time heat score (0–100), computed from community reports, confirmations, and wait times. Hot Now ranking shows the top spots in the city right now. A live feed shows every report as it comes in across the city.

**Vibe reports** — Tap any pin, call it Packed / Filling / Chill / Dead, add a note. Your report lands on every connected user's map instantly. Others can tap "Still accurate" to confirm it's still true — confirmed reports float to the top and boost the venue's heat score.

**Plan my night** — Type what you want in plain English: "chill dinner then jazz, not too crowded." An LLM sequences a multi-stop itinerary using live SpacetimeDB vibe data — not static ratings, but what's actually good right now. Accept the plan or regenerate with one tap.

**Vibe Circle** — A radial social graph showing your friends and how well your tastes match, computed using Jaccard similarity across your shared vibe histories in SpacetimeDB. An LLM explains why you and a friend are a match in plain language. Your personal social map of the city.

**NYC Wrapped** — A personalized stats card built from everything you've done in the app: places explored, miles traced, how many people you've been around, what time of day you move, and an archetype that captures your NYC personality ("Culture Vulture," etc.). Shareable. Updated live.

---

## Why SpacetimeDB is the right backend for this

Dionysus is fundamentally a real-time shared state problem. When one user posts a vibe, every other user's map needs to update immediately. Wait times need to be atomic — no race conditions. Presence needs to propagate the moment someone connects or disconnects. Vibe Circle needs to compute match scores across the full shared history of all users in real time.

With a traditional backend this means: a Node server, a PostgreSQL database, a WebSocket layer, conflict resolution code, and a separate caching layer.

With SpacetimeDB it means: one TypeScript file.

Every user action flows through a reducer — an atomic transaction that commits to the database and pushes diffs to all subscribed clients simultaneously. There is no separate server. There is no WebSocket boilerplate. The entire backend is five tables and five reducers. The LLM features are stateless serverless functions that read SpacetimeDB data as context — they enhance the experience but are never in the critical path.

This let a team of four build a fully real-time collaborative app with three distinct AI features in a single weekend.

---

## What makes it different from existing apps

| | Google Maps | Yelp | Dionysus |
|---|---|---|---|
| Information age | Months old | Months old | Right now |
| Source | Professional reviews | User reviews | People there tonight |
| Real-time sync | No | No | Yes — SpacetimeDB push |
| AI planning | No | No | Live-data itinerary builder |
| Social graph | No | No | Vibe Circle match scoring |
| Personalized stats | No | No | NYC Wrapped |
| Collaborative | No | No | Yes — shared live state |

---

## The team

Four people. One weekend. Built at the SpacetimeDB Launchpad Hackathon during NYC Tech Week, June 2026.

- **Masha Zaitsev** — Design + Frontend
- **Shubham Kumar** — SpacetimeDB backend
- **Annie Shan** — Frontend integration
- **Daniel Henk, Masha Zaitsev** — AI + data

---

*Dionysus — because the god of wine and revelry would have wanted to know where the party was.*
This let a team of four build a fully real-time collaborative app in a single weekend.

---

## What makes it different from existing apps

| | Google Maps | Yelp | Dionysus |
|---|---|---|---|
| Information age | Months old | Months old | Right now |
| Source | Professional reviews | User reviews | People there tonight |
| Real-time | No | No | Yes |
| Collaborative planning | No | No | Yes |
| Disappearing content | No | No | 24-hour vibes |
| Built for locals | No | No | Tourist + Local mode |

---

## The team

Four people. One weekend. Built at the SpacetimeDB Launchpad Hackathon during NYC Tech Week, June 2026.

- **Masha Zaitsev** — Design + Frontend
- **Shubham Kumar** — SpacetimeDB backend
- **Annie Shan** — Frontend integration  
- **Daniel Henk, Masha Zaitsev** — AI itinerary builder + data

---

*Dionysus — because the god of wine and revelry would have wanted to know where the party was.*
