/* Bay Area Trip Planner — vanilla JS, no build, no backend.
   State lives in the URL hash (shareable) + localStorage (backup).

   Two sides, two tabs:
     ⭐ Favorites — the host's side: input a pile of favorites fast and
        classify them at scale (quick-add with auto-guess + bulk paste).
     🗓️ Plan — the visitor's side: pull favorites into a 5-day itinerary. */

(function () {
  "use strict";

  const { TRIP, REGIONS, CATEGORIES, SEED_PLACES } = window;
  const LS_KEY = "bay-trip-v1";
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // ---------- State (compact + share-friendly) ----------
  //   i : itinerary -> array (per day) of [placeId, time]
  //   cp: custom places the user added (full objects)
  //   ep: edits to seed places { id: {partial fields...} }
  //   hp: hidden seed place ids
  let state = {
    i: Array.from({ length: TRIP.days }, () => []),
    cp: [],
    ep: {},
    hp: [],
  };
  // ephemeral UI (not shared)
  let ui = {
    tab: "plan",
    day: 0,
    favSearch: "",
    favFilter: "all",
    bulkOpen: false,
    qa: { cat: "food", region: "sf", catTouched: false, regionTouched: false },
    picker: { open: false, search: "", filter: "all" },
  };

  // ---------- URL <-> state (unicode-safe, url-safe base64) ----------
  function encode(obj) {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(str) {
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  }
  function loadState() {
    const hash = location.hash.replace(/^#/, "");
    if (hash) {
      try { mergeState(decode(hash)); return; }
      catch (e) { console.warn("Bad share link, ignoring:", e); }
    }
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) mergeState(JSON.parse(raw));
    } catch (e) {}
  }
  function mergeState(s) {
    state.i = Array.isArray(s.i) ? s.i.slice(0, TRIP.days) : state.i;
    while (state.i.length < TRIP.days) state.i.push([]);
    state.cp = Array.isArray(s.cp) ? s.cp : [];
    state.ep = s.ep && typeof s.ep === "object" ? s.ep : {};
    state.hp = Array.isArray(s.hp) ? s.hp : [];
  }
  function persist() {
    const encoded = encode(state);
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
    history.replaceState(null, "", "#" + encoded);
  }

  // ---------- Derived catalog ----------
  function catalog() {
    const hidden = new Set(state.hp);
    const seed = SEED_PLACES
      .filter((p) => !hidden.has(p.id))
      .map((p) => (state.ep[p.id] ? { ...p, ...state.ep[p.id] } : p));
    return seed.concat(state.cp);
  }
  function placeById(id) { return catalog().find((p) => p.id === id); }
  function isCustom(id) { return id.startsWith("c_"); }

  // ---------- Auto-classify (the magic that makes input fast) ----------
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

  // ---------- Date helpers ----------
  function dayDate(offset) {
    const [y, m, d] = TRIP.startDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + offset));
    return { dow: DOW[dt.getUTCDay()], mon: MON[dt.getUTCMonth()], day: dt.getUTCDate() };
  }

  // ---------- Shared bits ----------
  const viewEl = document.getElementById("view");

  function emojiFor(p) {
    return p.emoji || (CATEGORIES[p.cat] || {}).emoji || "📍";
  }
  function tagsHtml(p) {
    const region = REGIONS[p.region] || { label: p.region, color: "#999" };
    const cat = CATEGORIES[p.cat] || { label: p.cat };
    return `<div class="tags">
      <span class="tag" style="background:${region.color}">${esc(region.label)}</span>
      <span class="tag cat">${esc(cat.label)}</span></div>`;
  }
  function mapUrl(p) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.query || p.name)}`;
  }

  function render() {
    document.querySelectorAll(".tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.tab === ui.tab));
    if (ui.tab === "favorites") renderFavorites();
    else renderPlan();
  }

  // ====================================================================
  //  ⭐ FAVORITES TAB — the input side
  // ====================================================================
  function catOptions(sel) {
    return Object.entries(CATEGORIES)
      .map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${v.emoji} ${v.label}</option>`).join("");
  }
  function regionOptions(sel) {
    return Object.entries(REGIONS)
      .map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${v.label}</option>`).join("");
  }

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
Section headers like 'Marin', 'Coffee Spots', or 'Things to do together' auto-sort the lines under them.
e.g.
SF
  Khao Tiew
  Tartine
Coffee Spots
  Stonemill Matcha"></textarea>
          <button id="bulkAdd" class="btn primary block">✨ Add all & auto-classify</button>
        </div>
      </div>`;

    html += `
      <div class="toolbar">
        <input class="search" id="favSearch" placeholder="🔎 Search my favorites" value="${esc(ui.favSearch)}" />
      </div>
      <div class="filters">
        <button class="filter-chip ${ui.favFilter === "all" ? "active" : ""}" data-favfilter="all">All</button>`;
    for (const [key, r] of Object.entries(REGIONS)) {
      const n = all.filter((p) => p.region === key).length;
      if (!n) continue;
      html += `<button class="filter-chip ${ui.favFilter === key ? "active" : ""}" data-favfilter="${key}">${esc(r.label)} ${n}</button>`;
    }
    html += `</div>`;

    html += `<div class="section-title">${all.length} favorite${all.length === 1 ? "" : "s"} <span class="muted-count">— tap a dropdown to reclassify</span></div>`;

    if (!list.length) {
      html += `<div class="empty"><div class="big">⭐</div><p>No favorites yet. Add one above, or paste a list.</p></div>`;
    }

    // group by region for scannability
    const order = Object.keys(REGIONS);
    const byRegion = {};
    list.forEach((p) => { (byRegion[p.region] = byRegion[p.region] || []).push(p); });
    order.forEach((rk) => {
      const items = byRegion[rk];
      if (!items || !items.length) return;
      const r = REGIONS[rk];
      html += `<div class="region-head"><span class="region-dot" style="background:${r.color}"></span>${esc(r.label)}</div>`;
      items.forEach((p) => {
        html += `
          <div class="card fav-row">
            <span class="place-emoji">${emojiFor(p)}</span>
            <div class="fav-main">
              <div class="fav-name">${esc(p.name)}</div>
              ${p.note ? `<div class="place-note">${esc(p.note)}</div>` : ""}
              <div class="fav-selects">
                <select data-reclass="cat" data-id="${p.id}">${catOptions(p.cat)}</select>
                <select data-reclass="region" data-id="${p.id}">${regionOptions(p.region)}</select>
              </div>
            </div>
            <div class="fav-actions">
              <button class="icon-btn" data-edit="${p.id}" title="Edit">✏️</button>
              <button class="icon-btn danger" data-del="${p.id}" title="Remove">🗑️</button>
            </div>
          </div>`;
      });
    });

    viewEl.innerHTML = html;
    // restore quick-add selects (rendered above use ui.qa)
  }

  function quickAdd() {
    const nameEl = document.getElementById("qaName");
    const name = nameEl.value.trim();
    if (!name) { nameEl.focus(); return; }
    const cat = document.getElementById("qaCat").value;
    const region = document.getElementById("qaRegion").value;
    state.cp.push({ id: "c_" + Date.now().toString(36) + Math.floor(Math.random() * 999), name, cat, region, query: name + " Bay Area" });
    persist();
    ui.qa.catTouched = false; ui.qa.regionTouched = false;
    renderFavorites();
    const box = document.getElementById("qaName");
    box.value = ""; box.focus();
    toast(`Added “${name}” ✓`);
  }

  // Bulk paste parser: handles section headers, bullets, parentheticals, "Name: place".
  const REGION_HEADERS = {
    "marin": "marin", "north bay": "marin", "marin / north bay": "marin", "marin/north bay": "marin",
    "sf": "sf", "san francisco": "sf",
    "east bay": "eastbay", "oakland": "eastbay", "berkeley": "eastbay",
    "peninsula": "peninsula",
    "south bay": "southbay", "san jose": "southbay",
    "coast": "coast", "coastside": "coast",
    "broader bay area": null, "bay area": null, "broader bay": null,
  };
  const CAT_HEADERS = {
    "activities": null, "activity": null, "things to do": null,
    "restos": "food", "restaurants": "food", "restaurant": "food", "food": "food", "eats": "food",
    "coffee spots": "coffee", "coffee": "coffee", "cafe": "coffee", "cafes": "coffee", "cafe spots": "coffee",
    "cafe/dessert spots": "dessert", "dessert spots": "dessert", "desserts": "dessert", "dessert": "dessert", "bakery": "dessert", "bakeries": "dessert",
    "things to do together": "activity", "to do together": "activity",
    "viewpoints": "view", "views": "view",
    "museums": "museum",
  };

  function parseBulk(text) {
    const lines = text.split(/\r?\n/);
    let curRegion = null, curCat = null;
    const out = [];
    for (const raw of lines) {
      let line = raw.replace(/^[\s\-*•▪◦·]+/, "").replace(/\s+$/, "");
      if (!line.trim()) continue;
      const norm = line.toLowerCase().replace(/:+\s*$/, "").trim();
      if (Object.prototype.hasOwnProperty.call(REGION_HEADERS, norm)) { curRegion = REGION_HEADERS[norm]; curCat = null; continue; }
      if (Object.prototype.hasOwnProperty.call(CAT_HEADERS, norm)) { curCat = CAT_HEADERS[norm]; continue; }

      let name = line.trim();
      let note = "";
      // pull trailing "(...)" into a note
      const par = name.match(/^(.*?)\s*\((.+)\)\s*$/);
      if (par) { name = par[1].trim(); note = par[2].trim(); }
      // "Javi: alamere falls" -> rec attribution
      const rec = name.match(/^([A-Za-z][A-Za-z.\s]{1,14}):\s*(.+)$/);
      if (rec && rec[2].trim().split(/\s+/).length >= 1) {
        note = (note ? note + " · " : "") + "Rec by " + rec[1].trim();
        name = rec[2].trim();
      }
      if (!name) continue;
      out.push({
        name,
        cat: curCat || guessCat(name),
        region: curRegion || guessRegion(name),
        note,
      });
    }
    return out;
  }

  function bulkAdd() {
    const text = document.getElementById("bulkText").value;
    const parsed = parseBulk(text);
    if (!parsed.length) { toast("Nothing to add — paste some lines first"); return; }
    const existing = new Set(catalog().map((p) => p.name.toLowerCase()));
    let added = 0, skipped = 0;
    parsed.forEach((p) => {
      if (existing.has(p.name.toLowerCase())) { skipped++; return; }
      existing.add(p.name.toLowerCase());
      state.cp.push({
        id: "c_" + Date.now().toString(36) + Math.floor(Math.random() * 99999),
        name: p.name, cat: p.cat, region: p.region,
        note: p.note || "", query: p.name + " Bay Area",
      });
      added++;
    });
    persist();
    document.getElementById("bulkText").value = "";
    ui.bulkOpen = true;
    renderFavorites();
    toast(`Added ${added} favorite${added === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} dupe${skipped === 1 ? "" : "s"}` : ""} ✓`);
  }

  function reclassify(id, field, value) {
    if (isCustom(id)) {
      const p = state.cp.find((x) => x.id === id);
      if (p) p[field] = value;
    } else {
      state.ep[id] = { ...(state.ep[id] || {}), [field]: value };
    }
    persist();
    renderFavorites();
  }

  function deletePlace(id) {
    const p = placeById(id);
    if (!p) return;
    if (!confirm(`Remove “${p.name}”? It’ll also be removed from any planned days.`)) return;
    if (isCustom(id)) state.cp = state.cp.filter((x) => x.id !== id);
    else { if (!state.hp.includes(id)) state.hp.push(id); delete state.ep[id]; }
    state.i = state.i.map((day) => day.filter((it) => it[0] !== id));
    persist();
    render();
  }

  // ====================================================================
  //  🗓️ PLAN TAB — the itinerary side
  // ====================================================================
  function renderPlan() {
    const day = ui.day;
    let html = `<div class="day-strip">`;
    for (let i = 0; i < TRIP.days; i++) {
      const d = dayDate(i);
      const n = state.i[i].length;
      html += `
        <div class="day-chip ${i === day ? "active" : ""}" data-day="${i}">
          <div class="dc-dow">${d.dow}</div>
          <div class="dc-date">${d.mon} ${d.day}</div>
          <div class="dc-count">${n ? n + " stop" + (n > 1 ? "s" : "") : "—"}</div>
        </div>`;
    }
    html += `</div>`;

    const items = state.i[day];
    if (!items.length) {
      html += `<div class="empty"><div class="big">🗺️</div>
        <p>Nothing planned for this day yet.</p></div>`;
    } else {
      const regions = new Set(items.map((it) => (placeById(it[0]) || {}).region).filter(Boolean));
      html += summaryHtml(regions);
      items.forEach((it, idx) => {
        const p = placeById(it[0]);
        if (!p) return;
        html += `
          <div class="card place itin-item" draggable="true" data-idx="${idx}">
            <div class="place-emoji">${emojiFor(p)}</div>
            <div class="place-body">
              <p class="place-name">${esc(p.name)}</p>
              ${tagsHtml(p)}
              ${p.note ? `<p class="place-note">${esc(p.note)}</p>` : ""}
            </div>
          </div>
          <div class="item-controls" data-idx="${idx}">
            <input class="time-input" type="text" placeholder="⏰ time / note" value="${esc(it[1] || "")}" data-time="${idx}" />
            <a class="maplink" href="${mapUrl(p)}" target="_blank" rel="noopener">Map ↗</a>
            <span class="spacer"></span>
            <button class="icon-btn" data-move="up" data-idx="${idx}" ${idx === 0 ? "disabled" : ""}>↑</button>
            <button class="icon-btn" data-move="down" data-idx="${idx}" ${idx === items.length - 1 ? "disabled" : ""}>↓</button>
            <button class="icon-btn danger" data-remove="${idx}">✕</button>
          </div>`;
      });
      html += `<div class="day-actions">
        <a class="btn route" href="${routeUrl(items)}" target="_blank" rel="noopener">🧭 Day route in Maps</a>
      </div>`;
    }

    html += `<button class="btn primary block addstops" id="openPicker">＋ Add stops to ${dayDate(day).dow}</button>`;
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
    const origin = qs(stops[0]);
    const dest = qs(stops[stops.length - 1]);
    const mid = stops.slice(1, -1).map(qs).join("|");
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
    if (mid) url += `&waypoints=${mid}`;
    return url + "&travelmode=driving";
  }

  function addToDay(placeId, dayIdx) {
    state.i[dayIdx].push([placeId, ""]);
    persist();
  }
  function removeItem(dayIdx, idx) { state.i[dayIdx].splice(idx, 1); persist(); renderPlan(); }
  function moveItem(dayIdx, idx, dir) {
    const arr = state.i[dayIdx];
    const j = idx + (dir === "up" ? -1 : 1);
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    persist(); renderPlan();
  }

  // ---------- Picker sheet (browse favorites -> add to current day) ----------
  const picker = document.getElementById("picker");
  function openPicker() { ui.picker.open = true; picker.classList.remove("hidden"); renderPicker(); }
  function closePicker() { ui.picker.open = false; picker.classList.add("hidden"); }

  function renderPicker() {
    const d = dayDate(ui.day);
    document.getElementById("pickerTitle").textContent = `Add to ${d.dow} ${d.mon} ${d.day}`;
    // filters
    let f = `<button class="filter-chip ${ui.picker.filter === "all" ? "active" : ""}" data-pfilter="all">All</button>`;
    const all = catalog();
    for (const [key, r] of Object.entries(REGIONS)) {
      if (!all.some((p) => p.region === key)) continue;
      f += `<button class="filter-chip ${ui.picker.filter === key ? "active" : ""}" data-pfilter="${key}">${esc(r.label)}</button>`;
    }
    document.getElementById("pickerFilters").innerHTML = f;

    const q = ui.picker.search.trim().toLowerCase();
    let list = q ? all.filter((p) => (p.name + " " + (p.note || "")).toLowerCase().includes(q)) : all;
    if (ui.picker.filter !== "all") list = list.filter((p) => p.region === ui.picker.filter);

    const inDay = {};
    state.i[ui.day].forEach((it) => { inDay[it[0]] = (inDay[it[0]] || 0) + 1; });

    let html = "";
    if (!list.length) html += `<div class="empty"><div class="big">🤔</div><p>No matches.</p></div>`;
    list.forEach((p) => {
      const count = inDay[p.id] || 0;
      html += `
        <div class="pick-row ${count ? "added" : ""}" data-pick="${p.id}">
          <span class="place-emoji">${emojiFor(p)}</span>
          <div class="pick-main">
            <div class="pick-name">${esc(p.name)}</div>
            ${tagsHtml(p)}
            ${p.note ? `<div class="place-note">${esc(p.note)}</div>` : ""}
          </div>
          <span class="pick-add">${count ? "✓ " + count : "＋"}</span>
        </div>`;
    });
    document.getElementById("pickerList").innerHTML = html;
  }

  // ---------- Edit sheet ----------
  const sheet = document.getElementById("sheet");
  const form = document.getElementById("placeForm");
  function fillSelects() {
    document.getElementById("f-cat").innerHTML = catOptions("sight");
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
      cat: document.getElementById("f-cat").value,
      region: document.getElementById("f-region").value,
      emoji: document.getElementById("f-emoji").value.trim(),
      query: document.getElementById("f-query").value.trim(),
      note: document.getElementById("f-note").value.trim(),
    };
    if (!data.name) return;
    if (!data.query) data.query = data.name + " Bay Area";
    if (!id) {
      state.cp.push({ id: "c_" + Date.now().toString(36), ...data });
    } else if (isCustom(id)) {
      Object.assign(state.cp.find((x) => x.id === id), data);
    } else {
      state.ep[id] = data;
    }
    persist(); closeSheet(); render(); toast("Saved ✓");
  });

  // ---------- Sharing ----------
  async function share() {
    persist();
    const url = location.href;
    const text = "Here's our Bay Area plan — open it to view & tweak:";
    try { if (navigator.share) { await navigator.share({ title: "Bay Area Trip", text, url }); return; } }
    catch (e) {}
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

    // favorites: quick add + bulk
    if (t.id === "qaAdd") { quickAdd(); return; }
    if (t.id === "bulkToggle") { ui.bulkOpen = !ui.bulkOpen; renderFavorites(); return; }
    if (t.id === "bulkAdd") { bulkAdd(); return; }
    if (t.dataset.edit) { ui.tab = "favorites"; openSheet(placeById(t.dataset.edit)); return; }
    if (t.dataset.del) { deletePlace(t.dataset.del); return; }

    // plan controls
    if (t.dataset.move) { moveItem(ui.day, +t.dataset.idx, t.dataset.move); return; }
    if (t.dataset.remove != null) { removeItem(ui.day, +t.dataset.remove); return; }
    if (t.id === "openPicker") { openPicker(); return; }

    // picker
    if (t.dataset.pfilter) { ui.picker.filter = t.dataset.pfilter; renderPicker(); return; }
    const pick = t.closest("[data-pick]");
    if (pick) { addToDay(pick.dataset.pick, ui.day); renderPicker(); renderPlanQuiet(); toast("Added ✓"); return; }
    if (t.hasAttribute("data-close-picker")) { closePicker(); renderPlan(); return; }

    // edit sheet close
    if (t.hasAttribute("data-close")) { closeSheet(); return; }
  });

  // re-render plan underneath without closing picker (keeps day counts fresh)
  function renderPlanQuiet() { if (ui.tab === "plan" && !ui.picker.open) renderPlan(); }

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.reclass) { reclassify(t.dataset.id, t.dataset.reclass, t.value); return; }
    if (t.id === "qaCat") { ui.qa.cat = t.value; ui.qa.catTouched = true; return; }
    if (t.id === "qaRegion") { ui.qa.region = t.value; ui.qa.regionTouched = true; return; }
  });

  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "qaName") {
      // live auto-guess (unless the host overrode the dropdowns)
      const name = t.value;
      if (name.trim()) {
        if (!ui.qa.catTouched) { ui.qa.cat = guessCat(name); document.getElementById("qaCat").value = ui.qa.cat; }
        if (!ui.qa.regionTouched) { ui.qa.region = guessRegion(name); document.getElementById("qaRegion").value = ui.qa.region; }
      }
      return;
    }
    if (t.id === "favSearch") {
      ui.favSearch = t.value;
      const pos = t.selectionStart; renderFavorites();
      const b = document.getElementById("favSearch"); b.focus(); b.setSelectionRange(pos, pos);
      return;
    }
    if (t.id === "pickerSearch") {
      ui.picker.search = t.value;
      const pos = t.selectionStart; renderPicker();
      const b = document.getElementById("pickerSearch"); b.focus(); b.setSelectionRange(pos, pos);
      return;
    }
    if (t.dataset.time != null) {
      state.i[ui.day][+t.dataset.time][1] = t.value; persist();
      return;
    }
  });

  // Enter in quick-add field = add
  document.addEventListener("keydown", (e) => {
    if (e.target.id === "qaName" && e.key === "Enter") { e.preventDefault(); quickAdd(); }
  });

  document.getElementById("shareBtn").addEventListener("click", share);

  // ---------- Drag & drop reorder ----------
  let dragFrom = null;
  document.addEventListener("dragstart", (e) => {
    const item = e.target.closest(".itin-item");
    if (!item) return;
    dragFrom = +item.dataset.idx; item.classList.add("dragging");
  });
  document.addEventListener("dragend", (e) => {
    const item = e.target.closest(".itin-item");
    if (item) item.classList.remove("dragging");
    document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
  });
  document.addEventListener("dragover", (e) => {
    const item = e.target.closest(".itin-item");
    if (!item || dragFrom === null) return;
    e.preventDefault();
    document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
    item.classList.add("drag-over");
  });
  document.addEventListener("drop", (e) => {
    const item = e.target.closest(".itin-item");
    if (!item || dragFrom === null) return;
    e.preventDefault();
    const to = +item.dataset.idx;
    const arr = state.i[ui.day];
    const [moved] = arr.splice(dragFrom, 1);
    arr.splice(to, 0, moved);
    dragFrom = null; persist(); renderPlan();
  });

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg; el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 2200);
  }

  // ---------- Utils ----------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ---------- Boot ----------
  document.getElementById("dateRange").textContent =
    `${dayDate(0).mon} ${dayDate(0).day} – ${dayDate(TRIP.days - 1).mon} ${dayDate(TRIP.days - 1).day}, 2026 · ${TRIP.days} days`;
  fillSelects();
  loadState();
  render();
})();
