# Line Noise Studio

A browser-based tool for creating animated **gradient-line + noise** visual effects with static background typography, and exporting them to **PNG**, **WEBM**, or **MP4**.

Built with React 19 + Vite + Tailwind v4, rendered on a **WebGL2** fragment shader for smooth gradients and GPU noise, and exported frame-accurately via the **WebCodecs** API.

## Concept

The canvas is tiled into **rows of rectangular cells** ("fractal glass"). Each cell owns its **own animated horizontal gradient** that flows and drifts in color independently — there is no single global sweep. On top of that:

1. **Transparency map** — a 4D simplex-noise field animates the per-pixel alpha of the cells, so the fill dissolves and reforms randomly over time. Because it evolves around a circle (4D noise), the loop is **seamless**.
2. **Glass warp** — noise distorts each cell's gradient for a refracted-glass shimmer.
3. **Grain overlay** — a high-frequency hash noise on top, with independent density and opacity.
4. **Line mask (bubble)** — a central superellipse "bubble" **fades the gradient-lines layer** so the text (and background) beneath shows through. It's independent of the text, with controls for size, shape (circle → squircle), curvature (round → wide), and transparency intensity (hard edge → smoothest fade).

Layer order (bottom → top): **background → text → masked gradient lines.** Rows fill completely at thickness 1.0 (no gap between lines).

## Controls

**Lines** — rows, cells per row, thickness (row fill), width, angle X (shear) / angle Y (rotate), gradient colors A/B, gradient frequency, opacity.
**Animation** — speed / flow, glass warp, transparency-map scale, loop length.
**Noise (grain)** — density, opacity.
**Text** — content (multi-line), font (system stacks · **40 curated Google Fonts** across sans / serif / handwriting / mono, loaded on demand · **or upload your own** `.ttf/.otf/.woff`), **weight** (only the weights the chosen font ships), size, color, line spacing, letter spacing, alignment (left / center / right).
**Line mask (bubble)** — bubble size, shape (circle → squircle), curvature (round → wide), and a **radial transparency gradient** with two draggable stops (center/edge opacity + positions) so the falloff can be gradual or sharp. Independent of layer opacity.
**Background** — solid or two-color gradient fill with adjustable angle.
**Canvas** — presets: 1920×1080 (1080p), 1280×720 (720p), Square 1080, Portrait 1080×1920, Wide 2560×1080.
**Export** — resolution (Match canvas / 1080p / 2K), FPS, format buttons.

## Export

| Format | How |
| ------ | --- |
| **PNG** | Current frame, full canvas resolution. |
| **WEBM** | WebCodecs (VP9) where available; MediaRecorder fallback otherwise. Works in all modern browsers. |
| **MP4** | WebCodecs (H.264). **Chrome / Edge only** — the button is disabled with a note elsewhere. |

Video export renders every frame at the exact loop time and FPS you set, so output is frame-accurate and matches the seamless loop.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
```

## Notes

- **Browser support:** MP4 requires the WebCodecs API (Chromium-based browsers). WEBM + PNG work everywhere.
- The muxer libraries (`mp4-muxer`, `webm-muxer`) are deprecated upstream in favor of [Mediabunny](https://github.com/Vanilla-OS/mediabunny). They still work; migrating is a possible future improvement.
- Uploaded fonts stay in-memory for the session (via the `FontFace` API) — nothing is sent anywhere.

## Collectible card (`/card/`)

A second page: an interactive Three.js holographic trading card, built from
the Figma frame *Pycuk_DS › card* (node `504:1066`).

```bash
npm run dev   # open http://localhost:5173/card/
```

- **Layers**: every Figma layer is a separate PNG in `public/card/card/`. Their
  positions (Figma px, 1 world unit = 1 px) live in `src/card/layout.ts`.
- **Card stock**: 4 px extruded rounded rectangle with a small bevel on the edge (`CARD.thickness`).
- **Window parallax**: `moving-inside-elements`, `my-photo` and `scan-effect`
  (hard-light 30 %) drift at different depths inside the torn-edge mask (`WINDOW_LAYERS[].depth`).
- **Floating elements**: name, signature, UX/UI, icons, barcode and 7 YOE sit
  above the card surface (`DECALS[].lift`) with soft shadows underneath.
- **Holographic laminate**: `holographic-layer.png` drives an additive rainbow
  foil, a gloss band and a glare that react to tilt (`src/card/shaders.ts`).
- **Extras**: Bitcoin, Chinese coin and unicorn use drawn placeholders until
  `public/card/extras/{bitcoin,chinese-coin,unicorn}.png` exist. Drop the PNGs in, no code changes needed.
- **Input**: cursor on desktop, gyroscope on phones (iOS asks via an
  "Enable motion" button), slow idle drift otherwise. Click or tap to flip.
