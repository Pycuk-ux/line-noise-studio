/* Single source of truth for the Add New Deal modal + field schema, validation and draft storage. */
window.GC = window.GC || {};

(function () {
  const DRAFT_KEY = "gocanopy.addDeal.draft.v1";

  GC.STEPS = [
    { id: "key", label: "Key Info" },
    { id: "general", label: "General Info" },
    { id: "physical", label: "Physical Info" },
    { id: "financial", label: "Financial Info" },
    { id: "preview", label: "Preview" },
  ];

  /*
   * Numeric field schema. Canonical storage: area in sqm, money-per-period per year.
   * kind: area | money | moneyPeriod | percent | int | year | years
   */
  GC.FIELDS = {
    // Key Info — all required (iteration-1 decision). Order mirrors the Deal Details key-metrics grid.
    area_sqm:     { step: 0, label: "Area", kind: "area", required: true, gt: 0 },
    price:        { step: 0, label: "Price", kind: "money", required: true, gt: 0 },
    occupancy:    { step: 0, label: "Occupancy", kind: "percent", required: true, min: 0, max: 100 },
    rent_yearly:  { step: 0, label: "Rent", kind: "moneyPeriod", required: true, gt: 0 },
    niy:          { step: 0, label: "NIY", kind: "percent", required: true, gt: 0, max: 100 },
    assets_count: { step: 0, label: "Number of assets", kind: "int", required: true, min: 1 },

    // Physical Info — optional
    gla_sqm:        { step: 2, label: "GLA", kind: "area", min: 0 },
    nla_sqm:        { step: 2, label: "NLA", kind: "area", min: 0 },
    land_sqm:       { step: 2, label: "Land area", kind: "area", min: 0 },
    year_built:     { step: 2, label: "Year built", kind: "year", min: 1800, max: 2100 },
    year_renovated: { step: 2, label: "Year renovated", kind: "year", min: 1800, max: 2100 },
    floors:         { step: 2, label: "Floors", kind: "int", min: 0 },
    units_count:    { step: 2, label: "Units", kind: "int", min: 0 },
    parking:        { step: 2, label: "Parking", kind: "int", min: 0, suffix: "spaces" },

    // Financial Info — optional. Rent / Price / NIY are not repeated (captured in Key Info).
    noi_yearly:          { step: 3, label: "Net operating income", kind: "moneyPeriod" },
    opex_yearly:         { step: 3, label: "Operating expenses", kind: "moneyPeriod", min: 0 },
    erv_yearly:          { step: 3, label: "ERV", kind: "moneyPeriod", min: 0 },
    debt_service_yearly: { step: 3, label: "Debt service", kind: "moneyPeriod", min: 0 },
    capex:               { step: 3, label: "CapEx", kind: "money", min: 0 },
    purchaser_costs:     { step: 3, label: "Purchaser costs", kind: "percent", min: 0, max: 100 },
    wault:               { step: 3, label: "WAULT", kind: "years", min: 0, max: 99 },
    exit_yield:          { step: 3, label: "Exit yield", kind: "percent", min: 0, max: 100 },
    rent_growth:         { step: 3, label: "Rent growth", kind: "percent", min: -100, max: 100, suffix: "% p.a." },
    hold_period:         { step: 3, label: "Hold period", kind: "years", min: 0, max: 99 },
    ltv:                 { step: 3, label: "LTV", kind: "percent", min: 0, max: 100 },
    cost_of_debt:        { step: 3, label: "Cost of debt", kind: "percent", min: 0, max: 100 },
  };

  function defaultData() {
    const d = {
      // General Info
      deal_name: "", location: "", industry: "", stage: "Received", date_received: GC.MOCK.today,
      team: [], fund: "", deadline_type: "", deadline_date: "", broker_company: "", broker_contact: "",
      market_type: "", process_type: "",
      // Physical (select)
      condition: "",
      // NIY override flag
      niy_manual: false,
    };
    Object.keys(GC.FIELDS).forEach((k) => (d[k] = null));
    return d;
  }

  function initialState() {
    return {
      open: false,
      step: 0,
      visited: [true, false, false, false, false],
      attempted: [false, false, false, false, false],
      touched: {},
      raw: {},
      units: { area: "sqm", period: "yearly", currency: "EUR" },
      data: defaultData(),
      images: [], // { id, name, size, status: 'uploading'|'done', progress, src, data }
      uploadErrors: [],
      ai: { summary: true, strengths: true, risks: true },
      restoredFrom: null,
    };
  }

  GC.state = initialState();
  GC.resetState = function () {
    (GC.state.images || []).forEach((im) => im.objectUrl && URL.revokeObjectURL(im.objectUrl));
    GC.state = initialState();
  };

  // ---------- Validation ----------
  GC.validateField = function (id, d) {
    d = d || GC.state.data;
    const f = GC.FIELDS[id];
    const v = d[id];
    if (!f) return "";
    if (v == null) return f.required ? `${f.label} is required` : "";
    if (Number.isNaN(v)) return "Enter a number";
    if ((f.kind === "int" || f.kind === "year") && !Number.isInteger(v)) return "Enter a whole number";
    if (f.gt != null && !(v > f.gt)) return `Must be greater than ${f.gt}`;
    if (f.min != null && v < f.min) return f.kind === "percent" && f.max != null ? `Enter a value between ${f.min} and ${f.max}` : `Must be at least ${f.min}`;
    if (f.max != null && v > f.max) return f.kind === "percent" && f.min != null ? `Enter a value between ${f.min} and ${f.max}` : `Must be ${f.max} or less`;
    if (id === "year_renovated" && d.year_built != null && !Number.isNaN(d.year_built) && v < d.year_built) return "Can't be earlier than year built";
    return "";
  };

  GC.validateStep = function (step) {
    const errors = {};
    Object.keys(GC.FIELDS).forEach((id) => {
      if (GC.FIELDS[id].step !== step) return;
      const msg = GC.validateField(id);
      if (msg) errors[id] = msg;
    });
    if (step === 1 && GC.state.data.deadline_date && !/^\d{4}-\d{2}-\d{2}$/.test(GC.state.data.deadline_date)) errors.deadline_date = "Enter a valid date";
    return { valid: Object.keys(errors).length === 0, errors };
  };

  /** A step is reachable when every step before it is valid. */
  GC.isReachable = function (i) {
    for (let s = 0; s < i; s++) if (!GC.validateStep(s).valid) return false;
    return true;
  };

  // ---------- Dirty ----------
  GC.isDirty = function () {
    const s = GC.state;
    if (s.images.length) return true;
    const def = defaultData();
    for (const k of Object.keys(def)) {
      if (k === "niy_manual" || k === "niy") continue; // NIY is derived unless typed manually
      const a = s.data[k], b = def[k];
      if (Array.isArray(a)) { if (a.length) return true; continue; }
      if (typeof a === "number") return true; // includes NaN — something was typed
      if (typeof a === "string" && a !== "" && a !== b) return true;
    }
    if (s.data.niy_manual) return true;
    return Object.keys(s.raw).some((k) => s.raw[k] && String(s.raw[k]).trim() !== "");
  };

  // ---------- Draft (localStorage) ----------
  function safeStorage() { try { return window.localStorage; } catch (e) { return null; } }

  GC.saveDraft = function () {
    const store = safeStorage();
    if (!store) return { ok: false };
    const s = GC.state;
    const data = {};
    Object.keys(s.data).forEach((k) => { const v = s.data[k]; data[k] = typeof v === "number" && Number.isNaN(v) ? null : v; });
    const payload = {
      v: 1, savedAt: new Date().toISOString(), step: s.step, visited: s.visited,
      units: s.units, data, ai: s.ai,
      images: s.images.filter((im) => im.status === "done" && im.data).map((im) => ({ id: im.id, name: im.name, size: im.size, data: im.data })),
    };
    try {
      store.setItem(DRAFT_KEY, JSON.stringify(payload));
      return { ok: true };
    } catch (e) {
      // Quota exceeded — keep the form data, drop the images.
      try {
        payload.images = [];
        store.setItem(DRAFT_KEY, JSON.stringify(payload));
        return { ok: true, imagesDropped: true };
      } catch (e2) { return { ok: false }; }
    }
  };

  GC.loadDraft = function () {
    const store = safeStorage();
    if (!store) return null;
    try { const raw = store.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  };
  GC.clearDraft = function () { const store = safeStorage(); try { store && store.removeItem(DRAFT_KEY); } catch (e) {} };

  GC.applyDraft = function (draft) {
    const s = initialState();
    s.step = Math.min(draft.step || 0, 3);
    s.visited = draft.visited || s.visited;
    s.units = Object.assign(s.units, draft.units || {});
    s.data = Object.assign(defaultData(), draft.data || {});
    s.ai = Object.assign(s.ai, draft.ai || {});
    s.images = (draft.images || []).map((im) => ({ id: im.id, name: im.name, size: im.size, status: "done", progress: 100, src: im.data, data: im.data }));
    s.restoredFrom = draft.savedAt;
    // Never land on a step the restored data can't reach.
    while (s.step > 0 && !(function () { GC.state = s; return GC.isReachable(s.step); })()) s.step--;
    GC.state = s;
  };
})();
