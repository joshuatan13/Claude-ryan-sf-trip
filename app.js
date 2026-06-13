/* Bay Area Trip Planner — vanilla JS, no build, no backend.
   State lives in the URL hash (shareable) + localStorage (backup). */

(function () {
  "use strict";

  const { TRIP, REGIONS, CATEGORIES, SEED_PLACES } = window;
  const LS_KEY = "bay-trip-v1";
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // ---------- State ----------
  // Compact, share-friendly shape:
  //   i : itinerary -> array (per day) of [placeId, time]
  //   cp: custom places the user added (full objects)
  //   ep: edits to seed places { id: {fields...} }
  //   hp: hidden seed place ids
  let state = {
    i: Array.from({ length: TRIP.days }, () => []),
    cp: [],
    ep: {},
    hp: [],
  };
  let ui = { tab: "itinerary", day: 0, search: "", filter: "all" };

  // ---------- URL <-> state encoding (unicode-safe, url-safe base64) ----------
  function encode(obj) {
    const json = JSON.stringify(obj);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(str) {
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  }

  function loadState() {
    // Priority: URL hash (a shared link) > localStorage > empty.
    const hash = location.hash.replace(/^#/, "");
    if (hash) {
      try {
        const s = decode(hash);
        mergeState(s);
        return;
      } catch (e) {
        console.warn("Bad share link, ignoring:", e);
      }
    }
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) mergeState(JSON.parse(raw));
    } catch (e) { /* ignore */ }
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
    // keep the address bar shareable without scrolling the page
    history.replaceState(null, "", "#" + encoded);
  }

  // ---------- Derived catalog ----------
  // Effective list of places = seed (minus hidden, plus edits) + custom.
  function catalog() {
    const hidden = new Set(state.hp);
    const seed = SEED_PLACES
      .filter((p) => !hidden.has(p.id))
      .map((p) => (state.ep[p.id] ? { ...p, ...state.ep[p.id] } : p));
    return seed.concat(state.cp);
  }
  function placeById(id) {
    return catalog().find((p) => p.id === id);
  }
  function isCustom(id) { return id.startsWith("c_"); }

  // ---------- Date helpers ----------
  function dayDate(offset) {
    const [y, m, d] = TRIP.startDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + offset));
    return { dow: DOW[dt.getUTCDay()], mon: MON[dt.getUTCMonth()], day: dt.getUTCDate() };
  }

  // ---------- Rendering ----------
  const viewEl = document.getElementById("view");

  function render() {
    document.querySelectorAll(".tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.tab === ui.tab)
    );
    if (ui.tab === "itinerary") renderItinerary();
    else renderPlaces();
  }

  function placeCardInner(p) {
    const region = REGIONS[p.region] || { label: p.region, color: "#999" };
    const cat = CATEGORIES[p.cat] || { label: p.cat, emoji: "📍" };
    const emoji = p.emoji || cat.emoji;
    return `
      <div class="place-emoji">${emoji}</div>
      <div class="place-body">
        <p class="place-name">${esc(p.name)}</p>
        <div class="tags">
          <span class="tag" style="background:${region.color}">${esc(region.label)}</span>
          <span class="tag cat">${esc(cat.label)}</span>
        </div>
        ${p.note ? `<p class="place-note">${esc(p.note)}</p>` : ""}
      </div>`;
  }

  function mapUrl(p) {
    const q = encodeURIComponent(p.query || p.name);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  // ----- Itinerary tab -----
  function renderItinerary() {
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
        <p>Nothing planned for this day yet.<br/>Head to <b>Places</b> to add stops.</p></div>`;
    } else {
      // location-spread warning
      const regions = new Set(items.map((it) => (placeById(it[0]) || {}).region).filter(Boolean));
      html += summaryHtml(regions);

      items.forEach((it, idx) => {
        const p = placeById(it[0]);
        if (!p) return;
        const time = it[1] || "";
        html += `
          <div class="card place itin-item" draggable="true" data-idx="${idx}">
            ${placeCardInner(p)}
          </div>
          <div class="item-controls" data-idx="${idx}">
            <input class="time-input" type="text" placeholder="⏰ time / note" value="${esc(time)}" data-time="${idx}" />
            <a class="maplink" href="${mapUrl(p)}" target="_blank" rel="noopener">Map ↗</a>
            <span class="spacer"></span>
            <button class="icon-btn" data-move="up" data-idx="${idx}" ${idx === 0 ? "disabled" : ""}>↑</button>
            <button class="icon-btn" data-move="down" data-idx="${idx}" ${idx === items.length - 1 ? "disabled" : ""}>↓</button>
            <button class="icon-btn danger" data-remove="${idx}">✕</button>
          </div>`;
      });

      // day route in Google Maps (real location help, no API key needed)
      html += `<div class="day-actions">
        <a class="btn route" href="${routeUrl(items)}" target="_blank" rel="noopener">🧭 Open day route in Maps</a>
      </div>`;
    }

    viewEl.innerHTML = html;
  }

  function summaryHtml(regionSet) {
    const names = [...regionSet].map((r) => (REGIONS[r] || {}).label || r);
    let html = `<p class="day-summary">📍 Areas today: ${names.join(" · ")}</p>`;
    // gentle warning if a day mixes far-apart regions
    const far = ["southbay", "coast", "marin", "peninsula"];
    const hasSF = regionSet.has("sf") || regionSet.has("eastbay");
    const hasFar = [...regionSet].some((r) => far.includes(r));
    if (regionSet.size >= 3 || (hasSF && hasFar && regionSet.size >= 2)) {
      html += `<div class="warn">⚠️ This day spans a few different areas — could mean a lot of driving. Consider grouping nearby spots together.</div>`;
    }
    return html;
  }

  function routeUrl(items) {
    const stops = items.map((it) => placeById(it[0])).filter(Boolean);
    const qs = (p) => encodeURIComponent(p.query || p.name);
    if (stops.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${qs(stops[0])}`;
    }
    const origin = qs(stops[0]);
    const dest = qs(stops[stops.length - 1]);
    const mid = stops.slice(1, -1).map(qs).join("|");
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
    if (mid) url += `&waypoints=${mid}`;
    return url + "&travelmode=driving";
  }

  // ----- Places tab -----
  function renderPlaces() {
    const all = catalog();
    const q = ui.search.trim().toLowerCase();
    let list = all;
    if (q) list = list.filter((p) => (p.name + " " + (p.note || "")).toLowerCase().includes(q));
    if (ui.filter !== "all") list = list.filter((p) => p.region === ui.filter);

    let html = `
      <div class="toolbar">
        <input class="search" id="searchBox" placeholder="🔎 Search places" value="${esc(ui.search)}" />
        <button class="btn primary" id="addPlaceBtn">＋</button>
      </div>
      <div class="filters">
        <button class="filter-chip ${ui.filter === "all" ? "active" : ""}" data-filter="all">All</button>`;
    for (const [key, r] of Object.entries(REGIONS)) {
      html += `<button class="filter-chip ${ui.filter === key ? "active" : ""}" data-filter="${key}">${esc(r.label)}</button>`;
    }
    html += `</div>`;

    html += `<div class="section-title">${list.length} place${list.length === 1 ? "" : "s"} <span class="muted-count">— tap “Add to day”</span></div>`;

    if (!list.length) {
      html += `<div class="empty"><div class="big">🤔</div><p>No places match. Try clearing filters or add your own.</p></div>`;
    }

    list.forEach((p) => {
      html += `
        <div class="card">
          <div class="place">${placeCardInner(p)}</div>
          <div class="add-row">
            <div class="adddrop">
              <button class="btn primary block" data-addto="${p.id}">＋ Add to day ▾</button>
              <div class="daymenu hidden" data-menu="${p.id}"></div>
            </div>
            <a class="icon-btn" href="${mapUrl(p)}" target="_blank" rel="noopener" title="Map">🗺️</a>
            <button class="icon-btn" data-edit="${p.id}" title="Edit">✏️</button>
            <button class="icon-btn danger" data-del="${p.id}" title="Remove">🗑️</button>
          </div>
        </div>`;
    });

    viewEl.innerHTML = html;
  }

  function dayMenuHtml(placeId) {
    let h = "";
    for (let i = 0; i < TRIP.days; i++) {
      const d = dayDate(i);
      h += `<button data-pick="${i}" data-place="${placeId}">${d.dow} ${d.mon} ${d.day} <span class="muted-count">(${state.i[i].length})</span></button>`;
    }
    return h;
  }

  // ---------- Actions ----------
  function addToDay(placeId, dayIdx) {
    state.i[dayIdx].push([placeId, ""]);
    persist();
    const d = dayDate(dayIdx);
    toast(`Added to ${d.dow} ${d.mon} ${d.day} ✓`);
  }
  function removeItem(dayIdx, idx) {
    state.i[dayIdx].splice(idx, 1);
    persist();
    renderItinerary();
  }
  function moveItem(dayIdx, idx, dir) {
    const arr = state.i[dayIdx];
    const j = idx + (dir === "up" ? -1 : 1);
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    persist();
    renderItinerary();
  }

  function deletePlace(id) {
    const p = placeById(id);
    if (!p) return;
    if (!confirm(`Remove “${p.name}” from your catalog? It’ll also be removed from any days.`)) return;
    if (isCustom(id)) {
      state.cp = state.cp.filter((x) => x.id !== id);
    } else {
      if (!state.hp.includes(id)) state.hp.push(id);
      delete state.ep[id];
    }
    // strip from itinerary
    state.i = state.i.map((day) => day.filter((it) => it[0] !== id));
    persist();
    render();
  }

  // ---------- Sheet (add/edit place) ----------
  const sheet = document.getElementById("sheet");
  const form = document.getElementById("placeForm");

  function fillSelects() {
    const catSel = document.getElementById("f-cat");
    const regSel = document.getElementById("f-region");
    catSel.innerHTML = Object.entries(CATEGORIES)
      .map(([k, v]) => `<option value="${k}">${v.emoji} ${v.label}</option>`).join("");
    regSel.innerHTML = Object.entries(REGIONS)
      .map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
  }

  function openSheet(place) {
    document.getElementById("sheetTitle").textContent = place ? "Edit place" : "Add a place";
    document.getElementById("f-id").value = place ? place.id : "";
    document.getElementById("f-name").value = place ? place.name : "";
    document.getElementById("f-cat").value = place ? place.cat : "sight";
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
      // new custom place
      const newId = "c_" + Date.now().toString(36);
      state.cp.push({ id: newId, ...data });
    } else if (isCustom(id)) {
      const p = state.cp.find((x) => x.id === id);
      Object.assign(p, data);
    } else {
      // store as an edit overlay on the seed place
      state.ep[id] = data;
    }
    persist();
    closeSheet();
    render();
    toast("Saved ✓");
  });

  // ---------- Sharing ----------
  async function share() {
    persist();
    const url = location.href;
    const text = "Here's our Bay Area plan — open it to view & tweak:";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Bay Area Trip", text, url });
        return;
      }
    } catch (e) { /* user cancelled — fall through to copy */ }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied — paste it to your friend 📲");
    } catch (e) {
      prompt("Copy this link:", url);
    }
  }

  // ---------- Event delegation ----------
  document.addEventListener("click", (e) => {
    const t = e.target;

    // tabs
    const tab = t.closest(".tab");
    if (tab) { ui.tab = tab.dataset.tab; render(); return; }

    // day chips
    const chip = t.closest(".day-chip");
    if (chip) { ui.day = +chip.dataset.day; renderItinerary(); return; }

    // filters
    if (t.dataset.filter) { ui.filter = t.dataset.filter; renderPlaces(); return; }

    // itinerary controls
    if (t.dataset.move) { moveItem(ui.day, +t.dataset.idx, t.dataset.move); return; }
    if (t.dataset.remove != null) { removeItem(ui.day, +t.dataset.remove); return; }

    // add-to-day dropdown
    if (t.dataset.addto) {
      const menu = document.querySelector(`[data-menu="${t.dataset.addto}"]`);
      const wasOpen = !menu.classList.contains("hidden");
      document.querySelectorAll(".daymenu").forEach((m) => m.classList.add("hidden"));
      if (!wasOpen) { menu.innerHTML = dayMenuHtml(t.dataset.addto); menu.classList.remove("hidden"); }
      return;
    }
    if (t.dataset.pick != null) {
      addToDay(t.dataset.place, +t.dataset.pick);
      document.querySelectorAll(".daymenu").forEach((m) => m.classList.add("hidden"));
      return;
    }
    // close any open menu when clicking elsewhere
    if (!t.closest(".adddrop")) {
      document.querySelectorAll(".daymenu").forEach((m) => m.classList.add("hidden"));
    }

    // edit / delete / add place
    if (t.dataset.edit) { openSheet(placeById(t.dataset.edit)); return; }
    if (t.dataset.del) { deletePlace(t.dataset.del); return; }
    if (t.id === "addPlaceBtn") { openSheet(null); return; }

    // sheet close
    if (t.hasAttribute("data-close")) { closeSheet(); return; }
  });

  // search (input event)
  document.addEventListener("input", (e) => {
    if (e.target.id === "searchBox") {
      ui.search = e.target.value;
      // re-render list but keep focus
      const pos = e.target.selectionStart;
      renderPlaces();
      const box = document.getElementById("searchBox");
      box.focus();
      box.setSelectionRange(pos, pos);
    }
    if (e.target.dataset.time != null) {
      const idx = +e.target.dataset.time;
      state.i[ui.day][idx][1] = e.target.value;
      persist(); // no re-render — keeps the input focused
    }
  });

  document.getElementById("shareBtn").addEventListener("click", share);

  // ---------- Drag & drop reorder (desktop + draggable) ----------
  let dragFrom = null;
  document.addEventListener("dragstart", (e) => {
    const item = e.target.closest(".itin-item");
    if (!item) return;
    dragFrom = +item.dataset.idx;
    item.classList.add("dragging");
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
    dragFrom = null;
    persist();
    renderItinerary();
  });

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 2200);
  }

  // ---------- Utils ----------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---------- Boot ----------
  document.getElementById("dateRange").textContent =
    `${dayDate(0).mon} ${dayDate(0).day} – ${dayDate(TRIP.days - 1).mon} ${dayDate(TRIP.days - 1).day}, 2026 · ${TRIP.days} days`;
  fillSelects();
  loadState();
  render();
})();
