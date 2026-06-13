/* Seed data + config for the Bay Area trip planner.
   Everything here is the *starter* catalog. Users can add, edit, hide,
   and reorder from inside the app — their changes live in the URL/localStorage,
   never here. */

window.TRIP = {
  // June 19 (Fri) through June 23 (Tue) 2026 — 5 days.
  startDate: "2026-06-19",
  days: 5,
};

// Regions get a color so a glance tells you how spread-out a day is.
window.REGIONS = {
  sf: { label: "San Francisco", color: "#e0567a" },
  marin: { label: "Marin / North Bay", color: "#2f9e6e" },
  eastbay: { label: "East Bay", color: "#d98324" },
  peninsula: { label: "Peninsula", color: "#7b5ea7" },
  southbay: { label: "South Bay", color: "#2f7f9e" },
  coast: { label: "Coast", color: "#1f8aa8" },
};

window.CATEGORIES = {
  sight: { label: "Sightseeing", emoji: "📸" },
  food: { label: "Food", emoji: "🍽️" },
  coffee: { label: "Coffee", emoji: "☕" },
  outdoors: { label: "Outdoors", emoji: "🌳" },
  view: { label: "Viewpoint", emoji: "🌉" },
  museum: { label: "Museum", emoji: "🏛️" },
  culture: { label: "Culture", emoji: "🎭" },
  nightlife: { label: "Nightlife", emoji: "🍸" },
  shopping: { label: "Shopping", emoji: "🛍️" },
};

// id, name, category, region, emoji (optional override), note, query (for maps)
window.SEED_PLACES = [
  // --- San Francisco ---
  { id: "ggbridge", name: "Golden Gate Bridge", cat: "view", region: "sf", emoji: "🌉", note: "Iconic. Best from the Welcome Center or Battery Spencer.", query: "Golden Gate Bridge San Francisco" },
  { id: "ferrybldg", name: "Ferry Building Marketplace", cat: "food", region: "sf", note: "Artisan food hall on the water. Great Sat farmers market.", query: "Ferry Building Marketplace San Francisco" },
  { id: "ggpark", name: "Golden Gate Park", cat: "outdoors", region: "sf", note: "Huge park — gardens, bison, museums inside.", query: "Golden Gate Park San Francisco" },
  { id: "alamo", name: "Painted Ladies (Alamo Square)", cat: "sight", region: "sf", note: "The postcard Victorian row.", query: "Alamo Square San Francisco" },
  { id: "dolores", name: "Dolores Park", cat: "outdoors", region: "sf", note: "Sunny hangout park, skyline views, very local.", query: "Dolores Park San Francisco" },
  { id: "wharf", name: "Fisherman's Wharf & Pier 39", cat: "sight", region: "sf", note: "Sea lions, clam chowder, touristy fun.", query: "Pier 39 San Francisco" },
  { id: "chinatown", name: "Chinatown", cat: "culture", region: "sf", note: "Oldest in North America. Dim sum + alleys.", query: "Chinatown San Francisco" },
  { id: "coit", name: "Coit Tower", cat: "view", region: "sf", note: "360° city views + WPA murals. Walk the Filbert Steps.", query: "Coit Tower San Francisco" },
  { id: "deyoung", name: "de Young Museum", cat: "museum", region: "sf", note: "Art + a free observation tower.", query: "de Young Museum San Francisco" },
  { id: "tartine", name: "Tartine Bakery", cat: "food", region: "sf", note: "Legendary bakery in the Mission.", query: "Tartine Bakery San Francisco" },
  { id: "twinpeaks", name: "Twin Peaks", cat: "view", region: "sf", note: "Best panoramic view of the whole city.", query: "Twin Peaks San Francisco" },
  { id: "landsend", name: "Lands End Trail", cat: "outdoors", region: "sf", note: "Coastal cliff trail with bridge views + ruins.", query: "Lands End Lookout San Francisco" },
  { id: "castro", name: "The Castro", cat: "culture", region: "sf", note: "Historic LGBTQ neighborhood.", query: "Castro District San Francisco" },
  { id: "bluebottle", name: "Blue Bottle Coffee (Mint Plaza)", cat: "coffee", region: "sf", note: "Bay Area third-wave coffee staple.", query: "Blue Bottle Coffee Mint Plaza San Francisco" },
  { id: "swan", name: "Swan Oyster Depot", cat: "food", region: "sf", note: "Tiny 100-yr-old seafood counter. Expect a line.", query: "Swan Oyster Depot San Francisco" },

  // --- Marin / North Bay ---
  { id: "muir", name: "Muir Woods", cat: "outdoors", region: "marin", emoji: "🌲", note: "Old-growth redwoods. Reserve parking ahead.", query: "Muir Woods National Monument" },
  { id: "sausalito", name: "Sausalito", cat: "sight", region: "marin", note: "Charming waterfront town across the bridge. Ferry back to SF.", query: "Sausalito California" },
  { id: "ptreyes", name: "Point Reyes", cat: "outdoors", region: "marin", note: "Dramatic coast + lighthouse. Full-day trip.", query: "Point Reyes National Seashore" },

  // --- East Bay ---
  { id: "berkeley", name: "UC Berkeley Campus", cat: "sight", region: "eastbay", note: "Climb the Campanile for bay views.", query: "UC Berkeley" },
  { id: "merritt", name: "Lake Merritt (Oakland)", cat: "outdoors", region: "eastbay", note: "Urban lagoon loop, lively scene.", query: "Lake Merritt Oakland" },
  { id: "cheeseboard", name: "Cheese Board Pizza", cat: "food", region: "eastbay", note: "One pizza a day, always a line, always worth it.", query: "Cheese Board Pizza Berkeley" },

  // --- Peninsula ---
  { id: "stanford", name: "Stanford University", cat: "sight", region: "peninsula", note: "Beautiful campus + Rodin sculpture garden.", query: "Stanford University" },
  { id: "filoli", name: "Filoli Gardens", cat: "outdoors", region: "peninsula", note: "Historic estate + formal gardens.", query: "Filoli Woodside" },

  // --- South Bay ---
  { id: "applepark", name: "Apple Park Visitor Center", cat: "sight", region: "southbay", note: "AR model of the spaceship HQ + cafe/store.", query: "Apple Park Visitor Center Cupertino" },
  { id: "chm", name: "Computer History Museum", cat: "museum", region: "southbay", note: "Best tech history museum anywhere.", query: "Computer History Museum Mountain View" },

  // --- Coast ---
  { id: "hmb", name: "Half Moon Bay", cat: "outdoors", region: "coast", emoji: "🏖️", note: "Beach town over the hill from the peninsula.", query: "Half Moon Bay California" },
  { id: "santacruz", name: "Santa Cruz Beach Boardwalk", cat: "outdoors", region: "coast", note: "Classic seaside amusement park (~1.5h from SF).", query: "Santa Cruz Beach Boardwalk" },
];
