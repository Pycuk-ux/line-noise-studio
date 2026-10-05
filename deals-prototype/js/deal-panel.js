/*
 * Deal details drawer (content from Figma "Deal Details | Full page" 18819:251708) and
 * Edit deal drawer (Figma 18830:255890 / 18830:256700 — built from the brief, Figma was rate-limited).
 */
window.GC = window.GC || {};

(function () {
  const esc = GC.esc;
  const f = () => GC.fmt;
  const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ============================================================
  //  Data helpers — mock details for fields the inbox list doesn't carry
  // ============================================================
  function ext(d) {
    d.details = d.details || {};
    const x = d.details;
    const user = GC.MOCK.users.find((u) => u.initials === d.owner);
    const def = {
      fund: "Gocanopy Logistics Fund II",
      team: user ? [user.name] : [],
      broker: "CBRE · Pieter van de Wal",
      deadline: d.deadline ? "LOI submission · 14 Sep, 2026" : "",
      market: "On-Market",
      gla: d.areaSqm != null ? Math.round(d.areaSqm * 0.94) : null,
      yearBuilt: 2008,
      condition: "Good",
      noi: d.rentYearly != null ? Math.round(d.rentYearly * 0.86) : null,
      exitYield: 9.5,
      ltv: 55,
    };
    Object.keys(def).forEach((k) => { if (!(k in x)) x[k] = def[k]; });
    if (!x.assetList) {
      const n = Math.max(1, Math.min(d.assets || 1, 4));
      const city = (d.location || "").split(",")[0] || "Malmö";
      x.assetList = Array.from({ length: n }, (_, i) => ({
        type: d.industry && d.industry !== "Mixed-use" ? d.industry : ["Logistics", "Office", "Retail"][i % 3],
        address: `${["Innovationsallee", "Stratumseind", "Hamngatan", "Westbridge Road"][i]} ${12 + i * 7}, ${city}`,
      }));
    }
    return x;
  }

  function stageBar(stage) {
    const main = GC.MOCK.stages.filter((s) => s !== "Other");
    const cur = main.indexOf(stage);
    return `<ol class="prov-progress" data-ds-provisional="stepper" aria-label="Deal stage: ${esc(stage)}">
      ${main.map((st, i) => {
        const state = cur < 0 ? "upcoming" : i < cur ? "done" : i === cur ? "current" : "upcoming";
        const icon = state === "done" ? GC.icon("circle-check") : state === "current" ? GC.icon("circle-dashed") : "";
        return `<li><span class="prov-progress__item is-static" data-state="${state}">${icon}<span>${esc(st)}</span></span></li>`;
      }).join("")}
      <li class="is-other"><span class="prov-progress__item is-static" data-state="${stage === "Other" ? "current" : "upcoming"}">Other</span></li>
    </ol>`;
  }

  function metric(label, value, unit) {
    return `<div class="metric"><span class="t-label">${esc(label)}</span><span class="metric__value">${value == null ? `<span class="t-title is-empty">—</span>` : `<span class="t-title">${esc(value)}</span>`}${unit && value != null ? `<span class="metric__unit">${esc(unit)}</span>` : ""}</span></div>`;
  }
  function row(label, value, html) {
    const empty = value == null || value === "";
    return `<div class="ov-row"><span class="ov-row__label t-label">${esc(label)}</span><span class="ov-row__value t-value${empty ? " is-empty" : ""}">${empty ? "—" : html ? value : esc(value)}</span></div>`;
  }
  function heading(title, right, count, iconName) {
    return `<div class="section-heading" data-ds-provisional="section-heading">
      <h3 class="section-heading__title t-section-title">${iconName ? GC.icon(iconName) : ""}${esc(title)}${count != null ? ` <span class="count">(${count})</span>` : ""}</h3>${right || ""}</div>`;
  }
  function linkBtn(label) {
    return `<button type="button" class="ds-btn" data-type="ghost" data-size="sm"><span class="ds-btn__label">${esc(label)}</span>${GC.icon("chevron-right", "ds-btn__icon")}</button>`;
  }

  // ============================================================
  //  Details drawer
  // ============================================================
  let layer = null, panel = null, release = null, trigger = null, current = null, photo = 0, overviewTab = "overview";

  function coverHtml(d) {
    const imgs = d.images || [];
    if (!imgs.length) return `<div class="pv-cover"><div class="pv-cover__empty">${GC.icon("building")}<span>No photos</span></div></div>`;
    photo = Math.min(photo, imgs.length - 1);
    return `<div class="pv-cover"><img src="${imgs[photo]}" alt="${esc(d.name)}, photo ${photo + 1} of ${imgs.length}">
      <span class="pv-cover__counter">${photo + 1} / ${imgs.length}</span>
      ${imgs.length > 1 ? `<div class="pv-cover__nav">
        <button type="button" class="ds-btn is-icon-only" data-type="secondary" data-size="sm" data-dp-photo="-1" aria-label="Previous photo"><span class="ds-btn__icon">${DS_ICONS.get("chevron-left")}</span></button>
        <button type="button" class="ds-btn is-icon-only" data-type="secondary" data-size="sm" data-dp-photo="1" aria-label="Next photo"><span class="ds-btn__icon">${DS_ICONS.get("chevron-right")}</span></button></div>` : ""}
    </div>`;
  }

  function overviewRows(d, x) {
    const F = f();
    if (overviewTab === "physical") {
      return [row("GLA", x.gla != null ? `${F.num(x.gla, 0)} sqm` : null), row("Year built", x.yearBuilt), row("Condition", x.condition),
        row("Number of assets", d.assets), row("Area", d.areaSqm != null ? `${F.num(d.areaSqm, 0)} sqm` : null)].join("");
    }
    if (overviewTab === "financial") {
      return [row("Net operating income", x.noi != null ? F.money(x.noi, "EUR") : null), row("WAULT", d.wault != null ? `${F.num(d.wault, 1)} years` : null),
        row("Exit yield", x.exitYield != null ? `${F.num(x.exitYield, 1)}%` : null), row("LTV", x.ltv != null ? `${F.num(x.ltv, 0)}%` : null),
        row("NIY", d.niy != null ? `${F.num(d.niy, 1)}%` : null)].join("");
    }
    const avatars = x.team.length ? `${esc(x.team.slice(0, 2).join(", "))}${x.team.length > 2 ? `, ${x.team.length - 2}+` : ""}` : null;
    return [row("Date received", F.dateLong(d.dateReceived)), row("Team", avatars, true), row("Fund", x.fund), row("Next deadline", x.deadline),
      row("Broker", x.broker), row("Deal Source", [x.market, d.dealSource].filter(Boolean).join(" · "))].join("");
  }

  function contentHtml(d) {
    const F = f(), x = ext(d);
    const ind = d.industry;
    const loc = `${d.location || "No location"}${d.assets != null ? `, ${d.assets} assets` : ""}`;
    const tags = [["Last-mile Logistics Investment", "positive"], ["12 min to rail terminal", "positive"], ["Excellent Multimodal Connectivity", "positive"], ["High-specification Warehouses", "negative"], ["High Vacancy Concentration Risk", "negative"]];
    const highlights = [["Attractive Entry Yield", "Portfolio comprises 3 logistics assets totalling 37,380 sqm within a 4 km radius."], ["35% Reversion Upside", "100% occupancy across DHL Supply Chain, Kuehne+Nagel and a Fortune 500 e-commerce tenant."], ["Value-Add Asset Management", "100% CPI-indexed leases provide strong inflation hedge over the 5-year hold."], ["Freehold, Diversified Income", "Estimated 8–14% mark-to-market upside on 38% of GLA over the next 4 years."]];
    const risks = [["Near-Term Lease Expiry Concentration", "The portfolio carries a WAULT to break of only 3.00 years."], ["Reversionary Execution Risk", "The investment thesis is predicated on closing a 35% reversion gap."], ["Tenant Covenant Quality", "The portfolio's 17 tenants are predominantly SMEs."], ["Structural & Repair Liability Exposure", "Steel truss and portal frame construction with pitched roofs."]];
    const years = [1, 2, 3, 4, 5];
    const fin = [["Gross rent", "13,640"], ["Operating expenses", "–3,652", "neg"], ["Net operating income", "7,490", "bold"], ["Debt service", "6,250", "neg"], ["Levered Cash Flow", "1,240", "pos"]];
    return `
      <div class="dp-head">
        <div class="pv-head__title"><h2 class="t-page-title" id="dp-title">${esc(d.name)}</h2>
          ${ind ? `<span class="industry-chip industry-chip--header" data-industry="${esc(ind)}" data-ds-provisional="chip"><span class="dot" aria-hidden="true"></span>${esc(ind)}</span>` : ""}
          <span class="stage-chip stage-chip--static" data-stage="${esc(d.stage)}" data-ds-provisional="chip">${esc(d.stage)}</span></div>
        <p class="t-muted pv-head__sub">${esc(loc)}</p>
      </div>

      <div class="pv-row">
        ${coverHtml(d)}
        <div class="pv-stack">${stageBar(d.stage)}
          <div class="metrics" data-ds-provisional="key-metrics">
            ${metric("Area", d.areaSqm != null ? F.num(d.areaSqm, 0) : null, "sqm")}
            ${metric("Price", d.price != null ? F.moneyShort(d.price, "EUR") : null)}
            ${metric("Occupancy", d.occupancy != null ? F.num(d.occupancy, 1) : null, "%")}
            ${metric("Rent", d.rentYearly != null ? F.money(d.rentYearly, "EUR") : null)}
            ${metric("Rent/psm", d.rentPsm != null ? "€" + F.num(d.rentPsm, 1) : null)}
            ${metric("NIY", d.niy != null ? F.num(d.niy, 1) : null, "%")}
          </div>
        </div>
      </div>

      <div class="pv-row">
        <section class="pv-card" aria-label="Overview">
          <div class="ds-segmented dp-tabs" role="group" aria-label="Overview sections">
            ${[["overview", "Overview"], ["physical", "Physical"], ["financial", "Financial"]].map(([id, l]) => `<button type="button" class="ds-segment" data-dp-tab="${id}" aria-pressed="${overviewTab === id}">${l}</button>`).join("")}
          </div>
          <div class="ov-rows dp-overview">${overviewRows(d, x)}</div>
        </section>
        <section class="pv-card">
          ${heading("AI Summary", linkBtn("Ask follow-up"), null, "ai")}
          <div class="dp-tags">${tags.map(([t, k]) => `<span class="ds-badge" data-type="${k}">${esc(t)}</span>`).join("")}</div>
          <p class="dp-text">${esc(d.name)} is a prime ${esc((ind || "commercial").toLowerCase())} investment in a key European hub. The asset comprises ${d.assets || 3} modern, high-specification buildings with ${d.occupancy != null ? F.num(d.occupancy, 1) + "%" : "high"} occupancy and long-term leases to creditworthy tenants. The location benefits from excellent multimodal connectivity — direct motorway access and 12 min to the rail terminal.</p>
          <div class="dp-summary-foot"><span class="dp-icons">${["copy", "like", "dislike", "edit"].map((i) => `<button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" aria-label="${i}"><span class="ds-btn__icon">${DS_ICONS.get(i)}</span></button>`).join("")}</span>${linkBtn("3 sources")}</div>
        </section>
      </div>

      <section class="pv-card">
        ${heading("Asset", linkBtn("Explore asset"))}
        <div class="pv-table-wrap"><table class="pv-table">
          <thead><tr><th>#</th><th>Assets</th><th>Address</th><th>Industry</th><th>Year built</th><th>Occupancy</th><th>Rent (€)</th><th>Area (sqm)</th></tr></thead>
          <tbody>${x.assetList.map((a, i) => `<tr><td class="num">${i + 1}</td><td>${esc(d.name.split(",")[0])} ${i + 1}</td><td>${esc(a.address)}</td>
            <td><span class="industry-chip" data-ds-provisional="chip">${esc(a.type)}</span></td><td>${x.yearBuilt || "—"}</td>
            <td>${d.occupancy != null ? F.num(d.occupancy, 0) + "%" : "—"}</td>
            <td>${d.rentYearly != null ? F.num(d.rentYearly / x.assetList.length, 0) : "—"}</td>
            <td>${d.areaSqm != null ? F.num(d.areaSqm / x.assetList.length, 0) : "—"}</td></tr>`).join("")}</tbody></table></div>
      </section>

      <section class="pv-card dp-map" aria-label="Map">
        <div class="dp-map__view">${GC.map.baseSvg(d.map)}<span class="map-pin" data-stage="${esc(d.stage)}" data-mode="pill" style="left:50%;top:50%"><span class="map-pin__label">${d.price != null ? F.moneyShort(d.price, "EUR") : "No price"}</span></span></div>
      </section>

      <section class="pv-card">
        ${heading("Comps", "", 37)}
        <div class="pv-row pv-row--half">
          ${[["Rental comps", "16 included", "Price/sqm", "€1,240", "€990 – €1,440", "Equal to the market"], ["Invest comps", "21 included", "NIY", "10.6%", "8.9% – 11.4%", "−0.5% vs market"]].map(([t, n, k, v, r, note]) => `
            <div class="dp-comp"><div class="dp-comp__head"><span class="t-title">${t}</span><span class="t-muted">(${n})</span></div>
              <div class="dp-comp__body"><div><p class="t-title">${k}</p><p class="t-label">${note}</p></div><div class="dp-comp__vals"><span class="t-value">${v}</span><span class="t-label">${r}</span></div></div>
              <div class="dp-range" aria-hidden="true"><span class="dp-range__bar"></span><span class="dp-range__dot"></span></div></div>`).join("")}
        </div>
      </section>

      <div class="pv-row dp-row-fin">
        <section class="pv-card">
          ${heading("Financial Model", "", null)}
          <div class="pv-table-wrap"><table class="pv-table dp-fin">
            <thead><tr><th>€ 000s</th>${years.map((y) => `<th class="r">Year ${y}</th>`).join("")}</tr></thead>
            <tbody>${fin.map(([l, v, k]) => `<tr class="${k || ""}"><td>${l}</td>${years.map(() => `<td class="r">${v}</td>`).join("")}</tr>`).join("")}
              <tr class="bold"><td>Entry/Exit Value</td>${years.map((y) => `<td class="r">${y === 5 ? "+39,214" : ""}</td>`).join("")}</tr></tbody></table></div>
          <div class="ov-cols dp-assume">
            <p class="ov-subhead">Assumption</p>
            ${row("Entry price", d.price != null ? F.moneyShort(d.price, "EUR") : null)}${row("Exit yield", x.exitYield != null ? `${F.num(x.exitYield, 1)}%` : null)}
            ${row("Rent growth", "2.0% p.a.")}${row("Hold period", "5 years")}${row("LTV", x.ltv != null ? `${x.ltv}%` : null)}${row("Cost of debt", "4.2%")}
          </div>
        </section>
        <section class="pv-card dp-memo">
          ${heading("Deal Memo", `<span class="t-label">${GC.icon("ai")} AI generated</span>`)}
          <div class="dp-memo__doc"><p class="t-value">Investment committee memo</p><p class="t-label">${esc(d.name)} · ${esc(d.stage)} Stage</p><span></span><span></span><span></span></div>
          <button type="button" class="ds-btn" data-type="primary" data-size="md">${GC.icon("ai", "ds-btn__icon")}<span class="ds-btn__label">Iterate in Assistant</span></button>
          <ul class="dp-checks">${["Executive Summary", "Market Analysis", "Financial Analysis", "Risks & Mitigants", "Recommendations"].map((t) => `<li>${GC.icon("check")}${t}</li>`).join("")}</ul>
        </section>
      </div>

      <div class="pv-row pv-row--half">
        <section class="pv-card">${heading("Key Highlights", linkBtn("See all"), 6)}
          <ul class="dp-list">${highlights.map(([t, s]) => `<li><span class="dp-list__dot is-pos"></span><div><p class="t-value">${t}</p><p class="t-label">${s}</p></div></li>`).join("")}</ul></section>
        <section class="pv-card">${heading("Investment Risks", linkBtn("See all"), 8)}
          <ul class="dp-list">${risks.map(([t, s]) => `<li>${GC.icon("risk-level")}<div><p class="t-value">${t}</p><p class="t-label">${s}</p></div></li>`).join("")}</ul></section>
      </div>

      <section class="pv-card">
        ${heading("Sources", `<button type="button" class="ds-btn" data-type="secondary" data-size="sm"><span class="ds-btn__label">Add files</span>${GC.icon("plus", "ds-btn__icon")}</button>`, 2)}
        <div class="dp-sources">${["Project Merlin IM.pdf", "Rent roll Q3 2026.xlsx"].map((n) => `<div class="dp-source">${GC.icon("document")}<p class="t-value">${n}</p><p class="t-label">963.31 kB</p></div>`).join("")}</div>
      </section>`;
  }

  function navState() {
    const order = GC.inbox.order();
    const i = order.findIndex((x) => x.id === current);
    return { order, i };
  }

  function renderDetails() {
    const d = GC.inbox.find(current);
    if (!d) return;
    const { order, i } = navState();
    panel.querySelector(".dp__scroll").innerHTML = contentHtml(d);
    panel.querySelector("#dp-pos").textContent = `${i + 1} of ${order.length}`;
    panel.querySelector('[data-dp="prev"]').disabled = i <= 0;
    panel.querySelector('[data-dp="next"]').disabled = i >= order.length - 1;
  }

  function slideIn(el) {
    el.classList.add("is-entering");
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("is-entering")));
  }
  function slideOut(el, done) {
    if (reduceMotion()) { done(); return; }
    el.classList.add("is-leaving");
    let finished = false;
    const end = () => { if (finished) return; finished = true; done(); };
    el.addEventListener("transitionend", end, { once: true });
    setTimeout(end, 400);
  }

  function open(id, triggerEl) {
    if (layer) { current = id; photo = 0; renderDetails(); return; }
    current = id; photo = 0; overviewTab = "overview";
    trigger = triggerEl || document.activeElement;
    layer = document.createElement("div");
    layer.className = "drawer-layer";
    layer.innerHTML = `<div class="drawer-backdrop" data-dp="close"></div>
      <aside class="dp drawer" role="dialog" aria-modal="true" aria-labelledby="dp-title" data-ds-provisional="drawer" tabindex="-1">
        <div class="dp__bar">
          <div class="dp__bar-left">
            <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="md" data-dp="close" aria-label="Close panel" title="Close"><span class="ds-btn__icon ico--flip">${DS_ICONS.get("chevrons-left")}</span></button>
            <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="md" data-dp="full" aria-label="Open full page" aria-pressed="false" title="Full page"><span class="ds-btn__icon">${DS_ICONS.get("full-page")}</span></button>
            <span class="dp__divider" aria-hidden="true"></span>
            <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="md" data-dp="prev" aria-label="Previous deal" title="Previous deal"><span class="ds-btn__icon">${DS_ICONS.get("arrow-up")}</span></button>
            <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="md" data-dp="next" aria-label="Next deal" title="Next deal"><span class="ds-btn__icon">${DS_ICONS.get("arrow-down")}</span></button>
            <span class="t-label" id="dp-pos" aria-live="polite"></span>
          </div>
          <button type="button" class="ds-btn" data-type="secondary" data-size="md" data-dp="edit">${GC.icon("edit", "ds-btn__icon")}<span class="ds-btn__label">Edit</span></button>
        </div>
        <div class="dp__scroll"></div>
      </aside>`;
    document.getElementById("drawer-root").appendChild(layer);
    panel = layer.querySelector(".dp");
    document.querySelector(".page").inert = true;
    renderDetails();
    slideIn(panel);
    release = GC.trapFocus(panel);
    panel.querySelector('[data-dp="close"].ds-btn').focus();

    layer.addEventListener("click", (e) => {
      const a = e.target.closest("[data-dp]");
      if (a) {
        const act = a.dataset.dp;
        if (act === "close") close();
        else if (act === "full") { const on = !panel.classList.contains("is-full"); panel.classList.toggle("is-full", on); a.setAttribute("aria-pressed", on); a.setAttribute("aria-label", on ? "Exit full page" : "Open full page"); a.querySelector(".ds-btn__icon").innerHTML = DS_ICONS.get(on ? "maximize-off" : "full-page"); }
        else if (act === "prev" || act === "next") {
          const { order, i } = navState();
          const nx = order[i + (act === "next" ? 1 : -1)];
          if (nx) { current = nx.id; photo = 0; renderDetails(); panel.querySelector(".dp__scroll").scrollTop = 0; }
        } else if (act === "edit") edit(current, a);
        return;
      }
      const ph = e.target.closest("[data-dp-photo]");
      if (ph) {
        const d = GC.inbox.find(current);
        photo = (photo + +ph.dataset.dpPhoto + d.images.length) % d.images.length;
        panel.querySelector(".pv-cover").outerHTML = coverHtml(d);
        const again = panel.querySelector(`[data-dp-photo="${ph.dataset.dpPhoto}"]`); if (again) again.focus();
        return;
      }
      const tab = e.target.closest("[data-dp-tab]");
      if (tab) {
        overviewTab = tab.dataset.dpTab;
        panel.querySelectorAll("[data-dp-tab]").forEach((b) => b.setAttribute("aria-pressed", b === tab));
        panel.querySelector(".dp-overview").innerHTML = overviewRows(GC.inbox.find(current), ext(GC.inbox.find(current)));
      }
    });
    document.addEventListener("keydown", onKey);
  }

  function close() {
    if (!layer) return;
    const l = layer;
    layer = null;
    if (release) release();
    document.removeEventListener("keydown", onKey);
    slideOut(l.querySelector(".dp"), () => l.remove());
    l.querySelector(".drawer-backdrop").classList.add("is-leaving");
    document.querySelector(".page").inert = false;
    const t = document.querySelector(`[data-open="${current}"]`) || trigger;
    if (t && t.isConnected) t.focus();
  }

  function onKey(e) {
    if (e.key !== "Escape" || editLayer || e.defaultPrevented) return;
    e.preventDefault();
    close();
  }

  // ============================================================
  //  Edit drawer
  // ============================================================
  let editLayer = null, editPanel = null, editRelease = null, editTrigger = null, editId = null, original = null, form = null;
  const SECTIONS = [["key", "Key Info"], ["assets", "Assets"], ["general", "General Info"], ["physical", "Physical Info"], ["financial", "Financial Info"]];

  function snapshot(d) {
    const x = ext(d);
    return {
      name: d.name, price: d.price, areaSqm: d.areaSqm, occupancy: d.occupancy, rentYearly: d.rentYearly,
      assetList: x.assetList.map((a) => Object.assign({}, a)),
      location: d.location || "", stage: d.stage, dateReceived: d.dateReceived || "", owner: d.owner || "", fund: x.fund, dealSource: d.dealSource || "",
      gla: x.gla, yearBuilt: x.yearBuilt, condition: x.condition || "",
      wault: d.wault, noi: x.noi, exitYield: x.exitYield, ltv: x.ltv,
    };
  }

  function fld(key, label, o) {
    o = o || {};
    const v = o.value !== undefined ? o.value : form[key];
    const num = o.type === "number";
    const display = v == null ? "" : num ? f().num(v, 2) : v;
    const control = o.options
      ? `<div class="ds-field__box prov-select-wrap" data-ds-provisional="select"><select class="ds-field__input prov-select" id="ep-${key}" data-ep="${key}">
          ${o.placeholder != null ? `<option value="">${esc(o.placeholder)}</option>` : ""}${o.options.map((op) => { const [val, lab] = Array.isArray(op) ? op : [op, op]; return `<option value="${esc(val)}" ${val === v ? "selected" : ""}>${esc(lab)}</option>`; }).join("")}
        </select><span class="ds-field__icon">${DS_ICONS.get("chevron-down")}</span></div>`
      : `<div class="ds-field__box">${o.prefix ? `<span class="prov-affix">${o.prefix}</span>` : ""}<input class="ds-field__input" id="ep-${key}" data-ep="${key}" data-num="${num}" type="${o.type === "date" ? "date" : "text"}" ${num ? 'inputmode="decimal"' : ""} autocomplete="off" value="${esc(display)}">${o.suffix ? `<span class="prov-affix">${o.suffix}</span>` : ""}</div>`;
    return `<div class="ds-field${o.cls ? " " + o.cls : ""}" data-size="medium" data-state="default" data-ep-wrap="${key}">
      <label class="ds-field__label" for="ep-${key}">${esc(label)}${o.required ? ' <span class="ds-field__req" aria-hidden="true">*</span>' : ""}</label>${control}
      <div class="ds-field__helper" id="ep-h-${key}" hidden></div></div>`;
  }
  function autoField(key, label, value, suffix) {
    return `<div class="readonly-field" data-ds-provisional="readonly-field"><div class="field-labelrow"><span class="ds-field__label" id="ep-l-${key}">${label}</span><span class="auto-tag" data-ds-provisional="tag">auto</span></div>
      <div class="readonly-field__box"><output class="readonly-field__value" id="ep-${key}" aria-labelledby="ep-l-${key}" data-empty="${value == null}">${value == null ? "—" : esc(value)}</output>${suffix ? `<span class="prov-affix">${suffix}</span>` : ""}</div></div>`;
  }
  function autos() {
    const psm = form.rentYearly > 0 && form.areaSqm > 0 ? f().num(form.rentYearly / form.areaSqm, 2) : null;
    const niy = form.rentYearly > 0 && form.price > 0 ? f().num((form.rentYearly / form.price) * 100, 2) : null;
    return { psm, niy };
  }
  function card(id, title, body) {
    return `<section class="ep-card" id="ep-sec-${id}" aria-labelledby="ep-t-${id}"><h3 class="t-title ep-card__title" id="ep-t-${id}">${title}</h3>${body}</section>`;
  }
  function assetsBody() {
    return `<div class="ep-assets">${form.assetList.map((a, i) => `<fieldset class="asset-row" data-asset-idx="${i}"><div class="asset-row__head"><legend class="t-value">Asset ${i + 1}</legend>
        ${form.assetList.length > 1 ? `<button type="button" class="ds-btn" data-type="ghost" data-size="sm" data-ep-act="asset-remove" data-i="${i}">${GC.icon("bin", "ds-btn__icon")}<span class="ds-btn__label">Remove</span></button>` : ""}</div>
        <div class="asset-row__fields">${fld(`asset-${i}-type`, "Asset type", { value: a.type, options: GC.MOCK.industries.map((x) => x.id), placeholder: "Select type" })}${fld(`asset-${i}-address`, "Address", { value: a.address })}</div></fieldset>`).join("")}</div>
      <button type="button" class="ds-btn" data-type="secondary" data-size="sm" data-ep-act="asset-add">${GC.icon("plus", "ds-btn__icon")}<span class="ds-btn__label">Add asset</span></button>`;
  }
  function editBody() {
    const a = autos();
    const users = GC.MOCK.users.map((u) => [u.initials, u.name]);
    return [
      card("key", "Key Info", `<div class="ep-grid">${fld("name", "Deal name", { required: true, cls: "span-all" })}${fld("price", "Price", { type: "number", prefix: "€" })}${fld("areaSqm", "Area", { type: "number", suffix: "sqm" })}
        ${fld("occupancy", "Occupancy", { type: "number", suffix: "%" })}${fld("rentYearly", "Rent", { type: "number", prefix: "€", suffix: "/ yr" })}
        ${autoField("psm", "Rent/psm", a.psm, "/ sqm / yr")}${autoField("niy", "NIY", a.niy, "%")}</div>`),
      card("assets", `Assets <span class="count">(${form.assetList.length})</span>`, assetsBody()),
      card("general", "General Info", `<div class="ep-grid">${fld("location", "Location / Region")}${fld("dateReceived", "Date received", { type: "date" })}
        ${fld("stage", "Deal stage", { options: GC.MOCK.stages })}${fld("owner", "Owner", { options: users, placeholder: "Unassigned" })}
        ${fld("fund", "Fund", { options: GC.MOCK.funds, placeholder: "Select fund" })}${fld("dealSource", "Deal source", { options: GC.MOCK.processTypes.concat(["Off-Market"]), placeholder: "Select source" })}</div>`),
      card("physical", "Physical Info", `<div class="ep-grid">${fld("gla", "GLA", { type: "number", suffix: "sqm" })}${fld("yearBuilt", "Year built", { type: "number" })}
        ${fld("condition", "Condition", { options: GC.MOCK.conditions, placeholder: "Select condition" })}</div>`),
      card("financial", "Financial Info", `<div class="ep-grid">${fld("noi", "Net operating income", { type: "number", prefix: "€", suffix: "/ yr" })}${fld("wault", "WAULT", { type: "number", suffix: "years" })}
        ${fld("exitYield", "Exit yield", { type: "number", suffix: "%" })}${fld("ltv", "LTV", { type: "number", suffix: "%" })}</div>`),
    ].join("");
  }

  function isEditDirty() { return JSON.stringify(form) !== JSON.stringify(original); }

  function renderEdit(keepScroll) {
    const sc = editPanel.querySelector(".ep__scroll");
    const top = sc.scrollTop;
    sc.querySelector(".ep__cards").innerHTML = editBody();
    if (keepScroll) sc.scrollTop = top;
  }

  function updateSpy() {
    const sc = editPanel.querySelector(".ep__scroll");
    const head = editPanel.querySelector(".ep__head");
    head.classList.toggle("is-scrolled", sc.scrollTop > 0);
    const line = head.getBoundingClientRect().bottom + 8;
    let active = SECTIONS[0][0];
    SECTIONS.forEach(([id]) => { const el = sc.querySelector(`#ep-sec-${id}`); if (el && el.getBoundingClientRect().top <= line) active = id; });
    if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2) active = SECTIONS[SECTIONS.length - 1][0];
    head.querySelectorAll("[data-ep-tab]").forEach((t) => t.setAttribute("aria-selected", t.dataset.epTab === active ? "true" : "false"));
  }

  function edit(id, triggerEl, restore) {
    if (editLayer) return;
    const d = GC.inbox.find(id);
    if (!d) return;
    editId = id;
    editTrigger = triggerEl || document.activeElement;
    original = snapshot(d);
    form = restore ? JSON.parse(JSON.stringify(restore)) : JSON.parse(JSON.stringify(original));
    editLayer = document.createElement("div");
    editLayer.className = "drawer-layer drawer-layer--edit";
    editLayer.innerHTML = `<div class="drawer-backdrop" data-ep-act="cancel"></div>
      <aside class="ep drawer" role="dialog" aria-modal="true" aria-labelledby="ep-title" data-ds-provisional="drawer" tabindex="-1">
        <div class="ep__scroll">
          <div class="ep__head">
            <div class="ep__title-row"><div class="dm__title"><h2 class="t-section-title" id="ep-title">Edit deal</h2><span class="dm__deal-name">${esc(d.name)}</span></div>
              <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="md" data-ep-act="cancel" aria-label="Close"><span class="ds-btn__icon">${DS_ICONS.get("x-close")}</span></button></div>
            <div class="ds-tabs" role="tablist" aria-label="Deal sections">
              ${SECTIONS.map(([sid, l], i) => `<button class="ds-tab" type="button" data-size="small" role="tab" aria-selected="${i === 0}" aria-controls="ep-sec-${sid}" data-ep-tab="${sid}">${l}</button>`).join("")}
            </div>
          </div>
          <div class="ep__cards"></div>
        </div>
        <div class="ep__foot">
          <button type="button" class="ds-btn" data-type="secondary" data-size="lg" data-ep-act="cancel">Cancel</button>
          <button type="button" class="ds-btn" data-type="primary" data-size="lg" data-ep-act="save">Save changes</button>
        </div>
      </aside>`;
    document.getElementById("drawer-root").appendChild(editLayer);
    editPanel = editLayer.querySelector(".ep");
    renderEdit();
    if (layer) layer.inert = true; else document.querySelector(".page").inert = true;
    slideIn(editPanel);
    editRelease = GC.trapFocus(editPanel);
    editPanel.querySelector("#ep-name").focus();

    const sc = editPanel.querySelector(".ep__scroll");
    sc.addEventListener("scroll", updateSpy, { passive: true });
    updateSpy();

    editLayer.addEventListener("input", (e) => {
      const key = e.target.dataset.ep;
      if (!key) return;
      const m = /^asset-(\d+)-(type|address)$/.exec(key);
      if (m) form.assetList[+m[1]][m[2]] = e.target.value;
      else if (e.target.dataset.num === "true") { const n = f().parseNum(e.target.value); form[key] = n == null || Number.isNaN(n) ? (n === null ? null : form[key]) : n; }
      else form[key] = e.target.value;
      if (["price", "areaSqm", "rentYearly"].includes(key)) {
        const a = autos();
        [["psm", a.psm], ["niy", a.niy]].forEach(([k, v]) => { const o = editPanel.querySelector(`#ep-${k}`); o.textContent = v == null ? "—" : v; o.dataset.empty = v == null; });
      }
      if (key === "name") {
        const wrap = editPanel.querySelector('[data-ep-wrap="name"]');
        if (wrap.dataset.state === "error" && e.target.value.trim()) { wrap.dataset.state = "default"; wrap.querySelector(".ds-field__helper").hidden = true; }
      }
    });
    editLayer.addEventListener("change", (e) => { if (e.target.tagName === "SELECT") e.target.dispatchEvent(new Event("input", { bubbles: true })); });
    editLayer.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-ep-tab]");
      if (tab) {
        const el = editPanel.querySelector(`#ep-sec-${tab.dataset.epTab}`);
        const headH = editPanel.querySelector(".ep__head").offsetHeight;
        sc.scrollTo({ top: el.offsetTop - headH - 8, behavior: reduceMotion() ? "auto" : "smooth" });
        return;
      }
      const a = e.target.closest("[data-ep-act]");
      if (!a) return;
      const act = a.dataset.epAct;
      if (act === "cancel") cancelEdit();
      else if (act === "save") saveEdit();
      else if (act === "asset-add") { form.assetList.push({ type: "", address: "" }); renderEdit(true); editPanel.querySelector(`#ep-asset-${form.assetList.length - 1}-type`).focus(); }
      else if (act === "asset-remove") { form.assetList.splice(+a.dataset.i, 1); renderEdit(true); editPanel.querySelector('[data-ep-act="asset-add"]').focus(); }
    });
    document.addEventListener("keydown", onEditKey);
  }

  function onEditKey(e) {
    if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); cancelEdit(); }
  }

  function closeEdit() {
    if (!editLayer) return;
    const l = editLayer;
    editLayer = null;
    if (editRelease) editRelease();
    document.removeEventListener("keydown", onEditKey);
    slideOut(l.querySelector(".ep"), () => l.remove());
    l.querySelector(".drawer-backdrop").classList.add("is-leaving");
    if (layer) layer.inert = false; else document.querySelector(".page").inert = false;
    if (editTrigger && editTrigger.isConnected) editTrigger.focus();
  }

  function cancelEdit() {
    const dirty = isEditDirty();
    const pending = JSON.parse(JSON.stringify(form));
    const id = editId, trig = editTrigger;
    closeEdit();
    if (dirty) {
      GC.toast("Changes discarded", "Your edits weren't saved.", "neutral", {
        label: "Undo",
        onClick: () => { if (!GC.inbox.find(id)) return; edit(id, trig, pending); },
      });
    }
  }

  function saveEdit() {
    if (!form.name || !form.name.trim()) {
      const wrap = editPanel.querySelector('[data-ep-wrap="name"]');
      wrap.dataset.state = "error";
      const h = wrap.querySelector(".ds-field__helper"); h.textContent = "Deal name is required"; h.hidden = false;
      editPanel.querySelector("#ep-name").focus();
      return;
    }
    const d = GC.inbox.find(editId);
    const x = ext(d);
    Object.assign(d, {
      name: form.name.trim(), price: form.price, areaSqm: form.areaSqm, occupancy: form.occupancy, rentYearly: form.rentYearly,
      location: form.location, stage: form.stage, dateReceived: form.dateReceived, owner: form.owner || null, dealSource: form.dealSource || null, wault: form.wault,
      assets: form.assetList.length,
    });
    d.rentPsm = d.rentYearly > 0 && d.areaSqm > 0 ? d.rentYearly / d.areaSqm : null;
    d.niy = d.rentYearly > 0 && d.price > 0 ? (d.rentYearly / d.price) * 100 : null;
    const types = [...new Set(form.assetList.map((a) => a.type).filter(Boolean))];
    if (types.length) d.industry = types.length === 1 ? types[0] : "Mixed-use";
    Object.assign(x, { fund: form.fund, gla: form.gla, yearBuilt: form.yearBuilt, condition: form.condition, noi: form.noi, exitYield: form.exitYield, ltv: form.ltv,
      assetList: form.assetList.map((a) => Object.assign({}, a)) });
    closeEdit();
    GC.inbox.update(d);
    if (layer && current === d.id) renderDetails();
    GC.toast("Changes saved", `“${d.name}” was updated.`, "success");
  }

  function onRemoved(id) {
    if (editLayer && editId === id) closeEdit();
    if (layer && current === id) close();
  }

  GC.dealPanel = { open, close, edit, onRemoved };
})();
