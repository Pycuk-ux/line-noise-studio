/*
 * Interactive deals map (Figma: Filters-container/Map-container 16281:65544).
 * Base map is drawn as SVG from DS tokens (external tiles are blocked in the Artifact sandbox);
 * pins are HTML buttons placed over it, so they stay crisp and clickable at any zoom.
 */
window.GC = window.GC || {};

(function () {
  const W = 800, H = 1270;          // world size (map units)
  const MIN_K = 0.5, MAX_K = 3;
  const esc = GC.esc;

  const view = { k: 1, tx: 0, ty: 0, fitK: 1 };
  const settings = { metric: "price", showIcon: true, showLabel: true };
  const hiddenStages = new Set();
  let root, world, pinLayer, menu, menuBtn;

  const LEGEND = [
    { stage: "SCR", label: "SCR" }, { stage: "QUAL", label: "QUAL" }, { stage: "LOI", label: "LOI" },
    { stage: "DD", label: "DD" }, { stage: "SPA", label: "SPA" }, { stage: "Completed", label: "CL" },
    { stage: "Declined", label: "DECL" },
  ];
  const METRICS = [
    { id: "price", label: "Price" }, { id: "rent", label: "Rent" }, { id: "psm", label: "Rent/psm" },
    { id: "area", label: "Area" }, { id: "niy", label: "NIY" }, { id: "occupancy", label: "Occupancy" },
  ];

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
    switch (settings.metric) {
      case "rent": return d.rentYearly == null ? "—" : f.moneyShort(d.rentYearly, d.currency || "EUR");
      case "psm": return d.rentPsm == null ? "—" : f.currencySymbol(d.currency || "EUR") + f.num(d.rentPsm, 1);
      case "area": return d.areaSqm == null ? "—" : f.num(d.areaSqm, 0) + " sqm";
      case "niy": return d.niy == null ? "—" : f.num(d.niy, 1) + "%";
      case "occupancy": return d.occupancy == null ? "—" : f.num(d.occupancy, 1) + "%";
      default: return d.price == null ? "No price" : f.moneyShort(d.price, d.currency || "EUR");
    }
  }

  function pinsHtml() {
    const mode = settings.showIcon || settings.showLabel ? "pill" : "dot";
    return GC.inbox.deals.filter((d) => d.map && !hiddenStages.has(d.stage)).map((d) => {
      const label = metricLabel(d);
      return `<button type="button" class="map-pin${d.isNew ? " is-new" : ""}" data-ds-provisional="map-pin" data-id="${d.id}" data-stage="${esc(d.stage)}" data-mode="${mode}"
          aria-label="${esc(d.name)}, ${esc(d.stage)}, ${esc(label)}">
        ${mode === "dot" ? "" : `${settings.showIcon ? `<span class="map-pin__icon">${industryIcon(d.industry)}</span>` : ""}${settings.showIcon && settings.showLabel ? `<span class="map-pin__divider" aria-hidden="true"></span>` : ""}${settings.showLabel ? `<span class="map-pin__label">${esc(label)}</span>` : ""}`}
      </button>`;
    }).join("");
  }

  function placePins() {
    pinLayer.querySelectorAll(".map-pin").forEach((el) => {
      const d = GC.inbox.deals.find((x) => x.id === el.dataset.id);
      el.style.left = d.map.x * view.k + view.tx + "px";
      el.style.top = d.map.y * view.k + view.ty + "px";
    });
  }

  function renderPins() {
    if (!pinLayer) return;
    pinLayer.innerHTML = pinsHtml();
    placePins();
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
  function fit() {
    const r = root.getBoundingClientRect();
    if (!r.width) return;
    view.fitK = Math.max(r.width / W, r.height / H);
    view.k = view.fitK;
    view.tx = (r.width - W * view.k) / 2;
    view.ty = (r.height - H * view.k) / 2;
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
    return `<div class="map-menu" id="map-menu" role="dialog" aria-label="Map pin settings" data-ds-provisional="dropdown" hidden>
      <p class="map-menu__title" id="map-metric-l">Show on pins</p>
      <div class="map-menu__group" role="radiogroup" aria-labelledby="map-metric-l">
        ${METRICS.map((m) => `<label class="ds-control ds-radio map-menu__item"><input type="radio" name="map-metric" value="${m.id}" ${settings.metric === m.id ? "checked" : ""}><span class="ds-radio__circle"></span><span>${m.label}</span></label>`).join("")}
      </div>
      <div class="map-menu__divider" role="separator"></div>
      <label class="ds-control ds-switch map-menu__item map-menu__toggle"><span>Industry icon</span><input type="checkbox" role="switch" data-map-opt="showIcon" ${settings.showIcon ? "checked" : ""}><span class="ds-switch__track"><span class="ds-switch__thumb"></span></span></label>
      <label class="ds-control ds-switch map-menu__item map-menu__toggle"><span>Value label</span><input type="checkbox" role="switch" data-map-opt="showLabel" ${settings.showLabel ? "checked" : ""}><span class="ds-switch__track"><span class="ds-switch__thumb"></span></span></label>
      <p class="map-menu__hint">With both off, pins show as stage-coloured dots.</p>
    </div>`;
  }
  function openMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) (menu.querySelector("input:checked") || menu.querySelector("input")).focus();
  }
  function syncMenuButton() {
    const m = METRICS.find((x) => x.id === settings.metric);
    menuBtn.querySelector(".map-ctl__label").textContent = settings.showLabel ? m.label : "Pins";
  }

  // ---------- Highlight link with the list ----------
  function link(id, on) {
    const pin = pinLayer && pinLayer.querySelector(`.map-pin[data-id="${id}"]`);
    if (pin) pin.classList.toggle("is-linked", on);
    const card = document.querySelector(`.deal-card[data-id="${id}"]`);
    if (card) card.classList.toggle("is-linked", on);
  }

  // ---------- Mount ----------
  function mount(el) {
    root = el;
    root.innerHTML = `
      <div class="map-viewport" tabindex="0" aria-label="Deals map. Drag or use arrow keys to pan, plus and minus to zoom.">
        <div class="map-world">${baseMapSvg()}</div>
        <div class="map-pins"></div>
      </div>
      <div class="map-ctl-wrap">
        <button type="button" class="map-ctl" aria-haspopup="dialog" aria-expanded="false" aria-controls="map-menu">
          <span class="map-ctl__icon">${GC.icon("table-settings")}</span><span class="map-ctl__divider" aria-hidden="true"></span>
          <span class="map-ctl__label">Price</span>${GC.icon("chevron-down")}
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
      view.tx = drag.tx + e.clientX - drag.x;
      view.ty = drag.ty + e.clientY - drag.y;
      apply();
    });
    const end = () => { drag = null; vp.classList.remove("is-dragging"); };
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
      if (e.target.closest(".map-ctl")) { openMenu(menu.hidden); return; }
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
        const card = document.querySelector(`.deal-card[data-id="${pin.dataset.id}"]`);
        if (card) {
          card.scrollIntoView({ block: "center", behavior: "smooth" });
          card.classList.add("is-flash");
          setTimeout(() => card.classList.remove("is-flash"), 1600);
        }
      }
    });
    root.addEventListener("change", (e) => {
      if (e.target.name === "map-metric") settings.metric = e.target.value;
      if (e.target.dataset.mapOpt) settings[e.target.dataset.mapOpt] = e.target.checked;
      syncMenuButton();
      renderPins();
    });
    document.addEventListener("pointerdown", (e) => {
      if (!menu.hidden && !e.target.closest(".map-ctl-wrap")) openMenu(false);
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) { e.stopPropagation(); openMenu(false); menuBtn.focus(); }
    });

    // Pin ↔ card hover link
    root.addEventListener("pointerover", (e) => { const p = e.target.closest(".map-pin"); if (p) link(p.dataset.id, true); });
    root.addEventListener("pointerout", (e) => { const p = e.target.closest(".map-pin"); if (p) link(p.dataset.id, false); });
    root.addEventListener("focusin", (e) => { const p = e.target.closest(".map-pin"); if (p) link(p.dataset.id, true); });
    root.addEventListener("focusout", (e) => { const p = e.target.closest(".map-pin"); if (p) link(p.dataset.id, false); });

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
  function baseSvg(pt) {
    const c = pt || { x: W / 2, y: H / 2 };
    const vw = 640, vh = 300;
    return baseMapSvg()
      .replace(`viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"`, `viewBox="${c.x - vw / 2} ${c.y - vh / 2} ${vw} ${vh}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"`);
  }

  GC.map = { mount, renderPins, fit, link, placeNewDeal, baseSvg };
})();
