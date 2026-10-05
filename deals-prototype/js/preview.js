/* Preview step — read-only summary mirroring the Deal Details page, plus AI generation flags. */
window.GC = window.GC || {};

(function () {
  const esc = GC.esc;
  const fmt = () => GC.fmt;
  let coverIdx = 0;

  function emptyRow(label) {
    return `<div class="ov-row"><span class="ov-row__label t-label">${esc(label)}</span><span class="ov-row__value t-value is-empty">—</span></div>`;
  }
  function row(label, value, rawHtml) {
    if (value == null || value === "" || (typeof value === "number" && Number.isNaN(value))) return emptyRow(label);
    return `<div class="ov-row"><span class="ov-row__label t-label">${esc(label)}</span><span class="ov-row__value t-value">${rawHtml ? value : esc(value)}</span></div>`;
  }
  function join(a, b) { return [a, b].filter(Boolean).join(" · "); }

  function numVal(id) {
    const s = GC.state, f = GC.fieldDef(id), v = s.data[id];
    if (v == null || Number.isNaN(v)) return null;
    const cur = s.units.currency;
    switch (f.kind) {
      case "area": return fmt().num(fmt().areaToDisplay(v, s.units.area), 0) + " " + fmt().areaUnitLabel(s.units.area);
      case "money": return fmt().money(v, cur);
      case "moneyPeriod": return fmt().money(fmt().periodToDisplay(v, s.units.period), cur) + " " + fmt().periodLabel(s.units.period);
      case "percent": return fmt().num(v, 2) + (f.suffix || "%");
      case "years": return fmt().num(v, 1) + " years";
      case "year": return String(v);
      default: return fmt().num(v, 0) + (f.suffix ? " " + f.suffix : "");
    }
  }

  function editBtn(step, label) {
    return `<button type="button" class="ds-btn" data-type="ghost" data-size="sm" data-edit="${step}" aria-label="Edit ${esc(label)}">${GC.icon("edit", "ds-btn__icon")}<span class="ds-btn__label">Edit</span></button>`;
  }
  function heading(title, step, iconName) {
    return `<div class="section-heading" data-ds-provisional="section-heading">
      <h4 class="section-heading__title t-section-title">${iconName ? GC.icon(iconName) : ""}${esc(title)}</h4>
      ${step != null ? editBtn(step, title) : ""}</div>`;
  }

  function stageBar(stage) {
    const main = GC.MOCK.stages.filter((x) => x !== "Other");
    const curIdx = main.indexOf(stage);
    const items = main.map((st, i) => {
      const state = curIdx < 0 ? "upcoming" : i < curIdx ? "done" : i === curIdx ? "current" : "upcoming";
      const icon = state === "done" ? GC.icon("circle-check") : state === "current" ? GC.icon("circle-dashed") : "";
      return `<li><span class="prov-progress__item is-static" data-state="${state}">${icon}<span>${esc(st)}</span></span></li>`;
    }).join("");
    const other = `<li class="is-other"><span class="prov-progress__item is-static" data-state="${stage === "Other" ? "current" : "upcoming"}">Other</span></li>`;
    return `<ol class="prov-progress" data-ds-provisional="stepper" aria-label="Deal stage: ${esc(stage)}">${items}${other}</ol>`;
  }

  function metric(label, value, unit) {
    return `<div class="metric"><span class="t-label">${esc(label)}</span>
      <span class="metric__value">${value == null ? `<span class="t-title is-empty">—</span>` : `<span class="t-title">${esc(value)}</span>`}${unit && value != null ? `<span class="metric__unit">${esc(unit)}</span>` : ""}</span></div>`;
  }

  function metricsGrid() {
    const s = GC.state, d = s.data, u = s.units, f = fmt();
    const psm = f.rentPerArea(d, u.area);
    return `<div class="metrics" data-ds-provisional="key-metrics">
      ${metric("Area", d.area_sqm == null ? null : f.num(f.areaToDisplay(d.area_sqm, u.area), 0), f.areaUnitLabel(u.area))}
      ${metric("Price", d.price == null ? null : f.moneyShort(d.price, u.currency))}
      ${metric("Occupancy", d.occupancy == null ? null : f.num(d.occupancy, 1), "%")}
      ${metric("Rent", d.rent_yearly == null ? null : f.money(f.periodToDisplay(d.rent_yearly, u.period), u.currency), u.period === "monthly" ? "monthly" : "")}
      ${metric(u.area === "sqf" ? "Rent/psf" : "Rent/psm", psm == null ? null : f.currencySymbol(u.currency) + f.num(psm, 1))}
      ${metric("NIY", d.niy == null ? null : f.num(d.niy, 2), "%")}
    </div>`;
  }

  function cover() {
    const ims = GC.state.images.filter((im) => im.status === "done");
    if (!ims.length) {
      return `<div class="pv-cover"><div class="pv-cover__empty">${GC.icon("building")}<span>No photos added</span></div></div>`;
    }
    coverIdx = Math.min(coverIdx, ims.length - 1);
    const im = ims[coverIdx];
    return `<div class="pv-cover">
      <img src="${im.src}" alt="${esc(im.name)}${coverIdx === 0 ? " (cover)" : ""}">
      <span class="pv-cover__counter">${coverIdx + 1} / ${ims.length}</span>
      ${ims.length > 1 ? `<div class="pv-cover__nav">
        <button type="button" class="ds-btn is-icon-only" data-type="secondary" data-size="sm" data-cover="-1" aria-label="Previous photo"><span class="ds-btn__icon">${DS_ICONS.get("chevron-left")}</span></button>
        <button type="button" class="ds-btn is-icon-only" data-type="secondary" data-size="sm" data-cover="1" aria-label="Next photo"><span class="ds-btn__icon">${DS_ICONS.get("chevron-right")}</span></button>
      </div>` : ""}
    </div>`;
  }

  function teamValue() {
    const team = GC.state.data.team.map((id) => GC.MOCK.users.find((u) => u.id === id)).filter(Boolean);
    if (!team.length) return null;
    const names = team.slice(0, 2).map((u) => esc(u.name)).join(", ") + (team.length > 2 ? `, ${team.length - 2}+` : "");
    const avatars = `<span class="avatar-stack" aria-hidden="true">${team.slice(0, 3).map((u) => `<span class="ds-avatar" data-size="md">${u.initials}</span>`).join("")}</span>`;
    return `${names}${avatars}`;
  }

  function aiItem(key, title, desc) {
    const on = GC.state.ai[key];
    return `<div class="ai-item">
      <div class="ai-item__text"><span class="ai-item__title" id="ai-${key}-l">${esc(title)}</span><span class="t-label" id="ai-${key}-d">${esc(desc)}</span></div>
      <label class="ds-control ds-switch"><input type="checkbox" role="switch" data-ai="${key}" ${on ? "checked" : ""} aria-labelledby="ai-${key}-l" aria-describedby="ai-${key}-d">
        <span class="ds-switch__track"><span class="ds-switch__thumb"></span></span></label>
    </div>`;
  }

  /** Mirrors the Deal Details "Asset" table: one row per asset. */
  function assetsTable() {
    const s = GC.state;
    const cell = (v) => (v == null || v === "" ? `<td class="is-empty">—</td>` : `<td>${esc(v)}</td>`);
    const rows = s.assets.map((aid, i) => {
      const k = (f) => GC.assetKey(aid, f);
      const built = numVal(k("year_built")), ren = numVal(k("year_renovated"));
      return `<tr>
        <td class="num">${i + 1}</td>
        ${cell((s.data[k("address")] || "").trim())}
        <td>${s.data[k("type")] ? `<span class="industry-chip" data-ds-provisional="chip">${esc(s.data[k("type")])}</span>` : "—"}</td>
        ${cell(numVal(k("gla_sqm")))}${cell(numVal(k("nla_sqm")))}${cell(numVal(k("land_sqm")))}
        ${cell(built || ren ? [built || "—", ren].filter(Boolean).join(" / ") : null)}
        ${cell(numVal(k("floors")))}${cell(numVal(k("units_count")))}${cell(numVal(k("parking")))}
        ${cell(s.data[k("condition")])}
      </tr>`;
    }).join("");
    return `<div class="pv-table-wrap" data-ds-provisional="table"><table class="pv-table">
      <thead><tr><th scope="col">#</th><th scope="col">Address</th><th scope="col">Asset type</th><th scope="col">GLA</th><th scope="col">NLA</th><th scope="col">Land area</th>
        <th scope="col">Year built / renovated</th><th scope="col">Floors</th><th scope="col">Units</th><th scope="col">Parking</th><th scope="col">Condition</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  function html() {
    const s = GC.state, d = s.data, f = fmt();
    const name = d.deal_name.trim();
    const industryChip = d.industry ? `<span class="industry-chip industry-chip--header" data-industry="${esc(d.industry)}" data-ds-provisional="chip"><span class="dot" aria-hidden="true"></span>${esc(d.industry)}</span>` : "";
    const n = s.assets.length;
    const assets = `${n} asset${n === 1 ? "" : "s"}`;
    return `<div class="pv">
      <div class="pv-head">
        <div class="pv-head__title">
          <h3 class="t-page-title${name ? "" : " is-placeholder"}">${esc(name || "Untitled deal")}</h3>
          ${industryChip}
          <span class="stage-chip stage-chip--static" data-stage="${esc(d.stage)}" data-ds-provisional="chip">${esc(d.stage)}</span>
        </div>
        <p class="t-muted pv-head__sub">${esc([d.location || "No location", assets].filter(Boolean).join(", "))}</p>
      </div>

      ${heading("Key Info", 0)}
      <div class="pv-row">
        ${cover()}
        <div class="pv-stack">${stageBar(d.stage)}${metricsGrid()}</div>
      </div>

      <div class="pv-row">
        <div class="pv-card">
          ${heading("Overview", 1)}
          <div class="ov-rows">
            ${row("Date received", f.dateLong(d.date_received))}
            ${row("Team", teamValue(), true)}
            ${row("Fund", d.fund)}
            ${row("Next deadline", join(d.deadline_type, f.dateLong(d.deadline_date)))}
            ${row("Broker", join(d.broker_company.trim(), d.broker_contact.trim()))}
            ${row("Deal Source", join(d.market_type, d.process_type))}
          </div>
        </div>
        <div class="pv-card">
          ${heading("AI generation", null, "ai")}
          <div class="ai-list">
            ${aiItem("summary", "AI Summary", "Investment summary with positive and negative highlight tags.")}
            ${aiItem("strengths", "Key Strengths", "The deal’s main highlights, ranked.")}
            ${aiItem("risks", "Investment Risks", "Risks with severity, drawn from the deal data and sources.")}
          </div>
          <p class="ai-note">Selected sections are generated by the AI Assistant once it’s available. You can change this later on the deal page.</p>
        </div>
      </div>

      <div class="pv-card">
        ${heading("Assets", 2)}
        ${assetsTable()}
      </div>
      <div class="pv-card">
        ${heading("Financial", 3)}
        <div class="ov-cols">
          <p class="ov-subhead">Income &amp; costs</p>
          ${["noi_yearly", "opex_yearly", "erv_yearly", "debt_service_yearly", "capex", "purchaser_costs", "wault"].map((id) => row(GC.FIELDS[id].label, numVal(id))).join("")}
          <p class="ov-subhead">Assumption</p>
          ${["exit_yield", "rent_growth", "hold_period", "ltv", "cost_of_debt"].map((id) => row(GC.FIELDS[id].label, numVal(id))).join("")}
        </div>
      </div>
    </div>`;
  }

  function bind(body, opts) {
    body.addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit]");
      if (edit) { opts.goTo(+edit.dataset.edit); return; }
      const nav = e.target.closest("[data-cover]");
      if (nav) {
        const n = GC.state.images.filter((im) => im.status === "done").length;
        coverIdx = (coverIdx + +nav.dataset.cover + n) % n;
        const wrap = body.querySelector(".pv-cover");
        wrap.outerHTML = cover();
        const again = body.querySelector(`[data-cover="${nav.dataset.cover}"]`);
        if (again) again.focus();
      }
    });
    body.addEventListener("change", (e) => {
      const t = e.target.closest("[data-ai]");
      if (t) GC.state.ai[t.dataset.ai] = t.checked;
    });
  }

  /** Deal record handed to the inbox. AI flags are stored, nothing is generated. */
  GC.buildDeal = function (s) {
    const d = s.data;
    const team = d.team.map((id) => GC.MOCK.users.find((u) => u.id === id)).filter(Boolean);
    const images = s.images.filter((im) => im.status === "done");
    return {
      id: "new-" + Date.now().toString(36),
      name: d.deal_name.trim() || "Untitled deal",
      location: d.location.trim(),
      assets: s.assets.length,
      industry: d.industry || null,
      status: { label: "New", tone: "info" },
      owner: team[0] ? team[0].initials : null,
      stage: d.stage,
      price: d.price,
      currency: s.units.currency,
      dateReceived: d.date_received,
      image: images[0] ? images[0].data || images[0].src : null,
      areaSqm: d.area_sqm,
      rentYearly: d.rent_yearly,
      rentPsm: GC.fmt.rentPerArea(d, "sqm"),
      wault: d.wault,
      occupancy: d.occupancy,
      dealSource: d.process_type || null,
      isNew: true,
      record: {
        units: Object.assign({}, s.units),
        data: JSON.parse(JSON.stringify(d)),
        assets: s.assets.map((aid) => {
          const o = {};
          Object.keys(d).forEach((key) => { const [a, base] = GC.splitKey(key); if (a === aid) o[base] = d[key]; });
          return o;
        }),
        photos: images.map((im) => im.name),
        ai: { summary: s.ai.summary, keyStrengths: s.ai.strengths, investmentRisks: s.ai.risks },
      },
    };
  };

  GC.preview = { html: () => { return html(); }, bind };
})();
