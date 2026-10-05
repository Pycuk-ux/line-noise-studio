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

  function cardHtml(d) {
    const f = GC.fmt;
    const cur = d.currency || "EUR";
    const sym = f.currencySymbol(cur);
    const rent = d.rentYearly != null ? `${sym}${f.num(d.rentYearly / 1000, 1, 1)} / ${sym}${d.rentPsm == null ? "—" : f.num(d.rentPsm, 1, 1)}` : null;
    const loc = [d.location, d.assets != null ? `${d.assets} asset${d.assets === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ");
    return `<li class="row-card${d.isNew ? " is-new" : ""}" data-ds-provisional="row-card" data-id="${d.id}" aria-label="${esc(d.name)}">
      <div class="row-card__media">${d.image ? `<img src="${d.image}" alt="">` : GC.icon("building")}</div>
      <div class="row-card__body">
        <div class="row-card__head">
          <h3 class="t-title row-card__name">${esc(d.name)}</h3>
          <span class="row-card__loc t-muted">${GC.icon("location")}${esc(loc || "No location")}</span>
        </div>
        <div class="row-card__price">
          <span class="t-title">${d.price != null ? f.moneyShort(d.price, cur) : "—"}</span>
          <span class="t-muted">${esc(f.dateShort(d.dateReceived))}</span>
        </div>
        <div class="row-card__tags">
          ${d.industry ? `<span class="industry-chip" data-ds-provisional="chip">${industryIcon(d.industry)}${esc(d.industry)}</span>` : ""}
          ${d.status ? `<span class="status-pill" data-tone="${d.status.tone}" data-ds-provisional="chip">${esc(d.status.label)}</span>` : ""}
          ${d.deadline ? `<span class="deadline t-value">${GC.icon("alert-circle")}${esc(d.deadline)}</span>` : ""}
        </div>
        <div class="row-card__owner">
          ${d.comments ? `<span class="comments t-value">${GC.icon("message-text")}${d.comments}</span>` : ""}
          ${d.owner ? `<span class="ds-avatar" data-size="md" title="Owner">${esc(d.owner)}</span>`
                    : `<button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" aria-label="Assign owner"><span class="ds-btn__icon">${DS_ICONS.get("plus")}</span></button>`}
          <button type="button" class="stage-chip" data-stage="${esc(d.stage)}" data-ds-provisional="chip" aria-label="Deal stage: ${esc(d.stage)}">${esc(d.stage)}${GC.icon("chevron-down")}</button>
        </div>
        <div class="row-card__stats">
          ${stat("Area", d.areaSqm != null ? `${f.num(d.areaSqm, 0)} sqm` : null)}
          ${stat(`Rent (k${sym} / ${sym}psm)`, rent)}
          ${stat("WAULT", d.wault != null ? `${f.num(d.wault, 1, 1)} years` : null)}
          ${stat("Occupancy", d.occupancy != null ? `${f.num(d.occupancy, 1)}%` : null)}
          ${stat("Deal source", d.dealSource)}
        </div>
      </div>
      <div class="row-card__actions">
        <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" aria-label="Edit ${esc(d.name)}"><span class="ds-btn__icon">${DS_ICONS.get("edit")}</span></button>
        <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" aria-label="More actions for ${esc(d.name)}"><span class="ds-btn__icon">${DS_ICONS.get("more-vertical")}</span></button>
      </div>
    </li>`;
  }

  function renderSummary() {
    document.getElementById("inbox-total").textContent = GC.fmt.moneyShort(summary.totalValue, "EUR");
    document.getElementById("inbox-sub").textContent = `${summary.activeDeals} active deals | ${summary.withoutPrice} without price`;
  }

  function render() {
    document.getElementById("deal-list").innerHTML = deals.map(cardHtml).join("");
    renderSummary();
  }

  function addDeal(deal) {
    deals.unshift(deal);
    summary.activeDeals += 1;
    if (deal.price > 0) summary.totalValue += deal.price; else summary.withoutPrice += 1;
    render();
    const li = document.querySelector(`.row-card[data-id="${deal.id}"]`);
    if (li) {
      li.scrollIntoView({ block: "nearest", behavior: "smooth" });
      setTimeout(() => { li.classList.remove("is-new"); deal.isNew = false; }, 4000);
    }
    GC.inbox.lastAdded = deal; // handy for inspection in the console
  }

  GC.inbox = { render, addDeal, deals };
})();
