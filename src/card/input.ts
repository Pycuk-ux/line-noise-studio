// Turns cursor / touch / device orientation into a smoothed tilt in [-1, 1]².
// x > 0 = right, y > 0 = up. Falls back to a slow idle drift when nobody
// is interacting, so the laminate keeps catching light.

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const clamp = (v: number, a = -1, b = 1) => Math.min(b, Math.max(a, v));

export class TiltInput {
  /** Smoothed tilt, read every frame. */
  readonly value = { x: 0, y: 0 };
  private target = { x: 0, y: 0 };
  private lastInput = -Infinity;
  private gyroBase: { beta: number; gamma: number } | null = null;
  private usingGyro = false;

  constructor(private el: HTMLElement) {
    el.addEventListener("pointermove", this.onPointer);
    el.addEventListener("pointerdown", this.onPointer);
    el.addEventListener("pointerleave", () => {
      if (!this.usingGyro) this.lastInput = -Infinity;
    });
    // Recentre gyro when the phone is rotated.
    window.addEventListener("orientationchange", () => (this.gyroBase = null));
  }

  /** True on iOS, where motion access must be granted from a tap. */
  get needsMotionPermission() {
    const C = window.DeviceOrientationEvent as OrientationCtor | undefined;
    return !!C && typeof C.requestPermission === "function";
  }

  async enableMotion() {
    const C = window.DeviceOrientationEvent as OrientationCtor | undefined;
    if (!C) return false;
    if (typeof C.requestPermission === "function") {
      try {
        if ((await C.requestPermission()) !== "granted") return false;
      } catch {
        return false;
      }
    }
    window.addEventListener("deviceorientation", this.onOrientation);
    return true;
  }

  private onPointer = (e: PointerEvent) => {
    // On touch screens the gyro wins once it is producing data.
    if (e.pointerType === "touch" && this.usingGyro) return;
    const r = this.el.getBoundingClientRect();
    this.target.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1);
    this.target.y = clamp(-(((e.clientY - r.top) / r.height) * 2 - 1));
    this.lastInput = performance.now();
  };

  private onOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    const landscape = Math.abs((screen.orientation?.angle ?? 0) % 180) === 90;
    const beta = landscape ? e.gamma : e.beta;
    const gamma = landscape ? -e.beta : e.gamma;
    // First reading = how the user naturally holds the phone.
    if (!this.gyroBase) this.gyroBase = { beta, gamma };
    // Let the baseline follow slowly so the card re-centres over time.
    this.gyroBase.beta += (beta - this.gyroBase.beta) * 0.004;
    this.gyroBase.gamma += (gamma - this.gyroBase.gamma) * 0.004;
    this.target.x = clamp((gamma - this.gyroBase.gamma) / 22);
    this.target.y = clamp((beta - this.gyroBase.beta) / 22);
    this.usingGyro = true;
    this.lastInput = performance.now();
  };

  update(dt: number, time: number) {
    const idle = performance.now() - this.lastInput > 2500;
    let tx = this.target.x;
    let ty = this.target.y;
    if (idle) {
      tx = Math.sin(time * 0.45) * 0.45;
      ty = Math.sin(time * 0.31 + 1.3) * 0.3;
    }
    const k = 1 - Math.exp(-dt * (idle ? 1.5 : 7));
    this.value.x += (tx - this.value.x) * k;
    this.value.y += (ty - this.value.y) * k;
  }
}
