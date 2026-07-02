import type { Settings } from "../types";
import { VERT, FRAG } from "./glsl";
import { bakeBase } from "./textTexture";

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const rad = (deg: number) => (deg * Math.PI) / 180;

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private baseCanvas: HTMLCanvasElement;
  private texture: WebGLTexture;
  private settings: Settings;

  constructor(canvas: HTMLCanvasElement, settings: Settings) {
    this.canvas = canvas;
    this.settings = settings;
    const gl = canvas.getContext("webgl2", {
      preserveDrawingBuffer: true, // required so we can read pixels for export
      premultipliedAlpha: false,
      antialias: true,
    });
    if (!gl) throw new Error("WebGL2 is not supported in this browser.");
    this.gl = gl;

    this.program = this.buildProgram();
    gl.useProgram(this.program);

    // Fullscreen triangle-strip quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(this.program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    // Base texture (bg + text)
    this.baseCanvas = document.createElement("canvas");
    this.texture = this.makeTexture();

    this.cacheUniforms();
    this.resize(settings.width, settings.height);
    this.rebakeBase();
  }

  private buildProgram(): WebGLProgram {
    const gl = this.gl;
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error("Shader compile error: " + gl.getShaderInfoLog(sh));
      }
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error("Program link error: " + gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  private makeTexture(): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  private cacheUniforms() {
    const gl = this.gl;
    const names = [
      "uResolution", "uPhase", "uTime", "uBase",
      "uBubbleSize", "uBubbleShape", "uBubbleCurv",
      "uMaskInnerOp", "uMaskOuterOp", "uMaskInnerStop", "uMaskOuterStop",
      "uBarCount", "uBarThickness", "uBarWidth", "uCellDensity", "uAngleX", "uAngleY",
      "uColorA", "uColorB", "uGradFreq", "uSpeed", "uColorIntensity",
      "uBarOpacity", "uAlphaScale", "uGrainScale", "uGrainOpacity",
    ];
    for (const n of names) this.uniforms[n] = gl.getUniformLocation(this.program, n);
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  /** Update settings; caller decides whether a rebake of text/bg is needed. */
  setSettings(next: Settings, rebake: boolean) {
    const sizeChanged = next.width !== this.settings.width || next.height !== this.settings.height;
    this.settings = next;
    if (sizeChanged) this.resize(next.width, next.height);
    if (rebake || sizeChanged) this.rebakeBase();
  }

  rebakeBase() {
    const gl = this.gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    bakeBase(this.baseCanvas, this.settings);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.baseCanvas);
  }

  /** Render one frame at time t (seconds). Loop is seamless every loopDuration. */
  render(t: number) {
    const gl = this.gl;
    const s = this.settings;
    const phase = (2 * Math.PI * ((t % s.loopDuration) + s.loopDuration)) / s.loopDuration % (2 * Math.PI);

    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    const u = this.uniforms;
    gl.uniform1i(u.uBase, 0);
    gl.uniform2f(u.uResolution, s.width, s.height);
    gl.uniform1f(u.uBubbleSize, s.bubbleSize);
    gl.uniform1f(u.uBubbleShape, s.bubbleShape);
    gl.uniform1f(u.uBubbleCurv, s.bubbleCurvature);
    gl.uniform1f(u.uMaskInnerOp, s.maskInnerOpacity);
    gl.uniform1f(u.uMaskOuterOp, s.maskOuterOpacity);
    gl.uniform1f(u.uMaskInnerStop, s.maskInnerStop);
    gl.uniform1f(u.uMaskOuterStop, s.maskOuterStop);
    gl.uniform1f(u.uPhase, phase);
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uBarCount, s.barCount);
    gl.uniform1f(u.uBarThickness, s.barThickness);
    gl.uniform1f(u.uBarWidth, s.barWidth);
    gl.uniform1f(u.uCellDensity, s.cellDensity);
    gl.uniform1f(u.uAngleX, rad(s.angleX));
    gl.uniform1f(u.uAngleY, rad(s.angleY));
    gl.uniform3fv(u.uColorA, hexToRgb(s.colorA));
    gl.uniform3fv(u.uColorB, hexToRgb(s.colorB));
    gl.uniform1f(u.uGradFreq, s.gradFreq);
    gl.uniform1f(u.uSpeed, s.speed);
    gl.uniform1f(u.uColorIntensity, s.colorIntensity);
    gl.uniform1f(u.uBarOpacity, s.barOpacity);
    gl.uniform1f(u.uAlphaScale, s.alphaScale);
    gl.uniform1f(u.uGrainScale, s.grainScale);
    gl.uniform1f(u.uGrainOpacity, s.grainOpacity);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
  }
}
