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

  deals: [
    {
      id: "d1", name: "The Symphony Group PLC, Tuscany Way", location: "Wakefield, United Kingdom", assets: 12,
      industry: "Hotel", status: { label: "Processing", tone: "warning" }, deadline: "3d to deadline",
      owner: "YA", stage: "SCR", price: 61200000, dateReceived: "2026-08-28", image: "assets/img/deal-1.jpg",
      areaSqm: 1130, rentYearly: 7000000, rentPsm: 58.5, wault: 4.1, occupancy: 98.7, dealSource: "Structured Process",
    },
    {
      id: "d2", name: "Project Stellar", location: "Wakefield, United Kingdom", assets: 12,
      industry: "Office", status: { label: "New", tone: "info" },
      owner: null, stage: "LOI", price: 61200000, dateReceived: "2026-08-28", image: "assets/img/deal-2.jpg",
      areaSqm: 1130, rentYearly: 7000000, rentPsm: 58.5, wault: 4.1, occupancy: 98.7, dealSource: "Structured Process",
    },
    {
      id: "d3", name: "Great Bear Distribution, Bardon Stellar", location: "Wakefield, United Kingdom", assets: 12,
      industry: "Logistics", status: { label: "Review", tone: "review" }, comments: 3,
      owner: "IO", stage: "SCR", price: 61200000, dateReceived: "2026-08-28", image: null,
      areaSqm: 1130, rentYearly: 7000000, rentPsm: 58.5, wault: 4.1, occupancy: 98.7, dealSource: "Structured Process",
    },
    {
      id: "d4", name: "The Symphony Group PLC, Tuscany Way, Wakefield Europort", location: "Wakefield, United Kingdom", assets: 12,
      industry: "Hotel", comments: 21,
      owner: "YA", stage: "LOI", price: 61200000, dateReceived: "2026-08-28", image: "assets/img/deal-4.jpg",
      areaSqm: 1130, rentYearly: 7000000, rentPsm: 58.5, wault: 4.1, occupancy: 98.7, dealSource: "Structured Process",
    },
    {
      id: "d5", name: "TechForward Industries HQ", location: "Noord-Brabant & Limburg, Netherlands", assets: 3,
      industry: "Logistics", owner: "SC", stage: "LOI", price: 33710000, dateReceived: "2026-08-26", image: "assets/img/detail-cover.jpg",
      areaSqm: 8269, rentYearly: 831058, rentPsm: 100.5, wault: 4.1, occupancy: 98.5, dealSource: "Structured Process",
    },
  ],

  inboxSummary: { activeDeals: 11, withoutPrice: 2, totalValue: 531800000 },
};
