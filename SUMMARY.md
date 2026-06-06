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

Open the app and see a live heatmap of the city. Hot venues glow. Quiet ones fade. Tap any pin and see what people are saying *right now* — not reviews from six months ago. Post a vibe in 10 seconds. Report a wait time. Upload a photo that disappears in 24 hours. Plan a night out with friends in a shared itinerary that updates live as everyone adds stops.

It's the difference between knowing a place has good reviews and knowing it's electric right now.

---

## How it works for a user

1. Open the app — see a live map of NYC with glowing venue pins
2. Tap a pin — see real community posts from the last few hours
3. Post a vibe — "Just got a table, walk-in friendly right now" — it appears on everyone's map instantly
4. Plan together — create a shared itinerary, invite friends, add stops collaboratively
5. Toggle Tourist / Local — see the city through the eyes of someone who actually lives here

---

## Why SpacetimeDB is the right backend for this

Dionysus is fundamentally a real-time shared state problem. When one user posts a vibe, every other user's map needs to update immediately. Wait times need to be atomic — no race conditions. Presence needs to propagate the moment someone connects or disconnects.

With a traditional backend this means: a Node server, a PostgreSQL database, a WebSocket layer, and a lot of custom conflict resolution code.

With SpacetimeDB it means: one TypeScript file.

Every user action flows through a reducer — an atomic transaction that commits to the database and pushes diffs to all subscribed clients simultaneously. There is no separate server. There is no WebSocket boilerplate. The entire backend is five tables and four reducers.

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
