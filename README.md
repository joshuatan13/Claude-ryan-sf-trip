# 🌉 Bay Area Trip Planner

A tiny, mobile-first web app for planning a friend's Bay Area visit
(**June 19–23, 2026**). No accounts, no backend — the whole itinerary is
encoded in a **shareable link** you can text to anyone.

## What it does

- **📍 Places tab** — a pre-seeded catalog of Bay Area favorites you can
  search, filter by area, and add your own to (with an in-app editor).
- **🗓️ Itinerary tab** — five day-chips (Fri Jun 19 → Tue Jun 23). Add
  stops to any day, reorder them (drag, or ↑/↓ buttons), give each a
  time/note, and remove what you don't want.
- **🧭 Location aware** — each day shows the areas it covers and warns if
  it's spread out (lots of driving). "Open day route in Maps" launches
  Google Maps with all the day's stops as waypoints — real directions, no
  API key needed.
- **🔗 Share** — the Share button copies a link that contains the entire
  plan. Your friend opens it on their phone, tweaks it, and shares a new
  link back. Everything also auto-saves to the browser locally.

## How sharing works

State (your custom places, edits, hidden seeds, and the day-by-day
itinerary) is serialized into the URL hash as URL-safe base64. Opening a
link rehydrates that state; editing updates the address bar live so the URL
is always current. `localStorage` is a per-device backup.

## Run locally

It's plain static files — just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy (GitHub Pages)

Once this branch is merged to `main`:

1. Repo **Settings → Pages**
2. **Source:** Deploy from a branch → **Branch:** `main` / `(root)`
3. Save. Your app will be live at
   `https://<user>.github.io/<repo>/` — share that URL with anyone, no
   Claude account required.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell + markup |
| `styles.css` | Mobile-first styling |
| `data.js` | Seed places + region/category config |
| `app.js` | State, rendering, sharing, drag/drop |

## Customizing

Edit the starter catalog and trip dates in `data.js` (`SEED_PLACES`,
`TRIP`). You can also add/edit places entirely in-app — no code needed.
