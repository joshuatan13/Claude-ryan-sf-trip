/* Shared-sync layer (optional). Wraps Firebase Realtime Database so the
   whole app state lives in one cloud doc keyed by an unguessable trip ID.

   - If firebase-config.js is blank, this stays dormant and the app runs in
     link-only mode (state in the URL hash + localStorage).
   - State is stored as a single JSON *string* (RTDB mangles arrays/undefined
     otherwise), with a timestamp. Last write wins — fine for a casual planner.
   - We ignore the echo of our own writes so a push doesn't loop. */

(function () {
  "use strict";

  const CFG = window.FIREBASE_CONFIG || {};
  const configured = !!(CFG.databaseURL && CFG.apiKey);

  let mod = null, dbref = null, tripId = null;
  let ready = false, seeded = false, lastJSON = null, pushTimer = null;
  let opts = {};

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  async function init(o) {
    opts = o || {};
    if (!configured) { if (opts.onError) opts.onError("not-configured"); return; }
    tripId = opts.tripId || genId();
    try {
      const appMod = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
      mod = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");
      const app = appMod.initializeApp(CFG);
      const db = mod.getDatabase(app);
      dbref = mod.ref(db, "trips/" + tripId);
      ready = true;
      if (opts.onReady) opts.onReady(tripId);
      mod.onValue(dbref, (snap) => {
        const v = snap.val();
        if (v && typeof v.s === "string") {
          if (v.s !== lastJSON) { lastJSON = v.s; try { opts.onRemote(JSON.parse(v.s)); } catch (e) {} }
        } else if (!seeded) {
          seeded = true; // brand-new trip: seed it with whatever we have locally
          if (opts.getState) push(opts.getState());
        }
      }, (err) => { if (opts.onError) opts.onError(err); });
    } catch (e) {
      console.warn("Sync init failed — staying in link-only mode:", e);
      ready = false;
      if (opts.onError) opts.onError(e);
    }
  }

  function push(state) {
    if (!ready || !dbref || state == null) return;
    const json = JSON.stringify(state);
    lastJSON = json; // mark so the resulting onValue echo is ignored
    if (opts.onSaving) opts.onSaving();
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      mod.set(dbref, { s: json, t: Date.now() })
        .then(() => { if (opts.onSaved) opts.onSaved(); })
        .catch((e) => { if (opts.onError) opts.onError(e); });
    }, 400);
  }

  window.Sync = {
    configured: () => configured,
    get enabled() { return ready; },
    get tripId() { return tripId; },
    init,
    push,
    shareUrl: () => location.origin + location.pathname + "#t=" + tripId,
  };
})();
