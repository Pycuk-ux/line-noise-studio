# Deals Inbox · Add New Deal: clickable prototype (iteration 1)

The manual, multi-step fallback for adding a deal when the AI assistant is unavailable.
Static HTML/CSS/vanilla JS on the Gocanopy design system. Mock data only, no backend.

## Run

Live (private Artifact): https://claude.ai/artifact/QFehnUScTAf2ygpCEudiXQ. Rebuild the single-file version with `python3 tools/build-artifact.py OUT.html`.

```bash
cd deals-prototype
python3 -m http.server 8080
# open http://localhost:8080
```

DS stylesheets and icons load from `gocanopy-design-system.vercel.app`, so the page needs network access.
No build step.

**Tests (optional):** `bash tests/make-fixtures.sh && node tests/e2e.cjs` while the server runs. The test
needs Playwright and serves the Vercel DS from a local clone (`GOCANOPY_DS_ROOT`, default `../../gocanopy-design-system`).
It makes 123 checks (acceptance checklist, map, multi-asset, draft undo, stage grouping, board, card fields, card menu, details and edit drawers); the latest run passed all 123 with 0 console errors or warnings.

## Structure

```
index.html            Deals Inbox (Figma 18819:252983) + modal/toast mount points
css/app.css           page styles (DS tokens only)
css/deal-modal.css    modal, stepper, form, upload, preview (DS tokens only)
js/mock-data.js       deals, users, locations, funds… (copy from Figma)
js/format.js          formats, unit conversion, Rent/psm + NIY maths
js/state.js           the single state object, field schema, validation, isDirty, localStorage draft
js/ui.js              focus trap, toast (DS Alert), close-confirmation dialog
js/upload.js          dropzone, limits, simulated progress, DnD + keyboard reorder, remove
js/deal-modal.js      modal shell, stepper, Key/General/Physical/Financial steps, close + draft logic
js/preview.js         Preview step (mirrors Deal Details), AI flags, deal object
js/inbox.js           inbox list, add-deal + highlight
assets/img/           deal photos cropped from the provided screenshots (Figma assets were unreachable)
js/map.js             interactive map: vector base map, pins, pin settings, legend, pan/zoom
js/deal-panel.js      deal details drawer + edit deal drawer
css/deal-panel.css    drawer styles (DS tokens only)
docs/screens/         screenshots of every state
tests/                Playwright e2e (acceptance checklist)
TOKENS.md             token report: components, provisionals, off-system values
```

## What was built

- **Deals Inbox**, close to the Figma frame: navbar, header with total chip and unit controls, tabs, filters,
  row cards (5 mock deals), pagination and map. The **New deal** primary button sits above the map, on the right.
- **Add New Deal modal**: 960px for the input steps (fixed height, scrolling body) and 1200px for Preview.
  - **Stepper** uses the stage progress-bar pattern (done = check, current = tinted, upcoming = white, locked =
    disabled). Completed steps are clickable. Later steps unlock once every step before them is valid. Footer:
    Save as Draft · Back · Next / Add Deal.
  - **Key Info** *(all fields required)*:
    - Area, Price, Occupancy, Rent, **Rent/psm** (auto, read-only), **NIY** (prefilled and editable; tagged
      "edited" when overridden, with "Reset to calculated"), Number of assets.
    - Values are stored as sqm and per year, so Yearly/Monthly and SQM/SQF only change what is shown. With SQF
      selected the metric reads **Rent/psf**; SQM is the default. Currency defaults to EUR and changes the symbol
      only, with no conversion.
    - **Photos** *(optional)*:
      - Drag-drop or browse, `image/*` only, at most 10 files of up to 20MB each. Rejected files are listed by
        name with the reason.
      - Simulated per-file progress, an N/10 counter, and a "Cover" label on the first photo.
      - Reorder by drag and drop, or with the keyboard (focus the handle, then ←/→/Home/End). Remove with focus
        handling and screen-reader announcements.
      - At 10/10 the dropzone is disabled.
  - **General Info** *(optional)*: Deal name; Location / Region (autocomplete); Date received (defaults to
    today); Industry chips; Deal stage (defaults to Received); Fund; Team (multi-select with avatars); Next
    deadline (type + date); Broker (company + contact); Deal Source (market + process).
  - **Physical Info** *(optional)*: GLA / NLA, Land area, Year built / renovated (renovated can't be earlier
    than built), Floors, Units, Parking, Condition.
  - **Financial Info** *(optional)*: NOI, Operating expenses, ERV, Debt service, CapEx, Purchaser costs, WAULT,
    then **Assumption**: Exit yield, Rent growth, Hold period, LTV, Cost of debt. Nothing from Key Info is
    repeated.
  - **Preview** mirrors Deal Details: header (name, industry chip, stage chip, location, asset count), cover
    carousel, stage bar, key-metrics grid, Overview rows, Physical, and Financial. Each section has a right-aligned
    ghost **Edit** that jumps to its step with all state kept.
    - **AI generation** toggles (AI Summary, Key Strengths, Investment Risks) are all on by default. They are
      flags only, stored on the deal object as `record.ai`.
- **Close logic**: the ✕ button, Esc and an overlay click share one path.
  - With nothing entered, the modal closes immediately and resets.
  - With anything entered (dirty), a dialog offers **Save as Draft / Discard / Continue editing**. Esc inside the
    dialog means Continue editing.
- **Draft**: saved to `localStorage`, including photos re-encoded as compressed JPEGs. If storage is full, the
  photos are dropped and the toast says so. Reopening restores the draft on the step it was saved from, with a
  "Draft restored · Start over" banner.
- **Success**: the modal closes, a toast confirms, and the deal is added at the top of the list with a 4-second
  highlight. The header count and total value update.
- **Accessibility**:
  - `role=dialog` with `aria-modal`; the page behind is `inert`; focus is trapped and returns to the trigger.
  - `aria-current="step"`; a sr-only step heading receives focus on each step change; errors use
    `aria-invalid` and `aria-describedby`, and focus moves to the first invalid field.
  - Comboboxes follow the ARIA pattern (Esc closes only the list). Industry chips are a `radiogroup` with roving
    tabindex.

## Iteration 2 changes

- **Settings icon** sits centred again. The DS `setting` glyph had invalid CSS (`calc(50%-0.5px)`); a small shim in
  `js/format.js` repairs it, along with `arrow-right` (now back on Next). Both are DS bugs to fix upstream.
- **View switches** match Figma: left = List / Board (Board is visual only for now), right = Hide map / Show map
  (works: the list takes the full width when the map is off).
- **Interactive map** (`js/map.js`):
  - drag to pan, wheel or +/− to zoom, layers button resets the view; keyboard: arrows pan, +/− zoom;
  - pins styled as in Figma (stage colour + industry icon + value);
  - **pin settings dropdown**: what the pin shows (Price, Rent, Rent/psm, Area, NIY, Occupancy) and toggles for
    *Industry icon* and *Value label*; with both off, pins become stage-coloured dots;
  - legend filters pins by stage; hovering a card highlights its pin, clicking a pin highlights its card;
  - a newly added deal gets a pulsing pin. The base map is drawn from DS tokens (tiles and the Figma raster are unavailable).
- **Modal units**: Yearly/Monthly removed (rent is yearly). SQM/SQF + currency now sit on the "Key metrics" heading
  row; Physical and Financial follow that choice and have no unit controls of their own.
- **Auto-filled values** (Rent/psm, NIY) are static: not focusable, no hover, grey box with an "auto" tag. NIY keeps
  an **Override** action that turns it into an input, and **Reset to calculated** brings the auto value back.
- **Multi-asset deals** (CEO comment): Key Info has an **Assets** list. Each asset starts with *Asset type* and
  *Address* (required); add or remove assets. Number of assets is derived from the list. Physical Info has one block
  per asset, and Preview shows an assets table like the Deal Details "Asset" table. Deal-level Industry is prefilled
  from the first asset.
- The inbox now lists all 11 active deals (2 without price), each with a pin.

## Iteration 3 changes

- Inbox cards: hover (and hovering the card's map pin) fills the card with `#F9FAFB` (`--surface-secondary`) instead of an outline.
- Key metrics: the "* Required" note is gone; the asterisk next to each label is enough.
- Asset container: no border, `#F3F4F6` fill (`--color-grey-100`).
- **Deal name moved to Key Info** (top of the step, required). General Info no longer asks for Industry: the deal's
  industry comes from its assets (one type → that type, several types → Mixed-use).
- **Saved draft banner** spans the modal width with **Continue** and **Delete draft** on the right. Delete clears the
  form and shows a "Draft deleted · Undo" bar (focus moves to Undo; it disappears after 8 s). Undo restores the draft.

## Iteration 4 changes

- **Draft delete**: the draft card disappears and a separate **Undo** toast pops up at the bottom of the modal
  (8 s, dismissible). Undo brings the draft and its card back.
- **Modal header** is white; the stepper bar gets a thin border so it still reads on white.
- **Deal name pinned in the header** ("Add New Deal · Harbour Gate Logistics Park") from General Info onwards.
- **Sort → Deal stage** groups the list by stage (Figma 18829:253921, built from the brief — Figma was rate-limited):
  each stage is a `--surface-secondary` container; its header shows the abbreviation, the count in brackets and the
  stage's total on the right (empty when the stage has no priced deals) and is filled with the stage colour.
  Headers are `position: sticky`; once cards slide under, the 4 px ring around the header fills grey and a soft
  shadow appears. Stages are 16 px apart; empty stages show "(0)".
- **Kanban board** (left switch → Board; Figma 18829:254538, from the brief): one column per stage with the same
  sticky header behaviour (each column scrolls on its own), compact deal cards, horizontal scroll, no pagination.
- **Card fields** (settings icon): choose what deal cards show — Area, Rent, Rent/psm, NIY, WAULT, Occupancy, Deal
  source. Applies to list and board cards and is remembered in the browser.

## Iteration 5 changes

- **Kanban card** rebuilt from the provided screenshot: assignee (left) and price (right), clickable title, location
  with "(N assets)", photo slider (counter + prev/next; no navigation for a single photo; an empty placeholder when
  there are no photos — same as the list), industry + status chips, the field rows chosen in card settings (new
  option: Received), then a divider with comments (left, only if any) and Edit + "more" (right).
- **More menu** (list and board cards): Archive deal / Delete deal. Both remove the card and show a toast with Undo.
- **Clickable deal title** (underline on hover) opens the **deal details drawer**, sliding in from the right, with the
  Deal Details | Full page content: header, photos, stage bar, key metrics, Overview/Physical/Financial tabs, AI
  Summary, Asset table, map, Comps, Financial Model, Deal Memo, Key Highlights, Investment Risks, Sources.
  Top bar: » closes with a slide-out, full-page icon expands to the whole window, ↑/↓ move between deals in the
  current list/board order without closing (with "N of M"), Edit on the right.
- **Edit deal drawer** (from the drawer's Edit or a card's pencil): slides in over the details drawer, `--surface-main`
  background, one white card per section (Key Info, Assets, General, Physical, Financial). The header (title + tabs)
  is sticky with 16 px bottom padding and a shadow once content scrolls under; the active tab follows the card in
  view, and clicking a tab scrolls to its card. Save changes updates the card, map pin and drawer; Cancel / ✕ / Esc
  with unsaved changes closes and shows a "Changes discarded" toast with **Undo**, which reopens the edit with them.
- Mock metrics are now consistent: Rent/psm and NIY are derived from rent, area and price everywhere.

## Iteration 6 changes

- **Kanban spacing:** +4 px between cards in a column (now `--space-2`, 8 px) and +4 px between the info rows
  (Area / Rent / Deal source…, now `--space-2`).
- **Stage dropdown on cards:** the stage chip on list cards is a button; it opens a menu of all stages (current one
  checked). Picking one moves the deal (also between stage groups), shows a toast and is written to the deal log.
- **Sort → "Archived only":** lists archived deals (with an empty state when there are none); their menu offers
  Restore deal / Delete deal.
- **Per-asset metrics (New deal modal and Edit drawer):** every asset is a collapsible card. The header shows
  "Asset N · type · address · price"; clicking it opens type, address, Area, Price, Occupancy, Rent and the auto
  Rent/psm and NIY for that asset. In the modal, empty assets and assets with errors open automatically; filled
  ones start collapsed. In the edit drawer, all cards start collapsed and a newly added asset opens. Per-asset
  metrics are optional (the deal-level Key metrics stay required) and appear in the Preview and drawer asset tables.
- **Autofill (prototype helper):** a ghost button at the end of the Deal name input fills every required Key Info
  field (name, metrics, asset type and address) so you can click through the flow quickly. It only fills empty fields.
- **Details drawer tabs** (Figma 18831:258397): Deal Details · Assets · Comps · AI Assistant · Documents · Comments ·
  Logs. Assets, Comps, AI Assistant and Documents are shown but disabled for now. **Comments** (18831:260095): thread
  with avatars and relative times, composer with Send (disabled while empty); posting updates the tab count and
  the card's comment count. **Logs** (18831:260029): activity feed — stage changes, edits (lists the changed
  sections), comments, archive/restore and creation, on top of mock history. ←/→/Home/End move between enabled tabs.
- Figma was still rate-limited (Starter plan), so the tabs, Comments and Logs were built from the brief.

## Iteration 7 — matched to the Figma screens (file NGftdU9JMlH3iYtVmwPQaW)

Screens compared: Sorted by stage (16292:70411), Kanban + hover (16292:70931), Edit deal Drawer V.2 (16292:69875),
Deal Details viewport (16292:69220 / 68565), Log and Comments (16292:70814 / 70876), Map variation (16292:71767).

- **Map / pin settings:** "Pin settings" menu with *Show industry icon*, *Show description* and *Description: Price | Yield*.
  The map button shows `EUR` (price) or `EUR/sqm` (yield) and becomes icon-only when the description is off; pins go
  icon + value → icon-only → stage-coloured rings. Pins now have the stage-coloured border; hovering a card turns its
  pin dark (`--brand-primary`), as in the "Pin on map reacts" frame.
- **Grouped list:** header reads `Total amount: €…`; cards inside a stage group drop the stage chip (the group already
  says it). Owners are tinted 24px circles; unassigned deals show an outlined "+" circle.
- **Kanban:** 264px columns / 256px cards, radius 4 with the "sm" shadow, 120px photo with the 1 / N counter and round
  arrows, label-left / value-right rows, and a footer with edit · comments · more aligned right. Locations use country
  codes ("Wakefield, UK (12 assets)").
- **Edit deal drawer V.2:** 420px; "Edit deal" title; pill tabs (Key info, Assets, Overview, Physical, Financial);
  every section is a collapsible white card; single-column 40px fields. Key info follows Figma: Area, Rent (€/sqm),
  Price, Rent, Total assets, Occupancy, Cap rate (the three computed ones stay read-only). Deal name, dates, stage,
  owner, fund and source moved to Overview; Next deadline is now editable. Footer has two equal buttons; Save stays
  disabled until something changes.
- **Deal details drawer:** 1152px; top bar with », full page, ↑/↓, then **Edit** and **⋮** (Archive / Delete). Tabs
  in Figma order — Deal Details, Assets, Comps, Documents, AI Assistant, Comments, Log — at the large size. Header:
  photo thumbnail with slider, industry chip + **stage dropdown**, title, address. Seven key metrics (… Rent (€/sqm),
  Total assets, Cap rate). Overview + AI Summary (dated, one-line tags, "Show more"), mini map with **Show Comps**
  and numbered asset / comp pins, sortable **Assets** table with a Total row, then Key Highlights / Investment Risks.
  The stage bar, Comps, Financial Model, Deal Memo and Sources blocks were removed — they are not on this screen in
  Figma and belong to the Comps / AI Assistant / Documents tabs.
- **Comments:** composer on top ("Start typing to leave a comment", @ button, Send), newest first, tinted initial
  avatars, time on the right, @mentions highlighted, Copy + Reply (prefills @name) for others, Copy + Edit for your own.
- **Log:** "All event types" filter (stage changes, edits, comments, archive & restore, AI & highlights, deal received),
  Time | Log text table grouped by Today / Yesterday / date, relative times today and HH:MM before, "You" for the
  current user. Edits are logged per field ("updated Price: €61,200,000 → €65,000,000").

Not matched on purpose / still open:
- The Figma map is a raster tile image; Figma assets can't be downloaded through this environment's proxy (and the
  Artifact blocks tile servers), so the token-drawn vector map stays.
- Industry glyphs (bed, box, briefcase) are not in the DS icon set — `building` is used everywhere.
- 13px Figma text is snapped to 12/14; the DS Segmented control is used where Figma draws a grey-track switch.
- Figma copy slips fixed: "Finiancial" → Financial, the duplicated "Physical" pill → Assets, "Date received" showing
  "Structured Process" → a date.
- The Add New Deal modal still says Rent/psm and NIY; the drawers now say Rent (€/sqm) and Cap rate as in Figma. Tell
  me if the modal should switch too.

## Deviations from Figma

1. **DS components win over Figma** when they disagree: the navbar is rounded, the tabs are 14px, the segmented
   switch is outlined, filter buttons have borders, fields are about 46px tall, and avatars have no tint.
   Each case is listed in `TOKENS.md` §1 for fixing in the DS.
2. **13px text is snapped** to 12 or 14 (no 13px step in the DS). The 2px card gap became 4px.
3. **Modal follows the brief, not the Figma draft (18819:251376):**
   - The draft's pill tabs became the progress-bar stepper.
   - Its "Overview" step is named "General Info".
   - Its "Rent (€/sqm)" and "Total assets" fields are now "Rent/psm" and "Number of assets", matching the
     approved Deal Details page.
   - The footer is Save as Draft / Back / Next instead of Cancel / Next step.
4. **Icons:** there are no industry glyphs in the DS, so `building` / `house` stand in. Next uses
   `chevron-right` because the DS `arrow-right` glyph is broken.
5. **Photos and map** are crops of the provided screenshots, because `figma.com` asset URLs are blocked here.
6. **Physical and Financial fields** use the brief's fallback lists. The Physical/Financial tab variants of
   18819:251710 don't exist in the file.

## Critique of the brief

- **Required fields conflict with real data.** All Key Info is required, yet the inbox reports
  "2 without price", so price is evidently optional in real deals. Meanwhile Deal name (required in the brief)
  became optional, so a deal can be saved as "Untitled deal".
- **Stepper vs. stage bar.** Reusing the stage progress-bar pattern for the stepper puts two identical-looking
  bars on screen in Preview (the step bar and the deal stage) with different meanings.
- **Step locking adds little.** Only Key Info is required, so once it's valid every step unlocks at once.
- **"Pixel-close" and "reuse components exactly" can't both hold** while the DS components differ from Figma. I
  chose strict reuse and flagged each gap.
- **Unit controls.** The inbox header has its own Yearly/Monthly · SQM/SQF · EUR controls. The brief didn't say
  whether the modal should inherit them, so the modal keeps its own (defaulting to the house standard) and the
  header controls are visual only.
- **localStorage is a poor home for photo drafts** (about 5MB quota). This works for the prototype but needs
  server-side drafts in the product. There is also only one draft slot and no draft indicator in the inbox.
- **Field gaps:** missing Physical/Financial designs, "WALT" vs Figma's "WAULT" (WAULT used), and unclear
  units for "Purchaser costs" (implemented as %). NOI could be derived as rent − opex rather than typed.

## Questions for iteration 2

1. Should **Deal name** be required, and should **Price** become optional (to match "without price" deals)?
2. Stepper visual: keep the stage-bar look or switch to a numbered stepper to avoid confusion with the stage bar?
3. Should the modal inherit the inbox header units and currency, and should those header toggles re-render the cards?
4. Drafts: support several drafts with a "Drafts" view or chip in the inbox? Server-side storage?
5. DS backlog: tinted or surface Avatar variants, warning/info Badge, Select / Combobox / Modal components, a
   read-only field state, elevation tokens, a 13px type step, industry glyphs and colours, and fixing
   `arrow-right`. Which of these should land before iteration 2?
6. Should NOI be auto-calculated (Rent − Operating expenses, editable like NIY)? Is Purchaser costs a % or an amount?
7. Do we need responsive / tablet layouts for the modal?
8. Real Physical/Financial tab designs for Deal Details, so the step fields can mirror them exactly?
