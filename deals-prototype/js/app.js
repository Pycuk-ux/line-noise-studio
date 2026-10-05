/* Page bootstrap. */
(function () {
  // Gocanopy brand mark — copied verbatim from the DS navbar factory (assets/js/pages.js, GOCANOPY_LOGO).
  const LOGO =
    '<span style="position:absolute;inset:20% 22.31% 20% 20%"><svg viewBox="0 0 23.0771 24" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.8511 4.40538C11.4744 4.23445 10.0775 4.44597 8.81172 5.01704C7.54593 5.58811 6.45949 6.49696 5.67008 7.64513C4.88068 8.7933 4.41841 10.137 4.33334 11.5307C4.24828 12.9245 4.54367 14.3151 5.18751 15.5519C5.83136 16.7887 6.83966 17.7938 8.02649 18.5166C9.21332 19.2393 10.5334 19.6291 11.9205 19.6291V24C9.74531 24 7.61154 23.4008 5.75037 22.2674C3.88921 21.134 2.3716 19.5095 1.36193 17.57C0.35227 15.6304 -0.110954 13.4497 0.0224388 11.2641C0.155832 9.07851 0.880757 6.97131 2.11869 5.17077C3.35662 3.37022 5.06036 1.94499 7.04536 1.04945C9.03035 0.153908 11.2209 -0.177799 13.3798 0.0902595C15.5387 0.358318 17.5835 1.21592 19.2929 2.57018C21.0022 3.92443 22.3109 5.81816 23.0771 7.86755H18.5718C18.5718 7.86755 17.9478 6.95778 16.6887 5.96027C15.5987 5.09668 14.2278 4.57632 12.8511 4.40538Z" fill="#fff"/></svg></span>' +
    '<span style="position:absolute;inset:51.58% 20.4% 20.21% 46.62%"><svg viewBox="0 0 13.1921 11.2848" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.1921 0H0L6.16718 3.8856V11.2848L13.1921 0Z" fill="#339989"/></svg></span>';

  function hydrateIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach((el) => {
      if (!el.dataset.hydrated) { el.innerHTML = window.DS_ICONS.get(el.dataset.icon); el.dataset.hydrated = "1"; el.setAttribute("aria-hidden", "true"); }
    });
  }

  function bindSegmented(root) {
    root.querySelectorAll(".page .ds-segmented").forEach((group) => {
      group.addEventListener("click", (e) => {
        const seg = e.target.closest(".ds-segment");
        if (!seg) return;
        group.querySelectorAll(".ds-segment").forEach((s) => s.setAttribute("aria-pressed", s === seg ? "true" : "false"));
      });
    });
    root.querySelectorAll(".page .ds-tabs").forEach((tabs) => {
      tabs.addEventListener("click", (e) => {
        const tab = e.target.closest(".ds-tab");
        if (!tab) return;
        tabs.querySelectorAll(".ds-tab").forEach((t) => t.setAttribute("aria-selected", t === tab ? "true" : "false"));
      });
    });
  }

  document.getElementById("ds-logo").innerHTML = LOGO;
  hydrateIcons();
  bindSegmented(document);
  GC.inbox.render();

  const addBtn = document.getElementById("add-deal-btn");
  addBtn.addEventListener("click", () => GC.dealModal.open(addBtn));
})();
