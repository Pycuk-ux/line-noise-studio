/* Mock data only — no backend. Copy is taken from the Figma Deals Inbox and Deal Details frames. */
window.GC = window.GC || {};

GC.MOCK = {
  today: "2026-10-05",

  users: [
    { id: "sc", name: "Sarah Chen", initials: "SC" },
    { id: "lo", name: "Liam O'Connor", initials: "LO" },
    { id: "ya", name: "Yusuf Ali", initials: "YA" },
    { id: "io", name: "Ines Ortega", initials: "IO" },
    { id: "mb", name: "Maya Brooks", initials: "MB" },
    { id: "tn", name: "Tomás Novak", initials: "TN" },
    { id: "bh", name: "Benjamin Hart", initials: "BH" },
    { id: "ss", name: "Sachin Shilwal", initials: "SS" },
    { id: "sk", name: "Semanta Kaur", initials: "SK" },
    { id: "bp", name: "Boris Petrov", initials: "BP" },
    { id: "dm", name: "Denis Moreau", initials: "DM" },
  ],

  locations: [
    "Wakefield, United Kingdom",
    "Noord-Brabant & Limburg, Netherlands",
    "Venlo, Netherlands",
    "Eindhoven, Netherlands",
    "Rotterdam, Netherlands",
    "Aarhus, Denmark",
    "Malmö, Sweden",
    "Manchester, United Kingdom",
    "Leeds, United Kingdom",
    "Hamburg, Germany",
    "Düsseldorf, Germany",
    "Lyon, France",
    "Milan, Italy",
    "Madrid, Spain",
  ],

  // icon = DS_ICONS glyph (DS has no per-industry glyphs yet — see TOKENS.md)
  industries: [
    { id: "Logistics", icon: "truck" },
    { id: "Office", icon: "office" },
    { id: "Hotel", icon: "apartment" },
    { id: "Data center", icon: "database" },
    { id: "Retail", icon: "store" },
    { id: "Industrial", icon: "factory" },
    { id: "Residential", icon: "home" },
    { id: "Mixed-use", icon: "buildings" },
  ],

  stages: ["Received", "SCR", "QUAL", "LOI", "DD", "SPA", "Completed"],

  funds: [
    "Gocanopy Logistics Fund II",
    "Gocanopy Core Fund I",
    "Gocanopy Value-Add Fund III",
    "Gocanopy Residential Fund I",
  ],

  deadlineTypes: ["LOI submission", "NBO submission", "Final bid", "IC approval", "Site visit", "DD completion", "Exchange"],
  marketTypes: ["On-Market", "Off-Market"],
  processTypes: ["Structured Process", "Bilateral", "Informal Tender"],
  conditions: ["New build", "Excellent", "Good", "Fair", "Needs refurbishment"],
  currencies: [
    { id: "EUR", symbol: "€" },
    { id: "GBP", symbol: "£" },
    { id: "USD", symbol: "$" },
  ],

  // map: position on the prototype base map (world units, 800 × 1270). Map labels from the Figma map (Malmö).
  deals: [
    {
      id: "d1", broker: "Savills", brokerContact: "Anna Weber", sentAt: "2026-08-26", receivedAt: "2026-08-28T08:42", docType: "Teaser", forwardedBy: "Yusuf Ali", team: ["BH", "SS", "SK"], status: "new", name: "The Symphony Group PLC, Tuscany Way", location: "Wakefield, United Kingdom", assets: 12,
      industry: "Hotel", deadline: "3d to deadline",
      owner: "YA", stage: "SCR", price: 61200000, dateReceived: "2026-08-28", image: "assets/img/deal-1.jpg",
      areaSqm: 53675, rentYearly: 3140000, rentPsm: 58.5, wault: 4.1, occupancy: 98.7, niy: 5.1, dealSource: "Structured Process",
      map: { x: 560, y: 640 },
    },
    {
      id: "d2", broker: "CBRE", brokerContact: "Pieter van de Wal", sentAt: "2026-08-28", receivedAt: "2026-08-28T10:05", docType: "IM", status: "new", name: "Project Stellar", location: "Wakefield, United Kingdom", assets: 12,
      industry: "Office", owner: null, stage: "LOI", price: 61200000, dateReceived: "2026-08-28", image: "assets/img/deal-2.jpg",
      areaSqm: 53675, rentYearly: 3140000, rentPsm: 58.5, wault: 4.1, occupancy: 98.7, niy: 5.4, dealSource: "Structured Process",
      map: { x: 330, y: 560 },
    },
    {
      id: "d3", broker: "JLL", brokerContact: "Tom Hughes", sentAt: "2026-08-27", receivedAt: "2026-08-28T07:51", docType: "IM", status: "live", name: "Great Bear Distribution, Bardon Stellar", location: "Wakefield, United Kingdom", assets: 12,
      industry: "Logistics", comments: 3,
      owner: "IO", stage: "SCR", price: 61200000, dateReceived: "2026-08-28", image: null,
      areaSqm: 53675, rentYearly: 3140000, rentPsm: 58.5, wault: 4.1, occupancy: 98.7, niy: 6.2, dealSource: "Structured Process",
      map: { x: 210, y: 780 },
    },
    {
      id: "d4", broker: "Colliers", brokerContact: "Marc Janssen", sentAt: "2026-08-27", receivedAt: "2026-08-27T16:20", docType: "IM", team: ["SC"], status: "live", name: "The Symphony Group PLC, Tuscany Way, Wakefield Europort", location: "Wakefield, United Kingdom", assets: 12,
      industry: "Hotel", comments: 21,
      owner: "YA", stage: "LOI", price: 61200000, dateReceived: "2026-08-28", image: "assets/img/deal-4.jpg",
      areaSqm: 53675, rentYearly: 3140000, rentPsm: 58.5, wault: 4.1, occupancy: 98.7, niy: 4.9, dealSource: "Structured Process",
      map: { x: 640, y: 930 },
    },
    {
      id: "d5", broker: "CBRE", brokerContact: "Pieter van de Wal", sentAt: "2026-08-26", receivedAt: "2026-08-26T11:30", docType: "IM", status: "live", name: "TechForward Industries HQ", location: "Noord-Brabant & Limburg, Netherlands", assets: 3,
      industry: "Logistics", owner: "SC", stage: "LOI", price: 33710000, dateReceived: "2026-08-26", image: "assets/img/detail-cover.jpg",
      areaSqm: 8269, rentYearly: 831058, rentPsm: 100.5, wault: 4.1, occupancy: 98.5, niy: 10.2, dealSource: "Structured Process",
      map: { x: 450, y: 720 },
    },
    {
      id: "d6", broker: "Knight Frank", brokerContact: "Sofia Lind", sentAt: "2026-08-24", receivedAt: "2026-08-24T09:12", docType: "IM", status: "new", name: "Harbourside Retail Park", location: "Malmö, Sweden", assets: 4,
      industry: "Retail", owner: "MB", stage: "QUAL", price: 18400000, dateReceived: "2026-08-24", image: null,
      areaSqm: 14200, rentYearly: 1320000, rentPsm: 93.0, wault: 6.3, occupancy: 92.0, niy: 7.2, dealSource: "Off-Market",
      map: { x: 420, y: 470 },
    },
    {
      id: "d7", broker: "Cushman & Wakefield", brokerContact: "Erik Holm", sentAt: "2026-08-21", receivedAt: "2026-08-22T08:03", docType: "Teaser", status: "tracking", name: "Kirseberg Logistics Hub", location: "Malmö, Sweden", assets: 2,
      industry: "Logistics", owner: "SC", stage: "QUAL", price: 27900000, dateReceived: "2026-08-22", image: null,
      areaSqm: 31800, rentYearly: 1810000, rentPsm: 56.9, wault: 7.8, occupancy: 100, niy: 6.5, dealSource: "Bilateral",
      map: { x: 650, y: 470 },
    },
    {
      id: "d8", broker: "Newmark", brokerContact: "Lena Berg", sentAt: "2026-08-19", receivedAt: "2026-08-19T13:47", docType: "IM", team: ["MB", "DM"], status: "live", name: "Fosie Industrial Estate", location: "Malmö, Sweden", assets: 6,
      industry: "Industrial", owner: "TN", stage: "DD", price: 12600000, dateReceived: "2026-08-19", image: null,
      areaSqm: 22400, rentYearly: 1010000, rentPsm: 45.1, wault: 3.2, occupancy: 88.4, niy: 8.0, dealSource: "Structured Process",
      map: { x: 560, y: 1050 },
    },
    {
      id: "d9", broker: "Savills", brokerContact: "Anna Weber", sentAt: "2026-08-14", receivedAt: "2026-08-15T09:00", docType: "IM", status: "live", name: "Hyllie Office Campus", location: "Malmö, Sweden", assets: 2,
      industry: "Office", comments: 5, owner: "LO", stage: "SPA", price: 44000000, dateReceived: "2026-08-15", image: null,
      areaSqm: 18900, rentYearly: 2380000, rentPsm: 125.9, wault: 5.5, occupancy: 96.1, niy: 5.4, dealSource: "Structured Process",
      map: { x: 190, y: 1040 },
    },
    {
      id: "d10", broker: "JLL", brokerContact: "Tom Hughes", sentAt: "2026-08-12", receivedAt: "2026-08-12T15:22", docType: "Teaser", status: "tracking", name: "Västra Hamnen Residences", location: "Malmö, Sweden", assets: 1,
      industry: "Residential", owner: "IO", stage: "SCR", price: null, dateReceived: "2026-08-12", image: null,
      areaSqm: 6400, rentYearly: 610000, rentPsm: 95.3, wault: 2.1, occupancy: 97.0, niy: null, dealSource: "Off-Market",
      map: { x: 150, y: 590 },
    },
    {
      id: "d11", broker: "Colliers", brokerContact: "Marc Janssen", sentAt: "2026-08-08", receivedAt: "2026-08-09T10:40", docType: "Teaser", status: "tracking", name: "Rosengård Mixed-use Block", location: "Malmö, Sweden", assets: 3,
      industry: "Mixed-use", owner: null, stage: "QUAL", price: null, dateReceived: "2026-08-09", image: null,
      areaSqm: 9700, rentYearly: 780000, rentPsm: 80.4, wault: 4.6, occupancy: 90.5, niy: null, dealSource: "Informal Tender",
      map: { x: 690, y: 760 },
    },
    {
      id: "d14", broker: "CBRE", brokerContact: "Pieter van de Wal", sentAt: "2026-11-02", receivedAt: "2026-11-02T09:18", docType: "IM",
      status: "new", name: "Kirseberg Logistics, Malmö", location: "Malmö, Sweden", assets: 2,
      industry: "Logistics", owner: null, stage: "Received", price: 26500000, dateReceived: "2026-11-02", image: null,
      areaSqm: 31800, rentYearly: 1790000, wault: 7.5, occupancy: 100, dealSource: "Structured Process",
      map: { x: 662, y: 452 },
    },
    {
      id: "d15", broker: "CBRE", brokerContact: "CBRE Research", sentAt: "2026-11-03", receivedAt: "2026-11-03T07:00", docType: "Newsletter",
      status: "new", name: "Nordic Logistics Market Report Q3 2026", location: "Nordics", assets: null,
      industry: "Logistics", owner: null, stage: "Received", price: null, dateReceived: "2026-11-03", image: null,
      areaSqm: null, rentYearly: null, wault: null, occupancy: null, dealSource: null,
      map: null,
    },
    // ---- Inbox scenarios from the merge proposal ----
    // Weserport: Savills sent it first (already in the pipeline); Colliers sends the same asset later.
    {
      id: "d17", broker: "Savills", brokerContact: "Anna Weber", sentAt: "2026-10-03", receivedAt: "2026-10-03T11:20", docType: "Teaser",
      status: "live", name: "Weserport", location: "Bremen, Germany", assets: 1,
      industry: "Logistics", owner: "SC", stage: "SCR", price: null, dateReceived: "2026-10-03", image: null,
      areaSqm: 41000, rentYearly: null, wault: null, occupancy: null, dealSource: "Structured Process",
      map: null,
    },
    {
      id: "d16", broker: "Colliers", brokerContact: "Marc Janssen", sentAt: "2026-11-04", receivedAt: "2026-11-04T10:12", docType: "IM",
      status: "new", name: "Weserport Logistics Park, Bremen", location: "Bremen, Germany", assets: 1,
      industry: "Logistics", owner: null, stage: "Received", price: 17900000, dateReceived: "2026-11-04", image: null,
      areaSqm: 40600, rentYearly: 1080000, wault: 6.2, occupancy: 100, dealSource: "Structured Process",
      map: null,
    },
    // Same broker, new thread: a revised IM for a deal already in DD.
    {
      id: "d18", broker: "Newmark", brokerContact: "Lena Berg", sentAt: "2026-11-01", receivedAt: "2026-11-01T15:40", docType: "IM (revised)",
      status: "new", name: "Fosie Industrial Estate, revised IM", location: "Malmö, Sweden", assets: 1,
      industry: "Industrial", owner: null, stage: "Received", price: 12100000, dateReceived: "2026-11-01", image: null,
      areaSqm: 22400, rentYearly: 905000, wault: 5.1, occupancy: 96.0, dealSource: "Structured Process",
      map: { x: 572, y: 1062 },
    },
    // Genuinely new: no match anywhere.
    {
      id: "d19", broker: "JLL", brokerContact: "Tom Hughes", sentAt: "2026-11-05", receivedAt: "2026-11-05T08:30", docType: "Teaser",
      status: "new", name: "Lund Science Park Offices", location: "Lund, Sweden", assets: 2,
      industry: "Office", owner: null, stage: "Received", price: 38500000, dateReceived: "2026-11-05", image: null,
      areaSqm: 18200, rentYearly: 2140000, wault: 6.8, occupancy: 93.5, dealSource: "Off-Market",
      map: null,
    },
  ],

  // Hidden from every list, count and the map: merged into another deal, or marked "Not a deal". Never deleted.
  hiddenDeals: [
    {
      id: "d13", broker: "JLL", brokerContact: "Tom Hughes", sentAt: "2026-08-21", receivedAt: "2026-08-21T14:02", docType: "Teaser",
      status: "new", name: "Harbourside RP, Malmö", location: "Malmö, Sweden", assets: 4,
      industry: "Retail", owner: null, stage: "Received", price: 19500000, dateReceived: "2026-08-21", image: null,
      areaSqm: 22400, rentYearly: 1350000, wault: 5.9, occupancy: 94.0, dealSource: "Structured Process",
      map: { x: 420, y: 470 },
      mergedInto: { id: "d6", by: "Maya Brooks", at: "2026-08-25T10:12:00Z" },
    },
  ],

  // Closed deals (an Outcome was picked) live in the Archive with their reason.
  archivedDeals: [
    {
      id: "d12", broker: "Savills", brokerContact: "Anna Weber", sentAt: "2026-07-20", receivedAt: "2026-07-21T08:30", docType: "IM", status: "dead", outcome: "Lost", outcomeReason: "Vendor expectation too high", outcomeNote: "",
      name: "Hyllie Office Campus", location: "Malmö, Sweden", assets: 2,
      industry: "Office", owner: "YA", stage: "LOI", price: 48200000, dateReceived: "2026-07-21", image: null,
      areaSqm: 15200, rentYearly: 2650000, wault: 3.8, occupancy: 92.4, dealSource: "Structured Process",
      map: { x: 260, y: 1060 },
    },
  ],
  inboxSummary: { activeDeals: 11, withoutPrice: 2, totalValue: 531800000 },
};

// Photo galleries (the prototype only has a handful of photos, so some deals share them).
(function () {
  const GALLERY = {
    d1: ["deal-1", "deal-4", "detail-cover", "deal-2"], d2: ["deal-2"], d4: ["deal-4", "deal-2", "deal-1"], d5: ["detail-cover", "deal-1"],
  };
  // Broker firms for setting the broker by hand (a colleague forwarding an email isn't a second broker).
  GC.MOCK.brokers = ["Savills", "Colliers", "CBRE", "JLL", "Cushman & Wakefield", "Knight Frank", "Newmark", "BNP Paribas Real Estate"];
  GC.MOCK.deals.find((d) => d.id === "d6").mergedFrom = ["d13"];
  GC.MOCK.deals.concat(GC.MOCK.archivedDeals, GC.MOCK.hiddenDeals).forEach((d) => {
    // What the broker quoted on arrival, kept as sent even when the live price is edited later.
    if (!("quotedPrice" in d)) d.quotedPrice = d.price;
    d.images = (GALLERY[d.id] || []).map((n) => `assets/img/${n}.jpg`); delete d.image;
    // Derived metrics, so every screen (cards, map, details, edit) agrees.
    d.rentPsm = d.rentYearly > 0 && d.areaSqm > 0 ? d.rentYearly / d.areaSqm : null;
    d.niy = d.rentYearly > 0 && d.price > 0 ? (d.rentYearly / d.price) * 100 : null;
  });
})();
