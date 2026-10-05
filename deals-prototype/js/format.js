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
})();
