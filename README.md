# 🌉 Bay Area Trip Planner

A tiny, mobile-first web app for planning a friend's Bay Area visit
(**June 19–23, 2026**). No accounts, no backend — the whole itinerary is
encoded in a **shareable link** you can text to anyone.

## What it does

- **⭐ Favorites tab (input side)** — quick-add with auto-guessed category
  + area, plus a bulk-paste box that parses a messy list (detects section
  headers, pulls notes from parentheses, "Name: place" → "Rec by"). Inline
  dropdowns reclassify at scale. Every place has a Google Maps link.
- **🗓️ Plan tab (itinerary side)** — five day-chips (Fri Jun 19 → Tue Jun
  23). Add stops via a picker, reorder (drag or ↑/↓), set **start/end
  times** per stop, add notes, and remove.
- **🗺️ Map tab** — a self-contained SVG map of the Bay (no libraries, no
  API key) placing every favorite by area; tap a pin to open it in Maps.
- **📅 Calendar** — each stop has an "Add to Google Calendar" link, and you
  can download a `.ics` of a day or the whole trip to import into any
  calendar (Google/Apple/Outlook). No login or backend.
- **🧭 Location aware** — each day shows the areas it covers, warns when
  spread out, and "Day route" opens Google Maps with the stops as waypoints.
- **🔗 Share** — the Share button copies a link containing the entire plan.
  Your friend opens it, tweaks it, and shares a new link back. Auto-saved
  to the browser too.

## Auto-sync (optional shared backend)

By default the app is link-only: state lives in the URL + each browser's
local storage, and you share changes by sending the link. Turn on **auto-sync**
to have you and your friends always see the latest with no link-passing:

1. Follow the steps in `firebase-config.js` (create a free Firebase project,
   enable Realtime Database, paste the web config). ~2 minutes, no app logins.
2. That's it. The app stores the whole plan in one cloud doc keyed by an
   unguessable **trip ID** that rides in the share link (`#t=<id>`). Edits
   from anyone with the link sync automatically (last-write-wins). A badge in
   the header shows **☁ Synced** vs **✓ Saved** (link-only).

The Firebase web config is public by design — not a secret. Access is scoped
by the unguessable trip ID, so only people you send the link to reach a trip.
If the config is blank, the app silently runs in link-only mode.

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
