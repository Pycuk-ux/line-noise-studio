/* Inbox: incoming deals waiting for a decision (merge proposal v0).
   Every email or upload becomes a deal at stage Received. Here the analyst decides, per deal:
   merge it into an existing deal (a duplicate), move it to the pipeline, pass, or mark it not a deal. */
window.GC = window.GC || {};

(function () {
  const esc = GC.esc;
  const F = () => GC.fmt;
  const day = (iso) => (iso ? F().dateShort(String(iso).slice(0, 10)) : "—");
  const time = (iso) => (iso && String(iso).length > 10 ? String(iso).slice(11, 16) : "");
  const root = () => document.getElementById("triage-view");

  function receivedLine(d) {
    const x = GC.merge.first(d);
    if (!x) return "";
    if (!x.broker && d.enteredBy) return `<p class="triage-card__rcv">Added by hand by <b>${esc(d.enteredBy)}</b> · broker not set · Received ${day(x.receivedAt)} ${time(x.receivedAt)}</p>`;
    return `<p class="triage-card__rcv">From <b>${esc(x.broker || "broker not set")}</b>${x.contact ? ` (${esc(x.contact)})` : ""} · ${esc(x.doc)}
      · Sent ${day(x.sentAt)} · Received ${day(x.receivedAt)} ${time(x.receivedAt)}${x.forwardedBy ? `, forwarded by ${esc(x.forwardedBy)}` : ""}</p>`;
  }

  /** A likely duplicate: in the pipeline → merge it; closed → it stays a new deal (merge blocked). */
  function dupHtml(d, m) {
    if (!m) return "";
    const f = GC.merge.first(m);
    if (m.status === "dead") {
      return `<div class="triage-dup" data-kind="closed">${GC.icon("info")}<p>Seen before: <button type="button" class="triage-link" data-open="${m.id}">${esc(m.name)}</button>
        was closed (${esc(m.outcome)}${f ? `, first received ${day(f.sentAt)}` : ""}). An asset that returns after a pass stays a new deal.</p></div>`;
    }
    const where = m.stage === "Received" ? "also in the Inbox" : `in the pipeline at ${GC.stageLabel(m.stage)}`;
    const first = f && GC.merge.first(d) && f.sentAt <= GC.merge.first(d).sentAt ? f : GC.merge.first(d);
    return `<div class="triage-dup" data-kind="open">${GC.icon("alert-circle")}<p>Looks like <button type="button" class="triage-link" data-open="${m.id}">${esc(m.name)}</button>, ${esc(where)}
      (${esc(GC.merge.brokerLabel(m) || "broker not set")}, sent ${day(f && f.sentAt)}${m.owner ? `, owner ${esc(GC.userName(m.owner))}` : ""}).
      If merged, First received: <span class="first-chip">${esc(first.broker || "broker not set")}, ${day(first.sentAt)}</span></p></div>`;
  }

  function cardHtml(d) {
    const m = GC.merge.likelyDuplicate(d);
    const mergeable = m && m.status !== "dead";
    const merge = mergeable
      ? `<button type="button" class="ds-btn" data-type="primary" data-size="md" data-tr="merge" data-target="${m.id}"><span class="ds-btn__icon">${DS_ICONS.get("compare")}</span><span class="ds-btn__label">Merge</span></button>
         <button type="button" class="ds-btn" data-type="secondary" data-size="md" data-tr="accept"><span class="ds-btn__label">Move to pipeline</span></button>`
      : `<button type="button" class="ds-btn" data-type="primary" data-size="md" data-tr="accept"><span class="ds-btn__label">Move to pipeline</span></button>
         <button type="button" class="ds-btn" data-type="secondary" data-size="md" data-tr="merge"><span class="ds-btn__icon">${DS_ICONS.get("compare")}</span><span class="ds-btn__label">Merge…</span></button>`;
    const n = d.assets;
    return `<li class="triage-card${d.isNew ? " is-new" : ""}" data-id="${d.id}" data-ds-provisional="triage-card">
      <div class="triage-card__main">
        <div class="triage-card__top">
          <h3 class="t-title triage-card__name"><button type="button" class="deal-link" data-open="${d.id}">${esc(d.name)}</button></h3>
          <span class="t-title triage-card__price" title="Quoted price">${d.quotedPrice != null ? esc(F().moneyShort(d.quotedPrice, d.currency || "EUR")) : "No price"}</span>
        </div>
        <div class="triage-card__meta">${d.industry ? `<span class="industry-chip" data-ds-provisional="chip">${GC.industryIcon(d.industry)}${esc(d.industry)}</span>` : ""}
          <span class="row-card__loc">${GC.icon("location")}<span>${esc([d.location, n != null ? `${n} asset${n === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ") || "No location")}</span></span></div>
        ${receivedLine(d)}
        ${dupHtml(d, m)}
      </div>
      <div class="triage-card__acts">
        ${merge}
        <button type="button" class="ds-btn" data-type="ghost" data-size="md" data-tr="notdeal"><span class="ds-btn__label">Not a deal</span></button>
        <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="md" data-tr="more" aria-haspopup="menu" aria-expanded="false" aria-label="More for ${esc(d.name)}"><span class="ds-btn__icon">${DS_ICONS.get("more-vertical")}</span></button>
      </div>
    </li>`;
  }

  function render() {
    const el = root();
    if (!el || !GC.inbox) return;
    const list = GC.inbox.incoming().slice().sort((a, b) => String((GC.merge.first(b) || {}).receivedAt || "").localeCompare(String((GC.merge.first(a) || {}).receivedAt || "")));
    const dups = list.filter((d) => { const m = GC.merge.likelyDuplicate(d); return m && m.status !== "dead"; }).length;
    el.innerHTML = `<div class="triage__head">
        <div><h2 class="t-section-title triage__title">To review <span class="count">(${list.length})</span></h2>
          <p class="triage__sub">Every email or upload lands here as a deal. Decide what it is: merge a duplicate into the deal it belongs to, move a new deal to the pipeline, pass, or mark it not a deal.</p></div>
        ${dups ? `<span class="ds-badge triage__badge" data-type="neutral">${dups} possible duplicate${dups === 1 ? "" : "s"}</span>` : ""}
      </div>
      ${list.length ? `<ul class="triage__list">${list.map(cardHtml).join("")}</ul>`
        : `<div class="empty-state" data-ds-provisional="empty-state">${GC.icon("circle-check")}<p class="t-title">Inbox is clear</p><p class="t-muted">New emails and uploads will show up here.</p></div>`}`;
  }

  document.addEventListener("click", (e) => {
    const el = root();
    if (!el || !el.contains(e.target)) return;
    const open = e.target.closest("[data-open]");
    if (open) { GC.dealPanel.open(open.dataset.open, open); return; }
    const b = e.target.closest("[data-tr]");
    if (!b) return;
    const id = b.closest(".triage-card").dataset.id;
    const act = b.dataset.tr;
    if (act === "accept") GC.inbox.accept(id);
    else if (act === "merge") GC.merge.open(id, b.dataset.target);
    else if (act === "notdeal") GC.inbox.setNotADeal(id, true);
    else if (act === "more") {
      GC.inbox.popup(b, `<button type="button" role="menuitem" data-pick="open">${GC.icon("open-in-new")}Open details</button>
        <button type="button" role="menuitem" data-pick="merge">${GC.icon("compare")}Merge into another deal</button>
        <button type="button" role="menuitem" data-pick="pass">${GC.icon("cancel")}Pass</button>`,
      (pick) => (pick === "open" ? GC.dealPanel.open(id, b) : pick === "merge" ? GC.merge.open(id) : GC.inbox.setOutcome(id, "Passed")));
    }
  });

  GC.triage = { render };
})();
