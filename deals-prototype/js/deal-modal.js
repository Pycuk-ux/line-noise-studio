/* Add New Deal — modal shell, stepper, input steps, close/draft logic. */
window.GC = window.GC || {};

(function () {
  const M = GC.MOCK;
  const esc = GC.esc;
  const F = () => GC.FIELDS;
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
    const f = F()[id], u = S().units;
    if (v == null || Number.isNaN(v)) return v;
    if (f.kind === "area") return GC.fmt.areaToDisplay(v, u.area);
    if (f.kind === "moneyPeriod") return GC.fmt.periodToDisplay(v, u.period);
    return v;
  }
  function fromDisplay(id, v) {
    const f = F()[id], u = S().units;
    if (f.kind === "area") return GC.fmt.areaFromDisplay(v, u.area);
    if (f.kind === "moneyPeriod") return GC.fmt.periodFromDisplay(v, u.period);
    return v;
  }
  function formatDisplay(id, v) {
    if (v == null || Number.isNaN(v)) return "";
    if (F()[id].kind === "year") return String(v);
    return GC.fmt.num(v, 2);
  }
  function displayValue(id) {
    const s = S();
    if (s.raw[id] != null) return s.raw[id];
    return formatDisplay(id, toDisplay(id, s.data[id]));
  }

  function shownError(id) {
    const s = S(), f = F()[id];
    if (!f) return "";
    if (!(s.touched[id] || s.attempted[f.step])) return "";
    return GC.validateField(id);
  }

  function affixHtml(text) { return text ? `<span class="prov-affix" data-ds-provisional="field-affix" aria-hidden="true">${esc(text)}</span>` : ""; }
  function req(f) { return f && f.required ? ` <span class="ds-field__req" aria-hidden="true">*</span>` : ""; }

  function numField(id, o) {
    o = o || {};
    const f = F()[id];
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

  function unitsBar(which) {
    const parts = [];
    if (which.includes("period")) parts.push(segmented("Rent period", "period", [{ value: "yearly", label: "Yearly" }, { value: "monthly", label: "Monthly" }]));
    if (which.includes("area")) parts.push(segmented("Area unit", "area", [{ value: "sqm", label: "SQM" }, { value: "sqf", label: "SQF" }]));
    if (which.includes("currency")) {
      parts.push(`<div class="ds-field" data-size="small" data-state="default">
        <div class="ds-field__box prov-select-wrap" data-ds-provisional="select">
          <select class="ds-field__input prov-select" data-unit-select="currency" aria-label="Currency">
            ${M.currencies.map((c) => `<option value="${c.id}" ${S().units.currency === c.id ? "selected" : ""}>${c.id}</option>`).join("")}
          </select><span class="ds-field__icon">${DS_ICONS.get("chevron-down")}</span></div></div>`);
    }
    return `<div class="units-bar" role="group" aria-label="Units"><span class="t-label">Units</span>${parts.join("")}</div>`;
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
    return `<div class="draft-banner">
      <div class="ds-alert" data-status="neutral" role="status">
        <div class="ds-alert__row"><span class="ds-alert__icon">${GC.icon("history")}</span><p class="ds-alert__msg">Draft restored</p></div>
        <p class="ds-alert__subtext">${esc(when)} Continue where you left off.</p>
      </div>
      <button type="button" class="ds-btn" data-type="ghost" data-size="md" data-act="start-over">Start over</button>
    </div>`;
  }

  function stepKeyInfo() {
    const s = S();
    const psm = GC.fmt.rentPerArea(s.data, s.units.area);
    const psmLabel = s.units.area === "sqf" ? "Rent/psf" : "Rent/psm";
    const niyCalc = GC.fmt.niyCalculated(s.data);
    const manual = s.data.niy_manual;
    const niyLabelRow = `<div class="field-labelrow"><label class="ds-field__label" for="f-niy">NIY${req(F().niy)}</label>
        <span class="auto-tag" data-ds-provisional="tag" data-tone="${manual ? "manual" : "auto"}" id="niy-tag">${manual ? "edited" : "auto"}</span></div>`;
    const niyHelper = manual
      ? `Calculated: ${niyCalc == null ? "—" : GC.fmt.num(niyCalc, 2) + "%"} <button type="button" class="ds-btn" data-type="ghost" data-size="sm" data-act="niy-reset">${GC.icon("refresh", "ds-btn__icon")}<span class="ds-btn__label">Reset to calculated</span></button>`
      : "Rent ÷ Price × 100 — editable";
    return `
      ${unitsBar(["period", "area", "currency"])}
      <section class="form-section" aria-labelledby="photos-title"><div id="upload-root"></div></section>
      <section class="form-section" aria-labelledby="ki-title">
        ${sectionHeading(`<span id="ki-title">Key metrics</span>`)}
        <p class="req-note"><span class="ds-field__req">*</span> Required</p>
        <div class="form-grid">
          ${numField("area_sqm", { placeholder: "0" })}
          ${numField("price", { placeholder: "0" })}
          ${numField("occupancy", { placeholder: "0–100" })}
          ${numField("rent_yearly", { placeholder: "0" })}
          <div class="ds-field is-computed" data-size="medium" data-state="default" data-wrap="rent_psm">
            <div class="field-labelrow"><label class="ds-field__label" for="f-rent_psm" id="l-rent_psm">${psmLabel}</label><span class="auto-tag" data-ds-provisional="tag">auto</span></div>
            <div class="ds-field__box">${affixHtml(GC.fmt.currencySymbol(s.units.currency))}
              <input class="ds-field__input" id="f-rent_psm" type="text" readonly value="${psm == null ? "" : GC.fmt.num(psm, 2)}" placeholder="Calculated" aria-describedby="h-rent_psm">
              ${affixHtml("/ " + GC.fmt.areaUnitLabel(s.units.area) + " / yr")}</div>
            <div class="ds-field__helper" id="h-rent_psm">Yearly rent ÷ area — read-only</div>
          </div>
          ${numField("niy", { labelRow: niyLabelRow, helperHtml: niyHelper, placeholder: "Calculated" })}
          ${numField("assets_count", { placeholder: "1" })}
        </div>
      </section>`;
  }

  function industryGroup() {
    const cur = S().data.industry;
    const first = cur || M.industries[0].id;
    return `<div class="field-group span-all">
      <span class="ds-field__label" id="l-industry">Industry</span>
      <div class="chip-group" role="radiogroup" aria-labelledby="l-industry" data-ds-provisional="chip">
        ${M.industries.map((ind) => `<button type="button" role="radio" class="chip-option" data-industry="${ind.id}" aria-checked="${cur === ind.id}" tabindex="${ind.id === first ? 0 : -1}">${GC.icon(ind.icon)}${esc(ind.id)}</button>`).join("")}
      </div></div>`;
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
        <div class="span-all">${textField("deal_name", "Deal name", { placeholder: "e.g. TechForward Industries HQ" })}</div>
        ${locationCombo()}
        ${textField("date_received", "Date received", { type: "date" })}
        ${industryGroup()}
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
      <div class="field-group__row">${numField(a, { hideLabel: true, placeholder: F()[a].label })}${numField(b, { hideLabel: true, placeholder: F()[b].label })}</div></fieldset>`;
  }

  function stepPhysical() {
    return `
      ${unitsBar(["area"])}
      ${sectionHeading("Physical")}
      <div class="form-grid">
        ${pairGroup("GLA / NLA", "gla_sqm", "nla_sqm")}
        ${numField("land_sqm")}
        ${pairGroup("Year built / renovated", "year_built", "year_renovated")}
        ${numField("floors")}
        ${numField("units_count")}
        ${numField("parking")}
        ${selectField("condition", "Condition", M.conditions, { placeholder: "Select condition" })}
      </div>`;
  }

  function stepFinancial() {
    return `
      ${unitsBar(["period", "currency"])}
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
          : `<button type="button" class="ds-btn" data-type="primary" data-size="lg" data-act="next"><span class="ds-btn__label">Next</span>${GC.icon("chevron-right", "ds-btn__icon")}</button>`}
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

  function renderStep(opts) {
    opts = opts || {};
    const s = S();
    const body = dialog.querySelector(".dm__body");
    dialog.dataset.wide = s.step === 4 ? "true" : "false";
    body.dataset.tone = s.step === 4 ? "grey" : "white";
    body.innerHTML = bodyHtml();
    dialog.querySelector(".dm__foot").innerHTML = footHtml();
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
    const first = Object.keys(GC.FIELDS).find((id) => errs[id]);
    const el = first && dialog.querySelector(`#f-${first}`);
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
  function setFieldErrorUI(id) {
    const wrap = dialog.querySelector(`[data-wrap="${id}"]`);
    if (!wrap) return;
    const err = shownError(id);
    wrap.dataset.state = err ? "error" : "default";
    const input = wrap.querySelector(".ds-field__input");
    input.setAttribute("aria-invalid", err ? "true" : "false");
    const helper = wrap.querySelector(".ds-field__helper");
    if (id === "niy" && !err) updateNiyUI();
    else if (helper) { helper.textContent = err || ""; helper.hidden = !err; }
  }

  function updateNiyUI() {
    const s = S();
    const wrap = dialog.querySelector('[data-wrap="niy"]');
    if (!wrap) return;
    const calc = GC.fmt.niyCalculated(s.data);
    const tag = wrap.querySelector("#niy-tag");
    tag.textContent = s.data.niy_manual ? "edited" : "auto";
    tag.dataset.tone = s.data.niy_manual ? "manual" : "auto";
    const err = shownError("niy");
    const helper = wrap.querySelector(".ds-field__helper");
    if (err) helper.textContent = err;
    else helper.innerHTML = s.data.niy_manual
      ? `Calculated: ${calc == null ? "—" : GC.fmt.num(calc, 2) + "%"} <button type="button" class="ds-btn" data-type="ghost" data-size="sm" data-act="niy-reset">${GC.icon("refresh", "ds-btn__icon")}<span class="ds-btn__label">Reset to calculated</span></button>`
      : "Rent ÷ Price × 100 — editable";
  }

  /** Recalculate Rent/psm and (unless overridden) NIY after any Key Info change. */
  function recalc() {
    const s = S();
    if (!s.data.niy_manual) {
      s.data.niy = GC.fmt.niyCalculated(s.data);
      delete s.raw.niy;
      const niyInput = dialog.querySelector("#f-niy");
      if (niyInput && niyInput !== document.activeElement) niyInput.value = formatDisplay("niy", s.data.niy);
      if (s.touched.niy || s.attempted[0]) setFieldErrorUI("niy");
    }
    const psmInput = dialog.querySelector("#f-rent_psm");
    if (psmInput) {
      const psm = GC.fmt.rentPerArea(s.data, s.units.area);
      psmInput.value = psm == null ? "" : GC.fmt.num(psm, 2);
    }
    updateNiyUI();
  }

  function onInput(e) {
    const el = e.target;
    const s = S();
    const id = el.dataset.field;
    if (!id) return;
    if (GC.FIELDS[id]) {
      s.raw[id] = el.value;
      const n = GC.fmt.parseNum(el.value);
      s.data[id] = n == null || Number.isNaN(n) ? n : fromDisplay(id, n);
      if (id === "niy") s.data.niy_manual = true; // an emptied NIY reverts to auto on blur
      if (s.step === 0) recalc();
      if (shownError(id) || dialog.querySelector(`[data-wrap="${id}"]`).dataset.state === "error") setFieldErrorUI(id);
      if (id === "year_built" && s.touched.year_renovated) setFieldErrorUI("year_renovated");
    } else if (id !== "team") {
      s.data[id] = el.value;
    }
    onAnyChange();
  }

  function onBlur(e) {
    const el = e.target;
    const id = el.dataset && el.dataset.field;
    if (!id || !GC.FIELDS[id]) return;
    const s = S();
    s.touched[id] = true;
    const v = s.data[id];
    if (v != null && !Number.isNaN(v)) { delete s.raw[id]; el.value = formatDisplay(id, toDisplay(id, v)); }
    if (v == null) delete s.raw[id];
    if (id === "niy" && v == null && s.data.niy_manual) { s.data.niy_manual = false; recalc(); }
    setFieldErrorUI(id);
    if (id === "year_built" && s.touched.year_renovated) setFieldErrorUI("year_renovated");
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
      if (el.tagName === "SELECT" || el.type === "date") { if (el.dataset.field) { S().data[el.dataset.field] = el.value; onAnyChange(); } }
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
      // Industry radiogroup: roving tabindex
      const chip = e.target.closest && e.target.closest(".chip-option");
      if (chip && ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        const all = Array.from(dialog.querySelectorAll(".chip-option"));
        const i = all.indexOf(chip);
        const next = all[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length];
        selectIndustry(next.dataset.industry);
        next.focus();
      }
    });

    dialog.addEventListener("click", (e) => {
      const opt = e.target.closest(".prov-option");
      if (opt && !opt.matches('[aria-disabled="true"]')) { chooseOption(opt.closest(".prov-combo"), opt); return; }
      const chip = e.target.closest(".chip-option");
      if (chip) { selectIndustry(S().data.industry === chip.dataset.industry ? "" : chip.dataset.industry, chip.dataset.industry); return; }
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
        case "start-over": GC.clearDraft(); GC.resetState(); S().open = true; renderStep(); break;
        case "niy-reset": {
          S().data.niy_manual = false; recalc();
          setFieldErrorUI("niy");
          const inp = dialog.querySelector("#f-niy"); if (inp) inp.focus();
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

  function selectIndustry(value, focusId) {
    S().data.industry = value;
    dialog.querySelectorAll(".chip-option").forEach((c) => {
      const on = c.dataset.industry === value;
      c.setAttribute("aria-checked", on ? "true" : "false");
      c.tabIndex = (value ? on : c.dataset.industry === (focusId || GC.MOCK.industries[0].id)) ? 0 : -1;
    });
    onAnyChange();
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
            <h2 class="t-section-title" id="dm-title">Add New Deal</h2>
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
