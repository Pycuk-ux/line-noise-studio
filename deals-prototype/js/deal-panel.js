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
      deadlineDate: d.deadline ? "2026-09-14" : "",
      market: "On-Market",
      gla: d.areaSqm != null ? Math.round(d.areaSqm * 0.94) : null,
      yearBuilt: 2008,
      condition: "Good",
      noi: d.rentYearly != null ? Math.round(d.rentYearly * 0.86) : null,
      exitYield: 9.5,
      ltv: 55,
    };
    Object.keys(def).forEach((k) => { if (!(k in x)) x[k] = def[k]; });
    if (!x.assetList && d.record && d.record.assets && d.record.assets.length) {
      x.assetList = d.record.assets.map((a) => ({
        type: a.type || "", address: a.address || "",
        area: a.a_area != null ? a.a_area : null, price: a.a_price != null ? a.a_price : null,
        occupancy: a.a_occupancy != null ? a.a_occupancy : null, rent: a.a_rent != null ? a.a_rent : null,
      }));
    }
    if (!x.assetList) {
      const n = Math.max(1, Math.min(d.assets || 1, 4));
      const city = (d.location || "").split(",")[0] || "Malmö";
      // Mock split of the deal totals across its assets (uneven, but sums back to the deal).
      const w = [[1], [0.6, 0.4], [0.45, 0.35, 0.2], [0.4, 0.25, 0.2, 0.15]][n - 1];
      const part = (v, i) => (v == null ? null : Math.round(v * w[i]));
      x.assetList = Array.from({ length: n }, (_, i) => ({
        type: d.industry && d.industry !== "Mixed-use" ? d.industry : ["Logistics", "Office", "Retail"][i % 3],
        address: `${["Innovationsallee", "Stratumseind", "Hamngatan", "Westbridge Road"][i]} ${12 + i * 7}, ${city}`,
        area: part(d.areaSqm, i), price: part(d.price, i), rent: part(d.rentYearly, i),
        occupancy: d.occupancy == null ? null : Math.min(100, Math.round((d.occupancy + [0, -2.5, 1.5, -4][i]) * 10) / 10),
      }));
    }
    x.assetList.forEach((a) => ["area", "price", "occupancy", "rent"].forEach((k) => { if (!(k in a)) a[k] = null; }));
    return x;
  }

  /** Per-asset Rent/psm and NIY (auto, same formulas as the deal-level metrics). */
  function assetMetrics(a) {
    return {
      psm: a.rent > 0 && a.area > 0 ? f().num(a.rent / a.area, 2) : null,
      niy: a.rent > 0 && a.price > 0 ? f().num((a.rent / a.price) * 100, 2) : null,
    };
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

  /** Header thumbnail with photo slider (Figma img-container 140×96). */
  function coverHtml(d) {
    const imgs = d.images || [];
    if (!imgs.length) return `<div class="dp-thumb is-empty">${GC.icon("building")}</div>`;
    photo = Math.min(photo, imgs.length - 1);
    return `<div class="dp-thumb"><img src="${imgs[photo]}" alt="${esc(d.name)}, photo ${photo + 1} of ${imgs.length}">
      <span class="board-card__count">${photo + 1} / ${imgs.length}</span>
      ${imgs.length > 1 ? `<span class="board-card__nav">
        <button type="button" data-dp-photo="-1" aria-label="Previous photo">${GC.icon("chevron-left")}</button>
        <button type="button" data-dp-photo="1" aria-label="Next photo">${GC.icon("chevron-right")}</button></span>` : ""}
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

  let assetSort = { key: "idx", dir: 1 };
  const ASSET_COLS = [
    ["idx", "#"], ["name", "Assets"], ["city", "City"], ["address", "Address"], ["type", "Industry"], ["area", "Area (sqm)"],
    ["price", "Price (€)"], ["occupancy", "Occupancy"], ["rent", "Rent (€)"], ["psm", "Rent (€/sqm)"], ["niy", "Cap rate"],
  ];
  function assetRows(d, x) {
    const base = d.name.split(",")[0];
    const rows = x.assetList.map((a, i) => {
      const m = assetMetrics(a);
      const parts = (a.address || "").split(",").map((p) => p.trim());
      return Object.assign({}, a, { idx: i + 1, name: `${base} ${i + 1}`, city: parts.length > 1 ? parts[parts.length - 1] : (d.location || "").split(",")[0],
        address: parts[0] || "", psm: m.psm != null ? +m.psm.replace(/,/g, "") : null, niy: m.niy != null ? +m.niy.replace(/,/g, "") : null });
    });
    const { key, dir } = assetSort;
    return rows.sort((p, q) => {
      const a = p[key], b = q[key];
      if (a == null) return 1; if (b == null) return -1;
      return (typeof a === "number" ? a - b : String(a).localeCompare(String(b))) * dir;
    });
  }
  function assetTableHtml(d, x) {
    const F = f(), rows = assetRows(d, x);
    const sum = (k) => rows.reduce((t, r) => t + (r[k] || 0), 0);
    const area = sum("area"), price = sum("price"), rent = sum("rent");
    const n = (v, dp) => (v == null ? "—" : F.num(v, dp));
    return `<div class="pv-table-wrap"><table class="pv-table dp-assets">
      <thead><tr>${ASSET_COLS.map(([k, l]) => {
        const on = assetSort.key === k;
        return `<th scope="col" aria-sort="${on ? (assetSort.dir > 0 ? "ascending" : "descending") : "none"}"><button type="button" class="dp-sort" data-dp-sort="${k}">${esc(l)}${k === "idx" ? "" : GC.icon("sort-icon")}</button></th>`;
      }).join("")}</tr></thead>
      <tbody>
        <tr class="dp-assets__total"><td></td><td>Total</td><td></td><td></td><td></td><td>${area ? F.num(area, 0) : "—"}</td><td>${price ? F.num(price, 0) : "—"}</td>
          <td>${d.occupancy != null ? F.num(d.occupancy, 1) + "%" : "—"}</td><td>${rent ? F.num(rent, 0) : "—"}</td>
          <td>${rent && area ? "€" + F.num(rent / area, 1) : "—"}</td><td>${rent && price ? F.num((rent / price) * 100, 2) + "%" : "—"}</td></tr>
        ${rows.map((r) => `<tr><td class="num">${r.idx}</td><td><button type="button" class="dp-asset-link">${esc(r.name)}</button></td><td>${esc(r.city || "—")}</td><td>${esc(r.address || "—")}</td>
          <td>${r.type ? `<span class="industry-chip" data-ds-provisional="chip">${esc(r.type)}</span>` : "—"}</td>
          <td>${n(r.area, 0)}</td><td>${n(r.price, 0)}</td><td>${r.occupancy != null ? F.num(r.occupancy, 1) + "%" : "—"}</td><td>${n(r.rent, 0)}</td>
          <td>${r.psm != null ? "€" + F.num(r.psm, 1) : "—"}</td><td>${r.niy != null ? F.num(r.niy, 2) + "%" : "—"}</td></tr>`).join("")}
      </tbody></table></div>`;
  }

  /** Mini map: assets as numbered dark pins, comps as numbered green pins (toggle "Show Comps"). */
  let showComps = true;
  function miniMapHtml(d, x) {
    const assetPins = x.assetList.map((a, i) => {
      const ang = (i / Math.max(1, x.assetList.length)) * Math.PI * 2;
      return `<span class="dp-pin" data-kind="asset" style="left:${50 + Math.cos(ang) * 14}%;top:${50 + Math.sin(ang) * 18}%">${i + 1}</span>`;
    }).join("");
    const compPins = showComps ? [[22, 30], [68, 22], [78, 62], [30, 72], [58, 80], [14, 52], [86, 40], [44, 16]].map(([l, t], i) =>
      `<span class="dp-pin" data-kind="comp" style="left:${l}%;top:${t}%">${i + 1}</span>`).join("") : "";
    return `<section class="pv-card dp-map" aria-label="Map of assets and comps">
      <div class="dp-map__view">${GC.map.baseSvg(d.map, { w: 760, h: 540 })}${compPins}${assetPins}</div>
      <label class="ds-control ds-switch dp-map__comps"><span>Show Comps</span><input type="checkbox" role="switch" data-dp-comps ${showComps ? "checked" : ""}><span class="ds-switch__track"><span class="ds-switch__thumb"></span></span></label>
      <div class="map-zoom dp-map__zoom" aria-hidden="true"><span>${GC.icon("plus")}</span><span class="map-zoom__divider"></span><span>${GC.icon("minus")}</span><span class="map-zoom__divider"></span><span>${GC.icon("layers")}</span></div>
      <div class="dp-map__legend"><span><i data-kind="asset"></i>Assets</span><span><i data-kind="comp"></i>Comps</span></div>
    </section>`;
  }

  // Figma "Deal Details | Viewport view" (16292:69643). Comps, Documents and the AI deal memo live on their own tabs.
  function contentHtml(d) {
    const F = f(), x = ext(d);
    const ind = d.industry;
    const addr = (x.assetList[0] && x.assetList[0].address) || d.location || "No location";
    const tags = [["Last-mile Logistics Investment", "positive"], ["12 min to rail terminal", "positive"], ["Excellent Multimodal Connectivity", "positive"], ["High-specification Warehouses", "negative"], ["High Vacancy Concentration Risk", "negative"]];
    const highlights = [["Attractive Entry Yield", "Portfolio comprises 3 logistics assets totalling 37,380 sqm within a 4 km radius."], ["35% Reversion Upside", "100% occupancy across DHL Supply Chain, Kuehne+Nagel and a Fortune 500 e-commerce tenant."], ["Value-Add Asset Management", "100% CPI-indexed leases provide strong inflation hedge over the 5-year hold."], ["Freehold, Diversified Income", "Estimated 8–14% mark-to-market upside on 38% of GLA over the next 4 years."]];
    const risks = [["Near-Term Lease Expiry Concentration", "The portfolio carries a WAULT to break of only 3.00 years."], ["Reversionary Execution Risk", "The investment thesis is predicated on closing a 35% reversion gap."], ["Tenant Covenant Quality", "The portfolio's 17 tenants are predominantly SMEs."], ["Structural & Repair Liability Exposure", "Steel truss and portal frame construction with pitched roofs."]];
    const n = x.assetList.length;
    return `
      <div class="dp-head">
        ${coverHtml(d)}
        <div class="dp-head__info">
          <div class="dp-head__chips">
            ${ind ? `<span class="industry-chip" data-ds-provisional="chip">${GC.icon("building")}${esc(ind)}</span>` : ""}
            <button type="button" class="stage-chip" data-stage="${esc(d.stage)}" data-stage-menu="${d.id}" data-ds-provisional="chip" aria-haspopup="menu" aria-expanded="false" aria-label="Deal stage: ${esc(d.stage)}. Change stage">${esc(d.stage)}${GC.icon("chevron-down")}</button>
          </div>
          <h2 class="dp-head__title" id="dp-title">${esc(d.name)}</h2>
          <div class="dp-head__addr">${GC.icon("location")}<span>${esc(addr)}</span></div>
        </div>
      </div>

      <div class="metrics dp-metrics" data-ds-provisional="key-metrics">
        ${metric("Area", d.areaSqm != null ? F.num(d.areaSqm, 0) : null, "sqm")}
        ${metric("Price", d.price != null ? F.moneyShort(d.price, "EUR") : null)}
        ${metric("Occupancy", d.occupancy != null ? F.num(d.occupancy, 1) : null, "%")}
        ${metric("Rent", d.rentYearly != null ? F.money(d.rentYearly, "EUR") : null)}
        ${metric("Rent (€/sqm)", d.rentPsm != null ? "€" + F.num(d.rentPsm, 1) : null)}
        ${metric("Total assets", String(n))}
        ${metric("Cap rate", d.niy != null ? F.num(d.niy, 1) : null, "%")}
      </div>

      <div class="dp-grid">
        <section class="pv-card" aria-label="Overview">
          <div class="ds-segmented dp-tabs" role="group" aria-label="Overview sections">
            ${[["overview", "Overview"], ["physical", "Physical"], ["financial", "Financial"]].map(([id, l]) => `<button type="button" class="ds-segment" data-dp-tab="${id}" aria-pressed="${overviewTab === id}">${l}</button>`).join("")}
          </div>
          <div class="ov-rows dp-overview">${overviewRows(d, x)}</div>
        </section>
        <section class="pv-card dp-summary">
          ${heading("AI Summary", linkBtn("Ask follow-up"), null, "ai").replace("</h3>", ` <span class="count">(30 Sep 2026)</span></h3>`)}
          <div class="dp-tags">${tags.map(([t, k]) => `<span class="ds-badge" data-type="${k}">${esc(t)}</span>`).join("")}</div>
          <p class="dp-text" data-clamped="true" id="dp-summary-text">${esc(d.name)} is a prime ${esc((ind || "commercial").toLowerCase())} investment in a key European hub. The asset comprises ${n} modern, high-specification buildings with ${d.occupancy != null ? F.num(d.occupancy, 1) + "%" : "high"} occupancy and long-term leases to creditworthy tenants. The location benefits from excellent multimodal connectivity — direct motorway access and 12 min to the rail terminal. Occupancy and long-term leases to creditworthy tenants provide a resilient income profile, while the 35% reversion gap offers value-add upside over the hold period.</p>
          <button type="button" class="dp-more" data-dp-more aria-controls="dp-summary-text" aria-expanded="false">Show more ...</button>
          <div class="dp-summary-foot"><span class="dp-icons">${["copy", "like", "dislike", "edit"].map((i) => `<button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" aria-label="${i}"><span class="ds-btn__icon">${DS_ICONS.get(i)}</span></button>`).join("")}</span>${linkBtn("3 sources")}</div>
        </section>
        ${miniMapHtml(d, x)}
        <section class="pv-card dp-assets-card" aria-labelledby="dp-assets-t">
          <div class="section-heading" data-ds-provisional="section-heading"><h3 class="section-heading__title t-section-title" id="dp-assets-t">Assets</h3></div>
          ${assetTableHtml(d, x)}
        </section>
      </div>

      <div class="pv-row pv-row--half">
        <section class="pv-card">${heading("Key Highlights", linkBtn("See all"), 6)}
          <ul class="dp-list">${highlights.map(([t, s]) => `<li><span class="dp-list__dot is-pos"></span><div><p class="t-value">${t}</p><p class="t-label">${s}</p></div></li>`).join("")}</ul></section>
        <section class="pv-card">${heading("Investment Risks", linkBtn("See all"), 8)}
          <ul class="dp-list">${risks.map(([t, s]) => `<li>${GC.icon("risk-level")}<div><p class="t-value">${t}</p><p class="t-label">${s}</p></div></li>`).join("")}</ul></section>
      </div>`;
  }

  // ============================================================
  //  Drawer tabs (Figma 18831:258397) — Comments 18831:260095, Log activity 18831:260029
  // ============================================================
  // Order and labels from Figma 16292:69643 tab-bar; Assets/Comps/Documents/AI Assistant are not built yet.
  const DP_TABS = [["details", "Deal Details"], ["assets", "Assets", true], ["comps", "Comps", true], ["documents", "Documents", true],
    ["ai", "AI Assistant", true], ["comments", "Comments"], ["logs", "Log"]];
  let dpTab = "details";
  const COMMENT_TEXT = [
    "Shared the IM with the team — rent roll looks clean, two leases roll in 2027. @{Sarah Chen} can you check the break options?",
    "Broker confirmed the vendor is open to an off-market process if we move before the LOI deadline.",
    "Can we get a second opinion on the roof condition? Survey photos are a few years old.\ncc. @{Yusuf Ali}",
    "Cap rate is in line with the last two comps in the area. Happy to proceed to the next stage.",
    "@{Liam O'Connor} added the updated rent schedule to Documents.",
    "Flagging the tenant concentration — top tenant is ~38% of income.",
  ];
  const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
  const dayStart = (t) => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime(); };
  function ago(iso) {
    const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 1) return "Just now";
    if (m < 60) return `${m} min ago`;
    if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
    const days = Math.round(m / 1440);
    return days === 1 ? "Yesterday" : days < 7 ? `${days} days ago` : f().dateShort(iso.slice(0, 10));
  }
  // Avatar tints per person (Figma comments: emerald / indigo circles with one initial)
  const TINTS = ["emerald", "indigo", "yellow", "purple", "cyan", "red"];
  function avatar(name, size) {
    const users = GC.MOCK.users;
    const i = Math.max(0, users.findIndex((x) => x.name === name));
    return `<span class="dp-avatar" data-tint="${TINTS[i % TINTS.length]}"${size ? ` data-size="${size}"` : ""} aria-hidden="true">${esc((name || "?")[0])}</span>`;
  }
  /** Comment text → HTML with @mentions highlighted. Stored mentions are @{Full Name}; typed ones match a team member's name. */
  function richText(text) {
    const names = GC.MOCK.users.map((u) => u.name).sort((p, q) => q.length - p.length);
    let html = esc(text).replace(/@\{([^}]+)\}/g, (_, n) => `<span class="mention">@${n}</span>`);
    names.forEach((n) => {
      const en = esc(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      html = html.replace(new RegExp(`(^|[\\s(])@(${en}|${esc(n.split(" ")[0])})(?![\\w])`, "g"), (_, pre, m) => `${pre}<span class="mention">@${m}</span>`);
    });
    return html.replace(/\n/g, "<br>");
  }
  /** Mock comment thread — one entry per comment on the card; shown newest first. */
  function commentList(d) {
    if (!d.commentList) {
      const users = GC.MOCK.users;
      const n = d.comments || 0;
      d.commentList = Array.from({ length: n }, (_, i) => ({
        id: `c${i}`, who: users[(i * 2 + 1) % users.length].name, text: COMMENT_TEXT[i % COMMENT_TEXT.length], at: minsAgo((n - i) * 190),
      }));
    }
    return d.commentList;
  }
  /** Activity log (Figma 16292:70814): session actions (d.log) on top of mock history. */
  const LOG_TYPES = [["all", "All event types"], ["stage", "Stage changes"], ["edit", "Edits"], ["comment", "Comments"],
    ["status", "Archive & restore"], ["ai", "AI & highlights"], ["received", "Deal received"]];
  let logFilter = "all";
  function logList(d) {
    const owner = (GC.MOCK.users.find((u) => u.initials === d.owner) || GC.MOCK.users[0]).name;
    const recv = d.dateReceived ? new Date(d.dateReceived + "T12:45:00").toISOString() : minsAgo(60 * 72);
    const atToday = (h) => minsAgo(h * 60);
    const yesterday = (hh, mm) => { const x = new Date(dayStart(Date.now()) - 86400000); x.setHours(hh, mm); return x.toISOString(); };
    const base = d.isNew ? [] : [
      { who: "Sarah Chen", text: `updated Price: ${f().money(Math.round((d.price || 4200000) * 1.06), "EUR")} → ${f().money(d.price || 3950000, "EUR")}`, type: "edit", at: atToday(2) },
      { who: GC.inbox.ME, text: "dismissed investment risk “High tenant concentration”", type: "ai", at: atToday(4) },
      { who: "Maya Brooks", text: "added key highlight “Below-market rent, reversion potential”", type: "ai", at: yesterday(17, 41) },
      { who: "Tomás Novak", text: "edited AI Summary · tag changed from AI generated to Edited", type: "ai", at: yesterday(16, 20) },
      { who: owner, text: `changed stage: Received → ${d.stage}`, type: "stage", at: new Date(new Date(recv).getTime() + 86400000 * 2).toISOString() },
      { who: null, text: "from CBRE (email import)", type: "received", at: recv },
    ];
    const all = (d.log || []).concat(base).sort((p, q) => q.at.localeCompare(p.at));
    return logFilter === "all" ? all : all.filter((l) => l.type === logFilter);
  }
  function tabsHtml(d) {
    const n = d.commentList ? d.commentList.length : d.comments || 0;
    return DP_TABS.map(([id, l, off]) => `<button class="ds-tab" type="button" data-size="large" role="tab" id="dp-tab-${id}" data-dp-view="${id}"
      aria-selected="${dpTab === id}" aria-controls="dp-panel" tabindex="${dpTab === id ? 0 : -1}"${off ? ' aria-disabled="true" title="Coming soon"' : ""}>${l}${id === "comments" && n ? `<span class="ds-tab-chip">${n}</span>` : ""}</button>`).join("");
  }
  function commentsHtml(d) {
    const list = commentList(d).slice().reverse();
    return `<section class="pv-card dp-feed dp-feed--comments" aria-labelledby="dp-title">
      <h2 class="sr-only" id="dp-title">Comments on ${esc(d.name)}</h2>
      <form class="dp-composer" data-dp-composer data-ds-provisional="comment-composer">
        <label class="sr-only" for="dp-comment">Leave a comment</label>
        <textarea class="dp-composer__input" id="dp-comment" rows="1" placeholder="Start typing to leave a comment"></textarea>
        <div class="dp-composer__row">
          <button type="button" class="dp-composer__at" data-dp-at aria-label="Mention someone" title="Mention someone">@</button>
          <button type="submit" class="ds-btn" data-type="primary" data-size="md" disabled><span class="ds-btn__label">Send</span></button>
        </div>
      </form>
      ${list.length ? `<ul class="dp-thread">${list.map((c) => {
        const mine = c.who === GC.inbox.ME;
        return `<li class="dp-thread__item" data-comment="${c.id}">
          <div class="dp-thread__meta">${avatar(c.who)}<span class="dp-thread__name">${esc(c.who)}</span><span class="dp-thread__time">${esc(ago(c.at))}</span></div>
          <div class="dp-thread__text">${richText(c.text)}</div>
          <div class="dp-thread__actions">
            <button type="button" class="dp-icon-btn" data-dp-copy="${c.id}" aria-label="Copy comment" title="Copy">${GC.icon("copy")}</button>
            ${mine ? `<button type="button" class="dp-icon-btn" data-dp-edit-comment="${c.id}" aria-label="Edit comment" title="Edit">${GC.icon("edit")}</button>`
              : `<button type="button" class="dp-icon-btn dp-reply" data-dp-reply="${esc(c.who)}">${GC.icon("message-text")}<span>Reply</span></button>`}
          </div></li>`;
      }).join("")}</ul>` : `<p class="t-muted dp-feed__empty">No comments yet. Start the conversation with your team.</p>`}
    </section>`;
  }
  function logsHtml(d) {
    const list = logList(d);
    const now = Date.now(), today = dayStart(now), yday = today - 86400000;
    const groups = [];
    list.forEach((l) => {
      const t = new Date(l.at).getTime(), ds = dayStart(t);
      const lx = new Date(t), localIso = `${lx.getFullYear()}-${String(lx.getMonth() + 1).padStart(2, "0")}-${String(lx.getDate()).padStart(2, "0")}`;
      const label = ds === today ? "Today" : ds === yday ? "Yesterday" : f().dateShort(localIso);
      let g = groups[groups.length - 1];
      if (!g || g.label !== label) groups.push(g = { label, items: [] });
      const hhmm = new Date(t).toTimeString().slice(0, 5);
      g.items.push(Object.assign({ time: ds === today ? ago(l.at) : hhmm }, l));
    });
    const type = LOG_TYPES.find((x) => x[0] === logFilter);
    return `<section class="pv-card dp-feed dp-feed--log" aria-labelledby="dp-title">
      <h2 class="sr-only" id="dp-title">Activity log for ${esc(d.name)}</h2>
      <div><button type="button" class="ds-btn dp-log__filter" data-type="secondary" data-size="md" data-dp-logfilter aria-haspopup="menu" aria-expanded="false"><span class="ds-btn__label">${esc(type[1])}</span>${GC.icon("chevron-down", "ds-btn__icon")}</button></div>
      <table class="dp-log">
        <thead><tr><th scope="col" class="dp-log__time">Time</th><th scope="col">Log text</th></tr></thead>
        ${groups.length ? groups.map((g) => `<tbody><tr class="dp-log__group"><th scope="rowgroup" colspan="2">${esc(g.label)}</th></tr>
          ${g.items.map((l) => `<tr class="dp-log__row"><td class="dp-log__time">${esc(l.time)}</td>
            <td><span class="dp-log__who">${l.type === "received" && !l.who ? "Deal received" : l.who === GC.inbox.ME ? "You" : esc(l.who)}</span> <span class="dp-log__what">${esc(l.text)}</span></td></tr>`).join("")}</tbody>`).join("")
          : `<tbody><tr><td colspan="2" class="dp-feed__empty t-muted">No events of this type yet.</td></tr></tbody>`}
      </table>
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
    panel.querySelector(".dp__tabs").innerHTML = tabsHtml(d);
    const sc = panel.querySelector(".dp__scroll");
    sc.innerHTML = dpTab === "comments" ? commentsHtml(d) : dpTab === "logs" ? logsHtml(d) : contentHtml(d);
    sc.setAttribute("aria-labelledby", `dp-tab-${dpTab}`);
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

  function open(id, triggerEl, tab) {
    if (layer) { current = id; photo = 0; if (tab) dpTab = tab; renderDetails(); return; }
    current = id; photo = 0; overviewTab = "overview"; dpTab = tab || "details"; logFilter = "all"; assetSort = { key: "idx", dir: 1 };
    trigger = triggerEl || document.activeElement;
    layer = document.createElement("div");
    layer.className = "drawer-layer";
    layer.innerHTML = `<div class="drawer-backdrop" data-dp="close"></div>
      <aside class="dp drawer" role="dialog" aria-modal="true" aria-labelledby="dp-title" data-ds-provisional="drawer" tabindex="-1">
        <div class="dp__bar">
          <div class="dp__bar-left">
            <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="md" data-dp="close" aria-label="Close panel" title="Close"><span class="ds-btn__icon ico--flip">${DS_ICONS.get("chevrons-left")}</span></button>
            <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="md" data-dp="full" aria-label="Open full page" aria-pressed="false" title="Full page"><span class="ds-btn__icon">${DS_ICONS.get("full-page")}</span></button>
            <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="md" data-dp="prev" aria-label="Previous deal" title="Previous deal"><span class="ds-btn__icon">${DS_ICONS.get("arrow-up")}</span></button>
            <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="md" data-dp="next" aria-label="Next deal" title="Next deal"><span class="ds-btn__icon">${DS_ICONS.get("arrow-down")}</span></button>
            <span class="sr-only" id="dp-pos" aria-live="polite"></span>
          </div>
          <div class="dp__bar-right">
            <button type="button" class="ds-btn" data-type="ghost" data-size="sm" data-dp="edit"><span class="ds-btn__label">Edit</span>${GC.icon("edit", "ds-btn__icon")}</button>
            <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" data-dp="more" aria-haspopup="menu" aria-expanded="false" aria-label="More actions"><span class="ds-btn__icon">${DS_ICONS.get("more-vertical")}</span></button>
          </div>
        </div>
        <div class="ds-tabs dp__tabs" role="tablist" aria-label="Deal views"></div>
        <div class="dp__scroll" id="dp-panel" role="tabpanel" tabindex="-1"></div>
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
        else if (act === "more") { a.dataset.dealMenu = current; GC.inbox.openMenu(a); }
        return;
      }
      const sm = e.target.closest("[data-stage-menu]");
      if (sm) { GC.inbox.openStageMenu(sm); return; }
      const so = e.target.closest("[data-dp-sort]");
      if (so) {
        const k = so.dataset.dpSort;
        assetSort = assetSort.key === k ? { key: k, dir: -assetSort.dir } : { key: k, dir: 1 };
        const d = GC.inbox.find(current);
        panel.querySelector(".dp-assets").closest(".pv-table-wrap").outerHTML = assetTableHtml(d, ext(d));
        panel.querySelector(`[data-dp-sort="${k}"]`).focus();
        return;
      }
      const more = e.target.closest("[data-dp-more]");
      if (more) {
        const t = panel.querySelector("#dp-summary-text"), open = t.dataset.clamped === "true";
        t.dataset.clamped = open ? "false" : "true";
        more.textContent = open ? "Show less" : "Show more ...";
        more.setAttribute("aria-expanded", open);
        return;
      }
      const vt = e.target.closest("[data-dp-view]");
      if (vt) { selectTab(vt.dataset.dpView); return; }
      const ph = e.target.closest("[data-dp-photo]");
      if (ph) {
        const d = GC.inbox.find(current);
        photo = (photo + +ph.dataset.dpPhoto + d.images.length) % d.images.length;
        panel.querySelector(".dp-thumb").outerHTML = coverHtml(d);
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
    layer.addEventListener("keydown", (e) => {
      const t = e.target.closest("[data-dp-view]");
      if (!t || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const on = DP_TABS.filter((x) => !x[2]).map((x) => x[0]);
      const k = on.indexOf(t.dataset.dpView);
      const nx = e.key === "Home" ? 0 : e.key === "End" ? on.length - 1 : (k + (e.key === "ArrowRight" ? 1 : -1) + on.length) % on.length;
      selectTab(on[nx]);
    });
    layer.addEventListener("change", (e) => {
      if (!e.target.matches("[data-dp-comps]")) return;
      showComps = e.target.checked;
      const d = GC.inbox.find(current);
      const mp = panel.querySelector(".dp-map");
      mp.outerHTML = miniMapHtml(d, ext(d));
      panel.querySelector("[data-dp-comps]").focus();
    });
    const sendState = () => { const t = panel.querySelector("#dp-comment"); if (t) t.form.querySelector('[type="submit"]').disabled = !t.value.trim(); };
    layer.addEventListener("input", (e) => {
      if (e.target.id !== "dp-comment") return;
      sendState();
      e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; // grow with the text
    });
    layer.addEventListener("keydown", (e) => {
      if (e.target.id === "dp-comment" && e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.target.form.requestSubmit(); }
    });
    const insertAt = (txt) => {
      const t = panel.querySelector("#dp-comment");
      const pos = t.selectionStart != null ? t.selectionStart : t.value.length;
      t.value = t.value.slice(0, pos) + txt + t.value.slice(t.selectionEnd || pos);
      t.focus(); t.selectionStart = t.selectionEnd = pos + txt.length;
      sendState();
    };
    layer.addEventListener("click", (e) => {
      if (e.target.closest("[data-dp-at]")) { insertAt("@"); return; }
      const rp = e.target.closest("[data-dp-reply]");
      if (rp) { const t = panel.querySelector("#dp-comment"); t.value = ""; insertAt(`@${rp.dataset.dpReply} `); return; }
      const cp = e.target.closest("[data-dp-copy]");
      if (cp) {
        const c = commentList(GC.inbox.find(current)).find((x) => x.id === cp.dataset.dpCopy);
        const plain = c.text.replace(/@\{([^}]+)\}/g, "@$1");
        if (navigator.clipboard) navigator.clipboard.writeText(plain).catch(() => {});
        GC.toast("Copied to clipboard", "", "neutral");
        return;
      }
      const ed = e.target.closest("[data-dp-edit-comment]");
      if (ed) {
        const li = ed.closest(".dp-thread__item");
        const c = commentList(GC.inbox.find(current)).find((x) => x.id === ed.dataset.dpEditComment);
        li.querySelector(".dp-thread__text").innerHTML = `<label class="sr-only" for="dp-edit-${c.id}">Edit comment</label><textarea class="dp-composer__input dp-edit" id="dp-edit-${c.id}">${esc(c.text.replace(/@\{([^}]+)\}/g, "@$1"))}</textarea>
          <div class="dp-edit__row"><button type="button" class="ds-btn" data-type="secondary" data-size="sm" data-dp-edit-cancel>Cancel</button><button type="button" class="ds-btn" data-type="primary" data-size="sm" data-dp-edit-save="${c.id}">Save</button></div>`;
        li.querySelector(".dp-thread__actions").hidden = true;
        li.querySelector("textarea").focus();
        return;
      }
      if (e.target.closest("[data-dp-edit-cancel]")) { renderDetails(); return; }
      const sv = e.target.closest("[data-dp-edit-save]");
      if (sv) {
        const d = GC.inbox.find(current);
        const c = commentList(d).find((x) => x.id === sv.dataset.dpEditSave);
        const v = sv.closest(".dp-thread__item").querySelector("textarea").value.trim();
        if (v && v !== c.text) { c.text = v; GC.inbox.log(d, "edited a comment", "comment"); }
        renderDetails();
        return;
      }
      const lf = e.target.closest("[data-dp-logfilter]");
      if (lf) {
        GC.inbox.popup(lf, `<p class="deal-menu__title">Event type</p>${LOG_TYPES.map(([k, l]) => `<button type="button" role="menuitemradio" aria-checked="${logFilter === k}" data-pick="${k}">${esc(l)}${logFilter === k ? GC.icon("check", "deal-menu__check") : ""}</button>`).join("")}`,
          (k) => { logFilter = k; renderDetails(); panel.querySelector("[data-dp-logfilter]").focus(); });
      }
    });
    layer.addEventListener("submit", (e) => {
      if (!e.target.matches("[data-dp-composer]")) return;
      e.preventDefault();
      const text = e.target.querySelector("#dp-comment").value.trim();
      if (!text) return;
      const d = GC.inbox.find(current);
      const list = commentList(d);
      list.push({ id: `c${Date.now().toString(36)}`, who: GC.inbox.ME, text, at: new Date().toISOString() });
      d.comments = list.length;
      GC.inbox.log(d, "left a comment", "comment");
      renderDetails();
      GC.inbox.update(d);
      panel.querySelector(".dp__scroll").scrollTop = 0;
      panel.querySelector("#dp-comment").focus();
    });
    document.addEventListener("keydown", onKey);
  }

  function selectTab(id) {
    const def = DP_TABS.find((x) => x[0] === id);
    if (!def || def[2]) return;
    dpTab = id;
    renderDetails();
    panel.querySelector(".dp__scroll").scrollTop = 0;
    panel.querySelector(`#dp-tab-${id}`).focus();
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
  /** Expanded asset cards (indexes into form.assetList) — UI state only, not part of the dirty check. */
  let openAssets = new Set();
  const ASSET_NUM = { area: 1, price: 1, occupancy: 1, rent: 1 };
  // Figma "Edit deal Drawer V.2" (16292:70298): pill tabs + collapsible single-column sections.
  const SECTIONS = [["key", "Key info"], ["assets", "Assets"], ["overview", "Overview"], ["physical", "Physical"], ["financial", "Financial"]];
  let collapsed = new Set();

  function snapshot(d) {
    const x = ext(d);
    return {
      name: d.name, price: d.price, areaSqm: d.areaSqm, occupancy: d.occupancy, rentYearly: d.rentYearly,
      assetList: x.assetList.map((a) => Object.assign({}, a)),
      location: d.location || "", stage: d.stage, dateReceived: d.dateReceived || "", owner: d.owner || "", fund: x.fund, dealSource: d.dealSource || "",
      deadlineDate: x.deadlineDate || "",
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
    return `<div class="ds-field${o.cls ? " " + o.cls : ""}" data-size="small" data-state="default" data-ep-wrap="${key}">
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
    const open = !collapsed.has(id);
    return `<section class="ep-card" id="ep-sec-${id}" data-open="${open}" aria-labelledby="ep-t-${id}">
      <h3 class="ep-card__title"><button type="button" class="ep-card__toggle" id="ep-t-${id}" data-ep-act="section-toggle" data-sec="${id}" aria-expanded="${open}" aria-controls="ep-b-${id}">
        <span>${title}</span>${GC.icon("chevron-up", "ep-card__chev")}</button></h3>
      <div class="ep-card__body" id="ep-b-${id}"${open ? "" : " hidden"}>${body}</div></section>`;
  }
  function assetSummary(a) {
    return [a.type, (a.address || "").trim(), a.price > 0 ? f().moneyShort(a.price, "EUR") : ""].filter(Boolean).join(" · ") || "No details yet";
  }
  function assetRowHtml(a, i) {
    const open = openAssets.has(i);
    const m = assetMetrics(a);
    return `<div class="asset-row" role="group" aria-labelledby="ep-ah-${i}" data-asset-idx="${i}" data-open="${open}" data-ds-provisional="asset-row">
      <div class="asset-row__head">
        <button type="button" class="asset-row__toggle" data-ep-act="asset-toggle" data-i="${i}" aria-expanded="${open}" aria-controls="ep-ab-${i}">
          ${GC.icon("chevron-down", "asset-row__chev")}<span class="t-value" id="ep-ah-${i}">Asset ${i + 1}</span><span class="t-muted asset-row__sum" data-ep-sum="${i}">${esc(assetSummary(a))}</span>
        </button>
        ${form.assetList.length > 1 ? `<button type="button" class="ds-btn" data-type="ghost" data-size="sm" data-ep-act="asset-remove" data-i="${i}" aria-label="Remove asset ${i + 1}">${GC.icon("bin", "ds-btn__icon")}<span class="ds-btn__label">Remove</span></button>` : ""}
      </div>
      <div class="asset-row__body" id="ep-ab-${i}"${open ? "" : " hidden"}>
        <div class="asset-row__fields">${fld(`asset-${i}-type`, "Asset type", { value: a.type, options: GC.MOCK.industries.map((x) => x.id), placeholder: "Select type" })}${fld(`asset-${i}-address`, "Address", { value: a.address })}</div>
        <div class="ep-grid">
          ${fld(`asset-${i}-area`, "Area", { value: a.area, type: "number", suffix: "sqm" })}${fld(`asset-${i}-price`, "Price", { value: a.price, type: "number", prefix: "€" })}
          ${fld(`asset-${i}-occupancy`, "Occupancy", { value: a.occupancy, type: "number", suffix: "%" })}${fld(`asset-${i}-rent`, "Rent", { value: a.rent, type: "number", prefix: "€", suffix: "/ yr" })}
          ${autoField(`asset-${i}-psm`, "Rent/psm", m.psm, "/ sqm / yr")}${autoField(`asset-${i}-niy`, "NIY", m.niy, "%")}
        </div>
      </div>
    </div>`;
  }
  function assetsBody() {
    return `<div class="ep-assets">${form.assetList.map(assetRowHtml).join("")}</div>
      <button type="button" class="ds-btn" data-type="secondary" data-size="sm" data-ep-act="asset-add">${GC.icon("plus", "ds-btn__icon")}<span class="ds-btn__label">Add asset</span></button>`;
  }
  function editBody() {
    const a = autos();
    const users = GC.MOCK.users.map((u) => [u.initials, u.name]);
    return [
      // Key info order and labels follow Figma 16292:70316; Rent (€/sqm), Total assets and Cap rate are computed.
      card("key", "Key info", `<div class="ep-grid">${fld("areaSqm", "Area", { type: "number", suffix: "sqm" })}${autoField("psm", "Rent (€/sqm)", a.psm, "/ sqm / yr")}
        ${fld("price", "Price", { type: "number", prefix: "€" })}${fld("rentYearly", "Rent", { type: "number", prefix: "€", suffix: "/ yr" })}
        ${autoField("total", "Total assets", String(form.assetList.length))}${fld("occupancy", "Occupancy", { type: "number", suffix: "%" })}
        ${autoField("niy", "Cap rate", a.niy, "%")}</div>`),
      card("assets", `Assets <span class="count">(${form.assetList.length})</span>`, assetsBody()),
      card("overview", "Overview", `<div class="ep-grid">${fld("name", "Deal name", { required: true })}${fld("dateReceived", "Date received", { type: "date" })}
        ${fld("deadlineDate", "Next deadline", { type: "date" })}${fld("stage", "Deal stage", { options: GC.MOCK.stages })}
        ${fld("owner", "Owner", { options: users, placeholder: "Unassigned" })}${fld("fund", "Fund", { options: GC.MOCK.funds, placeholder: "Select fund" })}
        ${fld("dealSource", "Deal source", { options: GC.MOCK.processTypes.concat(["Off-Market"]), placeholder: "Select source" })}${fld("location", "Location / Region")}</div>`),
      card("physical", "Physical", `<div class="ep-grid">${fld("gla", "GLA", { type: "number", suffix: "sqm" })}${fld("yearBuilt", "Year built", { type: "number" })}
        ${fld("condition", "Condition", { options: GC.MOCK.conditions, placeholder: "Select condition" })}</div>`),
      card("financial", "Financial", `<div class="ep-grid">${fld("noi", "Net operating income", { type: "number", prefix: "€", suffix: "/ yr" })}${fld("wault", "WAULT", { type: "number", suffix: "years" })}
        ${fld("exitYield", "Exit yield", { type: "number", suffix: "%" })}${fld("ltv", "LTV", { type: "number", suffix: "%" })}</div>`),
    ].join("");
  }

  function isEditDirty() { return JSON.stringify(form) !== JSON.stringify(original); }
  /** Save stays disabled until something changed (Figma: disabled primary in the footer). */
  function syncSave() { if (editPanel) editPanel.querySelector('[data-ep-act="save"]').disabled = !isEditDirty(); }

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
    head.querySelectorAll("[data-ep-tab]").forEach((t) => {
      const on = t.dataset.epTab === active;
      if (on && t.getAttribute("aria-selected") !== "true") t.scrollIntoView({ block: "nearest", inline: "nearest" });
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function edit(id, triggerEl, restore) {
    if (editLayer) return;
    const d = GC.inbox.find(id);
    if (!d) return;
    editId = id;
    editTrigger = triggerEl || document.activeElement;
    original = snapshot(d);
    form = restore ? JSON.parse(JSON.stringify(restore)) : JSON.parse(JSON.stringify(original));
    openAssets = new Set();
    collapsed = new Set();
    editLayer = document.createElement("div");
    editLayer.className = "drawer-layer drawer-layer--edit";
    editLayer.innerHTML = `<div class="drawer-backdrop" data-ep-act="cancel"></div>
      <aside class="ep drawer" role="dialog" aria-modal="true" aria-labelledby="ep-title" data-ds-provisional="drawer" tabindex="-1">
        <div class="ep__scroll">
          <div class="ep__head">
            <div class="ep__title-row"><h2 class="ep__title" id="ep-title">Edit deal</h2>
              <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="md" data-ep-act="cancel" aria-label="Close"><span class="ds-btn__icon">${DS_ICONS.get("x-close")}</span></button></div>
            <div class="ep-pills" role="tablist" aria-label="Deal sections" data-ds-provisional="pill-tabs">
              ${SECTIONS.map(([sid, l], i) => `<button class="ep-pill" type="button" role="tab" aria-selected="${i === 0}" aria-controls="ep-sec-${sid}" data-ep-tab="${sid}">${l}</button>`).join("")}
            </div>
          </div>
          <div class="ep__cards"></div>
        </div>
        <div class="ep__foot">
          <button type="button" class="ds-btn" data-type="secondary" data-size="lg" data-ep-act="cancel">Cancel</button>
          <button type="button" class="ds-btn" data-type="primary" data-size="lg" data-ep-act="save" disabled>Save changes</button>
        </div>
      </aside>`;
    document.getElementById("drawer-root").appendChild(editLayer);
    editPanel = editLayer.querySelector(".ep");
    renderEdit();
    syncSave();
    if (layer) layer.inert = true; else document.querySelector(".page").inert = true;
    slideIn(editPanel);
    editRelease = GC.trapFocus(editPanel);
    editPanel.querySelector("#ep-areaSqm").focus();

    const sc = editPanel.querySelector(".ep__scroll");
    sc.addEventListener("scroll", updateSpy, { passive: true });
    updateSpy();

    editLayer.addEventListener("input", (e) => {
      const key = e.target.dataset.ep;
      if (!key) return;
      const m = /^asset-(\d+)-(type|address|area|price|occupancy|rent)$/.exec(key);
      if (m) {
        const i = +m[1], a = form.assetList[i];
        if (ASSET_NUM[m[2]]) { const n = f().parseNum(e.target.value); a[m[2]] = n == null || Number.isNaN(n) ? (n === null ? null : a[m[2]]) : n; }
        else a[m[2]] = e.target.value;
        const am = assetMetrics(a);
        [["psm", am.psm], ["niy", am.niy]].forEach(([k, v]) => { const o = editPanel.querySelector(`#ep-asset-${i}-${k}`); o.textContent = v == null ? "—" : v; o.dataset.empty = v == null; });
        editPanel.querySelector(`[data-ep-sum="${i}"]`).textContent = assetSummary(a);
      } else if (e.target.dataset.num === "true") { const n = f().parseNum(e.target.value); form[key] = n == null || Number.isNaN(n) ? (n === null ? null : form[key]) : n; }
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
    editLayer.addEventListener("input", syncSave);
    editLayer.addEventListener("change", (e) => { if (e.target.tagName === "SELECT") e.target.dispatchEvent(new Event("input", { bubbles: true })); });
    editLayer.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-ep-tab]");
      if (tab) {
        if (collapsed.delete(tab.dataset.epTab)) renderEdit(true);
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
      else if (act === "section-toggle") {
        const id = a.dataset.sec, on = collapsed.has(id);
        if (on) collapsed.delete(id); else collapsed.add(id);
        const sec = a.closest(".ep-card");
        sec.dataset.open = on; a.setAttribute("aria-expanded", on);
        sec.querySelector(".ep-card__body").hidden = !on;
        updateSpy();
      }
      else if (act === "asset-toggle") {
        const i = +a.dataset.i, on = !openAssets.has(i);
        if (on) openAssets.add(i); else openAssets.delete(i);
        const row = a.closest(".asset-row");
        row.dataset.open = on; a.setAttribute("aria-expanded", on);
        row.querySelector(".asset-row__body").hidden = !on;
      }
      else if (act === "asset-add") {
        form.assetList.push({ type: "", address: "", area: null, price: null, occupancy: null, rent: null });
        openAssets.add(form.assetList.length - 1); // a new asset opens so it can be filled in
        renderEdit(true); syncSave(); editPanel.querySelector(`#ep-asset-${form.assetList.length - 1}-type`).focus();
      }
      else if (act === "asset-remove") {
        const r = +a.dataset.i;
        form.assetList.splice(r, 1);
        openAssets = new Set([...openAssets].filter((i) => i !== r).map((i) => (i > r ? i - 1 : i)));
        renderEdit(true); syncSave(); editPanel.querySelector('[data-ep-act="asset-add"]').focus();
      }
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
      if (collapsed.delete("overview")) renderEdit(true);
      const wrap = editPanel.querySelector('[data-ep-wrap="name"]');
      wrap.dataset.state = "error";
      const h = wrap.querySelector(".ds-field__helper"); h.textContent = "Deal name is required"; h.hidden = false;
      editPanel.querySelector("#ep-name").focus();
      return;
    }
    const d = GC.inbox.find(editId);
    const x = ext(d);
    const LABELS = { name: "Deal name", price: "Price", areaSqm: "Area", occupancy: "Occupancy", rentYearly: "Rent", assetList: "Assets", location: "Location", dateReceived: "Date received", deadlineDate: "Next deadline",
      owner: "Owner", fund: "Fund", dealSource: "Deal source", gla: "GLA", yearBuilt: "Year built", condition: "Condition", wault: "WAULT", noi: "NOI", exitYield: "Exit yield", ltv: "LTV" };
    if (form.stage !== original.stage) GC.inbox.log(d, `changed stage: ${original.stage} → ${form.stage}`, "stage");
    // One entry per changed field, Figma style: "updated Price: €61,200,000 → €65,000,000"
    const show = (k, v) => {
      if (v == null || v === "") return "—";
      if (k === "assetList") return `${v.length} asset${v.length === 1 ? "" : "s"}`;
      if (["price", "rentYearly", "noi"].includes(k)) return f().money(v, "EUR");
      if (k === "areaSqm" || k === "gla") return `${f().num(v, 0)} sqm`;
      if (["occupancy", "exitYield", "ltv"].includes(k)) return `${f().num(v, 2)}%`;
      if (k === "owner") { const u = GC.MOCK.users.find((x) => x.initials === v); return u ? u.name : v; }
      return String(v);
    };
    Object.keys(LABELS).filter((k) => JSON.stringify(form[k]) !== JSON.stringify(original[k])).forEach((k) => {
      const same = k === "assetList" && form[k].length === original[k].length;
      GC.inbox.log(d, same ? "updated Assets" : `updated ${LABELS[k]}: ${show(k, original[k])} → ${show(k, form[k])}`, "edit");
    });
    Object.assign(d, {
      name: form.name.trim(), price: form.price, areaSqm: form.areaSqm, occupancy: form.occupancy, rentYearly: form.rentYearly,
      location: form.location, stage: form.stage, dateReceived: form.dateReceived, owner: form.owner || null, dealSource: form.dealSource || null, wault: form.wault,
      assets: form.assetList.length,
    });
    d.rentPsm = d.rentYearly > 0 && d.areaSqm > 0 ? d.rentYearly / d.areaSqm : null;
    d.niy = d.rentYearly > 0 && d.price > 0 ? (d.rentYearly / d.price) * 100 : null;
    const types = [...new Set(form.assetList.map((a) => a.type).filter(Boolean))];
    if (types.length) d.industry = types.length === 1 ? types[0] : "Mixed-use";
    if (form.deadlineDate !== original.deadlineDate) x.deadline = form.deadlineDate ? `${(x.deadline || "Next deadline").split(" · ")[0]} · ${f().dateLong(form.deadlineDate)}` : "";
    Object.assign(x, { deadlineDate: form.deadlineDate, fund: form.fund, gla: form.gla, yearBuilt: form.yearBuilt, condition: form.condition, noi: form.noi, exitYield: form.exitYield, ltv: form.ltv,
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

  /** Re-render the details drawer when its deal changed elsewhere (e.g. stage picked from a card). */
  function refresh(id) {
    if (!layer || current !== id) return;
    const sc = panel.querySelector(".dp__scroll"), top = sc.scrollTop;
    renderDetails();
    sc.scrollTop = top;
  }

  GC.dealPanel = { open, close, edit, onRemoved, refresh };
})();
