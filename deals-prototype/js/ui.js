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
  GC.toast = function (message, subtext, status) {
    const region = document.getElementById("toast-region");
    const el = document.createElement("div");
    el.className = "ds-alert";
    el.dataset.status = status || "success";
    el.setAttribute("role", "status");
    const iconName = { success: "circle-check", error: "alert-circle", neutral: "info" }[el.dataset.status] || "info";
    el.innerHTML = `<div class="ds-alert__row"><span class="ds-alert__icon">${GC.icon(iconName)}</span><p class="ds-alert__msg">${GC.esc(message)}</p>
      <button type="button" class="ds-btn is-icon-only" data-type="ghost" data-size="sm" aria-label="Dismiss notification"><span class="ds-btn__icon">${window.DS_ICONS.get("x-close")}</span></button></div>
      ${subtext ? `<p class="ds-alert__subtext">${GC.esc(subtext)}</p>` : ""}`;
    region.appendChild(el);
    const remove = () => el.remove();
    el.querySelector("button").addEventListener("click", remove);
    setTimeout(remove, 6000);
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
})();
