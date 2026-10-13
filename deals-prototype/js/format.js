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
  // ds:provisional — the DS icon set has no property-type glyphs. Truck / Office / Apartment / Database are the
  // designer's Figma exports (16-grid, filled, recoloured to currentColor); the rest are drawn to the same grid until exported.
  const IND_FILL = {
    truck: "M12.718 6.18333C12.5013 5.78333 12.118 5.53333 11.718 5.53333H10.0013V11.3H10.2846C10.518 10.5333 11.2013 10 12.0346 10C12.868 10 13.5513 10.5333 13.7846 11.3H14.1013V8.63333L12.718 6.18333ZM4.16797 13.6667C3.38464 13.6667 2.71797 13.1833 2.4513 12.5C1.4513 12.4833 0.667969 11.6833 0.667969 10.6667V3H10.0013V4.33333H11.718C12.5846 4.33333 13.3346 4.78333 13.7346 5.48333L15.3346 8.3V12.5H13.7513C13.4846 13.1833 12.818 13.6667 12.0346 13.6667C11.2513 13.6667 10.5846 13.1833 10.318 12.5H5.88463C5.61797 13.1833 4.9513 13.6667 4.16797 13.6667ZM4.16797 12.6167C4.6013 12.6167 4.93463 12.2667 4.93463 11.8333C4.93463 11.4 4.6013 11.05 4.16797 11.05C3.73464 11.05 3.4013 11.4 3.4013 11.8333C3.4013 12.2667 3.73464 12.6167 4.16797 12.6167ZM12.0346 12.6167C12.468 12.6167 12.8013 12.2667 12.8013 11.8333C12.8013 11.4 12.468 11.05 12.0346 11.05C11.6013 11.05 11.268 11.4 11.268 11.8333C11.268 12.2667 11.6013 12.6167 12.0346 12.6167ZM1.9013 10.6667C1.9013 10.9833 2.11797 11.25 2.41797 11.3C2.6513 10.5333 3.33464 10 4.16797 10C5.0013 10 5.68464 10.5333 5.91797 11.3H8.76798V4.2H1.9013V10.6667Z",
    office: "M1.33398 14.0007V1.33398H10.0007V5.33398H14.6673V14.0007H1.33398ZM4.00065 10.534V9.33398H7.33399V10.534H4.00065ZM2.56732 12.8007H8.76732V2.53398H2.56732V12.8007ZM4.00065 7.86732V6.66732H7.33399V7.86732H4.00065ZM10.0007 12.8007H13.434V6.53398H10.0007V12.8007ZM4.00065 5.20065V4.00065H7.33399V5.20065H4.00065Z",
    apartment: "M13.3327 14.6673H8.76602V11.8673H7.23268V14.6673H2.66602V1.33398H13.3327V14.6673ZM5.99935 13.4673V10.6673H9.99935V13.4673H12.0993V2.53398H3.89935V13.4673H5.99935ZM7.33268 5.83398H5.66602V4.16732H7.33268V5.83398ZM10.3327 5.83398H8.66602V4.16732H10.3327V5.83398ZM7.33268 9.00065H5.66602V7.33398H7.33268V9.00065ZM10.3327 9.00065H8.66602V7.33398H10.3327V9.00065Z",
    database: "M8.00001 14.6673C4.48333 14.6673 2 13.484 2 11.8173V4.16732C2 2.45065 4.48333 1.33398 8.00001 1.33398C11.5167 1.33398 14 2.45065 14 4.16732V11.8173C14 13.484 11.5167 14.6673 8.00001 14.6673ZM8.00001 10.834C5.91667 10.834 4.21667 10.4173 3.2 9.73398V11.8173C3.2 12.5007 4.95 13.5007 8.00001 13.5007C11.05 13.5007 12.8 12.5007 12.8 11.8173V9.73398C11.7833 10.4173 10.0833 10.834 8.00001 10.834ZM8.00001 7.01732C5.95 7.01732 4.26667 6.61732 3.2 5.95065V7.98398C3.2 8.66732 4.95 9.66732 8.00001 9.66732C11.05 9.66732 12.8 8.66732 12.8 7.98398V5.95065C11.7333 6.61732 10.05 7.01732 8.00001 7.01732ZM8.00001 5.85065C11.05 5.85065 12.8 4.85065 12.8 4.16732C12.8 3.45065 11.05 2.50065 8.00001 2.50065C4.95 2.50065 3.2 3.45065 3.2 4.16732C3.2 4.85065 4.95 5.85065 8.00001 5.85065Z",
  };
  const IND_STROKE = {
    store: '<path d="M2 14h12M2.7 5.3v.7a1.8 1.8 0 0 0 3.6 0m0 0a1.8 1.8 0 0 0 3.4 0m0 0a1.8 1.8 0 0 0 3.6 0v-.7H2.7l1.3-3h8l1.3 3"/><path d="M3.3 14V8M12.7 14V8M6.3 14v-3h3.4v3"/>',
    factory: '<path d="M1.5 14h13M2.7 14V6.5l3.3 2.5V6.5l3.3 2.5h3.6V14M12.9 9V2.5h-1.6L10.7 9"/><path d="M5.3 11.5h1M9 11.5h1"/>',
    home: '<path d="M3.3 8H2l6-6 6 6h-1.3"/><path d="M3.3 8v5.3c0 .4.3.7.7.7h8c.4 0 .7-.3.7-.7V8M6.3 14v-3.7h3.4V14"/>',
    buildings: '<path d="M2.7 14V3.3c0-.7.6-1.3 1.3-1.3h3.3c.7 0 1.3.6 1.3 1.3V14M10.7 5.3H12c.7 0 1.3.6 1.3 1.3V14M2 14h12"/><path d="M4.7 5.3h1M4.7 8h1M4.7 10.7h1M11 8.7h.7M11 11h.7"/>',
  };
  GC.industryIcon = function (id, extraClass) {
    const ind = (GC.MOCK && GC.MOCK.industries.find((x) => x.id === id)) || { icon: "buildings" };
    const body = IND_FILL[ind.icon] ? `<path d="${IND_FILL[ind.icon]}" fill="currentColor"/>`
      : `<g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${IND_STROKE[ind.icon] || IND_STROKE.buildings}</g>`;
    return `<span class="ico ico--ind${extraClass ? " " + extraClass : ""}" aria-hidden="true"><svg viewBox="0 0 16 16" width="16" height="16">${body}</svg></span>`;
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
  // Reasons per outcome (Figma 16339:73985 dropdown variants). "Other" asks for a short description.
  GC.OUTCOME_REASONS = {
    Lost: ["Below return hurdle", "Wrong sector or mandate", "Location out of scope", "Lot size too small", "Asset quality or spec", "Vendor expectation too high"],
    Passed: ["Outbid on price", "Lost on terms", "Not shortlisted"],
    Withdrawn: ["Seller pulled the asset", "Process cancelled"],
    Cancelled: ["Failed technical DD", "Failed legal DD", "Financing withdrawn", "Mandate changed"],
  };
  GC.outcomeReason = (d) => (d.outcomeReason === "Other" ? d.outcomeNote || "Other" : d.outcomeReason || "");
  GC.statusChip = function (d) {
    const s = d.status || "new";
    const why = d.outcomeReason ? ` — ${d.outcomeReason === "Other" && d.outcomeNote ? d.outcomeNote : d.outcomeReason}` : "";
    const tip = s === "dead" && d.outcome ? ` title="Dead · ${GC.esc(d.outcome + why)}"` : s === "tracking" ? ' title="On hold"' : "";
    // A closed deal shows its outcome (Lost / Passed / …) instead of the generic "Dead".
    const label = s === "dead" && d.outcome ? d.outcome : GC.STATUSES[s] || s;
    return `<span class="status-pill" data-status="${s}" data-ds-provisional="chip"${tip}>${GC.esc(label)}</span>`;
  };
})();
