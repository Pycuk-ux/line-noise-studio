import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/* ---------- Настройки ---------- */

const CONFIG = {
  objectWidth: 1, // ширина купюры в мировых единицах
  thickness: 0.006, // толщина «бумаги»
  spacing: 1.3, // шаг ряда в ширинах объекта
  tiltX: -0.35, // наклон к зрителю у боковых купюр
  rollRange: 0.1, // случайный поворот вокруг оси, ±
  spinSpeed: 0.15, // рад/с у активной купюры
  swayAmp: 0.012,
  swayFreq: 0.8,
  lerp: 0.08, // доводка ряда при остановке скролла
  depthStep: 0.55, // насколько уходят назад соседи
  maxDepthSteps: 2.5,
  dimMax: 0.5, // насколько темнеют соседи
  bendGain: 0.35, // сила загиба бумаги от скорости
  bendMax: 0.14,
  waveAmp: 0.004, // «дыхание» бумаги у активной купюры
  fov: 32,
  widthDesktop: 0.36, // доля ширины экрана под купюру
  widthMobile: 0.7,
  maxHeightFrac: 0.48, // не выше этой доли высоты экрана
  maxTexture: 1024,
  maxPixelRatio: 2,
  // Поверхности без металла: хлопково-льняная бумага и полимер
  surfaces: {
    cotton: {
      roughness: 0.82,
      sheen: 0.35,
      sheenRoughness: 0.8,
      sheenColor: 0xfff6e8,
      bumpScale: 0.6,
      fiberRepeat: 2.2,
    },
    polymer: {
      roughness: 0.32,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25,
      ior: 1.49,
    },
  },
  paperColor: 0xe9dfcc,
  envIntensity: 0.9,
  rectIntensity: 2.6,
  exposure: 1,
};

const root = document.documentElement;
const items = [...document.querySelectorAll('.collection .note')].map((li) => ({
  src: li.dataset.src,
  name: li.querySelector('.note__name').textContent.trim(),
  caption: li.querySelector('.note__caption').textContent.trim(),
  material: li.dataset.material === 'polymer' ? 'polymer' : 'cotton',
  materialLabel: li.querySelector('.note__material')?.textContent.trim() ?? '',
  quote: li.querySelector('.note__quote').textContent.trim(),
}));
const COUNT = items.length;

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = motionQuery.matches;
motionQuery.addEventListener('change', (e) => { reducedMotion = e.matches; });

const canvas = document.querySelector('.stage');
const renderer = root.classList.contains('is-webgl') && COUNT > 0 ? createRenderer(canvas) : null;

if (!renderer) {
  // Без WebGL остаётся обычная сетка из разметки
  root.classList.remove('is-webgl', 'is-loading');
} else {
  start(renderer);
}

function createRenderer(target) {
  try {
    return new THREE.WebGLRenderer({
      canvas: target,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }
}

/* ---------- Загиб бумаги в вершинном шейдере ---------- */

// Профиль по X: чашка от скорости скролла плюс бегущая волна.
// Нормаль правится той же производной, чтобы блик ехал по изгибу.
function applyPaperBend(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uBend;
        uniform float uWave;
        uniform float uTime;
        float paperZ(float x) { return uBend * x * x + uWave * sin(x * 6.2832 + uTime); }
        float paperDz(float x) { return 2.0 * uBend * x + uWave * 6.2832 * cos(x * 6.2832 + uTime); }`,
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

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  scene.environmentIntensity = CONFIG.envIntensity;

  if (!isWeak) {
    RectAreaLightUniformsLib.init();
    const rect = new THREE.RectAreaLight(0xfff3e2, CONFIG.rectIntensity, 2.4, 1.2);
    rect.position.set(2.2, 2.2, 2.6);
    rect.lookAt(0, 0, 0);
    scene.add(rect);
  }

  /* --- Купюры --- */

  const geometry = new THREE.BoxGeometry(CONFIG.objectWidth, 1, CONFIG.thickness, 48, 1, 1);
  const random = mulberry32(20251017);
  const fibers = createFiberTexture(random, maxAnisotropy);
  const objects = items.map((item, i) => {
    const uniforms = {
      uBend: { value: 0 },
      uWave: { value: 0 },
      uTime: { value: random() * 10 },
    };
    const face = createSurface(item.material, fibers);
    const edge = new THREE.MeshStandardMaterial({
      color: CONFIG.paperColor,
      roughness: item.material === 'polymer' ? 0.4 : 0.9,
      metalness: 0,
    });
    applyPaperBend(face, uniforms);
    applyPaperBend(edge, uniforms);

    // Порядок граней BoxGeometry: +x, −x, +y, −y, +z (лицо), −z (оборот)
    const mesh = new THREE.Mesh(geometry, [edge, edge, edge, edge, face, face]);
    mesh.scale.y = 0.5;
    scene.add(mesh);

    return {
      mesh,
      face,
      edge,
      uniforms,
      aspect: 2,
      roll: (random() * 2 - 1) * CONFIG.rollRange,
      spin: 0,
      flip: i === 0 ? Math.PI / 2 : 0, // первая купюра ребром — прелоадер
      enter: i === 0 ? 0 : 1, // остальные за правым краем
      brightness: 1,
    };
  });

  /* --- Камера и ресайз --- */

  const view = { width: 1, height: 1, maxObjectHeight: 0.72 };

  function layout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio));
    renderer.setSize(w, h, false);

    camera.aspect = w / h;
    const portrait = w <= 720 || camera.aspect < 0.85;
    const fraction = portrait ? CONFIG.widthMobile : CONFIG.widthDesktop;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const byWidth = CONFIG.objectWidth / (fraction * 2 * tan * camera.aspect);
    const byHeight = view.maxObjectHeight / (CONFIG.maxHeightFrac * 2 * tan);
    camera.position.set(0, 0, Math.max(byWidth, byHeight));
    camera.updateProjectionMatrix();

    view.height = 2 * tan * camera.position.z;
    view.width = view.height * camera.aspect;
  }

  layout();
  window.addEventListener('resize', layout);

  /* --- Скролл --- */

  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  document.querySelector('.track').style.setProperty('--count', COUNT);

  const lenis = new Lenis({ lerp: 0.1, smoothWheel: !reducedMotion });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  // s — позиция в экранах: 0 вход, 1…COUNT купюры, COUNT + 1 выход
  const scroll = { target: 0, current: 0 };
  gsap.to(scroll, {
    target: COUNT + 1,
    ease: 'none',
    scrollTrigger: {
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });

  document.querySelectorAll('[data-scroll-top]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      lenis.scrollTo(0, { immediate: reducedMotion, duration: 2 });
    });
  });

  /* --- Подписи --- */

  const hud = createHud(items);

  /* --- Загрузка --- */

  const counter = { value: 0 };
  const countEl = document.querySelector('.preloader__count');
  const renderCount = () => { countEl.textContent = String(Math.round(counter.value)); };
  let ready = false;

  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    gsap.to(counter, { value: (loaded / total) * 100, duration: 0.6, ease: 'power2.out', onUpdate: renderCount, overwrite: true });
  };
  manager.onLoad = () => {
    view.maxObjectHeight = Math.max(...objects.map((o) => CONFIG.objectWidth / o.aspect));
    layout();
    renderer.compile(scene, camera);
    gsap.to(counter, { value: 100, duration: 0.8, ease: 'power2.out', onUpdate: renderCount, overwrite: true, onComplete: reveal });
  };
  // Ошибка одной картинки не должна стопорить прелоадер: купюра останется бумажной
  manager.onError = () => {};

  const loader = new THREE.TextureLoader(manager);
  objects.forEach((object, i) => {
    loader.load(items[i].src, (texture) => {
      prepareTexture(texture, maxAnisotropy);
      renderer.initTexture(texture);
      object.aspect = texture.image.width / texture.image.height;
      object.mesh.scale.y = CONFIG.objectWidth / object.aspect;
      object.face.map = texture;
      object.face.needsUpdate = true;
    });
  });

  function reveal() {
    const quick = reducedMotion;
    const tl = gsap.timeline({
      onComplete: () => {
        ready = true;
        lenis.start();
      },
    });
    tl.to(countEl, { yPercent: -40, opacity: 0, duration: quick ? 0 : 0.5, ease: 'power2.in' })
      .to(objects[0], { flip: 0, duration: quick ? 0 : 1.2, ease: 'power3.inOut' }, quick ? 0 : '-=0.1')
      .call(() => root.classList.remove('is-loading'))
      .from('.intro > *, .brand', { yPercent: 40, opacity: 0, duration: quick ? 0 : 0.8, ease: 'power3.out', stagger: 0.06 }, '<')
      .to(objects.slice(1), { enter: 0, duration: quick ? 0 : 1.4, ease: 'power3.out', stagger: 0.08 }, quick ? 0 : '-=0.9');
  }

  /* --- Кадр --- */

  const damp = (factor, dt) => 1 - Math.pow(1 - factor, dt * 60);
  let elapsed = 0;

  gsap.ticker.add((_time, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.05);
    elapsed += dt;

    // Инерция: ряд дотягивается до скролла плавно
    const lag = scroll.target - scroll.current;
    scroll.current += lag * damp(CONFIG.lerp, dt);
    if (Math.abs(lag) < 1e-5) scroll.current = scroll.target;

    const s = scroll.current;
    const progress = COUNT > 1 ? clamp((s - 1) / (COUNT - 1), 0, 1) : 0;
    const focus = progress * (COUNT - 1);
    const exit = smoothstep(0, 1, s - COUNT);
    const step = CONFIG.objectWidth * CONFIG.spacing;
    const still = reducedMotion;
    const bendTarget = still ? 0 : clamp(-Math.abs(lag) * CONFIG.bendGain, -CONFIG.bendMax, CONFIG.bendMax);

    objects.forEach((o, i) => {
      const d = i - focus;
      const dist = Math.abs(d);
      const focusWeight = 1 - smoothstep(0, 1, dist);
      const side = 1 - focusWeight;

      // Вращение активной купюры; ушедшие от центра возвращаются к ближайшему фасу
      if (ready && !still && focusWeight > 0.5) {
        o.spin += CONFIG.spinSpeed * dt * focusWeight;
      } else {
        const rest = Math.round(o.spin / (Math.PI * 2)) * Math.PI * 2;
        o.spin += (rest - o.spin) * damp(0.06, dt);
      }

      const sway = still ? 0 : Math.sin(elapsed * CONFIG.swayFreq + i) * focusWeight;

      o.mesh.position.set(
        d * step + o.enter * view.width - exit * view.width * 1.2,
        sway * CONFIG.swayAmp,
        -Math.min(dist, CONFIG.maxDepthSteps) * CONFIG.depthStep,
      );
      o.mesh.rotation.set(
        CONFIG.tiltX * side + sway * 0.02,
        o.spin + o.flip,
        o.roll * side,
      );

      // Затемнение соседей
      const brightness = 1 - CONFIG.dimMax * Math.min(dist / 1.5, 1);
      if (Math.abs(brightness - o.brightness) > 0.002) {
        o.brightness = brightness;
        o.face.color.setScalar(brightness);
        o.edge.color.setHex(CONFIG.paperColor).multiplyScalar(brightness);
      }

      // Загиб бумаги от скорости ряда
      const u = o.uniforms;
      u.uBend.value += (bendTarget * (0.6 + 0.4 * focusWeight) - u.uBend.value) * damp(0.12, dt);
      u.uWave.value = still ? 0 : CONFIG.waveAmp * focusWeight + Math.abs(u.uBend.value) * 0.08;
      u.uTime.value += dt * 1.2;
    });

    // Подписи: видимы только на участке с купюрами
    const hudAlpha = ready ? clamp((s - 0.5) * 2, 0, 1) * clamp((COUNT + 0.5 - s) * 2, 0, 1) : 0;
    hud.setAlpha(hudAlpha);
    if (ready) hud.setActive(Math.round(focus));

    renderer.render(scene, camera);
  });

  /* --- Утилиты сцены --- */

  function createHud(list) {
    const el = document.querySelector('.hud');
    const slots = {
      title: makeSlot(el.querySelector('.hud__title')),
      quote: makeSlot(el.querySelector('.hud__quote')),
      index: makeSlot(el.querySelector('.hud__index')),
    };
    const pad = (n) => String(n).padStart(2, '0');
    let active = -1;
    let alpha = -1;

    return {
      setAlpha(value) {
        const rounded = Math.round(value * 1000) / 1000;
        if (rounded === alpha) return;
        alpha = rounded;
        el.style.opacity = String(rounded);
      },
      setActive(index) {
        if (index === active) return;
        active = index;
        const item = list[index];
        swap(slots.title, () => {
          const box = node('div');
          box.append(node('span', 'hud__name', item.name));
          const data = node('div', 'hud__data');
          data.append(node('span', '', item.caption), node('span', '', item.materialLabel));
          box.append(data);
          return box;
        });
        swap(slots.quote, () => {
          const box = node('div');
          box.append(node('span', 'hud__quote-label', 'Эмитент'), node('span', 'hud__quote-text', item.quote));
          return box;
        });
        swap(slots.index, () => node('span', '', `${pad(index + 1)} / ${pad(list.length)}`));
      },
    };
  }

  function makeSlot(container) {
    const slot = node('div', 'hud-slot');
    container.append(slot);
    return slot;
  }

  // Уходящий текст уезжает вверх (0.3 с), новый приходит снизу (0.6 с).
  // В слоте не больше двух элементов: уходящий и входящий.
  function swap(slot, build) {
    [...slot.children].forEach((child) => {
      gsap.killTweensOf(child);
      if (child.dataset.leaving || reducedMotion) {
        child.remove();
        return;
      }
      child.dataset.leaving = '1';
      gsap.to(child, { yPercent: -100, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => child.remove() });
    });

    const next = build();
    slot.append(next);
    if (reducedMotion) return;
    gsap.fromTo(next, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.1 });
  }
}

/* ---------- Поверхности ---------- */

// Хлопок и лён: матовая бумага, волокна дают рельеф и мягкий ворс по краю блика.
// Полимер: гладкая плёнка без волокон, с прозрачным лаковым слоем.
function createSurface(kind, fibers) {
  if (kind === 'polymer') {
    const p = CONFIG.surfaces.polymer;
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: p.roughness,
      clearcoat: p.clearcoat,
      clearcoatRoughness: p.clearcoatRoughness,
      ior: p.ior,
    });
  }
  const c = CONFIG.surfaces.cotton;
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: c.roughness,
    sheen: c.sheen,
    sheenRoughness: c.sheenRoughness,
    sheenColor: new THREE.Color(c.sheenColor),
    bumpMap: fibers,
    bumpScale: c.bumpScale,
    roughnessMap: fibers,
  });
}

// Плитка волокон: короткие изогнутые штрихи разной яркости на сером
function createFiberTexture(random, anisotropy) {
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
    const angle = random() * Math.PI * 2;
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
  texture.repeat.set(CONFIG.surfaces.cotton.fiberRepeat, CONFIG.surfaces.cotton.fiberRepeat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/* ---------- Общие утилиты ---------- */

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

function node(tag, className = '', text = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function smoothstep(a, b, v) {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
