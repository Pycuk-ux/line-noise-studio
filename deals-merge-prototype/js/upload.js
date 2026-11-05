/* Photo upload: dropzone, validation, simulated progress, DnD + keyboard reorder, remove. */
window.GC = window.GC || {};

(function () {
  const MAX_FILES = 10;
  const MAX_MB = 20;
  let root = null;
  let onChange = () => {};
  let dragId = null;

  function imgs() { return GC.state.images; }

  // ---------- Rendering ----------
  function errorsHtml() {
    const errs = GC.state.uploadErrors;
    if (!errs.length) return "";
    return `<div class="ds-alert" data-status="error" role="alert">
      <div class="ds-alert__row"><span class="ds-alert__icon">${GC.icon("alert-circle")}</span>
        <p class="ds-alert__msg">${errs.length === 1 ? "1 file wasn't added" : errs.length + " files weren't added"}</p>
        <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" data-act="dismiss-errors" data-fkey="dismiss-errors" aria-label="Dismiss upload errors"><span class="ds-btn__icon">${DS_ICONS.get("x-close")}</span></button>
      </div>
      <ul>${errs.map((e) => `<li><strong>${GC.esc(e.name)}</strong> — ${GC.esc(e.reason)}</li>`).join("")}</ul>
    </div>`;
  }

  function thumbHtml(im, i, n) {
    const done = im.status === "done";
    const name = GC.esc(im.name);
    return `<li class="thumb" data-ds-provisional="thumbnail" data-id="${im.id}" data-status="${im.status}" draggable="${done}">
      <img src="${im.src}" alt="${name}">
      ${i === 0 ? `<span class="thumb__cover">Cover</span>` : ""}
      <div class="thumb__actions">
        <button type="button" class="ds-btn is-icon-only" data-type="secondary" data-size="sm" data-act="remove" data-fkey="rm-${im.id}" aria-label="Remove ${name}"><span class="ds-btn__icon">${DS_ICONS.get("bin")}</span></button>
      </div>
      ${done
        ? `<button type="button" class="ds-btn is-icon-only thumb__grip" data-type="secondary" data-size="sm" data-act="grip" data-fkey="grip-${im.id}"
             aria-label="Reorder ${name}, position ${i + 1} of ${n}${i === 0 ? ", cover image" : ""}" aria-describedby="reorder-hint"><span class="ds-btn__icon">${DS_ICONS.get("grip-vertical")}</span></button>
           <span class="thumb__index" aria-hidden="true">${i + 1}</span>`
        : `<div class="thumb__progress"><span data-role="pct">Uploading… ${Math.round(im.progress)}%</span>
             <div class="progress-track" role="progressbar" aria-label="Uploading ${name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(im.progress)}"><div class="progress-fill" style="width:${im.progress}%"></div></div></div>`}
    </li>`;
  }

  function html() {
    const n = imgs().length;
    const full = n >= MAX_FILES;
    return `
      <div class="upload-head">
        <h3 class="t-title" id="photos-title">Photos <span class="t-muted">(optional)</span></h3>
        <span class="upload-count" data-full="${full}" aria-label="${n} of ${MAX_FILES} photos">${n}/${MAX_FILES}</span>
      </div>
      <div class="prov-dropzone" data-ds-provisional="dropzone" role="button" tabindex="0" data-fkey="dropzone" data-compact="${n > 0}"
           aria-disabled="${full}" aria-labelledby="dz-title" aria-describedby="dz-desc">
        ${GC.icon("upload", "prov-dropzone__icon")}
        <span class="prov-dropzone__title" id="dz-title">${full ? "Limit reached — remove an image to add more" : "Drag and Drop Image Files here or click to browse"}</span>
        <span class="prov-dropzone__desc" id="dz-desc">Max 10 files and 20MB file size of each</span>
        <input type="file" accept="image/*" multiple hidden ${full ? "disabled" : ""}>
      </div>
      <div class="upload-errors">${errorsHtml()}</div>
      ${n ? `<ul class="thumb-grid" aria-labelledby="photos-title">${imgs().map((im, i) => thumbHtml(im, i, n)).join("")}</ul>` : ""}
      <p class="sr-only" id="reorder-hint">Use the left and right arrow keys to move the photo. The first photo is the cover.</p>
      <p class="sr-only" aria-live="polite" id="upload-live"></p>`;
  }

  function render() {
    if (!root || !root.isConnected) return;
    const fkey = document.activeElement && root.contains(document.activeElement) ? document.activeElement.dataset.fkey : null;
    root.innerHTML = html();
    if (fkey) {
      const el = root.querySelector(`[data-fkey="${fkey}"]`);
      if (el) el.focus();
      else root.querySelector('[data-fkey="dropzone"]').focus();
    }
  }

  function announce(msg) {
    const live = root && root.querySelector("#upload-live");
    if (live) { live.textContent = ""; setTimeout(() => (live.textContent = msg), 30); }
  }

  // ---------- File handling ----------
  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const errors = [];
    let slots = MAX_FILES - imgs().length;
    files.forEach((file) => {
      if (!file.type || !file.type.startsWith("image/")) errors.push({ name: file.name, reason: "unsupported format, images only" });
      else if (file.size > MAX_MB * 1024 * 1024) errors.push({ name: file.name, reason: `larger than 20MB (${(file.size / 1048576).toFixed(1)}MB)` });
      else if (slots <= 0) errors.push({ name: file.name, reason: "over the 10-file limit" });
      else { slots--; startUpload(file); }
    });
    GC.state.uploadErrors = errors;
    render();
    const added = files.length - errors.length;
    announce(`${added} photo${added === 1 ? "" : "s"} uploading.${errors.length ? ` ${errors.length} rejected.` : ""}`);
    onChange();
  }

  function startUpload(file) {
    const item = {
      id: "img" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: file.name, size: file.size, status: "uploading", progress: 0,
    };
    item.objectUrl = URL.createObjectURL(file);
    item.src = item.objectUrl;
    imgs().push(item);
    let progressDone = false, dataDone = false;

    item.timer = setInterval(() => {
      if (!GC.state.images.includes(item)) { clearInterval(item.timer); return; }
      item.progress = Math.min(100, item.progress + 6 + Math.random() * 16);
      updateProgress(item);
      if (item.progress >= 100) { clearInterval(item.timer); progressDone = true; finish(); }
    }, 110);

    compress(item.objectUrl).then((dataUrl) => { item.data = dataUrl; dataDone = true; finish(); })
      .catch(() => {
        clearInterval(item.timer);
        const list = GC.state.images;
        const idx = list.indexOf(item);
        if (idx < 0) return;
        list.splice(idx, 1);
        GC.state.uploadErrors.push({ name: item.name, reason: "couldn't read this image" });
        render(); onChange();
      });

    function finish() {
      if (!(progressDone && dataDone) || !GC.state.images.includes(item)) return;
      item.status = "done";
      render();
      announce(`${item.name} uploaded.`);
      onChange();
    }
  }

  function updateProgress(item) {
    if (!root) return;
    const li = root.querySelector(`.thumb[data-id="${item.id}"]`);
    if (!li) return;
    const pct = Math.round(item.progress);
    const fill = li.querySelector(".progress-fill");
    const bar = li.querySelector('[role="progressbar"]');
    const label = li.querySelector('[data-role="pct"]');
    if (fill) fill.style.width = pct + "%";
    if (bar) bar.setAttribute("aria-valuenow", pct);
    if (label) label.textContent = `Uploading… ${pct}%`;
  }

  /** Downscale to a JPEG data URL so drafts fit in localStorage and the inbox card can show it. */
  function compress(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * scale));
        c.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; // canvas backdrop for transparent PNGs (not UI colour)
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        try { resolve(c.toDataURL("image/jpeg", 0.8)); } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function removeImage(id) {
    const list = imgs();
    const idx = list.findIndex((im) => im.id === id);
    if (idx < 0) return;
    const [im] = list.splice(idx, 1);
    clearInterval(im.timer);
    if (im.objectUrl) URL.revokeObjectURL(im.objectUrl);
    render();
    // Keep keyboard focus in the grid.
    const next = list[idx] || list[idx - 1];
    const target = next && root.querySelector(`[data-fkey="rm-${next.id}"]`);
    (target || root.querySelector('[data-fkey="dropzone"]')).focus();
    announce(`${im.name} removed. ${list.length} of ${MAX_FILES} photos.${idx === 0 && list[0] ? ` ${list[0].name} is now the cover.` : ""}`);
    onChange();
  }

  function moveImage(id, to) {
    const list = imgs();
    const from = list.findIndex((im) => im.id === id);
    if (from < 0) return;
    to = Math.max(0, Math.min(list.length - 1, to));
    if (to === from) return;
    const [im] = list.splice(from, 1);
    list.splice(to, 0, im);
    render();
    announce(`${im.name} moved to position ${to + 1} of ${list.length}.${to === 0 ? " It is now the cover." : ""}`);
    onChange();
  }

  // ---------- Events (delegated on root) ----------
  function bind() {
    root.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]");
      if (act) {
        const id = act.closest(".thumb") && act.closest(".thumb").dataset.id;
        if (act.dataset.act === "remove") removeImage(id);
        if (act.dataset.act === "dismiss-errors") { GC.state.uploadErrors = []; render(); root.querySelector('[data-fkey="dropzone"]').focus(); }
        return;
      }
      const dz = e.target.closest(".prov-dropzone");
      if (dz && dz.getAttribute("aria-disabled") !== "true") dz.querySelector("input").click();
    });

    root.addEventListener("keydown", (e) => {
      const dz = e.target.closest && e.target.closest(".prov-dropzone");
      if (dz && e.target === dz && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        if (dz.getAttribute("aria-disabled") !== "true") dz.querySelector("input").click();
        return;
      }
      const grip = e.target.closest('[data-act="grip"]');
      if (!grip) return;
      const id = grip.closest(".thumb").dataset.id;
      const idx = imgs().findIndex((im) => im.id === id);
      const map = { ArrowLeft: idx - 1, ArrowUp: idx - 1, ArrowRight: idx + 1, ArrowDown: idx + 1, Home: 0, End: imgs().length - 1 };
      if (e.key in map) { e.preventDefault(); moveImage(id, map[e.key]); }
    });

    root.addEventListener("change", (e) => {
      if (e.target.matches('input[type="file"]')) { addFiles(e.target.files); e.target.value = ""; }
    });

    // Dropzone: files from the OS
    root.addEventListener("dragover", (e) => {
      const dz = e.target.closest(".prov-dropzone");
      const isFiles = e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");
      if (dz && isFiles) {
        e.preventDefault();
        const disabled = dz.getAttribute("aria-disabled") === "true";
        e.dataTransfer.dropEffect = disabled ? "none" : "copy";
        dz.dataset.dragover = disabled ? "false" : "true";
        return;
      }
      // Thumbnails: reorder
      const li = e.target.closest(".thumb");
      if (li && dragId && li.dataset.id !== dragId) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const r = li.getBoundingClientRect();
        root.querySelectorAll(".thumb[data-drop]").forEach((t) => t !== li && t.removeAttribute("data-drop"));
        li.dataset.drop = e.clientX < r.left + r.width / 2 ? "before" : "after";
      }
    });
    root.addEventListener("dragleave", (e) => {
      const dz = e.target.closest(".prov-dropzone");
      if (dz && !dz.contains(e.relatedTarget)) dz.dataset.dragover = "false";
      const li = e.target.closest(".thumb");
      if (li && !li.contains(e.relatedTarget)) li.removeAttribute("data-drop");
    });
    root.addEventListener("drop", (e) => {
      const dz = e.target.closest(".prov-dropzone");
      if (dz && e.dataTransfer.files && e.dataTransfer.files.length) {
        e.preventDefault();
        dz.dataset.dragover = "false";
        if (dz.getAttribute("aria-disabled") === "true") {
          GC.state.uploadErrors = Array.from(e.dataTransfer.files).map((f) => ({ name: f.name, reason: "over the 10-file limit" }));
          render(); onChange();
        } else addFiles(e.dataTransfer.files);
        return;
      }
      const li = e.target.closest(".thumb");
      if (li && dragId) {
        e.preventDefault();
        const list = imgs();
        const from = list.findIndex((im) => im.id === dragId);
        let to = list.findIndex((im) => im.id === li.dataset.id);
        if (li.dataset.drop === "after") to += 1;
        if (from < to) to -= 1;
        const id = dragId;
        dragId = null;
        moveImage(id, to);
      }
    });
    root.addEventListener("dragstart", (e) => {
      const li = e.target.closest && e.target.closest(".thumb");
      if (!li || li.dataset.status !== "done") return;
      dragId = li.dataset.id;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dragId);
      li.dataset.dragging = "true";
    });
    root.addEventListener("dragend", () => {
      dragId = null;
      root.querySelectorAll(".thumb").forEach((t) => { t.removeAttribute("data-dragging"); t.removeAttribute("data-drop"); });
    });
  }

  GC.upload = {
    MAX_FILES, MAX_MB,
    mount(el, opts) {
      root = el;
      onChange = (opts && opts.onChange) || (() => {});
      render();
      bind();
    },
    // exposed for tests / programmatic use
    addFiles, removeImage, moveImage,
  };
})();
