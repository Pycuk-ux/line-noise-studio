import type { Settings } from "../types";

// Shared text layout used by both the visible base and the reveal field,
// so the field lines up exactly with the drawn glyphs.
function drawText(ctx: CanvasRenderingContext2D, s: Settings, fill: string) {
  const lines = s.text.split("\n");
  if (lines.length === 0) return;

  ctx.fillStyle = fill;
  ctx.textBaseline = "middle";
  ctx.textAlign = s.align;
  ctx.font = `${s.fontWeight} ${s.fontSize}px ${s.fontFamily}`;
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${s.letterSpacing}px`;
  } catch {
    /* unsupported — ignore */
  }

  const lineH = s.fontSize * s.lineHeight;
  const blockH = lineH * lines.length;
  let x = s.width / 2;
  if (s.align === "left") x = s.textPadding;
  else if (s.align === "right") x = s.width - s.textPadding;

  const startY = (s.height - blockH) / 2 + lineH / 2;
  lines.forEach((line, i) => ctx.fillText(line, x, startY + i * lineH));
}

// Background fill + static text — the layer the animated lines wash over.
export function bakeBase(canvas: HTMLCanvasElement, s: Settings): void {
  canvas.width = s.width;
  canvas.height = s.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (s.bgGradient) {
    const a = (s.bgGradAngle * Math.PI) / 180;
    const cx = s.width / 2;
    const cy = s.height / 2;
    const len = Math.abs(Math.cos(a)) * s.width + Math.abs(Math.sin(a)) * s.height;
    const dx = (Math.cos(a) * len) / 2;
    const dy = (Math.sin(a) * len) / 2;
    const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    grad.addColorStop(0, s.bgColor);
    grad.addColorStop(1, s.bgColor2);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = s.bgColor;
  }
  ctx.fillRect(0, 0, s.width, s.height);

  drawText(ctx, s, s.textColor);
}
