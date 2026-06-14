/* Bay Area Trip Planner — vanilla JS, no build, no backend.
   State lives in the URL hash (shareable) + localStorage (backup).

   Tabs:
     🗓️ Plan      — visitor side: 5-day itinerary with per-stop times,
                     Google Maps links, and calendar export (.ics / GCal).
     🗺️ Map       — light SVG map of the Bay placing every favorite by area.
     ⭐ Favorites  — host side: input + classify favorites at scale. */

(function () {
  "use strict";

  const { TRIP, REGIONS, CATEGORIES, SEED_PLACES } = window;
  const LS_KEY = "bay-trip-v1";
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const TZ = "America/Los_Angeles";

  // ---------- State (compact + share-friendly) ----------
  //   i : itinerary -> per day: array of [placeId, start, end, note]
  //   cp/ep/hp as before
  let state = {
    i: Array.from({ length: TRIP.days }, () => []),
    cp: [], ep: {}, hp: [],
  };
  let ui = {
    tab: "plan", day: 0,
    favSearch: "", favFilter: "all",
    bulkOpen: false,
    qa: { cat: "food", region: "sf", catTouched: false, regionTouched: false },
    picker: { open: false, search: "", filter: "all" },
    map: { selected: null, filter: "all" },
  };

  // ---------- URL <-> state ----------
  function encode(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(str) {
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  }
  let pendingTripId = null; // set when the URL is a #t=<tripId> sync link
  function loadLocal() {
    try { const raw = localStorage.getItem(LS_KEY); if (raw) mergeState(JSON.parse(raw)); } catch (e) {}
  }
  function loadState() {
    const hash = location.hash.replace(/^#/, "");
    if (hash.indexOf("t=") === 0) { pendingTripId = hash.slice(2); loadLocal(); return; }
    if (hash) { try { mergeState(decode(hash)); return; } catch (e) { console.warn("Bad link:", e); } }
    loadLocal();
  }
  function mergeState(s) {
    state.i = Array.isArray(s.i) ? s.i.slice(0, TRIP.days) : state.i;
    while (state.i.length < TRIP.days) state.i.push([]);
    state.cp = Array.isArray(s.cp) ? s.cp : [];
    state.ep = s.ep && typeof s.ep === "object" ? s.ep : {};
    state.hp = Array.isArray(s.hp) ? s.hp : [];
  }
  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
    if (window.Sync && Sync.enabled) {
      history.replaceState(null, "", "#t=" + Sync.tripId);
      Sync.push(state);
    } else {
      history.replaceState(null, "", "#" + encode(state));
    }
  }

  // ---------- Sync wiring (auto-sync when firebase-config.js is filled in) ----------
  let pendingRender = false;
  function guardedRender() {
    // don't yank a field out from under someone who's typing/picking a time
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { pendingRender = true; return; }
    render();
  }
  document.addEventListener("focusout", () => {
    if (pendingRender) { pendingRender = false; setTimeout(render, 60); }
  });
  function setSaveBadge(mode) {
    const el = document.getElementById("saveBadge"); if (!el) return;
    if (mode === "cloud") { el.textContent = "☁ Synced"; el.className = "save-badge cloud"; }
    else if (mode === "saving") { el.textContent = "Saving…"; el.className = "save-badge"; }
    else { el.textContent = "✓ Saved"; el.className = "save-badge"; }
  }
  function initSync() {
    if (!window.Sync || !Sync.configured()) { setSaveBadge("local"); return; }
    setSaveBadge("saving");
    Sync.init({
      tripId: pendingTripId || undefined,
      getState: () => state,
      onReady: (id) => { history.replaceState(null, "", "#t=" + id); setSaveBadge("cloud"); },
      onRemote: (rs) => {
        mergeState(rs);
        try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
        setSaveBadge("cloud"); guardedRender();
      },
      onSaving: () => setSaveBadge("saving"),
      onSaved: () => setSaveBadge("cloud"),
      onError: () => setSaveBadge("local"),
    });
  }

  // ---------- Catalog ----------
  function catalog() {
    const hidden = new Set(state.hp);
    return SEED_PLACES.filter((p) => !hidden.has(p.id))
      .map((p) => (state.ep[p.id] ? { ...p, ...state.ep[p.id] } : p))
      .concat(state.cp);
  }
  function placeById(id) { return catalog().find((p) => p.id === id); }
  function isCustom(id) { return id.startsWith("c_"); }

  // ---------- Auto-classify ----------
  function guessCat(name) {
    const n = " " + name.toLowerCase() + " ";
    const has = (...ws) => ws.some((w) => n.includes(w));
    if (has("coffee", "café", "cafe", "matcha", "espresso", "latte", "roaster")) return "coffee";
    if (has("bakery", "croissant", "pastry", "ice cream", "gelato", "dessert", "cake", "donut", "doughnut", "boba", "creamery", "chocolate")) return "dessert";
    if (has("beach", "park", "trail", "falls", "hike", "hiking", "mountain", "mt ", "mount", "lake", "garden", "woods", "point", "lands end", "ocean", "bonfire", "redwood")) return "outdoors";
    if (has("museum", "gallery", "exhibit")) return "museum";
    if (has("bar", "brewery", "cocktail", "club", "pub", "lounge", "speakeasy")) return "nightlife";
    if (has("golf", "tour", "class", "kayak", "bowling", "karaoke", "cook", "watch", "viewing", "world cup", "spa", "surf")) return "activity";
    if (has("viewpoint", "tower", "bridge", "overlook", "twin peaks")) return "view";
    if (has("taco", "restaurant", "kitchen", "thai", "sichuan", "szechuan", "ramen", "sushi", "pizza", "dumpling", "potsticker", "bbq", "noodle", "dim sum", "grill", "burger", "deli", "oyster", "seafood", "diner", "bistro", "pho", "curry", "dosa")) return "food";
    if (has("japantown", "chinatown", "district", "temple", "shrine")) return "culture";
    if (has("shop", "mall", "market", "store", "boutique")) return "shopping";
    return "food";
  }
  function guessRegion(name) {
    const n = " " + name.toLowerCase() + " ";
    const has = (...ws) => ws.some((w) => n.includes(w));
    if (has("tam", "tamalpais", "sausalito", "muir", "point reyes", "alamere", "bolinas", "mill valley", "tiburon", "marin", "stinson")) return "marin";
    if (has("oakland", "berkeley", "emeryville", "alameda", "merritt", "richmond")) return "eastbay";
    if (has("stanford", "palo alto", "menlo", "redwood city", "woodside", "filoli", "san mateo", "burlingame")) return "peninsula";
    if (has("san jose", "mountain view", "cupertino", "sunnyvale", "santa clara", "milpitas", "topgolf", "apple park", "los gatos")) return "southbay";
    if (has("santa cruz", "half moon", "pacifica", "montara", "capitola")) return "coast";
    return "sf";
  }

  // ---------- Dates ----------
  function dayDate(offset) {
    const [y, m, d] = TRIP.startDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + offset));
    return { dow: DOW[dt.getUTCDay()], mon: MON[dt.getUTCMonth()], day: dt.getUTCDate() };
  }
  function dayYMD(offset) {
    const [y, m, d] = TRIP.startDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + offset));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }
  const pad = (n) => String(n).padStart(2, "0");
  function fmtTime(hm) {
    if (!hm) return "";
    let [h, m] = hm.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${pad(m)} ${ap}`;
  }

  // ---------- Shared rendering bits ----------
  const viewEl = document.getElementById("view");
  function emojiFor(p) { return p.emoji || (CATEGORIES[p.cat] || {}).emoji || "📍"; }
  function tagsHtml(p) {
    const r = REGIONS[p.region] || { label: p.region, color: "#999" };
    const c = CATEGORIES[p.cat] || { label: p.cat };
    return `<div class="tags">
      <span class="tag" style="background:${r.color}">${esc(r.label)}</span>
      <span class="tag cat">${esc(c.label)}</span></div>`;
  }
  function mapUrl(p) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.query || p.name)}`;
  }
  function webLink(p) {
    return p.web ? `<a class="weblink" href="${esc(p.web)}" target="_blank" rel="noopener">🌐 Site</a>` : "";
  }
  function catOptions(sel) {
    return Object.entries(CATEGORIES)
      .map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${v.emoji} ${v.label}</option>`).join("");
  }
  function regionOptions(sel) {
    return Object.entries(REGIONS)
      .map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${v.label}</option>`).join("");
  }

  function render() {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === ui.tab));
    if (ui.tab === "favorites") renderFavorites();
    else if (ui.tab === "map") renderMap();
    else renderPlan();
  }

  // ====================================================================
  //  CALENDAR EXPORT (no backend / no OAuth)
  // ====================================================================
  function addHour(hm) { let [h, m] = hm.split(":").map(Number); h = (h + 1) % 24; return pad(h) + ":" + pad(m); }
  function stamp(ymd, hm) { return `${ymd.y}${pad(ymd.m)}${pad(ymd.d)}T${hm.replace(":", "")}00`; }

  // Google Calendar "add event" template link — opens GCal prefilled.
  function gcalUrl(p, offset, start, end, note) {
    const ymd = dayYMD(offset);
    let dates;
    if (!start) {
      const nx = dayYMD(offset + 1);
      dates = `${ymd.y}${pad(ymd.m)}${pad(ymd.d)}/${nx.y}${pad(nx.m)}${pad(nx.d)}`;
    } else {
      dates = `${stamp(ymd, start)}/${stamp(ymd, end || addHour(start))}`;
    }
    const params = new URLSearchParams({ action: "TEMPLATE", text: p.name, dates, ctz: TZ });
    const details = [note, p.note, p.query ? "Map: " + mapUrl(p) : ""].filter(Boolean).join("\n");
    if (details) params.set("details", details);
    params.set("location", p.query || p.name);
    return "https://calendar.google.com/calendar/render?" + params.toString();
  }

  function icsEsc(s) {
    return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }
  function icsStamp() {
    const d = new Date();
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  }
  function icsEvent(p, offset, start, end, note) {
    const ymd = dayYMD(offset);
    let ds, de;
    if (!start) {
      const nx = dayYMD(offset + 1);
      ds = `DTSTART;VALUE=DATE:${ymd.y}${pad(ymd.m)}${pad(ymd.d)}`;
      de = `DTEND;VALUE=DATE:${nx.y}${pad(nx.m)}${pad(nx.d)}`;
    } else {
      ds = `DTSTART:${stamp(ymd, start)}`;
      de = `DTEND:${stamp(ymd, end || addHour(start))}`;
    }
    return ["BEGIN:VEVENT", `UID:${(p.id || "x")}-${offset}-${Math.random().toString(36).slice(2, 7)}@bayareatrip`,
      "DTSTAMP:" + icsStamp(), ds, de, "SUMMARY:" + icsEsc(p.name),
      "LOCATION:" + icsEsc(p.query || p.name),
      "DESCRIPTION:" + icsEsc([note, p.note].filter(Boolean).join(" — ")), "END:VEVENT"].join("\r\n");
  }
  function buildICS(events) {
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bay Area Trip//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
  }
  function downloadICS(filename, text) {
    const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function dayEvents(offset) {
    return state.i[offset].map((it) => {
      const p = placeById(it[0]);
      return p ? icsEvent(p, offset, it[1] || "", it[2] || "", it[3] || "") : null;
    }).filter(Boolean);
  }
  function exportDay(offset) {
    const evs = dayEvents(offset);
    if (!evs.length) { toast("No stops on this day yet"); return; }
    downloadICS(`bay-trip-day${offset + 1}.ics`, buildICS(evs));
    toast("Calendar file downloaded 📅");
  }
  function exportTrip() {
    let evs = [];
    state.i.forEach((_, offset) => { evs = evs.concat(dayEvents(offset)); });
    if (!evs.length) { toast("Nothing planned yet"); return; }
    downloadICS("bay-area-trip.ics", buildICS(evs));
    toast("Full trip downloaded 📅 — open it to import");
  }

  // ====================================================================
  //  🗓️ PLAN TAB
  // ====================================================================
  function renderPlan() {
    const day = ui.day;
    let html = `<div class="day-strip">`;
    for (let i = 0; i < TRIP.days; i++) {
      const d = dayDate(i); const n = state.i[i].length;
      html += `<div class="day-chip ${i === day ? "active" : ""}" data-day="${i}">
        <div class="dc-dow">${d.dow}</div><div class="dc-date">${d.mon} ${d.day}</div>
        <div class="dc-count">${n ? n + " stop" + (n > 1 ? "s" : "") : "—"}</div></div>`;
    }
    html += `</div>`;

    const items = state.i[day];
    if (!items.length) {
      html += `<div class="empty"><div class="big">🗺️</div><p>Nothing planned for this day yet.</p></div>`;
    } else {
      const regions = new Set(items.map((it) => (placeById(it[0]) || {}).region).filter(Boolean));
      html += summaryHtml(regions);
      items.forEach((it, idx) => {
        const p = placeById(it[0]); if (!p) return;
        const start = it[1] || "", end = it[2] || "", note = it[3] || "";
        const range = start ? `<span class="time-badge">${fmtTime(start)}${end ? "–" + fmtTime(end) : ""}</span>` : "";
        html += `
          <div class="card place itin-item" draggable="true" data-idx="${idx}">
            <div class="place-emoji">${emojiFor(p)}</div>
            <div class="place-body">
              <p class="place-name">${esc(p.name)} ${range}</p>
              ${tagsHtml(p)}
              ${p.note ? `<p class="place-note">${esc(p.note)}</p>` : ""}
              ${webLink(p)}
            </div>
          </div>
          <div class="item-controls" data-idx="${idx}">
            <div class="time-group">
              <input type="time" class="time-input" data-start="${idx}" value="${esc(start)}" aria-label="Start time" />
              <span class="dash">→</span>
              <input type="time" class="time-input" data-end="${idx}" value="${esc(end)}" aria-label="End time" />
            </div>
            <a class="icon-btn" href="${mapUrl(p)}" target="_blank" rel="noopener" title="Open in Google Maps">🗺️</a>
            <a class="icon-btn" href="${gcalUrl(p, day, start, end, note)}" target="_blank" rel="noopener" title="Add to Google Calendar">📅</a>
            <span class="spacer"></span>
            <button class="icon-btn" data-move="up" data-idx="${idx}" ${idx === 0 ? "disabled" : ""}>↑</button>
            <button class="icon-btn" data-move="down" data-idx="${idx}" ${idx === items.length - 1 ? "disabled" : ""}>↓</button>
            <button class="icon-btn danger" data-remove="${idx}">✕</button>
            <input class="note-input" data-note="${idx}" placeholder="✏️ note (optional)" value="${esc(note)}" />
          </div>`;
      });
      html += `<div class="day-actions">
        <a class="btn route" href="${routeUrl(items)}" target="_blank" rel="noopener">🧭 Day route</a>
        <button class="btn cal" data-ics-day="${day}">📅 Add day to calendar</button>
      </div>`;
    }

    html += `<button class="btn primary block addstops" id="openPicker">＋ Add stops to ${dayDate(day).dow}</button>`;
    html += `<a class="trip-export" id="exportTrip" role="button">📅 Export whole trip to calendar (.ics)</a>`;
    viewEl.innerHTML = html;
  }

  function summaryHtml(regionSet) {
    const names = [...regionSet].map((r) => (REGIONS[r] || {}).label || r);
    let html = `<p class="day-summary">📍 Areas today: ${names.join(" · ")}</p>`;
    const far = ["southbay", "coast", "marin", "peninsula"];
    const hasCity = regionSet.has("sf") || regionSet.has("eastbay");
    const hasFar = [...regionSet].some((r) => far.includes(r));
    if (regionSet.size >= 3 || (hasCity && hasFar && regionSet.size >= 2)) {
      html += `<div class="warn">⚠️ This day spans a few areas — could mean a lot of driving. Consider grouping nearby spots.</div>`;
    }
    return html;
  }
  function routeUrl(items) {
    const stops = items.map((it) => placeById(it[0])).filter((p) => p && p.query);
    const qs = (p) => encodeURIComponent(p.query || p.name);
    if (!stops.length) return "https://www.google.com/maps";
    if (stops.length === 1) return `https://www.google.com/maps/search/?api=1&query=${qs(stops[0])}`;
    let url = `https://www.google.com/maps/dir/?api=1&origin=${qs(stops[0])}&destination=${qs(stops[stops.length - 1])}`;
    const mid = stops.slice(1, -1).map(qs).join("|");
    if (mid) url += `&waypoints=${mid}`;
    return url + "&travelmode=driving";
  }

  function addToDay(placeId, dayIdx) { state.i[dayIdx].push([placeId, "", "", ""]); persist(); }
  function removeItem(dayIdx, idx) { state.i[dayIdx].splice(idx, 1); persist(); renderPlan(); }
  function moveItem(dayIdx, idx, dir) {
    const arr = state.i[dayIdx], j = idx + (dir === "up" ? -1 : 1);
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]]; persist(); renderPlan();
  }

  // ====================================================================
  //  🗺️ MAP TAB — self-contained SVG (no libs, no tiles, no API key)
  // ====================================================================
  const MAP = { w: 300, h: 400, lngMin: -122.86, lngMax: -121.80, latMin: 36.93, latMax: 38.10 };
  const REGION_CENTER = {
    sf: [37.773, -122.431], marin: [37.95, -122.55], eastbay: [37.83, -122.27],
    peninsula: [37.45, -122.18], southbay: [37.37, -121.92], coast: [37.10, -122.40],
  };
  // rough SF Bay outline as [lng,lat] so pins read against real water
  const BAY_PTS = [
    [-122.478, 37.808], [-122.45, 37.85], [-122.42, 37.93], [-122.40, 38.00], [-122.35, 38.04],
    [-122.31, 37.98], [-122.30, 37.90], [-122.27, 37.80], [-122.21, 37.72], [-122.14, 37.62],
    [-122.07, 37.53], [-122.01, 37.46], [-121.98, 37.47], [-122.04, 37.52], [-122.10, 37.58],
    [-122.18, 37.65], [-122.26, 37.71], [-122.32, 37.75], [-122.37, 37.79], [-122.43, 37.805],
  ];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function toXY(lat, lng) {
    return [
      clamp((lng - MAP.lngMin) / (MAP.lngMax - MAP.lngMin) * MAP.w, 2, MAP.w - 2),
      clamp((MAP.latMax - lat) / (MAP.latMax - MAP.latMin) * MAP.h, 2, MAP.h - 2),
    ];
  }
  function hash2(id) {
    let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    const a = ((h % 1000) / 500 - 1), b = (((h >> 10) % 1000) / 500 - 1);
    return [a, b];
  }
  function placeLL(p) {
    const base = p.ll || REGION_CENTER[p.region] || REGION_CENTER.sf;
    const [ja, jb] = hash2(p.id || p.name);
    const j = p.ll ? 0.006 : 0.02; // jitter so stacked pins separate; bigger for region-only
    return [base[0] + ja * j, base[1] + jb * j];
  }

  function renderMap() {
    const all = catalog();
    const f = ui.map.filter;
    const pins = all.filter((p) => f === "all" || p.region === f);

    const bay = BAY_PTS.map(([lng, lat]) => toXY(lat, lng).map((n) => n.toFixed(1)).join(",")).join(" ");
    let svg = `<svg viewBox="0 0 ${MAP.w} ${MAP.h}" class="baymap" preserveAspectRatio="xMidYMid meet" aria-label="Map of Bay Area favorites">`;
    svg += `<rect x="0" y="0" width="${MAP.w}" height="${MAP.h}" fill="#eaf2e6"/>`;
    svg += `<polygon points="${bay}" fill="#bfe0ef" stroke="#9cc9dc" stroke-width="1"/>`;
    svg += `<text x="14" y="120" class="ocean-label">Pacific Ocean</text>`;
    for (const [k, c] of Object.entries(REGION_CENTER)) {
      if (!all.some((p) => p.region === k)) continue;
      const [x, y] = toXY(c[0], c[1]);
      svg += `<text x="${x.toFixed(0)}" y="${(y - 12).toFixed(0)}" class="rlabel" fill="${REGIONS[k].color}">${esc(REGIONS[k].label)}</text>`;
    }
    pins.forEach((p) => {
      const [lat, lng] = placeLL(p); const [x, y] = toXY(lat, lng);
      const sel = ui.map.selected === p.id;
      svg += `<circle class="pin ${sel ? "sel" : ""}" data-pin="${p.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${sel ? 7 : 5}" fill="${REGIONS[p.region].color}" stroke="#fff" stroke-width="2"/>`;
    });
    svg += `</svg>`;

    let legend = `<div class="map-legend">
      <button class="filter-chip ${f === "all" ? "active" : ""}" data-mfilter="all">All</button>`;
    for (const [k, r] of Object.entries(REGIONS)) {
      if (!all.some((p) => p.region === k)) continue;
      legend += `<button class="filter-chip ${f === k ? "active" : ""}" data-mfilter="${k}"><span class="dot" style="background:${r.color}"></span>${esc(r.label)}</button>`;
    }
    legend += `</div>`;

    let info;
    const sel = ui.map.selected ? placeById(ui.map.selected) : null;
    if (sel) {
      const days = [];
      state.i.forEach((d, i) => { if (d.some((it) => it[0] === sel.id)) { const dd = dayDate(i); days.push(`${dd.dow} ${dd.day}`); } });
      info = `<div class="card map-info">
        <div class="place"><div class="place-emoji">${emojiFor(sel)}</div>
          <div class="place-body"><p class="place-name">${esc(sel.name)}</p>${tagsHtml(sel)}
          ${sel.note ? `<p class="place-note">${esc(sel.note)}</p>` : ""}
          ${webLink(sel)}
          <p class="place-note">${days.length ? "🗓️ Planned: " + days.join(", ") : "Not on the plan yet"}</p></div></div>
        <div class="map-info-actions">
          <a class="btn route" href="${mapUrl(sel)}" target="_blank" rel="noopener">🗺️ Open in Google Maps</a>
          <button class="btn ghost" data-addmap="${sel.id}">＋ Add to ${dayDate(ui.day).dow}</button>
        </div></div>`;
    } else {
      info = `<div class="map-hint">👆 Tap a pin to see the place and open it in Google Maps. Colors = areas.</div>`;
    }

    viewEl.innerHTML = `<div class="map-wrap">${svg}</div>${legend}${info}`;
  }

  // ---------- Picker ----------
  const picker = document.getElementById("picker");
  function openPicker() { ui.picker.open = true; picker.classList.remove("hidden"); renderPicker(); }
  function closePicker() { ui.picker.open = false; picker.classList.add("hidden"); }
  function renderPicker() {
    const d = dayDate(ui.day);
    document.getElementById("pickerTitle").textContent = `Add to ${d.dow} ${d.mon} ${d.day}`;
    const all = catalog();
    let fl = `<button class="filter-chip ${ui.picker.filter === "all" ? "active" : ""}" data-pfilter="all">All</button>`;
    for (const [key, r] of Object.entries(REGIONS)) {
      if (!all.some((p) => p.region === key)) continue;
      fl += `<button class="filter-chip ${ui.picker.filter === key ? "active" : ""}" data-pfilter="${key}">${esc(r.label)}</button>`;
    }
    document.getElementById("pickerFilters").innerHTML = fl;

    const q = ui.picker.search.trim().toLowerCase();
    let list = q ? all.filter((p) => (p.name + " " + (p.note || "")).toLowerCase().includes(q)) : all;
    if (ui.picker.filter !== "all") list = list.filter((p) => p.region === ui.picker.filter);
    const inDay = {}; state.i[ui.day].forEach((it) => { inDay[it[0]] = (inDay[it[0]] || 0) + 1; });

    let html = "";
    if (!list.length) html += `<div class="empty"><div class="big">🤔</div><p>No matches.</p></div>`;
    list.forEach((p) => {
      const c = inDay[p.id] || 0;
      html += `
        <div class="pick-row ${c ? "added" : ""}" data-pick="${p.id}">
          <span class="place-emoji">${emojiFor(p)}</span>
          <div class="pick-main">
            <div class="pick-name">${esc(p.name)}</div>${tagsHtml(p)}
            ${p.note ? `<div class="place-note">${esc(p.note)}</div>` : ""}
            <a class="pick-map" href="${mapUrl(p)}" target="_blank" rel="noopener">🗺️ Maps</a> ${webLink(p)}
          </div>
          <span class="pick-add">${c ? "✓ " + c : "＋"}</span>
        </div>`;
    });
    document.getElementById("pickerList").innerHTML = html;
  }

  // ====================================================================
  //  ⭐ FAVORITES TAB
  // ====================================================================
  function renderFavorites() {
    const all = catalog();
    const q = ui.favSearch.trim().toLowerCase();
    let list = q ? all.filter((p) => (p.name + " " + (p.note || "")).toLowerCase().includes(q)) : all;
    if (ui.favFilter !== "all") list = list.filter((p) => p.region === ui.favFilter);

    let html = `
      <div class="card quickadd">
        <div class="qa-row">
          <input id="qaName" placeholder="➕ Add a favorite…" autocomplete="off" value="" />
          <button id="qaAdd" class="btn primary">Add</button>
        </div>
        <div class="qa-row qa-selects">
          <select id="qaCat" title="Category">${catOptions(ui.qa.cat)}</select>
          <select id="qaRegion" title="Area">${regionOptions(ui.qa.region)}</select>
        </div>
        <button id="bulkToggle" class="linklike">${ui.bulkOpen ? "▾" : "▸"} Paste a whole list at once</button>
        <div id="bulkBox" class="${ui.bulkOpen ? "" : "hidden"}">
          <textarea id="bulkText" rows="7" placeholder="Paste lines — one place per line.
Section headers like 'Marin', 'Coffee Spots', or 'Things to do together' auto-sort the lines under them."></textarea>
          <button id="bulkAdd" class="btn primary block">✨ Add all & auto-classify</button>
        </div>
      </div>
      <div class="toolbar"><input class="search" id="favSearch" placeholder="🔎 Search my favorites" value="${esc(ui.favSearch)}" /></div>
      <div class="filters">
        <button class="filter-chip ${ui.favFilter === "all" ? "active" : ""}" data-favfilter="all">All</button>`;
    for (const [key, r] of Object.entries(REGIONS)) {
      const n = all.filter((p) => p.region === key).length;
      if (!n) continue;
      html += `<button class="filter-chip ${ui.favFilter === key ? "active" : ""}" data-favfilter="${key}">${esc(r.label)} ${n}</button>`;
    }
    html += `</div><div class="section-title">${all.length} favorite${all.length === 1 ? "" : "s"} <span class="muted-count">— tap a dropdown to reclassify</span></div>`;

    if (!list.length) html += `<div class="empty"><div class="big">⭐</div><p>No favorites yet. Add one above, or paste a list.</p></div>`;

    const byRegion = {}; list.forEach((p) => { (byRegion[p.region] = byRegion[p.region] || []).push(p); });
    Object.keys(REGIONS).forEach((rk) => {
      const items = byRegion[rk]; if (!items || !items.length) return;
      const r = REGIONS[rk];
      html += `<div class="region-head"><span class="region-dot" style="background:${r.color}"></span>${esc(r.label)}</div>`;
      items.forEach((p) => {
        html += `
          <div class="card fav-row">
            <span class="place-emoji">${emojiFor(p)}</span>
            <div class="fav-main">
              <div class="fav-name">${esc(p.name)}</div>
              ${p.note ? `<div class="place-note">${esc(p.note)}</div>` : ""}
              ${webLink(p)}
              <div class="fav-selects">
                <select data-reclass="cat" data-id="${p.id}">${catOptions(p.cat)}</select>
                <select data-reclass="region" data-id="${p.id}">${regionOptions(p.region)}</select>
              </div>
            </div>
            <div class="fav-actions">
              <a class="icon-btn" href="${mapUrl(p)}" target="_blank" rel="noopener" title="Open in Google Maps">🗺️</a>
              <button class="icon-btn" data-edit="${p.id}" title="Edit">✏️</button>
              <button class="icon-btn danger" data-del="${p.id}" title="Remove">🗑️</button>
            </div>
          </div>`;
      });
    });
    viewEl.innerHTML = html;
  }

  function quickAdd() {
    const nameEl = document.getElementById("qaName");
    const name = nameEl.value.trim(); if (!name) { nameEl.focus(); return; }
    state.cp.push({ id: "c_" + Date.now().toString(36) + Math.floor(Math.random() * 999), name,
      cat: document.getElementById("qaCat").value, region: document.getElementById("qaRegion").value, query: name + " Bay Area" });
    persist();
    ui.qa.catTouched = false; ui.qa.regionTouched = false;
    renderFavorites();
    const b = document.getElementById("qaName"); b.value = ""; b.focus();
    toast(`Added “${name}” ✓`);
  }

  const REGION_HEADERS = {
    "marin": "marin", "north bay": "marin", "marin / north bay": "marin", "marin/north bay": "marin",
    "sf": "sf", "san francisco": "sf", "east bay": "eastbay", "oakland": "eastbay", "berkeley": "eastbay",
    "peninsula": "peninsula", "south bay": "southbay", "san jose": "southbay",
    "coast": "coast", "coastside": "coast", "broader bay area": null, "bay area": null, "broader bay": null,
  };
  const CAT_HEADERS = {
    "activities": null, "activity": null, "things to do": null,
    "restos": "food", "restaurants": "food", "restaurant": "food", "food": "food", "eats": "food",
    "coffee spots": "coffee", "coffee": "coffee", "cafe": "coffee", "cafes": "coffee", "cafe spots": "coffee",
    "cafe/dessert spots": "dessert", "dessert spots": "dessert", "desserts": "dessert", "dessert": "dessert", "bakery": "dessert", "bakeries": "dessert",
    "things to do together": "activity", "to do together": "activity", "viewpoints": "view", "views": "view", "museums": "museum",
  };
  function parseBulk(text) {
    let curRegion = null, curCat = null; const out = [];
    for (const raw of text.split(/\r?\n/)) {
      let line = raw.replace(/^[\s\-*•▪◦·]+/, "").replace(/\s+$/, "");
      if (!line.trim()) continue;
      const norm = line.toLowerCase().replace(/:+\s*$/, "").trim();
      if (Object.prototype.hasOwnProperty.call(REGION_HEADERS, norm)) { curRegion = REGION_HEADERS[norm]; curCat = null; continue; }
      if (Object.prototype.hasOwnProperty.call(CAT_HEADERS, norm)) { curCat = CAT_HEADERS[norm]; continue; }
      let name = line.trim(), note = "";
      const par = name.match(/^(.*?)\s*\((.+)\)\s*$/);
      if (par) { name = par[1].trim(); note = par[2].trim(); }
      const rec = name.match(/^([A-Za-z][A-Za-z.\s]{1,14}):\s*(.+)$/);
      if (rec) { note = (note ? note + " · " : "") + "Rec by " + rec[1].trim(); name = rec[2].trim(); }
      if (!name) continue;
      out.push({ name, cat: curCat || guessCat(name), region: curRegion || guessRegion(name), note });
    }
    return out;
  }
  function bulkAdd() {
    const parsed = parseBulk(document.getElementById("bulkText").value);
    if (!parsed.length) { toast("Nothing to add — paste some lines first"); return; }
    const existing = new Set(catalog().map((p) => p.name.toLowerCase()));
    let added = 0, skipped = 0;
    parsed.forEach((p) => {
      if (existing.has(p.name.toLowerCase())) { skipped++; return; }
      existing.add(p.name.toLowerCase());
      state.cp.push({ id: "c_" + Date.now().toString(36) + Math.floor(Math.random() * 99999),
        name: p.name, cat: p.cat, region: p.region, note: p.note || "", query: p.name + " Bay Area" });
      added++;
    });
    persist();
    document.getElementById("bulkText").value = ""; ui.bulkOpen = true;
    renderFavorites();
    toast(`Added ${added}${skipped ? `, skipped ${skipped} dupe${skipped === 1 ? "" : "s"}` : ""} ✓`);
  }
  function reclassify(id, field, value) {
    if (isCustom(id)) { const p = state.cp.find((x) => x.id === id); if (p) p[field] = value; }
    else state.ep[id] = { ...(state.ep[id] || {}), [field]: value };
    persist(); renderFavorites();
  }
  function deletePlace(id) {
    const p = placeById(id); if (!p) return;
    if (!confirm(`Remove “${p.name}”? It’ll also be removed from any planned days.`)) return;
    if (isCustom(id)) state.cp = state.cp.filter((x) => x.id !== id);
    else { if (!state.hp.includes(id)) state.hp.push(id); delete state.ep[id]; }
    state.i = state.i.map((day) => day.filter((it) => it[0] !== id));
    persist(); render();
  }

  // ---------- Edit sheet ----------
  const sheet = document.getElementById("sheet");
  const form = document.getElementById("placeForm");
  function fillSelects() {
    document.getElementById("f-cat").innerHTML = catOptions("food");
    document.getElementById("f-region").innerHTML = regionOptions("sf");
  }
  function openSheet(place) {
    document.getElementById("sheetTitle").textContent = place ? "Edit place" : "Add a place";
    document.getElementById("f-id").value = place ? place.id : "";
    document.getElementById("f-name").value = place ? place.name : "";
    document.getElementById("f-cat").value = place ? place.cat : "food";
    document.getElementById("f-region").value = place ? place.region : "sf";
    document.getElementById("f-emoji").value = place && place.emoji ? place.emoji : "";
    document.getElementById("f-query").value = place && place.query ? place.query : "";
    document.getElementById("f-note").value = place && place.note ? place.note : "";
    sheet.classList.remove("hidden");
  }
  function closeSheet() { sheet.classList.add("hidden"); }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("f-id").value;
    const data = {
      name: document.getElementById("f-name").value.trim(),
      cat: document.getElementById("f-cat").value, region: document.getElementById("f-region").value,
      emoji: document.getElementById("f-emoji").value.trim(),
      query: document.getElementById("f-query").value.trim(), note: document.getElementById("f-note").value.trim(),
    };
    if (!data.name) return;
    if (!data.query) data.query = data.name + " Bay Area";
    if (!id) state.cp.push({ id: "c_" + Date.now().toString(36), ...data });
    else if (isCustom(id)) Object.assign(state.cp.find((x) => x.id === id), data);
    else state.ep[id] = data;
    persist(); closeSheet(); render(); toast("Saved ✓");
  });

  // ---------- Sharing ----------
  async function share() {
    persist();
    const url = (window.Sync && Sync.enabled) ? Sync.shareUrl() : location.href;
    const text = "Here's our Bay Area plan — open it to view & tweak:";
    try { if (navigator.share) { await navigator.share({ title: "Bay Area Trip", text, url }); return; } } catch (e) {}
    try { await navigator.clipboard.writeText(url); toast("Link copied — paste it to your friend 📲"); }
    catch (e) { prompt("Copy this link:", url); }
  }

  // ---------- Events ----------
  document.addEventListener("click", (e) => {
    const t = e.target;
    const tab = t.closest(".tab");
    if (tab) { ui.tab = tab.dataset.tab; render(); return; }
    const chip = t.closest(".day-chip");
    if (chip) { ui.day = +chip.dataset.day; renderPlan(); return; }
    if (t.dataset.favfilter) { ui.favFilter = t.dataset.favfilter; renderFavorites(); return; }

    if (t.id === "qaAdd") { quickAdd(); return; }
    if (t.id === "bulkToggle") { ui.bulkOpen = !ui.bulkOpen; renderFavorites(); return; }
    if (t.id === "bulkAdd") { bulkAdd(); return; }
    if (t.dataset.edit) { ui.tab = "favorites"; openSheet(placeById(t.dataset.edit)); return; }
    if (t.dataset.del) { deletePlace(t.dataset.del); return; }

    if (t.dataset.move) { moveItem(ui.day, +t.dataset.idx, t.dataset.move); return; }
    if (t.dataset.remove != null) { removeItem(ui.day, +t.dataset.remove); return; }
    if (t.id === "openPicker") { openPicker(); return; }
    if (t.dataset.icsDay != null) { exportDay(+t.dataset.icsDay); return; }
    if (t.id === "exportTrip") { exportTrip(); return; }

    // map
    if (t.dataset.mfilter) { ui.map.filter = t.dataset.mfilter; renderMap(); return; }
    if (t.dataset.pin) { ui.map.selected = ui.map.selected === t.dataset.pin ? null : t.dataset.pin; renderMap(); return; }
    if (t.dataset.addmap) { addToDay(t.dataset.addmap, ui.day); renderMap(); toast(`Added to ${dayDate(ui.day).dow} ✓`); return; }

    // picker
    if (t.dataset.pfilter) { ui.picker.filter = t.dataset.pfilter; renderPicker(); return; }
    const pick = t.closest("[data-pick]");
    if (pick && !t.closest("a")) { addToDay(pick.dataset.pick, ui.day); renderPicker(); toast("Added ✓"); return; }
    if (t.hasAttribute("data-close-picker")) { closePicker(); renderPlan(); return; }
    if (t.hasAttribute("data-close")) { closeSheet(); return; }
  });

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.reclass) { reclassify(t.dataset.id, t.dataset.reclass, t.value); return; }
    if (t.id === "qaCat") { ui.qa.cat = t.value; ui.qa.catTouched = true; return; }
    if (t.id === "qaRegion") { ui.qa.region = t.value; ui.qa.regionTouched = true; return; }
    // committing a time -> re-render so the time badge + calendar link refresh
    if (t.dataset.start != null || t.dataset.end != null) { renderPlan(); return; }
  });

  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "qaName") {
      const name = t.value;
      if (name.trim()) {
        if (!ui.qa.catTouched) { ui.qa.cat = guessCat(name); document.getElementById("qaCat").value = ui.qa.cat; }
        if (!ui.qa.regionTouched) { ui.qa.region = guessRegion(name); document.getElementById("qaRegion").value = ui.qa.region; }
      }
      return;
    }
    if (t.id === "favSearch") {
      ui.favSearch = t.value; const pos = t.selectionStart; renderFavorites();
      const b = document.getElementById("favSearch"); b.focus(); b.setSelectionRange(pos, pos); return;
    }
    if (t.id === "pickerSearch") {
      ui.picker.search = t.value; const pos = t.selectionStart; renderPicker();
      const b = document.getElementById("pickerSearch"); b.focus(); b.setSelectionRange(pos, pos); return;
    }
    if (t.dataset.start != null) { state.i[ui.day][+t.dataset.start][1] = t.value; persist(); return; }
    if (t.dataset.end != null) { state.i[ui.day][+t.dataset.end][2] = t.value; persist(); return; }
    if (t.dataset.note != null) { state.i[ui.day][+t.dataset.note][3] = t.value; persist(); return; }
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.id === "qaName" && e.key === "Enter") { e.preventDefault(); quickAdd(); }
  });
  document.getElementById("shareBtn").addEventListener("click", share);

  // ---------- Drag & drop reorder ----------
  let dragFrom = null;
  document.addEventListener("dragstart", (e) => {
    const item = e.target.closest(".itin-item"); if (!item) return;
    dragFrom = +item.dataset.idx; item.classList.add("dragging");
  });
  document.addEventListener("dragend", (e) => {
    const item = e.target.closest(".itin-item"); if (item) item.classList.remove("dragging");
    document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
  });
  document.addEventListener("dragover", (e) => {
    const item = e.target.closest(".itin-item"); if (!item || dragFrom === null) return;
    e.preventDefault();
    document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
    item.classList.add("drag-over");
  });
  document.addEventListener("drop", (e) => {
    const item = e.target.closest(".itin-item"); if (!item || dragFrom === null) return;
    e.preventDefault();
    const to = +item.dataset.idx, arr = state.i[ui.day];
    const [moved] = arr.splice(dragFrom, 1); arr.splice(to, 0, moved);
    dragFrom = null; persist(); renderPlan();
  });

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg; el.classList.remove("hidden");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add("hidden"), 2400);
  }

  // ---------- Utils ----------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ---------- Boot ----------
  document.getElementById("dateRange").textContent =
    `${dayDate(0).mon} ${dayDate(0).day} – ${dayDate(TRIP.days - 1).mon} ${dayDate(TRIP.days - 1).day}, 2026 · ${TRIP.days} days`;
  fillSelects(); loadState(); render(); initSync();
})();
