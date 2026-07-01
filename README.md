# Line Noise Studio

A browser-based tool for creating animated **gradient-line + noise** visual effects with static background typography, and exporting them to **PNG**, **WEBM**, or **MP4**.

Built with React 19 + Vite + Tailwind v4, rendered on a **WebGL2** fragment shader for smooth gradients and GPU noise, and exported frame-accurately via the **WebCodecs** API.

## Concept

The canvas is tiled into **rows of rectangular cells** ("fractal glass"). Each cell owns its **own animated horizontal gradient** that flows and drifts in color independently — there is no single global sweep. On top of that:

1. **Transparency map** — a 4D simplex-noise field animates the per-pixel alpha of the cells, so the fill dissolves and reforms randomly over time. Because it evolves around a circle (4D noise), the loop is **seamless**.
2. **Glass warp** — noise distorts each cell's gradient for a refracted-glass shimmer.
3. **Grain overlay** — a high-frequency hash noise on top, with independent density and opacity.
4. **Text reveal** — the line layer covers the whole screen, and a soft blob mask derived from the text **fades the lines out toward the center over the text**, so the text shows through from beneath while the edges stay at full strength.

Rows fill completely at thickness 1.0 (no gap between lines). Static text is baked into the background and the animated cells wash over it (blended layer order).

## Controls

**Lines** — rows, cells per row, thickness (row fill), width, angle X (shear) / angle Y (rotate), gradient colors A/B, gradient frequency, opacity.
**Animation** — speed / flow, glass warp, transparency-map scale, loop length.
**Noise (grain)** — density, opacity.
**Text** — content (multi-line), font (built-in stacks **or upload your own** `.ttf/.otf/.woff`), size, color, line spacing, letter spacing, alignment (left / center / right).
**Text reveal** — fade over text (0 = lines everywhere · 1 = fully cleared over the text), fade size.
**Background** — solid or two-color gradient fill with adjustable angle.
**Canvas** — presets: Landscape 1920×1080 (default), Square 1080, Portrait 1080×1920, Wide 2560×1080.

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
