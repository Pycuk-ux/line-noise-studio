/* Number formats, unit conversion and the derived Key Info metrics. */
window.GC = window.GC || {};

(function () {
  const SQF_PER_SQM = 10.7639;
  const LOCALE = "en-GB";

  function currencySymbol(code) {
    const c = GC.MOCK.currencies.find((x) => x.id === code);
    return c ? c.symbol : "€";
  }

  /** "1,234.5" / "1 234,5" / "" → number | null (NaN when it is not a number). */
  function parseNum(raw) {
    if (raw == null) return null;
    const s = String(raw).trim().replace(/[\s,]/g, "");
    if (s === "") return null;
    if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(s)) return NaN;
    return Number(s);
  }

  function round(v, dp) {
    const f = Math.pow(10, dp);
    return Math.round(v * f) / f;
  }

  function num(v, maxDp, minDp) {
    if (v == null || Number.isNaN(v)) return "";
    return v.toLocaleString(LOCALE, { maximumFractionDigits: maxDp == null ? 2 : maxDp, minimumFractionDigits: minDp || 0 });
  }

  /** Short money, Deal Details style: €33.7M · €831,058 · €100.5 */
  function moneyShort(v, cur) {
    if (v == null || Number.isNaN(v)) return "—";
    const s = currencySymbol(cur);
    if (Math.abs(v) >= 1e6) return s + num(v / 1e6, 1, 1) + "M";
    return s + num(v, Math.abs(v) < 1000 ? 1 : 0);
  }
  function money(v, cur, dp) {
    if (v == null || Number.isNaN(v)) return "—";
    return currencySymbol(cur) + num(v, dp == null ? 0 : dp);
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function parseISO(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null;
  }
  /** Deal Details overview format: "26 Aug, 2026" */
  function dateLong(iso) { const p = parseISO(iso); return p ? `${p.d} ${MONTHS[p.m]}, ${p.y}` : ""; }
  /** Inbox row format: "28 Aug 2026" */
  function dateShort(iso) { const p = parseISO(iso); return p ? `${p.d} ${MONTHS[p.m]} ${p.y}` : ""; }

  // ---------- Units: canonical values are stored in sqm and per-year ----------
  function areaToDisplay(sqm, unit) { return sqm == null ? null : unit === "sqf" ? sqm * SQF_PER_SQM : sqm; }
  function areaFromDisplay(v, unit) { return v == null || Number.isNaN(v) ? v : unit === "sqf" ? v / SQF_PER_SQM : v; }
  function periodToDisplay(yearly, period) { return yearly == null ? null : period === "monthly" ? yearly / 12 : yearly; }
  function periodFromDisplay(v, period) { return v == null || Number.isNaN(v) ? v : period === "monthly" ? v * 12 : v; }
  function areaUnitLabel(unit) { return unit === "sqf" ? "sqf" : "sqm"; }
  function periodLabel(period) { return period === "monthly" ? "/ mo" : "/ yr"; }

  // ---------- Derived metrics ----------
  /** Rent per area unit per year. Default per sqm; per sqf when the SQF toggle is on. */
  function rentPerArea(d, unit) {
    if (!(d.rent_yearly > 0) || !(d.area_sqm > 0)) return null;
    const area = unit === "sqf" ? d.area_sqm * SQF_PER_SQM : d.area_sqm;
    return d.rent_yearly / area;
  }
  /** NIY = yearly rent ÷ price × 100 */
  function niyCalculated(d) {
    if (!(d.rent_yearly > 0) || !(d.price > 0)) return null;
    return round((d.rent_yearly / d.price) * 100, 2);
  }

  GC.fmt = {
    SQF_PER_SQM, parseNum, round, num, money, moneyShort, currencySymbol, dateLong, dateShort,
    areaToDisplay, areaFromDisplay, periodToDisplay, periodFromDisplay, areaUnitLabel, periodLabel,
    rentPerArea, niyCalculated,
  };

  GC.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  };
  /*
   * Repair two export bugs in the DS icon catalog (fix upstream, then delete this shim):
   *  - "setting", "contact": `calc(50%-0.5px)` without spaces is invalid CSS → glyph drifts up.
   *  - "arrow-right": a JSX leftover `style={{ containerType: "size" }}` → glyph renders empty,
   *    and the exported path is the left arrow (the flip was lost).
   */
  if (window.DS_ICONS && !window.DS_ICONS.__repaired) {
    const rawGet = window.DS_ICONS.get;
    window.DS_ICONS.get = function (name) {
      let svg = rawGet(name);
      // "arrow-right" also lost its flip on export: its path is the left arrow.
      if (name === "arrow-right") svg = svg.replace('<div style="height:100cqh;width:100cqw">', '<div style="height:100cqh;width:100cqw;transform:scaleX(-1)">');
      return svg
        .replace(/calc\(([^)]*?[0-9%])([-+])([0-9])/g, "calc($1 $2 $3")
        .replace(/"\s+style=\{\{\s*containerType:\s*"size"\s*\}\}/g, ';container-type:size"');
    };
    window.DS_ICONS.__repaired = true;
  }

  GC.icon = function (name, extraClass) {
    const html = window.DS_ICONS ? window.DS_ICONS.get(name) : "";
    return `<span class="ico${extraClass ? " " + extraClass : ""}" aria-hidden="true">${html}</span>`;
  };

  // ---------- Industry icons (Figma 16338:69252) ----------
  // ds:provisional — the DS icon set has no property-type glyphs yet, so these are drawn here
  // (24-grid, 1.5 stroke, currentColor) to match the Figma "Truck Delivery / Office Building / Apartment / Database" set.
  const IND_PATHS = {
    truck: '<circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-4M2 5h11v12m-4 0h6m4 0h2v-6h-8m0-5h5l3 5"/><path d="M3 9h4"/>',
    office: '<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>',
    apartment: '<path d="M3 21h18"/><path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M10 21v-4h4v4"/><path d="M9.5 7h1M13.5 7h1M9.5 10.5h1M13.5 10.5h1M9.5 14h1M13.5 14h1"/>',
    database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6a8 3 0 0 0 16 0V6"/><path d="M4 12v6a8 3 0 0 0 16 0v-6"/>',
    store: '<path d="M3 21h18"/><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4"/><path d="M5 21V10.85M19 21V10.85"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>',
    factory: '<path d="M3 21h18"/><path d="M5 21V9l5 4V9l5 4h4"/><path d="M19 21v-8l-1.44-9.57a.5.5 0 0 0-.5-.43h-1.14a.5.5 0 0 0-.5.42L14 12"/><path d="M9 17h1M14 17h1"/>',
    home: '<path d="M5 12H3l9-9 9 9h-2"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/>',
    buildings: '<path d="M4 21V6c0-1 1-2 2-2h5c1 0 2 1 2 2v15"/><path d="M16 8h2c1 0 2 1 2 2v11"/><path d="M3 21h18"/><path d="M7 8v.01M10 8v.01M7 12v.01M10 12v.01M7 16v.01M10 16v.01M17 12v.01M17 16v.01"/>',
  };
  GC.industryIcon = function (id, extraClass) {
    const ind = (GC.MOCK && GC.MOCK.industries.find((x) => x.id === id)) || { icon: "buildings" };
    const body = IND_PATHS[ind.icon] || IND_PATHS.buildings;
    return `<span class="ico ico--ind${extraClass ? " " + extraClass : ""}" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg></span>`;
  };

  // ---------- Deal stages (Figma 16338:69306) ----------
  // Progress pie: an empty ring for Received, filled by sixths up to a solid disc for CL.
  GC.STAGE_ORDER = ["Received", "SCR", "QUAL", "LOI", "DD", "SPA", "Completed"];
  GC.stageLabel = (id) => (id === "Completed" ? "CL" : id);
  GC.stageIcon = function (stage) {
    const i = Math.max(0, GC.STAGE_ORDER.indexOf(stage)), f = i / 6;
    const r = 5, cx = 8, cy = 8;
    let fill = "";
    if (f >= 1) fill = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor"/>`;
    else if (f > 0) {
      const a = f * 2 * Math.PI, x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
      fill = `<path d="M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z" fill="currentColor"/>`;
    }
    return `<span class="ico ico--stage" aria-hidden="true"><svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.2"/>${fill}</svg></span>`;
  };

  // ---------- Deal status (Figma 16338:69273) and outcomes (16338:69754) ----------
  GC.STATUSES = { new: "New", live: "Live", tracking: "Tracking", dead: "Dead" };
  GC.OUTCOMES = ["Lost", "Passed", "Withdrawn", "Cancelled"];
  GC.statusChip = function (d) {
    const s = d.status || "new";
    const tip = s === "dead" && d.outcome ? ` title="Dead · ${GC.esc(d.outcome)}"` : s === "tracking" ? ' title="On hold"' : "";
    return `<span class="status-pill" data-status="${s}" data-ds-provisional="chip"${tip}>${GC.STATUSES[s] || s}</span>`;
  };
})();
