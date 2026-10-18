// Дизеринг символами валют вокруг курсора. Виден только пока мышь движется:
// круг ~120px, к краю гаснет. Ячейки включаются по матрице Байера, поэтому
// край выглядит как дизеринг; появляясь и исчезая, символы сменяют друг друга.

const SYMBOLS = [...'$€¥£₽₩฿₺₮₱₭₦₲₤₸₡₣'];

export const DITHER = {
  radius: 120, // px от курсора до края круга
  cell: 2, // шаг сетки символов, px
  fontSize: 10, // px
  maxOpacity: 0.8, // в центре круга; к краю — 0
  fadeIn: 6, // скорость появления при движении, 1/с
  fadeOut: 2.5, // скорость угасания, когда мышь стоит, 1/с
  idle: 120, // мс без движения, после которых эффект начинает гаснуть
  follow: 0.1, // плавность следования за курсором
  swap: 0.18, // ширина «полосы» у порога, где символы перебирают друг друга
};

// Матрица Байера 4×4, пороги 0…1
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export function initDither(canvas) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const D = DITHER;
  const state = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, energy: 0, last: 0, raf: 0, prev: 0 };
  const cells = new Map(); // "cx,cy" → { sym, on }
  let ink = '#1f1d18';
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ink = getComputedStyle(document.documentElement).getPropertyValue('--color-ink').trim() || ink;
    draw();
  }

  const pick = (not) => {
    let s;
    do s = SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
    while (s === not && SYMBOLS.length > 1);
    return s;
  };

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (state.energy <= 0.001) {
      cells.clear();
      return;
    }
    ctx.fillStyle = ink;
    ctx.font = `600 ${D.fontSize}px Manrope, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const { cell, radius } = D;
    const x0 = Math.floor((state.x - radius) / cell);
    const x1 = Math.ceil((state.x + radius) / cell);
    const y0 = Math.floor((state.y - radius) / cell);
    const y1 = Math.ceil((state.y + radius) / cell);
    const seen = new Set();

    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const px = cx * cell + cell / 2;
        const py = cy * cell + cell / 2;
        const d = Math.hypot(px - state.x, py - state.y) / radius;
        if (d >= 1) continue;
        const value = (1 - d) * state.energy; // маска круга × сила эффекта
        const threshold = BAYER[((cy & 3) << 2) | (cx & 3)];
        const key = `${cx},${cy}`;
        let c = cells.get(key);
        const on = value > threshold;
        if (!c) {
          c = { sym: pick(), on: false };
          cells.set(key, c);
        }
        // Появление и исчезновение — смена символа; у порога символы перебирают друг друга
        if (on !== c.on || (Math.abs(value - threshold) < D.swap && Math.random() < 0.12)) c.sym = pick(c.sym);
        c.on = on;
        seen.add(key);
        if (!on) continue;
        ctx.globalAlpha = D.maxOpacity * (1 - d);
        ctx.fillText(c.sym, px, py);
      }
    }
    ctx.globalAlpha = 1;
    cells.forEach((_, key) => { if (!seen.has(key)) cells.delete(key); });
  }

  function frame(now) {
    const dt = Math.min((now - (state.prev || now)) / 1000, 0.05);
    state.prev = now;
    const moving = now - state.last < D.idle;
    state.energy = moving ? Math.min(1, state.energy + D.fadeIn * dt) : Math.max(0, state.energy - D.fadeOut * dt);
    const k = 1 - Math.pow(1 - D.follow, dt * 60);
    state.x += (state.tx - state.x) * k;
    state.y += (state.ty - state.y) * k;
    draw();
    state.raf = state.energy > 0 || moving ? requestAnimationFrame(frame) : 0;
    if (!state.raf) state.prev = 0;
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduced.matches || !fine.matches) return;
    if (state.energy <= 0.001) {
      // Новый «мазок» начинается прямо под курсором
      state.x = e.clientX;
      state.y = e.clientY;
    }
    state.tx = e.clientX;
    state.ty = e.clientY;
    state.last = performance.now();
    if (!state.raf) state.raf = requestAnimationFrame(frame);
  });
  document.addEventListener('pointerleave', () => { state.last = 0; });
  window.addEventListener('resize', resize);
  resize();
}
