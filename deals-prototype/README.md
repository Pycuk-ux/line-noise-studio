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
It makes 72 checks (acceptance checklist + map + multi-asset); the latest run passed all 72 with 0 console errors or warnings.

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
