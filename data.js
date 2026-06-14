/* Seed data + config for the Bay Area trip planner.
   This catalog is a personal list of favorites — the starter set a friend
   sees so they know what I love doing here. Users can add, edit, hide, and
   reorder from inside the app; their changes live in the URL/localStorage. */

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
  coffee: { label: "Coffee / Cafe", emoji: "☕" },
  dessert: { label: "Dessert / Bakery", emoji: "🍰" },
  outdoors: { label: "Outdoors", emoji: "🌳" },
  view: { label: "Viewpoint", emoji: "🌉" },
  museum: { label: "Museum", emoji: "🏛️" },
  culture: { label: "Culture", emoji: "🎭" },
  activity: { label: "Activity", emoji: "🎯" },
  nightlife: { label: "Nightlife", emoji: "🍸" },
  shopping: { label: "Shopping", emoji: "🛍️" },
};

// id, name, category, region, emoji (optional), note, query (for maps), ll:[lat,lng]
window.SEED_PLACES = [
  // ---------------- Marin / North Bay ----------------
  { id: "mttam", name: "Mt Tam", cat: "outdoors", region: "marin", emoji: "🥾", note: "My go-to for hikes and unreal Bay views — we could time it for sunset up top.", query: "Mount Tamalpais State Park", ll: [37.929, -122.578] },
  { id: "alamere", name: "Alamere Falls Trail", cat: "outdoors", region: "marin", emoji: "💦", note: "A waterfall that spills right onto the beach — Javi's rec. Heads up: it's a LONG hike lol (~8 mi round trip). Worth it on a clear day.", query: "Alamere Falls Trailhead Bolinas", ll: [37.93, -122.78] },

  // ---------------- San Francisco — Activities ----------------
  { id: "ggpark", name: "Golden Gate Park", cat: "outdoors", region: "sf", note: "I spend a lot of weekends here — gardens, trails, museums. Easy to wander for hours.", query: "Golden Gate Park San Francisco", ll: [37.7694, -122.4862] },
  { id: "landsend", name: "Lands End", cat: "outdoors", region: "sf", note: "My favorite coastal walk in the city — cliffs, bridge views, an old shipwreck at low tide.", query: "Lands End Lookout San Francisco", ll: [37.7799, -122.5055] },
  { id: "bakerbeach", name: "Baker Beach", cat: "outdoors", region: "sf", emoji: "🏖️", note: "Classic beach hang with a straight-on Golden Gate view.", query: "Baker Beach San Francisco", ll: [37.7936, -122.4836] },
  { id: "oceanbeach", name: "Ocean Beach Bonfire", cat: "outdoors", region: "sf", emoji: "🔥", note: "If it's clear, let's grab firewood and do a sunset bonfire on the sand.", query: "Ocean Beach San Francisco", ll: [37.7594, -122.5107] },
  { id: "worldcup", name: "World Cup Viewing", cat: "activity", region: "sf", emoji: "⚽", note: "It's World Cup season! Let's find a packed bar and watch a match with the city.", query: "sports bars San Francisco", ll: [37.781, -122.412] },

  // ---------------- San Francisco — Restaurants ----------------
  { id: "khaotiew", name: "Khao Tiew", cat: "food", region: "sf", note: "One of my favorite Thai spots in the city.", query: "Khao Tiew San Francisco", ll: [37.746, -122.421] },
  { id: "capital", name: "Capital Restaurant", cat: "food", region: "sf", note: "Get the salt & pepper chicken wings — trust me.", query: "Capital Restaurant San Francisco", ll: [37.7959, -122.4078] },
  { id: "tacoselpatron", name: "Tacos El Patron", cat: "food", region: "sf", emoji: "🌮", note: "My taco go-to in the Mission — birria, lengua, pescado.", query: "Tacos El Patron San Francisco", web: "https://www.tacos-el-patron.com/", ll: [37.748, -122.418] },
  { id: "zandy", name: "Z&Y", cat: "food", region: "sf", emoji: "🌶️", note: "Fiery Sichuan in Chinatown — order the chili dishes.", query: "Z & Y Restaurant San Francisco", web: "https://www.zandyrestaurant.com/", ll: [37.7949, -122.4072] },
  { id: "lily", name: "Lily", cat: "food", region: "sf", note: "Great spot — lunch only, so plan around it.", query: "Lily Restaurant San Francisco", ll: [37.798, -122.436] },
  { id: "minipotstickers", name: "Mini Potstickers", cat: "food", region: "sf", emoji: "🥟", note: "Cheap, delicious potstickers — a little gem.", query: "Mini Potstickers San Francisco", ll: [37.792, -122.412] },
  { id: "ahmaskitchen", name: "Ah Ma's Kitchen", cat: "food", region: "sf", emoji: "🍗", note: "Hong Kong–style cafe in Inner Richmond. Kiln chicken is MVP; anything with salted egg (the wings!) 🤤", query: "Ah Ma's Kitchen San Francisco", web: "https://www.ahmaskitchensf.com/", ll: [37.782, -122.462] },

  // ---------------- From Beli (beliapp.co/app/juswag) ----------------
  { id: "hokkaido", name: "Hokkaido Sashimi Marketplace", cat: "food", region: "sf", emoji: "🍣", note: "Japanese sushi + grocery in Little Russia. Karaage bomb, sushi guud.", query: "Hokkaido Sashimi Marketplace San Francisco", web: "https://hokkaidosashimisf.com/", ll: [37.781, -122.466] },
  { id: "bocconcino", name: "Bocconcino", cat: "food", region: "sf", emoji: "🍝", note: "Italian in North Beach. Chicken parmigiana + seafood ravioli.", query: "Bocconcino San Francisco", web: "https://www.bocconcinosf.com/", ll: [37.800, -122.409] },
  { id: "masdimsum", name: "Ma's Dimsum & Cafe", cat: "food", region: "sf", emoji: "🥟", note: "Dim sum in Russian Hill.", query: "Ma's Dimsum & Cafe San Francisco", ll: [37.798, -122.418] },
  { id: "curryhyuga", name: "Curry Hyuga", cat: "food", region: "sf", emoji: "🍛", note: "Japanese curry in the Mission — yummy and Joshua-sized 😄", query: "Curry Hyuga San Francisco", web: "https://curryhyuga.com/", ll: [37.760, -122.420] },
  { id: "dancingyak", name: "Dancing Yak", cat: "food", region: "sf", emoji: "🥘", note: "Nepalese / Himalayan in Mission Dolores.", query: "Dancing Yak Restaurant San Francisco", web: "https://dancingyaksf.com/", ll: [37.764, -122.426] },
  { id: "hkclaypot", name: "Hong Kong Clay Pot", cat: "food", region: "sf", emoji: "🍲", note: "Cantonese clay pot in Chinatown.", query: "Hong Kong Clay Pot Restaurant San Francisco", web: "https://hongkongclaypot.shop/", ll: [37.795, -122.407] },
  { id: "beifang", name: "Bei Fang Style", cat: "food", region: "sf", emoji: "🍜", note: "Northern Chinese in Outer Sunset. Noodle soup fave, dumplings good. (TC Pastry next door for the rest.)", query: "Bei Fang Style San Francisco", web: "https://beifangstylesf.com/", ll: [37.753, -122.504] },

  // ---------------- Cafe / Dessert Spots ----------------
  { id: "arsicault", name: "Arsicault Bakery", cat: "dessert", region: "sf", emoji: "🥐", note: "Some of the best croissants in the country, no joke.", query: "Arsicault Bakery San Francisco", ll: [37.7826, -122.4597] },
  { id: "hinrg", name: "Hi NRG", cat: "coffee", region: "sf", note: "Inner Richmond cafe — DAK espresso was guud, Terraform pour-over was great!!", query: "Hi NRG Coffee San Francisco", web: "http://hinrg.net/", ll: [37.780, -122.464] },
  { id: "goldengoat", name: "Golden Goat Coffee", cat: "coffee", region: "sf", emoji: "🐐", note: "South Beach — the B&W New School is one of my all-time faves.", query: "Golden Goat Coffee San Francisco", web: "http://goldengoatcoffee.com/", ll: [37.783, -122.390] },

  // ---------------- Coffee / Matcha (from Beli) ----------------
  { id: "wildfox", name: "The Wild Fox", cat: "coffee", region: "sf", emoji: "🦊", note: "FiDi. Rotating beans from great roasters — pour-overs are great (haven't tried espresso yet).", query: "The Wild Fox San Francisco", web: "http://thewildfoxsf.com/", ll: [37.792, -122.401] },
  { id: "porter", name: "The Pop-Up by Porter", cat: "coffee", region: "sf", note: "Levi's Plaza / Northern Waterfront. Onyx coffee!!!", query: "The Pop-Up by Porter Levi's Plaza San Francisco", web: "https://byporter.com/levisplaza", ll: [37.803, -122.401] },
  { id: "kissofmatcha", name: "Kiss of Matcha", cat: "coffee", region: "sf", emoji: "🍵", note: "Matcha + tea in North Beach.", query: "Kiss of Matcha San Francisco", web: "http://www.kissofmatcha.com/", ll: [37.800, -122.410] },
  { id: "papersondogpatch", name: "Paper Son Coffee — Dogpatch", cat: "coffee", region: "sf", note: "Dogpatch. LETTY BURMEDEZ so good — love the Sunday pour-overs!! Bakery also guud.", query: "Paper Son Coffee Dogpatch San Francisco", web: "http://papersoncoffee.com/", ll: [37.760, -122.388] },
  { id: "linea", name: "Linea Caffe", cat: "coffee", region: "sf", note: "Mission. House blend flat white.", query: "Linea Caffe San Francisco", web: "http://www.lineacaffe.com/", ll: [37.759, -122.419] },
  { id: "homecoffee", name: "Home Coffee Roasters", cat: "coffee", region: "sf", note: "Coffee in Chinatown.", query: "Home Coffee Roasters San Francisco", web: "http://homecoffeesf.com/", ll: [37.796, -122.407] },
  { id: "kissaten", name: "Kissaten HiFi", cat: "coffee", region: "sf", emoji: "🍵", note: "Presidio Terrace. Not usually into dessert drinks but the einspanner + turon matcha slay; hojicha p guud too.", query: "Kissaten HiFi San Francisco", ll: [37.787, -122.461] },
  { id: "coffeemovement", name: "The Coffee Movement", cat: "coffee", region: "sf", note: "Nob Hill. Yum espresso drinks (matcha is bleh).", query: "The Coffee Movement San Francisco", web: "https://www.thecoffeemovement.com/", ll: [37.792, -122.413] },
  { id: "papersondowntown", name: "Paper Son Coffee — Downtown", cat: "coffee", region: "sf", note: "Rincon Hill. Good matcha, espresso is just ok.", query: "Paper Son Coffee Downtown San Francisco", web: "http://papersoncoffee.com/", ll: [37.788, -122.391] },
  { id: "saltandstraw", name: "Salt & Straw", cat: "dessert", region: "sf", emoji: "🍦", note: "Fun, inventive ice cream flavors.", query: "Salt & Straw San Francisco", ll: [37.7847, -122.4339] },
  { id: "tadaima", name: "Tadaima", cat: "coffee", region: "sf", emoji: "🍵", note: "Cute Japanese cafe — matcha and treats.", query: "Tadaima San Francisco", ll: [37.781, -122.432] },
  { id: "stonemill", name: "Stonemill Matcha", cat: "coffee", region: "sf", emoji: "🍵", note: "My matcha spot in the Mission.", query: "Stonemill Matcha San Francisco", ll: [37.7595, -122.4212] },
  { id: "tartine", name: "Tartine Bakery", cat: "dessert", region: "sf", emoji: "🥐", note: "Iconic SF bakery — the morning bun is a must.", query: "Tartine Bakery San Francisco", ll: [37.7614, -122.4241] },

  // ---------------- Things to do together ----------------
  { id: "cookdinner", name: "Cook Dinner Together", cat: "activity", region: "sf", emoji: "🍳", note: "Let's cook a meal together at mine — my favorite way to catch up.", query: "" },
  { id: "japantown", name: "Japantown", cat: "culture", region: "sf", emoji: "🎎", note: "Let's wander Japantown — shops, snacks, matcha.", query: "Japantown San Francisco", ll: [37.7853, -122.4296] },

  // ---------------- Broader Bay Area ----------------
  { id: "topgolf", name: "Topgolf", cat: "activity", region: "southbay", emoji: "⛳", note: "Fun group activity even if you've never swung a club.", query: "Topgolf San Jose", ll: [37.402, -121.974] },
  { id: "stanford", name: "Stanford Tour", cat: "sight", region: "peninsula", note: "I'll show you around campus — it's a beautiful place to walk.", query: "Stanford University", ll: [37.4275, -122.1697] },
];
