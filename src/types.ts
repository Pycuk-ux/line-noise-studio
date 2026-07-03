export type Alignment = "left" | "center" | "right";

export interface Settings {
  // Canvas / output
  width: number;
  height: number;

  // Lines
  barCount: number; // number of rows across the canvas height
  barThickness: number; // 0..1 — filled portion of each row (1 = no gap)
  barWidth: number; // 0..1 — horizontal extent (1 = full width)
  cellDensity: number; // cells (columns) per row — the "fractal glass" tiling
  angleX: number; // degrees — horizontal shear (tilt along X)
  angleY: number; // degrees — rotation of the whole bar field (tilt along Y)
  colorA: string; // gradient start
  colorB: string; // gradient end
  gradFreq: number; // gradient frequency within each cell
  speed: number; // flow / temporal variety of the animation per loop
  colorIntensity: number; // glass warp amount applied to the gradient
  barOpacity: number; // 0..1 master opacity of the bars
  alphaScale: number; // spatial frequency of the transparency map

  // Line mask — a central "bubble" that fades the gradient-lines layer,
  // revealing the text (and background) beneath it. Independent of the text.
  bubbleSize: number; // 0..1.5 — radius of the bubble relative to the canvas
  bubbleShape: number; // 0 = circle · 1 = squircle (more curved corners)
  bubbleCurvature: number; // 0 = round · 1 = wide (stretched horizontally)
  // Radial transparency gradient (center -> edge). Two stops, each with an
  // opacity (mask transparency: 1 = fully transparent hole, 0 = lines cover)
  // and a position (0 = bubble center, 1 = bubble edge). Stop spacing controls
  // how gradual vs. sharp the transition is.
  maskInnerOpacity: number; // opacity at the center stop (0..1)
  maskOuterOpacity: number; // opacity at the edge stop (0..1)
  maskInnerStop: number; // center stop position (0..1)
  maskOuterStop: number; // edge stop position (0..1)

  // Grain / noise overlay
  grainScale: number; // density
  grainOpacity: number; // strength

  // Text
  text: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  lineHeight: number; // multiplier of font size
  letterSpacing: number; // px
  align: Alignment;
  textPadding: number; // px inset from edges

  // Background
  bgColor: string;
  bgColor2: string;
  bgGradient: boolean;
  bgGradAngle: number; // degrees

  // Timeline
  loopDuration: number; // seconds per seamless loop
  fps: number;

  // Export
  exportRes: "canvas" | "1080p" | "2k"; // output resolution for image/video export
  exportQuality: "standard" | "high" | "max"; // video bitrate / compression quality
}

export type SettingsPatch = Partial<Settings>;
