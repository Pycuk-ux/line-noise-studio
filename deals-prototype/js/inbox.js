/* Deals Inbox list (Figma 18819:252983 → row-card 18819:250337). */
window.GC = window.GC || {};

(function () {
  const esc = GC.esc;
  const deals = GC.MOCK.deals.slice();
  const summary = Object.assign({}, GC.MOCK.inboxSummary);

  function industryIcon(id) {
    const ind = GC.MOCK.industries.find((x) => x.id === id);
    return GC.icon(ind ? ind.icon : "building");
  }

  function stat(label, value) {
    return `<div class="stat"><span class="t-label">${esc(label)}</span><span class="t-value">${value == null ? "—" : esc(value)}</span></div>`;
  }

  // ---------- Card fields (settings menu) ----------
  const FIELD_KEY = "gocanopy.inbox.cardFields.v1";
  GC.CARD_FIELDS = [
    { id: "area", label: "Area" }, { id: "rent", label: "Rent" }, { id: "psm", label: "Rent/psm" },
    { id: "niy", label: "NIY" }, { id: "wault", label: "WAULT" }, { id: "occupancy", label: "Occupancy" },
    { id: "source", label: "Deal source" },
  ];
  const fields = { area: true, rent: true, psm: true, niy: false, wault: true, occupancy: true, source: true };
  try { Object.assign(fields, JSON.parse(localStorage.getItem(FIELD_KEY) || "{}")); } catch (e) { /* storage unavailable */ }

  const view = { layout: "list", sort: "newest" };

  function statsHtml(d) {
    const f = GC.fmt, sym = f.currencySymbol(d.currency || "EUR");
    const out = [];
    if (fields.area) out.push(stat("Area", d.areaSqm != null ? `${f.num(d.areaSqm, 0)} sqm` : null));
    const rentK = d.rentYearly != null ? `${sym}${f.num(d.rentYearly / 1000, 1, 1)}` : null;
    const psm = d.rentPsm != null ? `${sym}${f.num(d.rentPsm, 1, 1)}` : null;
    if (fields.rent && fields.psm) out.push(stat(`Rent (k${sym} / ${sym}psm)`, rentK || psm ? `${rentK || "—"} / ${psm || "—"}` : null));
    else if (fields.rent) out.push(stat(`Rent (k${sym})`, rentK));
    else if (fields.psm) out.push(stat("Rent/psm", psm));
    if (fields.niy) out.push(stat("NIY", d.niy != null ? `${f.num(d.niy, 1)}%` : null));
    if (fields.wault) out.push(stat("WAULT", d.wault != null ? `${f.num(d.wault, 1, 1)} years` : null));
    if (fields.occupancy) out.push(stat("Occupancy", d.occupancy != null ? `${f.num(d.occupancy, 1)}%` : null));
    if (fields.source) out.push(stat("Deal source", d.dealSource));
    return out.join("");
  }

  function ownerHtml(d) {
    return d.owner ? `<span class="ds-avatar" data-size="md" title="Owner">${esc(d.owner)}</span>`
      : `<button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" aria-label="Assign owner"><span class="ds-btn__icon">${DS_ICONS.get("plus")}</span></button>`;
  }
  function tagsHtml(d) {
    return `${d.industry ? `<span class="industry-chip" data-ds-provisional="chip">${industryIcon(d.industry)}${esc(d.industry)}</span>` : ""}
      ${d.status ? `<span class="status-pill" data-tone="${d.status.tone}" data-ds-provisional="chip">${esc(d.status.label)}</span>` : ""}
      ${d.deadline ? `<span class="deadline t-value">${GC.icon("alert-circle")}${esc(d.deadline)}</span>` : ""}`;
  }
  function locText(d) {
    return [d.location, d.assets != null ? `${d.assets} asset${d.assets === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ") || "No location";
  }
  function actionsHtml(d) {
    return `<button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" aria-label="Edit ${esc(d.name)}"><span class="ds-btn__icon">${DS_ICONS.get("edit")}</span></button>
      <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" aria-label="More actions for ${esc(d.name)}"><span class="ds-btn__icon">${DS_ICONS.get("more-vertical")}</span></button>`;
  }

  function cardHtml(d) {
    const f = GC.fmt, cur = d.currency || "EUR";
    const stats = statsHtml(d);
    return `<li class="row-card deal-card${d.isNew ? " is-new" : ""}" data-ds-provisional="row-card" data-id="${d.id}" aria-label="${esc(d.name)}">
      <div class="row-card__media">${d.image ? `<img src="${d.image}" alt="">` : GC.icon("building")}</div>
      <div class="row-card__body">
        <div class="row-card__head">
          <h3 class="t-title row-card__name">${esc(d.name)}</h3>
          <span class="row-card__loc t-muted">${GC.icon("location")}${esc(locText(d))}</span>
        </div>
        <div class="row-card__price">
          <span class="t-title">${d.price != null ? f.moneyShort(d.price, cur) : "—"}</span>
          <span class="t-muted">${esc(f.dateShort(d.dateReceived))}</span>
        </div>
        <div class="row-card__tags">${tagsHtml(d)}</div>
        <div class="row-card__owner">
          ${d.comments ? `<span class="comments t-value">${GC.icon("message-text")}${d.comments}</span>` : ""}
          ${ownerHtml(d)}
          <button type="button" class="stage-chip" data-stage="${esc(d.stage)}" data-ds-provisional="chip" aria-label="Deal stage: ${esc(d.stage)}">${esc(stageLabel(d.stage))}${GC.icon("chevron-down")}</button>
        </div>
        ${stats ? `<div class="row-card__stats">${stats}</div>` : ""}
      </div>
      <div class="row-card__actions">${actionsHtml(d)}</div>
    </li>`;
  }

  /** Compact card for the kanban board (ds:provisional board-card). */
  function boardCardHtml(d) {
    const f = GC.fmt, cur = d.currency || "EUR";
    const stats = statsHtml(d);
    return `<li class="board-card deal-card${d.isNew ? " is-new" : ""}" data-ds-provisional="board-card" data-id="${d.id}" aria-label="${esc(d.name)}">
      ${d.image ? `<div class="board-card__media"><img src="${d.image}" alt=""></div>` : ""}
      <div class="board-card__top">
        <h3 class="t-title board-card__name">${esc(d.name)}</h3>
        <div class="board-card__actions">${actionsHtml(d)}</div>
      </div>
      <span class="row-card__loc t-muted">${GC.icon("location")}${esc(locText(d))}</span>
      <div class="board-card__price"><span class="t-title">${d.price != null ? f.moneyShort(d.price, cur) : "—"}</span><span class="t-muted">${esc(f.dateShort(d.dateReceived))}</span></div>
      <div class="row-card__tags board-card__tags">${tagsHtml(d)}</div>
      ${stats ? `<div class="board-card__stats">${stats}</div>` : ""}
      <div class="board-card__foot">${d.comments ? `<span class="comments t-value">${GC.icon("message-text")}${d.comments}</span>` : "<span></span>"}${ownerHtml(d)}</div>
    </li>`;
  }

  // ---------- Stages ----------
  const STAGES = [
    { id: "Received", short: "RCVD" }, { id: "SCR", short: "SCR" }, { id: "QUAL", short: "QUAL" }, { id: "LOI", short: "LOI" },
    { id: "DD", short: "DD" }, { id: "SPA", short: "SPA" }, { id: "Completed", short: "CL" }, { id: "Declined", short: "DECL" },
  ];
  function stageLabel(id) { return id; }
  function stageHead(st, list) {
    const total = list.reduce((sum, d) => sum + (d.price > 0 ? d.price : 0), 0);
    return `<div class="stage-group__sticky"><div class="stage-group__head" data-stage="${st.id}">
      <span class="stage-group__name" title="${esc(st.id)}">${esc(st.short)} <span class="stage-group__count">(${list.length})</span></span>
      <span class="stage-group__total">${total > 0 ? GC.fmt.moneyShort(total, "EUR") : ""}</span>
    </div></div>`;
  }

  function sorted(list) {
    const by = {
      newest: (a, b) => (b.dateReceived || "").localeCompare(a.dateReceived || "") || (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0),
      oldest: (a, b) => (a.dateReceived || "").localeCompare(b.dateReceived || ""),
      price: (a, b) => (b.price || -1) - (a.price || -1),
      deadline: (a, b) => (b.deadline ? 1 : 0) - (a.deadline ? 1 : 0),
    }[view.sort === "stage" ? "newest" : view.sort];
    // newly added deals stay on top in date sorts
    return list.slice().sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || by(a, b));
  }

  // ---------- Render ----------
  function renderSummary() {
    document.getElementById("inbox-total").textContent = GC.fmt.moneyShort(summary.totalValue, "EUR");
    document.getElementById("inbox-sub").textContent = `${summary.activeDeals} active deals | ${summary.withoutPrice} without price`;
  }

  function render() {
    const root = document.getElementById("deal-list");
    const list = sorted(deals);
    const mode = view.layout === "board" ? "board" : view.sort === "stage" ? "grouped" : "list";
    root.dataset.view = mode;
    if (mode === "list") {
      root.innerHTML = `<ul class="card-list">${list.map(cardHtml).join("")}</ul>`;
    } else if (mode === "grouped") {
      root.innerHTML = STAGES.map((st) => {
        const items = list.filter((d) => d.stage === st.id);
        return `<section class="stage-group" data-ds-provisional="stage-group" data-stage="${st.id}" aria-label="${esc(st.id)}, ${items.length} deals">
          ${stageHead(st, items)}${items.length ? `<ul class="card-list">${items.map(cardHtml).join("")}</ul>` : ""}</section>`;
      }).join("");
    } else {
      root.innerHTML = STAGES.map((st) => {
        const items = list.filter((d) => d.stage === st.id);
        return `<section class="board-col stage-group" data-ds-provisional="board-column" data-stage="${st.id}" aria-label="${esc(st.id)}, ${items.length} deals">
          ${stageHead(st, items)}<ul class="card-list">${items.map(boardCardHtml).join("")}</ul></section>`;
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
    document.getElementById("sort-select").addEventListener("change", (e) => { view.sort = e.target.value; render(); });
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
      if (GC.map) GC.map.link(card.dataset.id, on);
    };
    list.addEventListener("mouseover", handler(true));
    list.addEventListener("mouseout", handler(false));
    bindControls();
  }

  function addDeal(deal) {
    deals.unshift(deal);
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

  GC.inbox = { render, addDeal, deals, bindLinking, view, fields };
})();
