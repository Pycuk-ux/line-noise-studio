import * as THREE from "three";

// Stand-ins for the floating Bitcoin / Chinese coin / unicorn until the real
// PNGs are dropped into public/card/extras/. Drawn on a canvas so the scene
// is complete without them.

const S = 512;

function canvas() {
  const c = document.createElement("canvas");
  c.width = c.height = S;
  return { c, g: c.getContext("2d")! };
}

function coin(g: CanvasRenderingContext2D, rim: [string, string], face: [string, string]) {
  const r = S * 0.46;
  const rimGrad = g.createLinearGradient(0, 0, S, S);
  rimGrad.addColorStop(0, rim[0]);
  rimGrad.addColorStop(1, rim[1]);
  g.fillStyle = rimGrad;
  g.beginPath();
  g.arc(S / 2, S / 2, r, 0, Math.PI * 2);
  g.fill();

  const faceGrad = g.createRadialGradient(S * 0.38, S * 0.34, S * 0.05, S / 2, S / 2, r);
  faceGrad.addColorStop(0, face[0]);
  faceGrad.addColorStop(1, face[1]);
  g.fillStyle = faceGrad;
  g.beginPath();
  g.arc(S / 2, S / 2, r * 0.86, 0, Math.PI * 2);
  g.fill();
}

function bitcoin() {
  const { c, g } = canvas();
  coin(g, ["#FFD66B", "#B86A00"], ["#FFC53D", "#E58A00"]);
  g.fillStyle = "#FFF4D6";
  g.font = `900 ${S * 0.5}px system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.save();
  g.translate(S / 2, S / 2);
  g.rotate(-0.22);
  g.fillText("₿", 0, S * 0.02);
  g.restore();
  return c;
}

function yuan() {
  const { c, g } = canvas();
  coin(g, ["#E7C27A", "#6B4A12"], ["#C99A45", "#7C5418"]);
  // Square hole.
  g.globalCompositeOperation = "destination-out";
  g.fillRect(S * 0.41, S * 0.41, S * 0.18, S * 0.18);
  g.globalCompositeOperation = "source-over";
  g.strokeStyle = "#5A3B0C";
  g.lineWidth = 8;
  g.strokeRect(S * 0.41, S * 0.41, S * 0.18, S * 0.18);
  g.fillStyle = "#4A300A";
  g.font = `700 ${S * 0.13}px "Noto Serif SC", "Songti SC", serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const chars: [string, number, number][] = [
    ["通", 0.5, 0.26],
    ["寶", 0.5, 0.74],
    ["開", 0.26, 0.5],
    ["元", 0.74, 0.5],
  ];
  for (const [ch, x, y] of chars) g.fillText(ch, S * x, S * y);
  return c;
}

function unicorn() {
  const { c, g } = canvas();
  g.font = `${S * 0.8}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("🦄", S / 2, S * 0.54);
  // No colour-emoji font available: draw a simple horn silhouette instead.
  if (g.getImageData(S / 2, S / 2, 1, 1).data[3] === 0) {
    g.fillStyle = "#F3EEE3";
    g.beginPath();
    g.moveTo(S * 0.5, S * 0.08);
    g.lineTo(S * 0.62, S * 0.9);
    g.lineTo(S * 0.38, S * 0.9);
    g.closePath();
    g.fill();
  }
  return c;
}

export function placeholderTexture(kind: "bitcoin" | "yuan" | "unicorn") {
  const c = kind === "bitcoin" ? bitcoin() : kind === "yuan" ? yuan() : unicorn();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft rounded-rect shadow that sits behind the card. */
export function cardShadowTexture(w: number, h: number, r: number) {
  const pad = 120;
  const scale = 0.25;
  const c = document.createElement("canvas");
  c.width = Math.round((w + pad * 2) * scale);
  c.height = Math.round((h + pad * 2) * scale);
  const g = c.getContext("2d")!;
  g.scale(scale, scale);
  g.shadowColor = "rgba(0,0,0,1)";
  g.shadowBlur = 90 * scale * 4;
  g.fillStyle = "#000";
  g.beginPath();
  g.roundRect(pad, pad, w, h, r);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  return { tex, width: w + pad * 2, height: h + pad * 2 };
}
