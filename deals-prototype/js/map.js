/*
 * Interactive deals map (Figma: Filters-container/Map-container 16281:65544).
 * Base map is drawn as SVG from DS tokens (external tiles are blocked in the Artifact sandbox);
 * pins are HTML buttons placed over it, so they stay crisp and clickable at any zoom.
 */
window.GC = window.GC || {};

(function () {
  const W = 800, H = 1270;          // world size (map units)
  const MIN_K = 0.5, MAX_K = 3;
  const HOME = { x: 440, y: 700 }, HOME_ZOOM = 1.45;
  const esc = GC.esc;

  const view = { k: 1, tx: 0, ty: 0, fitK: 1 };
  const settings = { metric: "price", showIcon: true, showLabel: true };
  const hiddenStages = new Set();
  let root, world, pinLayer, menu, menuBtn, popup;
  // Selected pin → property popup (Figma "Pin card" 16335:70120): deal id, asset index, active tab.
  const sel = { id: null, i: 0, tab: "asset" };
  // View before "Zoom out to all assets", so "Zoom in back" can return to it.
  let savedView = null;

  const LEGEND = [
    { stage: "SCR", label: "SCR" }, { stage: "QUAL", label: "QUAL" }, { stage: "LOI", label: "LOI" },
    { stage: "DD", label: "DD" }, { stage: "SPA", label: "SPA" }, { stage: "Completed", label: "CL" },
    { stage: "Declined", label: "DECL" },
  ];
  // Pin description (Figma "Map variation" 16292:71767): Price → deal price in EUR, Yield → EUR per sqm.
  const METRICS = [{ id: "price", label: "Price", unit: "EUR" }, { id: "yield", label: "Yield", unit: "EUR/sqm" }];

  // ---------- Base map (deterministic SVG) ----------
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

  function baseMapSvg() {
    const r = rng(42);
    const streets = [];
    // Two rotated street grids (old town + newer blocks)
    for (let i = -10; i < 40; i++) {
      const y = i * 38 + r() * 8;
      streets.push(`M -50 ${y} L ${W + 50} ${y - 90}`);
    }
    for (let i = -8; i < 30; i++) {
      const x = i * 42 + r() * 10;
      streets.push(`M ${x} -50 L ${x + 120} ${H + 50}`);
    }
    const parks = [
      [610, 300, 70, 46], [430, 860, 58, 40], [140, 900, 80, 52], [720, 1130, 60, 70],
      [300, 690, 34, 26], [560, 560, 30, 22], [260, 1180, 70, 40], [740, 640, 40, 60],
    ].map(([cx, cy, rx, ry]) => `<ellipse class="mb-park" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`).join("");
    const piers = [
      [150, 120, 120, 34], [170, 180, 160, 30], [120, 240, 210, 36], [260, 300, 120, 30],
      [90, 330, 150, 28], [330, 120, 60, 150], [200, 60, 90, 28],
    ].map(([x, y, w, h]) => `<rect class="mb-land" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`).join("");
    const labels = [
      [60, 520, "VÄSTRA HAMNEN"], [560, 400, "KIRSEBERG"], [470, 840, "ROSENGÅRD"],
      [470, 1100, "FOSIE"], [90, 1110, "HYLLIE"], [380, 610, "CENTRUM"],
    ].map(([x, y, t]) => `<text class="mb-district" x="${x}" y="${y}">${t}</text>`).join("");
    const shields = [[620, 130, "M 892"], [600, 760, "E 6.01"], [740, 1010, "E65"], [560, 1180, "E6"]]
      .map(([x, y, t]) => `<g class="mb-shield" transform="translate(${x} ${y}) scale(2)"><rect x="-22" y="-9" width="44" height="18" rx="3"/><text y="4">${t}</text></g>`).join("");
    return `<svg class="map-base" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false">
      <rect class="mb-land" width="${W}" height="${H}"/>
      <g class="mb-streets"><path d="${streets.join(" ")}"/></g>
      ${parks}
      <path class="mb-water" d="M0 0 H560 C520 120 470 200 420 260 C360 330 330 400 250 450 C170 500 90 520 0 560 Z"/>
      ${piers}
      <g class="mb-major">
        <path d="M 0 700 C 200 640 420 660 800 560"/><path d="M 300 0 C 360 300 380 600 360 1270"/>
        <path d="M 80 1270 C 200 1000 420 900 800 900"/><path d="M 0 420 C 200 520 500 520 800 330"/>
      </g>
      <g class="mb-highway">
        <path d="M 640 0 C 700 260 760 420 720 700 C 690 920 640 1080 560 1270"/>
        <path d="M 800 1000 C 600 1120 380 1150 0 1180"/>
        <path d="M 420 640 C 520 560 640 600 700 720 C 740 840 640 960 520 960 C 400 960 330 860 340 760 C 350 690 380 660 420 640 Z" class="mb-ring"/>
      </g>
      ${labels}${shields}
    </svg>`;
  }

  // ---------- Pins ----------
  function industryIcon(id) {
    const ind = GC.MOCK.industries.find((x) => x.id === id);
    return GC.icon(ind ? ind.icon : "building");
  }
  function metricLabel(d) {
    const f = GC.fmt;
    if (settings.metric === "yield") return d.rentPsm == null ? "—" : f.currencySymbol(d.currency || "EUR") + f.num(d.rentPsm, 1, 1);
    return d.price == null ? "No price" : f.moneyShort(d.price, d.currency || "EUR");
  }

  // ---------- Assets on the map ----------
  // One pin per asset. The first asset sits on the deal's own point; the others are scattered
  // deterministically around it (mock geodata) so portfolio deals spread beyond one viewport.
  function hash(str) { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 100003; return h; }
  function assetsOf(d) {
    const list = GC.dealPanel ? GC.dealPanel.assets(d) : [{}];
    const r = rng(hash(d.id) + 11);
    list.forEach((a, i) => {
      if (a.map) return;
      if (i === 0) { a.map = { x: d.map.x, y: d.map.y }; return; }
      const ang = r() * Math.PI * 2, dist = 230 + r() * 220;
      a.map = {
        x: Math.round(Math.min(W - 40, Math.max(40, d.map.x + Math.cos(ang) * dist))),
        y: Math.round(Math.min(H - 40, Math.max(40, d.map.y + Math.sin(ang) * dist))),
      };
    });
    return list;
  }
  function assetLabel(d, a) {
    const f = GC.fmt, cur = d.currency || "EUR";
    if (settings.metric === "yield") {
      const psm = a.rent > 0 && a.area > 0 ? a.rent / a.area : d.rentPsm;
      return psm == null ? "—" : f.currencySymbol(cur) + f.num(psm, 1, 1);
    }
    const price = a.price != null ? a.price : null;
    return price == null ? "No price" : f.moneyShort(price, cur);
  }

  function pinsHtml() {
    const mode = settings.showIcon || settings.showLabel ? "pill" : "dot"; // both off → stage-coloured rings
    return GC.inbox.deals.filter((d) => d.map && !hiddenStages.has(d.stage)).map((d) => assetsOf(d).map((a, i) => {
      const label = assetLabel(d, a);
      const on = sel.id === d.id && sel.i === i;
      return `<button type="button" class="map-pin${d.isNew ? " is-new" : ""}${sel.id === d.id ? " is-active-deal" : ""}${on ? " is-selected" : ""}" data-ds-provisional="map-pin" data-id="${d.id}" data-asset="${i}" data-stage="${esc(d.stage)}" data-mode="${mode}"
          aria-label="${esc(d.name)}, asset ${i + 1}, ${esc(d.stage)}, ${esc(label)}" aria-haspopup="dialog" aria-expanded="${on}">
        ${mode === "dot" ? "" : `${settings.showIcon ? `<span class="map-pin__icon">${industryIcon(d.industry)}</span>` : ""}${settings.showIcon && settings.showLabel ? `<span class="map-pin__divider" aria-hidden="true"></span>` : ""}${settings.showLabel ? `<span class="map-pin__label">${esc(label)}</span>` : ""}`}
      </button>`;
    }).join("")).join("");
  }

  const toScreen = (pt) => ({ x: pt.x * view.k + view.tx, y: pt.y * view.k + view.ty });
  function placePins() {
    pinLayer.querySelectorAll(".map-pin").forEach((el) => {
      const d = GC.inbox.find(el.dataset.id);
      const pt = toScreen(assetsOf(d)[+el.dataset.asset].map);
      el.style.left = pt.x + "px";
      el.style.top = pt.y + "px";
    });
    placePopup();
  }

  function renderPins() {
    if (!pinLayer) return;
    if (sel.id && !GC.inbox.deals.some((d) => d.id === sel.id)) closePopup(); // deal archived / deleted
    pinLayer.innerHTML = pinsHtml();
    linked.forEach((id) => setLinked(id, true));
    placePins();
    if (sel.id) renderPopup();
  }

  // ---------- Property popup (pin card) ----------
  const POP_W = 248;
  function popupHtml() {
    const d = GC.inbox.find(sel.id), list = assetsOf(d), a = list[sel.i], f = GC.fmt, cur = d.currency || "EUR";
    const img = (d.images || [])[sel.i % Math.max(1, (d.images || []).length)];
    const row = (l, v) => `<div class="pp-row"><span>${esc(l)}</span><span>${v == null || v === "" ? "—" : v}</span></div>`;
    const psm = a.rent > 0 && a.area > 0 ? a.rent / a.area : null;
    const total = list.reduce((t, x) => t + (x.area || 0), 0);
    const rows = sel.tab === "asset"
      ? row("Price", a.price != null ? esc(f.moneyShort(a.price, cur)) : null)
        + row("Area", a.area != null ? `${esc(f.num(a.area, 0))} sqm` : null)
        + row("Rent (€/€psm)", a.rent != null ? `${esc(f.moneyShort(a.rent, cur))} / ${psm != null ? esc(f.num(psm, 1)) : "—"}` : null)
        + row("Received", d.dateReceived ? esc(f.dateShort(d.dateReceived)) : null)
      : row("Stage", `<span class="stage-chip stage-chip--static" data-stage="${esc(d.stage)}">${esc(d.stage)}</span>`)
        + row("Deal price", d.price != null ? esc(f.moneyShort(d.price, cur)) : "Undisclosed")
        + row("Total area", total ? `${esc(f.num(total, 0))} sqm` : null)
        + row("Cap rate", d.niy != null ? `${esc(f.num(d.niy, 1))}%` : null);
    const many = list.length > 1;
    return `<div class="pp-card">
        <div class="pp-media${img ? "" : " is-empty"}">${img ? `<img src="${img}" alt="">` : GC.icon("building")}
          <div class="pp-tags">${d.owner ? `<span class="ds-avatar owner-avatar" data-size="md" title="Owner">${esc(d.owner)}</span>` : ""}${d.status ? `<span class="status-pill" data-tone="${d.status.tone}">${esc(d.status.label)}</span>` : ""}</div>
          <button type="button" class="pp-more" data-pp="more" aria-haspopup="menu" aria-expanded="false" aria-label="More actions">${GC.icon("more-vertical")}</button>
        </div>
        <div class="pp-body">
          <h3 class="pp-title" id="pp-title"><button type="button" class="deal-link" data-pp="open">${esc(d.name)}</button></h3>
          <div class="pp-loc">${GC.icon("location")}<span>${esc(a.address || d.location || "No address")}</span></div>
          <div class="pp-switch" role="tablist" aria-label="Popup sections">
            ${[["asset", "Asset info"], ["deal", "Deal info"]].map(([k, l]) => `<button type="button" role="tab" class="pp-tab" data-pp-tab="${k}" aria-selected="${sel.tab === k}">${l}</button>`).join("")}
          </div>
          <div class="pp-rows" role="tabpanel" aria-label="${sel.tab === "asset" ? "Asset info" : "Deal info"}">${rows}</div>
        </div>
      </div>
      <div class="pp-foot">
        ${zoomBtnHtml(many)}
        ${many ? `<div class="pp-pager"><button type="button" data-pp="prev" aria-label="Previous asset">${GC.icon("chevron-left")}</button>
          <span aria-live="polite">${sel.i + 1}/${list.length}</span>
          <button type="button" data-pp="next" aria-label="Next asset">${GC.icon("chevron-right")}</button></div>` : ""}
      </div>
      <span class="pp-caret" aria-hidden="true"></span>`;
  }
  function zoomBtnHtml(many) {
    if (savedView) return `<button type="button" class="pp-zoom" data-pp="back">Zoom in back</button>`;
    return `<button type="button" class="pp-zoom" data-pp="fit"${many && someOutside() ? "" : " hidden"}>Zoom out to all assets</button>`;
  }
  function renderPopup() {
    if (!sel.id) return;
    popup.innerHTML = popupHtml();
    popup.hidden = false;
    placePopup();
  }
  /** Anchor above the selected pin (flip below when there's no room); clamp inside the map. */
  function placePopup() {
    if (!popup || popup.hidden || !sel.id) return;
    const d = GC.inbox.find(sel.id);
    if (!d) return;
    const pt = toScreen(assetsOf(d)[sel.i].map);
    const r = root.getBoundingClientRect(), h = popup.offsetHeight;
    const above = pt.y - 18 - h >= 4 || pt.y + 18 + h > r.height;
    const left = Math.min(r.width - POP_W - 4, Math.max(4, pt.x - POP_W / 2));
    popup.style.left = left + "px";
    popup.style.top = (above ? pt.y - 18 - h : pt.y + 18) + "px";
    popup.dataset.side = above ? "top" : "bottom";
    popup.style.setProperty("--caret-x", Math.min(POP_W - 16, Math.max(16, pt.x - left)) + "px");
    const off = pt.x < 0 || pt.y < 0 || pt.x > r.width || pt.y > r.height;
    popup.classList.toggle("is-detached", off); // pin panned away — keep the card but fade it
    const z = popup.querySelector('[data-pp="fit"]');
    if (z && !anim) z.hidden = !(assetsOf(d).length > 1 && someOutside());
  }
  function someOutside() {
    const d = GC.inbox.find(sel.id);
    const r = root.getBoundingClientRect();
    return assetsOf(d).some((a) => { const p = toScreen(a.map); return p.x < 12 || p.y < 12 || p.x > r.width - 12 || p.y > r.height - 12; });
  }
  function openPopup(id, i) {
    if (sel.id !== id) savedView = null; // "Zoom in back" belongs to the deal it was used on
    sel.id = id; sel.i = i; sel.tab = sel.tab || "asset";
    pinLayer.querySelectorAll(".map-pin").forEach((el) => {
      const on = el.dataset.id === id && +el.dataset.asset === i;
      el.classList.toggle("is-selected", on); el.setAttribute("aria-expanded", on);
      el.classList.toggle("is-active-deal", el.dataset.id === id); // whole deal inverted
    });
    renderPopup();
  }
  function closePopup() {
    if (!sel.id) return;
    const prev = pinLayer && pinLayer.querySelector(".map-pin.is-selected");
    sel.id = null; sel.tab = "asset"; savedView = null;
    if (pinLayer) pinLayer.querySelectorAll(".map-pin.is-active-deal").forEach((el) => el.classList.remove("is-active-deal"));
    if (popup) { popup.hidden = true; popup.innerHTML = ""; }
    if (prev) { prev.classList.remove("is-selected"); prev.setAttribute("aria-expanded", "false"); }
    return prev;
  }
  /** Step to the previous/next asset of the same deal; pan there (300 ms) if it is off-screen. */
  function stepAsset(dir) {
    const d = GC.inbox.find(sel.id), n = assetsOf(d).length;
    openPopup(sel.id, (sel.i + dir + n) % n);
    const pt = toScreen(assetsOf(d)[sel.i].map), r = root.getBoundingClientRect();
    if (pt.x < 24 || pt.x > r.width - 24 || pt.y < 24 || pt.y > r.height - 24) {
      const p = assetsOf(d)[sel.i].map;
      animateTo({ k: view.k, tx: r.width / 2 - p.x * view.k, ty: r.height * 0.72 - p.y * view.k });
    }
  }
  /** "Zoom out to all assets": fit every asset of the deal into the viewport in 300 ms. */
  function fitDeal() {
    const pts = assetsOf(GC.inbox.find(sel.id)).map((a) => a.map);
    const r = root.getBoundingClientRect(), pad = 48;
    const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
    const k = Math.max(MIN_K * view.fitK, Math.min(view.k, (r.width - 2 * pad) / Math.max(1, maxX - minX), (r.height - 2 * pad) / Math.max(1, maxY - minY)));
    savedView = { k: view.k, tx: view.tx, ty: view.ty };
    animateTo({ k, tx: r.width / 2 - ((minX + maxX) / 2) * k, ty: r.height / 2 - ((minY + maxY) / 2) * k });
    swapZoomBtn();
  }
  /** "Zoom in back": return to the view the user had before zooming out (300 ms). */
  function zoomBack() {
    if (!savedView) return;
    const v = savedView;
    savedView = null;
    animateTo(v);
    swapZoomBtn();
  }
  function swapZoomBtn() {
    const foot = popup.querySelector(".pp-zoom");
    if (!foot) return;
    foot.outerHTML = zoomBtnHtml(assetsOf(GC.inbox.find(sel.id)).length > 1);
    const btn = popup.querySelector(".pp-zoom");
    if (btn && !btn.hidden) btn.focus();
  }

  // ---------- View transform ----------
  function clampView() {
    const r = root.getBoundingClientRect();
    const w = W * view.k, h = H * view.k;
    const pad = 80;
    view.tx = w < r.width ? (r.width - w) / 2 : Math.min(pad, Math.max(r.width - w - pad, view.tx));
    view.ty = h < r.height ? (r.height - h) / 2 : Math.min(pad, Math.max(r.height - h - pad, view.ty));
  }
  function apply() {
    clampView();
    world.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.k})`;
    placePins();
  }
  let anim = null;
  /** Smoothly move the view (ease-in-out, 300 ms); instant with reduced motion. */
  function animateTo(t, ms) {
    ms = ms == null ? 300 : ms;
    if (anim) cancelAnimationFrame(anim);
    const from = { k: view.k, tx: view.tx, ty: view.ty };
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ms = 0;
    const start = performance.now();
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const step = (now) => {
      const p = ms ? Math.min(1, (now - start) / ms) : 1, e = ease(p);
      view.k = from.k + (t.k - from.k) * e;
      view.tx = from.tx + (t.tx - from.tx) * e;
      view.ty = from.ty + (t.ty - from.ty) * e;
      apply();
      anim = p < 1 ? requestAnimationFrame(step) : null;
      if (!anim) placePopup(); // re-check "Zoom out to all assets" once the view settles
    };
    anim = requestAnimationFrame(step);
  }
  /** Home view: zoomed in on the city centre, like the Figma map (portfolio assets run off-screen). */
  function fit() {
    const r = root.getBoundingClientRect();
    if (!r.width) return;
    view.fitK = Math.max(r.width / W, r.height / H);
    view.k = view.fitK * HOME_ZOOM;
    view.tx = r.width / 2 - HOME.x * view.k;
    view.ty = r.height / 2 - HOME.y * view.k;
    apply();
  }
  function zoomAt(factor, cx, cy) {
    const r = root.getBoundingClientRect();
    if (cx == null) { cx = r.width / 2; cy = r.height / 2; }
    const k = Math.min(MAX_K * view.fitK, Math.max(MIN_K * view.fitK, view.k * factor));
    const f = k / view.k;
    view.tx = cx - (cx - view.tx) * f;
    view.ty = cy - (cy - view.ty) * f;
    view.k = k;
    apply();
  }
  function centerOn(x, y) {
    const r = root.getBoundingClientRect();
    view.tx = r.width / 2 - x * view.k;
    view.ty = r.height / 2 - y * view.k;
    apply();
  }

  // ---------- Settings menu ----------
  function menuHtml() {
    return `<div class="map-menu" id="map-menu" role="dialog" aria-labelledby="map-menu-t" data-ds-provisional="dropdown" hidden>
      <p class="map-menu__title" id="map-menu-t">Pin settings</p>
      <label class="ds-control ds-switch map-menu__item map-menu__toggle"><span>Show industry icon</span><input type="checkbox" role="switch" data-map-opt="showIcon" ${settings.showIcon ? "checked" : ""}><span class="ds-switch__track"><span class="ds-switch__thumb"></span></span></label>
      <label class="ds-control ds-switch map-menu__item map-menu__toggle"><span>Show description</span><input type="checkbox" role="switch" data-map-opt="showLabel" ${settings.showLabel ? "checked" : ""}><span class="ds-switch__track"><span class="ds-switch__thumb"></span></span></label>
      <div class="map-menu__item map-menu__row" data-map-desc${settings.showLabel ? "" : " hidden"}><span id="map-desc-l">Description</span>
        <div class="ds-segmented map-menu__seg" role="group" aria-labelledby="map-desc-l">${METRICS.map((m) => `<button type="button" class="ds-segment" data-map-metric="${m.id}" aria-pressed="${settings.metric === m.id}">${m.label}</button>`).join("")}</div></div>
    </div>`;
  }
  function openMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) menu.querySelector("input").focus();
  }
  function syncMenuButton() {
    const m = METRICS.find((x) => x.id === settings.metric);
    // With the description off the button is icon-only (Figma variations 4–5).
    menuBtn.querySelector(".map-ctl__label").textContent = settings.showLabel ? m.unit : "";
    menuBtn.dataset.iconOnly = !settings.showLabel;
    menuBtn.setAttribute("aria-label", `Pin settings${settings.showLabel ? `: ${m.label} (${m.unit})` : ""}`);
    menu.querySelector("[data-map-desc]").hidden = !settings.showLabel;
  }

  // ---------- Highlight link with the list ----------
  // Row hover/focus → highlight every asset pin of that deal (150 ms delay, no pan/zoom).
  // The map never highlights rows back: pins open the property popup instead.
  const linked = new Set();
  const linkTimers = {};
  function setLinked(id, on) {
    if (!pinLayer) return;
    pinLayer.querySelectorAll(`.map-pin[data-id="${id}"]`).forEach((p) => p.classList.toggle("is-linked", on));
    pinLayer.classList.toggle("has-linked", linked.size > 0);
  }
  function link(id, on) {
    clearTimeout(linkTimers[id]);
    if (on) linkTimers[id] = setTimeout(() => { linked.add(id); setLinked(id, true); }, 150);
    else { linked.delete(id); setLinked(id, false); }
  }

  // ---------- Mount ----------
  function mount(el) {
    root = el;
    root.innerHTML = `
      <div class="map-popup" role="dialog" aria-labelledby="pp-title" data-ds-provisional="property-popup" hidden></div>
      <div class="map-viewport" tabindex="0" aria-label="Deals map. Drag or use arrow keys to pan, plus and minus to zoom.">
        <div class="map-world">${baseMapSvg()}</div>
        <div class="map-pins"></div>
      </div>
      <div class="map-ctl-wrap">
        <button type="button" class="map-ctl" aria-haspopup="dialog" aria-expanded="false" aria-controls="map-menu">
          <span class="map-ctl__icon">${GC.icon("table-settings")}</span><span class="map-ctl__divider" aria-hidden="true"></span>
          <span class="map-ctl__label">EUR</span>
        </button>
        ${menuHtml()}
      </div>
      <div class="map-zoom" role="group" aria-label="Zoom">
        <button type="button" data-zoom="in" aria-label="Zoom in">${GC.icon("plus")}</button>
        <span class="map-zoom__divider" aria-hidden="true"></span>
        <button type="button" data-zoom="out" aria-label="Zoom out">${GC.icon("minus")}</button>
        <span class="map-zoom__divider" aria-hidden="true"></span>
        <button type="button" data-zoom="reset" aria-label="Reset view">${GC.icon("layers")}</button>
      </div>
      <div class="map-legend" role="group" aria-label="Filter pins by stage">
        ${LEGEND.map((l) => `<button type="button" class="map-legend__item" data-stage="${l.stage}" aria-pressed="true" title="Show or hide ${l.stage} deals"><span class="map-legend__dot" aria-hidden="true"></span>${l.label}</button>`).join("")}
      </div>
      <p class="sr-only" aria-live="polite" id="map-live"></p>`;
    world = root.querySelector(".map-world");
    pinLayer = root.querySelector(".map-pins");
    menu = root.querySelector(".map-menu");
    menuBtn = root.querySelector(".map-ctl");
    popup = root.querySelector(".map-popup");
    const vp = root.querySelector(".map-viewport");

    // Pan
    let drag = null;
    vp.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".map-pin") || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
      vp.setPointerCapture(e.pointerId);
      vp.classList.add("is-dragging");
    });
    vp.addEventListener("pointermove", (e) => {
      if (!drag) return;
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3) drag.moved = true;
      view.tx = drag.tx + e.clientX - drag.x;
      view.ty = drag.ty + e.clientY - drag.y;
      apply();
    });
    const end = (e) => {
      // A plain click on empty map closes the popup; a drag doesn't.
      if (drag && !drag.moved && e && e.type === "pointerup") closePopup();
      drag = null; vp.classList.remove("is-dragging");
    };
    vp.addEventListener("pointerup", end);
    vp.addEventListener("pointercancel", end);
    // Zoom
    vp.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = root.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    vp.addEventListener("keydown", (e) => {
      if (e.target !== vp) return;
      const step = 60;
      const map = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (map[e.key]) { e.preventDefault(); view.tx += map[e.key][0]; view.ty += map[e.key][1]; apply(); }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomAt(1.25); }
      else if (e.key === "-") { e.preventDefault(); zoomAt(0.8); }
    });

    root.addEventListener("click", (e) => {
      const z = e.target.closest("[data-zoom]");
      if (z) { z.dataset.zoom === "reset" ? fit() : zoomAt(z.dataset.zoom === "in" ? 1.25 : 0.8); return; }
      if (e.target.closest(".map-ctl")) { if (menu.hidden) closePopup(); openMenu(menu.hidden); return; }
      const mm = e.target.closest("[data-map-metric]");
      if (mm) {
        settings.metric = mm.dataset.mapMetric;
        menu.querySelectorAll("[data-map-metric]").forEach((b) => b.setAttribute("aria-pressed", b === mm));
        syncMenuButton(); renderPins(); return;
      }
      const leg = e.target.closest(".map-legend__item");
      if (leg) {
        const st = leg.dataset.stage;
        const on = hiddenStages.has(st);
        on ? hiddenStages.delete(st) : hiddenStages.add(st);
        leg.setAttribute("aria-pressed", on ? "true" : "false");
        renderPins();
        root.querySelector("#map-live").textContent = `${leg.textContent.trim()} deals ${on ? "shown" : "hidden"}.`;
        return;
      }
      const pin = e.target.closest(".map-pin");
      if (pin) {
        if (pin.classList.contains("is-selected")) { closePopup(); return; }
        openPopup(pin.dataset.id, +pin.dataset.asset);
        return;
      }
      const tab = e.target.closest("[data-pp-tab]");
      if (tab) { sel.tab = tab.dataset.ppTab; renderPopup(); popup.querySelector(`[data-pp-tab="${sel.tab}"]`).focus(); return; }
      const pp = e.target.closest("[data-pp]");
      if (pp) {
        const act = pp.dataset.pp, id = sel.id;
        if (act === "prev" || act === "next") { stepAsset(act === "next" ? 1 : -1); popup.querySelector(`[data-pp="${act}"]`).focus(); }
        else if (act === "fit") fitDeal();
        else if (act === "back") zoomBack();
        else if (act === "open") GC.dealPanel.open(id, pp);
        else if (act === "more") {
          GC.inbox.popup(pp, `<button type="button" role="menuitem" data-pick="open">${GC.icon("open-in-new")}Open deal</button>
            <button type="button" role="menuitem" data-pick="edit">${GC.icon("edit")}Edit deal</button>
            <button type="button" role="menuitem" data-pick="archived">${GC.icon("bookmark")}Archive deal</button>`,
          (pick) => { if (pick === "open") GC.dealPanel.open(id, pp); else if (pick === "edit") GC.dealPanel.edit(id, pp); else GC.inbox.removeDeal(id, pick); });
        }
      }
    });
    root.addEventListener("change", (e) => {
      if (e.target.dataset.mapOpt) settings[e.target.dataset.mapOpt] = e.target.checked;
      syncMenuButton();
      renderPins();
    });
    document.addEventListener("pointerdown", (e) => {
      if (!menu.hidden && !e.target.closest(".map-ctl-wrap")) openMenu(false);
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) { e.stopPropagation(); openMenu(false); menuBtn.focus(); return; }
      if (e.key === "Escape" && sel.id) { e.stopPropagation(); const pin = closePopup(); if (pin) pin.focus(); }
    });


    window.addEventListener("resize", () => { if (root.offsetParent) fit(); });
    renderPins();
    fit();
  }

  /** Place a newly added deal on the map (near the centre, nudged so it doesn't cover an existing pin). */
  function placeNewDeal(deal) {
    let h = 0;
    for (const c of deal.id) h = (h * 31 + c.charCodeAt(0)) % 997;
    deal.map = { x: 380 + (h % 120) - 60, y: 680 + ((h * 7) % 140) - 70 };
    renderPins();
    if (root && root.offsetParent) centerOn(deal.map.x, deal.map.y);
  }

  /** Static crop of the base map centred on a point (used by the deal details drawer). */
  function baseSvg(pt, size) {
    const c = Object.assign({}, pt || { x: W / 2, y: H / 2 });
    const vw = (size && size.w) || 640, vh = (size && size.h) || 300;
    // keep the crop inside the drawn world so no blank edge shows
    c.x = Math.min(W - vw / 2, Math.max(vw / 2, c.x)); c.y = Math.min(H - vh / 2, Math.max(vh / 2, c.y));
    return baseMapSvg()
      .replace(`viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"`, `viewBox="${c.x - vw / 2} ${c.y - vh / 2} ${vw} ${vh}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"`);
  }

  GC.map = { mount, renderPins, fit, link, placeNewDeal, baseSvg, open: openPopup, close: closePopup };
})();
