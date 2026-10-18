// Два режима просмотра: колесо названий и бесконечная сетка.
// Оба — DOM поверх сцены, со своей инерцией: цель двигается вводом, текущее значение
// дотягивается к ней через lerp.

const damp = (factor, dt) => 1 - Math.pow(1 - factor, dt * 60);
const mod = (n, m) => ((n % m) + m) % m;

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/* ---------- Сетка ---------- */

// text(index) → { name, caption } на текущем языке
export function createGrid(container, items, { lerp, isReduced, text, onSelect }) {
  const plane = el('div', 'grid-view__plane');
  container.append(plane);

  const pos = { x: 0, y: 0, tx: 0, ty: 0 };
  const cells = new Map(); // "c,r" → { node, c, r }
  const pool = [];
  const size = { cardW: 360, cardH: 260, cellW: 400, cellH: 320, w: 0, h: 0 };
  let active = false;

  function measure() {
    size.w = window.innerWidth;
    size.h = window.innerHeight;
    size.cardW = Math.min(420, Math.max(220, size.w * 0.26));
    size.cardH = size.cardW * 0.62 + 44; // рамка + подпись
    size.cellW = size.cardW * 1.12;
    size.cellH = size.cardH * 1.14;
    plane.style.setProperty('--card-w', `${size.cardW}px`);
  }

  function buildCard() {
    const node = el('div', 'grid-card');
    const frame = el('div', 'grid-card__frame');
    const img = el('img');
    img.alt = '';
    img.draggable = false;
    frame.append(img);
    const meta = el('div', 'grid-card__meta');
    meta.append(el('span', 'grid-card__name'), el('span', 'grid-card__tag'));
    node.append(frame, meta);
    return node;
  }

  function fill(node, index) {
    if (node.dataset.index === String(index)) return;
    node.dataset.index = String(index);
    node.querySelector('img').src = items[index].src;
    const t = text(index);
    node.querySelector('.grid-card__name').textContent = t.name;
    node.querySelector('.grid-card__tag').textContent = t.caption;
  }

  // Соседние ряды сдвинуты, чтобы одинаковые купюры не стояли столбиком
  const itemAt = (c, r) => mod(c + r * 2, items.length);
  const rowShift = (r) => mod(r * 0.37, 1) * size.cellW;

  function update(dt) {
    if (!active) return;
    const k = isReduced() ? 1 : damp(lerp, dt);
    pos.x += (pos.tx - pos.x) * k;
    pos.y += (pos.ty - pos.y) * k;

    const { w, h, cellW, cellH, cardW, cardH } = size;
    const r0 = Math.floor((-pos.y - h / 2) / cellH) - 1;
    const r1 = Math.ceil((-pos.y + h / 2) / cellH) + 1;
    const seen = new Set();

    for (let r = r0; r <= r1; r++) {
      const shift = rowShift(r);
      const c0 = Math.floor((-pos.x - shift - w / 2) / cellW) - 1;
      const c1 = Math.ceil((-pos.x - shift + w / 2) / cellW) + 1;
      for (let c = c0; c <= c1; c++) {
        const key = `${c},${r}`;
        seen.add(key);
        let cell = cells.get(key);
        if (!cell) {
          const node = pool.pop() || buildCard();
          if (!node.isConnected) plane.append(node);
          node.hidden = false;
          cell = { node, c, r };
          cells.set(key, cell);
        }
        fill(cell.node, itemAt(c, r));

        // Экранные координаты центра и «выпуклость» плоскости к краям
        const x = w / 2 + c * cellW + shift + pos.x;
        const y = h / 2 + r * cellH + pos.y;
        const nx = (x - w / 2) / (w / 2);
        const ny = (y - h / 2) / (h / 2);
        const depth = -(nx * nx + ny * ny) * 140;
        cell.node.style.transform =
          `translate3d(${x - cardW / 2}px, ${y - cardH / 2}px, ${depth}px) ` +
          `rotateY(${nx * 14}deg) rotateX(${-ny * 9}deg)`;
      }
    }

    cells.forEach((cell, key) => {
      if (seen.has(key)) return;
      cell.node.hidden = true;
      pool.push(cell.node);
      cells.delete(key);
    });
  }

  /* Ввод: колесо, перетаскивание с броском, стрелки */

  container.addEventListener('wheel', (e) => {
    if (!active) return;
    e.preventDefault();
    const scale = e.deltaMode === 1 ? 32 : 1;
    pos.tx -= (e.shiftKey ? e.deltaY : e.deltaX) * scale;
    pos.ty -= (e.shiftKey ? 0 : e.deltaY) * scale;
  }, { passive: false });

  let drag = null;
  container.addEventListener('pointerdown', (e) => {
    if (!active || e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, vx: 0, vy: 0, t: performance.now(), moved: false, captured: false };
  });
  container.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    const now = performance.now();
    const span = Math.max(1, now - drag.t);
    drag.vx = dx / span;
    drag.vy = dy / span;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.t = now;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 5 && !drag.moved) {
      drag.moved = true;
      // Захват только после реального сдвига, чтобы клик по карточке дошёл до неё
      container.setPointerCapture(e.pointerId);
      drag.captured = true;
      container.classList.add('is-dragging');
    }
    if (drag.moved) {
      pos.tx += dx;
      pos.ty += dy;
    }
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved) {
      // Бросок: продолжаем движение пропорционально последней скорости
      pos.tx += drag.vx * 220;
      pos.ty += drag.vy * 220;
    } else {
      const card = e.target.closest?.('.grid-card');
      if (card) onSelect(Number(card.dataset.index), card.querySelector('.grid-card__frame').getBoundingClientRect());
    }
    if (drag.captured && container.hasPointerCapture(e.pointerId)) container.releasePointerCapture(e.pointerId);
    container.classList.remove('is-dragging');
    drag = null;
  };
  container.addEventListener('pointerup', release);
  container.addEventListener('pointercancel', release);

  window.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'ArrowLeft') pos.tx += size.cellW;
    else if (e.key === 'ArrowRight') pos.tx -= size.cellW;
    else if (e.key === 'ArrowUp') pos.ty += size.cellH;
    else if (e.key === 'ArrowDown') pos.ty -= size.cellH;
    else return;
    e.preventDefault();
  });

  window.addEventListener('resize', measure);
  measure();

  return {
    update,
    // Сброс подписей после смены языка
    refresh() {
      cells.forEach((cell) => { delete cell.node.dataset.index; });
      pool.forEach((node) => { delete node.dataset.index; });
    },
    setActive(value) {
      active = value;
      if (value) {
        measure();
        update(1);
      }
    },
  };
}

/* ---------- Колесо ---------- */

export function createWheel(container, items, { lerp, isReduced, text, labels, onChange, onHover, onOpen }) {
  const RADIUS_STEPS = 9; // видимых строк в каждую сторону
  const list = el('ul', 'wheel-view__list');
  container.append(list);

  const state = { current: 0, target: 0 };
  const geo = { r: 900, lineH: 80, cx: 0, cy: 0, fadeUp: 0.09 };
  let active = false;
  let activeIndex = -1;
  let snapTimer = 0;

  const rows = [];
  for (let k = -RADIUS_STEPS; k <= RADIUS_STEPS; k++) {
    const li = el('li', 'wheel-item');
    const name = el('span', 'wheel-item__name');
    const tags = el('span', 'wheel-item__tags');
    const caption = el('span', 'wheel-chip');
    const open = el('button', 'wheel-chip wheel-chip--open', '↗');
    open.type = 'button';
    open.tabIndex = -1;
    tags.append(caption, open);
    li.append(name, tags);
    list.append(li);
    rows.push({ li, name, caption, open, k, index: -1, offset: 0 });
  }

  function measure() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const portrait = w <= 720 || w / h < 0.85;
    const font = portrait ? Math.max(30, w * 0.09) : Math.min(88, Math.max(40, w * 0.045));
    geo.lineH = font * 1.12;
    geo.r = Math.max(h * 0.95, 640);
    geo.cy = h * (portrait ? 0.68 : 0.5);
    geo.cx = (portrait ? 20 : Math.max(24, w * 0.075)) - geo.r;
    // На телефоне купюра стоит над колесом — верхние строки гаснут быстрее
    geo.fadeUp = portrait ? 0.32 : 0.09;
    list.style.setProperty('--wheel-font', `${font}px`);
  }

  function fill(row, index) {
    if (row.index === index) return;
    row.index = index;
    const t = text(index);
    row.name.textContent = t.name;
    row.caption.textContent = t.caption;
    row.open.setAttribute('aria-label', labels().open);
  }

  function update(dt) {
    if (!active) return;
    const k = isReduced() ? 1 : damp(lerp, dt);
    state.current += (state.target - state.current) * k;
    if (Math.abs(state.target - state.current) < 1e-4) state.current = state.target;

    const base = Math.round(state.current);
    const step = geo.lineH / geo.r; // угол на одну строку
    rows.forEach((row) => {
      const slot = base + row.k;
      fill(row, mod(slot, items.length));
      const d = slot - state.current;
      row.offset = slot;
      const angle = d * step;
      const x = geo.cx + geo.r * Math.cos(angle);
      const y = geo.cy + geo.r * Math.sin(angle);
      const dist = Math.abs(d);
      const fade = d < 0 ? geo.fadeUp : 0.09;
      row.li.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}rad) translateY(-50%)`;
      row.li.style.opacity = String(Math.max(0, 1 - Math.max(0, dist - 0.5) * fade));
      row.li.classList.toggle('is-active', dist < 0.5);
    });

    const next = mod(base, items.length);
    if (next !== activeIndex) {
      activeIndex = next;
      onChange(next);
    }
  }

  function scheduleSnap() {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => { state.target = Math.round(state.target); }, 140);
  }

  container.addEventListener('wheel', (e) => {
    if (!active) return;
    e.preventDefault();
    const scale = e.deltaMode === 1 ? 32 : 1;
    state.target += (e.deltaY * scale) / (geo.lineH * 2.2);
    onHover(null); // прокрутка важнее наведения: справа — активная купюра
    scheduleSnap();
  }, { passive: false });

  let drag = null;
  container.addEventListener('pointerdown', (e) => {
    if (!active || e.button !== 0 || e.target.closest('button')) return;
    drag = { id: e.pointerId, y: e.clientY, sy: e.clientY, moved: false };
  });
  container.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.abs(e.clientY - drag.sy) > 5) {
      drag.moved = true;
      onHover(null);
      container.setPointerCapture(e.pointerId);
      container.classList.add('is-dragging');
    }
    if (drag.moved) {
      state.target -= (e.clientY - drag.y) / geo.lineH;
      drag.y = e.clientY;
    }
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved) {
      state.target = Math.round(state.target);
      if (container.hasPointerCapture(e.pointerId)) container.releasePointerCapture(e.pointerId);
    } else {
      // Клик по активной строке открывает купюру, по другой — докручивает к ней
      const li = e.target.closest?.('.wheel-item');
      const row = rows.find((r) => r.li === li);
      if (row?.li.classList.contains('is-active')) onOpen(row.index);
      else if (row) state.target = row.offset;
    }
    container.classList.remove('is-dragging');
    drag = null;
  };
  container.addEventListener('pointerup', release);
  container.addEventListener('pointercancel', release);

  // Наведение на строку показывает её купюру справа
  rows.forEach((row) => {
    row.li.addEventListener('pointerenter', (e) => {
      if (active && e.pointerType === 'mouse' && !drag?.moved) onHover(row.index);
    });
    row.open.addEventListener('click', () => onOpen(row.index));
  });
  list.addEventListener('pointerleave', () => onHover(null));

  window.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'ArrowDown') state.target = Math.round(state.target) + 1;
    else if (e.key === 'ArrowUp') state.target = Math.round(state.target) - 1;
    else if (e.key === 'Enter') onOpen(activeIndex);
    else return;
    e.preventDefault();
  });

  window.addEventListener('resize', measure);
  measure();

  return {
    list,
    update,
    get velocity() { return state.target - state.current; },
    // Непрерывная позиция колеса: по ней едет стопка купюр
    get position() { return state.current; },
    get index() { return activeIndex; },
    refresh() { rows.forEach((row) => { row.index = -1; }); },
    // Встать на купюру без прокрутки (например, после листания на странице купюры)
    jumpTo(index) {
      const base = Math.round(state.current);
      const slot = base + (mod(index - base, items.length));
      const near = slot - base > items.length / 2 ? slot - items.length : slot;
      state.current = state.target = near;
    },
    setActive(value) {
      active = value;
      if (value) {
        measure();
        activeIndex = -1;
        update(1);
      } else {
        onHover(null);
      }
    },
  };
}
