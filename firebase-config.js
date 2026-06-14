/* ----------------------------------------------------------------------
   OPTIONAL shared sync (auto-sync between you and friends).

   Leave this blank to run the app in link-only mode (no backend) — that's
   the default and needs no setup.

   To turn ON auto-sync (free, ~2 minutes, no user logins in the app):
     1. Go to https://console.firebase.google.com and create a project.
     2. In the project, Build → Realtime Database → Create Database
        (pick a location, start in "test mode" for now).
     3. Project settings (gear icon) → "Your apps" → Web app (</>) →
        register an app → copy the firebaseConfig values below.
     4. Paste apiKey, authDomain, databaseURL, projectId here and save.
     5. (Recommended) In Realtime Database → Rules, scope access to trips:
          { "rules": { "trips": { "$id": { ".read": true, ".write": true } } } }
        Data is keyed by an unguessable trip ID that lives in the share link,
        so only people you send the link to can reach a given trip.

   The web config is meant to be public — it is not a secret.
---------------------------------------------------------------------- */
window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "", // e.g. https://your-project-default-rtdb.firebaseio.com
  projectId: "",
};
