/* Add New Deal — modal shell, stepper, input steps, close/draft logic. */
window.GC = window.GC || {};

(function () {
  const M = GC.MOCK;
  const esc = GC.esc;
  const F = () => GC.FIELDS;
  const def = (id) => GC.fieldDef(id);
  const S = () => GC.state;

  let overlay = null, dialog = null, releaseTrap = null, trigger = null;

  // ============================================================
  //  Field helpers
  // ============================================================
  function affixes(f) {
    const u = S().units;
    const sym = GC.fmt.currencySymbol(u.currency);
    switch (f.kind) {
      case "area": return { suffix: GC.fmt.areaUnitLabel(u.area) };
      case "money": return { prefix: sym };
      case "moneyPeriod": return { prefix: sym, suffix: GC.fmt.periodLabel(u.period) };
      case "percent": return { suffix: f.suffix || "%" };
      case "years": return { suffix: "years" };
      default: return { suffix: f.suffix };
    }
  }

  function toDisplay(id, v) {
    const f = def(id), u = S().units;
    if (v == null || Number.isNaN(v)) return v;
    if (f.kind === "area") return GC.fmt.areaToDisplay(v, u.area);
    if (f.kind === "moneyPeriod") return GC.fmt.periodToDisplay(v, u.period);
    return v;
  }
  function fromDisplay(id, v) {
    const f = def(id), u = S().units;
    if (f.kind === "area") return GC.fmt.areaFromDisplay(v, u.area);
    if (f.kind === "moneyPeriod") return GC.fmt.periodFromDisplay(v, u.period);
    return v;
  }
  function formatDisplay(id, v) {
    if (v == null || Number.isNaN(v)) return "";
    if (def(id).kind === "year") return String(v);
    return GC.fmt.num(v, 2);
  }
  function displayValue(id) {
    const s = S();
    if (s.raw[id] != null) return s.raw[id];
    return formatDisplay(id, toDisplay(id, s.data[id]));
  }

  function shownError(id) {
    const s = S(), f = def(id);
    const step = f ? f.step : (GC.splitKey(id)[0] || id === "deal_name") ? 0 : null; // name + asset type/address live on Key Info
    if (step == null) return "";
    if (!(s.touched[id] || s.attempted[step])) return "";
    return GC.validateField(id);
  }

  function affixHtml(text) { return text ? `<span class="prov-affix" data-ds-provisional="field-affix" aria-hidden="true">${esc(text)}</span>` : ""; }
  function req(f) { return f && f.required ? ` <span class="ds-field__req" aria-hidden="true">*</span>` : ""; }

  function numField(id, o) {
    o = o || {};
    const f = def(id);
    const err = shownError(id);
    const a = affixes(f);
    const helper = err || o.helper || "";
    const label = o.label || f.label;
    const labelHtml = o.hideLabel ? "" : o.labelRow || `<label class="ds-field__label" for="f-${id}">${esc(label)}${req(f)}</label>`;
    return `<div class="ds-field${o.cls ? " " + o.cls : ""}" data-size="medium" data-state="${err ? "error" : "default"}" data-wrap="${id}">
      ${labelHtml}
      <div class="ds-field__box">${affixHtml(a.prefix)}
        <input class="ds-field__input" id="f-${id}" data-field="${id}" type="text" inputmode="${f.kind === "int" || f.kind === "year" ? "numeric" : "decimal"}"
          autocomplete="off" value="${esc(displayValue(id))}" placeholder="${esc(o.placeholder || "")}"
          ${o.hideLabel ? `aria-label="${esc(label)}"` : ""} ${f.required ? 'aria-required="true"' : ""} aria-invalid="${err ? "true" : "false"}" aria-describedby="h-${id}">
        ${affixHtml(a.suffix)}</div>
      <div class="ds-field__helper" id="h-${id}"${!err && !helper && !o.helperHtml ? " hidden" : ""}>${o.helperHtml && !err ? o.helperHtml : esc(helper)}</div>
    </div>`;
  }

  function textField(id, label, o) {
    o = o || {};
    const v = S().data[id] || "";
    return `<div class="ds-field" data-size="medium" data-state="default">
      ${o.hideLabel ? "" : `<label class="ds-field__label" for="f-${id}">${esc(label)}</label>`}
      <div class="ds-field__box">${o.icon ? `<span class="ds-field__icon">${DS_ICONS.get(o.icon)}</span>` : ""}
        <input class="ds-field__input" id="f-${id}" data-field="${id}" type="${o.type || "text"}" autocomplete="off" value="${esc(v)}"
          placeholder="${esc(o.placeholder || "")}" ${o.hideLabel ? `aria-label="${esc(label)}"` : ""}></div>
    </div>`;
  }

  function selectField(id, label, options, o) {
    o = o || {};
    const v = S().data[id] || (o.value != null ? o.value : "");
    return `<div class="ds-field" data-size="${o.size || "medium"}" data-state="default">
      ${o.hideLabel ? "" : `<label class="ds-field__label" for="f-${id}">${esc(label)}</label>`}
      <div class="ds-field__box prov-select-wrap" data-ds-provisional="select">
        <select class="ds-field__input prov-select" id="f-${id}" data-field="${id}" ${o.hideLabel ? `aria-label="${esc(label)}"` : ""}>
          ${o.placeholder != null ? `<option value="">${esc(o.placeholder)}</option>` : ""}
          ${options.map((opt) => { const val = typeof opt === "string" ? opt : opt.value; const lab = typeof opt === "string" ? opt : opt.label;
            return `<option value="${esc(val)}" ${val === v ? "selected" : ""}>${esc(lab)}</option>`; }).join("")}
        </select>
        <span class="ds-field__icon">${DS_ICONS.get("chevron-down")}</span>
      </div>
    </div>`;
  }

  function segmented(label, unitKey, options) {
    const cur = S().units[unitKey];
    return `<div class="ds-segmented" role="group" aria-label="${esc(label)}">
      ${options.map((o) => `<button type="button" class="ds-segment" data-unit="${unitKey}" data-value="${o.value}" aria-pressed="${cur === o.value}">${esc(o.label)}</button>`).join("")}
    </div>`;
  }

  function sectionHeading(title, extra) {
    return `<div class="section-heading" data-ds-provisional="section-heading"><h3 class="section-heading__title t-title">${title}</h3>${extra || ""}</div>`;
  }

  // ============================================================
  //  Steps
  // ============================================================
  function draftBanner() {
    const s = S();
    if (!s.restoredFrom) return "";
    const d = new Date(s.restoredFrom);
    const when = isNaN(d) ? "" : `Saved ${GC.fmt.dateLong(d.toISOString().slice(0, 10))}, ${d.toTimeString().slice(0, 5)}.`;
    return `<div class="draft-banner" data-ds-provisional="banner" role="status">
      <span class="draft-banner__icon">${GC.icon("history")}</span>
      <div class="draft-banner__text"><p class="draft-banner__title">Draft restored</p><p class="draft-banner__sub">${esc(when)} Continue where you left off or start again.</p></div>
      <div class="draft-banner__actions">
        <button type="button" class="ds-btn" data-type="secondary" data-size="md" data-act="draft-continue">Continue</button>
        <button type="button" class="ds-btn" data-type="ghost" data-size="md" data-act="draft-delete">${GC.icon("bin", "ds-btn__icon")}<span class="ds-btn__label">Delete draft</span></button>
      </div>
    </div>`;
  }

  function unitsInline() {
    return `<div class="units-inline" role="group" aria-label="Units">
      ${segmented("Area unit", "area", [{ value: "sqm", label: "SQM" }, { value: "sqf", label: "SQF" }])}
      <div class="ds-field" data-size="small" data-state="default">
        <div class="ds-field__box prov-select-wrap" data-ds-provisional="select">
          <select class="ds-field__input prov-select" data-unit-select="currency" aria-label="Currency">
            ${M.currencies.map((c) => `<option value="${c.id}" ${S().units.currency === c.id ? "selected" : ""}>${c.id}</option>`).join("")}
          </select><span class="ds-field__icon">${DS_ICONS.get("chevron-down")}</span></div></div>
    </div>`;
  }

  /** Auto-filled value: looks like a field but is static — no focus, no hover. */
  function readonlyField(id, o) {
    const err = o.error || "";
    return `<div class="readonly-field" data-ds-provisional="readonly-field" data-wrap="${id}" data-state="${err ? "error" : "default"}">
      <div class="field-labelrow"><span class="ds-field__label" id="l-${id}">${esc(o.label)}${o.required ? ` <span class="ds-field__req" aria-hidden="true">*</span>` : ""}</span>
        <span class="auto-tag" data-ds-provisional="tag">auto</span></div>
      <div class="readonly-field__box">${affixHtml(o.prefix)}
        <output class="readonly-field__value" id="v-${id}" aria-labelledby="l-${id}" aria-describedby="h-${id}" data-empty="${o.value == null}">${o.value == null ? esc(o.empty || "—") : esc(o.value)}</output>
        ${affixHtml(o.suffix)}</div>
      <div class="ds-field__helper" id="h-${id}">${err ? esc(err) : o.helperHtml || esc(o.helper || "")}</div>
    </div>`;
  }

  function niyAutoHelper() {
    return `Rent ÷ Price × 100 <button type="button" class="ds-btn" data-type="ghost" data-size="sm" data-act="niy-override">${GC.icon("edit", "ds-btn__icon")}<span class="ds-btn__label">Override</span></button>`;
  }
  function niyManualHelper() {
    const calc = GC.fmt.niyCalculated(S().data);
    return `Calculated: ${calc == null ? "—" : GC.fmt.num(calc, 2) + "%"} <button type="button" class="ds-btn" data-type="ghost" data-size="sm" data-act="niy-reset">${GC.icon("refresh", "ds-btn__icon")}<span class="ds-btn__label">Reset to calculated</span></button>`;
  }

  function psmField() {
    const s = S();
    const psm = GC.fmt.rentPerArea(s.data, s.units.area);
    return readonlyField("rent_psm", {
      label: s.units.area === "sqf" ? "Rent/psf" : "Rent/psm",
      value: psm == null ? null : GC.fmt.num(psm, 2),
      prefix: GC.fmt.currencySymbol(s.units.currency), suffix: "/ " + GC.fmt.areaUnitLabel(s.units.area) + " / yr",
      helper: "Rent ÷ Area", empty: "Fills in from Rent and Area",
    });
  }

  function niyField() {
    const s = S();
    if (s.data.niy_manual) {
      const labelRow = `<div class="field-labelrow"><label class="ds-field__label" for="f-niy">NIY${req(F().niy)}</label>
        <span class="auto-tag" data-ds-provisional="tag" data-tone="manual">edited</span></div>`;
      return numField("niy", { labelRow, helperHtml: niyManualHelper(), placeholder: "0" });
    }
    return readonlyField("niy", {
      label: "NIY", required: true, suffix: "%",
      value: s.data.niy == null ? null : GC.fmt.num(s.data.niy, 2),
      helperHtml: niyAutoHelper(), empty: "Fills in from Rent and Price", error: shownError("niy"),
    });
  }

  function assetRow(aid, i, n) {
    const s = S();
    const typeId = GC.assetKey(aid, "type"), addrId = GC.assetKey(aid, "address");
    const tErr = shownError(typeId), aErr = shownError(addrId);
    const type = s.data[typeId] || "";
    return `<fieldset class="asset-row" data-asset="${aid}">
      <div class="asset-row__head">
        <legend class="t-value">Asset ${i + 1}</legend>
        ${n > 1 ? `<button type="button" class="ds-btn" data-type="ghost" data-size="sm" data-act="asset-remove" data-asset="${aid}" aria-label="Remove asset ${i + 1}">${GC.icon("bin", "ds-btn__icon")}<span class="ds-btn__label">Remove</span></button>` : ""}
      </div>
      <div class="asset-row__fields">
        <div class="ds-field" data-size="medium" data-state="${tErr ? "error" : "default"}" data-wrap="${typeId}">
          <label class="ds-field__label" for="f-${typeId}">Asset type <span class="ds-field__req" aria-hidden="true">*</span></label>
          <div class="ds-field__box prov-select-wrap" data-ds-provisional="select">
            <select class="ds-field__input prov-select" id="f-${typeId}" data-field="${typeId}" aria-required="true" aria-invalid="${!!tErr}" aria-describedby="h-${typeId}">
              <option value="">Select type</option>
              ${M.industries.map((ind) => `<option value="${ind.id}" ${type === ind.id ? "selected" : ""}>${esc(ind.id)}</option>`).join("")}
            </select><span class="ds-field__icon">${DS_ICONS.get("chevron-down")}</span>
          </div>
          <div class="ds-field__helper" id="h-${typeId}"${tErr ? "" : " hidden"}>${esc(tErr)}</div>
        </div>
        <div class="ds-field" data-size="medium" data-state="${aErr ? "error" : "default"}" data-wrap="${addrId}">
          <label class="ds-field__label" for="f-${addrId}">Address <span class="ds-field__req" aria-hidden="true">*</span></label>
          <div class="ds-field__box"><span class="ds-field__icon">${DS_ICONS.get("location")}</span>
            <input class="ds-field__input" id="f-${addrId}" data-field="${addrId}" type="text" autocomplete="off" value="${esc(s.data[addrId] || "")}"
              placeholder="Street, postcode, city" aria-required="true" aria-invalid="${!!aErr}" aria-describedby="h-${addrId}"></div>
          <div class="ds-field__helper" id="h-${addrId}"${aErr ? "" : " hidden"}>${esc(aErr)}</div>
        </div>
      </div>
    </fieldset>`;
  }

  function dealNameField() {
    const err = shownError("deal_name");
    return `<div class="ds-field" data-size="medium" data-state="${err ? "error" : "default"}" data-wrap="deal_name">
      <label class="ds-field__label" for="f-deal_name">Deal name <span class="ds-field__req" aria-hidden="true">*</span></label>
      <div class="ds-field__box"><input class="ds-field__input" id="f-deal_name" data-field="deal_name" type="text" autocomplete="off"
        value="${esc(S().data.deal_name)}" placeholder="e.g. TechForward Industries HQ" aria-required="true" aria-invalid="${!!err}" aria-describedby="h-deal_name"></div>
      <div class="ds-field__helper" id="h-deal_name"${err ? "" : " hidden"}>${esc(err)}</div>
    </div>`;
  }

  function stepKeyInfo() {
    const s = S();
    const n = s.assets.length;
    return `
      <section class="form-section">${dealNameField()}</section>
      <section class="form-section" aria-labelledby="photos-title"><div id="upload-root"></div></section>
      <section class="form-section" aria-labelledby="ki-title">
        <div class="section-heading" data-ds-provisional="section-heading">
          <h3 class="section-heading__title t-title" id="ki-title">Key metrics</h3>${unitsInline()}
        </div>
        <div class="form-grid">
          ${numField("area_sqm", { placeholder: "0" })}
          ${numField("price", { placeholder: "0" })}
          ${numField("occupancy", { placeholder: "0–100" })}
          ${numField("rent_yearly", { placeholder: "0" })}
          ${psmField()}
          ${niyField()}
        </div>
      </section>
      <section class="form-section" aria-labelledby="assets-title">
        <div class="section-heading" data-ds-provisional="section-heading">
          <h3 class="section-heading__title t-title" id="assets-title">Assets <span class="count" id="assets-count">(${n})</span></h3>
          <button type="button" class="ds-btn" data-type="secondary" data-size="sm" data-act="asset-add">${GC.icon("plus", "ds-btn__icon")}<span class="ds-btn__label">Add asset</span></button>
        </div>
        <p class="req-note">A deal can include several assets. Each one starts with its type and address.</p>
        <div class="asset-list">${s.assets.map((aid, i) => assetRow(aid, i, n)).join("")}</div>
      </section>`;
  }

  function locationCombo() {
    return `<div class="ds-field prov-combo" data-size="medium" data-state="default" data-ds-provisional="combobox" data-combo="location">
      <label class="ds-field__label" for="f-location" id="l-location">Location / Region</label>
      <div class="ds-field__box"><span class="ds-field__icon">${DS_ICONS.get("location")}</span>
        <input class="ds-field__input" id="f-location" data-field="location" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false"
          aria-controls="lb-location" autocomplete="off" placeholder="City, region or country" value="${esc(S().data.location)}"></div>
      <ul class="prov-listbox" id="lb-location" role="listbox" aria-labelledby="l-location" hidden></ul>
    </div>`;
  }

  function teamTokens() {
    return S().data.team.map((id) => {
      const u = M.users.find((x) => x.id === id);
      return u ? `<span class="team-token"><span class="ds-avatar" data-size="md">${u.initials}</span>${esc(u.name)}
        <button type="button" class="team-token__remove" data-act="team-remove" data-value="${u.id}" aria-label="Remove ${esc(u.name)}">${GC.icon("x-close")}</button></span>` : "";
    }).join("");
  }
  function teamCombo() {
    return `<div class="ds-field prov-combo span-all" data-size="medium" data-state="default" data-ds-provisional="combobox" data-combo="team">
      <label class="ds-field__label" for="f-team" id="l-team">Team</label>
      <div class="ds-field__box"><span class="team-tokens">${teamTokens()}</span>
        <input class="ds-field__input" id="f-team" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false"
          aria-controls="lb-team" autocomplete="off" placeholder="Add team members"></div>
      <ul class="prov-listbox" id="lb-team" role="listbox" aria-labelledby="l-team" aria-multiselectable="true" hidden></ul>
    </div>`;
  }

  function stepGeneral() {
    return `
      ${sectionHeading("Overview")}
      <div class="form-grid form-grid--2">
        ${locationCombo()}
        ${textField("date_received", "Date received", { type: "date" })}
        ${selectField("stage", "Deal stage", M.stages)}
        ${selectField("fund", "Fund", M.funds, { placeholder: "Select fund" })}
        ${teamCombo()}
        <fieldset class="field-group"><legend class="ds-field__label">Next deadline</legend>
          <div class="field-group__row">
            ${selectField("deadline_type", "Deadline type", M.deadlineTypes, { placeholder: "Type", hideLabel: true })}
            ${textField("deadline_date", "Deadline date", { type: "date", hideLabel: true })}
          </div></fieldset>
        <fieldset class="field-group"><legend class="ds-field__label">Broker</legend>
          <div class="field-group__row">
            ${textField("broker_company", "Broker company", { placeholder: "Company", hideLabel: true })}
            ${textField("broker_contact", "Broker contact", { placeholder: "Contact name", hideLabel: true })}
          </div></fieldset>
        <fieldset class="field-group"><legend class="ds-field__label">Deal Source</legend>
          <div class="field-group__row">
            ${selectField("market_type", "Market type", M.marketTypes, { placeholder: "Market", hideLabel: true })}
            ${selectField("process_type", "Process type", M.processTypes, { placeholder: "Process", hideLabel: true })}
          </div></fieldset>
      </div>`;
  }

  function pairGroup(legend, a, b) {
    return `<fieldset class="field-group"><legend class="ds-field__label">${esc(legend)}</legend>
      <div class="field-group__row">${numField(a, { hideLabel: true, placeholder: def(a).label })}${numField(b, { hideLabel: true, placeholder: def(b).label })}</div></fieldset>`;
  }

  function stepPhysical() {
    const s = S();
    return s.assets.map((aid, i) => {
      const k = (f) => GC.assetKey(aid, f);
      const type = s.data[k("type")], addr = (s.data[k("address")] || "").trim();
      return `<section class="form-section" aria-labelledby="ph-${aid}">
        <div class="section-heading" data-ds-provisional="section-heading">
          <h3 class="section-heading__title t-title" id="ph-${aid}">Asset ${i + 1}${type ? ` · ${esc(type)}` : ""}</h3>
          <span class="t-muted asset-addr">${esc(addr)}</span>
        </div>
        <div class="form-grid">
          ${pairGroup("GLA / NLA", k("gla_sqm"), k("nla_sqm"))}
          ${numField(k("land_sqm"))}
          ${pairGroup("Year built / renovated", k("year_built"), k("year_renovated"))}
          ${numField(k("floors"))}
          ${numField(k("units_count"))}
          ${numField(k("parking"))}
          ${selectField(k("condition"), "Condition", M.conditions, { placeholder: "Select condition" })}
        </div>
      </section>`;
    }).join("");
  }

  function stepFinancial() {
    return `
      <section class="form-section">
        ${sectionHeading("Income &amp; costs")}
        <div class="form-grid">
          ${numField("noi_yearly")}
          ${numField("opex_yearly")}
          ${numField("erv_yearly")}
          ${numField("debt_service_yearly")}
          ${numField("capex")}
          ${numField("purchaser_costs")}
          ${numField("wault")}
        </div>
      </section>
      <section class="form-section">
        ${sectionHeading("Assumption")}
        <div class="form-grid">
          ${numField("exit_yield")}
          ${numField("rent_growth")}
          ${numField("hold_period")}
          ${numField("ltv")}
          ${numField("cost_of_debt")}
        </div>
      </section>`;
  }

  // ============================================================
  //  Shell
  // ============================================================
  function stepperHtml() {
    const s = S();
    return `<ol class="prov-progress" data-ds-provisional="stepper">
      ${GC.STEPS.map((st, i) => {
        const reachable = GC.isReachable(i);
        const done = i !== s.step && s.visited[i] && reachable && GC.validateStep(i).valid && i < 4;
        const state = i === s.step ? "current" : done ? "done" : "upcoming";
        const locked = state === "upcoming" && !reachable;
        const icon = state === "done" ? GC.icon("circle-check") : state === "current" ? GC.icon("circle-dashed") : "";
        const sr = state === "done" ? " (completed)" : locked ? " (locked)" : "";
        return `<li><button type="button" class="prov-progress__item" data-step="${i}" data-state="${state}"
          ${state === "current" ? 'aria-current="step"' : ""} ${locked ? 'aria-disabled="true"' : ""}>${icon}<span>${esc(st.label)}</span><span class="sr-only">${sr}</span></button></li>`;
      }).join("")}
    </ol>`;
  }

  function footHtml() {
    const s = S();
    const last = s.step === GC.STEPS.length - 1;
    return `
      <button type="button" class="ds-btn" data-type="ghost" data-size="lg" data-act="save-draft">${GC.icon("bookmark", "ds-btn__icon")}<span class="ds-btn__label">Save as Draft</span></button>
      <div class="dm__foot-right">
        <button type="button" class="ds-btn" data-type="secondary" data-size="lg" data-act="back" ${s.step === 0 ? "disabled aria-disabled=\"true\"" : ""}>${GC.icon("arrow-left", "ds-btn__icon")}<span class="ds-btn__label">Back</span></button>
        ${last
          ? `<button type="button" class="ds-btn" data-type="primary" data-size="lg" data-act="add">${GC.icon("plus", "ds-btn__icon")}<span class="ds-btn__label">Add Deal</span></button>`
          : `<button type="button" class="ds-btn" data-type="primary" data-size="lg" data-act="next"><span class="ds-btn__label">Next</span>${GC.icon("arrow-right", "ds-btn__icon")}</button>`}
      </div>`;
  }

  function bodyHtml() {
    const s = S();
    const st = GC.STEPS[s.step];
    const heading = `<h3 class="sr-only" id="step-heading" tabindex="-1">Step ${s.step + 1} of ${GC.STEPS.length}: ${esc(st.label)}</h3>`;
    const content = [stepKeyInfo, stepGeneral, stepPhysical, stepFinancial, GC.preview.html][s.step]();
    return heading + draftBanner() + content;
  }

  function renderStepper() {
    const nav = dialog.querySelector(".dm__stepper");
    const current = nav.querySelectorAll(".prov-progress__item");
    if (!current.length) { nav.innerHTML = stepperHtml(); return; }
    // Patch the existing buttons in place: replacing them mid-click (blur → re-render) would swallow the click.
    const tpl = document.createElement("template");
    tpl.innerHTML = stepperHtml();
    tpl.content.querySelectorAll(".prov-progress__item").forEach((next, i) => {
      const btn = current[i];
      ["data-state", "aria-current", "aria-disabled"].forEach((a) => {
        if (next.hasAttribute(a)) btn.setAttribute(a, next.getAttribute(a)); else btn.removeAttribute(a);
      });
      if (btn.innerHTML !== next.innerHTML) btn.innerHTML = next.innerHTML;
    });
  }

  /** Keep the deal name pinned in the header once the user has moved past Key Info. */
  function renderDealName() {
    const el = dialog.querySelector("#dm-deal-name");
    const name = (S().data.deal_name || "").trim();
    el.hidden = !(S().step > 0 && name);
    el.textContent = name;
  }

  function renderStep(opts) {
    opts = opts || {};
    const s = S();
    const body = dialog.querySelector(".dm__body");
    dialog.dataset.wide = s.step === 4 ? "true" : "false";
    body.dataset.tone = s.step === 4 ? "grey" : "white";
    body.innerHTML = bodyHtml();
    dialog.querySelector(".dm__foot").innerHTML = footHtml();
    renderDealName();
    renderStepper();
    if (s.step === 0) GC.upload.mount(body.querySelector("#upload-root"), { onChange: onAnyChange });
    if (s.step === 4) GC.preview.bind(body, { goTo });
    if (opts.scrollTop !== false) body.scrollTop = 0;
    if (opts.focus !== false) body.querySelector("#step-heading").focus();
  }

  function focusFirstField() {
    const first = dialog.querySelector(".dm__body input[data-field]:not([readonly]), .dm__body select[data-field]");
    (first || dialog).focus();
  }

  function onAnyChange() {
    renderStepper();
  }

  // ============================================================
  //  Navigation
  // ============================================================
  function focusFirstError(step) {
    const errs = GC.validateStep(step).errors;
    const el = Object.keys(errs).map((id) => dialog.querySelector(`#f-${id}`)).find((x) => x && x.matches("input, select"));
    if (el) el.focus();
  }

  function goTo(i) {
    const s = S();
    if (i === s.step || i < 0 || i >= GC.STEPS.length) return;
    if (i > s.step) {
      // Every step before the target must be valid, starting with the current one.
      for (let k = s.step; k < i; k++) {
        if (!GC.validateStep(k).valid) {
          if (k === s.step) {
            s.attempted[k] = true;
            renderStep({ focus: false, scrollTop: false });
            focusFirstError(k);
          }
          return;
        }
      }
    }
    s.step = i;
    s.visited[i] = true;
    s.restoredFrom = null;
    renderStep();
  }

  // ============================================================
  //  Input handling
  // ============================================================
  /** Replace helper markup only when it changed — re-rendering mid-click would swallow the click. */
  function setHelperHtml(helper, html) {
    if (helper.dataset.html === html) return;
    helper.innerHTML = html;
    helper.dataset.html = html;
  }

  function setFieldErrorUI(id) {
    const wrap = dialog.querySelector(`[data-wrap="${id}"]`);
    if (!wrap) return;
    const err = shownError(id);
    wrap.dataset.state = err ? "error" : "default";
    const input = wrap.querySelector(".ds-field__input");
    if (input) input.setAttribute("aria-invalid", err ? "true" : "false");
    const helper = wrap.querySelector(".ds-field__helper");
    if (!helper) return;
    if (err) { helper.textContent = err; helper.dataset.html = ""; helper.hidden = false; }
    else if (id === "niy") { setHelperHtml(helper, S().data.niy_manual ? niyManualHelper() : niyAutoHelper()); helper.hidden = false; }
    else if (id === "rent_psm") { helper.textContent = "Rent ÷ Area"; }
    else { helper.textContent = ""; helper.hidden = true; }
  }

  function setOutput(id, value, empty) {
    const out = dialog.querySelector(`#v-${id}`);
    if (!out) return;
    out.textContent = value == null ? empty : value;
    out.dataset.empty = value == null ? "true" : "false";
  }

  /** Recalculate Rent/psm and (unless overridden) NIY after any Key Info change. */
  function recalc() {
    const s = S();
    if (!s.data.niy_manual) {
      s.data.niy = GC.fmt.niyCalculated(s.data);
      delete s.raw.niy;
      setOutput("niy", s.data.niy == null ? null : GC.fmt.num(s.data.niy, 2), "Fills in from Rent and Price");
      setFieldErrorUI("niy");
    } else {
      const wrap = dialog.querySelector('[data-wrap="niy"]');
      if (wrap && !shownError("niy")) setHelperHtml(wrap.querySelector(".ds-field__helper"), niyManualHelper());
    }
    const psm = GC.fmt.rentPerArea(s.data, s.units.area);
    setOutput("rent_psm", psm == null ? null : GC.fmt.num(psm, 2), "Fills in from Rent and Area");
  }

  function crossCheck(id) {
    const [aid, base] = GC.splitKey(id);
    if (aid && base === "year_built") {
      const ren = GC.assetKey(aid, "year_renovated");
      if (S().touched[ren]) setFieldErrorUI(ren);
    }
  }

  function onInput(e) {
    const el = e.target;
    const s = S();
    const id = el.dataset.field;
    if (!id) return;
    if (def(id)) {
      s.raw[id] = el.value;
      const n = GC.fmt.parseNum(el.value);
      s.data[id] = n == null || Number.isNaN(n) ? n : fromDisplay(id, n);
      if (id === "niy") s.data.niy_manual = true; // an emptied NIY reverts to auto on blur
      if (s.step === 0) recalc();
      const wrap = dialog.querySelector(`[data-wrap="${id}"]`);
      if (shownError(id) || (wrap && wrap.dataset.state === "error")) setFieldErrorUI(id);
      crossCheck(id);
    } else if (id !== "team") {
      s.data[id] = el.value;
      if (GC.splitKey(id)[0] || id === "deal_name") {
        const wrap = dialog.querySelector(`[data-wrap="${id}"]`);
        if (wrap && wrap.dataset.state === "error") setFieldErrorUI(id);
      }
    }
    onAnyChange();
  }

  function onBlur(e) {
    const el = e.target;
    const id = el.dataset && el.dataset.field;
    if (!id) return;
    const s = S();
    const [aidKey, baseKey] = GC.splitKey(id);
    if (id === "deal_name" || (aidKey && (baseKey === "type" || baseKey === "address"))) {
      s.touched[id] = true; setFieldErrorUI(id); renderStepper(); return;
    }
    if (!def(id)) return;
    s.touched[id] = true;
    const v = s.data[id];
    if (v != null && !Number.isNaN(v)) { delete s.raw[id]; el.value = formatDisplay(id, toDisplay(id, v)); }
    if (v == null) delete s.raw[id];
    if (id === "niy" && v == null && s.data.niy_manual) { s.data.niy_manual = false; renderStep({ focus: false, scrollTop: false }); return; }
    setFieldErrorUI(id);
    crossCheck(id);
    renderStepper();
  }

  function setUnit(key, value) {
    const s = S();
    if (s.units[key] === value) return;
    // Values are stored canonically (sqm, per year); drop raw text for valid numbers so they re-render converted.
    Object.keys(s.raw).forEach((id) => { const v = s.data[id]; if (v == null || !Number.isNaN(v)) delete s.raw[id]; });
    s.units[key] = value;
    const active = document.activeElement;
    const sel = active && (active.dataset.unit ? `[data-unit="${active.dataset.unit}"][data-value="${value}"]` : active.dataset.unitSelect ? `[data-unit-select="${active.dataset.unitSelect}"]` : null);
    renderStep({ focus: false, scrollTop: false });
    if (sel) { const el = dialog.querySelector(sel); if (el) el.focus(); }
  }

  // ---------- Comboboxes ----------
  function comboOpen(combo, items, activeIdx) {
    const input = combo.querySelector('[role="combobox"]');
    const lb = combo.querySelector('[role="listbox"]');
    lb.innerHTML = items.length ? items.join("") : `<li class="prov-option prov-option--empty" role="option" aria-disabled="true">No matches — the text you typed will be used</li>`;
    lb.hidden = false;
    input.setAttribute("aria-expanded", "true");
    setActive(combo, activeIdx == null ? -1 : activeIdx);
  }
  function comboClose(combo) {
    const input = combo.querySelector('[role="combobox"]');
    const lb = combo.querySelector('[role="listbox"]');
    lb.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  function setActive(combo, idx) {
    const input = combo.querySelector('[role="combobox"]');
    const opts = Array.from(combo.querySelectorAll('.prov-option:not([aria-disabled="true"])'));
    opts.forEach((o) => o.classList.remove("is-active"));
    if (idx < 0 || !opts.length) { input.removeAttribute("aria-activedescendant"); combo.dataset.active = -1; return; }
    idx = (idx + opts.length) % opts.length;
    opts[idx].classList.add("is-active");
    opts[idx].scrollIntoView({ block: "nearest" });
    input.setAttribute("aria-activedescendant", opts[idx].id);
    combo.dataset.active = idx;
  }
  function highlight(text, q) {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (!q || i < 0) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }
  function locationItems(q) {
    return M.locations.filter((l) => !q || l.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
      .map((l, i) => `<li class="prov-option" role="option" id="loc-opt-${i}" data-value="${esc(l)}" aria-selected="${S().data.location === l}">${GC.icon("location")}<span>${highlight(l, q)}</span></li>`);
  }
  function teamItems(q) {
    const sel = S().data.team;
    return M.users.filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()))
      .map((u) => `<li class="prov-option" role="option" id="team-opt-${u.id}" data-value="${u.id}" aria-selected="${sel.includes(u.id)}">
        <span class="ds-avatar" data-size="md">${u.initials}</span><span>${highlight(u.name, q)}</span><span class="prov-option__check">${GC.icon("check")}</span></li>`);
  }
  function refreshCombo(combo, keepActive) {
    const input = combo.querySelector('[role="combobox"]');
    const kind = combo.dataset.combo;
    const q = kind === "location" ? input.value.trim() : input.value.trim();
    comboOpen(combo, kind === "location" ? locationItems(q) : teamItems(q), keepActive ? +combo.dataset.active : -1);
  }
  function chooseOption(combo, li) {
    const kind = combo.dataset.combo;
    const input = combo.querySelector('[role="combobox"]');
    if (kind === "location") {
      input.value = li.dataset.value;
      S().data.location = li.dataset.value;
      comboClose(combo);
    } else {
      const team = S().data.team;
      const id = li.dataset.value;
      const at = team.indexOf(id);
      if (at >= 0) team.splice(at, 1); else team.push(id);
      combo.querySelector(".team-tokens").innerHTML = teamTokens();
      input.value = "";
      refreshCombo(combo, true);
    }
    onAnyChange();
  }

  // ============================================================
  //  Events
  // ============================================================
  function bind() {
    dialog.addEventListener("input", (e) => {
      const combo = e.target.closest(".prov-combo");
      if (combo && e.target.matches('[role="combobox"]')) refreshCombo(combo);
      onInput(e);
    });
    dialog.addEventListener("change", (e) => {
      const el = e.target;
      if (el.dataset.unitSelect) { setUnit(el.dataset.unitSelect, el.value); return; }
      if (el.tagName === "SELECT" || el.type === "date") {
        const id = el.dataset.field;
        if (id) {
          S().data[id] = el.value;
          if (GC.splitKey(id)[1] === "type") { S().touched[id] = true; setFieldErrorUI(id); }
          onAnyChange();
        }
      }
    });
    dialog.addEventListener("focusout", (e) => {
      onBlur(e);
      const combo = e.target.closest && e.target.closest(".prov-combo");
      if (combo && !combo.contains(e.relatedTarget)) comboClose(combo);
    });
    dialog.addEventListener("focusin", (e) => {
      const combo = e.target.closest && e.target.closest(".prov-combo");
      if (combo && e.target.matches('[role="combobox"]') && combo.dataset.combo === "team") refreshCombo(combo);
    });
    // Keep focus in the input when picking an option with the mouse.
    dialog.addEventListener("mousedown", (e) => { if (e.target.closest(".prov-option")) e.preventDefault(); });

    dialog.addEventListener("keydown", (e) => {
      const combo = e.target.closest && e.target.closest(".prov-combo");
      if (combo && e.target.matches('[role="combobox"]')) {
        const lb = combo.querySelector('[role="listbox"]');
        const open = !lb.hidden;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          if (!open) refreshCombo(combo);
          const count = combo.querySelectorAll('.prov-option:not([aria-disabled="true"])').length;
          const cur = combo.dataset.active == null ? -1 : +combo.dataset.active;
          const next = e.key === "ArrowDown" ? (cur < 0 ? 0 : cur + 1) : (cur <= 0 ? count - 1 : cur - 1);
          setActive(combo, next);
          return;
        }
        if (e.key === "Enter" && open) {
          const act = combo.querySelector(".prov-option.is-active");
          if (act) { e.preventDefault(); chooseOption(combo, act); }
          return;
        }
        if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); comboClose(combo); return; }
        if (e.key === "Backspace" && combo.dataset.combo === "team" && e.target.value === "" && S().data.team.length) {
          S().data.team.pop();
          combo.querySelector(".team-tokens").innerHTML = teamTokens();
          refreshCombo(combo);
          onAnyChange();
        }
        return;
      }
    });

    dialog.addEventListener("click", (e) => {
      const opt = e.target.closest(".prov-option");
      if (opt && !opt.matches('[aria-disabled="true"]')) { chooseOption(opt.closest(".prov-combo"), opt); return; }
      const seg = e.target.closest("[data-unit]");
      if (seg) { setUnit(seg.dataset.unit, seg.dataset.value); return; }
      const step = e.target.closest(".prov-progress__item");
      if (step) { if (step.getAttribute("aria-disabled") !== "true") goTo(+step.dataset.step); else announceLocked(); return; }
      const act = e.target.closest("[data-act]");
      if (!act) return;
      switch (act.dataset.act) {
        case "close": requestClose(); break;
        case "next": goTo(S().step + 1); break;
        case "back": goTo(S().step - 1); break;
        case "save-draft": saveDraftAndClose(); break;
        case "add": addDeal(); break;
        case "draft-continue": {
          S().restoredFrom = null;
          const b = dialog.querySelector(".draft-banner"); if (b) b.remove();
          focusFirstField();
          break;
        }
        case "draft-delete": {
          const draft = GC.loadDraft();
          GC.clearDraft();
          GC.resetState();
          S().open = true;
          renderStep({ focus: false });
          focusFirstField();
          showUndoToast(draft);
          break;
        }
        case "draft-undo": {
          const draft = undoDraft;
          hideUndoToast();
          if (!draft) break;
          GC.putDraft(draft);
          GC.applyDraft(draft);
          S().open = true;
          renderStep({ focus: false });
          const c = dialog.querySelector('[data-act="draft-continue"]'); if (c) c.focus();
          break;
        }
        case "undo-dismiss": hideUndoToast(); focusFirstField(); break;
        case "niy-reset": {
          S().data.niy_manual = false; delete S().raw.niy; recalc();
          renderStep({ focus: false, scrollTop: false });
          const btn = dialog.querySelector('[data-act="niy-override"]'); if (btn) btn.focus();
          onAnyChange();
          break;
        }
        case "niy-override": {
          const s = S();
          s.data.niy_manual = true;
          renderStep({ focus: false, scrollTop: false });
          const inp = dialog.querySelector("#f-niy"); if (inp) { inp.focus(); inp.select(); }
          onAnyChange();
          break;
        }
        case "asset-add": {
          const s = S();
          const aid = GC.newAssetId();
          s.assets.push(aid);
          renderStep({ focus: false, scrollTop: false });
          dialog.querySelector(`#f-${GC.assetKey(aid, "type")}`).focus();
          onAnyChange();
          break;
        }
        case "asset-remove": {
          const s = S();
          const aid = act.dataset.asset;
          const idx = s.assets.indexOf(aid);
          s.assets.splice(idx, 1);
          Object.keys(s.data).forEach((k) => { if (k.startsWith(aid + "__")) delete s.data[k]; });
          Object.keys(s.raw).forEach((k) => { if (k.startsWith(aid + "__")) delete s.raw[k]; });
          renderStep({ focus: false, scrollTop: false });
          const next = s.assets[Math.min(idx, s.assets.length - 1)];
          dialog.querySelector(`#f-${GC.assetKey(next, "type")}`).focus();
          onAnyChange();
          break;
        }
        case "team-remove": {
          const team = S().data.team;
          team.splice(team.indexOf(act.dataset.value), 1);
          const combo = act.closest(".prov-combo");
          combo.querySelector(".team-tokens").innerHTML = teamTokens();
          combo.querySelector("input").focus();
          onAnyChange();
          break;
        }
      }
    });

    overlay.addEventListener("mousedown", (e) => { overlay._downOnSelf = e.target === overlay; });
    overlay.addEventListener("click", (e) => { if (e.target === overlay && overlay._downOnSelf) requestClose(); });
  }

  // ---------- Undo toast (inside the dialog so it stays reachable inside the focus trap) ----------
  let undoDraft = null, undoTimer = null;
  function showUndoToast(draft) {
    hideUndoToast();
    undoDraft = draft;
    const t = document.createElement("div");
    t.className = "dm-toast";
    t.setAttribute("role", "status");
    t.dataset.dsProvisional = "toast";
    t.innerHTML = `<span class="dm-toast__icon">${GC.icon("bin")}</span><span class="dm-toast__msg">Draft deleted</span>
      <button type="button" class="ds-btn" data-type="ghost" data-size="sm" data-act="draft-undo">${GC.icon("refresh", "ds-btn__icon")}<span class="ds-btn__label">Undo</span></button>
      <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" data-act="undo-dismiss" aria-label="Dismiss"><span class="ds-btn__icon">${DS_ICONS.get("x-close")}</span></button>`;
    dialog.appendChild(t);
    undoTimer = setTimeout(hideUndoToast, 8000);
  }
  function hideUndoToast() {
    clearTimeout(undoTimer);
    undoDraft = null;
    const t = dialog && dialog.querySelector(".dm-toast");
    if (t) t.remove();
  }

  function announceLocked() {
    const s = S();
    s.attempted[s.step] = true;
    renderStep({ focus: false, scrollTop: false });
    focusFirstError(s.step);
  }

  function onDocKey(e) {
    if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); requestClose(); }
  }
  function blockFileDrop(e) {
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files") && !e.target.closest(".prov-dropzone")) {
      e.preventDefault();
      if (e.type === "dragover") e.dataTransfer.dropEffect = "none";
    }
  }

  // ============================================================
  //  Open / close
  // ============================================================
  function open(triggerEl) {
    if (overlay) return;
    trigger = triggerEl || document.activeElement;
    GC.resetState();
    const draft = GC.loadDraft();
    if (draft) GC.applyDraft(draft);
    S().open = true;

    overlay = document.createElement("div");
    overlay.className = "dm-overlay";
    overlay.innerHTML = `
      <div class="dm" role="dialog" aria-modal="true" aria-labelledby="dm-title" tabindex="-1" data-ds-provisional="modal">
        <div class="dm__head">
          <div class="dm__title-row">
            <div class="dm__title"><h2 class="t-section-title" id="dm-title">Add New Deal</h2><span class="dm__deal-name" id="dm-deal-name" hidden></span></div>
            <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="md" data-act="close" aria-label="Close">
              <span class="ds-btn__icon">${DS_ICONS.get("x-close")}</span></button>
          </div>
          <nav class="dm__stepper" aria-label="Add deal steps"></nav>
        </div>
        <div class="dm__body"></div>
        <div class="dm__foot"></div>
      </div>`;
    document.getElementById("modal-root").appendChild(overlay);
    dialog = overlay.querySelector(".dm");
    document.querySelector(".page").inert = true;
    releaseTrap = GC.trapFocus(dialog);
    bind();
    document.addEventListener("keydown", onDocKey);
    document.addEventListener("dragover", blockFileDrop);
    document.addEventListener("drop", blockFileDrop);
    renderStep({ focus: false });
    focusFirstField();
  }

  function close() {
    if (!overlay) return;
    releaseTrap && releaseTrap();
    document.removeEventListener("keydown", onDocKey);
    document.removeEventListener("dragover", blockFileDrop);
    document.removeEventListener("drop", blockFileDrop);
    overlay.remove();
    overlay = dialog = null;
    GC.resetState();
    document.querySelector(".page").inert = false;
    if (trigger && trigger.isConnected) trigger.focus();
  }

  function requestClose() {
    if (!GC.isDirty()) { close(); return; }
    GC.confirmClose().then((choice) => {
      if (choice === "draft") saveDraftAndClose();
      else if (choice === "discard") { GC.clearDraft(); close(); GC.toast("Changes discarded", null, "neutral"); }
      else if (dialog) dialog.querySelector('[data-act="close"]').focus();
    });
  }

  function saveDraftAndClose() {
    const res = GC.saveDraft();
    close();
    if (!res.ok) GC.toast("Couldn't save the draft", "Your browser storage is unavailable.", "error");
    else GC.toast("Draft saved", res.imagesDropped ? "Photos were too large to keep in the draft and weren't saved." : "Open “New deal” to continue where you left off.", "success");
  }

  function addDeal() {
    for (let k = 0; k < 4; k++) {
      if (!GC.validateStep(k).valid) { S().attempted[k] = true; goTo(k); return; }
    }
    const deal = GC.buildDeal(S());
    GC.clearDraft();
    close();
    GC.inbox.addDeal(deal);
    GC.toast("Deal added", `“${deal.name}” is now in your inbox.`, "success");
  }

  GC.dealModal = { open, close, requestClose, goTo };
})();
