/* Shared UI helpers: focus trap, toasts (DS Alert), confirmation dialog. */
window.GC = window.GC || {};

(function () {
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusables(root) {
    return Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  /** Keeps Tab / Shift+Tab inside `root`. Returns a release function. */
  GC.trapFocus = function (root) {
    function onKey(e) {
      if (e.key !== "Tab") return;
      const list = focusables(root);
      if (!list.length) { e.preventDefault(); root.focus(); return; }
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  };
  GC.focusables = focusables;

  /** Toast built from the DS Alert component. */
  GC.toast = function (message, subtext, status, action) {
    const region = document.getElementById("toast-region");
    const el = document.createElement("div");
    el.className = "ds-alert";
    el.dataset.status = status || "success";
    el.setAttribute("role", "status");
    const iconName = { success: "circle-check", error: "alert-circle", neutral: "info" }[el.dataset.status] || "info";
    el.innerHTML = `<div class="ds-alert__row"><span class="ds-alert__icon">${GC.icon(iconName)}</span><p class="ds-alert__msg">${GC.esc(message)}</p>
      <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" aria-label="Dismiss notification"><span class="ds-btn__icon">${window.DS_ICONS.get("x-close")}</span></button></div>
      ${subtext ? `<p class="ds-alert__subtext">${GC.esc(subtext)}</p>` : ""}
      ${action ? `<button type="button" class="ds-btn" data-type="secondary" data-size="sm" data-toast-act>${GC.icon("refresh", "ds-btn__icon")}<span class="ds-btn__label">${GC.esc(action.label)}</span></button>` : ""}`;
    region.appendChild(el);
    const remove = () => el.remove();
    el.querySelector("button").addEventListener("click", remove);
    if (action) el.querySelector("[data-toast-act]").addEventListener("click", () => { remove(); action.onClick(); });
    setTimeout(remove, action ? 8000 : 6000);
    return el;
  };

  /**
   * Confirmation dialog for closing a dirty form.
   * Resolves to "draft" | "discard" | "continue".
   */
  GC.confirmClose = function () {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "dm-overlay";
      overlay.dataset.layer = "confirm";
      overlay.innerHTML = `
        <div class="dm" data-size="sm" role="alertdialog" aria-modal="true" aria-labelledby="cc-title" aria-describedby="cc-text" tabindex="-1" data-ds-provisional="modal">
          <div class="dm__head"><div class="dm__title-row"><h2 class="t-section-title" id="cc-title">Unsaved changes</h2></div></div>
          <div class="dm__body"><p class="dm__text" id="cc-text">You've entered deal information that hasn't been added yet. Save it as a draft to finish later, or discard it.</p></div>
          <div class="dm__foot">
            <button type="button" class="ds-btn" data-type="destructive" data-size="lg" data-choice="discard">Discard</button>
            <div class="dm__foot-right">
              <button type="button" class="ds-btn" data-type="secondary" data-size="lg" data-choice="continue">Continue editing</button>
              <button type="button" class="ds-btn" data-type="primary" data-size="lg" data-choice="draft">Save as Draft</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const dialog = overlay.querySelector(".dm");
      const parent = document.querySelector('.dm-overlay:not([data-layer="confirm"])');
      if (parent) parent.inert = true;
      const release = GC.trapFocus(dialog);

      function done(choice) {
        release();
        document.removeEventListener("keydown", onKey, true);
        overlay.remove();
        if (parent) parent.inert = false;
        resolve(choice);
      }
      function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done("continue"); }
      }
      document.addEventListener("keydown", onKey, true);
      overlay.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-choice]");
        if (btn) done(btn.dataset.choice);
        else if (e.target === overlay) done("continue");
      });
      dialog.querySelector('[data-choice="continue"]').focus();
    });
  };

  /**
   * "Select the reason" dialog for closing a deal through an Outcome (Figma 16339:73985).
   * Resolves to { reason, note } on Confirm, { reason: null } on Skip, or null when dismissed (✕ / Esc / backdrop).
   */
  GC.selectReason = function (outcome) {
    const esc = GC.esc, reasons = GC.OUTCOME_REASONS[outcome] || [];
    return new Promise((resolve) => {
      const back = document.activeElement;
      const overlay = document.createElement("div");
      overlay.className = "dm-overlay";
      overlay.dataset.layer = "confirm";
      overlay.innerHTML = `
        <form class="dm reason-dlg" data-size="xs" role="dialog" aria-modal="true" aria-labelledby="rd-title" tabindex="-1" data-ds-provisional="modal" novalidate>
          <div class="reason-dlg__head"><h2 class="reason-dlg__title" id="rd-title">Select the reason</h2>
            <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" data-rd="close" aria-label="Close"><span class="ds-btn__icon">${DS_ICONS.get("x-close")}</span></button></div>
          <div class="ds-field" data-size="small" data-state="default">
            <div class="ds-field__box prov-select-wrap" data-ds-provisional="select">
              <select class="ds-field__input prov-select" id="rd-reason" aria-label="${esc(outcome)} reason" data-empty="true">
                <option value="" disabled selected>${esc(outcome)} reason</option>
                ${reasons.map((r) => `<option>${esc(r)}</option>`).join("")}<option disabled>──────────</option><option value="Other">Other</option>
              </select><span class="ds-field__icon" aria-hidden="true">${DS_ICONS.get("chevron-down")}</span></div>
          </div>
          <div class="ds-field" data-size="small" data-state="default" id="rd-note-wrap">
            <div class="ds-field__box"><input class="ds-field__input" id="rd-note" type="text" autocomplete="off" maxlength="120" placeholder="Describe the reason, shortly" aria-label="Describe the reason, shortly"></div>
            <p class="ds-field__helper" id="rd-note-help" hidden>Add a short description for “Other”.</p>
          </div>
          <div class="reason-dlg__foot">
            <button type="button" class="ds-btn" data-type="secondary" data-size="lg" data-rd="skip">Skip</button>
            <button type="submit" class="ds-btn" data-type="primary" data-size="lg" data-rd="confirm" disabled>Confirm</button>
          </div>
        </form>`;
      document.body.appendChild(overlay);
      const form = overlay.querySelector("form"), sel = form.querySelector("#rd-reason"), note = form.querySelector("#rd-note");
      const ok = form.querySelector('[data-rd="confirm"]'), help = form.querySelector("#rd-note-help"), noteWrap = form.querySelector("#rd-note-wrap");
      const release = GC.trapFocus(form);
      const valid = () => !!sel.value && (sel.value !== "Other" || !!note.value.trim());
      function sync() {
        sel.dataset.empty = !sel.value;
        const needNote = sel.value === "Other" && !note.value.trim();
        help.hidden = !needNote;
        noteWrap.dataset.state = needNote && note.dataset.touched ? "error" : "default";
        ok.disabled = !valid();
      }
      function done(result) {
        release();
        document.removeEventListener("keydown", onKey, true);
        overlay.remove();
        if (back && back.isConnected) back.focus();
        resolve(result);
      }
      function onKey(e) { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(null); } }
      document.addEventListener("keydown", onKey, true);
      sel.addEventListener("change", () => { sync(); if (sel.value === "Other") note.focus(); });
      note.addEventListener("input", () => { note.dataset.touched = "1"; sync(); });
      form.addEventListener("submit", (e) => { e.preventDefault(); if (valid()) done({ reason: sel.value, note: note.value.trim() }); });
      overlay.addEventListener("click", (e) => {
        const b = e.target.closest("[data-rd]");
        if (b && b.dataset.rd === "close") done(null);
        else if (b && b.dataset.rd === "skip") done({ reason: null, note: note.value.trim() });
        else if (e.target === overlay) done(null);
      });
      sel.focus();
    });
  };
})();
