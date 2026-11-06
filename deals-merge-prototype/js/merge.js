/* Deals merge pointer (v0): Received list, "Merge into another deal", First received, Remove from deal.
   Every deal keeps its own broker submission. Merging only adds a "merged into" pointer, so unmerge is lossless. */
window.GC = window.GC || {};

(function () {
  const esc = GC.esc;
  const ME = "Liam O'Connor";
  const F = () => GC.fmt;
  const now = () => new Date().toISOString();
  const day = (iso) => (iso ? F().dateShort(String(iso).slice(0, 10)) : "—");
  const time = (iso) => (iso && String(iso).length > 10 ? String(iso).slice(11, 16) : "");

  // ============================================================
  //  Broker submissions (one Received row each)
  // ============================================================
  function own(d) {
    if (!d.submission) {
      const doc = d.docType || "IM";
      d.submission = {
        id: "s-" + d.id, deal: d.id, broker: d.broker || null, contact: d.brokerContact || "",
        sentAt: d.sentAt || d.dateReceived || null,
        receivedAt: d.receivedAt || (d.dateReceived ? d.dateReceived + "T09:00" : null),
        price: d.quotedPrice != null ? d.quotedPrice : null, currency: d.currency || "EUR",
        doc, forwardedBy: d.forwardedBy || "",
        subject: `${doc === "Newsletter" ? "" : doc + ": "}${d.name}`,
        files: doc === "Newsletter" ? ["Report.pdf"] : doc === "Teaser" ? ["Teaser.pdf"] : ["Information memorandum.pdf", "Rent roll.xlsx", "Site plan.pdf"],
      };
    }
    return d.submission;
  }
  const bySent = (a, b) => String(a.sentAt || "9").localeCompare(String(b.sentAt || "9")) || String(a.receivedAt || "9").localeCompare(String(b.receivedAt || "9"));
  /** This deal's own submission plus those of every deal merged into it, earliest sent first. */
  function submissions(d) {
    const out = [own(d)];
    (d.mergedFrom || []).forEach((id) => { const m = GC.inbox.find(id); if (m) out.push(...submissions(m)); });
    return out.sort(bySent);
  }
  /** First received = the earliest sent date from a broker, whichever deal survives; a user can move it (with a reason). */
  function first(d) {
    const list = submissions(d);
    if (d.firstOverride) { const o = list.find((x) => x.id === d.firstOverride.subId); if (o) return o; }
    return list[0];
  }
  /** Card text: "Savills +1" (first broker + how many other brokers sent it). */
  function brokerLabel(d) {
    const f = first(d);
    if (!f || !f.broker) return null;
    const others = new Set(submissions(d).map((x) => x.broker).filter((b) => b && b !== f.broker));
    return f.broker + (others.size ? ` +${others.size}` : "");
  }
  const firstDate = (d) => { const f = first(d); return f ? f.sentAt : null; };
  /** Follow "merged into" pointers to the deal that is still live. */
  function survivor(d) {
    let x = d, guard = 0;
    while (x && x.mergedInto && guard++ < 10) x = GC.inbox.find(x.mergedInto.id);
    return x;
  }
  // ---------- How alike two deals are (mock duplicate detection for the merge dialog) ----------
  const STOP = new Set(["the", "plc", "ltd", "group", "and", "of", "park", "hub", "rp", "uk", "sweden", "malmö"]);
  const words = (t) => new Set((t || "").toLowerCase().split(/[^a-z0-9åäöé]+/).filter((w) => w.length > 2 && !STOP.has(w)));
  const near = (a, b, tol) => a > 0 && b > 0 && Math.abs(a - b) / Math.max(a, b) <= tol;
  function likeness(a, b) {
    let score = 0;
    const wa = words(a.name), wb = words(b.name);
    const shared = [...wa].filter((w) => wb.has(w)).length;
    const jac = shared / Math.max(1, new Set([...wa, ...wb]).size);
    if (shared && jac >= 0.3) score += 3 + jac * 2;
    if (a.location && a.location === b.location) { score += 1; }
    if (a.map && b.map && Math.hypot(a.map.x - b.map.x, a.map.y - b.map.y) < 60) { score += 2; }
    if (a.industry && a.industry === b.industry) score += 0.5;
    if (a.map && b.map) score += Math.max(0, 1 - Math.hypot(a.map.x - b.map.x, a.map.y - b.map.y) / 800); // closer = higher
    if (near(a.areaSqm, b.areaSqm, 0.12)) { score += 1; }
    if (near(a.price, b.price, 0.12)) { score += 0.5; }
    return { score };
  }
  const stageRank = (d) => Math.max(0, GC.STAGE_ORDER.indexOf(d.stage));

  // ============================================================
  //  Small dialogs (DS fields + buttons on the provisional modal)
  // ============================================================
  function overlay(html, cls) {
    const back = document.activeElement;
    const el = document.createElement("div");
    el.className = "dm-overlay";
    el.dataset.layer = "confirm";
    el.innerHTML = html;
    document.body.appendChild(el);
    const box = el.querySelector(".dm");
    if (cls) box.classList.add(cls);
    const release = GC.trapFocus(box);
    let onClose = null;
    function close(v) {
      release(); document.removeEventListener("keydown", onKey, true); el.remove();
      if (back && back.isConnected) back.focus();
      if (onClose) onClose(v);
    }
    function onKey(e) { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(null); } }
    document.addEventListener("keydown", onKey, true);
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-dlg-close]")) close(null); });
    return { el, box, close, set onClose(fn) { onClose = fn; } };
  }
  const headHtml = (id, title) => `<div class="reason-dlg__head"><h2 class="reason-dlg__title" id="${id}">${esc(title)}</h2>
    <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" data-dlg-close aria-label="Close"><span class="ds-btn__icon">${DS_ICONS.get("x-close")}</span></button></div>`;

  /** form({title, text, fields:[{id,label,type,value,required,options,placeholder}], confirm}) → Promise<values|null> */
  function form(o) {
    return new Promise((resolve) => {
      const field = (f) => `<div class="ds-field" data-size="small" data-state="default">
          <label class="ds-field__label" for="fd-${f.id}">${esc(f.label)}${f.required ? ' <span class="ds-field__req" aria-hidden="true">*</span>' : ""}</label>
          ${f.options ? `<div class="ds-field__box prov-select-wrap" data-ds-provisional="select"><select class="ds-field__input prov-select" id="fd-${f.id}">${f.options.map((x) => `<option${x === f.value ? " selected" : ""}>${esc(x)}</option>`).join("")}</select><span class="ds-field__icon" aria-hidden="true">${DS_ICONS.get("chevron-down")}</span></div>`
            : `<div class="ds-field__box"><input class="ds-field__input" id="fd-${f.id}" type="${f.type || "text"}" value="${esc(f.value || "")}" placeholder="${esc(f.placeholder || "")}" autocomplete="off"${f.required ? " required" : ""}></div>`}
        </div>`;
      const dlg = overlay(`<form class="dm reason-dlg" role="dialog" aria-modal="true" aria-labelledby="fd-title" data-ds-provisional="modal" novalidate>
          ${headHtml("fd-title", o.title)}
          ${o.text ? `<p class="mini-dlg__text">${o.text}</p>` : ""}
          ${o.fields.map(field).join("")}
          <div class="reason-dlg__foot">
            <button type="button" class="ds-btn" data-type="secondary" data-size="lg" data-dlg-close>Cancel</button>
            <button type="submit" class="ds-btn" data-type="primary" data-size="lg" data-fd="ok">${esc(o.confirm || "Save")}</button>
          </div></form>`);
      dlg.onClose = () => resolve(null);
      const formEl = dlg.box, ok = formEl.querySelector('[data-fd="ok"]');
      const vals = () => Object.fromEntries(o.fields.map((f) => [f.id, formEl.querySelector("#fd-" + f.id).value.trim()]));
      const valid = () => o.fields.every((f) => !f.required || vals()[f.id]);
      const sync = () => { ok.disabled = !valid(); };
      formEl.addEventListener("input", sync); formEl.addEventListener("change", sync); sync();
      formEl.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!valid()) return;
        const v = vals();
        dlg.onClose = null; dlg.close(v); resolve(v);
      });
      (formEl.querySelector("input, select")).focus();
    });
  }

  // ============================================================
  //  Received list (details drawer)
  // ============================================================
  function receivedHtml(d) {
    if (d.mergedInto) {
      const sv = survivor(d);
      return `<div class="ds-alert merge-banner" data-status="neutral" role="status"><div class="ds-alert__row"><span class="ds-alert__icon">${GC.icon("info")}</span>
        <p class="ds-alert__msg">Merged into “${esc(sv ? sv.name : "another deal")}”</p></div>
        <p class="ds-alert__subtext">By ${esc(d.mergedInto.by)}, ${day(d.mergedInto.at)}. This record stays as it was and opens from the Received list of the deal it joined.</p>
        <div class="merge-banner__acts">${sv ? `<button type="button" class="ds-btn" data-type="secondary" data-size="sm" data-merge-goto="${sv.id}"><span class="ds-btn__label">Open “${esc(sv.name)}”</span></button>` : ""}
        <button type="button" class="ds-btn" data-type="ghost" data-size="sm" data-merge-unmerge="${d.id}"><span class="ds-btn__label">Unmerge</span></button></div></div>`;
    }
    if (d.notADeal) {
      return `<div class="ds-alert merge-banner" data-status="neutral" role="status"><div class="ds-alert__row"><span class="ds-alert__icon">${GC.icon("info")}</span>
        <p class="ds-alert__msg">Marked as not a deal</p></div>
        <p class="ds-alert__subtext">By ${esc(d.notADeal.by)}, ${day(d.notADeal.at)}. Hidden from the inbox, pipeline and reports. The document stays available.</p>
        <div class="merge-banner__acts"><button type="button" class="ds-btn" data-type="secondary" data-size="sm" data-merge-isdeal="${d.id}"><span class="ds-btn__label">It's a deal: restore</span></button></div></div>`;
    }
    const list = submissions(d), f = first(d), ov = d.firstOverride && f.id === d.firstOverride.subId ? d.firstOverride : null;
    const row = (x) => {
      const merged = x.deal !== d.id ? GC.inbox.find(x.deal) : null;
      return `<tr data-sub="${x.id}"${x === f ? ' class="is-first"' : ""}>
        <td class="rcv-date">${day(x.sentAt)}${x.sentCorrected ? `<span class="rcv-edited" title="Corrected by ${esc(x.sentCorrected.by)}: ${esc(x.sentCorrected.reason)}">edited</span>` : ""}</td>
        <td><div class="rcv-broker">
            <button type="button" class="rcv-broker__btn${x.broker ? "" : " is-empty"}" data-rcv-broker="${x.id}" aria-haspopup="menu" aria-expanded="false" title="Set broker">${esc(x.broker || "Set broker")}${GC.icon("chevron-down")}</button>
            ${x === f ? `<span class="first-chip" data-ds-provisional="chip"${ov ? ` title="Moved by ${esc(ov.by)}: ${esc(ov.reason)}"` : ""}>First received</span>` : ""}
          </div>
          <div class="rcv-sub">${esc([x.contact, x.doc, x.forwardedBy ? `forwarded by ${x.forwardedBy}` : ""].filter(Boolean).join(" · "))}${merged ? ` · from merged deal “${esc(merged.name)}”` : ""}</div></td>
        <td class="rcv-date">${day(x.receivedAt)} <span class="rcv-time">${time(x.receivedAt)}</span></td>
        <td class="num">${x.price != null ? esc(F().moneyShort(x.price, x.currency)) : "n/a"}</td>
        <td class="rcv-acts">
          <button type="button" class="ds-btn" data-type="ghost" data-size="sm" data-rcv-email="${x.id}"><span class="ds-btn__icon">${DS_ICONS.get("open-in-new")}</span><span class="ds-btn__label">Email</span></button>
          <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" data-rcv-menu="${x.id}" aria-haspopup="menu" aria-expanded="false" aria-label="More for this row"><span class="ds-btn__icon">${DS_ICONS.get("more-vertical")}</span></button>
        </td></tr>`;
    };
    return `<section class="pv-card dp-received" aria-labelledby="dp-rcv-t" data-ds-provisional="received-list">
      <div class="section-heading" data-ds-provisional="section-heading"><h3 class="section-heading__title t-section-title" id="dp-rcv-t">Received <span class="count">(${list.length})</span></h3>
        <button type="button" class="ds-btn" data-type="secondary" data-size="sm" data-merge-open="${d.id}"><span class="ds-btn__icon">${DS_ICONS.get("compare")}</span><span class="ds-btn__label">Merge into another deal</span></button></div>
      <div class="pv-table-wrap"><table class="pv-table rcv-table">
        <thead><tr><th scope="col" title="When the broker sent it. Decides First received.">Sent</th><th scope="col">Broker</th><th scope="col" title="When it reached GoCanopy. Never editable.">Received</th><th scope="col" class="num">Quoted price</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${list.map(row).join("")}</tbody></table></div>
      ${ov ? `<p class="rcv-note">First received moved by ${esc(ov.by)} on ${day(ov.at)}: “${esc(ov.reason)}”. <button type="button" class="rcv-link" data-rcv-auto="${d.id}">Use the earliest sent date</button></p>` : ""}
    </section>`;
  }

  function subById(d, id) { return submissions(d).find((x) => x.id === id); }
  const refresh = (d) => { GC.inbox.render(); if (GC.dealPanel) GC.dealPanel.refresh(d.id); };

  function emailDialog(d, x) {
    const dlg = overlay(`<div class="dm reason-dlg email-dlg" role="dialog" aria-modal="true" aria-labelledby="em-title" data-ds-provisional="modal" tabindex="-1">
        ${headHtml("em-title", "Original email")}
        <dl class="email-dlg__meta">
          <dt>From</dt><dd>${esc(x.contact || "—")}${x.broker ? `, ${esc(x.broker)}` : ""}</dd>
          <dt>Sent</dt><dd>${day(x.sentAt)}${x.sentCorrected ? ` (corrected from ${day(x.sentCorrected.from)})` : ""}</dd>
          <dt>Received</dt><dd>${day(x.receivedAt)} ${time(x.receivedAt)}${x.forwardedBy ? `, forwarded by ${esc(x.forwardedBy)}` : ""}</dd>
          <dt>Subject</dt><dd>${esc(x.subject)}</dd>
        </dl>
        <ul class="email-dlg__files">${x.files.map((n) => `<li>${GC.icon("paperclip")}<span>${esc(n)}</span></li>`).join("")}</ul>
        <p class="mini-dlg__text">Prototype: the real product opens the email and files from the source inbox.</p>
      </div>`);
    dlg.box.focus();
  }

  async function setFirst(d, x) {
    const v = await form({ title: "Set as first received", confirm: "Set as first",
      text: `Mark <b>${esc(x.broker || "this row")}</b> (sent ${day(x.sentAt)}) as first received. The reason is logged.`,
      fields: [{ id: "reason", label: "Reason", required: true, placeholder: "e.g. Phone introduction on 18 Aug" }] });
    if (!v) return;
    d.firstOverride = { subId: x.id, reason: v.reason, by: ME, at: now() };
    GC.inbox.log(d, `moved First received to ${x.broker || "an unnamed broker"}: ${v.reason}`, "edit");
    refresh(d);
    GC.toast("First received updated", `${x.broker || "This row"} is now first received.`, "success");
  }
  async function correctSent(d, x) {
    const v = await form({ title: "Correct sent date", confirm: "Save",
      text: "Use the date the broker sent it, as shown in the forwarded email. The reason is logged.",
      fields: [{ id: "date", label: "Sent date", type: "date", required: true, value: String(x.sentAt || "").slice(0, 10) },
        { id: "reason", label: "Reason", required: true, placeholder: "e.g. Forwarded by a colleague 2 days later" }] });
    if (!v || v.date === String(x.sentAt).slice(0, 10)) return;
    x.sentCorrected = { from: x.sentAt, reason: v.reason, by: ME, at: now() };
    x.sentAt = v.date;
    GC.inbox.log(d, `corrected the sent date of ${x.broker || "a submission"} to ${day(v.date)}: ${v.reason}`, "edit");
    refresh(d);
  }

  // ============================================================
  //  "Merge into another deal"
  // ============================================================
  /** Best match for an incoming deal (score ≥ 3 = likely the same asset), or null. Used by the Inbox. */
  function likelyDuplicate(d) {
    const pool = GC.inbox.deals.filter((x) => x !== d).concat(GC.inbox.archived);
    const best = pool.map((x) => ({ d: x, score: likeness(d, x).score })).sort((a, b) => b.score - a.score)[0];
    return best && best.score >= 3 ? best.d : null;
  }

  function openMerge(srcId, targetId) {
    const src = GC.inbox.find(srcId);
    if (!src || !GC.inbox.deals.includes(src)) return;
    let target = null, keep = null, q = "";
    const loc = (d) => (d.location || "").split(",")[0];
    // Suggested: the 4 deals most like this one (likely duplicates first, then the closest). Anything else via search.
    const all = () => GC.inbox.deals.filter((d) => d !== src).concat(GC.inbox.archived);
    const scored = all().map((d) => Object.assign({ d }, likeness(src, d))).sort((a, b) => b.score - a.score).slice(0, 4);
    const candidates = () => {
      if (!q) return scored;
      return all().filter((d) => [d.name, d.location, ...submissions(d).map((x) => x.broker)].some((t) => (t || "").toLowerCase().includes(q)))
        .map((d) => scored.find((x) => x.d === d) || Object.assign({ d }, likeness(src, d)))
        .sort((a, b) => b.score - a.score);
    };
    const dlg = overlay(`<div class="dm merge-dlg" role="dialog" aria-modal="true" aria-labelledby="mg-title" data-ds-provisional="modal" tabindex="-1">
        ${headHtml("mg-title", "Merge into another deal")}
        <p class="mini-dlg__text">Merging “<b>${esc(src.name)}</b>” keeps both broker submissions on one deal. Nothing is deleted, and you can unmerge later.</p>
        <div class="ds-field" data-size="small"><div class="ds-field__box"><span class="ds-field__icon" aria-hidden="true">${DS_ICONS.get("search")}</span>
          <input class="ds-field__input" type="search" placeholder="Search deals by name, city or broker" aria-label="Search deals" autocomplete="off"></div></div>
        <div class="merge-dlg__list" role="radiogroup" aria-label="Deal to merge with"></div>
        <div class="merge-dlg__keep" hidden></div>
        <div class="reason-dlg__foot">
          <button type="button" class="ds-btn" data-type="secondary" data-size="lg" data-dlg-close>Cancel</button>
          <button type="button" class="ds-btn" data-type="primary" data-size="lg" data-mg="go" disabled>Merge</button>
        </div></div>`);
    const box = dlg.box, listEl = box.querySelector(".merge-dlg__list"), keepEl = box.querySelector(".merge-dlg__keep"), go = box.querySelector('[data-mg="go"]');
    // "Sent 26 Aug 2026 · Received 28 Aug 2026 08:42" from the deal's First received row
    const whenHtml = (d) => { const f = first(d); return f ? `Sent ${day(f.sentAt)} · Received ${day(f.receivedAt)} ${time(f.receivedAt)}` : ""; };
    const stageChip = (d) => `<span class="stage-chip stage-chip--static" data-stage="${esc(d.stage)}">${GC.stageIcon(d.stage)}${esc(GC.stageLabel(d.stage))}</span>`;
    function drawList() {
      const c = candidates();
      const cand = ({ d }) => {
        const closed = d.status === "dead";
        return `<button type="button" class="merge-cand" role="radio" aria-checked="${target === d}" data-mg-pick="${d.id}"${closed ? ' aria-disabled="true"' : ""}>
          <span class="merge-cand__main"><span class="merge-cand__name">${esc(d.name)}</span>
            <span class="merge-cand__sub">${esc([d.location, brokerLabel(d)].filter(Boolean).join(" · "))}</span>
            <span class="merge-cand__sub">${whenHtml(d)}</span>
            ${closed ? `<span class="merge-cand__why">Closed (${esc(d.outcome)}). A deal can't be merged into a closed one: an asset that returns after a pass stays a new deal.</span>` : ""}
</span>
          ${closed ? GC.statusChip(d) : stageChip(d)}
        </button>`;
      };
      if (!c.length) {
        listEl.innerHTML = `<p class="assign-menu__empty">${q ? `No deals match “${esc(q)}”` : "Search for the deal by name, city or broker."}</p>`;
        return;
      }
      listEl.classList.toggle("is-suggest", !q); // 4 suggestions at most: show them all without scrolling
      listEl.innerHTML = `<p class="merge-dlg__group">${q ? `Search results <span class="count">(${c.length})</span>` : "Suggested"}</p>${c.map(cand).join("")}`;
    }
    function drawKeep() {
      keepEl.hidden = !target;
      go.disabled = !target;
      if (!target) return;
      const pair = [src, target];
      const opt = (d) => `<label class="merge-keep__opt">
          <input type="radio" name="mg-keep" value="${d.id}"${keep === d ? " checked" : ""}>
          <span class="merge-keep__card"><span class="merge-keep__name">${esc(d.name)}</span>
            <span class="merge-keep__row">${stageChip(d)}${GC.statusChip(d)}${d.owner ? GC.ownerPlate(d) : `<span class="merge-keep__muted">No owner</span>`}</span>
            <span class="merge-keep__muted">${esc(brokerLabel(d) || "Broker not set")}</span>
            <span class="merge-keep__muted">${whenHtml(d)}</span>
            ${d === def ? `<span class="merge-keep__muted">Further along in the pipeline</span>` : ""}</span></label>`;
      const def = stageRank(src) > stageRank(target) ? src : stageRank(target) > stageRank(src) ? target
        : (bySent(first(src), first(target)) <= 0 ? src : target);
      const bothPipeline = src.stage !== "Received" && target.stage !== "Received";
      keepEl.innerHTML = `<p class="merge-keep__label" id="mg-keep-l">Which deal stays?</p>
        <div class="merge-keep" role="radiogroup" aria-labelledby="mg-keep-l">${pair.map(opt).join("")}</div>
        ${bothPipeline ? `<div class="ds-alert" data-status="error" role="alert"><div class="ds-alert__row"><span class="ds-alert__icon">${GC.icon("alert-circle")}</span>
          <p class="ds-alert__msg">Both deals are in the pipeline</p></div>
          <p class="ds-alert__subtext">Comments, notes and the log of the deal you merge stay on it and open from its Received row. Check you keep the right deal.</p></div>` : ""}`;
    }
    listEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mg-pick]");
      if (!b || b.getAttribute("aria-disabled") === "true") return;
      target = GC.inbox.find(b.dataset.mgPick);
      // Default survivor: the deal furthest along, so stage, owner and funds aren't lost.
      keep = stageRank(src) > stageRank(target) ? src : stageRank(target) > stageRank(src) ? target
        : (bySent(first(src), first(target)) <= 0 ? src : target);
      drawList(); drawKeep();
      const again = listEl.querySelector(`[data-mg-pick="${target.id}"]`); if (again) again.focus();
    });
    keepEl.addEventListener("change", (e) => {
      if (e.target.name !== "mg-keep") return;
      keep = GC.inbox.find(e.target.value);
    });
    box.querySelector("input[type=search]").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); drawList(); });
    go.addEventListener("click", () => {
      if (!target) return;
      const gone = keep === src ? target : src;
      dlg.close(null);
      GC.inbox.merge(gone.id, keep.id);
      GC.dealPanel.open(keep.id); // land on the merged deal, wherever the merge started
    });
    drawList();
    // Opened from an Inbox suggestion: the match is already picked.
    const pre = targetId && listEl.querySelector(`[data-mg-pick="${targetId}"]:not([aria-disabled="true"])`);
    if (pre) pre.click(); else box.querySelector("input[type=search]").focus();
  }

  // ============================================================
  //  Remove from deal (asset switch)
  // ============================================================
  async function toggleAsset(d, i, on, input) {
    const a = GC.dealPanel.assets(d)[i];
    if (!a) return;
    if (on) {
      delete a.removed;
      GC.inbox.log(d, `put asset ${i + 1} back in the deal`, "edit");
    } else {
      const v = await form({ title: "Remove from deal", confirm: "Remove",
        text: "The asset stays on the record with who, when and why. It leaves the deal's live totals, stays searchable for comps and can be put back. The quoted price stays as quoted.",
        fields: [{ id: "reason", label: "Reason", required: true, placeholder: "e.g. Vendor withdrew this unit" }] });
      if (!v) { if (input) input.checked = true; return; }
      a.removed = { by: ME, at: now(), reason: v.reason };
      GC.inbox.log(d, `removed asset ${i + 1} from the deal: ${v.reason}`, "edit");
    }
    refresh(d);
  }

  // ============================================================
  //  Delegated events (drawer + cards)
  // ============================================================
  const current = () => { const p = document.querySelector(".dp"); return p && p.dataset.deal ? GC.inbox.find(p.dataset.deal) : null; };
  document.addEventListener("click", (e) => {
    const t = e.target;
    const mo = t.closest("[data-merge-open]");
    if (mo) { openMerge(mo.dataset.mergeOpen); return; }
    const gt = t.closest("[data-merge-goto]");
    if (gt) { GC.dealPanel.open(gt.dataset.mergeGoto); return; }
    const um = t.closest("[data-merge-unmerge]");
    if (um) { const id = um.dataset.mergeUnmerge; GC.inbox.unmerge(id); GC.dealPanel.open(id); return; }
    const isd = t.closest("[data-merge-isdeal]");
    if (isd) { const id = isd.dataset.mergeIsdeal; GC.inbox.setNotADeal(id, false); GC.dealPanel.open(id); return; }
    const host = t.closest("[data-rcv-broker], [data-rcv-email], [data-rcv-menu], [data-rcv-auto]");
    if (!host) return;
    const d = current();
    if (!d) return;
    if (host.dataset.rcvAuto) {
      delete d.firstOverride;
      GC.inbox.log(d, "set First received back to the earliest sent date", "edit");
      refresh(d); return;
    }
    const x = subById(d, host.dataset.rcvBroker || host.dataset.rcvEmail || host.dataset.rcvMenu);
    if (!x) return;
    if (host.dataset.rcvEmail) { emailDialog(d, x); return; }
    if (host.dataset.rcvBroker) {
      GC.inbox.popup(host, `<p class="deal-menu__title">Broker (set by hand)</p>${GC.MOCK.brokers.map((b) => `<button type="button" role="menuitemradio" aria-checked="${b === x.broker}" data-pick="${esc(b)}">${esc(b)}${b === x.broker ? GC.icon("check", "deal-menu__check") : ""}</button>`).join("")}`,
        (b) => { if (b === x.broker) return; const was = x.broker; x.broker = b; GC.inbox.log(d, `set the broker of a submission to ${b}${was ? ` (was ${was})` : ""}`, "edit"); refresh(d); });
      return;
    }
    const isFirst = first(d) === x, merged = x.deal !== d.id ? GC.inbox.find(x.deal) : null;
    GC.inbox.popup(host, `${isFirst ? "" : `<button type="button" role="menuitem" data-pick="first">${GC.icon("star")}Set as first received</button>`}
        <button type="button" role="menuitem" data-pick="sent">${GC.icon("calendar-days")}Correct sent date</button>
        ${merged ? `<button type="button" role="menuitem" data-pick="open">${GC.icon("open-in-new")}Open merged record</button>
        <button type="button" role="menuitem" data-pick="unmerge">${GC.icon("refresh")}Unmerge “${esc(merged.name)}”</button>` : ""}`,
      (pick) => {
        if (pick === "first") setFirst(d, x);
        else if (pick === "sent") correctSent(d, x);
        else if (pick === "open") GC.dealPanel.open(merged.id);
        else if (pick === "unmerge") GC.inbox.unmerge(merged.id);
      });
  });
  document.addEventListener("change", (e) => {
    const sw = e.target.closest("[data-asset-incl]");
    if (!sw) return;
    const d = current();
    if (d) toggleAsset(d, +sw.dataset.assetIncl, sw.checked, sw);
  });

  GC.merge = { likelyDuplicate, submissions, first, brokerLabel, firstDate, survivor, receivedHtml, open: openMerge, form };
})();
