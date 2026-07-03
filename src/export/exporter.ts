import type { Settings } from "../types";
import type { Renderer } from "../render/Renderer";

export type VideoFormat = "mp4" | "webm";

export function webCodecsSupported(): boolean {
  return typeof (globalThis as unknown as { VideoEncoder?: unknown }).VideoEncoder !== "undefined";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Output dimensions for the chosen export resolution, preserving canvas aspect.
// 1080p / 2K target the longer edge (1920 / 2560); dimensions are kept even.
export function exportDims(s: Settings): { width: number; height: number } {
  if (s.exportRes === "canvas") return { width: s.width, height: s.height };
  const targetLong = s.exportRes === "2k" ? 2560 : 1920;
  const scale = targetLong / Math.max(s.width, s.height);
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(s.width), height: even(s.height) };
}

// Render at the export resolution (temporarily resizing the renderer), run fn,
// then restore the original canvas size.
async function withExportSize<T>(
  renderer: Renderer, s: Settings, fn: (dims: { width: number; height: number }) => Promise<T> | T,
): Promise<T> {
  const dims = exportDims(s);
  const resized = dims.width !== s.width || dims.height !== s.height;
  try {
    if (resized) renderer.setSettings({ ...s, ...dims }, true);
    return await fn(dims);
  } finally {
    if (resized) renderer.setSettings(s, true);
  }
}

export async function exportPng(renderer: Renderer, s: Settings, t: number): Promise<void> {
  await withExportSize(renderer, s, () => {
    renderer.render(t);
    return new Promise<void>((resolve) => {
      renderer.canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `line-noise-${Date.now()}.png`);
        resolve();
      }, "image/png");
    });
  });
}

// Bits-per-pixel-per-frame by quality. Film grain + fine gradients compress
// poorly, so we target generous bitrates (esp. High/Max) to avoid blockiness.
const QUALITY_BPP: Record<Settings["exportQuality"], number> = {
  standard: 0.18,
  high: 0.5,
  max: 1.0,
};
const QUALITY_CAP: Record<Settings["exportQuality"], number> = {
  standard: 40_000_000,
  high: 100_000_000,
  max: 220_000_000,
};

function bitrateFor(w: number, h: number, fps: number, quality: Settings["exportQuality"]): number {
  return Math.min(QUALITY_CAP[quality], Math.max(6_000_000, Math.round(w * h * fps * QUALITY_BPP[quality])));
}

interface MuxerLike {
  addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): void;
  finalize(): void;
  target: { buffer: ArrayBuffer };
}

/** Frame-accurate export via WebCodecs. Renders each frame at exact time and encodes. */
async function exportViaWebCodecs(
  renderer: Renderer,
  s: Settings,
  dims: { width: number; height: number },
  format: VideoFormat,
  onProgress: (p: number) => void,
): Promise<void> {
  const { width, height } = dims;
  const totalFrames = Math.max(1, Math.round(s.loopDuration * s.fps));
  const usPerFrame = 1_000_000 / s.fps;

  let muxer: MuxerLike;
  let codec: string;

  if (format === "mp4") {
    const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
    codec = "avc1.640033"; // H.264 High, level 5.1 (covers all presets)
    muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width, height },
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
    }) as unknown as MuxerLike;
  } else {
    const { Muxer, ArrayBufferTarget } = await import("webm-muxer");
    codec = "vp09.00.10.08"; // VP9
    muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "V_VP9", width, height, frameRate: s.fps },
    }) as unknown as MuxerLike;
  }

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error("VideoEncoder error", e),
  });

  const config: VideoEncoderConfig = {
    codec,
    width,
    height,
    bitrate: bitrateFor(width, height, s.fps, s.exportQuality),
    framerate: s.fps,
    latencyMode: "quality",
    bitrateMode: "variable",
  };
  if (format === "mp4") (config as VideoEncoderConfig & { avc?: { format: string } }).avc = { format: "avc" };
  encoder.configure(config);

  for (let i = 0; i < totalFrames; i++) {
    renderer.render(i / s.fps);
    const frame = new VideoFrame(renderer.canvas, {
      timestamp: Math.round(i * usPerFrame),
      duration: Math.round(usPerFrame),
    });
    encoder.encode(frame, { keyFrame: i % (s.fps * 2) === 0 });
    frame.close();

    // Relieve backpressure so the encoder queue doesn't balloon.
    if (encoder.encodeQueueSize > 8) {
      await new Promise((r) => setTimeout(r, 0));
    }
    onProgress((i + 1) / totalFrames);
  }

  await encoder.flush();
  muxer.finalize();
  const blob = new Blob([muxer.target.buffer], {
    type: format === "mp4" ? "video/mp4" : "video/webm",
  });
  downloadBlob(blob, `line-noise-${Date.now()}.${format}`);
}

/** Fallback for WEBM when WebCodecs is unavailable (Safari/Firefox). Real-time capture. */
async function exportViaMediaRecorder(
  renderer: Renderer,
  s: Settings,
  onProgress: (p: number) => void,
): Promise<void> {
  const stream = renderer.canvas.captureStream(s.fps);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: bitrateFor(renderer.canvas.width, renderer.canvas.height, s.fps, s.exportQuality),
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const done = new Promise<void>((resolve) => {
    recorder.onstop = () => {
      downloadBlob(new Blob(chunks, { type: "video/webm" }), `line-noise-${Date.now()}.webm`);
      resolve();
    };
  });

  recorder.start();
  const start = performance.now();
  const durationMs = s.loopDuration * 1000;
  await new Promise<void>((resolve) => {
    const loop = () => {
      const elapsed = performance.now() - start;
      renderer.render(elapsed / 1000);
      onProgress(Math.min(1, elapsed / durationMs));
      if (elapsed >= durationMs) resolve();
      else requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  recorder.stop();
  await done;
}

export async function exportVideo(
  renderer: Renderer,
  s: Settings,
  format: VideoFormat,
  onProgress: (p: number) => void,
): Promise<void> {
  await withExportSize(renderer, s, async (dims) => {
    if (webCodecsSupported()) {
      await exportViaWebCodecs(renderer, s, dims, format, onProgress);
    } else if (format === "webm") {
      await exportViaMediaRecorder(renderer, s, onProgress);
    } else {
      throw new Error("MP4 export needs WebCodecs (Chrome/Edge). Use WEBM in this browser.");
    }
  });
}
