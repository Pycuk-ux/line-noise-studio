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
  spinSpeed: 0.15, // рад/с: медленное вращение купюры у колеса
  swayAmp: 0.012, // покачивание в долях ширины
  swayFreq: 0.8,
  lerp: 0.08, // инерция колеса и сетки
  bendMax: 0.14,
  waveAmp: 0.004, // «дыхание» бумаги
  morphDuration: 0.9, // смена поверхности одной купюры на другую
  moveDuration: 1.1, // переезд купюры на страницу и обратно
  dragSpeed: 0.01, // рад на пиксель при перевороте
  fov: 32,
  cameraZ: 5,
  maxTexture: 1024,
  maxPixelRatio: 2,
  // Поверхности без металла: хлопково-льняная бумага и полимер.
  // Числа плавно перетекают, когда одна купюра сменяет другую.
  surfaces: {
    cotton: { roughness: 0.82, sheen: 0.35, clearcoat: 0, clearcoatRoughness: 0.3, bumpScale: 0.6 },
    polymer: { roughness: 0.32, sheen: 0, clearcoat: 0.35, clearcoatRoughness: 0.25, bumpScale: 0.05 },
  },
  sheenColor: 0xfff6e8,
  fiberRepeat: 2.2,
  paperColor: 0xe9dfcc,
  envIntensity: 0.9,
  rectIntensity: 2.6,
  exposure: 1,
};

const root = document.documentElement;
const COUNT = ITEMS.length;
const TAU = Math.PI * 2;

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

/* ---------- Шейдер купюры ---------- */

// Вершины: загиб бумаги по X (чашка + бегущая волна), нормаль правится той же производной.
const BEND_VERTEX = {
  common: `#include <common>
    uniform float uBend;
    uniform float uWave;
    uniform float uTime;
    float paperZ(float x) { return uBend * x * x + uWave * sin(x * 6.2832 + uTime); }
    float paperDz(float x) { return 2.0 * uBend * x + uWave * 6.2832 * cos(x * 6.2832 + uTime); }`,
  normal: `#include <beginnormal_vertex>
    objectNormal.x -= paperDz(position.x) * objectNormal.z;`,
  position: `#include <begin_vertex>
    transformed.z += paperZ(position.x);`,
};

// Фрагменты: две текстуры (A — текущая, B — следующая) и фронт смены с рваным,
// как у бумажного волокна, краем. Каждая текстура вписывается «cover» в текущую форму,
// поэтому пропорции перетекают без растяжения рисунка.
const MORPH_FRAGMENT = {
  common: `#include <common>
    uniform sampler2D uMapB;
    uniform float uMix;
    uniform float uAspect;
    uniform float uAspectA;
    uniform float uAspectB;
    uniform float uFlip;
    float pHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float pNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), f.x), mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    vec2 coverUv(vec2 uv, float meshAspect, float texAspect) {
      if (meshAspect > texAspect) uv.y = (uv.y - 0.5) * texAspect / meshAspect + 0.5;
      else uv.x = (uv.x - 0.5) * meshAspect / texAspect + 0.5;
      return uv;
    }`,
  map: `#ifdef USE_MAP
      vec2 baseUv = mix(vMapUv, 1.0 - vMapUv, uFlip);
      vec4 colA = texture2D(map, coverUv(baseUv, uAspect, uAspectA));
      vec4 colB = texture2D(uMapB, coverUv(baseUv, uAspect, uAspectB));
      float grain = pNoise(baseUv * vec2(9.0, 5.0)) * 0.6 + pNoise(baseUv * vec2(48.0, 26.0)) * 0.4;
      float edge = baseUv.x * 0.82 + grain * 0.18;
      float front = uMix * 1.24 - 0.12;
      float m = smoothstep(-0.035, 0.035, front - edge);
      vec4 sampledDiffuseColor = mix(colA, colB, m);
      diffuseColor *= sampledDiffuseColor;
    #endif`,
};

function applyNoteShader(material, uniforms, { morph }) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', BEND_VERTEX.common)
      .replace('#include <beginnormal_vertex>', BEND_VERTEX.normal)
      .replace('#include <begin_vertex>', BEND_VERTEX.position);
    if (morph) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', MORPH_FRAGMENT.common)
        .replace('#include <map_fragment>', MORPH_FRAGMENT.map);
    }
  };
  material.customProgramCacheKey = () => (morph ? 'note-face' : 'note-edge');
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

  /* --- Купюра: одна на всю сцену, поверхность меняется шейдером --- */

  const fibers = createFiberTexture(maxAnisotropy);
  const shared = {
    uBend: { value: 0 },
    uWave: { value: 0 },
    uTime: { value: 0 },
    uMix: { value: 0 },
    uAspect: { value: 2 },
    uAspectA: { value: 2 },
    uAspectB: { value: 2 },
  };
  const frontUniforms = { ...shared, uMapB: { value: null }, uFlip: { value: 0 } };
  const backUniforms = { ...shared, uMapB: { value: null }, uFlip: { value: 0 } };

  const surfaceMaterial = (uniforms) => {
    const m = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: CONFIG.surfaces.cotton.roughness,
      // sheen и clearcoat держим чуть выше нуля, чтобы шейдер не пересобирался при смене материала
      sheen: 0.001,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color(CONFIG.sheenColor),
      clearcoat: 0.001,
      bumpMap: fibers,
      roughnessMap: fibers,
    });
    applyNoteShader(m, uniforms, { morph: true });
    return m;
  };
  const front = surfaceMaterial(frontUniforms);
  const back = surfaceMaterial(backUniforms);
  const edge = new THREE.MeshStandardMaterial({ color: CONFIG.paperColor, roughness: 0.85, metalness: 0 });
  applyNoteShader(edge, shared, { morph: false });

  // Порядок граней BoxGeometry: +x, −x, +y, −y, +z (лицо), −z (оборот)
  const geometry = new THREE.BoxGeometry(1, 1, CONFIG.thickness, 64, 1, 1);
  const mesh = new THREE.Mesh(geometry, [edge, edge, edge, edge, front, back]);
  scene.add(mesh);

  const textures = ITEMS.map(() => ({ front: null, back: null, aspect: 2 }));
  const note = { a: -1, b: -1, morphing: false, queued: null };

  function setSurfaceA(i) {
    const tex = textures[i];
    front.map = tex.front;
    back.map = tex.back || tex.front;
    shared.uAspectA.value = tex.aspect;
    shared.uMix.value = 0;
    note.a = i;
    note.b = -1;
  }

  function setSurfaceB(i) {
    const tex = textures[i];
    frontUniforms.uMapB.value = tex.front;
    backUniforms.uMapB.value = tex.back || tex.front;
    shared.uAspectB.value = tex.aspect;
    note.b = i;
  }

  // Показать купюру i: поверхность текущей стирается и сменяется новой.
  // Пока идёт смена, новые запросы ждут — побеждает последний.
  function showNote(i, { instant = false } = {}) {
    if (instant || note.a < 0) {
      gsap.killTweensOf(shared.uMix);
      note.morphing = false;
      note.queued = null;
      setSurfaceA(i);
      return;
    }
    if (note.morphing) {
      note.queued = i;
      return;
    }
    if (i === note.a) return;
    note.morphing = true;
    setSurfaceB(i);
    gsap.to(shared.uMix, {
      value: 1,
      duration: reducedMotion ? 0 : CONFIG.morphDuration,
      ease: 'power2.inOut',
      onComplete: () => {
        setSurfaceA(i);
        note.morphing = false;
        const next = note.queued;
        note.queued = null;
        if (next !== null && next !== note.a) showNote(next);
      },
    });
  }

  // Купюра, которая видна или вот-вот станет видна
  const shownNote = () => (note.queued ?? (note.b >= 0 ? note.b : note.a));

  function surfaceAt(i) {
    return CONFIG.surfaces[ITEMS[i]?.material === 'polymer' ? 'polymer' : 'cotton'];
  }

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
    placeHitArea();
  }

  // Место купюры у колеса: справа на десктопе, сверху на телефоне
  function panelRect() {
    return view.portrait
      ? { x: view.w * 0.5, y: view.h * 0.27, w: view.w * 0.56 }
      : { x: view.w * 0.74, y: view.h * 0.5, w: Math.min(view.w * 0.36, 620) };
  }

  const noteSlot = document.querySelector('.detail__note');
  function detailRect() {
    const r = noteSlot.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
  }

  // pose — центр и ширина купюры в пикселях; bind — к чему она привязана каждый кадр
  const pose = { x: 0, y: 0, w: 1, bind: 'center' };
  const rot = { spin: 0, flip: Math.PI / 2, x: 0, vx: 0, dragging: false };

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

  let mode = 'wheel'; // wheel | grid | detail
  let origin = 'wheel'; // откуда открыта страница купюры
  let originRect = null;
  let current = 0; // купюра на странице
  let busy = true; // идёт анимация перехода
  let wheelActive = 0;
  let wheelHover = null;

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
    onChange: (i) => { wheelActive = i; if (mode === 'wheel') showNote(wheelHover ?? i); },
    onHover: (i) => { wheelHover = i; if (mode === 'wheel' && !busy) showNote(i ?? wheelActive); },
    onOpen: (i) => openDetail(i, 'wheel'),
  });

  function placeHitArea() {
    const r = panelRect();
    const h = r.w / shared.uAspect.value;
    Object.assign(hitArea.style, { left: `${r.x - r.w / 2}px`, top: `${r.y - h / 2}px`, width: `${r.w}px`, height: `${h}px` });
  }

  hitArea.addEventListener('click', () => openDetail(shownNote(), 'wheel'));
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
    if (busy || next === mode || mode === 'detail') return;
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
        if (next === 'wheel') {
          pose.bind = 'panel';
          showNote(wheelActive, { instant: true });
        }
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
    if (busy || mode === 'detail') return;
    busy = true;
    origin = from;
    current = index;
    const quick = reducedMotion;
    const dur = quick ? 0 : CONFIG.moveDuration;
    const originLayer = from === 'wheel' ? wheelLayer : gridLayer;

    // Стартовая позиция: купюра у колеса или поверх картинки в карточке сетки
    pose.bind = null;
    if (from === 'grid') {
      originRect = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, w: rect.width * 0.8 };
      showNote(index, { instant: true });
      Object.assign(pose, originRect);
      rot.spin = 0;
      gsap.set(canvas, { opacity: 1 });
    } else {
      showNote(index);
    }

    (from === 'wheel' ? wheel : grid).setActive(false);
    originLayer.classList.add('is-origin');
    mode = 'detail';
    root.dataset.view = 'detail';
    detail.hidden = false;
    swapBody(index, true);
    noteSlot.style.setProperty('--note-aspect', String(textures[index].aspect));
    gsap.set(reveal(), { opacity: 0, y: 24 });
    lenis.scrollTo(0, { immediate: true, force: true });

    const to = detailRect();
    const tl = gsap.timeline({
      onComplete: () => {
        pose.bind = 'detail';
        backUniforms.uFlip.value = 1; // дальше купюра переворачивается по X
        busy = false;
        lenis.start();
      },
    });
    // power2.inOut в GSAP — это ease-in-out cubic
    tl.to(pose, { x: to.x, y: to.y, w: to.w, duration: dur, ease: 'power2.inOut' }, 0)
      .to(rot, { spin: nearestTurn(rot.spin), duration: dur, ease: 'power2.inOut' }, 0);
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
        mode = origin;
        root.dataset.view = origin;
        if (toWheel) pose.bind = 'panel';
        gsap.set([wheelLayer, gridLayer], { clearProps: 'transform' });
        busy = false;
      },
    });

    tl.to(reveal(), { opacity: 0, y: -16, duration: quick ? 0 : 0.3, ease: 'power2.in' }, 0)
      .to(pose, { x: to.x, y: to.y, w: to.w, duration: dur, ease: 'power2.inOut' }, 0)
      .to(rot, {
        x: nearestTurn(rot.x),
        vx: 0,
        duration: quick ? 0 : 0.8,
        ease: 'power2.inOut',
        onComplete: () => { backUniforms.uFlip.value = 0; rot.x = 0; },
      }, 0)
      .to(switcher, { opacity: 1, duration: quick ? 0 : 0.4 }, quick ? 0 : dur * 0.6);

    if (toWheel) {
      tl.fromTo(wheelLayer, { x: () => -view.w * 0.6, opacity: 0 }, { x: 0, opacity: 1, duration: quick ? 0 : 0.8, ease: 'power2.inOut' }, quick ? 0 : dur * 0.3);
    } else {
      tl.to(gridLayer, { opacity: 1, duration: quick ? 0 : 0.5, ease: 'power2.out' }, quick ? 0 : dur * 0.7)
        .to(canvas, { opacity: 0, duration: quick ? 0 : 0.3 }, quick ? 0 : dur);
    }
  }

  function stepDetail(dir) {
    if (busy || mode !== 'detail') return;
    current = (current + dir + COUNT) % COUNT;
    showNote(current);
    swapBody(current);
  }

  /* --- Переворот купюры по X на странице --- */

  let drag = null;
  noteSlot.addEventListener('pointerdown', (e) => {
    if (mode !== 'detail' || busy || e.button !== 0) return;
    noteSlot.setPointerCapture(e.pointerId);
    noteSlot.classList.add('is-dragging');
    drag = { id: e.pointerId, y: e.clientY, t: performance.now() };
    rot.dragging = true;
    rot.vx = 0;
  });
  noteSlot.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const now = performance.now();
    const delta = (e.clientY - drag.y) * CONFIG.dragSpeed;
    rot.x += delta;
    rot.vx = delta / Math.max(0.001, (now - drag.t) / 1000);
    drag.y = e.clientY;
    drag.t = now;
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (noteSlot.hasPointerCapture(e.pointerId)) noteSlot.releasePointerCapture(e.pointerId);
    noteSlot.classList.remove('is-dragging');
    // Если палец замер перед отпусканием, броска нет
    if (performance.now() - drag.t > 80) rot.vx = 0;
    drag = null;
    rot.dragging = false;
  };
  noteSlot.addEventListener('pointerup', endDrag);
  noteSlot.addEventListener('pointercancel', endDrag);

  /* --- Загрузка --- */

  const counter = { value: 0 };
  const countEl = document.querySelector('.preloader__count');
  const renderCount = () => { countEl.textContent = String(Math.round(counter.value)); };

  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    gsap.to(counter, { value: (loaded / total) * 100, duration: 0.6, ease: 'power2.out', onUpdate: renderCount, overwrite: true });
  };
  manager.onLoad = () => {
    showNote(0, { instant: true });
    renderer.compile(scene, camera);
    gsap.to(counter, { value: 100, duration: 0.8, ease: 'power2.out', onUpdate: renderCount, overwrite: true, onComplete: intro });
  };
  // Ошибка одной картинки не должна стопорить прелоадер
  manager.onError = () => {};

  const loader = new THREE.TextureLoader(manager);
  ITEMS.forEach((item, i) => {
    loader.load(item.src, (texture) => {
      prepareTexture(texture, maxAnisotropy);
      renderer.initTexture(texture);
      textures[i].front = texture;
      textures[i].aspect = texture.image.width / texture.image.height;
    });
    if (item.back) {
      loader.load(item.back, (texture) => {
        prepareTexture(texture, maxAnisotropy);
        renderer.initTexture(texture);
        textures[i].back = texture;
      });
    }
  });

  // Прелоадер: купюра ребром по центру → поворачивается в фас → уезжает к колесу
  function intro() {
    const quick = reducedMotion;
    const tl = gsap.timeline({ onComplete: () => { busy = false; } });
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
        onComplete: () => { pose.bind = 'panel'; },
      })
      .from(wheelLayer, { x: () => -view.w * 0.4, opacity: 0, duration: quick ? 0 : 1, ease: 'power3.out' }, '<0.2')
      .from([switcher, langNav], { opacity: 0, duration: quick ? 0 : 0.6, ease: 'power2.out', stagger: 0.08 }, '<0.3');
  }

  applyLanguage();
  Object.assign(pose, { x: view.w / 2, y: view.h / 2, w: panelRect().w });

  /* --- Кадр --- */

  const damp = (factor, dt) => 1 - Math.pow(1 - factor, dt * 60);
  let elapsed = 0;

  gsap.ticker.add((_time, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.05);
    elapsed += dt;
    const still = reducedMotion;

    grid.update(dt);
    wheel.update(dt);

    // В сетке купюра не видна — не тратим на сцену кадр
    if (mode === 'grid' && !busy) return;

    // Форма перетекает вместе с поверхностью
    const mix = shared.uMix.value;
    const eased = mix * mix * (3 - 2 * mix);
    const aspectB = note.b >= 0 ? shared.uAspectB.value : shared.uAspectA.value;
    shared.uAspect.value = shared.uAspectA.value + (aspectB - shared.uAspectA.value) * eased;
    if (mode === 'detail' && !busy) noteSlot.style.setProperty('--note-aspect', shared.uAspect.value.toFixed(4));
    else if (mode === 'wheel') placeHitArea();

    // Привязка позиции
    if (pose.bind === 'panel') Object.assign(pose, panelRect());
    else if (pose.bind === 'center') Object.assign(pose, { x: view.w / 2, y: view.h / 2, w: panelRect().w });
    else if (pose.bind === 'detail') Object.assign(pose, detailRect());

    // Материал: бумага ↔ полимер
    const sa = surfaceAt(note.a);
    const sb = note.b >= 0 ? surfaceAt(note.b) : sa;
    const lerpS = (key) => sa[key] + (sb[key] - sa[key]) * eased;
    [front, back].forEach((m) => {
      m.roughness = lerpS('roughness');
      m.sheen = Math.max(0.001, lerpS('sheen'));
      m.clearcoat = Math.max(0.001, lerpS('clearcoat'));
      m.clearcoatRoughness = lerpS('clearcoatRoughness');
      m.bumpScale = lerpS('bumpScale');
    });

    // Вращение: у колеса медленно вокруг вертикали, на странице — переворот по X
    if (mode === 'wheel' && !busy && !still) {
      rot.spin += CONFIG.spinSpeed * dt;
    } else if (mode === 'detail' && !busy && !rot.dragging) {
      rot.x += rot.vx * dt;
      rot.vx *= Math.pow(0.05, dt);
      if (Math.abs(rot.vx) < 0.6) {
        rot.vx = 0;
        rot.x += (Math.round(rot.x / Math.PI) * Math.PI - rot.x) * damp(0.08, dt);
      }
    }

    // Мир: пиксели → единицы сцены на плоскости z = 0
    const k = view.worldH / view.h;
    const width = pose.w * k;
    const sway = still ? 0 : Math.sin(elapsed * CONFIG.swayFreq);
    mesh.scale.set(width, width / shared.uAspect.value, width);
    mesh.position.set((pose.x - view.w / 2) * k, -(pose.y - view.h / 2) * k + sway * CONFIG.swayAmp * width, 0);
    mesh.rotation.set(rot.x + sway * 0.02, rot.spin + rot.flip, 0);

    // Загиб: от скорости колеса, от броска на странице и волна во время смены поверхности
    const speed = mode === 'wheel' ? Math.abs(wheel.velocity) * 0.12 : Math.abs(rot.vx) * 0.01;
    const bendTarget = still ? 0 : -Math.min(speed, CONFIG.bendMax);
    shared.uBend.value += (bendTarget - shared.uBend.value) * damp(0.12, dt);
    shared.uWave.value = still ? 0 : CONFIG.waveAmp + Math.sin(mix * Math.PI) * 0.012 + Math.abs(shared.uBend.value) * 0.08;
    shared.uTime.value += dt * 1.2;

    renderer.render(scene, camera);
  });
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
