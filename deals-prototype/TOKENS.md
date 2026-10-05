# Token Mapping Report — Deals Inbox + Add New Deal

- **Design system:** `Pycuk-ux/gocanopy-design-system` @ `b6313e5`, loaded live from
  `https://gocanopy-design-system.vercel.app/assets/…` (tokens, button, text-field, controls,
  data-display, nav CSS + `icons.js`). `base.css` is docs-site chrome and is not loaded.
- **Figma sources:** `IhTCXh6dhMZD44NssQt0sS` (18819:252983 / 18819:251708) and the copy
  `NGftdU9JMlH3iYtVmwPQaW` (16281:65293). The copy was used once the first file hit the Starter-plan MCP limit.
- **Audit:** `match.py audit` → **0 off-system spacing / radius / colour values** in
  `css/app.css`, `css/deal-modal.css` and `index.html`. Every remaining raw `px` is a layout
  dimension (widths/heights), listed at the bottom.

---

## 1. DS components reused (unchanged)

| Component | Where | Notes |
|---|---|---|
| **Navbar** `.ds-navbar`, `.ds-navbar-item`, `.ds-navbar__divider`, `.ds-user-dropdown` | Page top | Logo SVG copied verbatim from `pages.js` (`GOCANOPY_LOGO`). |
| **Avatar** `.ds-avatar` | Navbar user, inbox owner, team tokens, team options, preview team stack | |
| **Tabs** `.ds-tabs` / `.ds-tab[data-size=large]` | Inbox / Analytics | |
| **Switch (segmented)** `.ds-segmented` / `.ds-segment` | Yearly/Monthly, SQM/SQF (page header + modal units bar), layout/density toggles | |
| **Button** `.ds-btn` primary / secondary / ghost / destructive, `lg` `md` `sm`, `.is-icon-only` | Every button: New deal, filters, Report, card actions, modal close, Back / Next / Add Deal / Save as Draft, Edit links, NIY "Reset to calculated", image remove + reorder handle, confirm dialog | |
| **Text field** `.ds-field` (`medium`, `small`), `__label`, `__req`, `__box`, `__icon`, `__input`, `__helper`, `data-state=error` | All inputs, search, and the box around native selects | Empty helpers use the `hidden` attribute (DS docs: "omit when not needed"). |
| **Toggle** `.ds-control.ds-switch` | AI Summary / Key Strengths / Investment Risks | |
| **Alert** `.ds-alert` success / error / neutral | Toasts, upload errors, "Draft restored" banner | |
| **Icons** `DS_ICONS` | All glyphs (16px frame) | 0 icons downloaded from Figma; see §5 for gaps. |

Only screen layout touches DS classes (`width` of a field in a toolbar, a negative `margin` to overlap
stacked avatars, `vertical-align`). No colour, radius, padding or type of a DS component is overridden.

### Divergences: Figma ≠ shipped component (reused anyway, **fix in the DS**)

`components.py spec` was run for each one.

| Component | Figma | DS today | Visible effect |
|---|---|---|---|
| Navbar | full-bleed, radius 0, 48px tall, notification bell | radius **8px**, padding 8/12, AI button slot | Rounded corners on the app bar; the bell is a provisional add-on. |
| Tabs (large) | label 16/20/600, active `text/positive #2b8072`, bar border `grey-300` | 14px / 500, active `--brand-secondary`, border `--border-default` | Tabs smaller/lighter than Figma. |
| Segmented switch | radius 4, padding 4, no border, item 80px | radius **8**, padding 2, 1px border, hug width | Toggles slightly rounder and outlined; icon-only segments are wider (12px side padding). |
| Button (secondary) | Filter buttons: white, **no border**, text `brand/primary` | secondary = white **with** `--border-default`, text `--text-secondary` | Filter buttons outlined. |
| Text field | 40px box, label 12/500 `text/tertiary` | `medium` ≈ 46px box (12/8 padding + 20px line), label 12/400 `--text-secondary` | Modal fields ~6px taller than Figma. |
| Avatar | owner chip on cards: 24px, fill `#e5ebef`, `text/link` 12/600; deal-page team avatars tinted (purple/yellow/emerald-100) | 24px, fill **`--surface-white`**, no tint variants | **On white cards the avatar circle disappears** (initials only). Needs a `surface`/tint variant. |
| Alert | used inline full-width for upload errors | fixed `width: 360px` | Upload-error alert doesn't span the form. |

---

## 2. New elements, all built from tokens and marked `data-ds-provisional`

| Provisional (`data-ds-provisional`) | Figma ref | Key token assignments |
|---|---|---|
| `modal` (main + confirm) | 18819:251376 | surface `--surface-white`, radius `--radius-8`, header band `--surface-main`, overlay `--surface-overlay`, padding `--space-4`/`--space-3`, footer border `--border-default`, shadow `--color-alpha-light-100/200` (see §4) |
| `stepper` | progress-bar 18819:251742 | bar `--surface-white` p `--space-1` gap `--space-1` r `--radius-8`; item h `--space-8`, p `--space-2`/`--space-3`, r `--radius-4`; done `--surface-main` + `--text-positive-hover` + `--icon-positive`; current `--surface-positive`; upcoming `--text-tertiary`; locked `--text-disabled`; type `--text-label-sm-*` |
| `dropzone` | 18819:251433 | `--surface-secondary`, 1px dashed `--border-strong`, `--radius-8`; drag-over `--brand-secondary` + `--surface-positive`; title `--text-body-sm-*` 600 `--text-secondary`; desc `--type-caption-*` `--text-tertiary` |
| `thumbnail` | — | `--radius-4`, `--surface-main`; cover label `--brand-primary` / `--text-inverse`; progress overlay `--color-alpha-light-500`, track `--color-alpha-dark-300`, fill `--brand-secondary` |
| `field-affix` (€ / sqm / % / yr suffixes) | — | `--text-tertiary`, `--text-body-sm-size` |
| `tag` ("auto" / "edited") | — | `--surface-main` / `--text-tertiary`; edited `--color-yellow-50` / `--color-yellow-800` |
| `select` (native select inside `.ds-field__box`) | Input field w/ chevron | DS field box + `chevron-down` icon |
| `combobox` (Location, Team) | — | listbox `--surface-white`, `--border-default`, `--radius-4`, option p `--space-2`, active `--surface-white-hover`, team token `--surface-main` / `--radius-full` |
| `chip` (industry radio chips, inbox industry chip, total chip, status pill, stage chip) | industry-chip, deal-stage-dropdown | industry `--surface-secondary`/`--text-secondary`, selected `--surface-positive` + `--brand-secondary` border; header Logistics `--color-lime-50`/`--color-lime-900`; status Processing `--color-yellow-50`/`-700`, New `--color-indigo-50`/`-500`, Review `--surface-warning-light`/`--text-warning-pressed`; stage SCR `yellow-50/200/800`, LOI `indigo-50/200/500`, QUAL/Completed `--surface-positive`, DD/SPA `purple-50/200/700` |
| `section-heading` | section-heading | min-h `--space-8`, title `--type-h5-*` / `--text-body-md-*` 600, Edit = DS ghost `sm` button |
| `key-metrics` | 18819:251743 | `--surface-white`, py `--space-4`, item px `--space-4`, dividers `--border-default`, label caption, value body-md 600 |
| `row-card` | 16281:65335 | `--surface-white`, `--radius-8`, p `--space-3`/`--space-2`, gap `--space-5`; media `--radius-4`; stats gap `--space-6`; new-deal highlight `--surface-positive` + outline `--brand-secondary` |
| `pagination` | 16281:65538 | items `--space-6`, current `--surface-main` / `--text-link` |
| `map` | Map-container | static image cropped from the user's screenshot |
| `notification-button` | navbar bell | `--icon-inverse`, badge `--icon-negative` / `--text-inverse` |

| `map-pin` | pin-qual-office-sqm (16281:65599) | stage palette (below), `--radius-full`, padding `--space-none`/`--space-1`, min-h `--space-5`, divider `--border-default`, shadow `--color-alpha-light-200`; dot mode `--space-3` |
| `dropdown` (map pin settings) | Map "Price ▾" control | `--surface-white`, `--border-default`, `--radius-4`; contents are DS **Radio** + DS **Toggle** |
| map base (inside `map`) | Map-container | drawn as SVG: land `--color-grey-100`, water `--color-cyan-100`, parks `--color-emerald-100`, streets `--surface-white`, motorways `--color-orange-200`, ring `--color-yellow-200`, labels `--text-tertiary`; overlays `--color-alpha-dark-600` |
| `readonly-field` (auto-filled Rent/psm, NIY) | — | box `--surface-secondary` + `--border-default` + `--radius-4`, padding `--space-3`/`--space-2` (same box as DS field), **no hover, not focusable**, value `--text-body-md-*`, error `--border-negative` |
| `asset-row` | — (CEO: "each asset starts with asset type, address") | fill `--color-grey-100` (#F3F4F6, no border), `--radius-8`, p `--space-3`, gap `--space-3`/`--space-4`; fields are DS Text field + provisional select |
| `banner` (draft restored / deleted + Undo) | — | `--color-grey-100`, left rule `--space-1` `--brand-primary`, `--radius-4`, p `--space-3`/`--space-4`; DS Buttons |
| `stage-group` / `board-column` | 18829:253921 / 18829:254538 (built from the brief) | container `--surface-secondary`, `--radius-8`, p `--space-1`, groups `--space-4` apart; header fill = stage palette, h `--space-8`, `--text-label-md-*` 600; stuck: ring `--surface-main` + shadow `--color-alpha-light-100` |
| `board-card` | — | `--surface-white`, `--radius-8`, p `--space-3`, stats grid gap `--space-2`/`--space-3` |
| `toast` (Undo, in-modal) | — | `--surface-white`, `--border-default`, `--radius-8`, shadow `--color-alpha-light-200`; DS ghost buttons |
| `drawer` (details + edit) | 18830:256700 / 18830:255890 (built from the brief) | details `--surface-main`, top bar `--surface-white` + `--border-default`; edit `--surface-main`, cards `--surface-white` `--radius-8` p `--space-4`, sticky head pb `--space-4` + shadow `--color-alpha-light-100`; backdrop `--color-alpha-light-200`; content reuses key-metrics, overview rows, table, DS Badge (AI tags), DS Tabs (edit sections), DS Switch (overview tabs) |
| `dropdown` (deal menu) | — | `--surface-white`, `--border-default`, `--radius-4`; Delete in `--text-negative-hover` |
| `table` (preview assets) | Deal Details Asset table | header `--surface-secondary` / `--text-tertiary` caption, rows `--border-default`, values `--text-label-md-*` |

**Stage palette** (Figma `stage/*` variables mapped to DS primitives, shared by stage chips, map pins and the map legend):
SCR `yellow-50/800/200`, QUAL `emerald-50/800/100`, LOI `cyan-50/800/100`, DD `violet-50/800/100`, SPA `purple-50/800/100`,
Completed `green-50/700/100`, Declined `red-50/700/100`, Received/Other `--surface-secondary`/`--text-secondary`.

`components.py migrate` will pick these up once matching components ship.

---

## 3. Typography: Figma styles snapped to the DS scale

| Figma style | Used for | DS token(s) | Δ |
|---|---|---|---|
| heading-1 24/28/600 | Page title, preview deal name | `--type-h4-*` 24/32/600 | line +4 |
| heading-2 20/24/600 | Modal title, preview section titles | `--type-h5-*` 20/28/600 | line +4 |
| heading-4 16/20/600 | Card title, price, metric value | `--text-body-md-size/line` + weight `--type-h6-weight` | — |
| **caption-l 13/16/400** | Row labels, metric labels | `--type-caption-*` **12**/16/400 | **−1px size** |
| **body-xs 13/16/500** | Row values, chips | `--text-label-md-*` **14**/16/500 | **+1px size** |
| body-s 14/22/500 | Sub-title, location | `--text-label-md-*` 14/16/500 | line −6 |
| caption-m 12/16/500 | Stepper / stage labels | `--text-label-sm-*` 12/14/500 | line −2 |
| button-md 14/16/500 | Buttons (DS) | `--label-md-*` | — |

The 13px Figma sizes have no DS equivalent and are the biggest systematic difference: **add a 13px step
to the DS or migrate Figma to 12/14.**

---

## 4. ⚠ Off-system values (please review)

| Value (Figma) | Where | Used | Δ / note |
|---|---|---|---|
| `13px` text | everywhere (see §3) | 12 or 14 | ±1px |
| `2px` gap between inbox cards | deal list | `--space-1` (4px) | +2px. No 2px spacing token (Figma file has `Spacing-2`). |
| `2px` vertical row padding | overview rows | `--space-none` | −2px |
| `#e5ebef` owner-avatar fill | inbox card | DS Avatar (white) | no token; nearest `--color-neutral-light-grey` #e9edee (Δ4.6) |
| Figma `surface/secondary #f3f4f6` | dropzone, chips | DS `--surface-secondary` **#f9fafb** | Same name, different value. Figma's value equals DS `--surface-white-hover`. |
| Figma `text/positive #2b8072` | stepper, chips, total chip | `--text-positive-hover` / `--brand-secondary-hover` (#2b8072) | DS `--text-positive` is #339989. Matched by value, not by name. |
| Figma `text/negative #c73939` | "3d to deadline" | `--text-negative-hover` (#c73939) | DS `--text-negative` is #ef4444 |
| Modal shadow `0 4 4 #0000001F, 0 2 8 #00000029` | modal, listbox | `--color-alpha-light-100` (#00000017) / `-200` (#00000033) with `--space-1/2` offsets | No elevation tokens in the DS |
| Modal radius 8 / item radius 16 (Figma draft pill tabs) | stepper | not used: stepper follows the approved progress-bar pattern (radius 4) | — |
| Industry icons (hotel / office / logistics glyphs) | chips | DS `building` (`house` for Residential) | **No industry glyphs in the DS icon set** |
| `setting`, `contact` icons | Table settings button | DS glyph, repaired at load | **DS bug:** `top:calc(50%-0.5px)` (no spaces) is invalid CSS, so the glyph drifts up. Shim in `js/format.js` adds the spaces. |
| `arrow-right` icon | Next button | DS glyph, repaired at load | **DS bug:** JSX leftover `style={{ containerType: "size" }}` (renders empty) **and** the path is the left arrow (flip lost). Shim fixes both. |
| Kanban / board icon | View switch | DS `cards` rotated 90° | No board glyph in the DS |
| Close drawer » | details drawer | DS `chevrons-left` mirrored | No `chevrons-right` glyph in the DS |
| Archive icon | deal menu | DS `bookmark` | No archive glyph in the DS |
| Map pin text 10/12/500–600 | map pins, legend | `--label-xs-*` 12/14 | +2px — no 10px step |
| Map overlay `backdrop-blur 10px` | zoom, legend | literal `blur(10px)` | no blur/elevation tokens |
| Map base | map | vector drawing from tokens | Figma map raster can't be downloaded here, and Artifact CSP blocks tile servers |
| Only Logistics has industry colours (lime) | preview header chip | `--color-lime-50/900` | Other industries fall back to neutral |

Non-CSS literals: the brand mark's `#fff` / `#339989` fills (copied verbatim from the DS),
and a `#fff` canvas backdrop used when JPEG-encoding uploaded PNGs (not UI colour).

### Layout dimensions (informational, not tokenised)
Modal 960px (input steps) / 1200px (Preview) / 480px (confirm), height `min(780px, 100vh − 2×--space-8)`;
inbox map column 400px; card media 120×136; preview cover column 350px, cover 144px tall;
search 340px, sort 200px, per-page 72px, units currency 96px; listbox max-height 240px;
dropzone min-height 120px (72px once photos exist); stage "Other" column 128px.
