/* Deals Inbox list (Figma 18819:252983 → row-card 18819:250337). */
window.GC = window.GC || {};

(function () {
  const esc = GC.esc;
  const deals = GC.MOCK.deals.slice();
  const archived = [];
  const source = () => (view.sort === "archived" ? archived : deals);
  const ME = "Liam O'Connor";
  /** Activity log entry (shown in the details drawer → Logs). */
  function log(d, text, type) { d.log = d.log || []; d.log.unshift({ who: ME, text, type: type || "edit", at: new Date().toISOString() }); }
  const summary = Object.assign({}, GC.MOCK.inboxSummary);

  const industryIcon = (id) => GC.industryIcon(id);

  function stat(label, value) {
    return `<div class="stat"><span class="t-label">${esc(label)}</span><span class="t-value">${value == null ? "—" : esc(value)}</span></div>`;
  }

  // ---------- Card fields (settings menu) ----------
  const FIELD_KEY = "gocanopy.inbox.cardFields.v2";
  GC.CARD_FIELDS = [
    { id: "received", label: "Received" },
    { id: "area", label: "Area" }, { id: "rent", label: "Rent" }, { id: "psm", label: "Rent/psm" },
    { id: "niy", label: "NIY" }, { id: "wault", label: "WAULT" }, { id: "occupancy", label: "Occupancy" },
    { id: "source", label: "Deal source" },
  ];
  const fields = { area: true, rent: true, psm: true, niy: false, wault: true, occupancy: true, source: true, received: true };
  try { Object.assign(fields, JSON.parse(localStorage.getItem(FIELD_KEY) || "{}")); } catch (e) { /* storage unavailable */ }

  const view = { layout: "list", sort: "newest" };

  function statPairs(d) {
    const f = GC.fmt, sym = f.currencySymbol(d.currency || "EUR");
    const out = [];
    if (fields.received) out.push(["Received", f.dateShort(d.dateReceived) || null]);
    if (fields.area) out.push(["Area", d.areaSqm != null ? `${f.num(d.areaSqm, 0)} sqm` : null]);
    const rentK = d.rentYearly != null ? `${sym}${f.num(d.rentYearly / 1000, 1, 1)}` : null;
    const psm = d.rentPsm != null ? `${sym}${f.num(d.rentPsm, 1, 1)}` : null;
    if (fields.rent && fields.psm) out.push([`Rent (k${sym} / ${sym}psm)`, rentK || psm ? `${rentK || "—"} / ${psm || "—"}` : null]);
    else if (fields.rent) out.push([`Rent (k${sym})`, rentK]);
    else if (fields.psm) out.push(["Rent/psm", psm]);
    if (fields.niy) out.push(["NIY", d.niy != null ? `${f.num(d.niy, 1)}%` : null]);
    if (fields.wault) out.push(["WAULT", d.wault != null ? `${f.num(d.wault, 1, 1)} years` : null]);
    if (fields.occupancy) out.push(["Occupancy", d.occupancy != null ? `${f.num(d.occupancy, 1)}%` : null]);
    if (fields.source) out.push(["Deal source", d.dealSource]);
    return out;
  }
  function statsHtml(d) { return statPairs(d).map(([l, v]) => stat(l, v)).join(""); }
  function rowsHtml(d) {
    return statPairs(d).map(([l, v]) => `<div class="board-row"><span class="board-row__label">${esc(l)}</span><span class="board-row__value">${v == null ? "—" : esc(v)}</span></div>`).join("");
  }

  function ownerHtml(d) {
    // Figma: 24px tinted circle with initials; unassigned = outlined "+" circle.
    return d.owner ? `<span class="ds-avatar owner-avatar" data-size="md" title="Owner">${esc(d.owner)}</span>`
      : `<button type="button" class="assign-btn" data-ds-provisional="assign-button" aria-label="Assign owner" title="Assign owner">${GC.icon("plus")}</button>`;
  }
  function industryChip(d) {
    return d.industry ? `<span class="industry-chip" data-ds-provisional="chip">${industryIcon(d.industry)}${esc(d.industry)}</span>` : "";
  }
  /** Stage chip (Figma 16338:69306): progress pie + code; a button that opens the stage dropdown. */
  function stageChip(d) {
    const lbl = GC.stageLabel(d.stage);
    return `<button type="button" class="stage-chip" data-stage="${esc(d.stage)}" data-stage-menu="${d.id}" data-ds-provisional="chip" aria-haspopup="menu" aria-expanded="false" aria-label="Deal stage: ${esc(d.stage)}. Change stage" title="Change stage">${GC.stageIcon(d.stage)}${esc(lbl)}</button>`;
  }
  function tagsHtml(d) {
    return `${industryChip(d)}${stageChip(d)}${GC.statusChip(d)}
      ${d.deadline ? `<span class="deadline t-value">${GC.icon("alert-circle")}${esc(d.deadline)}</span>` : ""}`;
  }
  function locText(d) {
    return [d.location, d.assets != null ? `${d.assets} asset${d.assets === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ") || "No location";
  }
  /** Floating action plate (Figma 16338:69956): edit | more, shown on card hover / focus. */
  function plateHtml(d) {
    return `<div class="card-plate" data-ds-provisional="action-plate">
      <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" data-deal-edit="${d.id}" aria-label="Edit ${esc(d.name)}" title="Edit"><span class="ds-btn__icon">${DS_ICONS.get("edit")}</span></button>
      <span class="card-plate__div" aria-hidden="true"></span>
      <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" data-deal-menu="${d.id}" aria-haspopup="menu" aria-expanded="false" aria-label="More actions for ${esc(d.name)}" title="More"><span class="ds-btn__icon">${DS_ICONS.get("more-vertical")}</span></button>
    </div>`;
  }
  function actionsHtml(d, comments) {
    return `<button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" data-deal-edit="${d.id}" aria-label="Edit ${esc(d.name)}"><span class="ds-btn__icon">${DS_ICONS.get("edit")}</span></button>
      ${comments && d.comments ? `<button type="button" class="ds-btn board-card__comments" data-type="ghost" data-size="sm" data-open-comments="${d.id}" aria-label="${d.comments} comments"><span class="ds-btn__icon">${DS_ICONS.get("message-text")}</span><span class="ds-btn__label">${d.comments}</span></button>` : ""}
      <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" data-deal-menu="${d.id}" aria-haspopup="menu" aria-expanded="false" aria-label="More actions for ${esc(d.name)}"><span class="ds-btn__icon">${DS_ICONS.get("more-vertical")}</span></button>`;
  }
  function titleHtml(d, cls) {
    return `<h3 class="t-title ${cls}"><button type="button" class="deal-link" data-open="${d.id}">${esc(d.name)}</button></h3>`;
  }
  const slideIdx = {};
  function sliderHtml(d) {
    const imgs = d.images || [];
    if (!imgs.length) return `<div class="board-card__media is-empty">${GC.icon("building")}</div>`;
    const i = Math.min(slideIdx[d.id] || 0, imgs.length - 1);
    return `<div class="board-card__media" data-slider="${d.id}">
      <img src="${imgs[i]}" alt="${esc(d.name)} photo ${i + 1} of ${imgs.length}">
      ${imgs.length > 1 ? `<span class="board-card__count">${i + 1} / ${imgs.length}</span>
        <span class="board-card__nav">
          <button type="button" data-slide="-1" aria-label="Previous photo">${GC.icon("chevron-left")}</button>
          <button type="button" data-slide="1" aria-label="Next photo">${GC.icon("chevron-right")}</button>
        </span>` : ""}
    </div>`;
  }

  /** Received date leads the metrics row (Figma 16338:69956). */
  function cardHtml(d) {
    const f = GC.fmt, cur = d.currency || "EUR";
    const stats = statsHtml(d);
    return `<li class="row-card deal-card${d.isNew ? " is-new" : ""}" data-ds-provisional="row-card" data-id="${d.id}" aria-label="${esc(d.name)}">
      <div class="row-card__media">${(d.images || [])[0] ? `<img src="${d.images[0]}" alt="">` : GC.icon("building")}</div>
      <div class="row-card__body">
        <div class="row-card__top">
          ${titleHtml(d, "row-card__name")}
          <div class="row-card__figures">
            ${d.niy != null ? `<span class="row-card__yield" title="Yield" data-tip="Yield">${esc(f.num(d.niy, 1))}%</span>` : ""}
            <span class="row-card__price t-title" title="Price" data-tip="Price">${d.price != null ? f.moneyShort(d.price, cur) : "—"}</span>
          </div>
        </div>
        <div class="row-card__meta">
          <div class="row-card__tags">${industryChip(d)}<span class="row-card__loc">${GC.icon("location")}<span>${esc(locText(d))}</span></span>
            ${d.deadline ? `<span class="deadline t-value">${GC.icon("alert-circle")}${esc(d.deadline)}</span>` : ""}</div>
          <div class="row-card__owner">${d.comments ? `<button type="button" class="comments t-value" data-open-comments="${d.id}" aria-label="${d.comments} comments — open comments" title="Open comments">${GC.icon("message-text")}${d.comments}</button>` : ""}${stageChip(d)}${GC.statusChip(d)}${ownerHtml(d)}</div>
        </div>
        ${stats ? `<div class="row-card__stats">${stats}</div>` : ""}
      </div>
      ${plateHtml(d)}
    </li>`;
  }

  const COUNTRY = { "United Kingdom": "UK", "United States": "US", Netherlands: "NL", Germany: "DE", Sweden: "SE", Spain: "ES", France: "FR", Denmark: "DK" };
  /** "Wakefield, United Kingdom" → "Wakefield, UK" (Figma kanban card). */
  function shortLoc(loc) {
    if (!loc) return "";
    const parts = loc.split(",").map((x) => x.trim());
    const last = parts.length - 1;
    if (COUNTRY[parts[last]]) parts[last] = COUNTRY[parts[last]];
    return parts.join(", ");
  }

  /** Kanban card — layout from the provided screenshot (ds:provisional board-card). */
  function boardCardHtml(d) {
    const f = GC.fmt, cur = d.currency || "EUR";
    const rows = rowsHtml(d);
    const n = d.assets;
    const loc = `${shortLoc(d.location) || "No location"}${n != null ? ` (${n} asset${n === 1 ? "" : "s"})` : ""}`;
    return `<li class="board-card deal-card${d.isNew ? " is-new" : ""}" data-ds-provisional="board-card" data-id="${d.id}" aria-label="${esc(d.name)}">
      <div class="board-card__top">${ownerHtml(d)}<span class="t-title">${d.price != null ? f.moneyShort(d.price, cur) : "—"}</span></div>
      ${titleHtml(d, "board-card__name")}
      <span class="row-card__loc t-muted">${GC.icon("location")}${esc(loc)}</span>
      ${sliderHtml(d)}
      <div class="row-card__tags board-card__tags">${tagsHtml(d)}</div>
      ${rows ? `<div class="board-card__rows">${rows}</div>` : ""}
      <div class="board-card__foot">${actionsHtml(d, true)}</div>
    </li>`;
  }

  // ---------- Stages ----------
  const STAGES = [
    { id: "Received", short: "RCVD" }, { id: "SCR", short: "SCR" }, { id: "QUAL", short: "QUAL" }, { id: "LOI", short: "LOI" },
    { id: "DD", short: "DD" }, { id: "SPA", short: "SPA" }, { id: "Completed", short: "CL" },
  ];
  function stageHead(st, list, board) {
    const total = list.reduce((sum, d) => sum + (d.price > 0 ? d.price : 0), 0);
    const amount = total > 0 ? GC.fmt.moneyShort(total, "EUR") : "";
    return `<div class="stage-group__sticky"><div class="stage-group__head" data-stage="${st.id}">
      <span class="stage-group__name" title="${esc(st.id)}">${esc(st.short)} <span class="stage-group__count">(${list.length})</span></span>
      <span class="stage-group__total">${amount && !board ? `Total amount: ${amount}` : amount}</span>
    </div></div>`;
  }

  /** "Deal stage" sort runs both ways: SCR → CL (pipeline order) or CL → SCR. Kanban columns keep pipeline order. */
  const isStageSort = () => view.sort === "stage" || view.sort === "stage-desc";
  const stageOrder = () => (view.sort === "stage-desc" ? STAGES.slice().reverse() : STAGES);

  function sorted(list) {
    const by = {
      newest: (a, b) => (b.dateReceived || "").localeCompare(a.dateReceived || "") || (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0),
      oldest: (a, b) => (a.dateReceived || "").localeCompare(b.dateReceived || ""),
      price: (a, b) => (b.price || -1) - (a.price || -1),
      deadline: (a, b) => (b.deadline ? 1 : 0) - (a.deadline ? 1 : 0),
    }[isStageSort() || view.sort === "archived" ? "newest" : view.sort];
    // newly added deals stay on top in date sorts
    return list.slice().sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || by(a, b));
  }

  /** Manual order from drag & drop wins inside a column; deals not yet placed stay on top. */
  function boardSort(items) {
    if (!boardOrder) return items;
    const at = (d) => boardOrder.indexOf(d.id);
    return items.slice().sort((a, b) => at(a) - at(b));
  }

  // ---------- Render ----------
  function renderSummary() {
    document.getElementById("inbox-total").textContent = GC.fmt.moneyShort(summary.totalValue, "EUR");
    document.getElementById("inbox-sub").textContent = `${summary.activeDeals} active deals | ${summary.withoutPrice} without price`;
  }

  function render() {
    const root = document.getElementById("deal-list");
    const list = sorted(source());
    const mode = view.layout === "board" ? "board" : isStageSort() ? "grouped" : "list";
    root.dataset.view = mode;
    if (mode === "list") {
      root.innerHTML = list.length ? `<ul class="card-list">${list.map((d) => cardHtml(d)).join("")}</ul>`
        : `<div class="empty-state" data-ds-provisional="empty-state">${GC.icon("bookmark")}<p class="t-title">${view.sort === "archived" ? "No archived deals" : "No deals"}</p><p class="t-muted">${view.sort === "archived" ? "Deals you archive from the card menu show up here." : ""}</p></div>`;
    } else if (mode === "grouped") {
      root.innerHTML = stageOrder().map((st) => {
        const items = list.filter((d) => d.stage === st.id);
        return `<section class="stage-group" data-ds-provisional="stage-group" data-stage="${st.id}" aria-label="${esc(st.id)}, ${items.length} deals">
          ${stageHead(st, items)}${items.length ? `<ul class="card-list">${items.map((d) => cardHtml(d, true)).join("")}</ul>` : ""}</section>`;
      }).join("");
    } else {
      root.innerHTML = STAGES.map((st) => {
        const items = boardSort(list.filter((d) => d.stage === st.id));
        return `<section class="board-col stage-group" data-ds-provisional="board-column" data-stage="${st.id}" aria-label="${esc(st.id)}, ${items.length} deals">
          ${stageHead(st, items, true)}<ul class="card-list">${items.map(boardCardHtml).join("")}</ul></section>`;
      }).join("");
      root.querySelectorAll(".board-col").forEach((col) => col.addEventListener("scroll", () => updateStuck(col), { passive: true }));
    }
    document.getElementById("list-footer").hidden = mode === "board";
    renderSummary();
    updateStuck();
    if (GC.map) GC.map.renderPins();
  }

  /** Sticky stage headers: grey fill + shadow once cards slide underneath. */
  function updateStuck(scroller) {
    const root = document.getElementById("deal-list");
    if (root.dataset.view === "board") {
      (scroller ? [scroller] : root.querySelectorAll(".board-col")).forEach((col) =>
        col.querySelector(".stage-group__sticky").classList.toggle("is-stuck", col.scrollTop > 0));
      return;
    }
    const top = root.getBoundingClientRect().top;
    root.querySelectorAll(".stage-group__sticky").forEach((el) => {
      const g = el.parentElement.getBoundingClientRect();
      el.classList.toggle("is-stuck", g.top < top - 0.5 && g.bottom > top + el.offsetHeight);
    });
  }

  // ---------- Card fields menu ----------
  function bindFieldsMenu() {
    const btn = document.getElementById("card-fields-btn");
    const menu = document.getElementById("card-fields-menu");
    menu.innerHTML = `<p class="map-menu__title" id="card-fields-l">Show on deal cards</p>
      <div class="map-menu__group" role="group" aria-labelledby="card-fields-l">
        ${GC.CARD_FIELDS.map((fd) => `<label class="ds-control ds-checkbox map-menu__item"><input type="checkbox" data-card-field="${fd.id}" ${fields[fd.id] ? "checked" : ""}>
          <span class="ds-checkbox__box"><svg class="ds-check-mark" viewBox="0 0 12 12" fill="none"><path d="M2.4 6.2 4.7 8.5 9.6 3.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span>${esc(fd.label)}</span></label>`).join("")}
      </div>`;
    const open = (on) => { menu.hidden = !on; btn.setAttribute("aria-expanded", on ? "true" : "false"); if (on) menu.querySelector("input").focus(); };
    btn.addEventListener("click", () => open(menu.hidden));
    menu.addEventListener("change", (e) => {
      const id = e.target.dataset.cardField;
      if (!id) return;
      fields[id] = e.target.checked;
      try { localStorage.setItem(FIELD_KEY, JSON.stringify(fields)); } catch (err) { /* ignore */ }
      render();
    });
    menu.addEventListener("keydown", (e) => { if (e.key === "Escape") { open(false); btn.focus(); } });
    document.addEventListener("pointerdown", (e) => { if (!menu.hidden && !e.target.closest(".card-fields-wrap")) open(false); });
  }

  // ---------- Controls ----------
  function bindControls() {
    document.getElementById("sort-select").addEventListener("change", (e) => { view.sort = e.target.value; boardOrder = null; render(); });
    document.getElementById("view-switch").addEventListener("click", (e) => {
      const seg = e.target.closest("[data-layout]");
      if (!seg) return;
      view.layout = seg.dataset.layout;
      render();
    });
    document.getElementById("deal-list").addEventListener("scroll", () => updateStuck(), { passive: true });
    window.addEventListener("resize", () => updateStuck());
    bindFieldsMenu();
  }

  // Card ↔ map pin hover link
  function bindLinking() {
    const list = document.getElementById("deal-list");
    const handler = (on) => (e) => {
      const card = e.target.closest(".deal-card");
      if (!card || (e.relatedTarget && card.contains(e.relatedTarget))) return;
      if (e.type === "focusin" && !e.target.matches(":focus-visible")) return;
      if (GC.map) GC.map.link(card.dataset.id, on);
    };
    list.addEventListener("mouseover", handler(true));
    list.addEventListener("mouseout", handler(false));
    list.addEventListener("focusin", handler(true));   // keyboard users get the same map highlight
    list.addEventListener("focusout", handler(false));
    bindControls();
    bindCardActions();
  }

  function addDeal(deal) {
    deals.unshift(deal);
    log(deal, "created the deal", "received");
    summary.activeDeals += 1;
    if (deal.price > 0) summary.totalValue += deal.price; else summary.withoutPrice += 1;
    render();
    if (GC.map) GC.map.placeNewDeal(deal);
    const li = document.querySelector(`.deal-card[data-id="${deal.id}"]`);
    if (li) {
      li.scrollIntoView({ block: "nearest", behavior: "smooth" });
      setTimeout(() => {
        deal.isNew = false;
        const el = document.querySelector(`.deal-card[data-id="${deal.id}"]`);
        if (el) el.classList.remove("is-new");
        if (GC.map) GC.map.renderPins();
      }, 4000);
    }
    GC.inbox.lastAdded = deal; // handy for inspection in the console
  }

  /** Deals in on-screen order (used by the details panel's up/down navigation). */
  function find(id) { return deals.find((d) => d.id === id) || archived.find((d) => d.id === id); }

  function order() {
    const list = sorted(source());
    if (view.layout !== "board" && !isStageSort()) return list;
    return (view.layout === "board" ? STAGES : stageOrder()).flatMap((st) => { const items = list.filter((d) => d.stage === st.id); return view.layout === "board" ? boardSort(items) : items; });
  }

  function recount() {
    summary.activeDeals = deals.length;
    summary.withoutPrice = deals.filter((d) => !(d.price > 0)).length;
    summary.totalValue = deals.reduce((a, d) => a + (d.price > 0 ? d.price : 0), 0);
  }

  /** Archive / restore / delete with Undo. */
  function removeDeal(id, verb) {
    const from = deals.some((d) => d.id === id) ? deals : archived;
    const idx = from.findIndex((d) => d.id === id);
    if (idx < 0) return;
    const [deal] = from.splice(idx, 1);
    const to = verb === "archived" ? archived : verb === "restored" ? deals : null;
    if (to) { to.unshift(deal); log(deal, verb === "archived" ? "archived the deal" : "restored the deal from the archive", "status"); }
    recount();
    render();
    if (GC.dealPanel) GC.dealPanel.onRemoved(id);
    GC.toast(`Deal ${verb}`, `“${deal.name}” was ${verb}.`, "neutral", {
      label: "Undo",
      onClick: () => { if (to) to.splice(to.indexOf(deal), 1); from.splice(Math.min(idx, from.length), 0, deal); recount(); render(); },
    });
  }

  function refresh(id) { render(); if (GC.dealPanel) GC.dealPanel.refresh(id); }
  function snapshot(d) { return { stage: d.stage, status: d.status, outcome: d.outcome }; }
  function undoTo(d, snap) { return { label: "Undo", onClick: () => { Object.assign(d, snap); if (!snap.outcome) delete d.outcome; refresh(d.id); } }; }

  /** Moving a deal along the pipeline reopens a Dead deal and makes a New one Live. */
  function setStage(id, stage, quiet) {
    const d = find(id);
    if (!d || d.stage === stage) return;
    const prev = d.stage, snap = snapshot(d);
    d.stage = stage;
    log(d, `changed stage: ${GC.stageLabel(prev)} → ${GC.stageLabel(stage)}`, "stage");
    if (d.status === "dead") { delete d.outcome; d.status = "live"; log(d, "reopened the deal", "status"); }
    else if (d.status === "new" && stage !== "Received") d.status = "live";
    refresh(id);
    if (!quiet) GC.toast("Stage updated", `“${d.name}” moved from ${GC.stageLabel(prev)} to ${GC.stageLabel(stage)}.`, "success", undoTo(d, snap));
  }
  /** Outcome (Lost / Passed / Withdrawn / Cancelled) closes the deal → status Dead. */
  function setOutcome(id, outcome) {
    const d = find(id);
    if (!d || (d.status === "dead" && d.outcome === outcome)) return;
    const snap = snapshot(d);
    d.status = "dead"; d.outcome = outcome;
    log(d, `closed the deal: ${outcome}`, "status");
    refresh(id);
    GC.toast("Deal closed", `“${d.name}” marked as ${outcome}.`, "neutral", undoTo(d, snap));
  }
  /** On hold ↔ back in progress (Tracking ↔ Live). */
  function toggleHold(id) {
    const d = find(id);
    if (!d) return;
    const snap = snapshot(d), on = d.status !== "tracking";
    d.status = on ? "tracking" : "live"; delete d.outcome;
    log(d, on ? "put the deal on hold" : "resumed the deal", "status");
    refresh(id);
    GC.toast(on ? "Deal on hold" : "Deal resumed", `“${d.name}” is now ${GC.STATUSES[d.status]}.`, "neutral", undoTo(d, snap));
  }

  // ---------- Popup menus: deal actions + stage picker (ds:provisional dropdown) ----------
  let menuEl = null, menuBtn = null;
  function closeMenu() {
    if (!menuEl) return;
    menuEl.remove(); menuEl = null;
    if (menuBtn) { menuBtn.setAttribute("aria-expanded", "false"); }
  }
  function popup(btn, html, onPick, cls) {
    closeMenu();
    menuBtn = btn;
    menuEl = document.createElement("div");
    menuEl.className = "deal-menu" + (cls ? " " + cls : "");
    menuEl.setAttribute("role", "menu");
    menuEl.dataset.dsProvisional = "dropdown";
    menuEl.innerHTML = html;
    document.body.appendChild(menuEl);
    const r = btn.getBoundingClientRect();
    const below = r.bottom + 4 + menuEl.offsetHeight < window.innerHeight;
    menuEl.style.top = (below ? r.bottom + 4 : r.top - 4 - menuEl.offsetHeight) + "px";
    menuEl.style.left = Math.max(8, r.right - menuEl.offsetWidth) + "px";
    btn.setAttribute("aria-expanded", "true");
    (menuEl.querySelector('[aria-checked="true"]') || menuEl.querySelector("button")).focus();
    menuEl.addEventListener("click", (e) => { const b = e.target.closest("[data-pick]"); if (!b) return; const b0 = menuBtn; closeMenu(); onPick(b.dataset.pick); if (b0 && b0.isConnected) b0.focus(); });
    menuEl.addEventListener("keydown", (e) => {
      const items = [...menuEl.querySelectorAll("button")];
      const i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus(); }
      if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); const b = menuBtn; closeMenu(); if (b) b.focus(); }
    });
  }
  function openMenu(btn) {
    const id = btn.dataset.dealMenu;
    const isArchived = archived.some((d) => d.id === id);
    popup(btn, `${isArchived ? `<button type="button" role="menuitem" data-pick="restored">${GC.icon("refresh")}Restore deal</button>`
        : `<button type="button" role="menuitem" data-pick="archived">${GC.icon("bookmark")}Archive deal</button>`}
      <button type="button" role="menuitem" class="is-danger" data-pick="deleted">${GC.icon("bin")}Delete deal</button>`,
      (verb) => removeDeal(id, verb));
  }
  /** Stage dropdown (Figma 16338:70515): Received · Stage · Outcome · On hold. */
  function openStageMenu(btn) {
    const id = btn.dataset.stageMenu;
    const d = find(id);
    const dead = d.status === "dead";
    const check = GC.icon("check", "deal-menu__check");
    const item = (st) => `<button type="button" role="menuitemradio" class="stage-item" aria-checked="${!dead && st === d.stage}" data-pick="${st}">
        <span class="stage-chip stage-chip--row" data-stage="${st}">${GC.stageIcon(st)}${esc(GC.stageLabel(st))}${st === d.stage ? check : ""}</span></button>`;
    popup(btn, `<button type="button" role="menuitemradio" class="stage-menu__received" aria-checked="${!dead && d.stage === "Received"}" data-pick="Received">Received${d.stage === "Received" ? check : ""}</button>
      <hr class="deal-menu__sep"><p class="deal-menu__title" role="presentation">Stage</p>
      ${GC.STAGE_ORDER.slice(1).map(item).join("")}
      <hr class="deal-menu__sep"><p class="deal-menu__title" role="presentation">Outcome</p>
      ${GC.OUTCOMES.map((o) => `<button type="button" role="menuitemradio" aria-checked="${dead && d.outcome === o}" data-pick="outcome:${o}">${esc(o)}${dead && d.outcome === o ? check : ""}</button>`).join("")}
      <hr class="deal-menu__sep">
      <button type="button" role="menuitemcheckbox" class="stage-menu__hold" aria-checked="${d.status === "tracking"}" data-pick="hold">
        <span class="ds-checkbox__box stage-menu__box" aria-hidden="true"><svg class="ds-check-mark" viewBox="0 0 12 12" fill="none"><path d="M2.4 6.2 4.7 8.5 9.6 3.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>On hold</button>`,
      (pick) => {
        if (pick === "hold") toggleHold(id);
        else if (pick.startsWith("outcome:")) setOutcome(id, pick.slice(8));
        else setStage(id, pick);
      }, "stage-menu");
  }
  document.addEventListener("pointerdown", (e) => { if (menuEl && !e.target.closest(".deal-menu, [data-deal-menu], [data-stage-menu]")) closeMenu(); });
  document.addEventListener("wheel", closeMenu, { passive: true }); // user scroll closes the menu

  function bindCardActions() {
    document.getElementById("deal-list").addEventListener("click", (e) => {
      if (dragJustEnded) { dragJustEnded = false; e.preventDefault(); return; }
      const oc = e.target.closest("[data-open-comments]");
      if (oc) { GC.dealPanel.open(oc.dataset.openComments, oc, "comments"); return; }
      const open = e.target.closest("[data-open]");
      if (open) { GC.dealPanel.open(open.dataset.open, open); return; }
      const edit = e.target.closest("[data-deal-edit]");
      if (edit) { GC.dealPanel.edit(edit.dataset.dealEdit, edit); return; }
      const sm = e.target.closest("[data-stage-menu]");
      if (sm) { menuEl && menuBtn === sm ? closeMenu() : openStageMenu(sm); return; }
      const menu = e.target.closest("[data-deal-menu]");
      if (menu) { menuEl && menuBtn === menu ? closeMenu() : openMenu(menu); return; }
      const slide = e.target.closest("[data-slide]");
      if (slide) {
        const box = slide.closest("[data-slider]");
        const d = find(box.dataset.slider);
        const n = d.images.length;
        slideIdx[d.id] = ((slideIdx[d.id] || 0) + +slide.dataset.slide + n) % n;
        box.outerHTML = sliderHtml(d);
        const again = document.querySelector(`[data-slider="${d.id}"] [data-slide="${slide.dataset.slide}"]`);
        if (again) again.focus();
        return;
      }
      // The whole card opens the deal (title button stays the keyboard entry point).
      const card = e.target.closest(".deal-card");
      if (card && !e.target.closest("button, a, input, label") && !String(window.getSelection() || "")) GC.dealPanel.open(card.dataset.id, card.querySelector("[data-open]"));
    });
    bindBoardDrag();
  }

  // ---------- Kanban drag & drop (Notion-style) ----------
  // The card stays put; a 20% ghost follows the pointer and a 4px green bar marks the drop slot.
  let boardOrder = null, dragJustEnded = false;
  function bindBoardDrag() {
    const root = document.getElementById("deal-list");
    let drag = null;
    const bar = document.createElement("li");
    bar.className = "drop-indicator";
    bar.dataset.dsProvisional = "drop-indicator";
    bar.setAttribute("aria-hidden", "true");

    function cleanup() {
      if (!drag) return;
      if (drag.ghost) drag.ghost.remove();
      bar.remove();
      drag.card.classList.remove("is-drag-source");
      document.body.classList.remove("is-dragging");
      cancelAnimationFrame(drag.raf);
      drag = null;
    }
    function target(x, y) {
      const el = document.elementFromPoint(x, y);
      const col = el && el.closest(".board-col");
      if (!col) { bar.remove(); return; }
      const list = col.querySelector(".card-list");
      const cards = [...list.querySelectorAll(".board-card")];
      const before = cards.find((c) => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
      if (before !== bar.nextSibling || bar.parentNode !== list) list.insertBefore(bar, before || null);
    }
    function autoscroll() {
      if (!drag) return;
      const { x, y } = drag.last, edge = 48, step = 12;
      const rr = root.getBoundingClientRect();
      if (x < rr.left + edge) root.scrollLeft -= step; else if (x > rr.right - edge) root.scrollLeft += step;
      const col = bar.closest(".board-col");
      if (col) { const cr = col.getBoundingClientRect(); if (y < cr.top + edge) col.scrollTop -= step; else if (y > cr.bottom - edge) col.scrollTop += step; }
      drag.raf = requestAnimationFrame(autoscroll);
    }

    root.addEventListener("dragstart", (e) => { if (root.dataset.view === "board") e.preventDefault(); });
    root.addEventListener("pointerdown", (e) => {
      if (root.dataset.view !== "board" || e.button !== 0) return;
      const card = e.target.closest(".board-card");
      if (!card || e.target.closest("button, a, input, label")) return;
      drag = { card, id: card.dataset.id, x0: e.clientX, y0: e.clientY, last: { x: e.clientX, y: e.clientY }, ghost: null };
    });
    window.addEventListener("pointermove", (e) => {
      if (!drag) return;
      drag.last = { x: e.clientX, y: e.clientY };
      if (!drag.ghost) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
        const r = drag.card.getBoundingClientRect();
        drag.dx = drag.x0 - r.left; drag.dy = drag.y0 - r.top;
        drag.ghost = drag.card.cloneNode(true);
        drag.ghost.classList.add("drag-ghost");
        drag.ghost.removeAttribute("data-id");
        drag.ghost.setAttribute("aria-hidden", "true");
        drag.ghost.style.width = r.width + "px";
        document.body.appendChild(drag.ghost);
        drag.card.classList.add("is-drag-source");
        document.body.classList.add("is-dragging");
        if (GC.map) GC.map.link(drag.id, false);
        drag.raf = requestAnimationFrame(autoscroll);
      }
      drag.ghost.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px)`;
      target(e.clientX, e.clientY);
    });
    window.addEventListener("pointerup", () => {
      if (!drag) return;
      if (!drag.ghost) { drag = null; return; }
      const id = drag.id, col = bar.closest(".board-col");
      if (col) {
        // New board order = DOM order with the dragged card moved to the bar.
        const ids = [];
        root.querySelectorAll(".board-card[data-id], .drop-indicator").forEach((el) => {
          if (el === bar) ids.push(id); else if (el.dataset.id !== id) ids.push(el.dataset.id);
        });
        boardOrder = ids;
      }
      cleanup();
      dragJustEnded = true;
      setTimeout(() => { dragJustEnded = false; }, 0);
      if (!col) return;
      const d = find(id);
      if (d && d.stage !== col.dataset.stage) setStage(id, col.dataset.stage);
      else render();
    });
    window.addEventListener("keydown", (e) => { if (drag && drag.ghost && e.key === "Escape") { cleanup(); dragJustEnded = true; setTimeout(() => { dragJustEnded = false; }, 0); } });
    window.addEventListener("pointercancel", cleanup);
  }

  function update() { recount(); render(); }

  GC.inbox = { render, addDeal, deals, archived, bindLinking, view, fields, order, update, removeDeal, setStage, setOutcome, toggleHold, find, log, openMenu, openStageMenu, popup, ME };
})();
