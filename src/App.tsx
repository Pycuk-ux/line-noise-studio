import { useCallback, useEffect, useRef, useState } from "react";
import type { Settings, SettingsPatch } from "./types";
import { DEFAULT_SETTINGS } from "./defaults";
import { Renderer } from "./render/Renderer";
import { ControlPanel } from "./ui/ControlPanel";
import { exportPng, exportVideo, webCodecsSupported, type VideoFormat } from "./export/exporter";

// Settings that require re-baking the background/text texture when changed.
const REBAKE_KEYS: (keyof Settings)[] = [
  "text", "fontFamily", "fontSize", "textColor", "lineHeight", "letterSpacing",
  "align", "textPadding", "bgColor", "bgColor2", "bgGradient", "bgGradAngle",
  "width", "height", "revealSpread",
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const timeRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [extraFonts, setExtraFonts] = useState<{ label: string; value: string }[]>([]);
  const canMp4 = webCodecsSupported();

  settingsRef.current = settings;

  // Init renderer once.
  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      rendererRef.current = new Renderer(canvasRef.current, DEFAULT_SETTINGS);
      rendererRef.current.render(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    return () => rendererRef.current?.dispose();
  }, []);

  // Push settings into renderer (re-bake only when text/bg/size changed).
  const prevRef = useRef<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const prev = prevRef.current;
    const rebake = REBAKE_KEYS.some((k) => prev[k] !== settings[k]);
    r.setSettings(settings, rebake);
    prevRef.current = settings;
    if (!playing) r.render(timeRef.current);
  }, [settings, playing]);

  // Animation loop.
  useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const loop = (ts: number) => {
      const r = rendererRef.current;
      if (lastTsRef.current != null && r && !exporting) {
        const dt = (ts - lastTsRef.current) / 1000;
        timeRef.current += dt;
        r.render(timeRef.current);
        setTime(timeRef.current % settingsRef.current.loopDuration);
      }
      lastTsRef.current = ts;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, exporting]);

  const update = useCallback((p: SettingsPatch) => setSettings((s) => ({ ...s, ...p })), []);

  const scrub = (t: number) => {
    timeRef.current = t;
    setTime(t);
    rendererRef.current?.render(t);
  };

  const doExportPng = async () => {
    if (!rendererRef.current) return;
    await exportPng(rendererRef.current, timeRef.current);
    rendererRef.current.render(timeRef.current);
  };

  const doExportVideo = async (format: VideoFormat) => {
    if (!rendererRef.current) return;
    setExporting(true);
    setProgress(0);
    setError(null);
    try {
      await exportVideo(rendererRef.current, settingsRef.current, format, setProgress);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
      rendererRef.current.render(timeRef.current);
    }
  };

  const onFontLoaded = (family: string, label: string) => {
    setExtraFonts((f) => [...f, { label, value: family }]);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-200">
      {/* Preview */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex items-center justify-center p-6 min-h-0">
          <div
            className="relative max-w-full max-h-full shadow-2xl ring-1 ring-white/10 rounded-sm overflow-hidden"
            style={{ aspectRatio: `${settings.width} / ${settings.height}` }}
          >
            <canvas ref={canvasRef} className="block h-full w-full" style={{ aspectRatio: `${settings.width} / ${settings.height}` }} />
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-950/80 p-6 text-center text-sm text-red-200">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-3 border-t border-zinc-800 bg-zinc-900 px-6 py-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="h-9 w-9 shrink-0 rounded-full bg-fuchsia-600 text-white hover:bg-fuchsia-500 flex items-center justify-center"
          >
            {playing ? "❚❚" : "►"}
          </button>
          <input
            type="range"
            min={0}
            max={settings.loopDuration}
            step={0.01}
            value={time}
            onChange={(e) => {
              setPlaying(false);
              scrub(parseFloat(e.target.value));
            }}
            className="flex-1 accent-fuchsia-500 cursor-pointer"
          />
          <span className="text-xs tabular-nums text-zinc-400 w-24 text-right">
            {time.toFixed(2)}s / {settings.loopDuration}s
          </span>
        </div>
      </main>

      {/* Controls */}
      <aside className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-950">
        <ControlPanel
          s={settings}
          update={update}
          onExportPng={doExportPng}
          onExportVideo={doExportVideo}
          exporting={exporting}
          progress={progress}
          canMp4={canMp4}
          extraFonts={extraFonts}
          onFontLoaded={onFontLoaded}
        />
      </aside>
    </div>
  );
}
