import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { createGrid, createWheel } from './views.js';
import { ITEMS, UI, LANGS } from './data.js';

/* ---------- Настройки ---------- */

const CONFIG = {
  thickness: 0.006, // толщина «бумаги» в долях ширины
  lerp: 0.08, // инерция колеса и сетки
  moveDuration: 1.1, // переезд купюры на страницу и обратно
  dragSpeed: 0.01, // рад на пиксель при перевороте
  hoverTilt: THREE.MathUtils.degToRad(5), // наклон к курсору: угол уходит назад на столько
  // Бумага: изгиб от вращения и движения, с пружиной (лёгкий отскок после остановки).
  // Изгиб — в долях ширины купюры на краю.
  paper: {
    flipCurl: 0.05, // S-изгиб на каждый рад/с вращения: края отстают от поворота
    curlMax: 0.35, // предел S-изгиба
    flipCup: 0.015, // прогиб «чашкой» на каждый рад/с вращения
    moveCup: 0.03, // прогиб «чашкой» на каждую ширину/с движения
    cupMax: 0.14, // предел прогиба
    stiffness: 140, // жёсткость: больше — бумага плотнее, быстрее выпрямляется
    damping: 12, // затухание: меньше — дольше «дрожит» после остановки
    wave: 0.004, // «дыхание» поверхности в покое
  },
  // Стопка у колеса. Сдвиги и глубина — в долях ширины купюры.
  stack: {
    offsetX: 0.1, // каждая следующая купюра чуть правее
    depth: 0.14, // и дальше от зрителя
    turn: -0.06, // и чуть развёрнута
    // Уход передней купюры в конец: вверх вместе с текстом → назад → вниз за стопку
    gap: 0.06, // зазор над стопкой, когда купюра уже никого не перекрывает
    lead: 0.04, // насколько купюра выходит к зрителю, пока едет вверх
    tilt: 0.18, // рад: наклон верхнего края назад во время подъёма
    phaseUp: 0.4, // доля пути на подъём
    phaseBack: 0.6, // к этой доле купюра уже ушла вглубь
  },
  // Смена купюры на странице: старая уходит вглубь, новая приходит из глубины
  zoom: { depthOut: 0.8, depthIn: 0.35, out: 0.5, in: 0.6, delay: 0.25 },
  // Прилипание купюры при прокрутке страницы
  sticky: { top: 0.15, minScale: 0.3, range: 1.2 },
  fov: 32,
  cameraZ: 5,
  maxTexture: 1024,
  maxPixelRatio: 2,
  // Поверхности без металла: хлопково-льняная бумага и полимер
  surfaces: {
    cotton: { roughness: 0.82, sheen: 0.35, clearcoat: 0, clearcoatRoughness: 0.3, bumpScale: 0.6 },
    polymer: { roughness: 0.32, sheen: 0, clearcoat: 0.35, clearcoatRoughness: 0.25, bumpScale: 0.05 },
  },
  sheenColor: 0xfff6e8,
  fiberRepeat: 2.2,
  paperColor: 0xe9dfcc,
  envIntensity: 0.9,
  rectIntensity: 1.3, // блик, который скользит при наклоне
  exposure: 1,
};

const root = document.documentElement;
const COUNT = ITEMS.length;
const TAU = Math.PI * 2;
const mod = (n, m) => ((n % m) + m) % m;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = motionQuery.matches;
motionQuery.addEventListener('change', (e) => { reducedMotion = e.matches; });

/* ---------- Язык ---------- */

let lang = readLang();

function readLang() {
  try {
    const saved = localStorage.getItem('paper-tender-lang');
    if (LANGS.includes(saved)) return saved;
  } catch {}
  return (navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

function saveLang(value) {
  try { localStorage.setItem('paper-tender-lang', value); } catch {}
}

const t = () => UI[lang];
const text = (i) => ({
  name: ITEMS[i].name[lang],
  caption: ITEMS[i].caption[lang],
  issuer: ITEMS[i].issuer[lang],
});

/* ---------- Запуск ---------- */

const canvas = document.querySelector('.stage');
const renderer = root.classList.contains('is-webgl') ? createRenderer(canvas) : null;

if (!renderer) {
  // Без WebGL остаётся обычная сетка из разметки
  root.classList.remove('is-webgl', 'is-loading');
} else {
  start(renderer);
}

function createRenderer(target) {
  try {
    return new THREE.WebGLRenderer({ canvas: target, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
}

/* ---------- Загиб бумаги в вершинном шейдере ---------- */

// Профиль по X: «чашка» и S-изгиб от движения плюс бегущая волна.
// Нормаль правится той же производной, чтобы блик ехал по изгибу.
function applyPaperBend(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uBend;
        uniform float uCurl;
        uniform float uWave;
        uniform float uTime;
        // x ∈ [−0.5, 0.5]; s = 2x ∈ [−1, 1]. uBend — «чашка», uCurl — S-изгиб, края в разные стороны.
        float paperZ(float x) {
          float s = x * 2.0;
          return uBend * x * x + uCurl * 0.5 * s * abs(s) + uWave * sin(x * 6.2832 + uTime);
        }
        float paperDz(float x) {
          float s = x * 2.0;
          return 2.0 * uBend * x + uCurl * 2.0 * abs(s) + uWave * 6.2832 * cos(x * 6.2832 + uTime);
        }`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        objectNormal.x -= paperDz(position.x) * objectNormal.z;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        transformed.z += paperZ(position.x);`,
      );
  };
  material.customProgramCacheKey = () => 'paper-bend';
}

/* ---------- Приложение ---------- */

function start(renderer) {
  const isWeak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = CONFIG.exposure;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CONFIG.fov, 1, 0.1, 100);
  camera.position.set(0, 0, CONFIG.cameraZ);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = CONFIG.envIntensity;
  room.dispose();
  pmrem.dispose();

  if (!isWeak) {
    RectAreaLightUniformsLib.init();
    const rect = new THREE.RectAreaLight(0xfff3e2, CONFIG.rectIntensity, 2.4, 1.2);
    rect.position.set(2.2, 2.2, 2.6);
    rect.lookAt(0, 0, 0);
    scene.add(rect);
  }

  /* --- Купюры --- */

  const fibers = createFiberTexture(maxAnisotropy);
  // Порядок граней BoxGeometry: +x, −x, +y, −y, +z (лицо), −z (оборот)
  const geometry = new THREE.BoxGeometry(1, 1, CONFIG.thickness, 48, 1, 1);

  const cards = ITEMS.map((item, i) => {
    const s = CONFIG.surfaces[item.material === 'polymer' ? 'polymer' : 'cotton'];
    const uniforms = { uBend: { value: 0 }, uCurl: { value: 0 }, uWave: { value: 0 }, uTime: { value: i * 1.7 } };
    const surface = () => {
      const m = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: s.roughness,
        sheen: s.sheen,
        sheenRoughness: 0.8,
        sheenColor: new THREE.Color(CONFIG.sheenColor),
        clearcoat: s.clearcoat,
        clearcoatRoughness: s.clearcoatRoughness,
        bumpMap: fibers,
        bumpScale: s.bumpScale,
        roughnessMap: fibers,
        transparent: true,
      });
      applyPaperBend(m, uniforms);
      return m;
    };
    const front = surface();
    const back = surface();
    const edge = new THREE.MeshStandardMaterial({ color: CONFIG.paperColor, roughness: 0.85, metalness: 0, transparent: true });
    applyPaperBend(edge, uniforms);
    const mesh = new THREE.Mesh(geometry, [edge, edge, edge, edge, front, back]);
    mesh.visible = false;
    scene.add(mesh);
    return {
      mesh,
      materials: [front, back, edge],
      front,
      back,
      uniforms,
      aspect: 2,
      opacity: -1,
      hero: 0, // 0…1: насколько купюра — «главная» на странице или в переезде
      heroIn: false, // приходит из глубины (true) или уходит вглубь (false)
      // Пружины изгиба и прошлое положение — для скорости
      curl: { x: 0, v: 0 },
      cup: { x: 0, v: 0 },
      prev: null,
    };
  });

  /* --- Камера, ресайз и перевод пикселей в мир --- */

  const view = { w: 1, h: 1, worldH: 1, portrait: false };

  function layout() {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    view.portrait = view.w <= 720 || view.w / view.h < 0.85;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio));
    renderer.setSize(view.w, view.h, false);
    camera.aspect = view.w / view.h;
    camera.updateProjectionMatrix();
    view.worldH = 2 * Math.tan(THREE.MathUtils.degToRad(CONFIG.fov / 2)) * CONFIG.cameraZ;
  }

  // Место стопки у колеса: справа на десктопе, сверху на телефоне
  function panelRect() {
    return view.portrait
      ? { x: view.w * 0.5, y: view.h * 0.27, w: view.w * 0.56 }
      : { x: view.w * 0.72, y: view.h * 0.5, w: Math.min(view.w * 0.34, 600) };
  }

  // Место купюры на странице: прилипает на 15vh и уменьшается до 30% при прокрутке
  const noteSlot = document.querySelector('.detail__note');
  function detailRect() {
    const r = noteSlot.getBoundingClientRect();
    const S = CONFIG.sticky;
    const stickyTop = view.h * S.top;
    const passed = Math.max(0, stickyTop - r.top);
    const p = clamp(passed / (r.height * S.range), 0, 1);
    const scale = lerp(1, S.minScale, 1 - (1 - p) * (1 - p));
    const w = r.width * scale;
    const h = r.height * scale;
    return { x: r.left + r.width / 2, y: Math.max(r.top, stickyTop) + h / 2, w };
  }

  // pose — центр и ширина главной купюры в пикселях; bind — к чему она привязана каждый кадр
  const pose = { x: 0, y: 0, w: 1, bind: 'center' };
  const rot = { y: 0, flip: Math.PI / 2, vy: 0, dragging: false };
  const tilt = { x: 0, y: 0 };
  const fade = { stack: 0 }; // видимость стопки (кроме главной купюры)

  /* --- Слои интерфейса --- */

  const wheelLayer = document.querySelector('.wheel-view');
  const gridLayer = document.querySelector('.grid-view');
  const hitArea = document.querySelector('.wheel-view__hit');
  const detail = document.querySelector('.detail');
  const detailBody = document.querySelector('.detail__body');
  const reveal = () => detail.querySelectorAll('[data-reveal]');
  const switcher = document.querySelector('.switcher');
  const viewButtons = switcher.querySelectorAll('[data-view]');
  const langNav = document.querySelector('.lang');
  const langButtons = langNav.querySelectorAll('[data-lang]');

  let mode = 'intro'; // intro | wheel | grid | detail
  let origin = 'wheel'; // откуда открыта страница купюры
  let originRect = null;
  let current = 0; // главная купюра
  let busy = true; // идёт анимация перехода

  const isReduced = () => reducedMotion;
  const grid = createGrid(gridLayer, ITEMS, {
    lerp: CONFIG.lerp,
    isReduced,
    text,
    onSelect: (i, rect) => openDetail(i, 'grid', rect),
  });
  const wheel = createWheel(wheelLayer, ITEMS, {
    lerp: CONFIG.lerp,
    isReduced,
    text,
    labels: t,
    onChange: () => {},
    onHover: () => {},
    onOpen: (i) => openDetail(i, 'wheel'),
  });

  const frontIndex = () => mod(Math.round(wheel.position), COUNT);

  hitArea.addEventListener('click', () => openDetail(frontIndex(), 'wheel'));
  viewButtons.forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
  langButtons.forEach((b) => b.addEventListener('click', () => setLanguage(b.dataset.lang)));
  detail.querySelector('.detail__close').addEventListener('click', closeDetail);
  detail.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => stepDetail(Number(b.dataset.step))));

  window.addEventListener('keydown', (e) => {
    if (mode !== 'detail') return;
    if (e.key === 'Escape') closeDetail();
    else if (e.key === 'ArrowLeft') stepDetail(-1);
    else if (e.key === 'ArrowRight') stepDetail(1);
  });

  layout();
  window.addEventListener('resize', layout);

  /* --- Прокрутка страницы купюры --- */

  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: !reducedMotion });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  /* --- Указатель: наклон к курсору и переворот --- */

  const pointer = { x: -1, y: -1, mouse: false, over: false };

  // Прямоугольник главной купюры на экране
  function heroRect() {
    if (mode === 'wheel') {
      const r = panelRect();
      return { ...r, h: r.w / cards[frontIndex()].aspect };
    }
    if (mode === 'detail') return { ...pose, h: pose.w / cards[current].aspect };
    return null;
  }

  function isOverHero(x, y) {
    const r = heroRect();
    return !!r && Math.abs(x - r.x) <= r.w / 2 && Math.abs(y - r.y) <= r.h / 2;
  }

  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.mouse = e.pointerType === 'mouse';
  });
  document.addEventListener('pointerleave', () => { pointer.mouse = false; });

  let drag = null;
  window.addEventListener('pointerdown', (e) => {
    if (mode !== 'detail' || busy || e.button !== 0 || !isOverHero(e.clientX, e.clientY)) return;
    if (e.target.closest('button, a')) return;
    e.preventDefault();
    drag = { id: e.pointerId, x: e.clientX, t: performance.now() };
    rot.dragging = true;
    rot.vy = 0;
    root.classList.add('is-flipping');
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const now = performance.now();
    const delta = (e.clientX - drag.x) * CONFIG.dragSpeed;
    rot.y += delta;
    rot.vy = delta / Math.max(0.001, (now - drag.t) / 1000);
    drag.x = e.clientX;
    drag.t = now;
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    // Если палец замер перед отпусканием, броска нет
    if (performance.now() - drag.t > 80) rot.vy = 0;
    drag = null;
    rot.dragging = false;
    root.classList.remove('is-flipping');
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  /* --- Язык --- */

  function setLanguage(next) {
    if (!LANGS.includes(next) || next === lang) return;
    lang = next;
    saveLang(next);
    applyLanguage();
  }

  function applyLanguage() {
    const ui = t();
    root.lang = lang;
    langButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    langNav.setAttribute('aria-label', ui.language);
    switcher.setAttribute('aria-label', ui.modes);
    viewButtons.forEach((b) => { b.textContent = ui[b.dataset.view]; });
    detail.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = ui[n.dataset.i18n]; });
    detail.querySelector('.detail__close').setAttribute('aria-label', ui.close);
    document.querySelector('.fallback').setAttribute('aria-label', ui.collection);
    wheel.refresh();
    grid.refresh();
    renderList();
    if (!detail.hidden) swapBody(current, true);
  }

  // Текстовый список для скринридеров повторяет коллекцию на текущем языке
  function renderList() {
    const list = document.querySelector('.collection');
    list.replaceChildren(...ITEMS.map((_, i) => {
      const { name, caption, issuer } = text(i);
      const li = node('li', 'note');
      li.append(node('h2', 'note__name', name), node('p', 'note__caption', caption), node('p', 'note__quote', issuer));
      return li;
    }));
  }

  /* --- Текст страницы купюры --- */

  function buildBody(i) {
    const { name, caption, issuer } = text(i);
    const box = node('div', 'detail-text');
    const dl = node('dl');
    dl.append(node('dt', '', t().issuer), node('dd', '', issuer));
    box.append(node('h1', '', name), node('p', 'detail-text__caption', caption), dl, node('p', 'detail-text__placeholder', t().placeholder));
    return box;
  }

  // Уходящий текст уезжает вверх и гаснет, новый приходит снизу; в слоте не больше двух
  function swapBody(i, instant = false) {
    [...detailBody.children].forEach((child) => {
      gsap.killTweensOf(child);
      if (instant || reducedMotion || child.dataset.leaving) {
        child.remove();
        return;
      }
      child.dataset.leaving = '1';
      gsap.to(child, { yPercent: -30, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => child.remove() });
    });
    const next = buildBody(i);
    detailBody.append(next);
    if (instant || reducedMotion) return;
    gsap.fromTo(next, { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.1 });
  }

  /* --- Переключение колесо ↔ сетка --- */

  function switchView(next) {
    if (busy || next === mode || (mode !== 'wheel' && mode !== 'grid')) return;
    busy = true;
    const prev = mode;
    const quick = reducedMotion;
    viewButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === next)));

    const out = prev === 'wheel' ? [wheelLayer, canvas] : [gridLayer];
    gsap.to(out, {
      opacity: 0,
      duration: quick ? 0 : 0.3,
      ease: 'power2.in',
      onComplete: () => {
        (prev === 'wheel' ? wheel : grid).setActive(false);
        mode = next;
        root.dataset.view = next;
        (next === 'wheel' ? wheel : grid).setActive(true);
        // В сетке сцена скрыта; стопку прячем, чтобы при открытии купюры из сетки была видна только она
        fade.stack = next === 'wheel' ? 1 : 0;
        const shown = next === 'wheel' ? [wheelLayer, canvas] : [gridLayer];
        gsap.fromTo(shown, { opacity: 0 }, {
          opacity: 1,
          duration: quick ? 0 : 0.5,
          ease: 'power2.out',
          onComplete: () => { busy = false; },
        });
      },
    });
  }

  /* --- Страница купюры --- */

  const nearestTurn = (a) => Math.round(a / TAU) * TAU;

  function openDetail(index, from, rect) {
    if (busy || (mode !== 'wheel' && mode !== 'grid')) return;
    busy = true;
    origin = from;
    current = index;
    const quick = reducedMotion;
    const dur = quick ? 0 : CONFIG.moveDuration;
    const originLayer = from === 'wheel' ? wheelLayer : gridLayer;

    // Стартовая позиция: передняя купюра стопки или картинка в карточке сетки
    if (from === 'grid') {
      originRect = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, w: rect.width * 0.8 };
      Object.assign(pose, originRect);
      gsap.set(canvas, { opacity: 1 });
    } else {
      Object.assign(pose, panelRect());
    }
    pose.bind = null;
    cards.forEach((c, i) => { gsap.killTweensOf(c); c.hero = i === index ? 1 : 0; c.heroIn = false; });

    (from === 'wheel' ? wheel : grid).setActive(false);
    originLayer.classList.add('is-origin');
    mode = 'detail';
    root.dataset.view = 'detail';
    detail.hidden = false;
    swapBody(index, true);
    noteSlot.style.setProperty('--note-aspect', String(cards[index].aspect));
    gsap.set(reveal(), { opacity: 0, y: 24 });
    lenis.scrollTo(0, { immediate: true, force: true });

    const to = detailRect();
    const tl = gsap.timeline({
      onComplete: () => {
        pose.bind = 'detail';
        busy = false;
        lenis.start();
      },
    });
    // power2.inOut в GSAP — это ease-in-out cubic
    tl.to(pose, { x: to.x, y: to.y, w: to.w, duration: dur, ease: 'power2.inOut' }, 0)
      .to(fade, { stack: 0, duration: quick ? 0 : 0.5, ease: 'power2.out' }, 0);
    if (from === 'wheel') {
      tl.to(wheelLayer, { x: () => -view.w * 0.6, opacity: 0, duration: quick ? 0 : 0.8, ease: 'power2.inOut' }, 0);
    } else {
      tl.to(gridLayer, { opacity: 0, duration: quick ? 0 : 0.5, ease: 'power2.out' }, 0);
    }
    tl.to(switcher, { opacity: 0, duration: quick ? 0 : 0.3 }, 0)
      .to(reveal(), { opacity: 1, y: 0, duration: quick ? 0 : 0.6, ease: 'power3.out', stagger: 0.08 }, quick ? 0 : dur * 0.55);
  }

  function closeDetail() {
    if (busy || mode !== 'detail') return;
    busy = true;
    if (window.scrollY > 1 && !reducedMotion) {
      // Сначала плавно к началу страницы, потом обратная анимация
      lenis.scrollTo(0, { duration: 0.6, force: true, onComplete: () => { lenis.stop(); runClose(); } });
    } else {
      lenis.stop();
      window.scrollTo(0, 0);
      runClose();
    }
  }

  function runClose() {
    const quick = reducedMotion;
    const dur = quick ? 0 : CONFIG.moveDuration;
    const toWheel = origin === 'wheel';
    pose.bind = null;
    Object.assign(pose, detailRect());
    cards.forEach((c, i) => { gsap.killTweensOf(c); c.hero = i === current ? 1 : 0; });

    // Исходный вид оживает сразу, чтобы въехать уже на нужной купюре
    if (toWheel) {
      wheel.jumpTo(current);
      wheel.setActive(true);
    } else {
      grid.setActive(true);
    }

    const to = toWheel ? panelRect() : originRect;
    const tl = gsap.timeline({
      onComplete: () => {
        detail.hidden = true;
        wheelLayer.classList.remove('is-origin');
        gridLayer.classList.remove('is-origin');
        cards.forEach((c) => { c.hero = 0; });
        mode = origin;
        root.dataset.view = origin;
        pose.bind = toWheel ? 'panel' : null;
        gsap.set([wheelLayer, gridLayer], { clearProps: 'transform' });
        busy = false;
      },
    });

    tl.to(reveal(), { opacity: 0, y: -16, duration: quick ? 0 : 0.3, ease: 'power2.in' }, 0)
      .to(pose, { x: to.x, y: to.y, w: to.w, duration: dur, ease: 'power2.inOut' }, 0)
      .to(rot, { y: nearestTurn(rot.y), vy: 0, duration: quick ? 0 : 0.8, ease: 'power2.inOut', onComplete: () => { rot.y = 0; } }, 0)
      .to(switcher, { opacity: 1, duration: quick ? 0 : 0.4 }, quick ? 0 : dur * 0.6);

    if (toWheel) {
      tl.to(fade, { stack: 1, duration: quick ? 0 : 0.6, ease: 'power2.out' }, quick ? 0 : dur * 0.5)
        .fromTo(wheelLayer, { x: () => -view.w * 0.6, opacity: 0 }, { x: 0, opacity: 1, duration: quick ? 0 : 0.8, ease: 'power2.inOut' }, quick ? 0 : dur * 0.3);
    } else {
      tl.to(gridLayer, { opacity: 1, duration: quick ? 0 : 0.5, ease: 'power2.out' }, quick ? 0 : dur * 0.7)
        .to(canvas, { opacity: 0, duration: quick ? 0 : 0.3 }, quick ? 0 : dur);
    }
  }

  // Листание на странице: текущая купюра уходит вглубь и гаснет, следующая приходит из глубины
  function stepDetail(dir) {
    if (busy || mode !== 'detail') return;
    const prev = current;
    current = mod(current + dir, COUNT);
    const Z = CONFIG.zoom;
    const quick = reducedMotion;

    const leaving = cards[prev];
    leaving.heroIn = false;
    gsap.to(leaving, { hero: 0, duration: quick ? 0 : Z.out, ease: 'power2.inOut', overwrite: true });

    const coming = cards[current];
    coming.heroIn = true;
    coming.hero = 0;
    gsap.to(coming, { hero: 1, duration: quick ? 0 : Z.in, ease: 'power2.out', delay: quick ? 0 : Z.delay, overwrite: true });

    noteSlot.style.setProperty('--note-aspect', String(coming.aspect));
    swapBody(current);
  }

  /* --- Загрузка --- */

  const counter = { value: 0 };
  const countEl = document.querySelector('.preloader__count');
  const renderCount = () => { countEl.textContent = String(Math.round(counter.value)); };

  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    gsap.to(counter, { value: (loaded / total) * 100, duration: 0.6, ease: 'power2.out', onUpdate: renderCount, overwrite: true });
  };
  manager.onLoad = () => {
    maxHeight = Math.max(...cards.map((c) => 1 / c.aspect));
    renderer.compile(scene, camera);
    gsap.to(counter, { value: 100, duration: 0.8, ease: 'power2.out', onUpdate: renderCount, overwrite: true, onComplete: intro });
  };
  // Ошибка одной картинки не должна стопорить прелоадер
  manager.onError = () => {};

  const loader = new THREE.TextureLoader(manager);
  ITEMS.forEach((item, i) => {
    const card = cards[i];
    loader.load(item.src, (texture) => {
      prepareTexture(texture, maxAnisotropy);
      renderer.initTexture(texture);
      card.aspect = texture.image.width / texture.image.height;
      card.front.map = texture;
      card.front.needsUpdate = true;
      if (!item.back) {
        // Оборота нет — на обороте повторяется лицо
        card.back.map = texture;
        card.back.needsUpdate = true;
      }
    });
    if (item.back) {
      loader.load(item.back, (texture) => {
        prepareTexture(texture, maxAnisotropy);
        renderer.initTexture(texture);
        card.back.map = texture;
        card.back.needsUpdate = true;
      });
    }
  });

  // Прелоадер: купюра ребром по центру → поворачивается в фас → уезжает к колесу, за ней собирается стопка
  cards[0].hero = 1;
  function intro() {
    const quick = reducedMotion;
    const tl = gsap.timeline({
      onComplete: () => {
        cards[0].hero = 0;
        mode = 'wheel';
        root.dataset.view = 'wheel';
        pose.bind = 'panel';
        busy = false;
      },
    });
    tl.to(countEl, { yPercent: -40, opacity: 0, duration: quick ? 0 : 0.5, ease: 'power2.in' })
      .to(rot, { flip: 0, duration: quick ? 0 : 1.2, ease: 'power3.inOut' }, quick ? 0 : '-=0.1')
      .add(() => {
        pose.bind = null;
        root.classList.remove('is-loading');
        wheel.setActive(true);
      })
      .to(pose, {
        x: () => panelRect().x,
        y: () => panelRect().y,
        w: () => panelRect().w,
        duration: quick ? 0 : CONFIG.moveDuration,
        ease: 'power2.inOut',
      })
      .to(fade, { stack: 1, duration: quick ? 0 : 0.8, ease: 'power2.out' }, quick ? '<' : '<0.6')
      .from(wheelLayer, { x: () => -view.w * 0.4, opacity: 0, duration: quick ? 0 : 1, ease: 'power3.out' }, quick ? '<' : '<-0.4')
      .from([switcher, langNav], { opacity: 0, duration: quick ? 0 : 0.6, ease: 'power2.out', stagger: 0.08 }, '<0.3');
  }

  applyLanguage();
  root.dataset.view = 'wheel';
  Object.assign(pose, { x: view.w / 2, y: view.h / 2, w: panelRect().w });

  /* --- Стопка --- */

  // Слот k в стопке: 0 — передняя. Три первых непрозрачны, четвёртая полупрозрачна, дальше не видно.
  function slotPose(k) {
    const S = CONFIG.stack;
    const opacity = k <= 2 ? 1 : k <= 3 ? lerp(1, 0.5, k - 2) : k <= 4 ? lerp(0.5, 0, k - 3) : 0;
    return { dx: k * S.offsetX, dz: -k * S.depth, turn: k * S.turn, opacity };
  }

  // rel — непрерывное место купюры в стопке. Между N−1 и N купюра уходит с передней
  // позиции в конец, как настоящая: сначала вверх (вместе с текстом колеса), оставаясь
  // перед стопкой, пока перекрывает её; только выйдя целиком над стопкой — назад;
  // затем опускается за стопку и гаснет. Прокрутка вверх проигрывает путь обратно.
  const smooth = (v) => v * v * (3 - 2 * v);
  function stackPose(rel, aspect) {
    const S = CONFIG.stack;
    if (rel <= COUNT - 1) return { ...slotPose(rel), dy: 0, tilt: 0 };
    const p = COUNT - rel; // 0 — ещё спереди, 1 — уже в конце
    const end = slotPose(COUNT - 1);
    const up = smooth(clamp(p / S.phaseUp, 0, 1));
    const back = smooth(clamp((p - S.phaseUp) / (S.phaseBack - S.phaseUp), 0, 1));
    const down = smooth(clamp((p - S.phaseBack) / (1 - S.phaseBack), 0, 1));
    // Подъём на половину своей высоты + половину самой высокой купюры + зазор
    const clear = 0.5 / aspect + 0.5 * maxHeight + S.gap;
    return {
      dx: end.dx * back,
      dy: -clear * up * (1 - down),
      dz: S.lead * up * (1 - back) + end.dz * back,
      turn: end.turn * back,
      tilt: -S.tilt * Math.sin(Math.PI * p),
      opacity: 1 - down,
    };
  }
  let maxHeight = 0.6; // высота самой высокой купюры в долях ширины; уточняется после загрузки

  /* --- Кадр --- */

  const damp = (factor, dt) => 1 - Math.pow(1 - factor, dt * 60);

  gsap.ticker.add((_time, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.05);
    const still = reducedMotion;

    grid.update(dt);
    wheel.update(dt);

    // В сетке купюры не видны — не тратим на сцену кадр
    if (mode === 'grid' && !busy) return;

    if (pose.bind === 'panel') Object.assign(pose, panelRect());
    else if (pose.bind === 'center') Object.assign(pose, { x: view.w / 2, y: view.h / 2, w: panelRect().w });
    else if (pose.bind === 'detail') Object.assign(pose, detailRect());

    // Наклон к курсору: угол, к которому движется мышь, уходит назад на hoverTilt
    const over = pointer.mouse && !busy && !rot.dragging && isOverHero(pointer.x, pointer.y);
    let tx = 0;
    let ty = 0;
    if (over && !still) {
      const r = heroRect();
      const nx = clamp((pointer.x - r.x) / (r.w / 2), -1, 1);
      const ny = clamp((r.y - pointer.y) / (r.h / 2), -1, 1);
      tx = -ny * CONFIG.hoverTilt;
      ty = nx * CONFIG.hoverTilt;
    }
    tilt.x += (tx - tilt.x) * damp(0.1, dt);
    tilt.y += (ty - tilt.y) * damp(0.1, dt);
    root.classList.toggle('is-over-note', over && mode === 'detail');
    if (mode === 'wheel') placeHitArea();

    // Переворот на странице: инерция и доводка до лица или оборота
    if (mode === 'detail' && !busy && !rot.dragging) {
      rot.y += rot.vy * dt;
      rot.vy *= Math.pow(0.05, dt);
      if (Math.abs(rot.vy) < 0.6) {
        rot.vy = 0;
        rot.y += (Math.round(rot.y / Math.PI) * Math.PI - rot.y) * damp(0.08, dt);
      }
    }

    const k = view.worldH / view.h; // мировых единиц на пиксель
    const panel = panelRect();
    const stackW = panel.w * k;
    const focus = wheel.position;
    const Z = CONFIG.zoom;
    const P = CONFIG.paper;

    cards.forEach((c, i) => {
      const m = c.mesh;
      const rel = mod(i - focus, COUNT);
      const sp = stackPose(rel, c.aspect);
      const frontWeight = 1 - Math.min(1, Math.min(rel, COUNT - rel));

      // Стопка у колеса
      let x = panel.x + sp.dx * panel.w;
      let y = panel.y + sp.dy * panel.w;
      let z = sp.dz * stackW;
      let w = stackW;
      let rx = sp.tilt + tilt.x * frontWeight;
      let ry = sp.turn + tilt.y * frontWeight;
      let opacity = sp.opacity * fade.stack;

      // Главная купюра: прелоадер, переезд, страница
      if (c.hero > 0) {
        const hw = pose.w * k;
        const depth = c.heroIn ? Z.depthIn : Z.depthOut;
        const heroZ = mode === 'detail' ? -(1 - c.hero) * depth * hw : 0;
        const blend = mode === 'detail' || mode === 'intro' ? 1 : c.hero;
        x = lerp(x, pose.x, blend);
        y = lerp(y, pose.y, blend);
        z = lerp(z, heroZ, blend);
        w = lerp(w, hw, blend);
        rx = lerp(rx, tilt.x, blend);
        ry = lerp(ry, rot.y + rot.flip + tilt.y, blend);
        opacity = mode === 'detail' ? c.hero : lerp(opacity, 1, blend);
      }

      const wasVisible = m.visible;
      m.visible = opacity > 0.003;
      if (!m.visible) return;
      const wx = (x - view.w / 2) * k;
      const wy = -(y - view.h / 2) * k;
      m.scale.set(w, w / c.aspect, w);
      m.position.set(wx, wy, z);
      m.rotation.set(rx, ry, 0);

      // Скорость купюры: вращение вокруг вертикали (рад/с) и движение (ширин/с)
      let omega = 0;
      let speed = 0;
      if (wasVisible && c.prev && dt > 0) {
        omega = clamp((ry - c.prev.ry) / dt, -20, 20);
        speed = Math.min(10, Math.hypot(wx - c.prev.x, wy - c.prev.y, z - c.prev.z) / dt / w);
      }
      c.prev = { x: wx, y: wy, z, ry };

      // Бумага отстаёт от движения: края гнутся против вращения, середина прогибается от скорости.
      // Пружина даёт мягкий отскок, когда купюра останавливается.
      const curlTarget = still ? 0 : clamp(-omega * P.flipCurl, -P.curlMax, P.curlMax);
      const cupTarget = still ? 0 : -Math.min(P.cupMax, Math.abs(omega) * P.flipCup + speed * P.moveCup);
      [[c.curl, curlTarget], [c.cup, cupTarget]].forEach(([spring, target]) => {
        spring.v += (P.stiffness * (target - spring.x) - P.damping * spring.v) * dt;
        spring.x += spring.v * dt;
      });

      if (Math.abs(opacity - c.opacity) > 0.002) {
        c.opacity = opacity;
        c.materials.forEach((mat) => { mat.opacity = opacity; });
      }

      const u = c.uniforms;
      u.uBend.value = c.cup.x;
      u.uCurl.value = c.curl.x;
      u.uWave.value = still ? 0 : P.wave + Math.abs(c.cup.x) * 0.08;
      u.uTime.value += dt * 1.2;
    });

    renderer.render(scene, camera);
  });

  // Прозрачная кнопка поверх передней купюры: клик открывает её страницу
  function placeHitArea() {
    const r = panelRect();
    const h = r.w / cards[frontIndex()].aspect;
    hitArea.style.left = `${r.x - r.w / 2}px`;
    hitArea.style.top = `${r.y - h / 2}px`;
    hitArea.style.width = `${r.w}px`;
    hitArea.style.height = `${h}px`;
  }
}

/* ---------- Текстуры ---------- */

function prepareTexture(texture, anisotropy) {
  const image = texture.image;
  const scale = Math.min(1, CONFIG.maxTexture / Math.max(image.width, image.height));
  if (scale < 1) {
    const c = document.createElement('canvas');
    c.width = Math.round(image.width * scale);
    c.height = Math.round(image.height * scale);
    c.getContext('2d').drawImage(image, 0, 0, c.width, c.height);
    texture.image = c;
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
}

// Плитка волокон: короткие изогнутые штрихи разной яркости на сером
function createFiberTexture(anisotropy) {
  const random = mulberry32(20251017);
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const x = random() * size;
    const y = random() * size;
    const len = 6 + random() * 26;
    const angle = random() * TAU;
    const bendAngle = angle + (random() - 0.5) * 1.2;
    const light = random() > 0.5;
    ctx.strokeStyle = light ? `rgba(255,255,255,${0.25 + random() * 0.35})` : `rgba(120,120,120,${0.15 + random() * 0.25})`;
    ctx.lineWidth = 0.6 + random() * 1.1;
    // Рисуем со сдвигами, чтобы плитка стыковалась без шва
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        const sx = x + dx;
        const sy = y + dy;
        if (sx < -40 || sx > size + 40 || sy < -40 || sy > size + 40) continue;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(
          sx + Math.cos(angle) * len * 0.5,
          sy + Math.sin(angle) * len * 0.5,
          sx + Math.cos(bendAngle) * len,
          sy + Math.sin(bendAngle) * len,
        );
        ctx.stroke();
      }
    }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(CONFIG.fiberRepeat, CONFIG.fiberRepeat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/* ---------- Общие утилиты ---------- */

function node(tag, className = '', content = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content) el.textContent = content;
  return el;
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
