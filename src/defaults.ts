import type { Settings } from "./types";

export const FONT_STACKS: { label: string; value: string }[] = [
  { label: "Serif (Georgia)", value: "Georgia, 'Times New Roman', serif" },
  { label: "Sans (system)", value: "system-ui, -apple-system, sans-serif" },
  { label: "Mono", value: "'SF Mono', 'Courier New', monospace" },
];

export const ASPECT_PRESETS: { label: string; width: number; height: number }[] = [
  { label: "Landscape 1920×1080", width: 1920, height: 1080 },
  { label: "Square 1080×1080", width: 1080, height: 1080 },
  { label: "Portrait 1080×1920", width: 1080, height: 1920 },
  { label: "Wide 2560×1080", width: 2560, height: 1080 },
];

export const DEFAULT_SETTINGS: Settings = {
  width: 1920,
  height: 1080,

  barCount: 12,
  barThickness: 1,
  barWidth: 1,
  cellDensity: 5,
  angleX: 0,
  angleY: 0,
  colorA: "#ff2d95",
  colorB: "#2de0c8",
  gradFreq: 1,
  speed: 1.4,
  colorIntensity: 0.35,
  barOpacity: 0.9,
  alphaScale: 3.2,

  textReveal: 1,
  revealSpread: 120,

  grainScale: 0.9,
  grainOpacity: 0.14,

  text: "Opera\nConcerts\nVisual Arts\nInstallation\nMusic",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 150,
  textColor: "#1a2b6b",
  lineHeight: 1.02,
  letterSpacing: 0,
  align: "center",
  textPadding: 64,

  bgColor: "#6a1b9a",
  bgColor2: "#3a0d63",
  bgGradient: true,
  bgGradAngle: 90,

  loopDuration: 6,
  fps: 30,
};
