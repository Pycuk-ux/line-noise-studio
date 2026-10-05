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
    { id: "Logistics", icon: "building" },
    { id: "Office", icon: "building" },
    { id: "Hotel", icon: "building" },
    { id: "Retail", icon: "building" },
    { id: "Industrial", icon: "building" },
    { id: "Residential", icon: "house" },
    { id: "Mixed-use", icon: "building" },
  ],

  stages: ["Received", "SCR", "QUAL", "LOI", "DD", "SPA", "Completed", "Other"],

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
      id: "d1", name: "The Symphony Group PLC, Tuscany Way", location: "Wakefield, United Kingdom", assets: 12,
      industry: "Hotel", status: { label: "Processing", tone: "warning" }, deadline: "3d to deadline",
      owner: "YA", stage: "SCR", price: 61200000, dateReceived: "2026-08-28", image: "assets/img/deal-1.jpg",
      areaSqm: 53675, rentYearly: 3140000, rentPsm: 58.5, wault: 4.1, occupancy: 98.7, niy: 5.1, dealSource: "Structured Process",
      map: { x: 560, y: 640 },
    },
    {
      id: "d2", name: "Project Stellar", location: "Wakefield, United Kingdom", assets: 12,
      industry: "Office", status: { label: "New", tone: "info" },
      owner: null, stage: "LOI", price: 61200000, dateReceived: "2026-08-28", image: "assets/img/deal-2.jpg",
      areaSqm: 53675, rentYearly: 3140000, rentPsm: 58.5, wault: 4.1, occupancy: 98.7, niy: 5.4, dealSource: "Structured Process",
      map: { x: 330, y: 560 },
    },
    {
      id: "d3", name: "Great Bear Distribution, Bardon Stellar", location: "Wakefield, United Kingdom", assets: 12,
      industry: "Logistics", status: { label: "Review", tone: "review" }, comments: 3,
      owner: "IO", stage: "SCR", price: 61200000, dateReceived: "2026-08-28", image: null,
      areaSqm: 53675, rentYearly: 3140000, rentPsm: 58.5, wault: 4.1, occupancy: 98.7, niy: 6.2, dealSource: "Structured Process",
      map: { x: 210, y: 780 },
    },
    {
      id: "d4", name: "The Symphony Group PLC, Tuscany Way, Wakefield Europort", location: "Wakefield, United Kingdom", assets: 12,
      industry: "Hotel", comments: 21,
      owner: "YA", stage: "LOI", price: 61200000, dateReceived: "2026-08-28", image: "assets/img/deal-4.jpg",
      areaSqm: 53675, rentYearly: 3140000, rentPsm: 58.5, wault: 4.1, occupancy: 98.7, niy: 4.9, dealSource: "Structured Process",
      map: { x: 640, y: 930 },
    },
    {
      id: "d5", name: "TechForward Industries HQ", location: "Noord-Brabant & Limburg, Netherlands", assets: 3,
      industry: "Logistics", owner: "SC", stage: "LOI", price: 33710000, dateReceived: "2026-08-26", image: "assets/img/detail-cover.jpg",
      areaSqm: 8269, rentYearly: 831058, rentPsm: 100.5, wault: 4.1, occupancy: 98.5, niy: 10.2, dealSource: "Structured Process",
      map: { x: 450, y: 720 },
    },
    {
      id: "d6", name: "Harbourside Retail Park", location: "Malmö, Sweden", assets: 4,
      industry: "Retail", status: { label: "New", tone: "info" }, owner: "MB", stage: "QUAL", price: 18400000, dateReceived: "2026-08-24", image: null,
      areaSqm: 14200, rentYearly: 1320000, rentPsm: 93.0, wault: 6.3, occupancy: 92.0, niy: 7.2, dealSource: "Off-Market",
      map: { x: 420, y: 470 },
    },
    {
      id: "d7", name: "Kirseberg Logistics Hub", location: "Malmö, Sweden", assets: 2,
      industry: "Logistics", owner: "SC", stage: "QUAL", price: 27900000, dateReceived: "2026-08-22", image: null,
      areaSqm: 31800, rentYearly: 1810000, rentPsm: 56.9, wault: 7.8, occupancy: 100, niy: 6.5, dealSource: "Bilateral",
      map: { x: 650, y: 470 },
    },
    {
      id: "d8", name: "Fosie Industrial Estate", location: "Malmö, Sweden", assets: 6,
      industry: "Industrial", owner: "TN", stage: "DD", price: 12600000, dateReceived: "2026-08-19", image: null,
      areaSqm: 22400, rentYearly: 1010000, rentPsm: 45.1, wault: 3.2, occupancy: 88.4, niy: 8.0, dealSource: "Structured Process",
      map: { x: 560, y: 1050 },
    },
    {
      id: "d9", name: "Hyllie Office Campus", location: "Malmö, Sweden", assets: 2,
      industry: "Office", comments: 5, owner: "LO", stage: "SPA", price: 44000000, dateReceived: "2026-08-15", image: null,
      areaSqm: 18900, rentYearly: 2380000, rentPsm: 125.9, wault: 5.5, occupancy: 96.1, niy: 5.4, dealSource: "Structured Process",
      map: { x: 190, y: 1040 },
    },
    {
      id: "d10", name: "Västra Hamnen Residences", location: "Malmö, Sweden", assets: 1,
      industry: "Residential", status: { label: "Review", tone: "review" }, owner: "IO", stage: "SCR", price: null, dateReceived: "2026-08-12", image: null,
      areaSqm: 6400, rentYearly: 610000, rentPsm: 95.3, wault: 2.1, occupancy: 97.0, niy: null, dealSource: "Off-Market",
      map: { x: 150, y: 590 },
    },
    {
      id: "d11", name: "Rosengård Mixed-use Block", location: "Malmö, Sweden", assets: 3,
      industry: "Mixed-use", owner: null, stage: "QUAL", price: null, dateReceived: "2026-08-09", image: null,
      areaSqm: 9700, rentYearly: 780000, rentPsm: 80.4, wault: 4.6, occupancy: 90.5, niy: null, dealSource: "Informal Tender",
      map: { x: 690, y: 760 },
    },
  ],

  inboxSummary: { activeDeals: 11, withoutPrice: 2, totalValue: 531800000 },
};

// Photo galleries (the prototype only has a handful of photos, so some deals share them).
(function () {
  const GALLERY = {
    d1: ["deal-1", "deal-4", "detail-cover", "deal-2"], d2: ["deal-2"], d4: ["deal-4", "deal-2", "deal-1"], d5: ["detail-cover", "deal-1"],
  };
  GC.MOCK.deals.forEach((d) => {
    d.images = (GALLERY[d.id] || []).map((n) => `assets/img/${n}.jpg`); delete d.image;
    // Derived metrics, so every screen (cards, map, details, edit) agrees.
    d.rentPsm = d.rentYearly > 0 && d.areaSqm > 0 ? d.rentYearly / d.areaSqm : null;
    d.niy = d.rentYearly > 0 && d.price > 0 ? (d.rentYearly / d.price) * 100 : null;
  });
})();
