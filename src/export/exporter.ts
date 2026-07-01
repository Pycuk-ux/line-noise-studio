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

export function exportPng(renderer: Renderer, t: number): Promise<void> {
  renderer.render(t);
  return new Promise((resolve) => {
    renderer.canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `line-noise-${Date.now()}.png`);
      resolve();
    }, "image/png");
  });
}

function bitrateFor(s: Settings): number {
  return Math.min(40_000_000, Math.max(4_000_000, Math.round(s.width * s.height * s.fps * 0.14)));
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
  format: VideoFormat,
  onProgress: (p: number) => void,
): Promise<void> {
  const totalFrames = Math.max(1, Math.round(s.loopDuration * s.fps));
  const usPerFrame = 1_000_000 / s.fps;

  let muxer: MuxerLike;
  let codec: string;

  if (format === "mp4") {
    const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
    codec = "avc1.640033"; // H.264 High, level 5.1 (covers all presets)
    muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width: s.width, height: s.height },
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
    }) as unknown as MuxerLike;
  } else {
    const { Muxer, ArrayBufferTarget } = await import("webm-muxer");
    codec = "vp09.00.10.08"; // VP9
    muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "V_VP9", width: s.width, height: s.height, frameRate: s.fps },
    }) as unknown as MuxerLike;
  }

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error("VideoEncoder error", e),
  });

  const config: VideoEncoderConfig = {
    codec,
    width: s.width,
    height: s.height,
    bitrate: bitrateFor(s),
    framerate: s.fps,
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
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrateFor(s) });
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
  if (webCodecsSupported()) {
    await exportViaWebCodecs(renderer, s, format, onProgress);
  } else if (format === "webm") {
    await exportViaMediaRecorder(renderer, s, onProgress);
  } else {
    throw new Error("MP4 export needs WebCodecs (Chrome/Edge). Use WEBM in this browser.");
  }
}
