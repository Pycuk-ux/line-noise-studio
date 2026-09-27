import * as THREE from "three";
import "./card.css";
import { TiltInput } from "./input";
import {
  CARD,
  CARD_BASE,
  DECALS,
  EXTRAS,
  HOLO,
  PAGE_BG,
  WINDOW,
  WINDOW_LAYERS,
  toLocal,
} from "./layout";
import { cardShadowTexture, placeholderTexture } from "./placeholders";
import { holoShader, shadowShader, windowShader } from "./shaders";

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const loaderEl = document.querySelector<HTMLElement>("#loader")!;
const motionBtn = document.querySelector<HTMLButtonElement>("#motion")!;

// ─── Renderer / camera ──────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x050603);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(26, 1, 10, 20000);
const maxAniso = renderer.capabilities.getMaxAnisotropy();

// ─── Assets ─────────────────────────────────────────────────────────────────

const manager = new THREE.LoadingManager();
manager.onProgress = (_url, loaded, total) => {
  loaderEl.style.setProperty("--p", String(loaded / total));
};
const loader = new THREE.TextureLoader(manager);

function load(url: string) {
  return loader.loadAsync(url).then((t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  });
}

const [pageBgTex, baseTex, holoTex, bgTex, photoTex, scanTex, decalTexes, extraTexes] = await Promise.all([
  load(PAGE_BG),
  load(CARD_BASE),
  load(HOLO),
  load(WINDOW_LAYERS.bg.src),
  load(WINDOW_LAYERS.photo.src),
  load(WINDOW_LAYERS.scan.src),
  Promise.all(DECALS.map((d) => load(d.src))),
  // Floating extras: use the real PNG when present, otherwise a drawn stand-in.
  Promise.all(EXTRAS.map((e) => load(e.src).catch(() => placeholderTexture(e.placeholder)))),
]);

// ─── Card ───────────────────────────────────────────────────────────────────

const W = CARD.width;
const H = CARD.height;
const T = CARD.thickness;
const FRONT = T / 2;

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Flat rounded face whose UVs span the full card (ShapeGeometry uses raw xy). */
function faceGeometry() {
  const g = new THREE.ShapeGeometry(roundedRect(W, H, CARD.radius), 16);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / W + 0.5, pos.getY(i) / H + 0.5);
  return g;
}

const cardRoot = new THREE.Group(); // tilt
const card = new THREE.Group(); // flip
cardRoot.add(card);
scene.add(cardRoot);

// Card stock: a 4px extrusion with a tiny bevel so the edge catches light.
{
  const bevel = 0.8;
  const geo = new THREE.ExtrudeGeometry(roundedRect(W - bevel * 2, H - bevel * 2, CARD.radius - bevel), {
    depth: T - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 16,
  });
  geo.translate(0, 0, -(T - bevel * 2) / 2);
  const edge = new THREE.MeshStandardMaterial({ color: CARD.edgeColor, roughness: 0.35, metalness: 0.15 });
  const body = new THREE.Mesh(geo, edge);
  card.add(body);
}

const face = faceGeometry();

// Front print: the green glitch art (bg-image-green).
const front = new THREE.Mesh(face, new THREE.MeshBasicMaterial({ map: baseTex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
front.position.z = FRONT + 0.2;
card.add(front);

// Window: moving-inside-elements + photo + scan, each drifting at its own depth.
const windowUniforms = {
  tBg: { value: bgTex },
  tPhoto: { value: photoTex },
  tScan: { value: scanTex },
  uPlane: { value: new THREE.Vector2(WINDOW_LAYERS.bg.w, WINDOW_LAYERS.bg.h) },
  uBgSize: { value: new THREE.Vector2(WINDOW_LAYERS.bg.w, WINDOW_LAYERS.bg.h) },
  uPhotoSize: { value: new THREE.Vector2(WINDOW_LAYERS.photo.w, WINDOW_LAYERS.photo.h) },
  uScanSize: { value: new THREE.Vector2(WINDOW_LAYERS.scan.w, WINDOW_LAYERS.scan.h) },
  uDepth: { value: new THREE.Vector3(WINDOW_LAYERS.bg.depth, WINDOW_LAYERS.photo.depth, WINDOW_LAYERS.scan.depth) },
  uZoom: { value: new THREE.Vector3(WINDOW_LAYERS.bg.zoom, WINDOW_LAYERS.photo.zoom, WINDOW_LAYERS.scan.zoom) },
  uTilt: { value: new THREE.Vector2() },
  uFill: { value: new THREE.Color("#000431") },
};
{
  const { cx, cy } = toLocal(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h);
  const mat = new THREE.ShaderMaterial({ ...windowShader, uniforms: windowUniforms, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(WINDOW_LAYERS.bg.w, WINDOW_LAYERS.bg.h), mat);
  mesh.position.set(cx, cy, FRONT + 0.4);
  mesh.renderOrder = 10;
  card.add(mesh);
}

// Holographic laminate (front + back share uniforms).
const holoUniforms = {
  tPattern: { value: holoTex },
  uTilt: { value: new THREE.Vector2() },
  uSize: { value: new THREE.Vector2(W, H) },
  uRadius: { value: CARD.radius },
  uTime: { value: 0 },
  uStrength: { value: 1 },
};
const holoMat = new THREE.ShaderMaterial({
  ...holoShader,
  uniforms: holoUniforms,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
{
  const holo = new THREE.Mesh(new THREE.PlaneGeometry(W, H), holoMat);
  holo.position.z = FRONT + 0.8;
  holo.renderOrder = 20;
  card.add(holo);
}

// Floating elements: real 3D offsets above the face + a soft shadow on it.
interface DecalRig {
  mesh: THREE.Mesh;
  shadow: THREE.Mesh;
  baseX: number;
  baseY: number;
  lift: number;
}
const decals: DecalRig[] = DECALS.map((d, i) => {
  const tex = decalTexes[i];
  const { cx, cy } = toLocal(d.x, d.y, d.w, d.h);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(d.w, d.h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.position.set(cx, cy, FRONT + d.lift);
  mesh.renderOrder = 40 + i;

  const pad = 1.35;
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(d.w * pad, d.h * pad),
    new THREE.ShaderMaterial({
      ...shadowShader,
      uniforms: { map: { value: tex }, uOpacity: { value: 0.55 }, uBlur: { value: 2.5 }, uPad: { value: pad } },
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.position.set(cx, cy, FRONT + 0.6);
  shadow.renderOrder = 15;
  card.add(mesh, shadow);
  return { mesh, shadow, baseX: cx, baseY: cy, lift: d.lift };
});

// Back of the card.
{
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.drawImage(baseTex.image as CanvasImageSource, 0, 0, W, H);
  g.fillStyle = "rgba(0, 4, 49, 0.9)";
  g.beginPath();
  g.roundRect(WINDOW.x, 60, WINDOW.w, H - 120, 28);
  g.fill();
  g.strokeStyle = "#DEEF28";
  g.lineWidth = 4;
  g.stroke();
  const name = decalTexes[DECALS.findIndex((d) => d.name === "name")].image as CanvasImageSource;
  g.drawImage(name, (W - 948) / 2, H / 2 - 120, 948, 71);
  const role = DECALS.find((d) => d.name === "uix-ui")!;
  const roleImg = decalTexes[DECALS.indexOf(role)].image as CanvasImageSource;
  g.drawImage(roleImg, (W - role.w) / 2, H / 2 + 10, role.w, role.h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;

  const back = new THREE.Mesh(face, new THREE.MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
  back.rotation.y = Math.PI;
  back.position.z = -FRONT - 0.2;
  const backHolo = new THREE.Mesh(new THREE.PlaneGeometry(W, H), holoMat);
  backHolo.rotation.y = Math.PI;
  backHolo.position.z = -FRONT - 0.8;
  backHolo.renderOrder = 20;
  card.add(back, backHolo);
}

// Soft shadow the card casts on the page.
const cardShadow = (() => {
  const s = cardShadowTexture(W, H, CARD.radius);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(s.width, s.height),
    new THREE.MeshBasicMaterial({ map: s.tex, transparent: true, opacity: 0.6, depthWrite: false }),
  );
  m.position.z = -120;
  m.renderOrder = -5;
  scene.add(m);
  return m;
})();

// ─── Page background ────────────────────────────────────────────────────────

const BG_Z = -1600;
const pageBg = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: pageBgTex, depthWrite: false }),
);
pageBg.position.z = BG_Z;
pageBg.renderOrder = -10;
scene.add(pageBg);

// ─── Floating extras around the card ────────────────────────────────────────

const extras = EXTRAS.map((e, i) => {
  const tex = extraTexes[i];
  const img = tex.image as { width: number; height: number };
  const aspect = img.width / img.height;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(e.size * Math.min(1, aspect), e.size / Math.max(1, aspect)),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
  mesh.position.set(e.x, e.y, e.z);
  // Behind-the-card extras draw first so the card covers them.
  mesh.renderOrder = e.z < 0 ? -1 : 100 + i;
  scene.add(mesh);
  return { mesh, cfg: e };
});

// ─── Lights (only the extruded edge is lit) ─────────────────────────────────

scene.add(new THREE.AmbientLight(0xffffff, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
scene.add(key);

// ─── Layout ─────────────────────────────────────────────────────────────────

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;

  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  // Leave room for the floating extras on wide screens; fill the width on phones.
  const fitW = camera.aspect > 1 ? W + 900 : W * 1.16;
  const fitH = H * 1.14;
  const dist = Math.max(fitH / 2 / tanHalf, fitW / 2 / tanHalf / camera.aspect);
  camera.position.set(0, 0, dist);
  // Tight near plane keeps depth precision for the 4px-thick card layers.
  camera.near = Math.max(10, dist * 0.4);
  camera.far = dist + Math.abs(BG_Z) + 1000;
  camera.updateProjectionMatrix();

  // Cover-fit the background at its depth, with headroom for parallax.
  const d = dist - BG_Z;
  const viewH = 2 * d * tanHalf * 1.12;
  const viewW = viewH * camera.aspect;
  const img = pageBgTex.image as { width: number; height: number };
  const imgAspect = img.width / img.height;
  if (viewW / viewH > imgAspect) pageBg.scale.set(viewW, viewW / imgAspect, 1);
  else pageBg.scale.set(viewH * imgAspect, viewH, 1);
}
window.addEventListener("resize", resize);
resize();

// ─── Interaction ────────────────────────────────────────────────────────────

const input = new TiltInput(document.body);

if (input.needsMotionPermission) {
  motionBtn.hidden = false;
  motionBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (await input.enableMotion()) motionBtn.hidden = true;
  });
} else if (matchMedia("(pointer: coarse)").matches) {
  void input.enableMotion();
}

// Tap / click flips the card.
let flipTarget = 0;
let flip = 0;
let flipVel = 0;
let downAt = { x: 0, y: 0, t: 0 };
canvas.addEventListener("pointerdown", (e) => (downAt = { x: e.clientX, y: e.clientY, t: performance.now() }));
canvas.addEventListener("pointerup", (e) => {
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  if (moved < 8 && performance.now() - downAt.t < 400) flipTarget = flipTarget === 0 ? Math.PI : 0;
});

// ─── Loop ───────────────────────────────────────────────────────────────────

const MAX_YAW = 0.42;
const MAX_PITCH = 0.32;
const timer = new THREE.Timer();

renderer.setAnimationLoop((now) => {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.05);
  const t = timer.getElapsed();
  input.update(dt, t);
  const tilt = input.value;

  // Springy flip.
  flipVel += ((flipTarget - flip) * 90 - flipVel * 14) * dt;
  flip += flipVel * dt;

  cardRoot.rotation.set(-tilt.y * MAX_PITCH, tilt.x * MAX_YAW, 0);
  card.rotation.y = flip;
  cardRoot.position.y = Math.sin(t * 0.9) * 8;

  windowUniforms.uTilt.value.set(tilt.x, tilt.y);
  // Viewed from the back the tilt reads mirrored.
  const facing = Math.cos(flip) >= 0 ? 1 : -1;
  holoUniforms.uTilt.value.set(tilt.x * facing + Math.sin(flip) * 0.8, tilt.y);
  holoUniforms.uTime.value = t;

  // Push lifted elements a little further than true parallax, and slide
  // their shadows away from the light.
  for (const d of decals) {
    d.mesh.position.x = d.baseX + tilt.x * d.lift * 0.9;
    d.mesh.position.y = d.baseY + tilt.y * d.lift * 0.9;
    d.shadow.position.x = d.baseX + d.lift * (0.35 - tilt.x * 0.5);
    d.shadow.position.y = d.baseY - d.lift * (0.45 + tilt.y * 0.5);
  }

  for (const [i, { mesh, cfg }] of extras.entries()) {
    const depth = 1 + cfg.z / 400;
    mesh.position.x = cfg.x + tilt.x * cfg.drift * depth;
    mesh.position.y = cfg.y + tilt.y * cfg.drift * depth + Math.sin(t * 0.8 + i * 2.1) * 16;
    mesh.rotation.z = Math.sin(t * cfg.spin + i) * 0.25;
    mesh.rotation.y = tilt.x * 0.6;
    mesh.rotation.x = -tilt.y * 0.4;
  }

  cardShadow.position.set(-tilt.x * 50 + 30, -tilt.y * 50 - 50, cardShadow.position.z);
  pageBg.position.set(-tilt.x * 90, -tilt.y * 90, BG_Z);
  key.position.set(tilt.x * -600 + 300, tilt.y * -600 + 500, 900);

  renderer.render(scene, camera);
});

loaderEl.classList.add("done");
